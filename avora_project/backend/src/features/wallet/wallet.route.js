'use strict';

const { Router } = require('express');
const {
  handleGetBanks,
  handleGetHotels,
  handleGetHotelWallet,
  handleLinkBankAccount,
} = require('./wallet.controller');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');

const router = Router();

// Strictly Vendor-only (VEN), enforced server-side.
router.use('/wallet', authenticate, requireRole('VEN'));

// GET /api/wallet/banks
router.get('/wallet/banks', handleGetBanks);

// GET /api/wallet/hotels
router.get('/wallet/hotels', handleGetHotels);

// GET /api/wallet/hotels/:hotelId
router.get('/wallet/hotels/:hotelId', handleGetHotelWallet);

// POST /api/wallet/hotels/:hotelId/bank-account
router.post('/wallet/hotels/:hotelId/bank-account', handleLinkBankAccount);

module.exports = router;

