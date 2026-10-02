'use strict';

const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { authorizeHotelManagement } = require('../../common/middlewares/hotelManagementAuthMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const hotelController = require('./hotel_management.controller');
const {
	hotelIdParamsSchema,
	hotelImageParamsSchema,
	hotelListQuerySchema,
	createHotelSchema,
	updateHotelSchema,
} = require('./dtos/hotel.dto');

const router = Router();
const protectHotelManagement = [authenticate, authorizeHotelManagement];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/hotels', ...protectHotelManagement, validateRequest({ query: hotelListQuerySchema }), hotelController.getHotels);
router.get('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.getHotel);
router.post('/hotels', ...protectHotelManagement, validateRequest({ body: createHotelSchema }), hotelController.createHotel);
router.put('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema, body: updateHotelSchema }), hotelController.updateHotel);
router.post('/hotels/:id/approve', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.approveHotel);
router.delete('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.deleteHotel);
router.post('/hotels/:id/images', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), upload.single('image'), hotelController.uploadHotelImage);
router.delete('/hotels/:id/images/:imageId', ...protectHotelManagement, validateRequest({ params: hotelImageParamsSchema }), hotelController.deleteHotelImage);
router.post('/hotels/:id/images/:imageId/thumbnail', ...protectHotelManagement, validateRequest({ params: hotelImageParamsSchema }), hotelController.setHotelImageThumbnail);

module.exports = router;
