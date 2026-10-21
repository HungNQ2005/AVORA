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
 * Validates payload for creating or updating a commission policy.
 * @param {object} body
 * @param {{ partial?: boolean }} options
 */
const validateCommissionPolicyPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object") {
    return { error: "Dữ liệu yêu cầu không hợp lệ." };
  }

  const payload = {};
  const isPresent = (field) => body[field] !== undefined;

  // 1. policy_name (Tên chính sách hoa hồng)
  if (!partial || isPresent("policy_name")) {
    const name = String(body.policy_name || "").trim();
    if (!name) {
      return { error: "Tên chính sách hoa hồng không được để trống." };
    }
    if (name.length < 3 || name.length > 255) {
      return { error: "Tên chính sách hoa hồng phải từ 3 đến 255 ký tự." };
    }
    payload.policy_name = name;
  }

  // 2. commission_rate (Tỷ lệ phần trăm hoa hồng: 0% - 100%)
  if (!partial || isPresent("commission_rate")) {
    const rawRate = Number(body.commission_rate);
    if (isNaN(rawRate) || rawRate < 0 || rawRate > 100) {
      return { error: "Tỷ lệ hoa hồng phải là số hợp lệ từ 0% đến 100%." };
    }
    payload.commission_rate = Math.round(rawRate * 100) / 100;
  }

  // 3. priority_level (Mức độ ưu tiên: 0 - 100)
  if (!partial || isPresent("priority_level")) {
    const rawPriority = Number(body.priority_level ?? 0);
    if (isNaN(rawPriority) || rawPriority < 0 || !Number.isInteger(rawPriority)) {
      return {
        error: "Mức độ ưu tiên phải là số nguyên không âm (>= 0).",
      };
    }
    if (rawPriority > 100) {
      return { error: "Mức độ ưu tiên không được vượt quá 100." };
    }
    payload.priority_level = rawPriority;
  }

  // 4. star_quality (Hạng sao áp dụng: null hoặc 1 - 5)
  if (isPresent("star_quality")) {
    const rawStar = body.star_quality;
    if (rawStar === null || rawStar === "" || rawStar === "ALL") {
      payload.star_quality = null;
    } else {
      const starNum = Number(rawStar);
      if (isNaN(starNum) || starNum < 1 || starNum > 5 || !Number.isInteger(starNum)) {
        return { error: "Hạng sao áp dụng phải là số nguyên từ 1 đến 5 sao hoặc để trống." };
      }
      payload.star_quality = starNum;
    }
  } else if (!partial) {
    payload.star_quality = null;
  }

  // 5. hotel_id (Khách sạn áp dụng, hoặc null/rỗng cho toàn hệ thống / theo sao)
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

  // Conflict validation: Không nên vừa chỉ định hotel_id vừa chọn star_quality riêng biệt nếu không cần thiết
  if (payload.hotel_id && payload.star_quality) {
    // Ưu tiên theo khách sạn cụ thể
    payload.star_quality = null;
  }

  // 6. valid_from (Ngày bắt đầu hiệu lực)
  if (isPresent("valid_from") && body.valid_from) {
    const fromDate = new Date(body.valid_from);
    if (isNaN(fromDate.getTime())) {
      return { error: "Ngày bắt đầu hiệu lực không đúng định dạng ngày tháng." };
    }
    payload.valid_from = fromDate.toISOString().substring(0, 10);
  } else if (!partial) {
    payload.valid_from = null;
  }

  // 7. valid_to (Ngày kết thúc hiệu lực)
  if (isPresent("valid_to") && body.valid_to) {
    const toDate = new Date(body.valid_to);
    if (isNaN(toDate.getTime())) {
      return { error: "Ngày kết thúc hiệu lực không đúng định dạng ngày tháng." };
    }
    payload.valid_to = toDate.toISOString().substring(0, 10);
  } else if (!partial) {
    payload.valid_to = null;
  }

  // 8. Ràng buộc ngày kết thúc >= ngày bắt đầu
  if (payload.valid_from && payload.valid_to) {
    if (new Date(payload.valid_to) < new Date(payload.valid_from)) {
      return { error: "Ngày kết thúc hiệu lực không được sớm hơn ngày bắt đầu." };
    }
  }

  // 9. is_active (boolean)
  if (isPresent("is_active")) {
    payload.is_active = Boolean(body.is_active);
  }

  return { payload };
};

module.exports = {
  isValidUuid,
  validateCommissionPolicyPayload,
};
