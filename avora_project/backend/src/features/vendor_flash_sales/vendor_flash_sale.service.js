'use strict';

const supabase = require('../../config/supabaseClient');

let customClient = null;
const setCustomClient = (client) => {
  customClient = client;
};
const getClient = () => customClient || supabase;

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getHotelPrefix = (hotelId) => {
  if (!hotelId || typeof hotelId !== 'string') return '';
  return hotelId.trim().split('-')[0].toUpperCase();
};

/**
 * Lấy danh sách các khách sạn mà Vendor sở hữu và có quyền quản lý
 */
const getAccessibleVendorHotels = async (userId) => {
  const client = getClient();
  const { data, error } = await client
    .from('m_hotel')
    .select('hotel_id, name, address, owner_id')
    .eq('owner_id', userId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (error) {
    console.error('[VendorFlashSale] Lỗi lấy danh sách khách sạn:', error.message);
    throw createError('Không thể tải danh sách khách sạn bạn quản lý.', 500);
  }

  return data || [];
};

/**
 * Thống kê số lượt và tổng tiền đã giảm từ t_booking cho danh sách coupon
 */
const getBookingUsageStats = async (couponIds) => {
  const usageMap = {};
  const discountAmountMap = {};
  if (!couponIds || couponIds.length === 0) return { usageMap, discountAmountMap };

  const client = getClient();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data: bookings, error } = await client
      .from('t_booking')
      .select('coupon_id, discount_amount')
      .in('coupon_id', couponIds)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn('[VendorFlashSale] Cảnh báo lấy thống kê đặt phòng:', error.message);
      break;
    }

    (bookings || []).forEach((b) => {
      usageMap[b.coupon_id] = (usageMap[b.coupon_id] || 0) + 1;
      discountAmountMap[b.coupon_id] =
        (discountAmountMap[b.coupon_id] || 0) + Number(b.discount_amount || 0);
    });

    if (!bookings || bookings.length < pageSize) break;
    offset += pageSize;
  }

  return { usageMap, discountAmountMap };
};

/**
 * Làm giàu dữ liệu coupon với thông tin khách sạn và trạng thái
 */
const enrichFlashSale = (coupon, hotelMap, usageStats, now = new Date()) => {
  const code = String(coupon.code || '');
  const parts = code.split('_');
  const codePrefix = parts[1] || '';
  const codeName = parts.slice(2).join('_');

  const hotel = hotelMap[codePrefix] || null;
  const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
  const validTo = coupon.valid_to ? new Date(coupon.valid_to) : null;

  let status = 'ACTIVE';
  if (coupon.is_deleted) {
    status = 'DELETED';
  } else if (validTo && now > validTo) {
    status = 'EXPIRED';
  } else if (validFrom && now < validFrom) {
    status = 'UPCOMING';
  }

  const usageCount = (usageStats && usageStats.usageMap && usageStats.usageMap[coupon.coupon_id]) || 0;
  const totalDiscount = (usageStats && usageStats.discountAmountMap && usageStats.discountAmountMap[coupon.coupon_id]) || 0;
  const usageRate = coupon.usage_limit
    ? Math.round((usageCount / coupon.usage_limit) * 100)
    : null;

  return {
    ...coupon,
    hotel_id: hotel?.hotel_id || null,
    hotel_name: hotel?.name || 'Khách sạn của bạn',
    hotel_prefix: codePrefix,
    code_name: codeName,
    usage_count: usageCount,
    total_discount_given: totalDiscount,
    usage_rate: usageRate,
    status,
    status_label:
      status === 'ACTIVE'
        ? 'Đang diễn ra'
        : status === 'UPCOMING'
          ? 'Sắp diễn ra'
          : status === 'EXPIRED'
            ? 'Đã kết thúc'
            : 'Đã vô hiệu hóa',
  };
};

/**
 * 1. GET /api/vendor/flash-sales - Lấy danh sách Flash Sale của Vendor
 */
