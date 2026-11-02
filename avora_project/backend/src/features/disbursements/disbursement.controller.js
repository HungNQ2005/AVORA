'use strict';

const disbursementService = require('./disbursement.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/vendor/disbursements/overview
 * Lấy số dư ví thực tế và thông tin khách sạn của vendor
 */
const getVendorOverview = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const requestedHotelId = req.query.hotel_id;
    const overview = await disbursementService.getVendorOverview(userId, requestedHotelId);
    return sendSuccess(res, 200, 'Lấy thông tin ví và số dư thành công.', overview);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vendor/disbursements/history
 * Lấy lịch sử yêu cầu giải ngân của vendor
 */
const getVendorHistory = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const hotelId = req.query.hotel_id;
    const history = await disbursementService.getVendorHistory(userId, hotelId);
    return sendSuccess(res, 200, 'Lấy lịch sử yêu cầu giải ngân thành công.', history);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vendor/disbursements/request
 * Vendor tạo yêu cầu giải ngân mới
 */
const createDisbursementRequest = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { hotel_id, amount, bank_account_id } = req.body;

    if (!hotel_id) {
      return sendError(res, 400, 'Thiếu thông tin khách sạn (hotel_id).');
    }
    if (!amount) {
      return sendError(res, 400, 'Vui lòng nhập số tiền giải ngân.');
    }
    if (!bank_account_id) {
      return sendError(res, 400, 'Vui lòng chọn tài khoản ngân hàng thụ hưởng.');
    }

    const result = await disbursementService.createVendorDisbursementRequest(userId, {
      hotel_id,
      amount,
      bank_account_id,
    });

    return sendSuccess(res, 201, 'Tạo yêu cầu giải ngân thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/disbursements
 * Business Manager: Lấy danh sách giải ngân kèm bộ lọc & thống kê
 */
const getBusinessDisbursements = async (req, res, next) => {
  try {
    const { status, search, page, limit } = req.query;
    const result = await disbursementService.getBusinessDisbursements({
      status,
      search,
      page,
      pageSize: limit,
    });
    return sendSuccess(res, 200, 'Lấy danh sách yêu cầu giải ngân thành công.', result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business/disbursements/:id/approve
 * Business Manager duyệt yêu cầu (PND -> APR / Pending Payment)
 */
const approveDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.user_id;

    if (!id) {
      return sendError(res, 400, 'Thiếu mã yêu cầu giải ngân.');
    }

    const result = await disbursementService.approveDisbursement(id, adminUserId);
    return sendSuccess(
      res,
      200,
      'Phê duyệt yêu cầu giải ngân thành công! Đã tự động chuyển sang Chờ thanh toán.',
      result
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business/disbursements/:id/settle
 * Business Manager / Kế toán thực hiện chi trả & quyết toán (APR -> CMP / Settled)
 */
const settleDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.user_id;
    const { gateway_transaction_ref, note } = req.body;

    if (!id) {
      return sendError(res, 400, 'Thiếu mã yêu cầu giải ngân.');
    }

    const result = await disbursementService.settleDisbursement(id, adminUserId, {
      gateway_transaction_ref,
      note,
    });

    return sendSuccess(
      res,
      200,
      'Xác nhận chi trả & quyết toán giải ngân thành công!',
      result
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business/disbursements/:id/reject
 * Business Manager từ chối yêu cầu (PND -> REJ, hoàn tiền về ví)
 */
const rejectDisbursement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.user_id;
    const { reason } = req.body;

    if (!id) {
      return sendError(res, 400, 'Thiếu mã yêu cầu giải ngân.');
    }

    const result = await disbursementService.rejectDisbursement(id, adminUserId, { reason });
    return sendSuccess(
      res,
      200,
      'Đã từ chối yêu cầu giải ngân và hoàn lại số dư ví cho khách sạn.',
      result
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVendorOverview,
  getVendorHistory,
  createDisbursementRequest,
  getBusinessDisbursements,
  approveDisbursement,
  settleDisbursement,
  rejectDisbursement,
};

