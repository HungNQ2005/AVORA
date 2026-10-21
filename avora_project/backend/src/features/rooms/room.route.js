'use strict';

const { Router } = require('express');
const {
  handleGetRooms,
  handleGetHotels,
  handleGetRoomTypes,
  handleGetRoomById,
  handleCreateRoom,
  handleUpdateRoom,
  handleDeleteRoom,
} = require('./room.controller');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const { sendError } = require('../../utils/responseHelper');

const router = Router();

// Only Hotel Manager (VEN) is authorized
router.use('/rooms', authenticate, requireRole('VEN'));

/**
 * Write operations (create / update / delete) for Hotel Manager (VEN).
 * Relies on req.user.role_code_name resolved by requireRole above.
 */
const requireVendorWrite = (req, res, next) => {
  if (req.user?.role_code_name !== 'VEN') {
    return sendError(res, 403, 'Bạn không có quyền chỉnh sửa buồng phòng.');
  }
  return next();
};

// GET /api/rooms/hotels
router.get('/rooms/hotels', handleGetHotels);

// GET /api/rooms/room-types?hotel_id=...
router.get('/rooms/room-types', handleGetRoomTypes);

// GET /api/rooms
router.get('/rooms', handleGetRooms);

// GET /api/rooms/:id
router.get('/rooms/:id', handleGetRoomById);

// POST /api/rooms
router.post('/rooms', requireVendorWrite, handleCreateRoom);

// PATCH & PUT /api/rooms/:id
router.patch('/rooms/:id', requireVendorWrite, handleUpdateRoom);
router.put('/rooms/:id', requireVendorWrite, handleUpdateRoom);
// DELETE /api/rooms/:id
router.delete('/rooms/:id', requireVendorWrite, handleDeleteRoom);

module.exports = router;
