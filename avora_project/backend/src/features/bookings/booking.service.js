'use strict';

const supabase = require('../../config/supabaseClient');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const ensureClient = () => {
  if (!supabase) {
    throw createError('Database client is not initialized.', 503);
  }
};

/**
 * Load system codes from m_system_code for dynamic code_cd <-> code_name resolution.
 */
const loadSystemCodes = async (businessCds = ['BOOKING_STS', 'REFUND_STS', 'PAYMENT_METHOD', 'USER_ACTION']) => {
  const { data: rows } = await supabase
    .from('m_system_code')
    .select('business_cd, code_cd, code_name, sort_no')
    .in('business_cd', businessCds);

  const byBusiness = new Map();
  (rows || []).forEach((r) => {
    const bCd = String(r.business_cd || '').trim().toUpperCase();
    if (!byBusiness.has(bCd)) {
      byBusiness.set(bCd, { byCode: new Map(), byName: new Map(), list: [] });
    }
    const group = byBusiness.get(bCd);
    const codeCd = String(r.code_cd || '').trim();
    const codeName = String(r.code_name || '').trim().toUpperCase();
    group.byCode.set(codeCd, codeName);
    group.byCode.set(codeName, codeName);
    group.byName.set(codeName, codeCd);
    group.list.push(r);
  });

  const getCodeCd = (businessCd, codeName, fallback) => {
    const group = byBusiness.get(String(businessCd).toUpperCase());
    return group?.byName.get(String(codeName).toUpperCase()) || fallback;
  };

  const getCodeName = (businessCd, rawCodeOrName, fallback = '') => {
    if (!rawCodeOrName) return fallback;
    const group = byBusiness.get(String(businessCd).toUpperCase());
    const key = String(rawCodeOrName).trim().toUpperCase();
    return group?.byCode.get(String(rawCodeOrName).trim()) || group?.byCode.get(key) || key || fallback;
  };

  return { getCodeCd, getCodeName, byBusiness };
};

/**
 * Format short booking reference code from booking_id and created_at.
 */
const formatBookingCode = (bookingId, createdAt) => {
  const d = createdAt ? new Date(createdAt) : new Date();
  const bYear = d.getFullYear() % 100;
  const bMonth = String(d.getMonth() + 1).padStart(2, '0');
  const bCodeSuffix = String(bookingId || '').substring(0, 4).toUpperCase();
  return `AV-${bMonth}${bYear}-${bCodeSuffix}`;
};

/**
 * Chuẩn hóa số điện thoại tự động về đầu 0 trước khi chèn vào cơ sở dữ liệu.
 * Xử lý: +84, 84, khoảng trắng, gạch nối, bỏ số 0 thừa hoặc bù số 0 nếu thiếu.
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let digits = String(phone).trim().replace(/[^\d]/g, '');
  if (!digits) return '';

  if (digits.startsWith('84') && digits.length > 9) {
    digits = digits.slice(2);
  }

  digits = digits.replace(/^0+/, '');
  return digits ? `0${digits}` : '';
};

/**
 * Calculate pricing, room availability, hotel info, cancellation policy, and coupon from DB.
 */
