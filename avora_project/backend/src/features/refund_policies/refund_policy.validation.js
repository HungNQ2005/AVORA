"use strict";

/**
 * Validate UUID format matching PostgreSQL and project conventions.
 * @param {string} id
 */
const isValidUuid = (id) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );

/**
 * Strip internal HTML/META tags and bracket delimiters to prevent corruption
 * @param {string} str
 */
const sanitizeString = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
};

/**
 * Validates payload for creating or updating a refund policy.
 * @param {object} body
 * @param {{ partial?: boolean }} options
 */
const validateRefundPolicyPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Dữ liệu yêu cầu không hợp lệ. Vui lòng gửi một đối tượng JSON." };
  }

  const payload = {};
  const isPresent = (field) => body[field] !== undefined;

  // 1. policy_name (Tên chính sách)
  if (!partial || isPresent("policy_name")) {
    if (body.policy_name === null || body.policy_name === undefined) {
      return { error: "Tên chính sách hoàn tiền không được để trống." };
    }
    const rawName = String(body.policy_name || "").trim();
    if (!rawName) {
      return { error: "Tên chính sách hoàn tiền không được để trống." };
    }
    if (rawName.length < 3) {
      return { error: "Tên chính sách phải có ít nhất 3 ký tự." };
    }
    if (rawName.length > 200) {
      return { error: "Tên chính sách không được vượt quá 200 ký tự." };
    }

    // Sanitize any bracket/meta injection
    const cleanName = sanitizeString(rawName).replace(/^\[(.*?)\]$/, "$1").trim();
    if (!cleanName) {
      return { error: "Tên chính sách chứa ký tự không hợp lệ." };
    }

    // Must start with letter or digit
    if (!/^[\p{L}0-9]/u.test(cleanName)) {
      return { error: "Tên chính sách phải bắt đầu bằng chữ cái hoặc chữ số, không được bắt đầu bằng ký tự đặc biệt." };
    }

    // Must contain letters (cannot be only special characters or only numbers)
    if (!/[\p{L}]/u.test(cleanName)) {
      return { error: "Tên chính sách phải chứa chữ cái, không được chỉ chứa toàn bộ ký tự đặc biệt hoặc số." };
    }

    // Disallow dangerous or weird special characters
    if (/[@#$^&*~`<>\[\]{}|\\_;=!]/.test(cleanName)) {
      return {
        error:
          "Tên chính sách chứa ký tự đặc biệt không hợp lệ (@, #, $, ^, &, *, ~, <, >, [, ], {, }, |, \\, _, ;, =). Chỉ cho phép chữ cái, số, dấu cách và các dấu (- , ( ) % / . ,).",
      };
    }

    payload.policy_name = cleanName;
  }

  // 2. refund_percentage (Tỷ lệ hoàn tiền: 0% - 100%)
  if (!partial || isPresent("refund_percentage")) {
    const rawVal = body.refund_percentage;
    if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") {
      return { error: "Vui lòng nhập tỷ lệ hoàn tiền (từ 0% đến 100%)." };
    }
    const rawRate = Number(rawVal);
    if (isNaN(rawRate) || !Number.isFinite(rawRate)) {
      return { error: "Tỷ lệ hoàn tiền phải là một số hợp lệ." };
    }
    if (rawRate < 0 || rawRate > 100) {
      return { error: "Tỷ lệ hoàn tiền phải nằm trong khoảng từ 0% đến 100%." };
    }
    // Limit to max 2 decimal places
    payload.refund_percentage = Math.round(rawRate * 100) / 100;
  }

  // 3. minimum_cancellation_hours (Số giờ tối thiểu trước nhận phòng)
  if (!partial || isPresent("minimum_cancellation_hours")) {
    const rawVal = body.minimum_cancellation_hours;
    if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") {
      return { error: "Vui lòng nhập số giờ hủy tối thiểu trước giờ nhận phòng." };
    }
    const rawHours = Number(rawVal);
    if (isNaN(rawHours) || !Number.isFinite(rawHours)) {
      return { error: "Số giờ hủy tối thiểu phải là số nguyên hợp lệ." };
    }
    if (!Number.isInteger(rawHours) || rawHours < 0) {
      return {
        error: "Số giờ tối thiểu trước nhận phòng phải là số nguyên không âm (>= 0 giờ).",
      };
    }
    if (rawHours > 8760) {
      // 1 year max
      return { error: "Số giờ hủy phòng tối đa không được vượt quá 8.760 giờ (tương đương 1 năm)." };
    }
    payload.minimum_cancellation_hours = rawHours;
  }

  // 4. description (Mô tả chính sách)
  if (!partial || isPresent("description")) {
    const rawDesc = String(body.description || "").trim();
    if (rawDesc.length > 1000) {
      return { error: "Mô tả chính sách không được vượt quá 1.000 ký tự." };
    }
    const cleanDesc = sanitizeString(rawDesc);
    if (cleanDesc && !/[\p{L}0-9]/u.test(cleanDesc)) {
      return { error: "Mô tả chính sách phải chứa chữ cái hoặc chữ số, không được chỉ chứa ký tự đặc biệt." };
    }
    payload.description = cleanDesc;
  }

  // 5. refund_conditions (Điều kiện hoàn tiền)
  if (!partial || isPresent("refund_conditions")) {
    const rawCond = String(body.refund_conditions || "").trim();
    if (rawCond.length > 1000) {
      return { error: "Điều kiện hoàn tiền không được vượt quá 1.000 ký tự." };
    }
    const cleanCond = sanitizeString(rawCond);
    if (cleanCond && !/[\p{L}0-9]/u.test(cleanCond)) {
      return { error: "Điều kiện hoàn tiền phải chứa chữ cái hoặc chữ số, không được chỉ chứa ký tự đặc biệt." };
    }
    payload.refund_conditions = cleanCond;
  }

  // 6. hotel_id (Khách sạn áp dụng, hoặc null/rỗng/"ALL"/"SYSTEM" cho toàn hệ thống)
  if (isPresent("hotel_id")) {
    const hotelId = body.hotel_id;
    if (hotelId === null || hotelId === "" || hotelId === "ALL" || hotelId === "SYSTEM") {
      payload.hotel_id = null;
    } else if (typeof hotelId === "string" && isValidUuid(hotelId)) {
      payload.hotel_id = hotelId.trim();
    } else {
      return { error: "Mã khách sạn (hotel_id) không hợp lệ (phải là định dạng UUID chuẩn hoặc để trống cho toàn chuỗi)." };
    }
  } else if (!partial) {
    payload.hotel_id = null;
  }

  // 7. effective_from (Ngày bắt đầu hiệu lực)
  if (isPresent("effective_from") && body.effective_from) {
    const fromDate = new Date(body.effective_from);
    if (isNaN(fromDate.getTime())) {
      return { error: "Ngày bắt đầu hiệu lực không đúng định dạng ngày tháng hợp lệ." };
    }
    payload.effective_from = fromDate.toISOString();
  } else if (!partial) {
    payload.effective_from = null;
  }

  // 8. effective_to (Ngày kết thúc hiệu lực)
  if (isPresent("effective_to") && body.effective_to) {
    const toDate = new Date(body.effective_to);
    if (isNaN(toDate.getTime())) {
      return { error: "Ngày kết thúc hiệu lực không đúng định dạng ngày tháng hợp lệ." };
    }
    payload.effective_to = toDate.toISOString();
  } else if (!partial) {
    payload.effective_to = null;
  }

  // Kiểm tra: Ngày kết thúc không được sớm hơn ngày bắt đầu
  if (payload.effective_from && payload.effective_to) {
    if (new Date(payload.effective_to) < new Date(payload.effective_from)) {
      return { error: "Ngày kết thúc hiệu lực không được sớm hơn ngày bắt đầu hiệu lực." };
    }
  }

  // 9. status ('ACTIVE' | 'INACTIVE')
  if (isPresent("status")) {
    const status = String(body.status || "").trim().toUpperCase();
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return { error: "Trạng thái chính sách không hợp lệ (phải là ACTIVE - Đang áp dụng hoặc INACTIVE - Tạm dừng)." };
    }
    payload.status = status;
  } else if (!partial) {
    payload.status = "ACTIVE";
  }

  return { payload };
};

