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

// Hotel Manager (VEN) and System Admin (ADM) are authorized to view
router.use('/rooms', authenticate, requireRole('VEN', 'ADM'));

/**
 * Write operations (create / update / delete) are restricted to Hotel Manager (VEN).
 * System Admin (ADM) has read-only access (can view, but cannot modify).
 */
const requireVendorWrite = (req, res, next) => {
  if (req.user?.role_code_name !== 'VEN') {
    return sendError(res, 403, 'Bạn không có quyền chỉnh sửa buồng phòng. Quản trị viên chỉ có quyền xem.');
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
