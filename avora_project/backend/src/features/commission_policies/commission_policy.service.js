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
    error.message = "Chính sách hoa hồng đã tồn tại hoặc bị trùng lặp.";
  } else if (databaseError?.code === "23503") {
    error.message = "Không thể thao tác vì vi phạm ràng buộc dữ liệu liên quan (Khách sạn không tồn tại).";
  } else if (databaseError?.message) {
    error.message = `${message} (${databaseError.message})`;
  }
  throw error;
};

// In-memory fallback cache in case m_commission_policy table isn't created in Supabase yet
let _fallbackPolicies = null;

const getInitialFallbackPolicies = () => [
  {
    policy_id: "00000000-0000-0000-0000-000000000001",
    policy_name: "Chính sách hoa hồng cơ sở toàn chuỗi AVORA",
    commission_rate: 12.0,
    priority_level: 0,
    star_quality: null,
    hotel_id: null,
    valid_from: "2024-01-01",
    valid_to: null,
    created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
    updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
  },
  {
    policy_id: "00000000-0000-0000-0000-000000000002",
    policy_name: "Chính sách ưu đãi phân khúc khách sạn 5 sao",
    commission_rate: 15.0,
    priority_level: 2,
    star_quality: 5,
    hotel_id: null,
    valid_from: "2024-01-01",
    valid_to: null,
    created_at: new Date("2024-01-02T00:00:00Z").toISOString(),
    updated_at: new Date("2024-01-02T00:00:00Z").toISOString(),
  },
  {
    policy_id: "00000000-0000-0000-0000-000000000003",
    policy_name: "Chính sách phân khúc khách sạn 3 & 4 sao",
    commission_rate: 10.0,
    priority_level: 2,
    star_quality: 4,
    hotel_id: null,
    valid_from: "2024-01-01",
    valid_to: null,
    created_at: new Date("2024-01-03T00:00:00Z").toISOString(),
    updated_at: new Date("2024-01-03T00:00:00Z").toISOString(),
  },
];

let _isCommissionTableAvailable = null;
const checkCommissionTable = async () => {
  if (_isCommissionTableAvailable !== null) return _isCommissionTableAvailable;
  try {
    const { error } = await supabase.from("m_commission_policy").select("policy_id").limit(1);
    if (!error) {
      _isCommissionTableAvailable = true;
      return true;
    }
  } catch {
    // ignore
  }
  _isCommissionTableAvailable = false;
  return false;
};

/**
 * Determine dynamic status of a policy based on validity dates
 */
const computePolicyStatus = (validFrom, validTo) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  if (validTo && validTo < todayStr) return "EXPIRED";
  if (validFrom && validFrom > todayStr) return "UPCOMING";
  return "ACTIVE";
};

/**
 * Enriches and normalizes a commission policy record
 */
