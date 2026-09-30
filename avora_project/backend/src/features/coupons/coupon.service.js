"use strict";

const supabase = require("../../config/supabaseClient");
const { validateCouponPayload } = require("./coupon.validation");

const couponFields = [
  "coupon_id",
  "code",
  "discount_type",
  "discount_value",
  "max_discount_amount",
  "min_order_amount",
  "usage_limit",
  "valid_from",
  "valid_to",
  "is_deleted",
  "created_at",
  "updated_at",
].join(", ");

const ensureClient = () => {
  if (!supabase) {
    const error = new Error("Database client is not initialized.");
    error.statusCode = 503;
    throw error;
  }
};

const throwDatabaseError = (message, databaseError) => {
  const error = new Error(message);
  error.statusCode = databaseError?.code === "23505" ? 409 : 500;
  if (databaseError?.code === "23505") {
    error.message = "Mã coupon đã tồn tại.";
  }
  throw error;
};

const getBookingStats = async (couponIds) => {
  const usageMap = {};
  const discountAmountMap = {};
  if (!couponIds.length) return { usageMap, discountAmountMap };

  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data: bookings, error } = await supabase
      .from("t_booking")
      .select("coupon_id, discount_amount")
      .in("coupon_id", couponIds)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throwDatabaseError("Không thể tải thống kê sử dụng mã coupon", error);
    }

    (bookings || []).forEach((booking) => {
      usageMap[booking.coupon_id] = (usageMap[booking.coupon_id] || 0) + 1;
      discountAmountMap[booking.coupon_id] =
        (discountAmountMap[booking.coupon_id] || 0) +
        Number(booking.discount_amount || 0);
    });

    if (!bookings || bookings.length < pageSize) break;
    offset += pageSize;
  }

  return { usageMap, discountAmountMap };
};

/**
 * Fetch all coupons with usage statistics.
 * READ-ONLY.
 * @param {{ search?: string, discount_type?: string, include_deleted?: boolean }} filters
 */
const getCoupons = async (filters = {}) => {
  ensureClient();

  let query = supabase
    .from("m_coupon")
    .select(couponFields)
    .order("created_at", { ascending: false });

  if (!filters.include_deleted) {
    query = query.eq("is_deleted", false);
  }

  if (filters.discount_type && filters.discount_type !== "ALL") {
    query = query.eq("discount_type", filters.discount_type);
  }

  const { data: coupons, error } = await query;
  if (error) {
    throwDatabaseError("Không thể tải danh sách coupon", error);
  }

  const couponList = coupons || [];
  const couponIds = couponList.map((c) => c.coupon_id);

  const { usageMap, discountAmountMap } = await getBookingStats(couponIds);

  const now = new Date();

  const enrichedCoupons = couponList.map((c) => {
    const validFrom = c.valid_from ? new Date(c.valid_from) : null;
    const validTo = c.valid_to ? new Date(c.valid_to) : null;

    let status = "ACTIVE";
    if (c.is_deleted) {
      status = "DELETED";
    } else if (validTo && now > validTo) {
      status = "EXPIRED";
    } else if (validFrom && now < validFrom) {
      status = "UPCOMING";
    }

    const usageCount = usageMap[c.coupon_id] || 0;
    const usageRate = c.usage_limit
      ? Math.round((usageCount / c.usage_limit) * 100)
      : null;

    return {
      ...c,
      usage_count: usageCount,
      total_discount_given: discountAmountMap[c.coupon_id] || 0,
      usage_rate: usageRate,
      status,
      status_label:
        status === "ACTIVE"
          ? "Đang hoạt động"
          : status === "EXPIRED"
            ? "Hết hạn"
            : status === "UPCOMING"
              ? "Sắp diễn ra"
              : "Đã vô hiệu hóa",
    };
  });

  // Apply search filter
  let filtered = enrichedCoupons;
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = enrichedCoupons.filter(
      (c) =>
        c.code?.toLowerCase().includes(term) ||
        c.discount_type?.toLowerCase().includes(term) ||
        c.status_label?.toLowerCase().includes(term),
    );
  }

  // Stats
  const activeCoupons = enrichedCoupons.filter((c) => c.status === "ACTIVE");
  const expiredCoupons = enrichedCoupons.filter((c) => c.status === "EXPIRED");
  const upcomingCoupons = enrichedCoupons.filter(
    (c) => c.status === "UPCOMING",
  );
  const totalUsage = Object.values(usageMap).reduce((a, b) => a + b, 0);
  const totalDiscountGiven = Object.values(discountAmountMap).reduce(
    (a, b) => a + b,
    0,
  );

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
  ensureClient();

  const { data: coupon, error } = await supabase
    .from("m_coupon")
    .select(couponFields)
    .eq("coupon_id", couponId)
    .maybeSingle();

  if (error) {
    throwDatabaseError("Không thể tải thông tin coupon", error);
  }
  if (!coupon) {
    const notFound = new Error("Không tìm thấy coupon.");
    notFound.statusCode = 404;
    throw notFound;
  }

  // Fetch bookings that used this coupon
  const { data: bookings, error: bookingsError } = await supabase
    .from("t_booking")
    .select(
      `
      booking_id,
      guest_name,
      guest_phone,
      total_amount,
      discount_amount,
      booking_status_cd,
      created_at
    `,
    )
    .eq("coupon_id", couponId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (bookingsError) {
    throwDatabaseError("Không thể tải lịch sử sử dụng coupon", bookingsError);
  }

  const usageStats = await getBookingStats([couponId]);
  const now = new Date();
  const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
  const validTo = coupon.valid_to ? new Date(coupon.valid_to) : null;

  let status = "ACTIVE";
  if (coupon.is_deleted) {
    status = "DELETED";
  } else if (validTo && now > validTo) {
    status = "EXPIRED";
  } else if (validFrom && now < validFrom) {
    status = "UPCOMING";
  }

  const usageCount = usageStats.usageMap[couponId] || 0;
  const totalDiscountGiven = usageStats.discountAmountMap[couponId] || 0;

  return {
    ...coupon,
    status,
    status_label:
      status === "ACTIVE"
        ? "Đang hoạt động"
        : status === "EXPIRED"
          ? "Hết hạn"
          : status === "UPCOMING"
            ? "Sắp diễn ra"
            : "Đã vô hiệu hóa",
    usage_count: usageCount,
    total_discount_given: totalDiscountGiven,
    usage_rate: coupon.usage_limit
      ? Math.round((usageCount / coupon.usage_limit) * 100)
      : null,
    bookings: bookings || [],
  };
};

