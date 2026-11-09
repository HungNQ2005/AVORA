'use strict';

const crypto = require('crypto');

/** Tiền tố nội dung chuyển khoản giải ngân (khác AVORA của booking khách hàng). */
const PAYOUT_CODE_PREFIX = 'AVRWD';
const PAYOUT_CODE_REGEX = /AVRWD\d{7,9}/i;

/** Mã BIN NAPAS theo mã ngân hàng viết tắt (m_system_code.BANK_CD.code_name). */
const BANK_BIN_BY_CODE = Object.freeze({
  VCB: '970436',
  BID: '970418',
  CTG: '970415',
  VBA: '970405',
  TCB: '970407',
  MBB: '970422',
  MB: '970422',
  VPB: '970432',
  BIDV: '970418',
  ICB: '970415',
  AGR: '970405',
  ACB: '970416',
  STB: '970403',
  HDB: '970437',
  SHB: '970443',
  VIB: '970441',
  TPB: '970423',
  LPB: '970449',
  EIB: '970431',
  MSB: '970426',
  OCB: '970448',
  SSB: '970440',
  NAB: '970428',
  KLB: '970452',
});

const BIN_REGEX = /^\d{6}$/;
const ACCOUNT_NUMBER_REGEX = /^[0-9A-Za-z]{4,30}$/;

/** Sinh mã giải ngân AVRWD + 8 chữ số ngẫu nhiên (an toàn mật mã, nằm trong dải 7-9 số của SePay). */
const generatePayoutCode = () => `${PAYOUT_CODE_PREFIX}${crypto.randomInt(10000000, 100000000)}`;

/** Trích mã giải ngân từ nội dung chuyển khoản, trả về dạng in hoa hoặc null. */
const extractPayoutCode = (text) => {
  const match = String(text || '').match(PAYOUT_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
};

/**
 * Xác định mã BIN: ưu tiên bin_code lưu trong DB (nếu hợp lệ), fallback theo mã ngân hàng viết tắt.
 * @returns {string|null}
 */
const resolveBin = ({ binCode, bankShortCode }) => {
  const bin = String(binCode || '').trim();
  if (BIN_REGEX.test(bin)) return bin;
  return BANK_BIN_BY_CODE[String(bankShortCode || '').trim().toUpperCase()] || null;
};

/**
 * Dựng URL ảnh VietQR (img.vietqr.io). Mọi tham số đều được validate / encode.
 * @throws {Error} nếu BIN, số tài khoản hoặc số tiền không hợp lệ.
 */
const buildPayoutQrUrl = ({ bin, accountNumber, accountHolder, amount, paymentCode }) => {
  if (!BIN_REGEX.test(String(bin || ''))) throw new Error('Mã BIN ngân hàng không hợp lệ.');
  const account = String(accountNumber || '').trim();
  if (!ACCOUNT_NUMBER_REGEX.test(account)) throw new Error('Số tài khoản thụ hưởng không hợp lệ.');
  const numAmount = Number(amount);
  if (!Number.isInteger(numAmount) || numAmount <= 0) throw new Error('Số tiền giải ngân phải là số nguyên VND lớn hơn 0.');
  if (!PAYOUT_CODE_REGEX.test(String(paymentCode || ''))) throw new Error('Mã giải ngân không hợp lệ.');

  const params = new URLSearchParams({
    amount: String(numAmount),
    addInfo: String(paymentCode),
  });
  if (accountHolder) params.set('accountName', String(accountHolder).trim());

  return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?${params.toString()}`;
};

module.exports = {
  PAYOUT_CODE_PREFIX,
  PAYOUT_CODE_REGEX,
  BANK_BIN_BY_CODE,
  generatePayoutCode,
  extractPayoutCode,
  resolveBin,
  buildPayoutQrUrl,
};