const getVendorFlashSales = async ({ userId, hotelId = 'ALL', status = 'ALL', search = '', page = 1, limit = 20 }) => {
  const accessibleHotels = await getAccessibleVendorHotels(userId);
  if (accessibleHotels.length === 0) {
    return {
      flash_sales: [],
      hotels: [],
      stats: { total: 0, active: 0, upcoming: 0, expired: 0, total_usage: 0, total_discount_given: 0 },
      pagination: { total: 0, page: 1, limit: Number(limit) || 20, totalPages: 0 },
    };
  }

  const hotelMap = {};
  accessibleHotels.forEach((h) => {
    hotelMap[getHotelPrefix(h.hotel_id)] = h;
  });

  const accessibleHotelIds = accessibleHotels.map((h) => h.hotel_id);
  let targetPrefixes = Object.keys(hotelMap);

  if (hotelId && hotelId !== 'ALL') {
    if (!accessibleHotelIds.includes(hotelId)) {
      throw createError('Bạn không có quyền quản lý khuyến mãi của khách sạn này.', 403);
    }
    const targetPrefix = getHotelPrefix(hotelId);
    targetPrefixes = [targetPrefix];
  }

  const client = getClient();
  const { data: rawCoupons, error } = await client
    .from('m_coupon')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[VendorFlashSale] Lỗi truy vấn coupon:', error.message);
    throw createError('Không thể tải danh sách Flash Sale.', 500);
  }

  // Lọc chỉ các coupon Flash Sale thuộc khách sạn của Vendor
  const vendorCoupons = (rawCoupons || []).filter((c) => {
    const code = String(c.code || '');
    if (!code.startsWith('FS_')) return false;
    const prefix = code.split('_')[1];
    return targetPrefixes.includes(prefix);
  });

  const couponIds = vendorCoupons.map((c) => c.coupon_id);
  const usageStats = await getBookingUsageStats(couponIds);
  const now = new Date();

  let enriched = vendorCoupons.map((c) => enrichFlashSale(c, hotelMap, usageStats, now));

  // Bộ lọc theo status
  if (status && status !== 'ALL') {
    enriched = enriched.filter((c) => c.status === status);
  } else {
    // Mặc định không hiển thị DELETED nếu chọn ALL
    enriched = enriched.filter((c) => c.status !== 'DELETED');
  }

  // Bộ lọc theo từ khóa tìm kiếm
  const term = String(search || '').trim().toLowerCase();
  if (term) {
    enriched = enriched.filter(
      (c) =>
        c.code?.toLowerCase().includes(term) ||
        c.code_name?.toLowerCase().includes(term) ||
        c.hotel_name?.toLowerCase().includes(term)
    );
  }

  // Thống kê tổng hợp
  const stats = {
    total: enriched.length,
    active: enriched.filter((c) => c.status === 'ACTIVE').length,
    upcoming: enriched.filter((c) => c.status === 'UPCOMING').length,
    expired: enriched.filter((c) => c.status === 'EXPIRED').length,
    total_usage: enriched.reduce((sum, c) => sum + (c.usage_count || 0), 0),
    total_discount_given: enriched.reduce((sum, c) => sum + (c.total_discount_given || 0), 0),
  };

  // Phân trang
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  const paginated = enriched.slice(offset, offset + limitNum);

  return {
    flash_sales: paginated,
    hotels: accessibleHotels.map((h) => ({ hotel_id: h.hotel_id, name: h.name })),
    stats,
    pagination: {
      total: enriched.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(enriched.length / limitNum) || 1,
    },
  };
};

/**
 * 2. GET /api/vendor/flash-sales/:id - Chi tiết 1 Flash Sale
 */
const getVendorFlashSaleById = async ({ userId, couponId }) => {
  const client = getClient();
  const { data: coupon, error } = await client
    .from('m_coupon')
    .select('*')
    .eq('coupon_id', couponId)
    .maybeSingle();

  if (error) {
    console.error('[VendorFlashSale] Lỗi lấy chi tiết:', error.message);
    throw createError('Không thể tải thông tin khuyến mãi.', 500);
  }
  if (!coupon) {
    throw createError('Không tìm thấy khuyến mãi Flash Sale.', 404);
  }

  const codePrefix = String(coupon.code || '').split('_')[1];
  const accessibleHotels = await getAccessibleVendorHotels(userId);
  const hotel = accessibleHotels.find((h) => getHotelPrefix(h.hotel_id) === codePrefix);

  if (!hotel) {
    throw createError('Bạn không có quyền xem thông tin khuyến mãi của khách sạn này.', 403);
  }

  const hotelMap = { [codePrefix]: hotel };
  const usageStats = await getBookingUsageStats([couponId]);

  // Lấy lịch sử 20 booking gần nhất đã áp dụng coupon này
  const { data: bookings } = await client
    .from('t_booking')
    .select('booking_id, guest_name, guest_phone, total_amount, discount_amount, booking_status_cd, created_at')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })
    .limit(20);

  const enriched = enrichFlashSale(coupon, hotelMap, usageStats, new Date());
  return {
    ...enriched,
    recent_bookings: bookings || [],
  };
};

