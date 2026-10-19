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
} = require('./review.validation');

const router = Router();
const customerOnly = [authenticate, requireRole('CUS', 'CUSTOMER')];

router.get('/reviews/hotels/:hotelId', optionalAuthenticate, validateRequest({ params: hotelParamsSchema }), controller.getHotelReviews);
router.post('/reviews/bookings/:bookingId', ...customerOnly, validateRequest({ params: bookingParamsSchema, body: createReviewSchema }), controller.createReview);
router.put('/reviews/:reviewId', ...customerOnly, validateRequest({ params: reviewParamsSchema, body: updateReviewSchema }), controller.updateReview);
router.delete('/reviews/:reviewId', ...customerOnly, validateRequest({ params: reviewParamsSchema }), controller.deleteReview);

module.exports = router;