const calculatePricing = async ({
  hotel_id,
  rooms = [],
  room_type_id,
  quantity = 1,
  check_in_date,
  check_out_date,
  coupon_code,
}) => {
  ensureClient();

  // Normalize dates using real-time local date (no past check-in permitted)
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

  let checkInStr = check_in_date ? String(check_in_date).trim() : todayStr;
  if (checkInStr < todayStr) {
    checkInStr = todayStr;
  }

  let checkOutStr = check_out_date ? String(check_out_date).trim() : tomorrowStr;
  if (checkOutStr <= checkInStr) {
    const nextDay = new Date(checkInStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const ny = nextDay.getFullYear();
    const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
    const nd = String(nextDay.getDate()).padStart(2, '0');
    checkOutStr = `${ny}-${nm}-${nd}`;
  }

  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);

  // 1. Resolve hotel from m_hotel
  let activeHotelId = hotel_id || null;
  let dbHotel = null;

  if (activeHotelId) {
    const { data: foundHotel } = await supabase
      .from('m_hotel')
      .select('hotel_id, name, description, address, city_id, district_id, ward_id, star_rating, star_quality, hotel_status, is_deleted')
      .eq('hotel_id', activeHotelId)
      .maybeSingle();
    if (foundHotel && !foundHotel.is_deleted) {
      dbHotel = foundHotel;
    }
  }

  // If no valid hotel_id was passed, resolve from room_type_id or pick first active hotel with room types in DB
  if (!dbHotel && room_type_id) {
    const { data: rtForHotel } = await supabase
      .from('m_room_type')
      .select('hotel_id')
      .eq('room_type_id', room_type_id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (rtForHotel?.hotel_id) {
      const { data: foundHotel } = await supabase
        .from('m_hotel')
        .select('hotel_id, name, description, address, city_id, district_id, ward_id, star_rating, star_quality, hotel_status, is_deleted')
        .eq('hotel_id', rtForHotel.hotel_id)
        .maybeSingle();
      if (foundHotel) dbHotel = foundHotel;
    }
  }

  if (!dbHotel) {
    const { data: firstRoomType } = await supabase
      .from('m_room_type')
      .select('hotel_id, room_type_id')
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    if (firstRoomType?.hotel_id) {
      const { data: fallbackHotel } = await supabase
        .from('m_hotel')
        .select('hotel_id, name, description, address, city_id, district_id, ward_id, star_rating, star_quality, hotel_status, is_deleted')
        .eq('hotel_id', firstRoomType.hotel_id)
        .maybeSingle();
      dbHotel = fallbackHotel;
    }
  }

  activeHotelId = dbHotel?.hotel_id || hotel_id || null;

  // Normalize rooms list
  let roomItems = Array.isArray(rooms) && rooms.length > 0 ? rooms : [];
  if (roomItems.length === 0 && room_type_id) {
    roomItems = [{ room_type_id, quantity: Math.max(1, Number(quantity) || 1) }];
  }

  // Fetch room types from m_room_type
  let requestedRoomTypeIds = roomItems.map((r) => r.room_type_id).filter(Boolean);
  let dbRoomTypes = [];

  if (requestedRoomTypeIds.length > 0) {
    const { data: rtData, error: rtError } = await supabase
      .from('m_room_type')
      .select('room_type_id, hotel_id, type_name, default_price, bed_type, room_size, max_adults, max_children')
      .in('room_type_id', requestedRoomTypeIds)
      .eq('is_deleted', false);

    if (rtError) {
      throw createError(`Không thể lấy thông tin hạng phòng: ${rtError.message}`);
    }
    dbRoomTypes = rtData || [];
  }

  // If requested room_type_id did not match DB or was omitted, load active room types of activeHotelId
  if (dbRoomTypes.length === 0 && activeHotelId) {
    const { data: hotelRoomTypes } = await supabase
      .from('m_room_type')
      .select('room_type_id, hotel_id, type_name, default_price, bed_type, room_size, max_adults, max_children')
      .eq('hotel_id', activeHotelId)
      .eq('is_deleted', false)
      .order('default_price', { ascending: true });

    if (hotelRoomTypes && hotelRoomTypes.length > 0) {
      dbRoomTypes = [hotelRoomTypes[0]];
      const defaultQty = Math.max(1, Number(roomItems[0]?.quantity || quantity) || 1);
      roomItems = [{ room_type_id: hotelRoomTypes[0].room_type_id, quantity: defaultQty }];
    }
  }

  if (roomItems.length === 0 || dbRoomTypes.length === 0) {
    throw createError('Không tìm thấy hạng phòng hợp lệ trong cơ sở dữ liệu.', 400);
  }

  const validRoomTypeIds = dbRoomTypes.map((rt) => rt.room_type_id);

  // Fetch auxiliary DB data in parallel: inventory, room facilities, physical rooms, hotel images, hotel reviews, cancellation policy, active coupons
  const [
    invRes,
    roomFacMapRes,
    physRoomsRes,
    hotelImagesRes,
    hotelBookingsRes,
    policyRes,
    activeCouponsRes,
  ] = await Promise.all([
    supabase
      .from('t_inventory')
      .select('inventory_id, room_type_id, target_date, available_rooms, locked_rooms, current_price')
      .in('room_type_id', validRoomTypeIds)
      .gte('target_date', checkInStr)
      .lt('target_date', checkOutStr),
    supabase
      .from('m_room_facility_map')
      .select('room_type_id, m_facility(facility_id, facility_name, type, icon)')
      .in('room_type_id', validRoomTypeIds),
    supabase
      .from('m_room')
      .select('room_id, room_type_id, room_number, floor, status_cd')
      .in('room_type_id', validRoomTypeIds)
      .eq('is_deleted', false),
    activeHotelId
      ? supabase
        .from('m_hotel_image')
        .select('image_id, image_url, is_thumbnail, sort_order')
        .eq('hotel_id', activeHotelId)
        .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    activeHotelId
      ? supabase
        .from('t_booking')
        .select('booking_id, t_review(rating_score)')
        .eq('hotel_id', activeHotelId)
      : Promise.resolve({ data: [] }),
    activeHotelId
      ? supabase
        .from('m_cancellation_policy')
        .select('*')
        .or(`hotel_id.eq.${activeHotelId},hotel_id.is.null`)
        .order('hotel_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('m_coupon')
      .select('coupon_id, code, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, valid_from, valid_to')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
  ]);

  const roomTypeMap = new Map(dbRoomTypes.map((rt) => [rt.room_type_id, rt]));

  // Map inventory by room_type_id
  const invByRoomType = new Map();
  (invRes.data || []).forEach((inv) => {
    if (!invByRoomType.has(inv.room_type_id)) invByRoomType.set(inv.room_type_id, []);
    invByRoomType.get(inv.room_type_id).push(inv);
  });

  // Map room facilities by room_type_id
  const facilitiesByRoomType = new Map();
  (roomFacMapRes.data || []).forEach((row) => {
    if (!row.m_facility) return;
    if (!facilitiesByRoomType.has(row.room_type_id)) facilitiesByRoomType.set(row.room_type_id, []);
    facilitiesByRoomType.get(row.room_type_id).push({
      facility_id: row.m_facility.facility_id,
      facility_name: row.m_facility.facility_name,
      type: row.m_facility.type,
      icon: row.m_facility.icon,
    });
  });

  // Map physical rooms by room_type_id
  const physRoomsByType = new Map();
  (physRoomsRes.data || []).forEach((rm) => {
    if (!physRoomsByType.has(rm.room_type_id)) physRoomsByType.set(rm.room_type_id, []);
    physRoomsByType.get(rm.room_type_id).push(rm);
  });

  // Calculate subtotal strictly from DB prices (t_inventory.current_price -> m_room_type.default_price)
  let subtotal = 0;
  const processedRooms = roomItems.map((item) => {
    const rt = roomTypeMap.get(item.room_type_id) || dbRoomTypes[0];
    const rtId = rt.room_type_id;
    const invList = invByRoomType.get(rtId) || [];
    const defaultPrice = Number(rt.default_price || 0);

    let unitPrice = defaultPrice;
    if (invList.length > 0) {
      const totalInvPrice = invList.reduce(
        (sum, inv) => sum + (inv.current_price != null ? Number(inv.current_price) : defaultPrice),
        0
      );
      unitPrice = Math.round(totalInvPrice / invList.length);
    }

    const physRooms = physRoomsByType.get(rtId) || [];
    const availPhysCount = physRooms.filter(
      (r) => !r.status_cd || String(r.status_cd).toUpperCase() === 'AVAILABLE'
    ).length;

    let availableRooms = availPhysCount > 0 ? availPhysCount : null;
    if (invList.length > 0) {
      availableRooms = Math.min(...invList.map((inv) => Number(inv.available_rooms ?? 0)));
    }

    const qty = Math.max(1, Number(item.quantity) || 1);
    const roomSubtotal = unitPrice * qty * nights;
    subtotal += roomSubtotal;

    return {
      room_type_id: rtId,
      type_name: rt.type_name,
      bed_type: rt.bed_type || '',
      room_size: rt.room_size || '',
      max_adults: Number(rt.max_adults ?? 2),
      max_children: Number(rt.max_children ?? 0),
      default_price: defaultPrice,
      quantity: qty,
      unit_price: unitPrice,
      total_price: roomSubtotal,
      available_rooms: availableRooms,
      facilities: facilitiesByRoomType.get(rtId) || [],
    };
  });

  // Filter valid active coupons from DB for client hints
  const availableCoupons = (activeCouponsRes.data || []).filter((c) => {
    const vFrom = c.valid_from ? new Date(c.valid_from) : null;
    const vTo = c.valid_to ? new Date(c.valid_to) : null;
    if (vFrom && now < vFrom) return false;
    if (vTo && now > vTo) return false;
    return true;
  });

  // Validate coupon if provided
  let coupon = null;
  let discount_amount = 0;
  let couponMessage = null;

  if (coupon_code && String(coupon_code).trim()) {
    const cleanCode = String(coupon_code).trim().toUpperCase();
    const { data: dbCoupon, error: couponError } = await supabase
      .from('m_coupon')
      .select('*')
      .ilike('code', cleanCode)
      .eq('is_deleted', false)
      .maybeSingle();

    if (couponError) {
      throw createError(`Lỗi kiểm tra coupon: ${couponError.message}`);
    }

    if (!dbCoupon) {
      couponMessage = `Mã giảm giá "${cleanCode}" không tồn tại trong hệ thống.`;
    } else {
      const validFrom = dbCoupon.valid_from ? new Date(dbCoupon.valid_from) : null;
      const validTo = dbCoupon.valid_to ? new Date(dbCoupon.valid_to) : null;

      if (validFrom && now < validFrom) {
        couponMessage = 'Mã giảm giá chưa đến ngày có hiệu lực.';
      } else if (validTo && now > validTo) {
        couponMessage = 'Mã giảm giá đã hết hạn sử dụng.';
      } else if (dbCoupon.min_order_amount && subtotal < Number(dbCoupon.min_order_amount)) {
        couponMessage = `Đơn hàng tối thiểu để áp dụng mã là ${Number(dbCoupon.min_order_amount).toLocaleString('vi-VN')} đ.`;
      } else {
        if (dbCoupon.usage_limit != null) {
          const { count, error: countError } = await supabase
            .from('t_booking')
            .select('booking_id', { count: 'exact', head: true })
            .eq('coupon_id', dbCoupon.coupon_id);

          if (!countError && count != null && count >= dbCoupon.usage_limit) {
            couponMessage = 'Mã giảm giá đã đạt giới hạn lượt sử dụng.';
          }
        }

        if (!couponMessage) {
          coupon = dbCoupon;
          const discountVal = Number(dbCoupon.discount_value || 0);
          const maxDiscount = dbCoupon.max_discount_amount ? Number(dbCoupon.max_discount_amount) : Infinity;

          if (dbCoupon.discount_type === 'PERCENT') {
            discount_amount = Math.min((subtotal * discountVal) / 100, maxDiscount);
          } else {
            discount_amount = Math.min(discountVal, maxDiscount, subtotal);
          }
          discount_amount = Math.round(discount_amount);
          couponMessage = `Đã áp dụng mã ${dbCoupon.code} (-${discount_amount.toLocaleString('vi-VN')} đ)`;
        }
      }
    }
  }

  // Hotel review summary from DB
  const reviewScores = [];
  (hotelBookingsRes.data || []).forEach((b) => {
    const revs = Array.isArray(b.t_review) ? b.t_review : b.t_review ? [b.t_review] : [];
    revs.forEach((r) => {
      if (r.rating_score != null) reviewScores.push(Number(r.rating_score));
    });
  });
  const avgReviewScore =
    reviewScores.length > 0
      ? Number((reviewScores.reduce((a, b) => a + b, 0) / reviewScores.length).toFixed(1))
      : dbHotel?.star_rating != null
        ? Number(dbHotel.star_rating)
        : null;

  const hotelImages = (hotelImagesRes.data || []).map((i) => i.image_url).filter(Boolean);
  const thumbnailImg =
    (hotelImagesRes.data || []).find((i) => i.is_thumbnail)?.image_url || hotelImages[0] || '';

  const cancellationPolicy = policyRes.data || null;
  const total_amount = Math.max(0, subtotal - discount_amount);

  return {
    hotel_id: activeHotelId,
    hotel: dbHotel
      ? {
        hotel_id: dbHotel.hotel_id,
        name: dbHotel.name,
        address: dbHotel.address || '',
        star_quality: Number(dbHotel.star_quality || 0),
        star_rating: Number(dbHotel.star_rating || 0),
        rating_score: avgReviewScore,
        review_count: reviewScores.length,
        thumbnail_url: thumbnailImg,
        images: hotelImages,
      }
      : null,
    nights,
    check_in_date: checkInStr,
    check_out_date: checkOutStr,
    rooms: processedRooms,
    subtotal,
    discount_amount,
    total_amount,
    coupon: coupon
      ? {
        coupon_id: coupon.coupon_id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
        min_order_amount: coupon.min_order_amount ? Number(coupon.min_order_amount) : null,
      }
      : null,
    coupon_message: couponMessage,
    available_coupons: availableCoupons.map((c) => ({
      coupon_id: c.coupon_id,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: c.min_order_amount ? Number(c.min_order_amount) : 0,
      max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
      valid_to: c.valid_to,
    })),
    cancellation_policy: cancellationPolicy,
  };
};

/**
 * Helper to adjust t_inventory room counts across a date range.
 * deltaLocked > 0 locks rooms (decreases available_rooms, increases locked_rooms).
 * deltaLocked < 0 releases rooms (increases available_rooms, decreases locked_rooms).
 */
const adjustInventoryForStay = async (rooms, checkInStr, checkOutStr, deltaSign = 1) => {
  try {
    for (const room of rooms) {
      const checkInDate = new Date(checkInStr);
      const checkOutDate = new Date(checkOutStr);
      const qty = Math.max(1, Number(room.quantity) || 1);

      for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        const { data: existingInv } = await supabase
          .from('t_inventory')
          .select('inventory_id, available_rooms, locked_rooms')
          .eq('room_type_id', room.room_type_id)
          .eq('target_date', dateStr)
          .maybeSingle();

        if (existingInv) {
          const nextLocked = Math.max(0, (existingInv.locked_rooms || 0) + deltaSign * qty);
          const nextAvail = Math.max(0, (existingInv.available_rooms || 0) - deltaSign * qty);
          await supabase
            .from('t_inventory')
            .update({
              locked_rooms: nextLocked,
              available_rooms: nextAvail,
              updated_at: new Date().toISOString(),
            })
            .eq('inventory_id', existingInv.inventory_id);
        }
      }
    }
  } catch (invErr) {
    console.warn('[BookingService] Cảnh báo cập nhật tồn kho:', invErr.message);
  }
};

// In-memory Mutex Set to prevent duplicate concurrent booking submissions
const activeBookingLocks = new Set();

/**
 * Create a new booking in t_booking and t_booking_detail using m_system_code ('1' = PND).
 * Đã tích hợp bảo vệ chống duplicate booking: Concurrency Lock (Mutex) + Idempotency Check 60s.
 */
const createBooking = async (payload, currentUser = null) => {
  const userId = currentUser?.user_id;
  if (!userId) {
    throw createError('Vui lòng đăng nhập để tiếp tục.', 401);
  }

  // Khóa chống thao tác song song / double-click theo user và thông tin đặt phòng
  const lockKey = `${userId}_${payload.hotel_id}_${payload.check_in_date}_${payload.check_out_date}`;
  if (activeBookingLocks.has(lockKey)) {
    throw createError(
      'Yêu cầu đặt phòng của bạn đang được xử lý, vui lòng không gửi yêu cầu liên tục.',
      429
    );
  }
  activeBookingLocks.add(lockKey);

  try {
    ensureClient();

    const [pricing, sysCodes] = await Promise.all([
      calculatePricing({
        hotel_id: payload.hotel_id,
        rooms: payload.rooms,
        room_type_id: payload.room_type_id,
        quantity: payload.quantity,
        check_in_date: payload.check_in_date,
        check_out_date: payload.check_out_date,
        coupon_code: payload.coupon_code,
      }),
      loadSystemCodes(['BOOKING_STS', 'USER_ACTION']),
    ]);

    const pendingStatusCd = sysCodes.getCodeCd('BOOKING_STS', 'PND', '1');
    const bookingActionCd = sysCodes.getCodeCd('USER_ACTION', 'BOK', '4');

    // Kiểm tra đơn trùng lặp trong vòng 60 giây gần nhất (Idempotency)
    const recentWindow = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentBookings } = await supabase
      .from('t_booking')
      .select(`
        booking_id,
        user_id,
        hotel_id,
        total_amount,
        discount_amount,
        guest_name,
        guest_phone,
        booking_status_cd,
        created_at,
        t_booking_detail (
          booking_detail_id,
          room_type_id,
          check_in_date,
          check_out_date,
          quantity,
          unit_price
        )
      `)
      .eq('user_id', userId)
      .eq('hotel_id', pricing.hotel_id)
      .eq('booking_status_cd', pendingStatusCd)
      .gte('created_at', recentWindow)
      .order('created_at', { ascending: false })
      .limit(3);

    if (Array.isArray(recentBookings) && recentBookings.length > 0) {
      const duplicate = recentBookings.find((b) => {
        const details = b.t_booking_detail || [];
        if (details.length !== pricing.rooms.length) return false;
        return details.every((d) => {
          const dIn = String(d.check_in_date).substring(0, 10);
          const dOut = String(d.check_out_date).substring(0, 10);
          const pIn = String(pricing.check_in_date).substring(0, 10);
          const pOut = String(pricing.check_out_date).substring(0, 10);
          return dIn === pIn && dOut === pOut;
        });
      });

      if (duplicate) {
        return {
          booking_id: duplicate.booking_id,
          booking_code: formatBookingCode(duplicate.booking_id, duplicate.created_at),
          booking_status_cd: duplicate.booking_status_cd,
          status_code_name: sysCodes.getCodeName('BOOKING_STS', duplicate.booking_status_cd, 'PND'),
          hotel_id: duplicate.hotel_id,
          guest_name: duplicate.guest_name,
          guest_phone: duplicate.guest_phone,
          total_amount: Number(duplicate.total_amount),
          discount_amount: Number(duplicate.discount_amount || 0),
          coupon_applied: pricing.coupon?.code || null,
          pricing,
          details: duplicate.t_booking_detail || [],
          created_at: duplicate.created_at,
          is_duplicate_prevented: true,
        };
      }
    }

    // Check inventory availability before creating booking
    for (const room of pricing.rooms) {
      if (room.available_rooms !== null && room.available_rooms < room.quantity) {
        throw createError(
          `Hạng phòng "${room.type_name}" không đủ số lượng phòng trống trong khoảng ngày đã chọn (Còn: ${room.available_rooms}, Yêu cầu: ${room.quantity}).`,
          400
        );
      }
    }

    // Construct special request notes directly mapping to t_booking.special_request
    let formattedSpecialRequest = null;
    if (payload.special_request && String(payload.special_request).trim()) {
      formattedSpecialRequest = String(payload.special_request).trim();
    } else {
      const requestParts = [];
      if (Array.isArray(payload.special_request_options) && payload.special_request_options.length > 0) {
        requestParts.push(payload.special_request_options.join(', '));
      }
      if (payload.estimated_arrival_time) {
        requestParts.push(payload.estimated_arrival_time);
      }
      formattedSpecialRequest = requestParts.length > 0 ? requestParts.join('; ') : null;
    }

    const normalizedPhone = normalizePhoneNumber(payload.guest_phone) || payload.guest_phone.trim();

    // Insert into t_booking
    const bookingInsertPayload = {
      user_id: userId,
      hotel_id: pricing.hotel_id,
      total_amount: pricing.total_amount,
      guest_name: payload.guest_name.trim(),
      guest_phone: normalizedPhone,
      special_request: formattedSpecialRequest,
      booking_status_cd: pendingStatusCd,
      coupon_id: pricing.coupon?.coupon_id || null,
      discount_amount: pricing.discount_amount || 0,
      cancellation_policy_id: pricing.cancellation_policy?.cancellation_policy_id || null,
      applied_penalty_rate: pricing.cancellation_policy?.penalty_rate ?? 0,
    };

    const { data: createdBooking, error: bookingError } = await supabase
      .from('t_booking')
      .insert(bookingInsertPayload)
      .select('*')
      .single();

    if (bookingError) {
      throw createError(`Không thể tạo đơn đặt phòng: ${bookingError.message}`);
    }

    // Insert details into t_booking_detail
    const detailRows = pricing.rooms.map((room) => ({
      booking_id: createdBooking.booking_id,
      room_type_id: room.room_type_id,
      check_in_date: pricing.check_in_date,
      check_out_date: pricing.check_out_date,
      quantity: room.quantity,
      unit_price: room.unit_price,
    }));

    const { data: createdDetails, error: detailsError } = await supabase
      .from('t_booking_detail')
      .insert(detailRows)
      .select('*');

    if (detailsError) {
      await supabase.from('t_booking').delete().eq('booking_id', createdBooking.booking_id);
      throw createError(`Lỗi lưu chi tiết đặt phòng: ${detailsError.message}`);
    }

    // Update inventory in t_inventory if entries exist
    await adjustInventoryForStay(pricing.rooms, pricing.check_in_date, pricing.check_out_date, 1);

    // Log user behavior (USER_ACTION = '4' / BOK)
    try {
      if (userId) {
        await supabase.from('h_user_behavior').insert({
          user_id: userId,
          action_type_cd: bookingActionCd,
          search_criteria: {
            hotel_id: pricing.hotel_id,
            check_in_date: pricing.check_in_date,
            check_out_date: pricing.check_out_date,
            nights: pricing.nights,
            total_amount: pricing.total_amount,
          },
        });
      }
    } catch (behaviorErr) {
      console.warn('[BookingService] Cảnh báo ghi user behavior:', behaviorErr.message);
    }

    return {
      booking_id: createdBooking.booking_id,
      booking_code: formatBookingCode(createdBooking.booking_id, createdBooking.created_at),
      booking_status_cd: createdBooking.booking_status_cd,
      status_code_name: sysCodes.getCodeName('BOOKING_STS', createdBooking.booking_status_cd, 'PND'),
      hotel_id: createdBooking.hotel_id,
      guest_name: createdBooking.guest_name,
      guest_phone: createdBooking.guest_phone,
      total_amount: Number(createdBooking.total_amount),
      discount_amount: Number(createdBooking.discount_amount || 0),
      coupon_applied: pricing.coupon?.code || null,
      pricing,
      details: createdDetails || [],
      created_at: createdBooking.created_at,
    };
  } finally {
    activeBookingLocks.delete(lockKey);
  }
};

