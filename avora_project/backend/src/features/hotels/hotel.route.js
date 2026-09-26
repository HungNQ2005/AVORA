'use strict';

const { Router } = require('express');
const { handleSearchHotels, handleGetHotelById } = require('./hotel.controller');

const router = Router();

// GET /api/hotels
router.get('/hotels', handleSearchHotels);

// GET /api/hotels/:id
router.get('/hotels/:id', handleGetHotelById);

module.exports = router;
