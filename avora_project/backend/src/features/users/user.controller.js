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

    // Không cho phép System Admin tự khóa hoặc vô hiệu hóa tài khoản của chính mình
    const statusUpper = (status || '').toUpperCase();
    if (
      String(req.user?.user_id) === String(id) &&
      ['DEACTIVATED', 'LOCKED', 'VERIFYING', 'PENDING'].includes(statusUpper)
    ) {
      return sendError(res, 400, 'Bạn không thể tự khóa hoặc đổi trạng thái tài khoản của chính mình.');
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

/**
 * POST /api/users/:id/request-role-change
 * Request user role change with Step-up Authentication check.
 * Body: { newRole: string }
 */
const handleRequestRoleChange = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!id || !newRole) {
      return sendError(res, 400, 'User ID mục tiêu và vai trò mới (newRole) là bắt buộc.');
    }

    // Security Rule: Admin cannot change their own role
    const adminId = req.user?.user_id || req.user?.id;
    if (String(adminId) === String(id)) {
      return sendError(res, 403, 'Quản trị viên không được phép tự thay đổi vai trò của chính mình.');
    }

    const result = await userService.requestRoleChange({
      adminUser: req.user,
      targetUserId: id,
      newRole,
    });

    return sendSuccess(res, 200, result.message, result);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * POST /api/users/:id/confirm-role-change
 * Confirm sensitive role change with Step-up OTP.
 * Body: { newRole: string, otpCode: string }
 */
const handleConfirmRoleChange = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newRole, otpCode } = req.body;

    if (!id || !newRole || !otpCode) {
      return sendError(res, 400, 'User ID, vai trò mới (newRole) và mã OTP (otpCode) là bắt buộc.');
    }

    // Security Rule: Admin cannot change their own role
    const adminId = req.user?.user_id || req.user?.id;
    if (String(adminId) === String(id)) {
      return sendError(res, 403, 'Quản trị viên không được phép tự thay đổi vai trò của chính mình.');
    }

    const result = await userService.confirmRoleChange({
      adminUser: req.user,
      targetUserId: id,
      newRole,
      otpCode,
    });

    return sendSuccess(res, 200, result.message, result);
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
  handleRequestRoleChange,
  handleConfirmRoleChange,
};