/**
 * Fetch a booking with all its relations from DB.
 */
const getBookingById = async (bookingId) => {
  ensureClient();

  const { data: booking, error } = await supabase
    .from('t_booking')
    .select(`
      booking_id,
      user_id,
      hotel_id,
      total_amount,
      guest_name,
      guest_phone,
      special_request,
      booking_status_cd,
      coupon_id,
      discount_amount,
      cancellation_policy_id,
      applied_penalty_rate,
      created_at,
      updated_at,
      m_coupon (
        coupon_id,
        code,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        valid_from,
        valid_to
      ),
      m_cancellation_policy (
        cancellation_policy_id,
        hotel_id,
        free_cancel_before_hours,
        penalty_rate,
        description
      ),
      m_hotel (
        hotel_id,
        name,
        address,
        star_rating,
        star_quality,
        m_hotel_image (
          image_url,
          is_thumbnail,
          sort_order
        )
      ),
      t_booking_detail (
        booking_detail_id,
        room_type_id,
        check_in_date,
        check_out_date,
        quantity,
        unit_price,
        m_room_type (
          room_type_id,
          type_name,
          bed_type,
          room_size,
          max_adults,
          max_children,
          default_price
        )
      ),
      t_payment_transaction (
        transaction_id,
        amount_paid,
        payment_method_cd,
        gateway_ref_id,
        is_refunded,
        paid_at,
        created_at
      ),
      t_refund_request (
        refund_id,
        transaction_id,
        refund_amount,
        refund_status_cd,
        gateway_refund_ref,
        reason,
        created_at
      )
    `)
    .eq('booking_id', bookingId)
    .single();

  if (error || !booking) {
    throw createError('Không tìm thấy thông tin đơn đặt phòng.', 404);
  }

  return booking;
};

