'use strict';

const supabase = require('../../config/supabaseClient'); // schema 'avora'
const config = require('./chatbot.config');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_DELETED = 'is_deleted.is.null,is_deleted.eq.false';
const HOTEL_COLUMNS = 'hotel_id, name, address, star_rating, star_quality, lat, lng, city_id, district_id';

// ─── Tiện ích chung ───
const toNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const sanitizeKeyword = (s) => String(s || '').replace(/[,()%*]/g, ' ').replace(/\s+/g, ' ').trim();
const clampRadius = (r) => Math.min(Math.max(toNumber(r) || config.DEFAULT_RADIUS_KM, 1), config.MAX_RADIUS_KM);

const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
};

const requireDb = () => {
    if (!supabase) throw new Error('Supabase client chưa được khởi tạo');
};

// ─── Dịch vụ bản đồ (OpenStreetMap) kèm cache ───
const geoCache = new Map();

const cached = async (key, loader) => {
    const hit = geoCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = await loader();
    if (value !== null && value !== undefined) {
        geoCache.set(key, { value, expires: Date.now() + config.GEO_CACHE_TTL_MS });
        if (geoCache.size > 500) geoCache.delete(geoCache.keys().next().value);
    }
    return value;
};

const fetchJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.GEO_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            ...options,
            headers: { 'User-Agent': config.GEO_USER_AGENT, Accept: 'application/json', ...(options.headers || {}) },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
};

/** Tọa độ → tên khu vực tiếng Việt (ví dụ "Phường Hải Châu, Đà Nẵng"). */
const resolveLocationLabel = (lat, lng) =>
    cached(`rev:${lat.toFixed(3)},${lng.toFixed(3)}`, async () => {
        try {
            const data = await fetchJson(
                `${config.NOMINATIM_URL}/reverse?format=jsonv2&zoom=14&accept-language=vi&lat=${lat}&lon=${lng}`
            );
            const a = data.address || {};
            const parts = [
                a.suburb || a.quarter || a.neighbourhood || a.city_district || a.county,
                a.city || a.town || a.village || a.state,
            ].filter(Boolean);
            return parts.length ? [...new Set(parts)].join(', ') : data.display_name || null;
        } catch (err) {
            console.warn('[Chatbot] reverse geocode lỗi:', err.message);
            return null;
        }
    });

/** Tên địa điểm → tọa độ (giới hạn trong Việt Nam). */
const geocodeLocation = (query) =>
    cached(`fwd:${query.toLowerCase()}`, async () => {
        try {
            const data = await fetchJson(
                `${config.NOMINATIM_URL}/search?format=jsonv2&limit=1&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(query)}`
            );
            const hit = Array.isArray(data) ? data[0] : null;
            return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
        } catch (err) {
            console.warn('[Chatbot] geocode lỗi:', err.message);
            return null;
        }
    });

