'use strict';

const roomService = require('./room.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const getAccess = (req) => {
  const roleCode = String(req.user?.role_code_name || '').toUpperCase();
  return {
    userId: req.user.user_id,
    roleCode,
    isVendor: roleCode === 'VEN',
    isAdmin: roleCode === 'ADM',
  };
};

/** 
 * GET /api/rooms
 */
const handleGetRooms = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const filters = {
      hotel_id: req.query.hotel_id,
      room_type_id: req.query.room_type_id,
      floor: req.query.floor,
      status_cd: req.query.status_cd,
      search: req.query.search,
      include_deleted: req.query.include_deleted === 'true',
    };

    const data = await roomService.getRooms(filters, access);
    return sendSuccess(res, 200, 'Lấy danh sách buồng phòng thành công.', data);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/rooms/hotels
 */
const handleGetHotels = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const hotels = await roomService.getAccessibleHotels(access);
    return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công.', hotels);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/rooms/room-types
 */
const handleGetRoomTypes = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const hotelId = req.query.hotel_id;
    const roomTypes = await roomService.getRoomTypesForHotel(hotelId, access);
    return sendSuccess(res, 200, 'Lấy danh sách hạng phòng thành công.', roomTypes);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/rooms/:id
 */
const handleGetRoomById = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const room = await roomService.getRoomById(req.params.id, access);
    return sendSuccess(res, 200, 'Lấy thông tin buồng phòng thành công.', room);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/rooms
 */
const handleCreateRoom = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const { hotel_id, room_type_id, room_number, floor, status_cd } = req.body;
    const hasValidRoomNumber =
      (typeof room_number === 'string' && room_number.trim().length > 0) ||
      (typeof room_number === 'number' && Number.isFinite(room_number));

    if (!hotel_id || !room_type_id || !hasValidRoomNumber) {
      return sendError(res, 400, 'Vui lòng nhập đầy đủ khách sạn, hạng phòng và số phòng.');
    }

    const room = await roomService.createRoom(
      { hotel_id, room_type_id, room_number, floor, status_cd },
      access
    );
    return sendSuccess(res, 201, 'Tạo buồng phòng thành công.', room);
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/rooms/:id
 */
const handleUpdateRoom = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const room = await roomService.updateRoom(req.params.id, req.body, access);
    return sendSuccess(res, 200, 'Cập nhật buồng phòng thành công.', room);
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/rooms/:id
 */
const handleDeleteRoom = async (req, res, next) => {
  try {
    const access = getAccess(req);
    const room = await roomService.softDeleteRoom(req.params.id, access);
    return sendSuccess(res, 200, 'Đã xóa buồng phòng thành công.', room);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  handleGetRooms,
  handleGetHotels,
  handleGetRoomTypes,
  handleGetRoomById,
  handleCreateRoom,
  handleUpdateRoom,
  handleDeleteRoom,
};
