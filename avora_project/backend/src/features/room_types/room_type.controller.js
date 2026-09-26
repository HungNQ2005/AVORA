'use strict';

const {
  getRoomTypes,
  getRoomTypeById,
  getHotels,
  getFacilities,
  createRoomType,
  updateRoomType,
  softDeleteRoomType,
} = require('./room_type.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const editableFields = [
  'hotel_id',
  'type_name',
  'max_adults',
  'max_children',
  'bed_type',
  'room_size',
  'default_price',
  'is_deleted',
  'facility_ids',
];
const requiredFields = ['type_name', 'max_adults', 'max_children', 'default_price', 'bed_type'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bedTypePattern = /^\d+\s*x\s*(Single Bed|Double Bed|Queen Size Bed|King Size Bed|Super King Size Bed|Triple Bed|Twin Bed)$/i;

const validateRoomTypePayload = (body, isPartial = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Dữ liệu hạng phòng không hợp lệ.' };
  }

  const unsupportedFields = Object.keys(body).filter((field) => !editableFields.includes(field));
  if (unsupportedFields.length > 0) {
    return { error: `Trường dữ liệu không được hỗ trợ: ${unsupportedFields.join(', ')}.` };
  }

  if (!isPartial) {
    const missingFields = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null
    );
    if (missingFields.length > 0) {
      return { error: `Vui lòng cung cấp đầy đủ thông tin bắt buộc: ${missingFields.join(', ')}.` };
    }
  }

  const payload = {};
  Object.entries(body).forEach(([field, value]) => {
    if (field === 'type_name') {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) {
        payload.error = 'Tên hạng phòng phải có từ 1 đến 255 ký tự.';
      } else {
        payload.type_name = value.trim();
      }
      return;
    }

    if (field === 'hotel_id') {
      if (value !== null && (typeof value !== 'string' || !uuidPattern.test(value))) {
        payload.error = 'Mã khách sạn không hợp lệ.';
      } else {
        payload.hotel_id = value;
      }
      return;
    }

    if (field === 'max_adults' || field === 'max_children') {
      const minValue = field === 'max_adults' ? 1 : 0;
      if (!Number.isInteger(value) || value < minValue) {
        payload.error = field === 'max_adults'
          ? 'Số người lớn phải là số nguyên lớn hơn 0.'
          : 'Số trẻ em phải là số nguyên không âm.';
      } else {
        payload[field] = value;
      }
      return;
    }

    if (field === 'default_price') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        payload.error = 'Giá niêm yết phải là số không âm.';
      } else {
        payload.default_price = value;
      }
      return;
    }

    if (field === 'bed_type' || field === 'room_size') {
      if (field === 'bed_type') {
        const trimmedValue = typeof value === 'string' ? value.trim() : '';
        const bedTypeMatch = trimmedValue.match(bedTypePattern);
        const bedCount = bedTypeMatch ? Number(trimmedValue.match(/^\d+/)[0]) : 0;
        if (
          !bedTypeMatch
          || trimmedValue.length > 100
          || !Number.isSafeInteger(bedCount)
          || bedCount < 1
        ) {
          payload.error = 'Loại giường phải có số lượng từ 1 trở lên và thuộc danh sách loại giường cho phép.';
        } else {
          payload[field] = trimmedValue;
        }
        return;
      }

      if (value !== null && (typeof value !== 'string' || value.length > 50)) {
        payload.error = 'Diện tích phòng không được vượt quá 50 ký tự.';
      } else {
        payload[field] = value;
      }
      return;
    }

    if (field === 'is_deleted') {
      if (typeof value !== 'boolean') {
        payload.error = 'Trạng thái xóa không hợp lệ.';
      } else {
        payload.is_deleted = value;
      }
      return;
    }

    if (field === 'facility_ids') {
      if (!Array.isArray(value) || value.some((facilityId) => (
        typeof facilityId !== 'string' || !uuidPattern.test(facilityId)
      ))) {
        payload.error = 'Danh sách tiện ích không hợp lệ.';
      } else {
        payload.facility_ids = [...new Set(value)];
      }
    }
  });

  if (payload.error) {
    return { error: payload.error };
  }
  if (isPartial && Object.keys(payload).length === 0) {
    return { error: 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật.' };
  }

  return { payload };
};

const validateRoomTypeId = (id) => typeof id === 'string' && uuidPattern.test(id);

/**
 * GET /api/room-types
 * Query params: hotel_id, search
 */
const handleGetRoomTypes = async (req, res, next) => {
  try {
    const { hotel_id, search, include_deleted } = req.query;
    const result = await getRoomTypes({
      hotel_id,
      search,
      include_deleted: include_deleted === 'true',
    });
    return sendSuccess(res, 200, 'Lấy danh sách hạng phòng thành công', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/room-types/:id
 */
const handleGetRoomTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateRoomTypeId(id)) {
      return sendError(res, 400, 'Mã hạng phòng không hợp lệ');
    }
    const data = await getRoomTypeById(id);
    return sendSuccess(res, 200, 'Lấy chi tiết hạng phòng thành công', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hotels
 */
const handleGetHotels = async (req, res, next) => {
  try {
    const data = await getHotels();
    return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công', data);
  } catch (error) {
    next(error);
  }
};

const handleGetFacilities = async (req, res, next) => {
  try {
    const data = await getFacilities();
    return sendSuccess(res, 200, 'Lấy danh sách tiện ích thành công', data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/room-types
 */
const handleCreateRoomType = async (req, res, next) => {
  const { payload, error } = validateRoomTypePayload(req.body);
  if (error) {
    return sendError(res, 400, error);
  }

  try {
    const data = await createRoomType(payload);
    return sendSuccess(res, 201, 'Tạo hạng phòng thành công.', data);
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/room-types/:id
 */
const handleUpdateRoomType = async (req, res, next) => {
  const { id } = req.params;
  if (!validateRoomTypeId(id)) {
    return sendError(res, 400, 'Mã hạng phòng không hợp lệ.');
  }

  const { payload, error } = validateRoomTypePayload(req.body, true);
  if (error) {
    return sendError(res, 400, error);
  }

  try {
    const data = await updateRoomType(id, payload);
    return sendSuccess(res, 200, 'Cập nhật hạng phòng thành công.', data);
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/room-types/:id (soft delete only)
 */
const handleSoftDeleteRoomType = async (req, res, next) => {
  const { id } = req.params;
  if (!validateRoomTypeId(id)) {
    return sendError(res, 400, 'Mã hạng phòng không hợp lệ.');
  }

  try {
    const data = await softDeleteRoomType(id);
    return sendSuccess(res, 200, 'Xóa hạng phòng thành công.', data);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  handleGetRoomTypes,
  handleGetRoomTypeById,
  handleGetHotels,
  handleGetFacilities,
  handleCreateRoomType,
  handleUpdateRoomType,
  handleSoftDeleteRoomType,
};
