'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { verifyJwt } = require('../../utils/tokenHelper');
const { authenticate } = require('../../common/middlewares/authMiddleware');

/**
 * Optional authentication helper:
 * Attaches user to req.user if Bearer token is present, but allows guests to proceed.
 */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyJwt(token);
      req.user = decoded;
    } catch {
      // Ignore token failure for public booking creation
    }
  }
  next();
};

// POST /api/bookings/calculate - Preview and calculate totals with coupon
router.post('/bookings/calculate', bookingController.calculatePricing);

// GET /api/bookings/my (and /bookings) - Get customer's bookings with filters & counts
router.get('/bookings/my', optionalAuth, bookingController.getMyBookings);
router.get('/bookings', optionalAuth, bookingController.getMyBookings);

// POST /api/bookings - Create new booking
router.post('/bookings', authenticate, bookingController.createBooking);

// GET /api/bookings/:id - View booking details
router.get('/bookings/:id', optionalAuth, bookingController.getBookingById);

// PATCH /api/bookings/:id - Update guest info (name, phone, note)
router.patch('/bookings/:id', optionalAuth, bookingController.updateBookingGuestInfo);

// PATCH /api/bookings/:id/dates - Change check-in / check-out dates
router.patch('/bookings/:id/dates', optionalAuth, bookingController.changeBookingDates);

// POST /api/bookings/:id/cancel - Cancel booking with refund
router.post('/bookings/:id/cancel', optionalAuth, bookingController.cancelBooking);

// GET /api/bookings/:id/voucher - Electronic voucher / E-ticket
router.get('/bookings/:id/voucher', optionalAuth, bookingController.getBookingVoucher);

// GET /api/bookings/:id/invoice - Electronic VAT Invoice
router.get('/bookings/:id/invoice', optionalAuth, bookingController.getBookingInvoice);

module.exports = router;
