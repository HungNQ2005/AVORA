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
 * Validates payload for creating or updating a refund policy.
 * @param {object} body
 * @param {{ partial?: boolean }} options
 */
const validateRefundPolicyPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object") {
    return { error: "Dữ liệu yêu cầu không hợp lệ." };
  }

  const payload = {};
  const isPresent = (field) => body[field] !== undefined;

  // 1. policy_name (Tên chính sách)
  if (!partial || isPresent("policy_name")) {
    const name = String(body.policy_name || "").trim();
    if (!name) {
      return { error: "Tên chính sách hoàn tiền không được để trống." };
    }
    if (name.length < 3 || name.length > 200) {
      return { error: "Tên chính sách phải từ 3 đến 200 ký tự." };
    }
    payload.policy_name = name;
  }

  // 2. refund_percentage (Tỷ lệ hoàn tiền: 0% - 100%)
  if (!partial || isPresent("refund_percentage")) {
    const rawRate = Number(body.refund_percentage);
    if (isNaN(rawRate) || rawRate < 0 || rawRate > 100) {
      return { error: "Tỷ lệ hoàn tiền phải là số hợp lệ từ 0% đến 100%." };
    }
    payload.refund_percentage = Math.round(rawRate * 100) / 100;
  }

  // 3. minimum_cancellation_hours (Số giờ tối thiểu trước nhận phòng)
  if (!partial || isPresent("minimum_cancellation_hours")) {
    const rawHours = Number(body.minimum_cancellation_hours);
    if (isNaN(rawHours) || rawHours < 0 || !Number.isInteger(rawHours)) {
      return {
        error: "Số giờ tối thiểu trước nhận phòng phải là số nguyên không âm (>= 0).",
      };
    }
    if (rawHours > 8760) {
      // 1 year max
      return { error: "Số giờ hủy phòng tối đa không quá 8.760 giờ (1 năm)." };
    }
    payload.minimum_cancellation_hours = rawHours;
  }

  // 4. description (Mô tả chính sách)
  if (!partial || isPresent("description")) {
    const desc = String(body.description || "").trim();
    if (desc.length > 1000) {
      return { error: "Mô tả chính sách không được vượt quá 1.000 ký tự." };
    }
    payload.description = desc;
  }

  // 5. refund_conditions (Điều kiện hoàn tiền)
  if (!partial || isPresent("refund_conditions")) {
    const cond = String(body.refund_conditions || "").trim();
    if (cond.length > 1000) {
      return { error: "Điều kiện hoàn tiền không được vượt quá 1.000 ký tự." };
    }
    payload.refund_conditions = cond;
  }

  // 6. hotel_id (Khách sạn áp dụng, hoặc null/rỗng cho toàn hệ thống)
  if (isPresent("hotel_id")) {
    const hotelId = body.hotel_id;
    if (hotelId === null || hotelId === "" || hotelId === "ALL") {
      payload.hotel_id = null;
    } else if (typeof hotelId === "string" && isValidUuid(hotelId)) {
      payload.hotel_id = hotelId.trim();
    } else {
      return { error: "Mã khách sạn (hotel_id) không hợp lệ (phải là UUID hợp lệ hoặc để trống)." };
    }
  } else if (!partial) {
    payload.hotel_id = null;
  }

  // 7. effective_from (Ngày bắt đầu hiệu lực)
  if (isPresent("effective_from") && body.effective_from) {
    const fromDate = new Date(body.effective_from);
    if (isNaN(fromDate.getTime())) {
      return { error: "Ngày bắt đầu hiệu lực không đúng định dạng ngày tháng." };
    }
    payload.effective_from = fromDate.toISOString();
  } else if (!partial) {
    payload.effective_from = null;
  }

  // 8. effective_to (Ngày kết thúc hiệu lực)
  if (isPresent("effective_to") && body.effective_to) {
    const toDate = new Date(body.effective_to);
    if (isNaN(toDate.getTime())) {
      return { error: "Ngày kết thúc hiệu lực không đúng định dạng ngày tháng." };
    }
    payload.effective_to = toDate.toISOString();
  } else if (!partial) {
    payload.effective_to = null;
  }

  // Kiểm tra: Ngày kết thúc không được sớm hơn ngày bắt đầu
  if (payload.effective_from && payload.effective_to) {
    if (new Date(payload.effective_to) < new Date(payload.effective_from)) {
      return { error: "Ngày kết thúc hiệu lực không được sớm hơn ngày bắt đầu." };
    }
  }

  // 9. status ('ACTIVE' | 'INACTIVE')
  if (isPresent("status")) {
    const status = String(body.status || "").trim().toUpperCase();
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return { error: "Trạng thái chính sách phải là ACTIVE hoặc INACTIVE." };
    }
    payload.status = status;
  } else if (!partial) {
    payload.status = "ACTIVE";
  }

  // 10. is_active (boolean)
  if (isPresent("is_active")) {
    payload.is_active = Boolean(body.is_active);
  }

  return { payload };
};

module.exports = {
  isValidUuid,
  validateRefundPolicyPayload,
};
