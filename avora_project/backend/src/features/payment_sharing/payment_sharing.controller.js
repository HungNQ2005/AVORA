'use strict';

const paymentSharingService = require('./payment_sharing.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleServiceError = (res, next, err) => {
  if (err.code) {
    return res.status(err.statusCode || 400).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
  }
  return next(err);
};

/**
 * POST /api/payment/groups
 * Trưởng nhóm tạo mới hoặc cập nhật phân bổ nhóm thanh toán cho booking_id
 */
const createOrUpdateGroup = async (req, res, next) => {
  try {
    const bookingId = String(req.body?.booking_id || '').trim();
    if (!UUID_REGEX.test(bookingId)) {
      return sendError(res, 400, 'booking_id không hợp lệ.');
    }

    const data = await paymentSharingService.createOrUpdateSharingGroup(
      bookingId,
      {
        member_count: req.body?.member_count,
        members: req.body?.members,
      },
      req.user
    );

    return sendSuccess(res, 200, 'Thiết lập nhóm thanh toán thành công.', data);
  } catch (err) {
    return handleServiceError(res, next, err);
  }
};

/**
 * GET /api/payment/groups/by-booking/:booking_id
 * Trưởng nhóm kiểm tra xem booking đã có nhóm thanh toán chưa
 */
const getGroupByBookingId = async (req, res, next) => {
  try {
    const bookingId = String(req.params.booking_id || '').trim();
    if (!UUID_REGEX.test(bookingId)) {
      return sendError(res, 400, 'booking_id không hợp lệ.');
    }

    const data = await paymentSharingService.getGroupByBookingId(bookingId, req.user);
    return sendSuccess(res, 200, 'OK', data);
  } catch (err) {
    return handleServiceError(res, next, err);
  }
};

/**
 * GET /api/payment/groups/share/:invite_hash
 * Public: bất kỳ thành viên nào có link mời đều xem được thông tin nhóm & tiến độ
 */
const getGroupByInviteHash = async (req, res, next) => {
  try {
    const inviteHash = String(req.params.invite_hash || '').trim();
    if (!inviteHash) {
      return sendError(res, 400, 'Mã mời nhóm không hợp lệ.');
    }

    const data = await paymentSharingService.getGroupByInviteHash(inviteHash);
    return sendSuccess(res, 200, 'OK', data);
  } catch (err) {
    return handleServiceError(res, next, err);
  }
};

/**
 * POST /api/payment/groups/share/:invite_hash/members/:member_id/claim
 * Public: bạn bè mở link mời cập nhật Tên + SĐT vào suất đóng tiền và lấy mã VietQR
 */
const claimMemberSlot = async (req, res, next) => {
  try {
    const inviteHash = String(req.params.invite_hash || '').trim();
    const memberId = String(req.params.member_id || '').trim();
    if (!inviteHash || !UUID_REGEX.test(memberId)) {
      return sendError(res, 400, 'Thông tin suất thanh toán không hợp lệ.');
    }

    const data = await paymentSharingService.claimMemberSlot(inviteHash, memberId, {
      member_name: req.body?.member_name,
      member_phone: req.body?.member_phone !== undefined ? req.body?.member_phone : req.body?.phone,
    });

    return sendSuccess(res, 200, 'Đã sẵn sàng mã QR thanh toán cho suất của bạn.', data);
  } catch (err) {
    return handleServiceError(res, next, err);
  }
};

/**
 * POST /api/payment/groups/:group_id/pay-remaining
 * Trưởng nhóm gộp các suất chưa thanh toán để đóng nốt phần còn thiếu trong 1 lần quét QR
 */
const createHostPayRemaining = async (req, res, next) => {
  try {
    const groupId = String(req.params.group_id || '').trim();
    if (!UUID_REGEX.test(groupId)) {
      return sendError(res, 400, 'group_id không hợp lệ.');
    }

    const data = await paymentSharingService.createHostPayRemaining(groupId, req.user);
    return sendSuccess(res, 200, 'Đã tạo mã QR cho phần tiền còn thiếu.', data);
  } catch (err) {
    return handleServiceError(res, next, err);
  }
};

module.exports = {
  createOrUpdateGroup,
  getGroupByBookingId,
  getGroupByInviteHash,
  claimMemberSlot,
  createHostPayRemaining,
};