/**
 * 3. POST /api/vendor/flash-sales - Tạo mới Flash Sale
 */
const createVendorFlashSale = async ({ userId, payload }) => {
  const client = getClient();

  // Xác thực khách sạn và quyền sở hữu
  const { data: hotel, error: hotelErr } = await client
    .from('m_hotel')
    .select('hotel_id, owner_id, name, is_deleted')
    .eq('hotel_id', payload.hotel_id)
    .maybeSingle();

  if (hotelErr) throw createError('Lỗi kiểm tra thông tin khách sạn.', 500);
  if (!hotel || hotel.is_deleted) throw createError('Không tìm thấy khách sạn.', 404);
  if (hotel.owner_id !== userId) {
    throw createError('Bạn không có quyền tạo khuyến mãi cho khách sạn này.', 403);
  }

  // Sinh mã theo chuẩn tiền tố: FS_<HOTEL_PREFIX>_<CODE_NAME>
  const prefix = getHotelPrefix(hotel.hotel_id);
  const fullCode = `FS_${prefix}_${payload.code_name}`;

  if (fullCode.length > 50) {
    throw createError('Độ dài mã khuyến mãi vượt quá giới hạn 50 ký tự.', 400);
  }

  // Kiểm tra tính duy nhất của mã trên toàn hệ thống
  const { data: existing } = await client
    .from('m_coupon')
    .select('coupon_id, is_deleted')
    .eq('code', fullCode)
    .maybeSingle();

  if (existing) {
    throw createError('Mã Flash Sale này đã tồn tại trên hệ thống. Vui lòng chọn tên mã khác.', 409);
  }

  const nowIso = new Date().toISOString();
  const insertData = {
    code: fullCode,
    discount_type: payload.discount_type || 'PERCENT',
    discount_value: payload.discount_value,
    max_discount_amount: payload.max_discount_amount || null,
    min_order_amount: payload.min_order_amount || null,
    usage_limit: payload.usage_limit || null,
    valid_from: payload.valid_from,
    valid_to: payload.valid_to,
    is_deleted: false,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data: created, error: insertErr } = await client
    .from('m_coupon')
    .insert(insertData)
    .select()
    .single();

  if (insertErr) {
    console.error('[VendorFlashSale] Lỗi thêm mới coupon:', insertErr.message);
    if (insertErr.code === '23505') {
      throw createError('Mã Flash Sale này đã tồn tại trên hệ thống.', 409);
    }
    throw createError('Không thể tạo chương trình Flash Sale.', 500);
  }

  const hotelMap = { [prefix]: hotel };
  return enrichFlashSale(created, hotelMap, { usageMap: {}, discountAmountMap: {} });
};

/**
 * 4. PUT/PATCH /api/vendor/flash-sales/:id - Cập nhật Flash Sale
 */
