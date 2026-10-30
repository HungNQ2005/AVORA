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
 * Helper to check if an account number is a trivial ascending/descending sequence (e.g. 12345678, 987654321)
 */
const isSequentialDigits = (str) => {
  if (!str || str.length < 6) return false;
  const asc = '01234567890123456789';
  const desc = '98765432109876543210';
  return asc.includes(str) || desc.includes(str);
};

/**
 * Helper to validate all fields of bank account link payload
 */
const validateBankLinkPayload = (body) => {
  const { bank_cd, account_number, account_holder, bank_branch } = body || {};

  // 1. Validate bank_cd
  const trimmedBankCd = String(bank_cd ?? '').trim();
  if (!trimmedBankCd) {
    return { error: 'Vui lòng chọn ngân hàng thụ hưởng.' };
  }
  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(trimmedBankCd)) {
    return { error: 'Mã ngân hàng thụ hưởng không đúng định dạng.' };
  }

  // 2. Validate account_number
  if (typeof account_number !== 'string' && typeof account_number !== 'number') {
    return { error: 'Số tài khoản ngân hàng là bắt buộc.' };
  }
  const trimmedAccNum = String(account_number).trim();
  if (!/^\d{6,20}$/.test(trimmedAccNum)) {
    return { error: 'Số tài khoản ngân hàng phải gồm từ 6 đến 20 chữ số (không chứa chữ cái hoặc ký tự đặc biệt).' };
  }
  if (/^(\d)\1+$/.test(trimmedAccNum)) {
    return { error: 'Số tài khoản không hợp lệ (không được trùng lặp toàn bộ một chữ số).' };
  }
  if (isSequentialDigits(trimmedAccNum)) {
    return { error: 'Số tài khoản không hợp lệ (không được là dãy số tiến hoặc lùi liên tiếp).' };
  }
  if (/^0{6,}/.test(trimmedAccNum)) {
    return { error: 'Số tài khoản không hợp lệ (không được bắt đầu bằng chuỗi số 0 liên tiếp).' };
  }

  // 3. Validate account_holder
  if (!account_holder || typeof account_holder !== 'string') {
    return { error: 'Tên chủ tài khoản là bắt buộc.' };
  }
  const normalizedHolder = account_holder.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalizedHolder.length < 5 || normalizedHolder.length > 100) {
    return { error: 'Tên chủ tài khoản phải từ 5 đến 100 ký tự.' };
  }
  if (!/^[A-Z]+( [A-Z]+)+$/.test(normalizedHolder)) {
    return { error: 'Tên chủ tài khoản chỉ được chứa chữ cái in hoa không dấu (A-Z) và phải có đầy đủ Họ và Tên.' };
  }

  const nameWords = normalizedHolder.split(' ');
  if (nameWords.length < 2 || nameWords.length > 10) {
    return { error: 'Tên chủ tài khoản phải bao gồm từ 2 đến 10 từ.' };
  }
  if (nameWords.some((w) => w.length < 2 || w.length > 25)) {
    return { error: 'Mỗi từ trong tên chủ tài khoản phải dài từ 2 đến 25 ký tự.' };
  }
  if (nameWords.some((w) => /([A-Z])\1{2,}/.test(w))) {
    return { error: 'Tên chủ tài khoản không hợp lệ (chứa các ký tự lặp lại bất thường).' };
  }
  if (nameWords.some((w) => !/[AEIOUY]/.test(w))) {
    return { error: 'Tên chủ tài khoản không hợp lệ (mỗi từ phải là tên có nghĩa).' };
  }

  // 4. Validate bank_branch (optional, but strictly validated when provided)
  let sanitizedBranch = null;
  if (bank_branch !== undefined && bank_branch !== null && String(bank_branch).trim() !== '') {
    if (typeof bank_branch !== 'string') {
      return { error: 'Chi nhánh ngân hàng không hợp lệ.' };
    }
    const rawBranch = bank_branch.trim().replace(/\s+/g, ' ');
    if (/<[^>]*>/.test(rawBranch)) {
      return { error: 'Chi nhánh ngân hàng không được chứa thẻ HTML.' };
    }
    if (rawBranch.length < 3 || rawBranch.length > 150) {
      return { error: 'Tên chi nhánh ngân hàng phải từ 3 đến 150 ký tự.' };
    }
    if (!/^[\p{L}\p{N}\s.,\-/()]+$/u.test(rawBranch)) {
      return { error: 'Tên chi nhánh chỉ được chứa chữ cái, chữ số và các dấu câu cơ bản (.,-/()).' };
    }
    if ((rawBranch.match(/\p{L}/gu) || []).length < 2) {
      return { error: 'Tên chi nhánh ngân hàng phải chứa tối thiểu 2 chữ cái.' };
    }
    sanitizedBranch = rawBranch;
  }

  return {
    value: {
      bankCd: trimmedBankCd,
      accountNumber: trimmedAccNum,
      accountHolder: normalizedHolder,
      bankBranch: sanitizedBranch,
    },
  };
};

/**
 * POST /api/wallet/hotels/:hotelId/bank-account
 */
const handleLinkBankAccount = async (req, res, next) => {
  const { hotelId } = req.params;
  if (!hotelId || !uuidPattern.test(hotelId)) {
    return sendError(res, 400, 'Mã khách sạn không hợp lệ.');
  }

  const validation = validateBankLinkPayload(req.body);
  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  try {
    const vendorId = getVendorId(req);
    if (!vendorId || !uuidPattern.test(vendorId)) {
      return sendError(res, 403, 'Không xác định được danh tính chủ khách sạn (Vendor).');
    }

    const account = await linkBankAccount({
      hotelId,
      vendorId,
      ...validation.value,
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

