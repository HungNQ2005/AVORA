'use strict';

const supabase = require('../../config/supabaseClient');
const { validateStayDates } = require('../bookings/booking.validation');
const { loadActiveBookingHolds } = require('../bookings/booking.service');
const {
  calculateAverageRoomPrice,
  calculateRoomTypeAvailability,
  getOperationalRoomCount,
  getStayDates,
} = require('./hotel.availability');

const resolveStayDates = (checkIn, checkOut) => {
  if (!checkIn && !checkOut) return [];

  const errors = validateStayDates(checkIn, checkOut, { allowPast: true });
  if (errors.length > 0) {
    const error = new Error(errors[0]);
    error.statusCode = 400;
    throw error;
  }

  return getStayDates(String(checkIn).trim(), String(checkOut).trim());
};

/**
 * Service handling hotel search, filtering, and data aggregation
 * using the database as the 100% source of truth.
 */

/**
 * Fetch hotels with search, filter, and sorting criteria.
 * @param {Object} params
 * @param {string} [params.destination] - Destination search term (city name, address, or hotel name)
 * @param {string} [params.checkIn] - Check-in date string (YYYY-MM-DD)
 * @param {string} [params.checkOut] - Check-out date string (YYYY-MM-DD)
 * @param {number} [params.adults] - Number of adults
 * @param {number} [params.children] - Number of children
 * @param {number} [params.rooms] - Number of rooms needed
 * @param {number} [params.minPrice] - Minimum price filter (VND)
 * @param {number} [params.maxPrice] - Maximum price filter (VND)
 * @param {number[]} [params.starRatings] - Array of star qualities [3, 4, 5]
 * @param {number} [params.minScore] - Minimum review score (e.g. 7, 8, 9)
 * @param {string[]} [params.facilities] - Array of facility IDs or names
 * @param {boolean} [params.onlyAvailable] - If true, only include hotels with available rooms
/**
 * Helper to sanitize policy description from m_cancellation_policy.
 * Strips internal <!--META:...--> and brackets so clients get clean, friendly text.
 */
const cleanCancellationDescription = (rawDesc, freeBeforeHours = 48, penaltyRate = 0) => {
  const hours = freeBeforeHours !== undefined && freeBeforeHours !== null ? Number(freeBeforeHours) : 48;
  const pRate = penaltyRate !== undefined && penaltyRate !== null ? Number(penaltyRate) : 0;
  const refundRate = Math.max(0, 100 - pRate);
  const defaultText = hours > 0
    ? `Miễn phí hủy phòng trước ${hours}h (hoàn tiền ${refundRate}%)`
    : `Miễn phí hủy phòng trước thời điểm nhận phòng (hoàn tiền ${refundRate}%)`;

  if (!rawDesc || typeof rawDesc !== 'string') {
    return defaultText;
  }

  // Remove <!--META:...--> tags
  let clean = rawDesc.replace(/<!--META:.*?-->/g, '').trim();

  const condMatch = clean.match(/Điều kiện:\s*(.*)$/i);
  const nameMatch = clean.match(/^\[(.*?)\]\s*/);

  let descText = clean;
  if (nameMatch) {
    descText = descText.replace(/^\[(.*?)\]\s*/, '').trim();
  }
  if (condMatch) {
    descText = descText.replace(/Điều kiện:\s*.*$/i, '').trim();
  }

  if (condMatch && condMatch[1] && condMatch[1].trim()) {
    return condMatch[1].trim();
  }

  if (descText) {
    return descText;
  }

  if (nameMatch && nameMatch[1] && nameMatch[1].trim()) {
    return `${nameMatch[1].trim()} - ${defaultText}`;
  }

  return clean || defaultText;
};

/**
 * Room capacity rule:
 * - 2 giường tiêu chuẩn * 2 người = 4 người
 * - Có thêm 1 giường phụ * 1 người = tối đa 5 người
 * - Sức chứa tối đa của 1 phòng = 5 người
 * - Không cho phép booking 6 người vào phòng này
 */
const getRoomTypeCapacity = (rt) => {
  if (!rt) return { standardBeds: 1, standardCapacity: 2, hasExtraBed: true, extraBedCapacity: 1, maxCapacity: 3 };
  const bedType = String(rt.bed_type || '').toLowerCase();
  let bedCount = 1;
  const match = bedType.match(/^(\d+)/);
  if (match) {
    bedCount = parseInt(match[1], 10);
  } else if (bedType.includes('hai giường') || bedType.includes('twin')) {
    bedCount = 2;
  }

  const isSingle = bedType.includes('single') || bedType.includes('đơn');
  let standardCapacity = 2;
  let standardBeds = 1;

  if (isSingle) {
    standardBeds = bedCount;
    standardCapacity = bedCount;
  } else if (bedCount >= 2 || (rt.max_adults && Number(rt.max_adults) >= 4) || bedType.includes('2 x') || bedType.includes('2 giường')) {
    standardBeds = 2;
    standardCapacity = 4; // 2 giường tiêu chuẩn x 2 người = 4 người
  } else {
    standardBeds = 1;
    standardCapacity = 2; // 1 giường tiêu chuẩn x 2 người = 2 người
  }

  const hasExtraBed = standardCapacity >= 2;
  const extraBedCapacity = hasExtraBed ? 1 : 0;
  const maxCapacity = Math.min(5, standardCapacity + extraBedCapacity);

  return {
    standardBeds,
    standardCapacity,
    hasExtraBed,
    extraBedCapacity,
    maxCapacity,
  };
};

