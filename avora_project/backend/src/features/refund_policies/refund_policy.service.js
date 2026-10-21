"use strict";

const supabase = require("../../config/supabaseClient");
const { randomUUID } = require("crypto");

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
    error.message = "Chính sách hoàn tiền đã tồn tại.";
  } else if (databaseError?.code === "23503") {
    error.message = "Không thể thao tác vì vi phạm ràng buộc dữ liệu liên quan.";
  }
  throw error;
};

// Cache whether m_refund_policy exists in Supabase
let _isRefundPolicyTableAvailable = null;
const checkRefundPolicyTable = async () => {
  if (_isRefundPolicyTableAvailable !== null) return _isRefundPolicyTableAvailable;
  try {
    const { error } = await supabase.from("m_refund_policy").select("policy_id").limit(1);
    if (!error) {
      _isRefundPolicyTableAvailable = true;
      return true;
    }
  } catch {
    // ignore
  }
  _isRefundPolicyTableAvailable = false;
  return false;
};

/**
 * Format description and metadata for storage in m_cancellation_policy
 */
const encodePolicyDescription = ({
  policy_code = null,
  policy_name,
  description,
  refund_conditions,
  status = "ACTIVE",
  effective_from = null,
  effective_to = null,
}) => {
  const parts = [];

  // Sanitize policy_name: strip brackets and META
  const cleanName = (policy_name || "")
    .replace(/<!--META:.*?-->/g, "")
    .replace(/^\[(.*?)\]$/, "$1")
    .trim();

  // Sanitize description: strip META, brackets, conditions
  const cleanDesc = (description || "")
    .replace(/<!--META:.*?-->/g, "")
    .replace(/^\[.*?\]\s*/g, "")
    .replace(/Điều kiện:\s*.*$/i, "")
    .trim();

  // Sanitize refund_conditions: strip META and leading label
  const cleanCond = (refund_conditions || "")
    .replace(/<!--META:.*?-->/g, "")
    .replace(/^Điều kiện:\s*/i, "")
    .trim();

  if (cleanName) parts.push(`[${cleanName}]`);
  if (cleanDesc) parts.push(cleanDesc);
  if (cleanCond) parts.push(`Điều kiện: ${cleanCond}`);

  const metaObj = {
    policy_code: policy_code || null,
    status: status || "ACTIVE",
    effective_from: effective_from || null,
    effective_to: effective_to || null,
  };
  const metaStr = `<!--META:${JSON.stringify(metaObj)}-->`;

  return `${parts.join(" ")} ${metaStr}`.trim();
};

/**
 * Parse policy data from m_cancellation_policy record
 */
