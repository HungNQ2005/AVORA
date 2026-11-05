"use strict";

const { Router } = require("express");
const {
  handleSearchHotels,
  handleGetHotelById,
} = require("./hotel.controller");
const { optionalAuthenticate } = require('../../common/middlewares/authMiddleware');
const router = Router();

// GET /api/hotels
router.get("/hotels", handleSearchHotels);

// GET /api/hotels/:id
router.get("/hotels/:id", optionalAuthenticate, handleGetHotelById);

module.exports = router;