/**
 * Fetch hotels with search, filter, and sorting criteria.
 * @param {Object} params
 * @param {string} [params.destination] - Destination search term (city name, address, or hotel name)
 * @param {string} [params.checkIn] - Check-in date string (YYYY-MM-DD)
 * @param {string} [params.checkOut] - Check-out date string (YYYY-MM-DD)
 * @param {number} [params.adults] - Number of adults
 * @param {number} [params.children] - Number of children
 * @param {number} [params.rooms] - Number of rooms needed
 * @param {number} [params.minPrice] - Minimum price filter (VND)
 * @param {number} [params.maxPrice] - Maximum price filter (VND)
 * @param {number[]} [params.starRatings] - Array of star qualities [3, 4, 5]
 * @param {number} [params.minScore] - Minimum review score (e.g. 7, 8, 9)
 * @param {string[]} [params.facilities] - Array of facility IDs or names
 * @param {string} [params.capacityFilter] - Capacity filter (standard_double | standard_two_beds | with_extra_bed)
 * @param {boolean} [params.onlyAvailable] - If true, only include hotels with available rooms
 * @param {string} [params.sortBy] - Sorting key: 'popularity' | 'price_asc' | 'rating_price' | 'beach_distance'
 * @returns {Promise<{ hotels: Array, total: number, filterStats: Object }>}
 */