const formatCommissionPolicyRecord = (record, hotelMap = {}) => {
  const hotel = record.m_hotel || hotelMap[record.hotel_id] || null;
  const isDeleted = record.is_active === false || record.is_deleted === true;
  const status = isDeleted ? "INACTIVE" : computePolicyStatus(record.valid_from, record.valid_to);

  let scope = "SYSTEM";
  let scopeLabel = "Toàn hệ thống AVORA";

  if (record.hotel_id) {
    scope = "HOTEL";
    scopeLabel = hotel?.name ? `Khách sạn: ${hotel.name}` : "Khách sạn đối tác";
  } else if (record.star_quality) {
    scope = "STAR";
    scopeLabel = `Phân khúc ${record.star_quality} sao`;
  }

  const generatedCode =
    record.policy_code ||
    `CP-${String(record.policy_id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  return {
    policy_id: record.policy_id,
    policy_code: generatedCode,
    policy_name: record.policy_name || "Chính sách hoa hồng",
    commission_rate: Number(record.commission_rate || 0),
    priority_level: Number(record.priority_level ?? 0),
    star_quality: record.star_quality ? Number(record.star_quality) : null,
    hotel_id: record.hotel_id || null,
    is_active: record.is_active !== false,
    hotel: hotel
      ? {
        hotel_id: hotel.hotel_id,
        name: hotel.name,
        address: hotel.address,
        star_quality: hotel.star_rating || hotel.star_quality,
        star_rating: hotel.star_rating || hotel.star_quality,
      }
      : null,
    hotel_name: hotel?.name || null,
    scope,
    scope_label: scopeLabel,
    valid_from: record.valid_from ? record.valid_from.substring(0, 10) : null,
    valid_to: record.valid_to ? record.valid_to.substring(0, 10) : null,
    status,
    status_label:
      isDeleted
        ? "Đã vô hiệu / Đã xóa"
        : status === "ACTIVE"
          ? "Đang áp dụng"
          : status === "UPCOMING"
            ? "Sắp hiệu lực"
            : "Đã hết hạn",
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};

/**
 * Fetch hotels list for dropdown selection
 */
const getHotelsList = async () => {
  ensureClient();
  try {
    let { data, error } = await supabase
      .from("m_hotel")
      .select("hotel_id, name, address, star_rating")
      .eq("is_deleted", false)
      .order("name", { ascending: true });

    if (error && (error.code === "42703" || error.message?.includes("star_rating"))) {
      const retry = await supabase
        .from("m_hotel")
        .select("hotel_id, name, address, star_quality")
        .eq("is_deleted", false)
        .order("name", { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn("[CommissionPolicy] Lỗi khi tải danh sách khách sạn:", error.message);
      return [];
    }
    return (data || []).map((h) => ({
      ...h,
      star_quality: h.star_quality || h.star_rating,
      star_rating: h.star_rating || h.star_quality,
    }));
  } catch (err) {
    console.warn("[CommissionPolicy] Lỗi khi tải khách sạn:", err.message);
    return [];
  }
};

/**
 * GET all commission policies with filtering, stats, and sorting
 */
const getCommissionPolicies = async (filters = {}) => {
  ensureClient();
  const isTableAvailable = await checkCommissionTable();
  const hotels = await getHotelsList();
  const hotelMap = {};
  hotels.forEach((h) => {
    hotelMap[h.hotel_id] = h;
  });

  let rawList = [];

  if (isTableAvailable) {
    let query = supabase
      .from("m_commission_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .order("priority_level", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.hotel_id && filters.hotel_id !== "ALL") {
      if (filters.hotel_id === "SYSTEM") {
        query = query.is("hotel_id", null).is("star_quality", null);
      } else if (filters.hotel_id.startsWith("STAR_")) {
        const star = Number(filters.hotel_id.replace("STAR_", ""));
        query = query.eq("star_quality", star);
      } else {
        query = query.eq("hotel_id", filters.hotel_id);
      }
    }

    // Lọc bỏ các bản ghi đã xóa mềm (is_active = false)
    query = query.or("is_active.eq.true,is_active.is.null");

    let { data, error } = await query;
    if (error && (error.code === "42703" || error.message?.includes("star_rating"))) {
      let retryQuery = supabase
        .from("m_commission_policy")
        .select("*, m_hotel(hotel_id, name, address, star_quality)")
        .order("priority_level", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters.hotel_id && filters.hotel_id !== "ALL") {
        if (filters.hotel_id === "SYSTEM") {
          retryQuery = retryQuery.is("hotel_id", null).is("star_quality", null);
        } else if (filters.hotel_id.startsWith("STAR_")) {
          const star = Number(filters.hotel_id.replace("STAR_", ""));
          retryQuery = retryQuery.eq("star_quality", star);
        } else {
          retryQuery = retryQuery.eq("hotel_id", filters.hotel_id);
        }
      }
      retryQuery = retryQuery.or("is_active.eq.true,is_active.is.null");
      const retry = await retryQuery;
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      throwDatabaseError("Không thể tải danh sách chính sách phí hoa hồng.", error);
    }
    rawList = (data || []).filter(
      (record) => record.is_active !== false && record.is_deleted !== true
    );
  } else {
    // Fallback in-memory
    if (!_fallbackPolicies) {
      _fallbackPolicies = getInitialFallbackPolicies();
    }
    rawList = _fallbackPolicies.filter(
      (record) => record.is_active !== false && record.is_deleted !== true
    );
  }

  let policies = rawList.map((record) => formatCommissionPolicyRecord(record, hotelMap));

  // Compute stats across full list before search filtering
  const total = policies.length;
  const active = policies.filter((p) => p.status === "ACTIVE").length;
  const upcoming = policies.filter((p) => p.status === "UPCOMING").length;
  const expired = policies.filter((p) => p.status === "EXPIRED").length;
  const sumRate = policies.reduce((acc, p) => acc + Number(p.commission_rate || 0), 0);
  const avgRate = total > 0 ? Math.round((sumRate / total) * 10) / 10 : 0;
  const hotelSpecific = policies.filter((p) => p.scope === "HOTEL").length;
  const starSpecific = policies.filter((p) => p.scope === "STAR").length;
  const systemDefault = policies.filter((p) => p.scope === "SYSTEM").length;

  // In-memory filter: Status
  if (filters.status && filters.status !== "ALL") {
    policies = policies.filter((p) => p.status === filters.status);
  }

  // In-memory filter: Scope
  if (filters.scope && filters.scope !== "ALL") {
    policies = policies.filter((p) => p.scope === filters.scope);
  }

  // In-memory filter: Search term
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    policies = policies.filter(
      (p) =>
        p.policy_name?.toLowerCase().includes(term) ||
        p.policy_code?.toLowerCase().includes(term) ||
        p.hotel_name?.toLowerCase().includes(term) ||
        p.scope_label?.toLowerCase().includes(term) ||
        String(p.commission_rate).includes(term)
    );
  }

  // Sort
  if (filters.sort_by) {
    policies.sort((a, b) => {
      switch (filters.sort_by) {
        case "RATE_ASC":
          return a.commission_rate - b.commission_rate;
        case "RATE_DESC":
          return b.commission_rate - a.commission_rate;
        case "PRIORITY_DESC":
          return b.priority_level - a.priority_level;
        case "PRIORITY_ASC":
          return a.priority_level - b.priority_level;
        case "OLDEST":
          return new Date(a.created_at) - new Date(b.created_at);
        case "NAME_ASC":
          return (a.policy_name || "").localeCompare(b.policy_name || "");
        case "NEWEST":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }

  return {
    policies,
    stats: {
      total_policies: total,
      active_policies: active,
      upcoming_policies: upcoming,
      expired_policies: expired,
      avg_commission_rate: avgRate,
      hotel_specific_count: hotelSpecific,
      star_specific_count: starSpecific,
      system_default_count: systemDefault,
    },
  };
};

/**
 * GET detail of single commission policy by ID
 */
const getCommissionPolicyById = async (id) => {
  ensureClient();
  const cleanId = String(id || "").trim();
  const isTableAvailable = await checkCommissionTable();
  if (isTableAvailable) {
    let { data, error } = await supabase
      .from("m_commission_policy")
      .select("*, m_hotel(hotel_id, name, address, star_rating)")
      .eq("policy_id", cleanId)
      .maybeSingle();

    if (error && (error.code === "42703" || error.message?.includes("star_rating"))) {
      const retry = await supabase
        .from("m_commission_policy")
        .select("*, m_hotel(hotel_id, name, address, star_quality)")
        .eq("policy_id", cleanId)
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throwDatabaseError("Lỗi khi tải thông tin chi tiết chính sách hoa hồng.", error);
    }
    if (!data || data.is_active === false || data.is_deleted === true) {
      const err = new Error("Không tìm thấy chính sách hoa hồng yêu cầu hoặc chính sách đã bị xóa.");
      err.statusCode = 404;
      throw err;
    }
    return formatCommissionPolicyRecord(data);
  }

  // Fallback
  if (!_fallbackPolicies) _fallbackPolicies = getInitialFallbackPolicies();
  const record = _fallbackPolicies.find(
    (p) => p.policy_id === cleanId && p.is_active !== false && p.is_deleted !== true
  );
  if (!record) {
    const err = new Error("Không tìm thấy chính sách hoa hồng yêu cầu hoặc chính sách đã bị xóa.");
    err.statusCode = 404;
    throw err;
  }
  const hotels = await getHotelsList();
  const hotel = hotels.find((h) => h.hotel_id === record.hotel_id) || null;
  return formatCommissionPolicyRecord({ ...record, m_hotel: hotel });
};

/**
 * CREATE a new commission policy
 */
const createCommissionPolicy = async (payload) => {
  ensureClient();
  const isTableAvailable = await checkCommissionTable();
  const policyId = randomUUID();
  const policyCode = `CP-${policyId.replace(/-/g, "").substring(0, 8).toUpperCase()}`;

  // Tự động suy diễn priority_level hợp lý nếu không nhập
  let priority = payload.priority_level;
  if (priority === undefined || priority === null) {
    if (payload.hotel_id) priority = 3;
    else if (payload.star_quality) priority = 2;
    else priority = 1;
  }

  // Tự sinh tên chính sách nếu để trống
  let policyName = payload.policy_name ? String(payload.policy_name).trim() : "";
  if (!policyName) {
    if (payload.hotel_id) {
      policyName = `Chính sách hoa hồng khách sạn đối tác (${payload.commission_rate}%)`;
    } else if (payload.star_quality) {
      policyName = `Chính sách ưu đãi phân khúc ${payload.star_quality} sao (${payload.commission_rate}%)`;
    } else {
      policyName = `Chính sách hoa hồng cơ sở chuỗi AVORA (${payload.commission_rate}%)`;
    }
  }

  const recordToInsert = {
    policy_id: policyId,
    policy_name: policyName,
    commission_rate: payload.commission_rate,
    priority_level: priority,
    star_quality: payload.star_quality || null,
    hotel_id: payload.hotel_id || null,
    valid_from: payload.valid_from || null,
    valid_to: payload.valid_to || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (payload.policy_code || policyCode) {
    recordToInsert.policy_code = payload.policy_code || policyCode;
  }

  if (isTableAvailable) {
    let toInsert = { ...recordToInsert };
    let { data, error } = await supabase
      .from("m_commission_policy")
      .insert(toInsert)
      .select("*")
      .single();

    if (error && (error.code === "42703" || error.message?.includes("policy_code"))) {
      delete toInsert.policy_code;
      const retry = await supabase
        .from("m_commission_policy")
        .insert(toInsert)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error && (error.code === "42703" || error.message?.includes("is_active"))) {
      delete toInsert.is_active;
      const retry = await supabase
        .from("m_commission_policy")
        .insert(toInsert)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throwDatabaseError("Không thể tạo mới chính sách phí hoa hồng.", error);
    }

    let hotel = null;
    if (data.hotel_id) {
      const { data: hData } = await supabase
        .from("m_hotel")
        .select("hotel_id, name, address, star_rating")
        .eq("hotel_id", data.hotel_id)
        .maybeSingle();
      hotel = hData;
    }

    return formatCommissionPolicyRecord(data, hotel ? { [hotel.hotel_id]: hotel } : {});
  }

  // Fallback in-memory
  if (!_fallbackPolicies) _fallbackPolicies = getInitialFallbackPolicies();
  _fallbackPolicies.unshift(recordToInsert);
  return formatCommissionPolicyRecord(recordToInsert);
};

/**
 * UPDATE an existing commission policy
 */
const updateCommissionPolicy = async (id, payload) => {
  ensureClient();
  const cleanId = String(id || "").trim();
  const isTableAvailable = await checkCommissionTable();

  const updateFields = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  // Tự sinh tên nếu người dùng chủ động xóa trống tên
  if (updateFields.policy_name !== undefined && !updateFields.policy_name) {
    if (updateFields.hotel_id) {
      updateFields.policy_name = `Chính sách hoa hồng khách sạn đối tác (${updateFields.commission_rate ?? ""}%)`;
    } else if (updateFields.star_quality) {
      updateFields.policy_name = `Chính sách ưu đãi phân khúc ${updateFields.star_quality} sao (${updateFields.commission_rate ?? ""}%)`;
    } else {
      updateFields.policy_name = `Chính sách hoa hồng toàn hệ thống (${updateFields.commission_rate ?? ""}%)`;
    }
  }

  if (isTableAvailable) {
    const { data, error } = await supabase
      .from("m_commission_policy")
      .update(updateFields)
      .eq("policy_id", cleanId)
      .select("*")
      .maybeSingle();

    if (error) {
      throwDatabaseError("Không thể cập nhật chính sách phí hoa hồng.", error);
    }
    if (!data) {
      const err = new Error("Không tìm thấy chính sách phí hoa hồng để cập nhật.");
      err.statusCode = 404;
      throw err;
    }

    let hotel = null;
    if (data.hotel_id) {
      const { data: hData } = await supabase
        .from("m_hotel")
        .select("hotel_id, name, address, star_rating")
        .eq("hotel_id", data.hotel_id)
        .maybeSingle();
      hotel = hData;
    }

    return formatCommissionPolicyRecord(data, hotel ? { [hotel.hotel_id]: hotel } : {});
  }

  // Fallback in-memory
  if (!_fallbackPolicies) _fallbackPolicies = getInitialFallbackPolicies();
  const idx = _fallbackPolicies.findIndex((p) => p.policy_id === cleanId);
  if (idx === -1) {
    const err = new Error("Không tìm thấy chính sách phí hoa hồng để cập nhật.");
    err.statusCode = 404;
    throw err;
  }
  _fallbackPolicies[idx] = {
    ..._fallbackPolicies[idx],
    ...updateFields,
  };
  return formatCommissionPolicyRecord(_fallbackPolicies[idx]);
};

/**
 * DELETE a commission policy
 */
const deleteCommissionPolicy = async (id) => {
  ensureClient();
  const cleanId = String(id || "").trim();
  const isTableAvailable = await checkCommissionTable();

  if (isTableAvailable) {
    // Xóa mềm: Cập nhật is_active = false và updated_at trong DB
    const { data, error } = await supabase
      .from("m_commission_policy")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("policy_id", cleanId)
      .select("policy_id")
      .maybeSingle();

    if (error) {
      throwDatabaseError("Không thể xóa mềm chính sách phí hoa hồng.", error);
    }
    if (!data) {
      const err = new Error("Không tìm thấy chính sách phí hoa hồng để xóa.");
      err.statusCode = 404;
      throw err;
    }
    return { success: true, policy_id: cleanId, message: "Đã xóa chính sách phí hoa hồng thành công." };
  }

  // Fallback
  if (!_fallbackPolicies) _fallbackPolicies = getInitialFallbackPolicies();
  const idx = _fallbackPolicies.findIndex((p) => p.policy_id === cleanId);
  if (idx === -1) {
    const err = new Error("Không tìm thấy chính sách phí hoa hồng để xóa.");
    err.statusCode = 404;
    throw err;
  }
  _fallbackPolicies[idx].is_active = false;
  return { success: true, policy_id: cleanId };
};

module.exports = {
  getCommissionPolicies,
  getCommissionPolicyById,
  createCommissionPolicy,
  updateCommissionPolicy,
  deleteCommissionPolicy,
  getHotelsList,
};