/**
 * Validates query parameters for listing refund policies.
 * @param {object} query
 */
const validateRefundPolicyFilters = (query = {}) => {
  const filters = {
    search: typeof query.search === "string" ? query.search.trim() : "",
    status: (query.status || "ALL").toString().trim().toUpperCase(),
    hotel_id: (query.hotel_id || "ALL").toString().trim(),
    sort_by: (query.sort_by || "PERCENT_DESC").toString().trim(),
  };

  if (filters.search.length > 200) {
    return { error: "Từ khóa tìm kiếm không được vượt quá 200 ký tự." };
  }

  if (filters.status !== "ALL" && !["ACTIVE", "INACTIVE"].includes(filters.status)) {
    return { error: "Bộ lọc trạng thái không hợp lệ (phải là ALL, ACTIVE hoặc INACTIVE)." };
  }

  if (filters.hotel_id !== "ALL" && filters.hotel_id !== "SYSTEM" && !isValidUuid(filters.hotel_id)) {
    return { error: "Bộ lọc khách sạn không hợp lệ (phải là ALL, SYSTEM hoặc mã UUID hợp lệ)." };
  }

  const validSorts = [
    "PERCENT_DESC",
    "PERCENT_ASC",
    "HOURS_ASC",
    "HOURS_DESC",
    "BOOKINGS_DESC",
    "OLDEST",
    "NAME_ASC",
  ];
  if (!validSorts.includes(filters.sort_by)) {
    filters.sort_by = "PERCENT_DESC";
  }

  return { filters };
};

module.exports = {
  isValidUuid,
  sanitizeString,
  validateRefundPolicyPayload,
  validateRefundPolicyFilters,
};