const parseCancellationPolicyRecord = (record, hotelMap = {}, bookingUsageMap = {}) => {
  const hotel = record.m_hotel || hotelMap[record.hotel_id] || null;
  const rawDesc = record.description || "";

  // Extract meta if present
  let status = "ACTIVE";
  let effective_from = record.created_at || null;
  let effective_to = null;
  let storedPolicyCode = null;

  // Extract all <!--META:...--> tags (supporting multiple/malformed if any)
  const metaRegex = /<!--META:(.*?)-->/g;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(rawDesc)) !== null) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1]);
      if (parsedMeta.status) status = parsedMeta.status;
      if (parsedMeta.effective_from) effective_from = parsedMeta.effective_from;
      if (parsedMeta.effective_to) effective_to = parsedMeta.effective_to;
      if (parsedMeta.policy_code) storedPolicyCode = parsedMeta.policy_code;
    } catch {
      // ignore JSON parse error
    }
  }

  // Strip all <!--META:...-->
  let cleanDesc = rawDesc.replace(/<!--META:.*?-->/g, "").trim();

  // Extract policy name from [brackets] if present
  let policyName = "";
  while (/^\[(.*?)\]\s*/.test(cleanDesc)) {
    const nameMatch = cleanDesc.match(/^\[(.*?)\]\s*/);
    if (!policyName && nameMatch) {
      policyName = nameMatch[1].trim();
    }
    cleanDesc = cleanDesc.replace(/^\[(.*?)\]\s*/, "").trim();
  }

  if (!policyName) {
    if (hotel?.name) {
      policyName = `Chính sách hoàn tiền - ${hotel.name}`;
    } else {
      policyName = `Chính sách hoàn tiền chuẩn AVORA (${record.free_cancel_before_hours}h)`;
    }
  }

  // Extract refund conditions
  let refundConditions = "";
  const condMatch = cleanDesc.match(/Điều kiện:\s*(.*)$/i);
  if (condMatch) {
    refundConditions = condMatch[1].trim();
    cleanDesc = cleanDesc.replace(/Điều kiện:\s*.*$/i, "").trim();
  } else {
    const penaltyRate = Number(record.penalty_rate || 0);
    const refundRate = Math.max(0, 100 - penaltyRate);
    refundConditions = `Miễn phí hủy phòng trước ${record.free_cancel_before_hours} giờ (hoàn 100%). Hủy sau thời hạn áp dụng phí phạt ${penaltyRate}% (hoàn ${refundRate}%).`;
  }

  // Final cleanup on cleanDesc to ensure no leftover brackets or metadata
  cleanDesc = cleanDesc
    .replace(/<!--META:.*?-->/g, "")
    .replace(/^\[.*?\]\s*/g, "")
    .trim();

  const penaltyRate = Number(record.penalty_rate || 0);
  const refundPercentage = Math.max(0, 100 - penaltyRate);
  const minHours = Number(record.free_cancel_before_hours || 0);
  const bookingCount = bookingUsageMap[record.cancellation_policy_id] || 0;
  const generatedCode = `RP-${record.cancellation_policy_id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  return {
    policy_id: record.cancellation_policy_id,
    cancellation_policy_id: record.cancellation_policy_id,
    policy_code: storedPolicyCode || generatedCode,
    policy_name: policyName,
    description: cleanDesc,
    refund_conditions: refundConditions,
    refund_percentage: refundPercentage,
    penalty_rate: penaltyRate,
    minimum_cancellation_hours: minHours,
    free_cancel_before_hours: minHours,
    hotel_id: record.hotel_id || null,
    hotel: hotel
      ? {
          hotel_id: hotel.hotel_id,
          name: hotel.name,
          address: hotel.address,
          star_rating: hotel.star_rating,
        }
      : null,
    hotel_name: hotel?.name || "Toàn hệ thống (Mặc định)",
    scope: record.hotel_id ? "HOTEL" : "SYSTEM",
    scope_label: record.hotel_id ? (hotel?.name || "Khách sạn cụ thể") : "Toàn hệ thống AVORA",
    effective_from,
    effective_to,
    status,
    status_label: status === "ACTIVE" ? "Đang áp dụng" : "Tạm dừng",
    associated_bookings_count: bookingCount,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};

/**
 * Fetch booking usage statistics per policy ID
 */
const getPolicyBookingStats = async (policyIds) => {
  const usageMap = {};
  if (!policyIds.length) return usageMap;

  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data: bookings, error } = await supabase
      .from("t_booking")
      .select("cancellation_policy_id")
      .in("cancellation_policy_id", policyIds)
      .range(offset, offset + pageSize - 1);

    if (error) break;

    (bookings || []).forEach((b) => {
      if (b.cancellation_policy_id) {
        usageMap[b.cancellation_policy_id] =
          (usageMap[b.cancellation_policy_id] || 0) + 1;
      }
    });

    if (!bookings || bookings.length < pageSize) break;
    offset += pageSize;
  }

  return usageMap;
};

/**
 * Fetch hotels list for dropdowns and mapping
 */
const getHotelsList = async () => {
  ensureClient();
  const { data: hotels, error } = await supabase
    .from("m_hotel")
    .select("hotel_id, name, address, star_rating")
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  if (error) {
    throwDatabaseError("Không thể tải danh sách khách sạn.", error);
  }

  return hotels || [];
};

/**
 * GET all refund policies with filters, search, and KPI metrics.
 */
const getRefundPolicies = async (filters = {}) => {
  ensureClient();
  const isDedicatedTable = await checkRefundPolicyTable();

  if (isDedicatedTable) {
    // If dedicated m_refund_policy table is available
    let query = supabase
      .from("m_refund_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters.hotel_id && filters.hotel_id !== "ALL") {
      query = query.eq("hotel_id", filters.hotel_id);
    }

    const { data, error } = await query;
    if (error) throwDatabaseError("Không thể tải danh sách chính sách hoàn tiền.", error);

    let list = data || [];
    if (filters.search) {
      const term = filters.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.policy_name?.toLowerCase().includes(term) ||
          p.policy_code?.toLowerCase().includes(term) ||
          p.m_hotel?.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    // Compute stats
    const total = list.length;
    const active = list.filter((p) => p.status === "ACTIVE").length;
    const sumRate = list.reduce((acc, p) => acc + Number(p.refund_percentage || 0), 0);
    const avgRate = total > 0 ? Math.round((sumRate / total) * 10) / 10 : 0;
    const freeCancel = list.filter((p) => Number(p.minimum_cancellation_hours || 0) > 0).length;

    return {
      policies: list,
      stats: {
        total_policies: total,
        active_policies: active,
        inactive_policies: total - active,
        avg_refund_rate: avgRate,
        free_cancel_count: freeCancel,
        total_associated_bookings: 0,
      },
    };
  }

  // Use m_cancellation_policy
  let query = supabase
    .from("m_cancellation_policy")
    .select("*, m_hotel(hotel_id, name, address, star_rating)")
    .order("created_at", { ascending: false });

  if (filters.hotel_id && filters.hotel_id !== "ALL") {
    if (filters.hotel_id === "SYSTEM") {
      query = query.is("hotel_id", null);
    } else {
      query = query.eq("hotel_id", filters.hotel_id);
    }
  }

  const { data: rawPolicies, error } = await query;
  if (error) {
    throwDatabaseError("Không thể tải danh sách chính sách hoàn tiền.", error);
  }

  const rawList = rawPolicies || [];
  const policyIds = rawList.map((p) => p.cancellation_policy_id);
  const bookingUsageMap = await getPolicyBookingStats(policyIds);

  let policies = rawList.map((p) => parseCancellationPolicyRecord(p, {}, bookingUsageMap));

  // In-memory filters for status & search
  if (filters.status && filters.status !== "ALL") {
    policies = policies.filter((p) => p.status === filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    policies = policies.filter(
      (p) =>
        p.policy_name?.toLowerCase().includes(term) ||
        p.policy_code?.toLowerCase().includes(term) ||
        p.policy_id?.toLowerCase().includes(term) ||
        p.hotel_name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.refund_conditions?.toLowerCase().includes(term)
    );
  }

  // Sort
  if (filters.sort_by) {
    policies.sort((a, b) => {
      switch (filters.sort_by) {
        case "OLDEST":
          return new Date(a.created_at) - new Date(b.created_at);
        case "PERCENT_ASC":
          return a.refund_percentage - b.refund_percentage;
        case "HOURS_ASC":
          return a.minimum_cancellation_hours - b.minimum_cancellation_hours;
        case "HOURS_DESC":
          return b.minimum_cancellation_hours - a.minimum_cancellation_hours;
        case "NAME_ASC":
          return (a.policy_name || "").localeCompare(b.policy_name || "");
        case "BOOKINGS_DESC":
          return (b.associated_bookings_count || 0) - (a.associated_bookings_count || 0);
        case "PERCENT_DESC":
        default:
          return b.refund_percentage - a.refund_percentage;
      }
    });
  }

  // Calculate summary metrics
  const total = policies.length;
  const active = policies.filter((p) => p.status === "ACTIVE").length;
  const inactive = total - active;
  const sumRate = policies.reduce((acc, p) => acc + Number(p.refund_percentage || 0), 0);
  const avgRate = total > 0 ? Math.round((sumRate / total) * 10) / 10 : 0;
  const freeCancel = policies.filter((p) => Number(p.minimum_cancellation_hours || 0) > 0).length;
  const totalBookings = policies.reduce((acc, p) => acc + (p.associated_bookings_count || 0), 0);

  return {
    policies,
    stats: {
      total_policies: total,
      active_policies: active,
      inactive_policies: inactive,
      avg_refund_rate: avgRate,
      free_cancel_count: freeCancel,
      total_associated_bookings: totalBookings,
    },
  };
};

/**
 * GET refund policy by ID
 */
const getRefundPolicyById = async (id) => {
  ensureClient();
  const cleanId = String(id).trim();
  const isDedicatedTable = await checkRefundPolicyTable();

  if (isDedicatedTable) {
    const { data, error } = await supabase
      .from("m_refund_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .eq("policy_id", cleanId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) throwDatabaseError("Lỗi khi tải chi tiết chính sách.", error);
    if (!data) {
      const notFound = new Error("Không tìm thấy chính sách hoàn tiền yêu cầu.");
      notFound.statusCode = 404;
      throw notFound;
    }
    return data;
  }

  let record = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  if (isUuid) {
    const { data, error } = await supabase
      .from("m_cancellation_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .eq("cancellation_policy_id", cleanId)
      .maybeSingle();

    if (error) throwDatabaseError("Lỗi khi tải chi tiết chính sách.", error);
    record = data;
  }

  if (!record) {
    const { data: allRecords, error: listErr } = await supabase
      .from("m_cancellation_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)");

    if (listErr) throwDatabaseError("Lỗi khi tải chi tiết chính sách.", listErr);
    if (allRecords) {
      record = allRecords.find((r) => {
        const parsed = parseCancellationPolicyRecord(r);
        return (
          parsed.policy_code.toLowerCase() === cleanId.toLowerCase() ||
          parsed.policy_id.toLowerCase() === cleanId.toLowerCase() ||
          parsed.policy_id.toLowerCase().startsWith(cleanId.toLowerCase())
        );
      });
    }
  }

  if (!record) {
    const notFound = new Error("Không tìm thấy chính sách hoàn tiền yêu cầu.");
    notFound.statusCode = 404;
    throw notFound;
  }

  const bookingStats = await getPolicyBookingStats([record.cancellation_policy_id]);
  return parseCancellationPolicyRecord(record, {}, bookingStats);
};

/**
 * CREATE a new refund policy
 */
const createRefundPolicy = async (payload) => {
  ensureClient();
  const isDedicatedTable = await checkRefundPolicyTable();
  const policyId = randomUUID();

  if (isDedicatedTable) {
    const newRecord = {
      policy_id: policyId,
      policy_code: `RP-${policyId.replace(/-/g, "").substring(0, 8).toUpperCase()}`,
      policy_name: payload.policy_name,
      description: payload.description || "",
      refund_conditions: payload.refund_conditions || "",
      refund_percentage: payload.refund_percentage,
      minimum_cancellation_hours: payload.minimum_cancellation_hours,
      hotel_id: payload.hotel_id || null,
      effective_from: payload.effective_from || null,
      effective_to: payload.effective_to || null,
      status: payload.status || "ACTIVE",
      is_deleted: false,
    };

    const { data, error } = await supabase
      .from("m_refund_policy")
      .insert(newRecord)
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .single();

    if (error) throwDatabaseError("Không thể tạo mới chính sách hoàn tiền.", error);
    return data;
  }

  // Save into m_cancellation_policy with unique UUID
  const penaltyRate = Math.max(0, 100 - payload.refund_percentage);
  const policyCode = `RP-${policyId.replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  const encodedDesc = encodePolicyDescription({
    policy_code: policyCode,
    policy_name: payload.policy_name,
    description: payload.description,
    refund_conditions: payload.refund_conditions,
    status: payload.status,
    effective_from: payload.effective_from,
    effective_to: payload.effective_to,
  });

  const insertData = {
    cancellation_policy_id: policyId,
    hotel_id: payload.hotel_id || null,
    free_cancel_before_hours: payload.minimum_cancellation_hours,
    penalty_rate: penaltyRate,
    description: encodedDesc,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: created, error } = await supabase
    .from("m_cancellation_policy")
    .insert(insertData)
    .select("*, m_hotel(hotel_id, name, address, star_rating)")
    .single();

  if (error) {
    throwDatabaseError("Không thể tạo mới chính sách hoàn tiền.", error);
  }

  return parseCancellationPolicyRecord(created);
};

