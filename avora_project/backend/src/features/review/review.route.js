'use strict';

const { Router } = require('express');
const { authenticate, optionalAuthenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const controller = require('./review.controller');
const {
  reviewParamsSchema,
  hotelParamsSchema,
  bookingParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  reviewDeletionReasonSchema,
} = require('./review.validation');

const router = Router();
router.get('/reviews/admin', authenticate, requireRole('ADM'), controller.getAdminReviews);
router.delete('/reviews/admin/:reviewId', authenticate, requireRole('ADM'), validateRequest({ params: reviewParamsSchema, body: reviewDeletionReasonSchema }), controller.adminSoftDeleteReview);
router.get('/reviews/my', authenticate, controller.getMyReviews);
router.get('/reviews/hotels/:hotelId', optionalAuthenticate, validateRequest({ params: hotelParamsSchema }), controller.getHotelReviews);
router.get('/reviews/bookings/:bookingId', authenticate, validateRequest({ params: bookingParamsSchema }), controller.getBookingReview);
router.post('/reviews/bookings/:bookingId', authenticate, validateRequest({ params: bookingParamsSchema, body: createReviewSchema }), controller.createReview);
router.put('/reviews/:reviewId', authenticate, validateRequest({ params: reviewParamsSchema, body: updateReviewSchema }), controller.updateReview);
router.delete('/reviews/:reviewId', authenticate, validateRequest({ params: reviewParamsSchema, body: reviewDeletionReasonSchema }), controller.deleteReview);
router.get('/reviews/notifications', authenticate, controller.getMyReviewRemovalNotifications);

module.exports = router;