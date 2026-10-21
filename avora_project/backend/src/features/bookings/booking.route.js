'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');

const bookingErrorHandler = (err, _req, res, next) => {
  if (err.code === 'SOLD_OUT') {
    return res.status(409).json({
      status: 'error',
      message: err.message,
      data: null,
      code: 'SOLD_OUT',
    });
  }
  return next(err);
};

/**
 * Optional authentication helper:
 * Attaches user to req.user if Bearer token is present, but allows guests to proceed.
 */
// POST /api/bookings/calculate - Preview and calculate totals with coupon
router.post('/bookings/calculate', bookingController.calculatePricing);

// GET /api/bookings/my (and /bookings) - Get customer's bookings with filters & counts
router.get('/bookings/my', authenticate, bookingController.getMyBookings);
router.get('/bookings', authenticate, bookingController.getMyBookings);

// POST /api/bookings - Create new booking
router.post('/bookings', authenticate, bookingController.createBooking);

// GET /api/bookings/:id - View booking details
router.get('/bookings/:id', authenticate, bookingController.getBookingById);

// PATCH /api/bookings/:id - Update guest info (name, phone, note)
router.patch('/bookings/:id', authenticate, bookingController.updateBookingGuestInfo);

// PATCH /api/bookings/:id/dates - Change check-in / check-out dates
router.patch('/bookings/:id/dates', authenticate, bookingController.changeBookingDates);

// POST /api/bookings/:id/cancel - Cancel booking with refund
router.post('/bookings/:id/cancel', authenticate, bookingController.cancelBooking);

// GET /api/bookings/:id/voucher - Electronic voucher / E-ticket
router.get('/bookings/:id/voucher', authenticate, bookingController.getBookingVoucher);

// GET /api/bookings/:id/invoice - Electronic VAT Invoice
router.get('/bookings/:id/invoice', authenticate, bookingController.getBookingInvoice);

router.use(bookingErrorHandler);

module.exports = router;
