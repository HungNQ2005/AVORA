'use strict';

const reviewService = require('./review.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getHotelReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getHotelReviews(req.params.hotelId, req.user?.user_id);
    return sendSuccess(res, 200, 'Lấy danh sách đánh giá thành công.', data);
  } catch (error) {
    return next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const data = await reviewService.createReview(req.user.user_id, req.params.bookingId, req.body);
    return sendSuccess(res, 201, 'Tạo đánh giá thành công.', data);
  } catch (error) {
    return next(error);
  }
};

const getBookingReview = async (req, res, next) => {
  try {
    const data = await reviewService.getBookingReview(req.user.user_id, req.params.bookingId);
    return sendSuccess(res, 200, 'Lấy đánh giá của đặt phòng thành công.', data);
  } catch (error) {
    return next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const data = await reviewService.updateReview(req.user.user_id, req.params.reviewId, req.body);
    return sendSuccess(res, 200, 'Cập nhật đánh giá thành công.', data);
  } catch (error) {
    return next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const data = await reviewService.deleteReview(req.user.user_id, req.params.reviewId);
    return sendSuccess(res, 200, 'Xóa đánh giá thành công.', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getHotelReviews, getBookingReview, createReview, updateReview, deleteReview };