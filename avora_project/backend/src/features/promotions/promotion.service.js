'use strict';

const supabase = require('../../config/supabaseClient');

/**
 * Fetch all coupons (promotions) with usage statistics.
 * READ-ONLY.
 * @param {{ search?: string, discount_type?: string, include_deleted?: boolean }} filters
 */
const getCoupons = async (filters = {}) => {
  if (!supabase) {
    throw new Error('Database client is not initialized.');
  }

  let query = supabase
    .from('m_coupon')
    .select(`
      coupon_id,
      code,
      discount_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      usage_limit,
      valid_from,
      valid_to,
      is_deleted,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (!filters.include_deleted) {
    query = query.eq('is_deleted', false);
  }

  if (filters.discount_type && filters.discount_type !== 'ALL') {
    query = query.eq('discount_type', filters.discount_type);
  }

  const { data: coupons, error } = await query;
  if (error) {
    throw new Error(`Không thể tải danh sách khuyến mãi: ${error.message}`);
  }

  const couponList = coupons || [];
  const couponIds = couponList.map((c) => c.coupon_id);

  // Fetch usage count from t_booking (coupons referenced by bookings)
  let usageMap = {};
  let discountAmountMap = {};
  if (couponIds.length > 0) {
    const { data: bookings } = await supabase
      .from('t_booking')
      .select('coupon_id, discount_amount')
      .in('coupon_id', couponIds);

    if (bookings) {
      bookings.forEach((b) => {
        usageMap[b.coupon_id] = (usageMap[b.coupon_id] || 0) + 1;
        discountAmountMap[b.coupon_id] = (discountAmountMap[b.coupon_id] || 0) + Number(b.discount_amount || 0);
      });
    }
  }

  const now = new Date();

  const enrichedCoupons = couponList.map((c) => {
    const validFrom = c.valid_from ? new Date(c.valid_from) : null;
    const validTo = c.valid_to ? new Date(c.valid_to) : null;

    let status = 'ACTIVE';
    if (c.is_deleted) {
      status = 'DELETED';
    } else if (validTo && now > validTo) {
      status = 'EXPIRED';
    } else if (validFrom && now < validFrom) {
      status = 'UPCOMING';
    }

    const usageCount = usageMap[c.coupon_id] || 0;
    const usageRate = c.usage_limit ? Math.round((usageCount / c.usage_limit) * 100) : null;

    return {
      ...c,
      usage_count: usageCount,
      total_discount_given: discountAmountMap[c.coupon_id] || 0,
      usage_rate: usageRate,
      status,
      status_label: status === 'ACTIVE'
        ? 'Đang hoạt động'
        : status === 'EXPIRED'
          ? 'Hết hạn'
          : status === 'UPCOMING'
            ? 'Sắp diễn ra'
            : 'Đã vô hiệu hóa',
    };
  });

  // Apply search filter
  let filtered = enrichedCoupons;
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = enrichedCoupons.filter((c) =>
      c.code?.toLowerCase().includes(term) ||
      c.discount_type?.toLowerCase().includes(term) ||
      c.status_label?.toLowerCase().includes(term)
    );
  }

  // Stats
  const activeCoupons = enrichedCoupons.filter((c) => c.status === 'ACTIVE');
  const expiredCoupons = enrichedCoupons.filter((c) => c.status === 'EXPIRED');
  const upcomingCoupons = enrichedCoupons.filter((c) => c.status === 'UPCOMING');
  const totalUsage = Object.values(usageMap).reduce((a, b) => a + b, 0);
  const totalDiscountGiven = Object.values(discountAmountMap).reduce((a, b) => a + b, 0);

  const stats = {
    total_coupons: couponList.length,
    active_coupons: activeCoupons.length,
    expired_coupons: expiredCoupons.length,
    upcoming_coupons: upcomingCoupons.length,
    total_usage: totalUsage,
    total_discount_given: totalDiscountGiven,
  };

  return {
    coupons: filtered,
    stats,
    total_count: filtered.length,
  };
};

/**
 * Fetch a single coupon detail with booking usage list.
 * READ-ONLY.
 * @param {string} couponId
 */
const getCouponById = async (couponId) => {
  if (!supabase) {
    throw new Error('Database client is not initialized.');
  }

  const { data: coupon, error } = await supabase
    .from('m_coupon')
    .select(`
      coupon_id,
      code,
      discount_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      usage_limit,
      valid_from,
      valid_to,
      is_deleted,
      created_at,
      updated_at
    `)
    .eq('coupon_id', couponId)
    .single();

  if (error) {
    const err = new Error(
      error.code === 'PGRST116'
        ? 'Không tìm thấy mã khuyến mãi.'
        : `Không thể tải thông tin mã khuyến mãi: ${error.message}`
    );
    err.statusCode = error.code === 'PGRST116' ? 404 : 500;
    throw err;
  }

  // Fetch bookings that used this coupon
  const { data: bookings } = await supabase
    .from('t_booking')
    .select(`
      booking_id,
      guest_name,
      guest_phone,
      total_amount,
      discount_amount,
      booking_status_cd,
      created_at
    `)
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })
    .limit(20);

  const now = new Date();
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

  const usageCount = (bookings || []).length;
  const totalDiscountGiven = (bookings || []).reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);

  return {
    ...coupon,
    status,
    status_label: status === 'ACTIVE'
      ? 'Đang hoạt động'
      : status === 'EXPIRED'
        ? 'Hết hạn'
        : status === 'UPCOMING'
          ? 'Sắp diễn ra'
          : 'Đã vô hiệu hóa',
    usage_count: usageCount,
    total_discount_given: totalDiscountGiven,
    usage_rate: coupon.usage_limit ? Math.round((usageCount / coupon.usage_limit) * 100) : null,
    bookings: bookings || [],
  };
};

module.exports = {
  getCoupons,
  getCouponById,
};
