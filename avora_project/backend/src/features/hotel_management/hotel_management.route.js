'use strict';

const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { authorizeHotelManagement } = require('../../common/middlewares/hotelManagementAuthMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const hotelController = require('./hotel_management.controller');
const vendorBookingController = require('./vendor_booking.controller');
const {
	bookingsQuerySchema,
	bookingParamsSchema,
	cancelBookingBodySchema,
	changeDatesBodySchema,
	changeRoomTypeBodySchema,
} = require('./vendor_booking.validation');
const {
	hotelIdParamsSchema,
	hotelImageParamsSchema,
	hotelListQuerySchema,
	createHotelSchema,
	updateHotelSchema,
} = require('./dtos/hotel.dto');

const router = Router();
const protectHotelManagement = [authenticate, authorizeHotelManagement];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const requireVendor = (req, res, next) => {
	if (!req.hotelAccess?.isVendor) {
		return res.status(403).json({ status: 'error', message: 'Chỉ Nhà cung cấp mới có thể quản lý đặt phòng khách sạn.' });
	}
	return next();
};

router.get('/hotels', ...protectHotelManagement, validateRequest({ query: hotelListQuerySchema }), hotelController.getHotels);
router.get('/hotels/:id/bookings', ...protectHotelManagement, requireVendor, validateRequest({ params: hotelIdParamsSchema, query: bookingsQuerySchema }), vendorBookingController.getBookings);
router.post('/hotels/:id/bookings/:bookingId/cancel', ...protectHotelManagement, requireVendor, validateRequest({ params: bookingParamsSchema, body: cancelBookingBodySchema }), vendorBookingController.cancelBooking);
router.patch('/hotels/:id/bookings/:bookingId/dates', ...protectHotelManagement, requireVendor, validateRequest({ params: bookingParamsSchema, body: changeDatesBodySchema }), vendorBookingController.changeDates);
router.patch('/hotels/:id/bookings/:bookingId/room-type', ...protectHotelManagement, requireVendor, validateRequest({ params: bookingParamsSchema, body: changeRoomTypeBodySchema }), vendorBookingController.changeRoomType);
router.get('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.getHotel);
router.post('/hotels', ...protectHotelManagement, validateRequest({ body: createHotelSchema }), hotelController.createHotel);
router.put('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema, body: updateHotelSchema }), hotelController.updateHotel);
router.post('/hotels/:id/approve', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.approveHotel);
router.delete('/hotels/:id', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), hotelController.deleteHotel);
router.post('/hotels/:id/images', ...protectHotelManagement, validateRequest({ params: hotelIdParamsSchema }), upload.single('image'), hotelController.uploadHotelImage);
router.delete('/hotels/:id/images/:imageId', ...protectHotelManagement, validateRequest({ params: hotelImageParamsSchema }), hotelController.deleteHotelImage);
router.post('/hotels/:id/images/:imageId/thumbnail', ...protectHotelManagement, validateRequest({ params: hotelImageParamsSchema }), hotelController.setHotelImageThumbnail);

module.exports = router;
