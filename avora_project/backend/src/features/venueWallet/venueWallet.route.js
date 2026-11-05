'use strict';

const { Router } = require('express');
const { handleGetVenueWallet } = require('./venueWallet.controller');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');

const router = Router();

// Strictly Vendor-only (VEN), enforced server-side.
router.use('/venue-wallet', authenticate, requireRole('VEN'));

// GET /api/venue-wallet/hotels/:hotelId
router.get('/venue-wallet/hotels/:hotelId', handleGetVenueWallet);

// Alias: GET /api/venue-wallet/hotels/:hotelId/transactions
router.get('/venue-wallet/hotels/:hotelId/transactions', handleGetVenueWallet);

module.exports = router;

