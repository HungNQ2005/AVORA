'use strict';

const wishlistService = require('./wishlist.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/wishlist or /api/watchlist
 * Retrieve all hotels saved in the user's WatchList.
 */
const handleGetWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return sendError(res, 401, 'Vui lòng đăng nhập để xem WatchList của bạn.');
    }

    const result = await wishlistService.getUserWishlist(userId);
    return sendSuccess(res, 200, 'Lấy danh sách WatchList thành công.', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/wishlist or /api/watchlist
 * Add a hotel to user's WatchList.
 */
const handleAddToWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const hotelId = req.body.hotel_id || req.body.hotelId;

    if (!userId) {
      return sendError(res, 401, 'Vui lòng đăng nhập để lưu chỗ nghỉ vào WatchList.');
    }
    if (!hotelId) {
      return sendError(res, 400, 'Mã khách sạn (hotel_id) là bắt buộc.');
    }

    const result = await wishlistService.addToWishlist(userId, hotelId);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/wishlist/:hotelId or /api/watchlist/:hotelId
 * Remove a hotel from user's WatchList.
 */
const handleRemoveFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { hotelId } = req.params;

    if (!userId) {
      return sendError(res, 401, 'Vui lòng đăng nhập để thực hiện thao tác này.');
    }
    if (!hotelId) {
      return sendError(res, 400, 'Mã khách sạn (hotelId) là bắt buộc.');
    }

    const result = await wishlistService.removeFromWishlist(userId, hotelId);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/wishlist/check/:hotelId
 * Check if a hotel is in the user's WatchList.
 */
const handleCheckWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { hotelId } = req.params;

    if (!userId) {
      return sendSuccess(res, 200, 'Trạng thái lưu', { isSaved: false });
    }

    const result = await wishlistService.checkWishlistStatus(userId, hotelId);
    return sendSuccess(res, 200, 'Kiểm tra trạng thái WatchList thành công.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  handleGetWishlist,
  handleAddToWishlist,
  handleRemoveFromWishlist,
  handleCheckWishlist,
};
