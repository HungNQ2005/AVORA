'use strict';

const refundRequestService = require('./refund_request.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/business/refund-requests
 * Business Manager: Lấy tổng quan Support Ticket hoàn tiền đã duyệt + Yêu cầu hoàn tiền chờ chi + Đã hoàn tiền
 */
const getBusinessRefundOverview = async (req, res, next) => {
  try {
    const { search } = req.query;
    const result = await refundRequestService.getBusinessRefundOverview({ search });
    return sendSuccess(res, 200, 'Lấy danh sách quản lý hoàn tiền thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/business/refund-requests/from-ticket/:ticketId
 * Business Manager: Tạo (hoặc gộp) yêu cầu hoàn tiền từ Support Ticket đã giải quyết (RFD + RSV)
 */
const createRefundFromTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId || !UUID_REGEX.test(ticketId)) {
      return sendError(res, 400, 'Mã Support Ticket không hợp lệ.');
    }

    const result = await refundRequestService.createRefundRequestFromTicket(
      ticketId,
      req.body || {},
      req.user
    );

    const status = result?.mode === 'MERGED_EXISTING_PND' ? 200 : 201;
    const message =
      result?.mode === 'MERGED_EXISTING_PND'
        ? 'Đã cập nhật thông tin từ Support Ticket vào yêu cầu hoàn tiền đang chờ.'
        : 'Tạo yêu cầu hoàn tiền từ Support Ticket thành công.';

    return sendSuccess(res, status, message, result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business/refund-requests/:id
 * Business Manager: Cập nhật STK nhận hoàn tiền / số tiền hoàn cho lệnh đang chờ (PND / PRO)
 */
const updateRefundRequestInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return sendError(res, 400, 'Mã yêu cầu hoàn tiền không hợp lệ.');
    }

    const result = await refundRequestService.updateRefundRequestInfo(
      id,
      req.body || {},
      req.user
    );

    return sendSuccess(res, 200, 'Cập nhật thông tin yêu cầu hoàn tiền thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/refund-requests/:id/payment-qr
 * Business Manager: Lấy VietQR (mã AVRRFxxxxxxxx) để quét chuyển khoản hoàn tiền cho khách hàng
 */
const getRefundPaymentQr = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return sendError(res, 400, 'Mã yêu cầu hoàn tiền không hợp lệ.');
    }

    const result = await refundRequestService.getRefundPaymentQr(id);
    return sendSuccess(res, 200, 'Tạo mã VietQR hoàn tiền thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/refund-requests/:id/payment-status
 * Business Manager: Polling trạng thái hoàn tiền (chờ webhook SePay chiều tiền ra AVRRFxxxxxxxx)
 */
const getRefundPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return sendError(res, 400, 'Mã yêu cầu hoàn tiền không hợp lệ.');
    }

    const result = await refundRequestService.getRefundPaymentStatus(id);
    return sendSuccess(res, 200, 'Lấy trạng thái hoàn tiền thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business/refund-requests/:id/settle
 * Business Manager: Xác nhận hoàn tiền thủ công bằng mã giao dịch ngân hàng (FT...) dự phòng
 */
const settleRefundManually = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bmrUserId = req.user?.user_id;
    if (!id || !UUID_REGEX.test(id)) {
      return sendError(res, 400, 'Mã yêu cầu hoàn tiền không hợp lệ.');
    }

    const result = await refundRequestService.settleRefundManually(id, bmrUserId, req.body || {});

    return sendSuccess(res, 200, 'Xác nhận hoàn tiền thủ công thành công.', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBusinessRefundOverview,
  createRefundFromTicket,
  updateRefundRequestInfo,
  getRefundPaymentQr,
  getRefundPaymentStatus,
  settleRefundManually,
};
