"use strict";

const allowedFields = new Set([
  "code",
  "discount_type",
  "discount_value",
  "max_discount_amount",
  "min_order_amount",
  "usage_limit",
  "valid_from",
  "valid_to",
]);

const validationError = (message) => ({ error: message });

const parseOptionalAmount = (value, field, { integer = false } = {}) => {
  if (value === null || value === "") {
    return { value: null };
  }

  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) {
    return validationError(`${field} phải là số hợp lệ.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    return validationError(`${field} không hợp lệ.`);
  }

  return { value: parsed };
};

const parseDate = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    return validationError(`${field} không được để trống.`);
  }

  const normalized = value.trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      return validationError(`${field} không phải ngày hợp lệ.`);
    }
    return { value: normalized, time: date.getTime() };
  }

  const timestampMatch = /^\d{4}-\d{2}-\d{2}T/.test(normalized);
  const timestamp = Date.parse(normalized);
  if (!timestampMatch || !Number.isFinite(timestamp)) {
    return validationError(`${field} không phải ngày hợp lệ.`);
  }

  return { value: normalized, time: timestamp };
};

const validateCouponPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError("Dữ liệu mã coupon không hợp lệ.");
  }

  const unsupportedFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unsupportedFields.length) {
    return validationError(`Trường dữ liệu không được hỗ trợ: ${unsupportedFields.join(", ")}.`);
  }

  const suppliedFields = Object.keys(body);
  if (partial && !suppliedFields.length) {
    return validationError("Vui lòng cung cấp ít nhất một thông tin cần cập nhật.");
  }
  if (!partial && !suppliedFields.length) {
    return validationError("Vui lòng cung cấp thông tin mã coupon.");
  }

  const requiredFields = ["code", "discount_type", "discount_value", "valid_from", "valid_to"];
  if (!partial) {
    const missingField = requiredFields.find((field) => body[field] === undefined);
    if (missingField) {
      return validationError("Vui lòng cung cấp đầy đủ thông tin bắt buộc của mã coupon.");
    }
  }

  const payload = {};
  if (body.code !== undefined) {
    if (typeof body.code !== "string") {
      return validationError("Mã coupon phải là chuỗi ký tự.");
    }
    const code = body.code.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
      return validationError("Mã coupon chỉ gồm chữ cái, chữ số, gạch ngang hoặc gạch dưới.");
    }
    payload.code = code;
  }

  if (body.discount_type !== undefined) {
    if (typeof body.discount_type !== "string") {
      return validationError("Loại giảm giá không hợp lệ.");
    }
    const discountType = body.discount_type.trim().toUpperCase();
    if (!["PERCENT", "FIXED"].includes(discountType)) {
      return validationError("Loại giảm giá chỉ được là PERCENT hoặc FIXED.");
    }
    payload.discount_type = discountType;
  }

  if (body.discount_value !== undefined) {
    const parsedValue = parseOptionalAmount(body.discount_value, "Giá trị giảm");
    if (parsedValue.error || parsedValue.value === null || parsedValue.value <= 0) {
      return validationError("Giá trị giảm phải là số lớn hơn 0.");
    }
    payload.discount_value = parsedValue.value;
  }

  for (const field of ["max_discount_amount", "min_order_amount"]) {
    if (body[field] !== undefined) {
      const parsedAmount = parseOptionalAmount(body[field], field);
      if (parsedAmount.error) return parsedAmount;
      payload[field] = parsedAmount.value;
    }
  }

  if (body.usage_limit !== undefined) {
    const parsedLimit = parseOptionalAmount(body.usage_limit, "Giới hạn sử dụng", {
      integer: true,
    });
    if (parsedLimit.error) return parsedLimit;
    if (parsedLimit.value !== null && parsedLimit.value <= 0) {
      return validationError("Giới hạn sử dụng phải là số nguyên dương.");
    }
    payload.usage_limit = parsedLimit.value;
  }

  const parsedDates = {};
  for (const field of ["valid_from", "valid_to"]) {
    if (body[field] !== undefined) {
      const parsedDate = parseDate(body[field], field === "valid_from" ? "Ngày bắt đầu" : "Ngày kết thúc");
      if (parsedDate.error) return parsedDate;
      payload[field] = parsedDate.value;
      parsedDates[field] = parsedDate.time;
    }
  }

  if (!partial && (parsedDates.valid_to <= parsedDates.valid_from)) {
    return validationError("Ngày kết thúc phải sau ngày bắt đầu.");
  }

  if (payload.discount_type === "PERCENT" && payload.discount_value > 100) {
    return validationError("Giá trị giảm theo phần trăm không được vượt quá 100%.");
  }

  return { payload };
};

module.exports = { validateCouponPayload };