const updateVendorFlashSale = async ({ userId, couponId, updates }) => {
  const client = getClient();

  const { data: existing, error: fetchErr } = await client
    .from('m_coupon')
    .select('*')
    .eq('coupon_id', couponId)
    .maybeSingle();

  if (fetchErr) throw createError('Lỗi kiểm tra thông tin khuyến mãi.', 500);
  if (!existing) throw createError('Không tìm thấy khuyến mãi Flash Sale.', 404);

  const codePrefix = String(existing.code || '').split('_')[1];
  const accessibleHotels = await getAccessibleVendorHotels(userId);
  const hotel = accessibleHotels.find((h) => getHotelPrefix(h.hotel_id) === codePrefix);

  if (!hotel) {
    throw createError('Bạn không có quyền chỉnh sửa khuyến mãi của khách sạn này.', 403);
  }

  const updatePayload = { updated_at: new Date().toISOString() };

  if (updates.code_name) {
    const newFullCode = `FS_${codePrefix}_${updates.code_name}`;
    if (newFullCode !== existing.code) {
      const { data: dup } = await client
        .from('m_coupon')
        .select('coupon_id')
        .eq('code', newFullCode)
        .maybeSingle();

      if (dup && dup.coupon_id !== couponId) {
        throw createError('Mã Flash Sale mới đã tồn tại. Vui lòng chọn tên mã khác.', 409);
      }
      updatePayload.code = newFullCode;
    }
  }

  const effectiveDiscountType = updates.discount_type !== undefined ? updates.discount_type : existing.discount_type;
  const effectiveDiscountVal = updates.discount_value !== undefined ? updates.discount_value : existing.discount_value;
  if (['FLASH_PERCENT', 'PERCENT'].includes(String(effectiveDiscountType).toUpperCase())) {
    if (Number(effectiveDiscountVal) <= 0 || Number(effectiveDiscountVal) > 100) {
      throw createError('Giá trị giảm theo phần trăm không được vượt quá 100%.', 400);
    }
  } else if (Number(effectiveDiscountVal) <= 0) {
    throw createError('Giá trị giảm phải lớn hơn 0.', 400);
  }

  if (updates.discount_type !== undefined) updatePayload.discount_type = updates.discount_type;
  if (updates.discount_value !== undefined) updatePayload.discount_value = updates.discount_value;
  if (updates.max_discount_amount !== undefined) updatePayload.max_discount_amount = updates.max_discount_amount;
  if (updates.min_order_amount !== undefined) updatePayload.min_order_amount = updates.min_order_amount;

  if (updates.usage_limit !== undefined) {
    if (updates.usage_limit !== null) {
      const stats = await getBookingUsageStats([couponId]);
      const currentUsage = stats.usageMap[couponId] || 0;
      if (updates.usage_limit < currentUsage) {
        throw createError('Giới hạn sử dụng không thể thấp hơn số lượt Flash Sale đã được dùng.', 409);
      }
    }
    updatePayload.usage_limit = updates.usage_limit;
  }

  const effectiveValidFrom = updates.valid_from !== undefined ? updates.valid_from : existing.valid_from;
  const effectiveValidTo = updates.valid_to !== undefined ? updates.valid_to : existing.valid_to;

  if (new Date(effectiveValidTo).getTime() <= new Date(effectiveValidFrom).getTime()) {
    throw createError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.', 400);
  }

  if (updates.valid_from !== undefined) updatePayload.valid_from = updates.valid_from;
  if (updates.valid_to !== undefined) updatePayload.valid_to = updates.valid_to;

  const { data: updated, error: updateErr } = await client
    .from('m_coupon')
    .update(updatePayload)
    .eq('coupon_id', couponId)
    .select()
    .maybeSingle();

  if (updateErr) {
    console.error('[VendorFlashSale] Lỗi cập nhật coupon:', updateErr.message);
    throw createError('Không thể cập nhật chương trình Flash Sale.', 500);
  }

  const hotelMap = { [codePrefix]: hotel };
  const usageStats = await getBookingUsageStats([couponId]);
  return {
    previous: existing,
    current: enrichFlashSale(updated, hotelMap, usageStats),
  };
};

/**
 * 5. DELETE /api/vendor/flash-sales/:id - Vô hiệu hóa (xóa mềm)
 */
const deleteVendorFlashSale = async ({ userId, couponId }) => {
  const client = getClient();

  const { data: existing, error: fetchErr } = await client
    .from('m_coupon')
    .select('*')
    .eq('coupon_id', couponId)
    .maybeSingle();

  if (fetchErr) throw createError('Lỗi kiểm tra thông tin khuyến mãi.', 500);
  if (!existing) throw createError('Không tìm thấy khuyến mãi Flash Sale.', 404);

  const codePrefix = String(existing.code || '').split('_')[1];
  const accessibleHotels = await getAccessibleVendorHotels(userId);
  const hotel = accessibleHotels.find((h) => getHotelPrefix(h.hotel_id) === codePrefix);

  if (!hotel) {
    throw createError('Bạn không có quyền vô hiệu hóa khuyến mãi của khách sạn này.', 403);
  }

  if (existing.is_deleted) return existing;

  const { error: deleteErr } = await client
    .from('m_coupon')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('coupon_id', couponId);

  if (deleteErr) {
    console.error('[VendorFlashSale] Lỗi xóa mềm coupon:', deleteErr.message);
    throw createError('Không thể vô hiệu hóa chương trình Flash Sale.', 500);
  }

  return existing;
};

module.exports = {
  setCustomClient,
  getClient,
  getHotelPrefix,
  getAccessibleVendorHotels,
  getVendorFlashSales,
  getVendorFlashSaleById,
  createVendorFlashSale,
  updateVendorFlashSale,
  deleteVendorFlashSale,
};
