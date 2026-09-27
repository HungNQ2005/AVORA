'use strict';

const { Router } = require('express');
const {
  handleGetRoomTypes,
  handleGetRoomTypeById,
  handleGetHotels,
  handleGetFacilities,
  handleCreateRoomType,
  handleUpdateRoomType,
  handleSoftDeleteRoomType,
} = require('./room_type.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { requireVenueManager } = require('../../common/middlewares/venueManagerAuthorization');

const router = Router();

router.use('/room-types', authenticate, requireVenueManager);
router.use('/hotels', authenticate, requireVenueManager);

// GET /api/room-types
router.get('/room-types', handleGetRoomTypes);

// GET /api/room-types/:id
router.get('/room-types/:id', handleGetRoomTypeById);

// POST /api/room-types
router.post('/room-types', handleCreateRoomType);

// PATCH /api/room-types/:id
router.patch('/room-types/:id', handleUpdateRoomType);

// DELETE /api/room-types/:id (soft delete)
router.delete('/room-types/:id', handleSoftDeleteRoomType);

// GET /api/hotels
router.get('/hotels', handleGetHotels);

// GET /api/facilities
router.get('/facilities', authenticate, requireVenueManager, handleGetFacilities);

module.exports = router;
