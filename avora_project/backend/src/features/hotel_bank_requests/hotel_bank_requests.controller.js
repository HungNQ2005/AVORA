'use strict';

const hotelBankRequestService = require('./hotel_bank_requests.service');
const { sendSuccess } = require('../../utils/responseHelper');

const send = (res, status, message, data) => sendSuccess(res, status, message, data);

const listRequests = async (req, res, next) => {
  try {
    const result = await hotelBankRequestService.listApprovedRequests(req.user, req.validated.query);
    return send(res, 200, 'Lấy danh sách yêu cầu đổi tài khoản ngân hàng thành công.', result);
  } catch (error) {
    return next(error);
  }
};

const getRequestDetail = async (req, res, next) => {
  try {
    const result = await hotelBankRequestService.getApprovedRequestDetail(req.validated.params.ticketId, req.user);
    return send(res, 200, 'Lấy chi tiết yêu cầu đổi tài khoản ngân hàng thành công.', result);
  } catch (error) {
    return next(error);
  }
};

const applyChange = async (req, res, next) => {
  try {
    const result = await hotelBankRequestService.applyBankChange(
      req.validated.params.ticketId,
      req.user,
      req.validated.body
    );
    return send(res, 200, 'Cập nhật tài khoản ngân hàng cho khách sạn thành công.', result);
  } catch (error) {
    return next(error);
  }
};

const getBanks = async (req, res, next) => {
  try {
    const result = await hotelBankRequestService.getSystemBanks(req.user);
    return send(res, 200, 'Lấy danh mục ngân hàng từ m_system_code thành công.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listRequests,
  getRequestDetail,
  applyChange,
  getBanks,
};