/**
 * Helper to determine category of booking: 'upcoming' | 'completed' | 'cancelled'
 */
const getBookingCategory = (b, sysCodes) => {
  const codeName = sysCodes
    ? sysCodes.getCodeName('BOOKING_STS', b.booking_status_cd)
    : String(b.booking_status_cd || '').toUpperCase();

  if (codeName === 'CAN' || String(b.booking_status_cd) === '3') return 'cancelled';

  const details = b.t_booking_detail || [];
  const latestCheckOut = details.reduce((max, d) => (!max || d.check_out_date > max ? d.check_out_date : max), null);
  const todayStr = new Date().toISOString().split('T')[0];

  if (latestCheckOut && latestCheckOut < todayStr) {
    return 'completed';
  }
  return 'upcoming';
};

/**
 * Fetch and format customer's bookings with tabs counts and 100% real database relationships.
 */
const getMyBookings = async ({
  userId = null,
  guestPhone = null,
  search = '',
  status = 'all',
  timeRange = 'all',
}) => {
  ensureClient();

  let query = supabase
    .from('t_booking')
    .select(`
      booking_id,
      user_id,
      hotel_id,
      total_amount,
      guest_name,
      guest_phone,
      special_request,
      booking_status_cd,
      coupon_id,
      discount_amount,
      cancellation_policy_id,
      applied_penalty_rate,
      created_at,
      updated_at,
      m_coupon (
        coupon_id,
        code,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        valid_from,
        valid_to
      ),
      m_cancellation_policy (
        cancellation_policy_id,
        hotel_id,
        free_cancel_before_hours,
        penalty_rate,
        description
      ),
      m_hotel (
        hotel_id,
        name,
        address,
        star_rating,
        star_quality,
        lat,
        lng,
        m_hotel_image (
          image_url,
          is_thumbnail,
          sort_order
        )
      ),
      t_booking_detail (
        booking_detail_id,
        room_type_id,
        check_in_date,
        check_out_date,
        quantity,
        unit_price,
        m_room_type (
          room_type_id,
          type_name,
          bed_type,
          room_size,
          max_adults,
          max_children,
          default_price
        )
      ),
      t_payment_transaction (
        transaction_id,
        amount_paid,
        payment_method_cd,
        gateway_ref_id,
        is_refunded,
        paid_at,
        created_at
      ),
      t_refund_request (
        refund_id,
        transaction_id,
        refund_amount,
        refund_status_cd,
        gateway_refund_ref,
        reason,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (guestPhone && String(guestPhone).trim()) {
    query = query.ilike('guest_phone', `%${String(guestPhone).trim()}%`);
  }

  const [bookingsRes, sysCodes] = await Promise.all([
    query,
    loadSystemCodes(['BOOKING_STS', 'REFUND_STS', 'PAYMENT_METHOD']),
  ]);

  if (bookingsRes.error) {
    throw createError(`Không thể tải danh sách đặt phòng: ${bookingsRes.error.message}`);
  }

  const rawBookings = bookingsRes.data || [];

  // Collect hotelIds and roomTypeIds to batch-fetch hotel policies, reviews, and room facilities from DB
  const hotelIds = [...new Set(rawBookings.map((b) => b.hotel_id).filter(Boolean))];
  const roomTypeIds = [
    ...new Set(
      rawBookings.flatMap((b) => (b.t_booking_detail || []).map((d) => d.room_type_id)).filter(Boolean)
    ),
  ];

  const [hotelPoliciesRes, hotelReviewsRes, roomFacilitiesRes] = await Promise.all([
    hotelIds.length > 0
      ? supabase
        .from('m_cancellation_policy')
        .select('cancellation_policy_id, hotel_id, free_cancel_before_hours, penalty_rate, description')
        .in('hotel_id', hotelIds)
      : Promise.resolve({ data: [] }),
    hotelIds.length > 0
      ? supabase
        .from('t_booking')
        .select('hotel_id, t_review(rating_score)')
        .in('hotel_id', hotelIds)
      : Promise.resolve({ data: [] }),
    roomTypeIds.length > 0
      ? supabase
        .from('m_room_facility_map')
        .select('room_type_id, m_facility(facility_id, facility_name, type, icon)')
        .in('room_type_id', roomTypeIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Map hotel policies by hotel_id
  const policyByHotel = new Map();
  (hotelPoliciesRes.data || []).forEach((p) => {
    if (p.hotel_id && !policyByHotel.has(p.hotel_id)) {
      policyByHotel.set(p.hotel_id, p);
    }
  });

  // Map hotel review stats by hotel_id
  const reviewsByHotel = new Map();
  (hotelReviewsRes.data || []).forEach((row) => {
    const hId = row.hotel_id;
    if (!hId) return;
    if (!reviewsByHotel.has(hId)) reviewsByHotel.set(hId, []);
    const revs = Array.isArray(row.t_review) ? row.t_review : row.t_review ? [row.t_review] : [];
    revs.forEach((r) => {
      if (r.rating_score != null) reviewsByHotel.get(hId).push(Number(r.rating_score));
    });
  });

  // Map room facilities by room_type_id
  const facilitiesByRoomType = new Map();
  (roomFacilitiesRes.data || []).forEach((row) => {
    if (!row.m_facility) return;
    if (!facilitiesByRoomType.has(row.room_type_id)) facilitiesByRoomType.set(row.room_type_id, []);
    facilitiesByRoomType.get(row.room_type_id).push({
      facility_id: row.m_facility.facility_id,
      facility_name: row.m_facility.facility_name,
      type: row.m_facility.type,
      icon: row.m_facility.icon,
    });
  });

  const getStatusDisplayInfo = (statusCode, category, hasPaymentTxn) => {
    const resolvedCodeName = sysCodes.getCodeName('BOOKING_STS', statusCode, 'PND');

    if (resolvedCodeName === 'CAN' || category === 'cancelled') {
      return {
        status_code: statusCode,
        status_code_name: 'CAN',
        status_name: 'Đã hủy phòng',
        status_name_en: 'Cancelled',
        badge_variant: 'cancelled',
      };
    }

    if (category === 'completed') {
      return {
        status_code: statusCode,
        status_code_name: resolvedCodeName || 'CFM',
        status_name: 'Đã hoàn thành lưu trú',
        status_name_en: 'Completed',
        badge_variant: 'success',
      };
    }

    if (resolvedCodeName === 'PND') {
      return {
        status_code: statusCode,
        status_code_name: 'PND',
        status_name: 'Chờ thanh toán',
        status_name_en: 'Pending',
        badge_variant: 'amber',
      };
    }

    return {
      status_code: statusCode,
      status_code_name: resolvedCodeName || 'CFM',
      status_name: hasPaymentTxn ? 'Đã xác nhận & Đã thanh toán' : 'Đã xác nhận đặt chỗ',
      status_name_en: 'Confirmed',
      badge_variant: 'confirmed',
    };
  };

  const now = new Date();
  const availableYearsSet = new Set();

  const enrichedList = rawBookings.map((b) => {
    const details = b.t_booking_detail || [];
    const firstDetail = details[0] || {};
    const roomType = firstDetail.m_room_type || {};
    const hotel = b.m_hotel || {};

    const checkInDate = firstDetail.check_in_date || (b.created_at ? b.created_at.split('T')[0] : '');
    const checkOutDate = details.reduce(
      (max, d) => (!max || d.check_out_date > max ? d.check_out_date : max),
      firstDetail.check_out_date || ''
    );

    if (b.created_at) availableYearsSet.add(new Date(b.created_at).getFullYear());

    let nights = 1;
    if (checkInDate && checkOutDate) {
      const dCheckIn = new Date(checkInDate);
      const dCheckOut = new Date(checkOutDate);
      nights = Math.max(1, Math.round((dCheckOut - dCheckIn) / (1000 * 60 * 60 * 24)) || 1);
    }

    let daysLeftText = '';
    if (checkInDate) {
      const dCheckIn = new Date(checkInDate);
      const diffDaysUntilCheckIn = Math.ceil((dCheckIn - now) / (1000 * 60 * 60 * 24));
      if (diffDaysUntilCheckIn > 0) {
        daysLeftText = `${diffDaysUntilCheckIn} ngày nữa`;
      } else if (diffDaysUntilCheckIn === 0) {
        daysLeftText = 'Hôm nay';
      } else {
        daysLeftText = 'Đã qua';
      }
    }

    // Resolve cancellation policy from t_booking.m_cancellation_policy or hotel's policy in m_cancellation_policy
    const policy = b.m_cancellation_policy || policyByHotel.get(b.hotel_id) || null;
    const freeCancelHours = policy?.free_cancel_before_hours != null ? Number(policy.free_cancel_before_hours) : null;
    const penaltyRate =
      b.applied_penalty_rate != null
        ? Number(b.applied_penalty_rate)
        : policy?.penalty_rate != null
          ? Number(policy.penalty_rate)
          : 0;

    let cancelDeadlineStr = 'Trước giờ nhận phòng';
    let isWithinFreeCancelWindow = true;
    if (checkInDate && freeCancelHours != null) {
      const dCheckIn = new Date(checkInDate);
      const cancelDeadlineDate = new Date(dCheckIn.getTime() - freeCancelHours * 60 * 60 * 1000);
      isWithinFreeCancelWindow = now <= cancelDeadlineDate;
      cancelDeadlineStr = `trước ${freeCancelHours}h (${String(cancelDeadlineDate.getDate()).padStart(2, '0')}/${String(cancelDeadlineDate.getMonth() + 1).padStart(2, '0')}/${cancelDeadlineDate.getFullYear()})`;
    }

    const effectivePenaltyRate = isWithinFreeCancelWindow ? 0 : penaltyRate;
    const refundPercentage = Math.max(0, 100 - effectivePenaltyRate);
    const estimatedRefundAmount = Math.round((Number(b.total_amount || 0) * refundPercentage) / 100);

    const policyNote = policy?.description
      ? `${policy.description} (Hạn hủy miễn phí: ${cancelDeadlineStr}${penaltyRate > 0 ? ` • Sau hạn phạt ${penaltyRate}%` : ''})`
      : `Chính sách hủy của chỗ nghỉ: Hủy miễn phí ${cancelDeadlineStr}${penaltyRate > 0 ? `, sau thời hạn áp dụng phí phạt ${penaltyRate}%` : ''}.`;

    // Hotel images strictly from m_hotel_image table
    const sortedImages = [...(hotel.m_hotel_image || [])].sort(
      (a, bImg) => (a.sort_order ?? 0) - (bImg.sort_order ?? 0)
    );
    const hotelImages = sortedImages.map((i) => i.image_url).filter(Boolean);
    const defaultThumbnail =
      sortedImages.find((i) => i.is_thumbnail)?.image_url || hotelImages[0] || '';

    // Payment transactions from t_payment_transaction
    const paymentTxns = Array.isArray(b.t_payment_transaction) ? b.t_payment_transaction : [];
    const latestPayment = paymentTxns[0] || null;
    const paymentMethodCodeName = latestPayment
      ? sysCodes.getCodeName('PAYMENT_METHOD', latestPayment.payment_method_cd, latestPayment.payment_method_cd)
      : null;
    const paymentMethodLabel =
      paymentMethodCodeName === 'BTR'
        ? 'Chuyển khoản ngân hàng'
        : paymentMethodCodeName || 'Chưa thanh toán';

    const category = getBookingCategory(b, sysCodes);
    const statusInfo = getStatusDisplayInfo(b.booking_status_cd, category, paymentTxns.length > 0);
    const formattedBookingCode = formatBookingCode(b.booking_id, b.created_at);

    // Refund data from t_refund_request
    const refund = Array.isArray(b.t_refund_request) && b.t_refund_request.length > 0 ? b.t_refund_request[0] : null;
    const refundStatusCodeName = refund
      ? sysCodes.getCodeName('REFUND_STS', refund.refund_status_cd, refund.refund_status_cd)
      : null;
    const refundStatusLabel =
      refundStatusCodeName === 'SUC'
        ? 'Hoàn tiền thành công'
        : refundStatusCodeName === 'PRO'
          ? 'Đang xử lý hoàn tiền'
          : refundStatusCodeName === 'FLD'
            ? 'Hoàn tiền thất bại'
            : refundStatusCodeName === 'PND'
              ? 'Chờ xử lý hoàn tiền'
              : null;

    // Coupon strictly from booking's linked m_coupon (null if booking did not use a coupon)
    const couponData = b.m_coupon || null;
    const discountText = couponData
      ? couponData.discount_type === 'PERCENT'
        ? `Giảm ${couponData.discount_value}%`
        : `Giảm ${Number(couponData.discount_value).toLocaleString('vi-VN')} đ`
      : null;

    // Hotel review stats from t_review
    const hotelRevScores = reviewsByHotel.get(b.hotel_id) || [];
    const avgReviewScore =
      hotelRevScores.length > 0
        ? Number((hotelRevScores.reduce((acc, v) => acc + v, 0) / hotelRevScores.length).toFixed(1))
        : hotel.star_rating != null
          ? Number(hotel.star_rating)
          : null;

    // Aggregate rooms & facilities from t_booking_detail
    const bookedRooms = details.map((d) => {
      const rt = d.m_room_type || {};
      return {
        booking_detail_id: d.booking_detail_id,
        room_type_id: d.room_type_id,
        type_name: rt.type_name || '',
        bed_type: rt.bed_type || '',
        room_size: rt.room_size || '',
        max_adults: Number(rt.max_adults ?? 0),
        max_children: Number(rt.max_children ?? 0),
        quantity: Number(d.quantity || 1),
        unit_price: Number(d.unit_price || 0),
        check_in_date: d.check_in_date,
        check_out_date: d.check_out_date,
        facilities: facilitiesByRoomType.get(d.room_type_id) || [],
      };
    });

    const totalQuantity = bookedRooms.reduce((sum, r) => sum + r.quantity, 0) || 1;
    const totalMaxAdults = bookedRooms.reduce((sum, r) => sum + r.max_adults * r.quantity, 0) || Number(roomType.max_adults || 0);
    const totalMaxChildren = bookedRooms.reduce((sum, r) => sum + r.max_children * r.quantity, 0) || Number(roomType.max_children || 0);
    const roomNamesSummary =
      bookedRooms.length > 1
        ? bookedRooms.map((r) => `${r.quantity}x ${r.type_name}`).join(', ')
        : roomType.type_name || '';

    const combinedFacilities = [
      ...new Map(
        bookedRooms.flatMap((r) => r.facilities).map((f) => [f.facility_id, f])
      ).values(),
    ];

    return {
      booking_id: b.booking_id,
      booking_code: formattedBookingCode,
      category,
      user_id: b.user_id,
      guest_name: b.guest_name || '',
      guest_phone: b.guest_phone || '',
      special_request: b.special_request || '',
      booking_status_cd: b.booking_status_cd,
      status_code: statusInfo.status_code,
      status_code_name: statusInfo.status_code_name,
      status_name: statusInfo.status_name,
      status_badge_variant: statusInfo.badge_variant,
      total_amount: Number(b.total_amount || 0),
      discount_amount: Number(b.discount_amount || 0),
      created_at: b.created_at,
      booking_date_formatted: b.created_at
        ? new Date(b.created_at).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        : '',
      coupon: couponData
        ? {
          coupon_id: couponData.coupon_id,
          code: couponData.code,
          discount_type: couponData.discount_type,
          discount_value: Number(couponData.discount_value),
          discount_text: discountText,
          min_order_amount: couponData.min_order_amount,
          valid_to: couponData.valid_to,
        }
        : null,
      hotel: {
        hotel_id: hotel.hotel_id,
        name: hotel.name || '',
        address: hotel.address || '',
        star_rating: hotel.star_rating != null ? Number(hotel.star_rating) : null,
        star_quality: hotel.star_quality != null ? Number(hotel.star_quality) : null,
        rating_score: avgReviewScore,
        review_count: hotelRevScores.length,
        thumbnail_url: defaultThumbnail,
        images: hotelImages,
      },
      stay: {
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        nights,
        days_left_text: daysLeftText,
        is_upcoming: category === 'upcoming',
        room_type_name: roomNamesSummary,
        bed_type: roomType.bed_type || '',
        room_size: roomType.room_size || '',
        max_adults: totalMaxAdults,
        max_children: totalMaxChildren,
        guests_summary: `${totalMaxAdults} người lớn${totalMaxChildren > 0 ? ` + ${totalMaxChildren} trẻ em` : ''}`,
        facilities: combinedFacilities,
        rooms: bookedRooms,
        unit_price: Number(firstDetail.unit_price || 0),
        quantity: totalQuantity,
      },
      cancellation: {
        cancellation_policy_id: policy?.cancellation_policy_id || b.cancellation_policy_id || null,
        free_cancel_before_hours: freeCancelHours,
        penalty_rate: penaltyRate,
        is_free_cancel: isWithinFreeCancelWindow && category === 'upcoming',
        deadline_text: cancelDeadlineStr,
        refund_percentage: refundPercentage,
        estimated_refund_amount: estimatedRefundAmount,
        description: policy?.description || null,
        policy_note: policyNote,
      },
      refund: refund
        ? {
          refund_id: refund.refund_id,
          transaction_id: refund.transaction_id,
          refund_amount: Number(refund.refund_amount || 0),
          refund_status_cd: refund.refund_status_cd,
          refund_status_name: refundStatusCodeName,
          refund_status_label: refundStatusLabel,
          gateway_refund_ref: refund.gateway_refund_ref || null,
          reason: refund.reason || '',
          created_at: refund.created_at,
        }
        : null,
      payment: {
        is_paid: paymentTxns.length > 0 && Boolean(latestPayment?.paid_at || latestPayment?.amount_paid),
        transaction_id: latestPayment?.transaction_id || null,
        amount_paid: latestPayment ? Number(latestPayment.amount_paid) : 0,
        payment_method_cd: latestPayment?.payment_method_cd || null,
        payment_method: paymentMethodLabel,
        gateway_ref_id: latestPayment?.gateway_ref_id || null,
        paid_at: latestPayment?.paid_at || null,
        has_vat_invoice: paymentTxns.length > 0 || category === 'completed',
      },
    };
  });

  // Filter by timeRange before or after computing tab counts
  let timeFiltered = enrichedList;
  if (timeRange && timeRange !== 'all') {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentYearStart = new Date(currentYear, 0, 1);

    timeFiltered = enrichedList.filter((b) => {
      if (!b.created_at) return false;
      const bookingDate = new Date(b.created_at);
      if (isNaN(bookingDate.getTime())) return false;

      if (timeRange === 'this_month') {
        return bookingDate >= currentMonthStart && bookingDate <= now;
      }
      if (timeRange === 'last_month') {
        return bookingDate >= previousMonthStart && bookingDate < currentMonthStart;
      }
      if (timeRange === 'last_30_days' || timeRange === 'last_90_days') {
        const days = timeRange === 'last_30_days' ? 30 : 90;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        return bookingDate >= startDate && bookingDate <= now;
      }
      if (timeRange === 'this_year') {
        return bookingDate >= currentYearStart && bookingDate <= now;
      }
      if (/^\d{4}$/.test(String(timeRange))) {
        const targetYear = Number(timeRange);
        return bookingDate.getFullYear() === targetYear;
      }
      return true;
    });
  }

  // Calculate tab counts on time-filtered dataset
  const counts = {
    all: timeFiltered.length,
    upcoming: timeFiltered.filter((b) => b.category === 'upcoming').length,
    completed: timeFiltered.filter((b) => b.category === 'completed').length,
    cancelled: timeFiltered.filter((b) => b.category === 'cancelled').length,
  };

  // Filter by category status tab
  let filtered = timeFiltered;
  if (status && status !== 'all') {
    filtered = filtered.filter((b) => b.category === status);
  }

  // Filter by search keyword
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((b) => {
      const matchCode = b.booking_code.toLowerCase().includes(q) || b.booking_id.toLowerCase().includes(q);
      const matchHotel = b.hotel.name.toLowerCase().includes(q) || b.hotel.address.toLowerCase().includes(q);
      const matchGuest = b.guest_name.toLowerCase().includes(q) || b.guest_phone.toLowerCase().includes(q);
      const matchRoom = b.stay.room_type_name.toLowerCase().includes(q);
      return matchCode || matchHotel || matchGuest || matchRoom;
    });
  }

  const availableYears = [...availableYearsSet].sort((a, b) => b - a);

  return {
    bookings: filtered,
    counts,
    available_years: availableYears,
  };
};

/**
 * Update guest info (name, phone, special requests) for a booking.
 */
const updateBookingGuestInfo = async (bookingId, { guest_name, guest_phone, special_request }) => {
  ensureClient();

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };
  if (guest_name !== undefined) updatePayload.guest_name = String(guest_name).trim();
  if (guest_phone !== undefined) {
    updatePayload.guest_phone = normalizePhoneNumber(guest_phone) || String(guest_phone).trim();
  }
  if (special_request !== undefined) updatePayload.special_request = String(special_request).trim();

  const { data, error } = await supabase
    .from('t_booking')
    .update(updatePayload)
    .eq('booking_id', bookingId)
    .select('*')
    .single();

  if (error) {
    throw createError(`Không thể cập nhật thông tin booking: ${error.message}`);
  }

  return data;
};

/**
 * Change stay dates for a booking and recalculate total_amount, discount_amount, and t_inventory.
 */
const changeBookingDates = async (bookingId, { check_in_date, check_out_date }) => {
  ensureClient();

  if (!check_in_date || !check_out_date) {
    throw createError('Vui lòng cung cấp ngày nhận và trả phòng hợp lệ.', 400);
  }

  const dIn = new Date(check_in_date);
  const dOut = new Date(check_out_date);
  if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
    throw createError('Ngày trả phòng phải sau ngày nhận phòng.', 400);
  }

  const existingBooking = await getBookingById(bookingId);
  const oldDetails = existingBooking.t_booking_detail || [];
  const oldCheckIn = oldDetails[0]?.check_in_date;
  const oldCheckOut = oldDetails[0]?.check_out_date;

  const roomsInput = oldDetails.map((d) => ({
    room_type_id: d.room_type_id,
    quantity: d.quantity,
  }));

  const recalculated = await calculatePricing({
    hotel_id: existingBooking.hotel_id,
    rooms: roomsInput,
    check_in_date,
    check_out_date,
    coupon_code: existingBooking.m_coupon?.code || null,
  });

  // Release old inventory and lock new inventory
  if (oldCheckIn && oldCheckOut) {
    await adjustInventoryForStay(roomsInput, oldCheckIn, oldCheckOut, -1);
  }
  await adjustInventoryForStay(recalculated.rooms, check_in_date, check_out_date, 1);

  // Update each t_booking_detail row with new dates and recalculated unit_price
  for (const roomPricing of recalculated.rooms) {
    const { error: detailError } = await supabase
      .from('t_booking_detail')
      .update({
        check_in_date,
        check_out_date,
        unit_price: roomPricing.unit_price,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('room_type_id', roomPricing.room_type_id);

    if (detailError) {
      throw createError(`Không thể cập nhật ngày lưu trú: ${detailError.message}`);
    }
  }

  const { data: updatedBooking, error: bookingUpdateErr } = await supabase
    .from('t_booking')
    .update({
      total_amount: recalculated.total_amount,
      discount_amount: recalculated.discount_amount || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .select('*')
    .single();

  if (bookingUpdateErr) {
    throw createError(`Không thể cập nhật tổng tiền đơn đặt phòng: ${bookingUpdateErr.message}`);
  }

  return {
    booking_id: bookingId,
    check_in_date,
    check_out_date,
    nights: recalculated.nights,
    total_amount: Number(updatedBooking.total_amount),
    discount_amount: Number(updatedBooking.discount_amount || 0),
    message: 'Đổi ngày lưu trú và cập nhật chi phí thành công!',
  };
};

/**
 * Cancel a booking using m_system_code ('3' = CAN), restore inventory, and record refund request based on policy.
 */
const cancelBooking = async (bookingId, { reason = 'Khách yêu cầu hủy phòng' } = {}) => {
  ensureClient();

  const [booking, sysCodes] = await Promise.all([
    getBookingById(bookingId),
    loadSystemCodes(['BOOKING_STS', 'REFUND_STS']),
  ]);

  const cancelledStatusCd = sysCodes.getCodeCd('BOOKING_STS', 'CAN', '3');

  // Update status to code_cd for 'CAN' ('3')
  const { error: updateErr } = await supabase
    .from('t_booking')
    .update({
      booking_status_cd: cancelledStatusCd,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId);

  if (updateErr) {
    throw createError(`Lỗi hủy đơn đặt phòng: ${updateErr.message}`);
  }

  // Restore inventory in t_inventory
  const details = booking.t_booking_detail || [];
  if (details.length > 0 && details[0].check_in_date && details[0].check_out_date) {
    await adjustInventoryForStay(details, details[0].check_in_date, details[0].check_out_date, -1);
  }

  // Calculate refund amount according to m_cancellation_policy and applied_penalty_rate
  const policy = booking.m_cancellation_policy || null;
  const freeCancelHours = policy?.free_cancel_before_hours != null ? Number(policy.free_cancel_before_hours) : null;
  const penaltyRate =
    booking.applied_penalty_rate != null
      ? Number(booking.applied_penalty_rate)
      : policy?.penalty_rate != null
        ? Number(policy.penalty_rate)
        : 0;

  let isWithinFreeWindow = true;
  const checkInDateStr = details[0]?.check_in_date;
  if (checkInDateStr && freeCancelHours != null) {
    const dCheckIn = new Date(checkInDateStr);
    const deadline = new Date(dCheckIn.getTime() - freeCancelHours * 60 * 60 * 1000);
    isWithinFreeWindow = new Date() <= deadline;
  }

  const appliedPenalty = isWithinFreeWindow ? 0 : penaltyRate;
  const refundPercent = Math.max(0, 100 - appliedPenalty);
  const calculatedRefundAmount = Math.round((Number(booking.total_amount || 0) * refundPercent) / 100);

  const paymentTxns = Array.isArray(booking.t_payment_transaction) ? booking.t_payment_transaction : [];
  const latestPayment = paymentTxns[0] || null;
  const refundStatusCd = sysCodes.getCodeCd('REFUND_STS', latestPayment ? 'PND' : 'PND', '1');
  const refundRef = `REF-${bookingId.substring(0, 8).toUpperCase()}`;

  const { data: refundRecord } = await supabase
    .from('t_refund_request')
    .insert({
      transaction_id: latestPayment?.transaction_id || null,
      booking_id: bookingId,
      refund_amount: calculatedRefundAmount,
      refund_status_cd: refundStatusCd,
      gateway_refund_ref: refundRef,
      reason: `${reason}${appliedPenalty > 0 ? ` (Áp dụng phí hủy ${appliedPenalty}% theo chính sách khách sạn)` : ' (Hủy trong thời hạn miễn phí)'}`,
    })
    .select('*')
    .maybeSingle();

  return {
    booking_id: bookingId,
    booking_status_cd: cancelledStatusCd,
    status_code_name: 'CAN',
    message:
      appliedPenalty > 0
        ? `Đã hủy đặt phòng. Áp dụng phí phạt ${appliedPenalty}% theo chính sách hủy, số tiền hoàn dự kiến: ${calculatedRefundAmount.toLocaleString('vi-VN')} đ.`
        : 'Đã hủy đặt phòng thành công trong thời hạn miễn phí hủy.',
    refund: refundRecord || {
      gateway_refund_ref: refundRef,
      refund_amount: calculatedRefundAmount,
      refund_status_cd: refundStatusCd,
    },
  };
};

/**
 * Get detailed voucher / E-ticket info strictly from DB records.
 */
const getBookingVoucher = async (bookingId) => {
  const [booking, sysCodes] = await Promise.all([
    getBookingById(bookingId),
    loadSystemCodes(['BOOKING_STS', 'PAYMENT_METHOD']),
  ]);

  const details = booking.t_booking_detail || [];
  const firstDetail = details[0] || {};
  const coupon = booking.m_coupon || null;
  const statusCodeName = sysCodes.getCodeName('BOOKING_STS', booking.booking_status_cd, 'PND');
  const paymentTxns = Array.isArray(booking.t_payment_transaction) ? booking.t_payment_transaction : [];
  const isPaid = paymentTxns.length > 0 && Boolean(paymentTxns[0]?.paid_at || paymentTxns[0]?.amount_paid);

  const bookingDateFormatted = booking.created_at
    ? new Date(booking.created_at).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';

  const bookingCode = formatBookingCode(booking.booking_id, booking.created_at);

  const discountText = coupon
    ? coupon.discount_type === 'PERCENT'
      ? `Giảm ${coupon.discount_value}%`
      : `Giảm ${Number(coupon.discount_value).toLocaleString('vi-VN')} đ`
    : 'Không sử dụng mã giảm giá';

  const roomSummary =
    details.length > 1
      ? details.map((d) => `${d.quantity}x ${d.m_room_type?.type_name || ''}`).join(', ')
      : firstDetail.m_room_type?.type_name || '';

  return {
    booking_id: booking.booking_id,
    booking_code: bookingCode,
    voucher_code: coupon?.code || bookingCode,
    coupon_id: coupon?.coupon_id || null,
    coupon_code: coupon?.code || null,
    discount_type: coupon?.discount_type || null,
    discount_value: coupon ? Number(coupon.discount_value) : 0,
    discount_amount: Number(booking.discount_amount || 0),
    discount_text: discountText,
    min_order_amount: coupon?.min_order_amount || null,
    valid_from: coupon?.valid_from || null,
    valid_to: coupon?.valid_to || null,
    booking_date: bookingDateFormatted,
    booking_created_at: booking.created_at,
    booking_status_cd: booking.booking_status_cd,
    status_code_name: statusCodeName,
    is_paid: isPaid,
    qr_data: `AVORABK:${booking.booking_id}:${bookingCode}`,
    hotel_name: booking.m_hotel?.name || '',
    hotel_address: booking.m_hotel?.address || '',
    guest_name: booking.guest_name || '',
    guest_phone: booking.guest_phone || '',
    room_type: roomSummary,
    rooms: details.map((d) => ({
      room_type_id: d.room_type_id,
      type_name: d.m_room_type?.type_name || '',
      quantity: d.quantity,
      unit_price: Number(d.unit_price || 0),
      check_in_date: d.check_in_date,
      check_out_date: d.check_out_date,
    })),
    check_in_date: firstDetail.check_in_date || '',
    check_out_date: firstDetail.check_out_date || '',
    total_amount: Number(booking.total_amount || 0),
    cancellation_policy: booking.m_cancellation_policy || null,
    instruction: 'Vui lòng xuất trình mã đặt phòng hoặc số điện thoại đăng ký tại quầy lễ tân khi nhận phòng.',
  };
};

/**
 * Get booking receipt / invoice summary derived from actual booking & hotel records in DB.
 */
const getBookingInvoice = async (bookingId) => {
  const [booking, sysCodes] = await Promise.all([
    getBookingById(bookingId),
    loadSystemCodes(['BOOKING_STS', 'PAYMENT_METHOD']),
  ]);

  const statusCodeName = sysCodes.getCodeName('BOOKING_STS', booking.booking_status_cd, 'PND');
  const paymentTxns = Array.isArray(booking.t_payment_transaction) ? booking.t_payment_transaction : [];
  const latestPayment = paymentTxns[0] || null;
  const details = booking.t_booking_detail || [];

  const subtotal = details.reduce((sum, d) => {
    const dIn = new Date(d.check_in_date);
    const dOut = new Date(d.check_out_date);
    const nights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)) || 1);
    return sum + Number(d.unit_price || 0) * Number(d.quantity || 1) * nights;
  }, 0);

  const createdYear = booking.created_at ? new Date(booking.created_at).getFullYear() : new Date().getFullYear();

  return {
    invoice_number: `BK-${createdYear}-${booking.booking_id.substring(0, 6).toUpperCase()}`,
    lookup_code: booking.booking_id.substring(0, 8).toUpperCase(),
    hotel_name: booking.m_hotel?.name || '',
    hotel_address: booking.m_hotel?.address || '',
    issued_date: booking.created_at ? new Date(booking.created_at).toLocaleDateString('vi-VN') : '',
    buyer_name: booking.guest_name || '',
    buyer_phone: booking.guest_phone || '',
    subtotal: subtotal || Number(booking.total_amount || 0),
    discount_amount: Number(booking.discount_amount || 0),
    coupon_code: booking.m_coupon?.code || null,
    total_amount: Number(booking.total_amount || 0),
    amount_paid: latestPayment ? Number(latestPayment.amount_paid) : 0,
    payment_method_cd: latestPayment?.payment_method_cd || null,
    gateway_ref_id: latestPayment?.gateway_ref_id || null,
    booking_status_cd: booking.booking_status_cd,
    status_code_name: statusCodeName,
    invoice_status:
      latestPayment
        ? `Đã ghi nhận giao dịch (${latestPayment.gateway_ref_id || latestPayment.transaction_id.substring(0, 8)})`
        : statusCodeName === 'CFM'
          ? 'Đơn đã xác nhận (Chưa có giao dịch thanh toán trực tuyến)'
          : 'Chờ thanh toán',
  };
};

module.exports = {
  calculatePricing,
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingGuestInfo,
  changeBookingDates,
  cancelBooking,
  getBookingVoucher,
  getBookingInvoice,
  adjustInventoryForStay,
};
