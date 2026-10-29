'use strict';

const {
  getSupportedBanks,
  getVendorHotels,
  getHotelWalletAndBank,
  linkBankAccount,
} = require('./wallet.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/wallet/banks
 */
const handleGetBanks = async (req, res, next) => {
  try {
    const banks = await getSupportedBanks();
    return sendSuccess(res, 200, 'Lấy danh sách ngân hàng thành công.', banks);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/wallet/hotels
 */
const handleGetHotels = async (req, res, next) => {
  try {
    const isVendor = req.user?.role_code_name === 'VEN';
    const vendorId = isVendor ? req.user?.user_id : null;
    const hotels = await getVendorHotels(vendorId);
    return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công.', hotels);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/wallet/hotels/:hotelId
 */
const handleGetHotelWallet = async (req, res, next) => {
  const { hotelId } = req.params;
  if (!hotelId || !uuidPattern.test(hotelId)) {
    return sendError(res, 400, 'Mã khách sạn không hợp lệ.');
  }

  try {
    const isVendor = req.user?.role_code_name === 'VEN';
    const vendorId = isVendor ? req.user?.user_id : null;
    const data = await getHotelWalletAndBank(hotelId, vendorId);
    return sendSuccess(res, 200, 'Lấy thông tin ví và tài khoản ngân hàng thành công.', data);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/wallet/hotels/:hotelId/bank-account
 */
const handleLinkBankAccount = async (req, res, next) => {
  const { hotelId } = req.params;
  if (!hotelId || !uuidPattern.test(hotelId)) {
    return sendError(res, 400, 'Mã khách sạn không hợp lệ.');
  }

  const { bank_cd, bin_code, account_number, account_holder, bank_branch } = req.body || {};

  if (!bank_cd) {
    return sendError(res, 400, 'Vui lòng chọn ngân hàng.');
  }
  if (!account_number || typeof account_number !== 'string' || !/^\d{6,20}$/.test(account_number.trim())) {
    return sendError(res, 400, 'Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số.');
  }
  if (!account_holder || typeof account_holder !== 'string' || account_holder.trim().length < 2) {
    return sendError(res, 400, 'Tên chủ tài khoản là bắt buộc và tối thiểu 2 ký tự.');
  }

  try {
    const isVendor = req.user?.role_code_name === 'VEN';
    const vendorId = isVendor ? req.user?.user_id : null;

    const account = await linkBankAccount({
      hotelId,
      vendorId,
      bankCd: bank_cd,
      binCode: bin_code,
      accountNumber: account_number,
      accountHolder: account_holder,
      bankBranch: bank_branch,
    });

    return sendSuccess(res, 201, 'Liên kết tài khoản ngân hàng với ví khách sạn thành công.', account);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  handleGetBanks,
  handleGetHotels,
  handleGetHotelWallet,
  handleLinkBankAccount,
};

