'use strict';

const hotelService = require('./hotel.service');
const { sendSuccess } = require('../../utils/responseHelper');

/**
 * Controller for hotel queries and search listings.
 */

/**
 * GET /api/hotels
 * Search and filter hotels based on query params.
 */
const handleSearchHotels = async (req, res, next) => {
  try {
    const {
      destination,
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
      minPrice,
      maxPrice,
      starRatings,
      minScore,
      facilities,
      onlyAvailable,
      sortBy,
    } = req.query;

    const parsedStarRatings = starRatings
      ? (Array.isArray(starRatings) ? starRatings : starRatings.split(',')).map(Number).filter(Boolean)
      : [];

    const parsedFacilities = facilities
      ? (Array.isArray(facilities) ? facilities : facilities.split(',')).map((f) => f.trim()).filter(Boolean)
      : [];

    const params = {
      destination: destination || '',
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      adults: adults ? parseInt(adults, 10) : 2,
      children: children ? parseInt(children, 10) : 0,
      rooms: rooms ? parseInt(rooms, 10) : 1,
      minPrice: minPrice !== undefined ? Number(minPrice) : null,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : null,
      starRatings: parsedStarRatings,
      minScore: minScore !== undefined ? Number(minScore) : null,
      facilities: parsedFacilities,
      onlyAvailable: onlyAvailable === 'true' || onlyAvailable === true,
      sortBy: sortBy || 'popularity',
    };

    const result = await hotelService.searchHotels(params);

    return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hotels/:id
 * Retrieve detailed hotel data including rooms, inventory, amenities and reviews.
 */
const handleGetHotelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, adults, children, rooms } = req.query;

    const hotel = await hotelService.getHotelById(id, {
      checkIn,
      checkOut,
      adults: adults ? parseInt(adults, 10) : 2,
      children: children ? parseInt(children, 10) : 0,
      rooms: rooms ? parseInt(rooms, 10) : 1,
    });

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy thông tin khách sạn',
      });
    }

    return sendSuccess(res, 200, 'Lấy thông tin chi tiết khách sạn thành công', hotel);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleSearchHotels,
  handleGetHotelById,
};
