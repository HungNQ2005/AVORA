'use strict';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_NAME_REGEX = /^[A-Z0-9_-]{1,38}$/;
const ALLOWED_DISCOUNT_TYPES = ['FLASH_PERCENT', 'FIXED_AMOUNT', 'PERCENT', 'FIXED'];

const validationError = (message) => ({ error: message });

const parseOptionalAmount = (value, field, { integer = false } = {}) => {
  if (value === null || value === '' || value === undefined) {
    return { value: null };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    return validationError(`${field} phải là số không âm hợp lệ.`);
  }
  return { value: parsed };
};

const parseDate = (value, field) => {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return validationError(`${field} không được để trống.`);
  }
  const timestamp = Date.parse(value.trim());
  if (!Number.isFinite(timestamp)) {
    return validationError(`${field} không phải ngày giờ ISO hợp lệ.`);
  }
  return { value: new Date(timestamp).toISOString(), time: timestamp };
};

const validateCreateFlashSale = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return validationError('Dữ liệu Flash Sale không hợp lệ.');
  }

  const allowedFields = new Set([
    'hotel_id',
    'code_name',
    'discount_type',
    'discount_value',
    'max_discount_amount',
    'min_order_amount',
    'usage_limit',
    'valid_from',
    'valid_to',
  ]);

  const unsupported = Object.keys(body).filter((k) => !allowedFields.has(k));
  if (unsupported.length > 0) {
    return validationError(`Trường dữ liệu không được hỗ trợ: ${unsupported.join(', ')}.`);
  }

  // Required: hotel_id
  if (!body.hotel_id || typeof body.hotel_id !== 'string' || !UUID_REGEX.test(body.hotel_id.trim())) {
    return validationError('Mã khách sạn (hotel_id) không hợp lệ.');
  }

  // Required: code_name
  if (!body.code_name || typeof body.code_name !== 'string') {
    return validationError('Tên mã Flash Sale (code_name) không được để trống.');
  }
  const cleanCodeName = body.code_name.trim().toUpperCase().replace(/^FS_[A-F0-9]{8}_/, '');
  if (!cleanCodeName || !CODE_NAME_REGEX.test(cleanCodeName)) {
    return validationError('Tên mã Flash Sale chỉ gồm chữ cái, chữ số, gạch nối hoặc gạch dưới (1 đến 38 ký tự).');
  }

  // discount_type
  const discountType = String(body.discount_type || 'PERCENT').trim().toUpperCase();
  if (!ALLOWED_DISCOUNT_TYPES.includes(discountType)) {
    return validationError('Loại giảm giá chỉ được là FLASH_PERCENT, FIXED_AMOUNT, PERCENT hoặc FIXED.');
  }

  // Required: discount_value
  if (body.discount_value === undefined || body.discount_value === null || body.discount_value === '') {
    return validationError('Giá trị giảm giá không được để trống.');
  }
  const parsedDiscountVal = parseOptionalAmount(body.discount_value, 'Giá trị giảm');
  if (parsedDiscountVal.error || parsedDiscountVal.value === null || parsedDiscountVal.value <= 0) {
    return validationError('Giá trị giảm phải là số lớn hơn 0.');
  }
  if (['FLASH_PERCENT', 'PERCENT'].includes(discountType) && parsedDiscountVal.value > 100) {
    return validationError('Giá trị giảm theo phần trăm không được vượt quá 100%.');
  }

  // Optional: max_discount_amount
  const parsedMax = parseOptionalAmount(body.max_discount_amount, 'Mức giảm tối đa');
  if (parsedMax.error) return parsedMax;

  // Optional: min_order_amount
  const parsedMin = parseOptionalAmount(body.min_order_amount, 'Đơn tối thiểu');
  if (parsedMin.error) return parsedMin;

  // Optional: usage_limit
  const parsedLimit = parseOptionalAmount(body.usage_limit, 'Giới hạn sử dụng', { integer: true });
  if (parsedLimit.error) return parsedLimit;
  if (parsedLimit.value !== null && parsedLimit.value <= 0) {
    return validationError('Giới hạn sử dụng phải là số nguyên dương lớn hơn 0.');
  }

  // Required: valid_from, valid_to
  const parsedFrom = parseDate(body.valid_from, 'Thời gian bắt đầu');
  if (parsedFrom.error) return parsedFrom;

  const parsedTo = parseDate(body.valid_to, 'Thời gian kết thúc');
  if (parsedTo.error) return parsedTo;

  if (parsedTo.time <= parsedFrom.time) {
    return validationError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
  }

  return {
    payload: {
      hotel_id: body.hotel_id.trim(),
      code_name: cleanCodeName,
      discount_type: discountType,
      discount_value: parsedDiscountVal.value,
      max_discount_amount: parsedMax.value,
      min_order_amount: parsedMin.value,
      usage_limit: parsedLimit.value,
      valid_from: parsedFrom.value,
      valid_to: parsedTo.value,
    },
  };
};

