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
 * Helper to extract vendorId for ownership filtering.
 * Since /api/wallet is guarded by requireRole('VEN'), any caller is a Vendor.
 */
const getVendorId = (req) => {
  const roleCd = String(req.user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const roleCodeName = String(req.user?.role_code_name || '').trim().toUpperCase();
  const isVendor = roleCodeName === 'VEN' || roleCd === '4';
  return isVendor ? req.user?.user_id : req.user?.user_id || null;
};

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
    const vendorId = getVendorId(req);
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
    const vendorId = getVendorId(req);
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
    return sendError(res, 400, 'Vui lòng chọn ngân hàng thụ hưởng.');
  }

  // 1. Strict Account Number Validation
  const trimmedAccNum = typeof account_number === 'string' ? account_number.trim() : '';
  if (!trimmedAccNum || !/^\d{6,20}$/.test(trimmedAccNum)) {
    return sendError(res, 400, 'Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số.');
  }
  if (/^(\d)\1+$/.test(trimmedAccNum)) {
    return sendError(res, 400, 'Số tài khoản không hợp lệ (không được trùng lặp toàn bộ một chữ số).');
  }

  // 2. Strict Account Holder Name Validation
  if (!account_holder || typeof account_holder !== 'string') {
    return sendError(res, 400, 'Tên chủ tài khoản là bắt buộc.');
  }

  const normalizedHolder = account_holder.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalizedHolder.length < 5 || normalizedHolder.length > 100) {
    return sendError(res, 400, 'Tên chủ tài khoản phải từ 5 đến 100 ký tự.');
  }
  if (!/^[A-Z\s]+$/.test(normalizedHolder)) {
    return sendError(res, 400, 'Tên chủ tài khoản chỉ được chứa chữ cái không dấu và khoảng trắng.');
  }

  const nameWords = normalizedHolder.split(' ').filter(Boolean);
  if (nameWords.length < 2) {
    return sendError(res, 400, 'Tên chủ tài khoản phải bao gồm cả Họ và Tên (tối thiểu 2 từ).');
  }
  if (nameWords.some((w) => w.length < 2)) {
    return sendError(res, 400, 'Mỗi từ trong tên chủ tài khoản phải có từ 2 ký tự trở lên.');
  }

  // 3. Branch Validation & Sanitization
  let sanitizedBranch = null;
  if (bank_branch && typeof bank_branch === 'string') {
    sanitizedBranch = bank_branch.replace(/<[^>]*>?/gm, '').trim();
    if (sanitizedBranch.length > 150) {
      return sendError(res, 400, 'Chi nhánh ngân hàng không được vượt quá 150 ký tự.');
    }
  }

  try {
    const vendorId = getVendorId(req);

    const account = await linkBankAccount({
      hotelId,
      vendorId,
      bankCd: bank_cd,
      binCode: bin_code,
      accountNumber: trimmedAccNum,
      accountHolder: normalizedHolder,
      bankBranch: sanitizedBranch,
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

