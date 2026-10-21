'use strict';

const supabase = require('../../config/supabaseClient');
const { normalizeGuestPhone, validateStayDates } = require('./booking.validation');
const {
  getOperationalRoomCount,
  isOperationalRoom,
} = require('../hotels/hotel.availability');
const { createInventorySeed } = require('./booking.inventory');
const { getRoomTypesForHotel } = require('./booking.room-types');

const PENDING_BOOKING_TTL_MS = 10 * 60 * 1000;

const createError = (message, statusCode = 500, code = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
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
 * Ensure database timestamps without timezone offsets are treated as UTC ISO strings with trailing Z
 */
const ensureUtcIsoString = (val) => {
  if (!val) return val;
  const s = String(val).trim();
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    return `${s}Z`;
  }
  return s;
};

/**
 * Format short booking reference code from booking_id and created_at.
 */
const formatBookingCode = (bookingId, createdAt) => {
  const d = createdAt ? new Date(ensureUtcIsoString(createdAt)) : new Date();
  const bYear = d.getFullYear() % 100;
  const bMonth = String(d.getMonth() + 1).padStart(2, '0');
  const bCodeSuffix = String(bookingId || '').substring(0, 4).toUpperCase();
  return `AV-${bMonth}${bYear}-${bCodeSuffix}`;
};

const parseDateString = (dateString) => {
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (date, days = 1) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const formatDateString = (date) => date.toISOString().slice(0, 10);

const getVietnamToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date());

const getStayDates = (checkInStr, checkOutStr) => {
  const dates = [];
  for (let date = parseDateString(checkInStr); date < parseDateString(checkOutStr); date = addDays(date)) {
    dates.push(formatDateString(date));
  }
  return dates;
};

const getBookingStatusCodes = async () => {
  const sysCodes = await loadSystemCodes(['BOOKING_STS']);
  return {
    sysCodes,
    pending: sysCodes.getCodeCd('BOOKING_STS', 'PND', '1'),
    confirmed: sysCodes.getCodeCd('BOOKING_STS', 'CFM', '2'),
  };
};

const hasBookingStatus = (booking, codeName, codeCd, sysCodes) => (
  sysCodes.getCodeName('BOOKING_STS', booking.booking_status_cd) === codeName ||
  String(booking.booking_status_cd) === String(codeCd)
);

const loadActiveBookingHolds = async (roomTypeIds, checkInStr, checkOutStr, excludeBookingId = null) => {
  if (roomTypeIds.length === 0) return new Map();

  const [{ data: details, error }, statusCodes] = await Promise.all([
    supabase
      .from('t_booking_detail')
      .select('room_type_id, quantity, check_in_date, check_out_date, t_booking!inner(booking_id, booking_status_cd, created_at)')
      .in('room_type_id', roomTypeIds)
      .lt('check_in_date', checkOutStr)
      .gt('check_out_date', checkInStr),
    getBookingStatusCodes(),
  ]);

  if (error) throw createError(`Không thể kiểm tra phòng đã đặt: ${error.message}`);

  const cutoff = Date.now() - PENDING_BOOKING_TTL_MS;
  const dateSet = new Set(getStayDates(checkInStr, checkOutStr));
  const heldByRoomType = new Map();
  (details || []).forEach((detail) => {
    const booking = detail.t_booking;
    if (!booking || String(booking.booking_id) === String(excludeBookingId)) return;

    const isPendingActive =
      hasBookingStatus(booking, 'PND', statusCodes.pending, statusCodes.sysCodes) &&
      new Date(booking.created_at).getTime() > cutoff;
    const isConfirmed = hasBookingStatus(booking, 'CFM', statusCodes.confirmed, statusCodes.sysCodes);
    if (!isConfirmed && !isPendingActive) return;

    const start = String(detail.check_in_date).slice(0, 10);
    const end = String(detail.check_out_date).slice(0, 10);
    for (const date of getStayDates(start < checkInStr ? checkInStr : start, end > checkOutStr ? checkOutStr : end)) {
      if (!dateSet.has(date)) continue;
      if (!heldByRoomType.has(detail.room_type_id)) heldByRoomType.set(detail.room_type_id, new Map());
      const heldByDate = heldByRoomType.get(detail.room_type_id);
      heldByDate.set(date, (heldByDate.get(date) || 0) + Number(detail.quantity || 0));
    }
  });

  return heldByRoomType;
};

