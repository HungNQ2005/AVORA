'use strict';

const MAX_GUEST_NAME_LENGTH = 100;
const MAX_SPECIAL_REQUEST_LENGTH = 1000;
const MAX_SPECIAL_REQUEST_OPTION_LENGTH = 100;
const MAX_SPECIAL_REQUEST_OPTIONS = 10;
const MAX_STAY_NIGHTS = 30; // Tiêu chuẩn OTA: đặt trực tuyến tối đa 30 đêm
const MAX_ADVANCE_BOOKING_DAYS = 365; // Đặt phòng trước tối đa 365 ngày (1 năm)
const MAX_ROOMS_PER_BOOKING = 8; // Tối đa 8 phòng/lần đặt (trên 8 phòng tính là khách đoàn)
const MAX_BOOKING_PAGE_SIZE = 50;
const MAX_BOOKING_SEARCH_LENGTH = 200;
const BOOKING_LIST_STATUSES = new Set(['all', 'upcoming', 'completed', 'cancelled']);
const BOOKING_LIST_TIME_RANGES = new Set([
  'all',
  'last_30_days',
  'last_90_days',
  'this_month',
  'last_month',
  'this_year',
]);
const BOOKING_DATE_CHANGE_FIELDS = new Set([
  'check_in_date',
  'check_out_date',
  'confirm_coupon_removal',
]);

const BOOKING_PAYLOAD_FIELDS = new Set([
  'hotel_id',
  'rooms',
  'room_type_id',
  'quantity',
  'check_in_date',
  'check_out_date',
  'guest_name',
  'guest_phone',
  'special_request',
  'special_request_options',
  'estimated_arrival_time',
  'coupon_code',
]);
const GUEST_INFO_FIELDS = new Set(['guest_name', 'guest_phone', 'special_request']);

const GUEST_NAME_REGEX = /^\p{L}[\p{L}\p{M}]*(?:(?:\p{Zs}+|['\u2019.-])\p{L}[\p{L}\p{M}]*)*$/u;

const isValidGuestName = (name) => {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length > MAX_GUEST_NAME_LENGTH || !GUEST_NAME_REGEX.test(trimmed)) return false;
  return (trimmed.match(/\p{L}/gu) || []).length >= 2;
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const getUnexpectedFields = (body, allowedFields) => (
  Object.keys(body).filter((field) => !allowedFields.has(field))
);

const isIdentifier = (value) => (
  (typeof value === 'string' && value.trim().length > 0) ||
  (typeof value === 'number' && Number.isFinite(value) && value > 0)
);

const parseDateOnly = (value) => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
};

const getTodayInVietnam = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
};

const normalizeGuestPhone = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  // Nếu là số quốc tế bắt đầu bằng '+' (không phải +84)
  if (trimmed.startsWith('+') && !trimmed.startsWith('+84')) {
    const cleanIntl = '+' + trimmed.slice(1).replace(/\D/g, '');
    return cleanIntl;
  }

  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('84')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');

  return digits ? `0${digits}` : '';
};

const isValidGuestPhone = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  // Chặn chuỗi chứa chữ cái hoặc ký tự bất thường không phải định dạng số điện thoại
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return false;

  const normalized = normalizeGuestPhone(value);
  // Hỗ trợ số điện thoại Việt Nam (0xxxxxxxxx, 10-11 số) hoặc số quốc tế chuẩn (+[mã quốc gia][số], 8-15 số)
  return /^0\d{9,10}$/.test(normalized) || /^\+[1-9]\d{7,14}$/.test(normalized);
};