const validateUpdateFlashSale = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return validationError('Dữ liệu cập nhật không hợp lệ.');
  }

  const allowedFields = new Set([
    'code_name',
    'discount_type',
    'discount_value',
    'max_discount_amount',
    'min_order_amount',
    'usage_limit',
    'valid_from',
    'valid_to',
  ]);

  const unsupported = Object.keys(body).filter((k) => !allowedFields.has(k));
  if (unsupported.length > 0) {
    return validationError(`Không được phép thay đổi trường: ${unsupported.join(', ')}.`);
  }

  if (Object.keys(body).length === 0) {
    return validationError('Vui lòng cung cấp ít nhất một thông tin cần cập nhật.');
  }

  const payload = {};

  if (body.code_name !== undefined) {
    const cleanCodeName = String(body.code_name).trim().toUpperCase().replace(/^FS_[A-F0-9]{8}_/, '');
    if (!cleanCodeName || !CODE_NAME_REGEX.test(cleanCodeName)) {
      return validationError('Tên mã Flash Sale chỉ gồm chữ cái, chữ số, gạch nối hoặc gạch dưới (1 đến 38 ký tự).');
    }
    payload.code_name = cleanCodeName;
  }

  if (body.discount_type !== undefined) {
    const discountType = String(body.discount_type).trim().toUpperCase();
    if (!ALLOWED_DISCOUNT_TYPES.includes(discountType)) {
      return validationError('Loại giảm giá chỉ được là FLASH_PERCENT, FIXED_AMOUNT, PERCENT hoặc FIXED.');
    }
    payload.discount_type = discountType;
  }

  if (body.discount_value !== undefined) {
    const parsedDiscountVal = parseOptionalAmount(body.discount_value, 'Giá trị giảm');
    if (parsedDiscountVal.error || parsedDiscountVal.value === null || parsedDiscountVal.value <= 0) {
      return validationError('Giá trị giảm phải là số lớn hơn 0.');
    }
    payload.discount_value = parsedDiscountVal.value;
  }

  if (['FLASH_PERCENT', 'PERCENT'].includes(payload.discount_type) && payload.discount_value !== undefined && payload.discount_value > 100) {
    return validationError('Giá trị giảm theo phần trăm không được vượt quá 100%.');
  }

  if (body.max_discount_amount !== undefined) {
    const parsedMax = parseOptionalAmount(body.max_discount_amount, 'Mức giảm tối đa');
    if (parsedMax.error) return parsedMax;
    payload.max_discount_amount = parsedMax.value;
  }

  if (body.min_order_amount !== undefined) {
    const parsedMin = parseOptionalAmount(body.min_order_amount, 'Đơn tối thiểu');
    if (parsedMin.error) return parsedMin;
    payload.min_order_amount = parsedMin.value;
  }

  if (body.usage_limit !== undefined) {
    const parsedLimit = parseOptionalAmount(body.usage_limit, 'Giới hạn sử dụng', { integer: true });
    if (parsedLimit.error) return parsedLimit;
    if (parsedLimit.value !== null && parsedLimit.value <= 0) {
      return validationError('Giới hạn sử dụng phải là số nguyên dương lớn hơn 0.');
    }
    payload.usage_limit = parsedLimit.value;
  }

  let fromTime = null;
  let toTime = null;

  if (body.valid_from !== undefined) {
    const parsedFrom = parseDate(body.valid_from, 'Thời gian bắt đầu');
    if (parsedFrom.error) return parsedFrom;
    payload.valid_from = parsedFrom.value;
    fromTime = parsedFrom.time;
  }

  if (body.valid_to !== undefined) {
    const parsedTo = parseDate(body.valid_to, 'Thời gian kết thúc');
    if (parsedTo.error) return parsedTo;
    payload.valid_to = parsedTo.value;
    toTime = parsedTo.time;
  }

  if (fromTime && toTime && toTime <= fromTime) {
    return validationError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
  }

  return { payload };
};

const validateFlashSaleId = (id) =>
  typeof id === 'string' && UUID_REGEX.test(id.trim());

module.exports = {
  validateCreateFlashSale,
  validateUpdateFlashSale,
  validateFlashSaleId,
  UUID_REGEX,
  CODE_NAME_REGEX,
  ALLOWED_DISCOUNT_TYPES,
};
