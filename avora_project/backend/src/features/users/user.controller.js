'use strict';

const userService = require('./user.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/users
 * Fetch paginated list of users with filters.
 */
const handleGetUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, status, hotel_id } = req.query;
    const result = await userService.getUsersList({
      page,
      limit,
      search,
      role,
      status,
      hotel_id,
    });
    return sendSuccess(res, 200, 'Lấy danh sách người dùng thành công.', result);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * GET /api/users/stats
 * Fetch aggregate statistics for dashboard cards & tabs.
 */
const handleGetUserStats = async (_req, res, next) => {
  try {
    const stats = await userService.getUserStats();
    return sendSuccess(res, 200, 'Lấy số liệu thống kê người dùng thành công.', stats);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * PATCH /api/users/:id/status
 * Update user account status (e.g. approve, lock, activate).
 */
const handleUpdateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return sendError(res, 400, 'User ID và trạng thái mới là bắt buộc.');
    }

    const updatedUser = await userService.updateUserStatus(id, status);
    return sendSuccess(res, 200, 'Cập nhật trạng thái người dùng thành công.', updatedUser);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

module.exports = {
  handleGetUsers,
  handleGetUserStats,
  handleUpdateUserStatus,
};
