'use strict';

const { Router } = require('express');
const { handleGetStatisticsHotels, handleGetOverview } = require('./statistics.controller');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');

const router = Router();

// Statistics dashboard: Vendor (VEN) and Admin (ADM), enforced server-side.
router.use('/statistics', authenticate, requireRole('VEN', 'ADM'));

// GET /api/statistics/hotels
router.get('/statistics/hotels', handleGetStatisticsHotels);

// GET /api/statistics/overview
router.get('/statistics/overview', handleGetOverview);

module.exports = router;