/**
 * UPDATE an existing refund policy
 */
const updateRefundPolicy = async (id, payload) => {
  ensureClient();
  const cleanId = String(id).trim();
  const isDedicatedTable = await checkRefundPolicyTable();

  if (isDedicatedTable) {
    const updateObj = {
      ...payload,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("m_refund_policy")
      .update(updateObj)
      .eq("policy_id", cleanId)
      .eq("is_deleted", false)
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .single();

    if (error) throwDatabaseError("Không thể cập nhật chính sách hoàn tiền.", error);
    if (!data) {
      const err = new Error("Không tìm thấy chính sách để cập nhật.");
      err.statusCode = 404;
      throw err;
    }
    return data;
  }

  // Update in m_cancellation_policy
  // First, fetch current record
  const { data: current, error: fetchErr } = await supabase
    .from("m_cancellation_policy")
    .select("*, m_hotel(hotel_id, name, address, star_rating)")
    .eq("cancellation_policy_id", cleanId)
    .maybeSingle();

  if (fetchErr) throwDatabaseError("Lỗi khi kiểm tra chính sách hoàn tiền.", fetchErr);
  if (!current) {
    const notFound = new Error("Không tìm thấy chính sách hoàn tiền để cập nhật.");
    notFound.statusCode = 404;
    throw notFound;
  }

  const currentParsed = parseCancellationPolicyRecord(current);

  const merged = {
    policy_code: currentParsed.policy_code,
    policy_name: payload.policy_name !== undefined ? payload.policy_name : currentParsed.policy_name,
    description: payload.description !== undefined ? payload.description : currentParsed.description,
    refund_conditions:
      payload.refund_conditions !== undefined ? payload.refund_conditions : currentParsed.refund_conditions,
    refund_percentage:
      payload.refund_percentage !== undefined ? payload.refund_percentage : currentParsed.refund_percentage,
    minimum_cancellation_hours:
      payload.minimum_cancellation_hours !== undefined
        ? payload.minimum_cancellation_hours
        : currentParsed.minimum_cancellation_hours,
    hotel_id: payload.hotel_id !== undefined ? payload.hotel_id : current.hotel_id,
    effective_from:
      payload.effective_from !== undefined ? payload.effective_from : currentParsed.effective_from,
    effective_to:
      payload.effective_to !== undefined ? payload.effective_to : currentParsed.effective_to,
    status: payload.status !== undefined ? payload.status : currentParsed.status,
  };

  const penaltyRate = Math.max(0, 100 - merged.refund_percentage);
  const encodedDesc = encodePolicyDescription(merged);

  const updateData = {
    hotel_id: merged.hotel_id,
    free_cancel_before_hours: merged.minimum_cancellation_hours,
    penalty_rate: penaltyRate,
    description: encodedDesc,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateErr } = await supabase
    .from("m_cancellation_policy")
    .update(updateData)
    .eq("cancellation_policy_id", cleanId)
    .select("*, m_hotel(hotel_id, name, address, star_rating)")
    .single();

  if (updateErr) {
    throwDatabaseError("Không thể cập nhật chính sách hoàn tiền.", updateErr);
  }

  return parseCancellationPolicyRecord(updated);
};

/**
 * DELETE a refund policy with database integrity verification
 */
const deleteRefundPolicy = async (id) => {
  ensureClient();
  const cleanId = String(id).trim();
  const isDedicatedTable = await checkRefundPolicyTable();

  if (isDedicatedTable) {
    // Check if soft delete
    const { error } = await supabase
      .from("m_refund_policy")
      .update({ is_deleted: true, status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("policy_id", cleanId);
    if (error) throwDatabaseError("Không thể xóa chính sách hoàn tiền.", error);
    return { success: true };
  }

  // Check existence with hotel relation
  const { data: existing, error: checkErr } = await supabase
    .from("m_cancellation_policy")
    .select("cancellation_policy_id, hotel_id, m_hotel(name)")
    .eq("cancellation_policy_id", cleanId)
    .maybeSingle();

  if (checkErr) throwDatabaseError("Lỗi khi kiểm tra chính sách hoàn tiền.", checkErr);
  if (!existing) {
    const notFound = new Error("Chính sách hoàn tiền không tồn tại hoặc đã bị xóa.");
    notFound.statusCode = 404;
    throw notFound;
  }

  // 1. Business Rule: Prevent deletion if policy is assigned to any hotel
  if (existing.hotel_id) {
    const hotelName = existing.m_hotel?.name ? ` "${existing.m_hotel.name}"` : "";
    const forbidden = new Error(
      `Không thể xóa chính sách hoàn tiền vì đang được chỉ định cho khách sạn${hotelName}. Chỉ có thể xóa các chính sách không thuộc khách sạn nào (hoặc chuyển trạng thái sang "Tạm dừng").`
    );
    forbidden.statusCode = 400;
    throw forbidden;
  }

  // 2. Business Rule: Prevent deletion if policy is linked to any bookings
  const { count: bookingCount, error: countErr } = await supabase
    .from("t_booking")
    .select("booking_id", { count: "exact", head: true })
    .eq("cancellation_policy_id", cleanId);

  if (countErr) {
    throwDatabaseError("Lỗi kiểm tra ràng buộc đơn đặt phòng liên quan.", countErr);
  }

  if (bookingCount && bookingCount > 0) {
    const conflict = new Error(
      `Không thể xóa chính sách hoàn tiền này vì đang được áp dụng trong ${bookingCount} đơn đặt phòng (Booking). Để bảo toàn tính toàn vẹn dữ liệu kế toán và lịch sử giao dịch, vui lòng chuyển trạng thái sang "Tạm dừng" thay vì xóa hẳn.`
    );
    conflict.statusCode = 409;
    throw conflict;
  }

  // 3. Safe to delete: Tạm thời không xóa cứng trong DB để bảo toàn dữ liệu lịch sử
  // (Đợi bổ sung 2 cột is_deleted và deleted_at vào DB sau)
  return { success: true, message: "Đã xóa chính sách hoàn tiền thành công." };
};

module.exports = {
  getRefundPolicies,
  getRefundPolicyById,
  createRefundPolicy,
  updateRefundPolicy,
  deleteRefundPolicy,
  getHotelsList,
};