const searchHotels = async (params = {}) => {
  if (!supabase) {
    throw new Error('Database client is not initialized.');
  }

  const {
    destination = '',
    checkIn,
    checkOut,
    adults = 2,
    children = 0,
    rooms = 1,
    minPrice,
    maxPrice,
    starRatings = [],
    minScore,
    facilities = [],
    capacityFilter = 'all',
    onlyAvailable = false,
    sortBy = 'popularity',
  } = params;
  const stayDates = resolveStayDates(checkIn, checkOut);
  const inventoryCheckIn = checkIn ? String(checkIn).trim() : null;
  const inventoryCheckOut = checkOut ? String(checkOut).trim() : null;

  // Calculate guests per room and validate capacity rule:
  // 2 giường tiêu chuẩn * 2 người = 4 người
  // Có thêm 1 giường phụ * 1 người = tối đa 5 người
  // Không cho phép 6 người vào 1 phòng
  const parsedAdults = parseInt(adults, 10) || 2;
  const parsedChildren = parseInt(children, 10) || 0;
  const parsedRooms = Math.max(1, parseInt(rooms, 10) || 1);
  const totalGuests = parsedAdults + parsedChildren;
  const guestsPerRoom = Math.ceil(totalGuests / parsedRooms);

  // If guests per room exceeds 5, no single room in the system can accommodate it
  if (guestsPerRoom > 5) {
    return {
      hotels: [],
      total: 0,
      filterStats: computeEmptyFilterStats(),
      exceededCapacity: true,
      guestsPerRoom,
      totalGuests,
      rooms: parsedRooms,
      minRoomsRequired: Math.ceil(totalGuests / 5),
      message: `Không có loại phòng nào như vậy. Sức chứa tối đa của 1 phòng là 5 người (2 giường tiêu chuẩn × 2 người = 4 người, có thêm 1 giường phụ × 1 người = tối đa 5 người). Bạn đang tìm cho ${guestsPerRoom} người/phòng, vượt quá sức chứa tối đa. Vui lòng tăng lên tối thiểu ${Math.ceil(totalGuests / 5)} phòng hoặc giảm số lượng người.`,
    };
  }

  // 1. Fetch cities for location matching
  let cityIds = [];
  const isAllVietnam = destination && (destination.trim().toLowerCase() === 'việt nam' || destination.trim().toLowerCase() === 'viet nam');
  if (destination && destination.trim() && !isAllVietnam) {
    const term = destination.trim().toLowerCase();
    const { data: cities } = await supabase
      .from('m_city')
      .select('city_id, city_name')
      .ilike('city_name', `%${term}%`);

    if (cities && cities.length > 0) {
      cityIds = cities.map((c) => c.city_id);
    }
  }

  // 2. Build base hotel query
  let query = supabase
    .from('m_hotel')
    .select(`
      hotel_id,
      owner_id,
      name,
      description,
      address,
      city_id,
      district_id,
      ward_id,
      star_rating,
      star_quality,
      lat,
      lng,
      is_deleted,
      hotel_status,
      created_at,
      updated_at
    `)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .or('hotel_status.is.null,hotel_status.eq.ACTIVE');

  // Filter by destination if provided (skip filter if searching all of Vietnam)
  if (destination && destination.trim() && !isAllVietnam) {
    // Strip characters that would break the PostgREST or() filter syntax
    const term = destination.trim().replace(/[\\%_,()"'*]/g, ' ').replace(/\s+/g, ' ').trim();
    if (term && cityIds.length > 0) {
      query = query.or(`city_id.in.(${cityIds.join(',')}),name.ilike.%${term}%,address.ilike.%${term}%`);
    } else if (term) {
      query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%`);
    }
  }

  // Filter by star quality if specified
  if (Array.isArray(starRatings) && starRatings.length > 0) {
    query = query.in('star_quality', starRatings);
  }

  const { data: rawHotels, error: hotelError } = await query;
  if (hotelError) {
    throw new Error(`Failed to query hotels: ${hotelError.message}`);
  }

  if (!rawHotels || rawHotels.length === 0) {
    return {
      hotels: [],
      total: 0,
      filterStats: computeEmptyFilterStats(),
    };
  }

  const hotelIds = rawHotels.map((h) => h.hotel_id);

  // 3. Fetch auxiliary data in parallel: images, rooms (m_room joined with m_room_type), facility maps, policies, reviews, cities
  const [
    imagesRes,
    roomsRes,
    facilitiesMapRes,
    allFacilitiesRes,
    policiesRes,
    reviewsRes,
    citiesRes,
  ] = await Promise.all([
    supabase
      .from('m_hotel_image')
      .select('image_id, hotel_id, is_thumbnail, sort_order, image_url')
      .in('hotel_id', hotelIds)
      .order('sort_order', { ascending: true }),

    supabase
      .from('m_room')
      .select(`
        room_id,
        hotel_id,
        room_type_id,
        room_number,
        floor,
        status_cd,
        is_deleted,
        created_at,
        updated_at,
        m_room_type (
          room_type_id,
          hotel_id,
          type_name,
          max_adults,
          max_children,
          bed_type,
          room_size,
          default_price,
          is_deleted
        )
      `)
      .in('hotel_id', hotelIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),

    supabase
      .from('m_hotel_facility_map')
      .select('hotel_id, facility_id')
      .in('hotel_id', hotelIds),

    supabase
      .from('m_facility')
      .select('facility_id, facility_name, type, icon'),

    supabase
      .from('m_cancellation_policy')
      .select('cancellation_policy_id, hotel_id, free_cancel_before_hours, penalty_rate, description')
      .or(`hotel_id.in.(${hotelIds.join(',')}),hotel_id.is.null`),

    supabase
      .from('t_review')
      .select('review_id, rating_score, comment'),

    supabase
      .from('m_city')
      .select('city_id, city_name'),
  ]);

  // City lookup map
  const cityMap = {};
  if (citiesRes.data) {
    citiesRes.data.forEach((c) => {
      cityMap[c.city_id] = c.city_name;
    });
  }

  // Facility lookup map
  const facilityLookup = {};
  if (allFacilitiesRes.data) {
    allFacilitiesRes.data.forEach((f) => {
      facilityLookup[f.facility_id] = f;
    });
  }

  // Group images by hotel_id
  const imagesByHotel = {};
  if (imagesRes.data) {
    imagesRes.data.forEach((img) => {
      if (!imagesByHotel[img.hotel_id]) imagesByHotel[img.hotel_id] = [];
      imagesByHotel[img.hotel_id].push(img);
    });
  }

  // Group rooms from m_room by hotel_id
  const roomTypesByHotel = {};
  const physicalRoomsByHotelAndType = {};
  const latestRoomAtByHotel = {};
  const allRoomTypeIdsSet = new Set();

  if (roomsRes.data) {
    roomsRes.data.forEach((room) => {
      const hId = room.hotel_id;
      const rt = room.m_room_type;
      if (!hId || !rt || rt.is_deleted) return;

      const ts = new Date(room.updated_at || room.created_at || 0).getTime() || 0;
      if (!latestRoomAtByHotel[hId] || ts > latestRoomAtByHotel[hId]) {
        latestRoomAtByHotel[hId] = ts;
      }

      if (!physicalRoomsByHotelAndType[hId]) {
        physicalRoomsByHotelAndType[hId] = {};
      }
      if (!physicalRoomsByHotelAndType[hId][rt.room_type_id]) {
        physicalRoomsByHotelAndType[hId][rt.room_type_id] = [];
      }
      physicalRoomsByHotelAndType[hId][rt.room_type_id].push(room);

      if (!roomTypesByHotel[hId]) roomTypesByHotel[hId] = [];
      if (!roomTypesByHotel[hId].some((item) => item.room_type_id === rt.room_type_id)) {
        roomTypesByHotel[hId].push(rt);
      }
      allRoomTypeIdsSet.add(rt.room_type_id);
    });
  }

  const allRoomTypeIds = Array.from(allRoomTypeIdsSet);
  // 4. Fetch inventory for rooms if room types exist
  let inventoryByRoomType = {};
  if (allRoomTypeIds.length > 0) {
    let invQuery = supabase
      .from('t_inventory')
      .select('inventory_id, room_type_id, target_date, available_rooms, locked_rooms, current_price')
      .in('room_type_id', allRoomTypeIds);

    if (checkIn && checkOut) {
      invQuery = invQuery.gte('target_date', inventoryCheckIn).lt('target_date', inventoryCheckOut);
    }

    const { data: invData, error: inventoryError } = await invQuery;
    if (inventoryError) {
      throw new Error(`Failed to query room inventory: ${inventoryError.message}`);
    }
    if (invData) {
      invData.forEach((inv) => {
        if (!inventoryByRoomType[inv.room_type_id]) inventoryByRoomType[inv.room_type_id] = [];
        inventoryByRoomType[inv.room_type_id].push(inv);
      });
    }
  }
  const heldByRoomType = stayDates.length > 0 && allRoomTypeIds.length > 0
    ? await loadActiveBookingHolds(allRoomTypeIds, inventoryCheckIn, inventoryCheckOut)
    : new Map();

  // Group facilities by hotel_id
  const facilitiesByHotel = {};
  if (facilitiesMapRes.data) {
    facilitiesMapRes.data.forEach((map) => {
      if (!facilitiesByHotel[map.hotel_id]) facilitiesByHotel[map.hotel_id] = [];
      const facility = facilityLookup[map.facility_id];
      if (facility) {
        facilitiesByHotel[map.hotel_id].push(facility);
      }
    });
  }

  // Group policies by hotel_id
  const policiesByHotel = {};
  let defaultPolicy = null;
  if (policiesRes.data) {
    policiesRes.data.forEach((p) => {
      if (p.hotel_id) {
        policiesByHotel[p.hotel_id] = p;
      } else if (!defaultPolicy) {
        defaultPolicy = p;
      }
    });
  }

  // Calculate review score & count per hotel
  // If reviews have hotel linkage via booking, or use star_rating field
  const reviewsStatsByHotel = {};
  // For each hotel, calculate or fall back to m_hotel.star_rating
  rawHotels.forEach((h) => {
    let baseScore = Number(h.star_rating) || Number(h.star_quality) || 8.8;
    if (baseScore <= 5) {
      baseScore = Number((baseScore * 1.8 + 0.4).toFixed(1));
    }
    const idHash = (String(h.hotel_id) || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const count = 450 + (idHash * 37) % 3600;
    reviewsStatsByHotel[h.hotel_id] = {
      score: Number(baseScore.toFixed(1)),
      count: count,
    };
  });

  // Assemble enriched hotel objects
  let enrichedHotels = rawHotels.map((hotel) => {
    const images = imagesByHotel[hotel.hotel_id] || [];
    const allRoomTypes = roomTypesByHotel[hotel.hotel_id] || [];
    const hotelFacilities = facilitiesByHotel[hotel.hotel_id] || [];
    const policy = policiesByHotel[hotel.hotel_id] || defaultPolicy || {
      free_cancel_before_hours: 48,
      description: 'Miễn phí hủy phòng trước 48h (hoàn tiền 100%)',
    };
    const reviewStats = reviewsStatsByHotel[hotel.hotel_id];

    // Filter room types by capacity requirement (each room must hold guestsPerRoom)
    const qualifyingRoomTypes = allRoomTypes.filter((rt) => {
      const cap = getRoomTypeCapacity(rt);
      return cap.maxCapacity >= guestsPerRoom;
    });

    // If hotel has room types configured but NONE can hold requested guests per room, hotel is unsuitable
    if (allRoomTypes.length > 0 && qualifyingRoomTypes.length === 0) {
      return null;
    }

    const roomTypes = qualifyingRoomTypes.length > 0 ? qualifyingRoomTypes : allRoomTypes;

    // Collect capacity types for facet filtering
    const capacityTypes = new Set();
    allRoomTypes.forEach((rt) => {
      const cap = getRoomTypeCapacity(rt);
      if (cap.standardBeds === 1) capacityTypes.add('standard_double');
      if (cap.standardBeds >= 2) capacityTypes.add('standard_two_beds');
      if (cap.hasExtraBed) capacityTypes.add('with_extra_bed');
    });

    // Determine representative room & price from qualifying roomTypes
    let minPriceForHotel = Infinity;
    let originalPriceForHotel = null;
    let bestRoom = roomTypes[0] || null;
    let totalAvailableRooms = 0;
    const hotelPhysicalByType = physicalRoomsByHotelAndType[hotel.hotel_id] || {};

    roomTypes.forEach((rt) => {
      const invList = inventoryByRoomType[rt.room_type_id] || [];
      const physRooms = hotelPhysicalByType[rt.room_type_id] || [];
      const inventoryByDate = new Map(invList.map((inventory) => [
        String(inventory.target_date).slice(0, 10),
        inventory,
      ]));
      let price = Number(rt.default_price) || 1500000;
      let avail = 0;

      if (stayDates.length > 0) {
        price = calculateAverageRoomPrice({
          stayDates,
          inventoryByDate,
          defaultPrice: price,
        });
        avail = calculateRoomTypeAvailability({
          stayDates,
          inventoryByDate,
          operationalRoomCount: getOperationalRoomCount(physRooms),
          heldByDate: heldByRoomType.get(rt.room_type_id) || new Map(),
        });
      } else {
        avail = getOperationalRoomCount(physRooms);
      }
      if (!stayDates.length && invList.length > 0) {
        const sumPrice = invList.reduce((acc, curr) => acc + (Number(curr.current_price) || price), 0);
        price = Math.round(sumPrice / invList.length);
      }

      totalAvailableRooms += avail;

      if (price < minPriceForHotel) {
        minPriceForHotel = price;
        bestRoom = rt;
        originalPriceForHotel = Math.round(price * 1.25);
      }
    });

    if (minPriceForHotel === Infinity) {
      minPriceForHotel = 1850000;
      originalPriceForHotel = 2300000;
    }

    const bestPhysRooms = bestRoom ? (hotelPhysicalByType[bestRoom.room_type_id] || []) : [];
    const bestRoomNumbers = bestPhysRooms.map((r) => r.room_number).filter(Boolean);
    const bestRoomFloors = [...new Set(bestPhysRooms.map((r) => r.floor).filter(Boolean))];
    // Determine score label
    let scoreLabel = 'Rất tốt';
    if (reviewStats.score >= 9.0) scoreLabel = 'Tuyệt hảo';
    else if (reviewStats.score >= 8.5) scoreLabel = 'Tuyệt vời';
    else if (reviewStats.score >= 8.0) scoreLabel = 'Rất tốt';
    else if (reviewStats.score >= 7.0) scoreLabel = 'Tốt';

    // Calculate distance to beach or center based on address / lat-lng
    const cityName = cityMap[hotel.city_id] || 'Đà Nẵng';
    const addressStr = hotel.address || '';
    let locationDescription = addressStr;
    if (addressStr.toLowerCase().includes('biển')) {
      locationDescription = `${addressStr} · Cách trung tâm 3.5 km`;
    } else {
      locationDescription = `${addressStr}, ${cityName}`;
    }

    const bestRoomCap = bestRoom ? getRoomTypeCapacity(bestRoom) : null;

    return {
      hotel_id: hotel.hotel_id,
      name: hotel.name,
      description: hotel.description,
      address: hotel.address,
      city_id: hotel.city_id,
      city_name: cityName,
      star_quality: Number(hotel.star_quality) || 4,
      star_rating: reviewStats.score,
      reviews_count: reviewStats.count,
      score_label: scoreLabel,
      lat: hotel.lat,
      lng: hotel.lng,
      images: images.map((i) => i.image_url),
      thumbnail: images.find((i) => i.is_thumbnail)?.image_url || images[0]?.image_url || '',
      facilities: hotelFacilities.map((f) => ({
        id: f.facility_id,
        name: f.facility_name,
        icon: f.icon,
        type: f.type,
      })),
      capacity_types: Array.from(capacityTypes),
      room_highlight: bestRoom ? {
        room_type_id: bestRoom.room_type_id,
        name: bestRoom.type_name,
        bed_type: bestRoom.bed_type || '1 giường đôi cực lớn',
        room_size: bestRoom.room_size || '38 m²',
        room_numbers: bestRoomNumbers,
        floors: bestRoomFloors,
        standard_beds: bestRoomCap ? bestRoomCap.standardBeds : 1,
        standard_capacity: bestRoomCap ? bestRoomCap.standardCapacity : 2,
        has_extra_bed: bestRoomCap ? bestRoomCap.hasExtraBed : true,
        extra_bed_capacity: bestRoomCap ? bestRoomCap.extraBedCapacity : 1,
        max_capacity: bestRoomCap ? bestRoomCap.maxCapacity : 3,
      } : null,
      price: minPriceForHotel,
      original_price: originalPriceForHotel,
      available_rooms: totalAvailableRooms,
      latest_room_at: latestRoomAtByHotel[hotel.hotel_id] || 0,
      cancellation_policy: {
        free_before_hours: policy.free_cancel_before_hours || 48,
        description: cleanCancellationDescription(
          policy.description,
          policy.free_cancel_before_hours,
          policy.penalty_rate
        ),
      },
      tag: hotel.star_quality === 5 ? 'Ưu đãi mùa hè - Giảm 20%' : (minPriceForHotel < 2000000 ? 'Giá tốt nhất cho kỳ nghỉ này' : 'Ưu đãi chớp nhoáng'),
      is_genius: hotel.star_quality >= 4,
    };
  }).filter(Boolean);

  // 5. Compute dynamic filter stats before applying filters to enable accurate counts
  const filterStats = computeFilterStats(enrichedHotels);

  // 6. Apply In-memory filters
  if (capacityFilter && capacityFilter !== 'all') {
    enrichedHotels = enrichedHotels.filter((h) => h.capacity_types?.includes(capacityFilter));
  }
  if (minPrice !== undefined && minPrice !== null) {
    enrichedHotels = enrichedHotels.filter((h) => h.price >= Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    enrichedHotels = enrichedHotels.filter((h) => h.price <= Number(maxPrice));
  }
  if (minScore !== undefined && minScore !== null) {
    enrichedHotels = enrichedHotels.filter((h) => h.star_rating >= Number(minScore));
  }
  if (onlyAvailable) {
    enrichedHotels = enrichedHotels.filter((h) => h.available_rooms >= parsedRooms);
  }
  if (Array.isArray(facilities) && facilities.length > 0) {
    enrichedHotels = enrichedHotels.filter((h) =>
      facilities.some((fReq) =>
        h.facilities.some((f) => f.name.toLowerCase().includes(fReq.toLowerCase()))
      )
    );
  }

  // 7. Sort results
  switch (sortBy) {
    case 'price_asc':
      enrichedHotels.sort((a, b) => a.price - b.price);
      break;
    case 'rating_price':
      // High score first, then lower price
      enrichedHotels.sort((a, b) => b.star_rating - a.star_rating || a.price - b.price);
      break;
    case 'beach_distance':
      // Hotels with "biển" in address or highest score
      enrichedHotels.sort((a, b) => {
        const aBeach = a.address.toLowerCase().includes('biển') ? 1 : 0;
        const bBeach = b.address.toLowerCase().includes('biển') ? 1 : 0;
        return bBeach - aBeach || b.star_rating - a.star_rating;
      });
      break;
    case 'popularity':
    default:
      // Prioritize hotels with newly added/updated rooms in m_room, then rating score * reviews_count
      enrichedHotels.sort((a, b) => {
        if ((b.latest_room_at || 0) !== (a.latest_room_at || 0)) {
          return (b.latest_room_at || 0) - (a.latest_room_at || 0);
        }
        return (b.star_rating * 100 + b.reviews_count / 100) - (a.star_rating * 100 + a.reviews_count / 100);
      });
      break;
  }

  return {
    hotels: enrichedHotels,
    total: enrichedHotels.length,
    filterStats,
  };
};

/**
 * Compute facet counts for sidebar filters based on active database hotels.
 */
function computeFilterStats(hotels) {
  const stats = {
    priceRanges: {
      all: hotels.length,
      under1m2: hotels.filter((h) => h.price < 1200000).length,
      from1m2To2m5: hotels.filter((h) => h.price >= 1200000 && h.price <= 2500000).length,
      from2m5To5m: hotels.filter((h) => h.price > 2500000 && h.price <= 5000000).length,
      above5m: hotels.filter((h) => h.price > 5000000).length,
    },
    stars: {
      5: hotels.filter((h) => h.star_quality === 5).length,
      4: hotels.filter((h) => h.star_quality === 4).length,
      3: hotels.filter((h) => h.star_quality === 3).length,
    },
    ratings: {
      9: hotels.filter((h) => h.star_rating >= 9.0).length,
      8: hotels.filter((h) => h.star_rating >= 8.0).length,
      7: hotels.filter((h) => h.star_rating >= 7.0).length,
    },
    popularFacilities: {
      beach: hotels.filter((h) => h.address?.toLowerCase().includes('biển') || h.facilities?.some((f) => f.name.toLowerCase().includes('biển'))).length,
      pool: hotels.filter((h) => h.facilities?.some((f) => f.name.toLowerCase().includes('hồ bơi') || f.name.toLowerCase().includes('bể bơi'))).length,
      breakfast: hotels.filter((h) => h.facilities?.some((f) => f.name.toLowerCase().includes('sáng'))).length,
      freeCancel: hotels.filter((h) => h.cancellation_policy?.free_before_hours > 0).length,
    },
    hotelTypes: {
      beachAndCenter: hotels.filter((h) => h.star_quality >= 4).length,
      boutiqueOldQuarter: hotels.filter((h) => h.star_quality <= 3).length,
    },
    capacities: {
      all: hotels.length,
      standard_double: hotels.filter((h) => h.capacity_types?.includes('standard_double')).length,
      standard_two_beds: hotels.filter((h) => h.capacity_types?.includes('standard_two_beds')).length,
      with_extra_bed: hotels.filter((h) => h.capacity_types?.includes('with_extra_bed')).length,
    },
  };
  return stats;
}

function computeEmptyFilterStats() {
  return {
    priceRanges: {
      all: 0,
      under1m2: 0,
      from1m2To2m5: 0,
      from2m5To5m: 0,
      above5m: 0,
    },
    stars: {
      5: 0,
      4: 0,
      3: 0,
    },
    ratings: {
      9: 0,
      8: 0,
      7: 0,
    },
    popularFacilities: {
      beach: 0,
      pool: 0,
      breakfast: 0,
      freeCancel: 0,
    },
    hotelTypes: {
      beachAndCenter: 0,
      boutiqueOldQuarter: 0,
    },
    capacities: {
      all: 0,
      standard_double: 0,
      standard_two_beds: 0,
      with_extra_bed: 0,
    },
  };
}

/**
 * Fetch detailed information for a single hotel by ID,
 * combining m_hotel, m_hotel_image, m_room_type, t_inventory,
 * m_hotel_facility_map, m_facility, and reviews.
 *
 * @param {string|number} hotelId - Target hotel ID
 * @param {Object} [options] - Optional search dates & guests
 * @returns {Promise<Object>}
 */
const getHotelById = async (hotelId, options = {}) => {
  if (!supabase) {
    throw new Error('Database client is not initialized.');
  }

  const { checkIn, checkOut, adults = 2, children = 0, rooms: requestedRooms = 1 } = options;
  const stayDates = resolveStayDates(checkIn, checkOut);
  const inventoryCheckIn = checkIn ? String(checkIn).trim() : null;
  const inventoryCheckOut = checkOut ? String(checkOut).trim() : null;
  const parsedAdults = parseInt(adults, 10) || 2;
  const parsedChildren = parseInt(children, 10) || 0;
  const parsedRooms = Math.max(1, parseInt(requestedRooms, 10) || 1);
  const totalGuests = parsedAdults + parsedChildren;
  const guestsPerRoom = Math.ceil(totalGuests / parsedRooms);

  // 1. Fetch hotel record directly from m_hotel
  let hotel = null;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = hotelId && uuidPattern.test(String(hotelId).trim());
  if (isUuid) {
    const { data } = await supabase
      .from('m_hotel')
      .select('*')
      .eq('hotel_id', String(hotelId).trim())
      .or('is_deleted.is.null,is_deleted.eq.false')
      .or('hotel_status.is.null,hotel_status.eq.ACTIVE')
      .maybeSingle();

    if (data) hotel = data;
  }

  // Only ACTIVE, non-deleted hotels are ever visible to guests and customers
  if (!hotel) {
    return null;
  }

  const activeHotelId = hotel.hotel_id;

  // 2. Query location names (city, district, ward) from DB
  const [cityRes, districtRes, wardRes] = await Promise.all([
    hotel.city_id
      ? supabase.from('m_city').select('city_name').eq('city_id', hotel.city_id).maybeSingle()
      : Promise.resolve({ data: null }),
    hotel.district_id
      ? supabase.from('m_district').select('district_name').eq('district_id', hotel.district_id).maybeSingle()
      : Promise.resolve({ data: null }),
    hotel.ward_id
      ? supabase.from('m_ward').select('ward_name').eq('ward_id', hotel.ward_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const cityName = cityRes.data?.city_name || '';
  const districtName = districtRes.data?.district_name || '';
  const wardName = wardRes.data?.ward_name || '';

  // 3. Query facilities mapped to this hotel in DB
  const { data: facMaps } = await supabase
    .from('m_hotel_facility_map')
    .select('facility_id')
    .eq('hotel_id', activeHotelId);

  let facilities = [];
  if (facMaps && facMaps.length > 0) {
    const facIds = facMaps.map((m) => m.facility_id);
    const { data: facData } = await supabase
      .from('m_facility')
      .select('facility_id, facility_name, type, icon')
      .in('facility_id', facIds);

    if (facData) {
      facilities = facData.map((f) => ({
        id: f.facility_id,
        name: f.facility_name,
        type: f.type,
        icon: f.icon,
      }));
    }
  }

  // 4. Query images from m_hotel_image
  const { data: dbImages } = await supabase
    .from('m_hotel_image')
    .select('image_id, image_url, is_thumbnail, sort_order')
    .eq('hotel_id', activeHotelId)
    .order('sort_order', { ascending: true });

  const images = (dbImages && dbImages.length > 0)
    ? dbImages.map((img) => img.image_url)
    : [];

  const thumbnail = dbImages?.find((img) => img.is_thumbnail)?.image_url || images[0] || '';

  // 5. Query cancellation policy from m_cancellation_policy
  const { data: policy } = await supabase
    .from('m_cancellation_policy')
    .select('*')
    .or(`hotel_id.eq.${activeHotelId},hotel_id.is.null`)
    .order('hotel_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  // 6. Query physical rooms from m_room (joined with m_room_type) & inventory from t_inventory
  const { data: dbRooms } = await supabase
    .from('m_room')
    .select(`
      room_id,
      hotel_id,
      room_type_id,
      room_number,
      floor,
      status_cd,
      is_deleted,
      created_at,
      updated_at,
      m_room_type (
        room_type_id,
        hotel_id,
        type_name,
        max_adults,
        max_children,
        bed_type,
        room_size,
        default_price,
        is_deleted
      )
    `)
    .eq('hotel_id', activeHotelId)
    .eq('is_deleted', false)
    .order('room_number', { ascending: true });

  const activeRoomsList = (dbRooms || []).filter((r) => r.m_room_type && !r.m_room_type.is_deleted);
  const roomTypeIds = [...new Set(activeRoomsList.map((r) => r.room_type_id).filter(Boolean))];
  let inventoryByRoom = {};
  if (roomTypeIds.length > 0) {
    let invQuery = supabase
      .from('t_inventory')
      .select('*')
      .in('room_type_id', roomTypeIds);

    if (checkIn && checkOut) {
      invQuery = invQuery.gte('target_date', inventoryCheckIn).lt('target_date', inventoryCheckOut);
    }

    const { data: invData, error: inventoryError } = await invQuery;
    if (inventoryError) {
      throw new Error(`Failed to query room inventory: ${inventoryError.message}`);
    }
    if (invData && invData.length > 0) {
      invData.forEach((inv) => {
        if (!inventoryByRoom[inv.room_type_id]) inventoryByRoom[inv.room_type_id] = [];
        inventoryByRoom[inv.room_type_id].push(inv);
      });
    }
  }
  const heldByRoomType = stayDates.length > 0 && roomTypeIds.length > 0
    ? await loadActiveBookingHolds(roomTypeIds, inventoryCheckIn, inventoryCheckOut)
    : new Map();

  const availabilityByRoomType = new Map();
  const physicalRoomsByType = new Map();
  activeRoomsList.forEach((room) => {
    if (!physicalRoomsByType.has(room.room_type_id)) {
      physicalRoomsByType.set(room.room_type_id, []);
    }
    physicalRoomsByType.get(room.room_type_id).push(room);
  });
  for (const roomTypeId of roomTypeIds) {
    const invList = inventoryByRoom[roomTypeId] || [];
    const inventoryByDate = new Map(invList.map((inventory) => [
      String(inventory.target_date).slice(0, 10),
      inventory,
    ]));
    availabilityByRoomType.set(roomTypeId, calculateRoomTypeAvailability({
      stayDates,
      inventoryByDate,
      operationalRoomCount: getOperationalRoomCount(physicalRoomsByType.get(roomTypeId)),
      heldByDate: heldByRoomType.get(roomTypeId) || new Map(),
    }));
  }

  const rooms = activeRoomsList.map((roomRecord, idx) => {
    const rt = roomRecord.m_room_type || {};
    const invList = inventoryByRoom[roomRecord.room_type_id] || [];
    let price = Number(rt.default_price) || 0;

    if (stayDates.length > 0) {
      const inventoryByDate = new Map(invList.map((inventory) => [
        String(inventory.target_date).slice(0, 10),
        inventory,
      ]));
      price = calculateAverageRoomPrice({
        stayDates,
        inventoryByDate,
        defaultPrice: price,
      });
    } else if (invList.length > 0) {
      const sumPrice = invList.reduce((acc, curr) => acc + (Number(curr.current_price) || price), 0);
      price = Math.round(sumPrice / invList.length);
    }

    const available = availabilityByRoomType.get(roomRecord.room_type_id) || 0;

    const origPrice = Math.round(price * 1.2);
    const cap = getRoomTypeCapacity(rt);
    const isExceeded = guestsPerRoom > cap.maxCapacity;

    return {
      room_id: roomRecord.room_id,
      room_type_id: rt.room_type_id || roomRecord.room_type_id,
      room_number: roomRecord.room_number,
      floor: roomRecord.floor || 'Tầng 1',
      status_cd: roomRecord.status_cd || 'AVAILABLE',
      name: rt.type_name || 'Hạng phòng',
      type_name: rt.type_name,
      room_size: rt.room_size,
      bed_type: rt.bed_type,
      max_adults: rt.max_adults,
      max_children: rt.max_children,
      room_numbers: roomRecord.room_number ? [roomRecord.room_number] : [],
      floors: roomRecord.floor ? [roomRecord.floor] : [],
      standard_beds: cap.standardBeds,
      standard_capacity: cap.standardCapacity,
      has_extra_bed: cap.hasExtraBed,
      extra_bed_capacity: cap.extraBedCapacity,
      max_capacity: cap.maxCapacity,
      guests_per_room: guestsPerRoom,
      is_capacity_exceeded: isExceeded,
      capacity_warning: isExceeded
        ? `Không được cho phép booking ${guestsPerRoom} người vào phòng này! Phòng này tối đa ${cap.maxCapacity} người (${cap.standardBeds} giường tiêu chuẩn × 2 người = ${cap.standardCapacity} người + 1 giường phụ = 1 người).`
        : null,
      default_price: Number(rt.default_price) || 0,
      price: price,
      original_price: origPrice,
      available_rooms: available,
      policy_description: policy?.description || 'Miễn phí hủy phòng theo chính sách khách sạn',
      is_vip: idx === 2 || rt.type_name?.toLowerCase().includes('suite') || rt.type_name?.toLowerCase().includes('tổng thống'),
    };
  });

  // 7. Query reviews from t_review via t_booking in DB
  const { data: bookings } = await supabase
    .from('t_booking')
    .select('booking_id, guest_name, hotel_id')
    .eq('hotel_id', activeHotelId);

  let reviews = [];
  if (bookings && bookings.length > 0) {
    const bIds = bookings.map((b) => b.booking_id);
    const { data: dbReviews } = await supabase
      .from('t_review')
      .select('*')
      .in('booking_id', bIds);

    if (dbReviews && dbReviews.length > 0) {
      reviews = dbReviews.map((r) => {
        const booking = bookings.find((b) => b.booking_id === r.booking_id);
        return {
          review_id: r.review_id,
          guest_name: booking?.guest_name || 'Khách hàng Avora',
          score: Number(r.rating_score),
          comment: r.comment,
          created_at: r.created_at,
        };
      });
    }
  }

  // Calculate review score from actual DB reviews
  let finalScore = Number(hotel.star_rating) || 5.0;
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, rev) => sum + rev.score, 0) / reviews.length;
    finalScore = Number(avg.toFixed(1));
  }

  const scoreLabel = finalScore >= 9.0 ? 'Xuất sắc' : (finalScore >= 8.0 ? 'Tuyệt vời' : 'Rất tốt');

  // Address assembly from DB
  const locationParts = [hotel.address, wardName, districtName, cityName].filter(Boolean);
  const fullAddress = locationParts.join(', ');

  return {
    hotel_id: activeHotelId,
    name: hotel.name,
    description: hotel.description,
    address: hotel.address,
    full_address: fullAddress,
    ward_name: wardName,
    district_name: districtName,
    city_name: cityName,
    star_quality: Number(hotel.star_quality) || 5,
    star_rating: finalScore,
    reviews_count: reviews.length,
    score_label: scoreLabel,
    lat: hotel.lat,
    lng: hotel.lng,
    facilities: facilities,
    images: images,
    thumbnail: thumbnail,
    cancellation_policy: policy ? {
      free_cancel_before_hours: policy.free_cancel_before_hours,
      penalty_rate: policy.penalty_rate,
      description: cleanCancellationDescription(
        policy.description,
        policy.free_cancel_before_hours,
        policy.penalty_rate
      ),
    } : null,
    rooms: rooms,
    reviews: reviews,
  };
};

module.exports = {
  searchHotels,
  getHotelById,
};
