'use strict';

const momentService = require('./moment.service');
const { sendSuccess } = require('../../utils/responseHelper');

const listMoments = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Lấy danh sách moment thành công.', await momentService.listMoments(req.validated.query, req.user?.user_id));
  } catch (error) {
    return next(error);
  }
};

const listBannerMoments = async (_req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Lấy moment nổi bật thành công.', await momentService.listBannerMoments());
  } catch (error) {
    return next(error);
  }
};

const listAdminMoments = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Lấy danh sách Moment quản trị thành công.', await momentService.listAdminMoments(req.validated.query));
  } catch (error) {
    return next(error);
  }
};

const adminRemoveMoment = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Đã gỡ Moment khỏi cộng đồng.', await momentService.adminRemoveMoment(
      req.validated.params.id,
      req.user.user_id,
      req.validated.body.reason
    ));
  } catch (error) {
    return next(error);
  }
};

const getMoment = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Lấy chi tiết moment thành công.', await momentService.getMoment(req.validated.params.id, req.user?.user_id));
  } catch (error) {
    return next(error);
  }
};

const listEligibleBookings = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Lấy đơn đặt phòng có thể tạo moment thành công.', await momentService.listEligibleBookings(req.user.user_id));
  } catch (error) {
    return next(error);
  }
};

const createMoment = async (req, res, next) => {
  try {
    return sendSuccess(res, 201, 'Tạo moment thành công.', await momentService.createMoment(req.user.user_id, req.validated.body, req.file));
  } catch (error) {
    return next(error);
  }
};

const toggleMomentLike = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Cập nhật lượt thích thành công.', await momentService.toggleMomentLike(req.validated.params.id, req.user.user_id));
  } catch (error) {
    return next(error);
  }
};

const updateMoment = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Cập nhật moment thành công.', await momentService.updateMoment(
      req.validated.params.id,
      req.user.user_id,
      req.validated.body,
      req.file
    ));
  } catch (error) {
    return next(error);
  }
};

const setMomentVisibility = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, req.validated.body.is_deleted ? 'Đã ẩn moment.' : 'Đã hiển thị moment.', await momentService.setMomentVisibility(
      req.validated.params.id,
      req.user.user_id,
      req.validated.body.is_deleted
    ));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMoments,
  listBannerMoments,
  listAdminMoments,
  adminRemoveMoment,
  getMoment,
  listEligibleBookings,
  createMoment,
  toggleMomentLike,
  updateMoment,
  setMomentVisibility,
};
