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

const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getMyReviews(req.user.user_id);
    return sendSuccess(res, 200, 'Lấy lịch sử đánh giá thành công.', reviews);
  } catch (error) {
    return next(error);
  }
};

const getAdminReviews = async (_req, res, next) => {
  try {
    const reviews = await reviewService.getAdminReviews();
    return sendSuccess(res, 200, 'Lấy danh sách đánh giá hệ thống thành công.', reviews);
  } catch (error) {
    return next(error);
  }
};

const getMyReviewRemovalNotifications = async (req, res, next) => {
  try {
    const notifications = await reviewService.getMyReviewRemovalNotifications(req.user.user_id);
    return sendSuccess(res, 200, 'Lấy thông báo thành công.', notifications);
  } catch (error) {
    return next(error);
  }
};

const adminSoftDeleteReview = async (req, res, next) => {
  try {
    const result = await reviewService.adminSoftDeleteReview(req.params.reviewId, req.user.user_id, req.body, req.ip);
    return sendSuccess(res, 200, 'Đánh giá đã được ẩn khỏi hệ thống.', result);
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
    const data = await reviewService.deleteReview(req.user.user_id, req.params.reviewId, req.body, req.ip);
    return sendSuccess(res, 200, 'Xóa đánh giá thành công.', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHotelReviews,
  getMyReviews,
  getAdminReviews,
  getMyReviewRemovalNotifications,
  adminSoftDeleteReview,
  getBookingReview,
  createReview,
  updateReview,
  deleteReview,
};