const validateStayDates = (checkInValue, checkOutValue, { allowPast = false } = {}) => {
  const errors = [];
  const checkIn = parseDateOnly(checkInValue);
  const checkOut = parseDateOnly(checkOutValue);

  if (!checkIn) {
    errors.push('Ngày nhận phòng phải đúng định dạng YYYY-MM-DD và là ngày hợp lệ.');
  }
  if (!checkOut) {
    errors.push('Ngày trả phòng phải đúng định dạng YYYY-MM-DD và là ngày hợp lệ.');
  }

  const todayStr = getTodayInVietnam();
  if (!allowPast && checkIn && checkIn < todayStr) {
    errors.push('Không được đặt phòng với ngày nhận phòng ở quá khứ.');
  }

  if (checkIn && checkOut) {
    if (checkOut <= checkIn) {
      errors.push('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
    } else {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const stayNights = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
      if (stayNights > MAX_STAY_NIGHTS) {
        errors.push(`Thời gian lưu trú tối đa cho mỗi đơn đặt phòng trực tuyến là ${MAX_STAY_NIGHTS} đêm. Vui lòng liên hệ để đặt phòng dài hạn.`);
      }
    }
  }

  if (checkIn) {
    const inDate = new Date(checkIn);
    const todayDate = new Date(todayStr);
    const advanceDays = Math.round((inDate - todayDate) / (1000 * 60 * 60 * 24));
    if (advanceDays > MAX_ADVANCE_BOOKING_DAYS) {
      errors.push(`Chỉ hỗ trợ đặt phòng trước tối đa ${MAX_ADVANCE_BOOKING_DAYS} ngày.`);
    }
  }

  return errors;
};

const getRequestedRooms = (body) => {
  if (Array.isArray(body.rooms) && body.rooms.length > 0) return body.rooms;
  if (isIdentifier(body.room_type_id)) {
    return [{ room_type_id: body.room_type_id, quantity: body.quantity ?? 1 }];
  }
  return [];
};

const validateRoomSelection = (body, errors) => {
  const rooms = getRequestedRooms(body);
  if (rooms.length === 0) {
    errors.push('Vui lòng chọn ít nhất 1 hạng phòng để đặt.');
    return;
  }

  let totalRooms = 0;
  rooms.forEach((room, index) => {
    if (!isObject(room) || !isIdentifier(room.room_type_id)) {
      errors.push(`Hạng phòng thứ ${index + 1} không hợp lệ.`);
      return;
    }
    if (Object.keys(room).some((field) => field !== 'room_type_id' && field !== 'quantity')) {
      errors.push(`Hạng phòng thứ ${index + 1} chứa trường không được hỗ trợ.`);
    }

    const quantity = typeof room.quantity === 'number'
      ? room.quantity
      : typeof room.quantity === 'string' && /^\d+$/.test(room.quantity.trim())
        ? Number(room.quantity)
        : NaN;
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      errors.push(`Số lượng phòng thứ ${index + 1} phải là số nguyên dương.`);
    } else {
      totalRooms += quantity;
    }
  });

  if (totalRooms > MAX_ROOMS_PER_BOOKING) {
    errors.push(`Số lượng phòng tối đa cho mỗi đơn đặt phòng trực tuyến là ${MAX_ROOMS_PER_BOOKING} phòng. Để đặt số lượng lớn hơn, vui lòng liên hệ dịch vụ khách đoàn.`);
  }
};

const validateBookingSelection = (body) => {
  const errors = [];
  if (!isObject(body)) {
    return { isValid: false, errors: ['Dữ liệu đặt phòng không hợp lệ.'] };
  }

  if (!isIdentifier(body.hotel_id)) {
    errors.push('hotel_id là bắt buộc.');
  }

  errors.push(...validateStayDates(body.check_in_date, body.check_out_date));
  validateRoomSelection(body, errors);

  return { isValid: errors.length === 0, errors };
};

const validateBookingPayload = (body) => {
  const { errors } = validateBookingSelection(body);

  if (!isObject(body)) {
    return { isValid: false, errors };
  }

  const unexpectedFields = getUnexpectedFields(body, BOOKING_PAYLOAD_FIELDS);
  if (unexpectedFields.length > 0) {
    errors.push(`Các trường không được hỗ trợ: ${unexpectedFields.join(', ')}.`);
  }

  if (typeof body.guest_name !== 'string' || !body.guest_name.trim()) {
    errors.push('Họ và tên người nhận phòng là bắt buộc.');
  } else if (!isValidGuestName(body.guest_name)) {
    errors.push(`Họ và tên người nhận phòng phải có ít nhất 2 chữ cái, tối đa ${MAX_GUEST_NAME_LENGTH} ký tự; chỉ dùng chữ cái, khoảng trắng, dấu nháy đơn, dấu gạch nối hoặc dấu chấm.`);
  }

  if (!isValidGuestPhone(body.guest_phone)) {
    errors.push('Số điện thoại liên hệ không hợp lệ.');
  }

  if (
    body.special_request !== undefined &&
    body.special_request !== null &&
    (typeof body.special_request !== 'string' || body.special_request.length > MAX_SPECIAL_REQUEST_LENGTH)
  ) {
    errors.push(`Yêu cầu đặc biệt phải là văn bản tối đa ${MAX_SPECIAL_REQUEST_LENGTH} ký tự.`);
  }
  if (
    body.special_request_options !== undefined &&
    (!Array.isArray(body.special_request_options) ||
      body.special_request_options.length > MAX_SPECIAL_REQUEST_OPTIONS ||
      body.special_request_options.some((option) => (
        typeof option !== 'string' ||
        !option.trim() ||
        option.length > MAX_SPECIAL_REQUEST_OPTION_LENGTH
      )))
  ) {
    errors.push('Các yêu cầu đặc biệt đã chọn không hợp lệ.');
  }
  if (
    body.estimated_arrival_time !== undefined &&
    (typeof body.estimated_arrival_time !== 'string' ||
      body.estimated_arrival_time.trim().length > 50)
  ) {
    errors.push('Thời gian đến dự kiến không hợp lệ.');
  }
  if (
    body.coupon_code !== undefined &&
    body.coupon_code !== null &&
    (typeof body.coupon_code !== 'string' || body.coupon_code.trim().length > 50)
  ) {
    errors.push('Mã giảm giá không hợp lệ.');
  }

  return { isValid: errors.length === 0, errors };
};