const getCouponRecord = async (couponId) => {
  const { data, error } = await supabase
    .from("m_coupon")
    .select(couponFields)
    .eq("coupon_id", couponId)
    .maybeSingle();

  if (error) {
    throwDatabaseError("Không thể tải thông tin mã coupon", error);
  }
  if (!data) {
    const notFound = new Error("Không tìm thấy mã coupon.");
    notFound.statusCode = 404;
    throw notFound;
  }
  return data;
};

const ensureCouponCodeAvailable = async (code, excludedCouponId = null) => {
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data: existingCoupons, error } = await supabase
      .from("m_coupon")
      .select("coupon_id, code")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throwDatabaseError("Không thể kiểm tra mã coupon", error);
    }

    const duplicate = (existingCoupons || []).some(
      (coupon) =>
        coupon.coupon_id !== excludedCouponId &&
        String(coupon.code || "").toUpperCase() === code,
    );
    if (duplicate) {
      const conflict = new Error("Mã coupon đã tồn tại.");
      conflict.statusCode = 409;
      throw conflict;
    }
    if (!existingCoupons || existingCoupons.length < pageSize) break;
    offset += pageSize;
  }
};

const createCoupon = async (payload) => {
  ensureClient();
  await ensureCouponCodeAvailable(payload.code);
  const createdAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("m_coupon")
    .insert({
      ...payload,
      is_deleted: false,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select(couponFields)
    .single();

  if (error) {
    throwDatabaseError("Không thể tạo mã coupon", error);
  }
  return data;
};

const updateCoupon = async (couponId, updates) => {
  ensureClient();
  const current = await getCouponRecord(couponId);
  const editableFields = [
    "code",
    "discount_type",
    "discount_value",
    "max_discount_amount",
    "min_order_amount",
    "usage_limit",
    "valid_from",
    "valid_to",
  ];
  const currentPayload = Object.fromEntries(
    editableFields.map((field) => [field, current[field]]),
  );
  const { payload, error: validationError } = validateCouponPayload(
    { ...currentPayload, ...updates },
  );
  if (validationError) {
    const invalid = new Error(validationError);
    invalid.statusCode = 400;
    throw invalid;
  }

  await ensureCouponCodeAvailable(payload.code, couponId);

  if (payload.usage_limit !== null) {
    const { usageMap } = await getBookingStats([couponId]);
    if ((usageMap[couponId] || 0) > payload.usage_limit) {
      const conflict = new Error(
        "Giới hạn sử dụng không thể thấp hơn số lượt coupon đã được dùng.",
      );
      conflict.statusCode = 409;
      throw conflict;
    }
  }

  const { data, error } = await supabase
    .from("m_coupon")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("coupon_id", couponId)
    .select(couponFields)
    .maybeSingle();

  if (error) {
    throwDatabaseError("Không thể cập nhật mã coupon", error);
  }
  if (!data) {
    const notFound = new Error("Không tìm thấy mã coupon.");
    notFound.statusCode = 404;
    throw notFound;
  }
  return data;
};

const deleteCoupon = async (couponId) => {
  ensureClient();
  const coupon = await getCouponRecord(couponId);
  if (coupon.is_deleted) return;

  const { data, error } = await supabase
    .from("m_coupon")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("coupon_id", couponId)
    .select("coupon_id")
    .maybeSingle();

  if (error) {
    throwDatabaseError("Không thể vô hiệu hóa mã coupon", error);
  }
  if (!data) {
    const notFound = new Error("Không tìm thấy mã coupon.");
    notFound.statusCode = 404;
    throw notFound;
  }
};

module.exports = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