/** Địa điểm du lịch quanh một tọa độ (dữ liệu OpenStreetMap). */
const fetchAttractionsAround = (lat, lng, radiusKm) =>
    cached(`attr:${lat.toFixed(2)},${lng.toFixed(2)},${radiusKm}`, async () => {
        try {
            const around = `(around:${Math.round(radiusKm * 1000)},${lat},${lng})`;
            const query = `[out:json][timeout:15];(
        nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|aquarium|gallery)$"]["name"]${around};
        nwr["historic"~"^(monument|castle|ruins|memorial|archaeological_site|temple)$"]["name"]${around};
        nwr["natural"="beach"]["name"]${around};
      );out center 80;`;
            const data = await fetchJson(config.OVERPASS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`,
            });

            const seen = new Set();
            return (data.elements || [])
                .map((el) => {
                    const tags = el.tags || {};
                    const pLat = el.lat ?? el.center?.lat;
                    const pLng = el.lon ?? el.center?.lon;
                    if (pLat === undefined || pLng === undefined) return null;
                    return {
                        name: tags['name:vi'] || tags.name,
                        type: tags.tourism || tags.historic || tags.natural,
                        distance_km: Number(haversineKm(lat, lng, pLat, pLng).toFixed(1)),
                        famous: Boolean(tags.wikipedia || tags.wikidata),
                    };
                })
                .filter((p) => p && p.name && !seen.has(p.name) && seen.add(p.name))
                .sort((a, b) => Number(b.famous) - Number(a.famous) || a.distance_km - b.distance_km)
                .slice(0, 8)
                .map(({ famous, ...rest }) => rest);
        } catch (err) {
            console.warn('[Chatbot] attractions lỗi:', err.message);
            return null;
        }
    });

// ─── Truy vấn khách sạn dùng chung ───
const enrichHotels = async (hotels) => {
    if (!hotels.length) return [];
    const ids = hotels.map((h) => h.hotel_id);

    const [roomRes, imgRes, reviewRes] = await Promise.all([
        supabase.from('m_room_type').select('hotel_id, default_price').in('hotel_id', ids).or(NOT_DELETED),
        supabase
            .from('m_hotel_image')
            .select('hotel_id, image_url, is_thumbnail, sort_order')
            .in('hotel_id', ids)
            .order('sort_order', { ascending: true }),
        supabase.from('t_review').select('rating_score, t_booking!inner(hotel_id)').in('t_booking.hotel_id', ids),
    ]);

    const minPrice = {};
    (roomRes.data || []).forEach((r) => {
        const p = toNumber(r.default_price);
        if (p !== null && (minPrice[r.hotel_id] === undefined || p < minPrice[r.hotel_id])) minPrice[r.hotel_id] = p;
    });

    const thumb = {};
    (imgRes.data || []).forEach((i) => {
        if (!thumb[i.hotel_id] || i.is_thumbnail) thumb[i.hotel_id] = i.image_url;
    });

    const agg = {};
    (reviewRes.data || []).forEach((r) => {
        const hid = r.t_booking?.hotel_id;
        if (!hid) return;
        agg[hid] = agg[hid] || { sum: 0, count: 0 };
        agg[hid].sum += Number(r.rating_score) || 0;
        agg[hid].count += 1;
    });

    return hotels.map((h) => ({
        hotel_id: h.hotel_id,
        name: h.name,
        address: h.address,
        star_rating: toNumber(h.star_rating),
        min_price_per_night: minPrice[h.hotel_id] ?? null,
        review_score: agg[h.hotel_id] ? Number((agg[h.hotel_id].sum / agg[h.hotel_id].count).toFixed(1)) : null,
        review_count: agg[h.hotel_id]?.count || 0,
        link: `/hotel/${h.hotel_id}`,
        ...(h.distance_km !== undefined ? { distance_km: h.distance_km } : {}),
    }));
};

/** Khách sạn ACTIVE trong bán kính (bounding box rồi haversine), gần nhất trước. */
const findHotelsNear = async (lat, lng, radiusKm) => {
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

    const { data, error } = await supabase
        .from('m_hotel')
        .select(HOTEL_COLUMNS)
        .eq('hotel_status', 'ACTIVE')
        .or(NOT_DELETED)
        .gte('lat', lat - dLat)
        .lte('lat', lat + dLat)
        .gte('lng', lng - dLng)
        .lte('lng', lng + dLng)
        .limit(100);
    if (error) throw error;

    const near = (data || [])
        .filter((h) => h.lat !== null && h.lng !== null)
        .map((h) => ({ ...h, distance_km: Number(haversineKm(lat, lng, Number(h.lat), Number(h.lng)).toFixed(2)) }))
        .filter((h) => h.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km);

    return near;
};

const applyFilters = (hotels, { maxPrice, minStar }) => {
    let result = hotels;
    const limit = toNumber(maxPrice);
    const star = toNumber(minStar);
    if (limit !== null && !Number.isNaN(limit)) {
        result = result.filter((h) => h.min_price_per_night !== null && h.min_price_per_night <= limit);
    }
    if (star !== null && !Number.isNaN(star)) {
        result = result.filter((h) => (h.star_rating ?? 0) >= star);
    }
    return result;
};

// ─── Tools ───
const searchAvoraHotels = async ({ location, maxPrice, minStar } = {}) => {
    try {
        requireDb();
        const keyword = sanitizeKeyword(location);
        let rows = [];
        let areaNote = null;

        let query = supabase.from('m_hotel').select(HOTEL_COLUMNS).eq('hotel_status', 'ACTIVE').or(NOT_DELETED).limit(60);

        if (keyword) {
            const [cityRes, districtRes] = await Promise.all([
                supabase.from('m_city').select('city_id').ilike('city_name', `%${keyword}%`),
                supabase.from('m_district').select('district_id').ilike('district_name', `%${keyword}%`),
            ]);
            const cityIds = (cityRes.data || []).map((c) => c.city_id);
            const districtIds = (districtRes.data || []).map((d) => d.district_id);

            const conds = [`address.ilike.%${keyword}%`, `name.ilike.%${keyword}%`];
            if (cityIds.length) conds.push(`city_id.in.(${cityIds.join(',')})`);
            if (districtIds.length) conds.push(`district_id.in.(${districtIds.join(',')})`);
            query = query.or(conds.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;
        rows = data || [];

        // Không khớp theo tên → đổi tên khu vực thành tọa độ rồi tìm quanh đó
        if (!rows.length && keyword) {
            const point = await geocodeLocation(keyword);
            if (point) {
                rows = await findHotelsNear(point.lat, point.lng, config.DEFAULT_RADIUS_KM);
                areaNote = `Không có khách sạn ghi đúng "${keyword}"; kết quả là các khách sạn trong bán kính ${config.DEFAULT_RADIUS_KM}km quanh khu vực này.`;
            }
        }

        const enriched = await enrichHotels(rows);
        const filtered = applyFilters(enriched, { maxPrice, minStar });
        filtered.sort((a, b) => (a.min_price_per_night ?? Infinity) - (b.min_price_per_night ?? Infinity));

        const prices = enriched.map((h) => h.min_price_per_night).filter((p) => p !== null);
        return {
            count: filtered.length,
            hotels: filtered.slice(0, config.RESULT_LIMIT),
            ...(areaNote ? { note: areaNote } : {}),
            ...(!filtered.length && prices.length ? { cheapest_available_price: Math.min(...prices) } : {}),
        };
    } catch (err) {
        console.error('[Chatbot] searchAvoraHotels lỗi:', err.message);
        return { error: 'Không thể tìm kiếm khách sạn lúc này.', hotels: [] };
    }
};

const searchNearbyHotels = async ({ lat, lng, radius, maxPrice, minStar } = {}, ctx = {}) => {
    try {
        requireDb();
        const uLat = toNumber(lat) ?? toNumber(ctx.userLocation?.lat);
        const uLng = toNumber(lng) ?? toNumber(ctx.userLocation?.lng);
        if (!Number.isFinite(uLat) || !Number.isFinite(uLng)) {
            return { error: 'Chưa có vị trí của người dùng. Hãy nhờ họ cho phép chia sẻ vị trí hoặc cho biết khu vực.', hotels: [] };
        }
        let radiusKm = clampRadius(radius);
        let rows = await findHotelsNear(uLat, uLng, radiusKm);
        let note = null;
        if (!rows.length && radiusKm < config.MAX_RADIUS_KM) {
            radiusKm = config.MAX_RADIUS_KM;
            rows = await findHotelsNear(uLat, uLng, radiusKm);
            if (rows.length) note = `Không có khách sạn gần bạn; đã mở rộng tìm trong bán kính ${radiusKm}km.`;
        }
        const enriched = await enrichHotels(rows.slice(0, 30));
        const filtered = applyFilters(enriched, { maxPrice, minStar });
        return {
            radius_km: radiusKm,
            count: filtered.length,
            hotels: filtered.slice(0, config.RESULT_LIMIT),
            ...(note ? { note } : {}),
        };
    } catch (err) {
        console.error('[Chatbot] searchNearbyHotels lỗi:', err.message);
        return { error: 'Không thể tìm khách sạn gần bạn lúc này.', hotels: [] };
    }
};

const resolveHotelId = async ({ hotelId, hotelName }, ctx) => {
    if (UUID_RE.test(String(hotelId || ''))) return hotelId;
    const name = sanitizeKeyword(hotelName);
    if (name) {
        const { data } = await supabase
            .from('m_hotel')
            .select('hotel_id')
            .ilike('name', `%${name}%`)
            .eq('hotel_status', 'ACTIVE')
            .or(NOT_DELETED)
            .limit(1)
            .maybeSingle();
        if (data?.hotel_id) return data.hotel_id;
    }
    return UUID_RE.test(String(ctx.currentHotelId || '')) ? ctx.currentHotelId : null;
};

const getSpecificHotelDetails = async (args = {}, ctx = {}) => {
    try {
        requireDb();
        const id = await resolveHotelId(args, ctx);
        if (!id) return { error: 'Không xác định được khách sạn. Hãy hỏi người dùng tên khách sạn.' };

        const { data: hotel, error } = await supabase
            .from('m_hotel')
            .select('hotel_id, name, description, address, star_rating, star_quality, lat, lng, city_id, district_id')
            .eq('hotel_id', id)
            .or(NOT_DELETED)
            .maybeSingle();
        if (error) throw error;
        if (!hotel) return { error: 'Không tìm thấy khách sạn này trên AVORA.' };

        const [roomsRes, facRes, policyRes, cityRes, districtRes, enriched] = await Promise.all([
            supabase
                .from('m_room_type')
                .select('type_name, max_adults, max_children, bed_type, room_size, default_price')
                .eq('hotel_id', id)
                .or(NOT_DELETED),
            supabase.from('m_hotel_facility_map').select('m_facility(facility_name)').eq('hotel_id', id),
            supabase
                .from('m_cancellation_policy')
                .select('free_cancel_before_hours, penalty_rate, description')
                .eq('hotel_id', id)
                .limit(1)
                .maybeSingle(),
            hotel.city_id
                ? supabase.from('m_city').select('city_name').eq('city_id', hotel.city_id).maybeSingle()
                : Promise.resolve({ data: null }),
            hotel.district_id
                ? supabase.from('m_district').select('district_name').eq('district_id', hotel.district_id).maybeSingle()
                : Promise.resolve({ data: null }),
            enrichHotels([hotel]),
        ]);

        return {
            hotel_id: hotel.hotel_id,
            name: hotel.name,
            description: hotel.description,
            address: hotel.address,
            city: cityRes.data?.city_name || null,
            district: districtRes.data?.district_name || null,
            star_rating: toNumber(hotel.star_rating),
            review_score: enriched[0]?.review_score ?? null,
            review_count: enriched[0]?.review_count ?? 0,
            facilities: (facRes.data || []).map((f) => f.m_facility?.facility_name).filter(Boolean),
            room_types: (roomsRes.data || []).map((r) => ({
                name: r.type_name,
                max_adults: r.max_adults,
                max_children: r.max_children,
                bed_type: r.bed_type,
                room_size: r.room_size,
                price_per_night: toNumber(r.default_price),
            })),
            cancellation_policy: policyRes.data ? {
                free_cancel_before_hours: policyRes.data.free_cancel_before_hours,
                penalty_rate: policyRes.data.penalty_rate,
                description: String(policyRes.data.description || '')
                    .replace(/<!--META:.*?-->/g, '')
                    .replace(/^\[.*?\]\s*/g, '')
                    .trim() || `Miễn phí hủy phòng trước ${policyRes.data.free_cancel_before_hours || 48}h`,
            } : null,
            cancellation_policy: policyRes.data || null,
            link: `/hotel/${hotel.hotel_id}`,
        };
    } catch (err) {
        console.error('[Chatbot] getSpecificHotelDetails lỗi:', err.message);
        return { error: 'Không thể lấy thông tin khách sạn lúc này.' };
    }
};

const suggestAttractions = async ({ location, radius } = {}, ctx = {}) => {
    try {
        requireDb();
        const keyword = sanitizeKeyword(location);
        let point = null;
        let areaName = keyword;

        if (keyword) {
            point = await geocodeLocation(keyword);
        } else if (ctx.userLocation) {
            point = { lat: ctx.userLocation.lat, lng: ctx.userLocation.lng };
            areaName = ctx.locationLabel || 'vị trí hiện tại của người dùng';
        }
        if (!point) {
            return { error: 'Chưa xác định được khu vực. Hãy hỏi người dùng muốn đi đâu hoặc nhờ họ chia sẻ vị trí.' };
        }

        const radiusKm = Math.min(Math.max(toNumber(radius) || config.ATTRACTION_RADIUS_KM, 1), 60);
        const [attractions, nearHotels] = await Promise.all([
            fetchAttractionsAround(point.lat, point.lng, radiusKm),
            findHotelsNear(point.lat, point.lng, config.DEFAULT_RADIUS_KM),
        ]);
        const hotels = await enrichHotels(nearHotels.slice(0, config.RESULT_LIMIT));

        return {
            area: areaName,
            attractions: attractions || [],
            nearby_hotels: hotels,
            ...(!attractions || !attractions.length
                ? { note: 'Bản đồ không trả về địa điểm nào; có thể gợi ý theo hiểu biết chung nhưng nói rõ chỉ mang tính tham khảo.' }
                : {}),
        };
    } catch (err) {
        console.error('[Chatbot] suggestAttractions lỗi:', err.message);
        return { error: 'Không thể lấy gợi ý địa điểm du lịch lúc này.' };
    }
};

const getActiveCoupons = async () => {
    try {
        requireDb();
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('m_coupon')
            .select('code, discount_type, discount_value, max_discount_amount, min_order_amount, valid_to')
            .or(NOT_DELETED)
            .lte('valid_from', now)
            .gte('valid_to', now)
            .order('valid_to', { ascending: true })
            .limit(10);
        if (error) throw error;
        return { count: (data || []).length, coupons: data || [] };
    } catch (err) {
        console.error('[Chatbot] getActiveCoupons lỗi:', err.message);
        return { error: 'Không thể lấy danh sách mã giảm giá lúc này.', coupons: [] };
    }
};

const getMyBookings = async (_args = {}, ctx = {}) => {
    try {
        requireDb();
        if (!ctx.userId) return { error: 'Cần đăng nhập để xem đơn đặt phòng.' };

        const { data, error } = await supabase
            .from('t_booking')
            .select(
                'booking_id, total_amount, discount_amount, booking_status_cd, guest_name, created_at, hotel_id, ' +
                'm_hotel(name), t_booking_detail(check_in_date, check_out_date, quantity, m_room_type(type_name))'
            )
            .eq('user_id', ctx.userId)
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) throw error;

        const codes = [...new Set((data || []).map((b) => b.booking_status_cd).filter(Boolean))];
        const statusNames = {};
        if (codes.length) {
            const { data: sys } = await supabase.from('m_system_code').select('code_cd, code_name').in('code_cd', codes);
            (sys || []).forEach((s) => {
                if (!statusNames[s.code_cd]) statusNames[s.code_cd] = s.code_name;
            });
        }

        return {
            count: (data || []).length,
            bookings: (data || []).map((b) => ({
                booking_id: b.booking_id,
                hotel: b.m_hotel?.name || null,
                hotel_link: b.hotel_id ? `/hotel/${b.hotel_id}` : null,
                status: statusNames[b.booking_status_cd] || b.booking_status_cd,
                total_amount: toNumber(b.total_amount),
                discount_amount: toNumber(b.discount_amount),
                guest_name: b.guest_name,
                booked_at: b.created_at,
                rooms: (b.t_booking_detail || []).map((d) => ({
                    room_type: d.m_room_type?.type_name || null,
                    quantity: d.quantity,
                    check_in: d.check_in_date,
                    check_out: d.check_out_date,
                })),
            })),
        };
    } catch (err) {
        console.error('[Chatbot] getMyBookings lỗi:', err.message);
        return { error: 'Không thể lấy đơn đặt phòng lúc này.', bookings: [] };
    }
};

const getUserName = async (userId) => {
    try {
        if (!supabase || !userId) return null;
        const { data } = await supabase.from('m_user').select('full_name').eq('user_id', userId).maybeSingle();
        return data?.full_name || null;
    } catch (err) {
        console.warn('[Chatbot] getUserName lỗi:', err.message);
        return null;
    }
};

// ─── Đăng ký tool cho Groq ───
const TOOL_HANDLERS = {
    searchAvoraHotels,
    searchNearbyHotels,
    getSpecificHotelDetails,
    suggestAttractions,
    getActiveCoupons,
    getMyBookings,
};

const fn = (name, description, properties = {}, required = []) => ({
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties, required } },
});

const TOOL_DEFINITIONS = [
    fn(
        'searchAvoraHotels',
        'Tìm khách sạn trên AVORA theo khu vực (thành phố, quận, phường, địa danh) và có thể lọc theo giá tối đa mỗi đêm (VND), số sao tối thiểu.',
        {
            location: { type: 'string', description: 'Tên khu vực, ví dụ: Đà Nẵng, Quận 1, Mỹ Khê' },
            maxPrice: { type: 'number', description: 'Giá tối đa mỗi đêm (VND)' },
            minStar: { type: 'number', description: 'Số sao tối thiểu (1-5)' },
        },
        ['location']
    ),
    fn(
        'searchNearbyHotels',
        'Tìm khách sạn AVORA gần vị trí hiện tại của người dùng. Bỏ trống lat/lng để dùng vị trí trình duyệt đã chia sẻ.',
        {
            lat: { type: 'number' },
            lng: { type: 'number' },
            radius: { type: 'number', description: 'Bán kính tìm kiếm (km)' },
            maxPrice: { type: 'number', description: 'Giá tối đa mỗi đêm (VND)' },
            minStar: { type: 'number' },
        }
    ),
    fn(
        'getSpecificHotelDetails',
        'Lấy chi tiết một khách sạn (mô tả, loại phòng, giá, tiện ích, đánh giá, chính sách hủy). Khi người dùng nói "ở đây/chỗ này" thì để trống để dùng khách sạn đang xem.',
        {
            hotelId: { type: 'string', description: 'UUID khách sạn (nếu có)' },
            hotelName: { type: 'string', description: 'Tên khách sạn khi người dùng nhắc tên' },
        }
    ),
    fn(
        'suggestAttractions',
        'Gợi ý địa điểm du lịch (có thể ở xa) kèm khách sạn AVORA gần đó. Bỏ trống location để dùng vị trí hiện tại của người dùng.',
        {
            location: { type: 'string', description: 'Thành phố/khu vực muốn tham quan' },
            radius: { type: 'number', description: 'Bán kính tìm địa điểm (km)' },
        }
    ),
    fn('getActiveCoupons', 'Lấy danh sách mã giảm giá AVORA đang còn hiệu lực.'),
    fn('getMyBookings', 'Lấy các đơn đặt phòng gần nhất của chính người dùng đang chat.'),
];

/**
 * Thực thi tool do model yêu cầu. Không bao giờ throw.
 */
const executeTool = async (name, rawArguments, ctx) => {
    const handler = TOOL_HANDLERS[name];
    if (!handler) return { error: 'Công cụ không tồn tại.' };
    try {
        const args = rawArguments ? JSON.parse(rawArguments) : {};
        return await handler(args, ctx);
    } catch (err) {
        console.error(`[Chatbot] Tool ${name} thất bại:`, err.message);
        return { error: 'Công cụ thực thi thất bại.' };
    }
};

module.exports = { TOOL_DEFINITIONS, executeTool, resolveLocationLabel, getUserName };
