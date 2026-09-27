'use strict';

const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { authorizeHotelManagement } = require('../../common/middlewares/hotelManagementAuthMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const hotelController = require('./hotel_management.controller');
const {
	hotelIdParamsSchema,
	hotelListQuerySchema,
	createHotelSchema,
	updateHotelSchema,
} = require('./dtos/hotel.dto');

const router = Router();
const protectHotelManagement = [authenticate, authorizeHotelManagement];

router.get('/hotels', ...protectHotelManagement, validateRequest({ query: hotelListQuerySchema }), hotelController.getHotels);
router.get('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.getHotel);
router.post('/hotels', ...protectHotelManagement, validateRequest({ body: createHotelSchema }), hotelController.createHotel);
router.put('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema, body: updateHotelSchema }), hotelController.updateHotel);
router.post('/hotels/:id/publish', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.publishHotel);
router.delete('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.deleteHotel);

module.exports = router;