const validateGuestInfoPayload = (body) => {
  const errors = [];
  if (!isObject(body)) {
    return { isValid: false, errors: ['Dữ liệu cập nhật thông tin khách không hợp lệ.'] };
  }

  const fields = [...GUEST_INFO_FIELDS];
  const unexpectedFields = getUnexpectedFields(body, GUEST_INFO_FIELDS);
  if (unexpectedFields.length > 0) {
    errors.push(`Các trường không được phép cập nhật: ${unexpectedFields.join(', ')}.`);
  }

  if (!fields.some((field) => body[field] !== undefined)) {
    errors.push('Vui lòng cung cấp ít nhất một thông tin cần cập nhật.');
  }

  if (body.guest_name !== undefined) {
    if (typeof body.guest_name !== 'string' || !body.guest_name.trim()) {
      errors.push('Họ và tên người nhận phòng không được để trống.');
    } else if (!isValidGuestName(body.guest_name)) {
      errors.push(`Họ và tên người nhận phòng phải có ít nhất 2 chữ cái, tối đa ${MAX_GUEST_NAME_LENGTH} ký tự; chỉ dùng chữ cái, khoảng trắng, dấu nháy đơn, dấu gạch nối hoặc dấu chấm.`);
    }
  }

  if (body.guest_phone !== undefined && !isValidGuestPhone(body.guest_phone)) {
    errors.push('Số điện thoại liên hệ không hợp lệ.');
  }

  if (
    body.special_request !== undefined &&
    body.special_request !== null &&
    (typeof body.special_request !== 'string' || body.special_request.length > MAX_SPECIAL_REQUEST_LENGTH)
  ) {
    errors.push(`Yêu cầu đặc biệt phải là văn bản tối đa ${MAX_SPECIAL_REQUEST_LENGTH} ký tự.`);
  }

  return { isValid: errors.length === 0, errors };
};

const validateBookingDateChangePayload = (body) => {
  if (!isObject(body)) {
    return { isValid: false, errors: ['Dữ liệu đổi ngày lưu trú không hợp lệ.'] };
  }

  const errors = [];
  const unexpectedFields = getUnexpectedFields(body, BOOKING_DATE_CHANGE_FIELDS);
  if (unexpectedFields.length > 0) {
    errors.push(`Các trường không được hỗ trợ khi đổi ngày: ${unexpectedFields.join(', ')}.`);
  }

  errors.push(...validateStayDates(body.check_in_date, body.check_out_date));
  if (
    body.confirm_coupon_removal !== undefined &&
    typeof body.confirm_coupon_removal !== 'boolean'
  ) {
    errors.push('Xác nhận gỡ coupon phải là true hoặc false.');
  }

  return { isValid: errors.length === 0, errors };
};

const validateBookingListQuery = (query) => {
  const errors = [];
  let search = '';
  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      errors.push('search phải là văn bản.');
    } else if (query.search.trim().length > MAX_BOOKING_SEARCH_LENGTH) {
      errors.push(`search không được vượt quá ${MAX_BOOKING_SEARCH_LENGTH} ký tự.`);
    } else {
      search = query.search.trim();
    }
  }

  let status = 'all';
  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !BOOKING_LIST_STATUSES.has(query.status)) {
      errors.push('status không hợp lệ.');
    } else {
      status = query.status;
    }
  }

  let timeRange = 'all';
  if (query.timeRange !== undefined) {
    if (
      typeof query.timeRange !== 'string' ||
      (!BOOKING_LIST_TIME_RANGES.has(query.timeRange) && !/^\d{4}$/.test(query.timeRange))
    ) {
      errors.push('timeRange không hợp lệ.');
    } else {
      timeRange = query.timeRange;
    }
  }

  const parsePositiveInteger = (value, field, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      errors.push(`${field} phải là số nguyên dương.`);
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > maximum) {
      errors.push(`${field} vượt quá giới hạn cho phép.`);
      return fallback;
    }
    return parsed;
  };

  const page = parsePositiveInteger(query.page, 'page', 1);
  const limit = parsePositiveInteger(query.limit, 'limit', 20, MAX_BOOKING_PAGE_SIZE);
  if (!Number.isSafeInteger((page - 1) * limit)) {
    errors.push('page vượt quá giới hạn cho phép.');
  }

  let requireVatOnly = false;
  if (query.requireVatOnly !== undefined) {
    if (query.requireVatOnly !== 'true' && query.requireVatOnly !== 'false') {
      errors.push('requireVatOnly phải là true hoặc false.');
    } else {
      requireVatOnly = query.requireVatOnly === 'true';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    page,
    limit,
    requireVatOnly,
    search,
    status,
    timeRange,
  };
};

const normalizeSpecialRequest = (value) => (
  value === null || value === undefined ? null : String(value).trim()
);

module.exports = {
  isValidGuestPhone,
  normalizeSpecialRequest,
  normalizeGuestPhone,
  validateBookingPayload,
  validateBookingDateChangePayload,
  validateBookingListQuery,
  validateBookingSelection,
  validateGuestInfoPayload,
  validateStayDates,
};