const getExcludedBookingQuantity = (details, roomTypeId, date) => (details || []).reduce((sum, detail) => {
  const checkIn = String(detail.check_in_date).slice(0, 10);
  const checkOut = String(detail.check_out_date).slice(0, 10);
  return detail.room_type_id === roomTypeId && checkIn <= date && date < checkOut
    ? sum + Number(detail.quantity || 0)
    : sum;
}, 0);

const ensureBookingAccess = async (booking, currentUser) => {
  if (!currentUser?.user_id) {
    throw createError('Vui lòng đăng nhập để tiếp tục.', 401);
  }
  if (String(booking.user_id) === String(currentUser.user_id)) return;

  const tokenRoleName = String(currentUser.role_code_name || currentUser.role_name || '').toUpperCase();
  if (tokenRoleName === 'ADM') return;

  if (currentUser.role_cd) {
    const { data: role, error } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'USER_ROLE')
      .eq('code_cd', currentUser.role_cd)
      .maybeSingle();
    if (error) throw createError(`Không thể kiểm tra quyền người dùng: ${error.message}`);
    if (String(role?.code_name || '').toUpperCase() === 'ADM') return;
  }

  throw createError('Bạn không có quyền truy cập đơn đặt phòng này.', 403);
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
  exclude_booking_id,
  excluded_details = [],
}) => {
  ensureClient();

  const now = new Date();
  const dateErrors = validateStayDates(check_in_date, check_out_date);
  if (dateErrors.length > 0) throw createError(dateErrors[0], 400);
  if (!hotel_id) throw createError('hotel_id là bắt buộc.', 400);
  const checkInStr = String(check_in_date).trim();
  const checkOutStr = String(check_out_date).trim();
  const stayDates = getStayDates(checkInStr, checkOutStr);
  const nights = stayDates.length;

  // 1. Resolve hotel from m_hotel
  const activeHotelId = hotel_id;

  const { data: foundHotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, description, address, city_id, district_id, ward_id, star_rating, star_quality, hotel_status, is_deleted')
    .eq('hotel_id', activeHotelId)
    .eq('hotel_status', 'ACTIVE')
    .eq('is_deleted', false)
    .maybeSingle();
  if (hotelError) throw createError(`Không thể kiểm tra khách sạn: ${hotelError.message}`);
  if (!foundHotel) throw createError('Khách sạn không tồn tại hoặc hiện không nhận đặt phòng.', 400);
  const dbHotel = foundHotel;

  // Normalize rooms list
  const roomItems = Array.isArray(rooms) && rooms.length > 0
    ? rooms
    : room_type_id
      ? [{ room_type_id, quantity }]
      : [];

  // Fetch room types from m_room_type
  const requestedRoomTypeIds = [...new Set(roomItems.map((room) => room.room_type_id).filter(Boolean))];
  if (requestedRoomTypeIds.length === 0) {
    throw createError('Vui lòng chọn ít nhất 1 hạng phòng để đặt.', 400);
  }
  const [{ data: roomTypeRows, error: rtError }, { data: hotelRoomRows, error: hotelRoomError }] = await Promise.all([
    supabase
      .from('m_room_type')
      .select('room_type_id, hotel_id, type_name, default_price, bed_type, room_size, max_adults, max_children')
      .in('room_type_id', requestedRoomTypeIds)
      .or('is_deleted.is.null,is_deleted.eq.false'),
    supabase
      .from('m_room')
      .select('room_type_id')
      .eq('hotel_id', activeHotelId)
      .eq('is_deleted', false)
      .in('room_type_id', requestedRoomTypeIds),
  ]);
  if (rtError) throw createError(`Không thể lấy thông tin hạng phòng: ${rtError.message}`);
  if (hotelRoomError) throw createError(`Không thể xác minh hạng phòng thuộc khách sạn: ${hotelRoomError.message}`);
  const dbRoomTypes = getRoomTypesForHotel(
    roomTypeRows || [],
    activeHotelId,
    (hotelRoomRows || []).map((room) => room.room_type_id)
  );
  if (dbRoomTypes.length !== requestedRoomTypeIds.length) {
    throw createError('Một hoặc nhiều hạng phòng không hợp lệ hoặc không thuộc khách sạn đã chọn.', 400);
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
      .select('room_type_id, target_date, available_rooms, locked_rooms, current_price')
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

  const roomTypeMap = new Map(dbRoomTypes.map((rt) => [String(rt.room_type_id), rt]));
  const heldByRoomType = await loadActiveBookingHolds(
    validRoomTypeIds,
    checkInStr,
    checkOutStr,
    exclude_booking_id
  );

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

  // Calculate each night's amount from inventory, falling back to the room type's base price.
  let subtotal = 0;
  const processedRooms = roomItems.map((item) => {
    const rt = roomTypeMap.get(String(item.room_type_id));
    if (!rt) throw createError('Hạng phòng không thuộc khách sạn đã chọn.', 400);
    const rtId = rt.room_type_id;
    const invList = invByRoomType.get(rtId) || [];
    const defaultPrice = Number(rt.default_price || 0);
    const inventoryByDate = new Map(invList.map((inv) => [String(inv.target_date).slice(0, 10), inv]));
    const nightlyPrices = stayDates.map((date) => {
      const inventory = inventoryByDate.get(date);
      return inventory?.current_price != null ? Number(inventory.current_price) : defaultPrice;
    });
    const roomStayPrice = nightlyPrices.reduce((sum, price) => sum + price, 0);
    const unitPrice = roomStayPrice / nights;

    const physRooms = physRoomsByType.get(rtId) || [];
    const physicalRoomCount = getOperationalRoomCount(physRooms);
    const nightlyAvailability = stayDates.map((date) => {
      const inventory = inventoryByDate.get(date);
      const excludedQuantity = getExcludedBookingQuantity(excluded_details, rtId, date);
      if (inventory) return Number(inventory.available_rooms ?? 0) + excludedQuantity;
      const held = heldByRoomType.get(rtId)?.get(date) || 0;
      return physicalRoomCount - held;
    });
    const availableRooms = nightlyAvailability.length ? Math.min(...nightlyAvailability) : 0;

    const qty = Math.max(1, Number(item.quantity) || 1);
    const roomSubtotal = roomStayPrice * qty;
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
          const { pending, confirmed } = await getBookingStatusCodes();
          const cutoff = new Date(Date.now() - PENDING_BOOKING_TTL_MS).toISOString();
          const [confirmedCount, pendingCount] = await Promise.all([
            supabase
              .from('t_booking')
              .select('booking_id', { count: 'exact', head: true })
              .eq('coupon_id', dbCoupon.coupon_id)
              .eq('booking_status_cd', confirmed),
            supabase
              .from('t_booking')
              .select('booking_id', { count: 'exact', head: true })
              .eq('coupon_id', dbCoupon.coupon_id)
              .eq('booking_status_cd', pending)
              .gt('created_at', cutoff),
          ]);
          if (confirmedCount.error || pendingCount.error) {
            throw createError(`Lỗi kiểm tra lượt sử dụng coupon: ${(confirmedCount.error || pendingCount.error).message}`);
          }
          const usageCount = (confirmedCount.count || 0) + (pendingCount.count || 0);
          if (usageCount >= dbCoupon.usage_limit) {
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
const createSoldOutError = (dates) => createError(
  `SOLD_OUT: Không đủ phòng trong các đêm: ${[...new Set(dates)].sort().join(', ')}.`,
  409,
  'SOLD_OUT'
);

const loadInventoryFallback = async (rooms, checkInStr, checkOutStr, excludeBookingId = null) => {
  const roomTypeIds = [...new Set(rooms.map((room) => room.room_type_id))];
  const [{ data: physicalRooms, error }, { data: roomTypes, error: roomTypeError }, heldByRoomType] = await Promise.all([
    supabase
      .from('m_room')
      .select('room_type_id, status_cd')
      .in('room_type_id', roomTypeIds)
      .eq('is_deleted', false),
    supabase
      .from('m_room_type')
      .select('room_type_id, default_price')
      .in('room_type_id', roomTypeIds),
    loadActiveBookingHolds(roomTypeIds, checkInStr, checkOutStr, excludeBookingId),
  ]);
  if (error) throw createError(`Không thể kiểm tra tổng số phòng: ${error.message}`);
  if (roomTypeError) throw createError(`Không thể đọc giá hạng phòng: ${roomTypeError.message}`);

  const roomsByType = new Map();
  const pricesByType = new Map((roomTypes || []).map((roomType) => [
    roomType.room_type_id,
    Number(roomType.default_price || 0),
  ]));
  const operationalRoomCounts = new Map();
  (physicalRooms || []).forEach((room) => {
    if (!isOperationalRoom(room)) return;
    operationalRoomCounts.set(
      room.room_type_id,
      (operationalRoomCounts.get(room.room_type_id) || 0) + 1
    );
  });
  operationalRoomCounts.forEach((count, roomTypeId) => roomsByType.set(roomTypeId, count));
  return { roomsByType, pricesByType, heldByRoomType };
};

const loadNightlyAvailability = async (rooms, checkInStr, checkOutStr, excludeBookingId, excludedDetails = []) => {
  const roomTypeIds = [...new Set(rooms.map((room) => room.room_type_id))];
  const [{ data: inventoryRows, error: inventoryError }, { data: physicalRooms, error: roomsError }, heldByRoomType] =
    await Promise.all([
      supabase
        .from('t_inventory')
        .select('room_type_id, target_date, available_rooms')
        .in('room_type_id', roomTypeIds)
        .gte('target_date', checkInStr)
        .lt('target_date', checkOutStr),
      supabase
        .from('m_room')
        .select('room_type_id, status_cd')
        .in('room_type_id', roomTypeIds)
        .eq('is_deleted', false),
      loadActiveBookingHolds(roomTypeIds, checkInStr, checkOutStr, excludeBookingId),
    ]);
  if (inventoryError) throw createError(`Không thể đọc tồn kho: ${inventoryError.message}`);
  if (roomsError) throw createError(`Không thể kiểm tra tổng số phòng: ${roomsError.message}`);

  const physicalCountByType = new Map();
  (physicalRooms || []).forEach((room) => {
    if (!isOperationalRoom(room)) return;
    physicalCountByType.set(
      room.room_type_id,
      (physicalCountByType.get(room.room_type_id) || 0) + 1
    );
  });
  const inventoryByKey = new Map((inventoryRows || []).map((row) => [
    `${row.room_type_id}:${String(row.target_date).slice(0, 10)}`,
    row,
  ]));
  const availability = new Map();
  for (const room of rooms) {
    for (const date of getStayDates(checkInStr, checkOutStr)) {
      const inventory = inventoryByKey.get(`${room.room_type_id}:${date}`);
      const available = inventory
        ? Number(inventory.available_rooms || 0) + getExcludedBookingQuantity(excludedDetails, room.room_type_id, date)
        : (physicalCountByType.get(room.room_type_id) || 0)
          - (heldByRoomType.get(room.room_type_id)?.get(date) || 0);
      availability.set(`${room.room_type_id}:${date}`, available);
    }
  }
  return availability;
};

const readInventoryRow = async (roomTypeId, dateStr) => {
  const { data, error } = await supabase
    .from('t_inventory')
    .select('available_rooms, locked_rooms, version')
    .eq('room_type_id', roomTypeId)
    .eq('target_date', dateStr)
    .maybeSingle();
  if (error) throw createError(`Không thể đọc tồn kho: ${error.message}`);
  return data;
};

const applyInventoryDeltaForNight = async (roomTypeId, dateStr, quantity, deltaSign, fallback) => {
  let inventory = await readInventoryRow(roomTypeId, dateStr);
  if (!inventory) {
    const held = fallback.heldByRoomType.get(roomTypeId)?.get(dateStr) || 0;
    const totalRooms = fallback.roomsByType.get(roomTypeId) || 0;
    const inventorySeed = createInventorySeed(totalRooms, held);
    const { error } = await supabase
      .from('t_inventory')
      .upsert({
        room_type_id: roomTypeId,
        target_date: dateStr,
        ...inventorySeed,
        current_price: fallback.pricesByType.get(roomTypeId) || 0,
      }, {
        onConflict: 'room_type_id,target_date',
        ignoreDuplicates: true,
      });
    if (error) throw createError(`Không thể khởi tạo tồn kho: ${error.message}`);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    inventory = await readInventoryRow(roomTypeId, dateStr);
    if (!inventory) continue;

    const nextAvailable = Number(inventory.available_rooms || 0) - deltaSign * quantity;
    if (nextAvailable < 0) throw createSoldOutError([dateStr]);
    const { data: updated, error } = await supabase
      .from('t_inventory')
      .update({
        available_rooms: nextAvailable,
        locked_rooms: Math.max(0, Number(inventory.locked_rooms || 0) + deltaSign * quantity),
        version: Number(inventory.version || 0) + 1,
      })
      .eq('room_type_id', roomTypeId)
      .eq('target_date', dateStr)
      .eq('version', inventory.version)
      .select('available_rooms')
      .maybeSingle();

    if (error) throw createError(`Không thể cập nhật tồn kho: ${error.message}`);
    if (!updated) continue;
    if (Number(updated.available_rooms) < 0) throw createSoldOutError([dateStr]);
    return;
  }

  throw createSoldOutError([dateStr]);
};

const adjustInventoryForStay = async (
  rooms,
  checkInStr,
  checkOutStr,
  deltaSign = 1,
  excludeBookingId = null,
  includedNights = null
) => {
  const fallback = await loadInventoryFallback(rooms, checkInStr, checkOutStr, excludeBookingId);
  const quantities = new Map();
  for (const room of rooms) {
    const quantity = Math.max(1, Number(room.quantity) || 1);
    for (const date of getStayDates(checkInStr, checkOutStr)) {
      if (includedNights && !includedNights.has(`${room.room_type_id}:${date}`)) continue;
      const key = `${room.room_type_id}:${date}`;
      quantities.set(key, {
        roomTypeId: room.room_type_id,
        date,
        quantity: (quantities.get(key)?.quantity || 0) + quantity,
      });
    }
  }

  const soldOutDates = [];
  for (const item of quantities.values()) {
    const inventory = await readInventoryRow(item.roomTypeId, item.date);
    const held = fallback.heldByRoomType.get(item.roomTypeId)?.get(item.date) || 0;
    const available = inventory
      ? Number(inventory.available_rooms || 0)
      : (fallback.roomsByType.get(item.roomTypeId) || 0) - held - (deltaSign < 0 ? item.quantity : 0);
    if (deltaSign > 0 && available < item.quantity) soldOutDates.push(item.date);
  }
  if (soldOutDates.length > 0) throw createSoldOutError(soldOutDates);

  const applied = [];
  try {
    for (const item of quantities.values()) {
      await applyInventoryDeltaForNight(item.roomTypeId, item.date, item.quantity, deltaSign, fallback);
      applied.push(item);
    }
  } catch (error) {
    let rollbackError = null;
    for (const item of applied.reverse()) {
      try {
        await applyInventoryDeltaForNight(item.roomTypeId, item.date, item.quantity, -deltaSign, fallback);
      } catch (rollbackFailure) {
        rollbackError = rollbackFailure;
      }
    }
    if (rollbackError) {
      throw createError(
        `Lỗi cập nhật tồn kho: ${error.message}; không thể hoàn tác tồn kho: ${rollbackError.message}`,
        error.statusCode || 500,
        error.code
      );
    }
    throw error;
  }

  return [...quantities.values()];
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

  // Khóa chống thao tác song song / double-click theo user, khách sạn, ngày và các phòng đã chọn
  const roomKeySummary = (Array.isArray(payload.rooms) && payload.rooms.length > 0 ? payload.rooms : [{ room_type_id: payload.room_type_id, quantity: payload.quantity }])
    .map((r) => `${r.room_type_id}:${r.quantity || 1}`)
    .sort()
    .join(';');
  const lockKey = `${userId}_${payload.hotel_id}_${payload.check_in_date}_${payload.check_out_date}_${roomKeySummary}`;
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

        const sortedDetails = [...details].sort((x, y) => String(x.room_type_id).localeCompare(String(y.room_type_id)));
        const sortedPricingRooms = [...pricing.rooms].sort((x, y) => String(x.room_type_id).localeCompare(String(y.room_type_id)));

        return sortedDetails.every((d, idx) => {
          const pr = sortedPricingRooms[idx];
          if (!pr || String(d.room_type_id) !== String(pr.room_type_id)) return false;
          if (Number(d.quantity) !== Number(pr.quantity)) return false;

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
          created_at: ensureUtcIsoString(duplicate.created_at),
          is_duplicate_prevented: true,
        };
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

    const normalizedPhone = normalizeGuestPhone(payload.guest_phone);

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

    try {
      await adjustInventoryForStay(
        pricing.rooms,
        pricing.check_in_date,
        pricing.check_out_date,
        1,
        createdBooking.booking_id
      );
    } catch (inventoryError) {
      const { error: detailCleanupError } = await supabase
        .from('t_booking_detail')
        .delete()
        .eq('booking_id', createdBooking.booking_id);
      const { error: bookingCleanupError } = await supabase
        .from('t_booking')
        .delete()
        .eq('booking_id', createdBooking.booking_id);
      if (detailCleanupError || bookingCleanupError) {
        throw createError(
          `Lỗi tồn kho: ${inventoryError.message}; lỗi hoàn tác đơn: ${(detailCleanupError || bookingCleanupError).message}`,
          inventoryError.statusCode || 500,
          inventoryError.code
        );
      }
      throw inventoryError;
    }

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
      created_at: ensureUtcIsoString(createdBooking.created_at),
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
  const todayStr = getVietnamToday();

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
      created_at: ensureUtcIsoString(b.created_at),
      booking_date_formatted: b.created_at
        ? new Date(ensureUtcIsoString(b.created_at)).toLocaleDateString('vi-VN', {
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
const updateBookingGuestInfo = async (bookingId, { guest_name, guest_phone, special_request }, currentUser) => {
  ensureClient();
  const booking = await getBookingById(bookingId);
  await ensureBookingAccess(booking, currentUser);

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };
  if (guest_name !== undefined) updatePayload.guest_name = String(guest_name).trim();
  if (guest_phone !== undefined) {
    updatePayload.guest_phone = normalizeGuestPhone(guest_phone);
  }
  if (special_request !== undefined) {
    updatePayload.special_request = special_request === null ? null : special_request.trim();
  }

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
const changeBookingDates = async (bookingId, { check_in_date, check_out_date }, currentUser) => {
  ensureClient();

  if (!check_in_date || !check_out_date) {
    throw createError('Vui lòng cung cấp ngày nhận và trả phòng hợp lệ.', 400);
  }

  const newCheckIn = String(check_in_date).trim();
  const newCheckOut = String(check_out_date).trim();
  const dateErrors = validateStayDates(newCheckIn, newCheckOut);
  if (dateErrors.length > 0) throw createError(dateErrors[0], 400);

  const existingBooking = await getBookingById(bookingId);
  await ensureBookingAccess(existingBooking, currentUser);
  const statusCodes = await getBookingStatusCodes();
  if (
    !hasBookingStatus(existingBooking, 'PND', statusCodes.pending, statusCodes.sysCodes) &&
    !hasBookingStatus(existingBooking, 'CFM', statusCodes.confirmed, statusCodes.sysCodes)
  ) {
    throw createError('Chỉ được đổi ngày cho đơn đang chờ hoặc đã xác nhận.', 400);
  }
  const oldDetails = existingBooking.t_booking_detail || [];
  const roomsInput = oldDetails.map((d) => ({
    room_type_id: d.room_type_id,
    quantity: d.quantity,
  }));

  const recalculated = await calculatePricing({
    hotel_id: existingBooking.hotel_id,
    rooms: roomsInput,
    check_in_date: newCheckIn,
    check_out_date: newCheckOut,
    coupon_code: existingBooking.m_coupon?.code || null,
    exclude_booking_id: bookingId,
    excluded_details: oldDetails,
  });

  const availability = await loadNightlyAvailability(
    recalculated.rooms,
    newCheckIn,
    newCheckOut,
    bookingId,
    oldDetails
  );
  const soldOutDates = [];
  const quantityByRoomType = new Map();
  recalculated.rooms.forEach((room) => {
    quantityByRoomType.set(
      room.room_type_id,
      (quantityByRoomType.get(room.room_type_id) || 0) + Number(room.quantity || 0)
    );
  });
  for (const [roomTypeId, quantity] of quantityByRoomType) {
    for (const date of getStayDates(newCheckIn, newCheckOut)) {
      if ((availability.get(`${roomTypeId}:${date}`) ?? 0) < quantity) {
        soldOutDates.push(date);
      }
    }
  }
  if (soldOutDates.length) throw createSoldOutError(soldOutDates);

  const oldNightKeys = new Set();
  oldDetails.forEach((detail) => {
    getStayDates(String(detail.check_in_date).slice(0, 10), String(detail.check_out_date).slice(0, 10))
      .forEach((date) => oldNightKeys.add(`${detail.room_type_id}:${date}`));
  });
  const newNightKeys = new Set();
  recalculated.rooms.forEach((room) => {
    getStayDates(newCheckIn, newCheckOut).forEach((date) => newNightKeys.add(`${room.room_type_id}:${date}`));
  });
  const addedNights = new Set([...newNightKeys].filter((key) => !oldNightKeys.has(key)));
  const removedNights = new Set([...oldNightKeys].filter((key) => !newNightKeys.has(key)));
  let reservedNights = false;
  const changedDetails = [];
  let bookingTotalsUpdated = false;

  const rollbackDateChange = async () => {
    let rollbackFailure = null;
    for (const detail of changedDetails.reverse()) {
      const { error } = await supabase
        .from('t_booking_detail')
        .update({
          check_in_date: detail.check_in_date,
          check_out_date: detail.check_out_date,
          unit_price: detail.unit_price,
        })
        .eq('booking_detail_id', detail.booking_detail_id);
      if (error) rollbackFailure = error;
    }
    if (bookingTotalsUpdated) {
      const { error } = await supabase
        .from('t_booking')
        .update({
          total_amount: existingBooking.total_amount,
          discount_amount: existingBooking.discount_amount || 0,
        })
        .eq('booking_id', bookingId);
      if (error) rollbackFailure = error;
    }
    if (reservedNights) {
      try {
        await adjustInventoryForStay(
          recalculated.rooms,
          newCheckIn,
          newCheckOut,
          -1,
          bookingId,
          addedNights
        );
      } catch (error) {
        rollbackFailure = error;
      }
    }
    if (rollbackFailure) {
      throw createError(`Không thể hoàn tác thay đổi ngày: ${rollbackFailure.message}`);
    }
  };

  try {
    if (addedNights.size > 0) {
      await adjustInventoryForStay(
        recalculated.rooms,
        newCheckIn,
        newCheckOut,
        1,
        bookingId,
        addedNights
      );
      reservedNights = true;
    }

    for (const roomPricing of recalculated.rooms) {
      for (const detail of oldDetails.filter((row) => row.room_type_id === roomPricing.room_type_id)) {
        const { error: detailError } = await supabase
          .from('t_booking_detail')
          .update({
            check_in_date: newCheckIn,
            check_out_date: newCheckOut,
            unit_price: roomPricing.unit_price,
            updated_at: new Date().toISOString(),
          })
          .eq('booking_detail_id', detail.booking_detail_id);

        if (detailError) {
          throw createError(`Không thể cập nhật ngày lưu trú: ${detailError.message}`);
        }
        changedDetails.push(detail);
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
    bookingTotalsUpdated = true;

    if (removedNights.size > 0) {
      const oldCheckIn = oldDetails.map((detail) => String(detail.check_in_date).slice(0, 10)).sort()[0];
      const oldCheckOut = oldDetails.map((detail) => String(detail.check_out_date).slice(0, 10)).sort().reverse()[0];
      await adjustInventoryForStay(roomsInput, oldCheckIn, oldCheckOut, -1, null, removedNights);
    }

    return {
      booking_id: bookingId,
      check_in_date: newCheckIn,
      check_out_date: newCheckOut,
      nights: recalculated.nights,
      total_amount: Number(updatedBooking.total_amount),
      discount_amount: Number(updatedBooking.discount_amount || 0),
      message: 'Đổi ngày lưu trú và cập nhật chi phí thành công!',
    };
  } catch (error) {
    await rollbackDateChange();
    throw error;
  }
};

/**
 * Cancel a booking using m_system_code ('3' = CAN), restore inventory, and record refund request based on policy.
 */
const cancelBooking = async (bookingId, { reason = 'Khách yêu cầu hủy phòng' } = {}, currentUser) => {
  ensureClient();

  const [booking, sysCodes] = await Promise.all([
    getBookingById(bookingId),
    loadSystemCodes(['BOOKING_STS', 'REFUND_STS']),
  ]);
  await ensureBookingAccess(booking, currentUser);

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
    try {
      await adjustInventoryForStay(details, details[0].check_in_date, details[0].check_out_date, -1);
    } catch (inventoryError) {
      const { error: statusRollbackError } = await supabase
        .from('t_booking')
        .update({ booking_status_cd: booking.booking_status_cd })
        .eq('booking_id', bookingId);
      if (statusRollbackError) {
        throw createError(
          `Lỗi hoàn tồn kho: ${inventoryError.message}; không thể khôi phục trạng thái đơn: ${statusRollbackError.message}`,
          inventoryError.statusCode || 500,
          inventoryError.code
        );
      }
      throw inventoryError;
    }
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
  loadActiveBookingHolds,
};
