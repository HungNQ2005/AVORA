'use strict';

const crypto = require('crypto');
const supabase = require('../../config/supabaseClient');
const env = require('../../config/env');

const PAYMENT_HOLD_MS = 10 * 60 * 1000;
const PAYMENT_CODE_PREFIX = 'AVORA';
const PAYMENT_CODE_REGEX = /AVORA\d{7,9}/i;
const WEBHOOK_TIMESTAMP_TOLERANCE_SEC = 5 * 60;
const MAX_CODE_ATTEMPTS = 5;

const createError = (message, statusCode = 500, code = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const ensureClient = () => {
  if (!supabase) throw createError('Database client is not initialized.', 503);
};

/** DB timestamps are `timestamp without time zone` stored in UTC → parse as UTC. */
const parseDbTimestamp = (val) => {
  if (!val) return null;
  let s = String(val).trim();
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) s += 'Z';
  else if (!s.includes('T') && /^\d{4}-\d{2}-\d{2} /.test(s)) s = `${s.replace(' ', 'T')}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getRemainingSeconds = (createdAt) => {
  const created = parseDbTimestamp(createdAt);
  if (!created) return 0;
  const remainingMs = created.getTime() + PAYMENT_HOLD_MS - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
};

const loadBookingStatusCodes = async () => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BOOKING_STS');
  if (error) throw createError(`Không thể tải mã trạng thái đơn: ${error.message}`);

  const byCode = new Map();
  const byName = new Map();
  (data || []).forEach((row) => {
    const name = String(row.code_name || '').trim().toUpperCase();
    const cd = String(row.code_cd || '').trim();
    byCode.set(cd, name);
    byName.set(name, cd);
  });
  return {
    nameOf: (cd) => byCode.get(String(cd || '').trim()) || String(cd || '').toUpperCase(),
    cdOf: (name) => byName.get(name),
  };
};

const loadBookingForPayment = async (bookingId, currentUser) => {
  const { data: booking, error } = await supabase
    .from('t_booking')
    .select('booking_id, user_id, hotel_id, total_amount, booking_status_cd, created_at, m_hotel(name)')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw createError(`Không thể truy vấn đơn đặt phòng: ${error.message}`);
  if (!booking) throw createError('Không tìm thấy đơn đặt phòng.', 404);
  if (String(booking.user_id) !== String(currentUser?.user_id)) {
    throw createError('Bạn không có quyền thanh toán đơn đặt phòng này.', 403);
  }
  return booking;
};

const formatBookingRef = (bookingId) => String(bookingId || '').split('-')[0].toUpperCase();

const buildQrUrl = ({ amount, paymentCode }) => {
  const { BANK_CODE, ACCOUNT_NUMBER, ACCOUNT_HOLDER_NAME } = env;
  return (
    `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT_NUMBER}-compact2.png` +
    `?amount=${amount}&addInfo=${paymentCode}&accountName=${encodeURIComponent(ACCOUNT_HOLDER_NAME)}`
  );
};

const generatePaymentCode = () => (
  `${PAYMENT_CODE_PREFIX}${crypto.randomInt(10000000, 100000000)}`
);

const findAvoraTransaction = async (bookingId) => {
  const { data, error } = await supabase
    .from('t_payment_transaction')
    .select('transaction_id, gateway_ref_id, paid_at')
    .eq('booking_id', bookingId)
    .like('gateway_ref_id', `${PAYMENT_CODE_PREFIX}%`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw createError(`Không thể truy vấn giao dịch thanh toán: ${error.message}`);
  return data;
};

/**
 * API 1 - Tạo (hoặc lấy lại) thông tin QR cho một booking.
 */
const createQr = async (bookingId, currentUser) => {
  ensureClient();
  if (!env.BANK_CODE || !env.ACCOUNT_NUMBER || !env.ACCOUNT_HOLDER_NAME) {
    throw createError('Hệ thống chưa cấu hình tài khoản ngân hàng nhận tiền (BANK_CODE / ACCOUNT_NUMBER / ACCOUNT_HOLDER_NAME).', 503);
  }

  const [booking, statusCodes] = await Promise.all([
    loadBookingForPayment(bookingId, currentUser),
    loadBookingStatusCodes(),
  ]);

  const statusName = statusCodes.nameOf(booking.booking_status_cd);
  if (statusName === 'CFM') throw createError('Đơn đặt phòng này đã được thanh toán.', 409, 'ALREADY_PAID');
  if (statusName !== 'PND') throw createError('Đơn đặt phòng không còn ở trạng thái chờ thanh toán.', 400, 'NOT_PENDING');

  const remainingSeconds = getRemainingSeconds(booking.created_at);
  if (remainingSeconds <= 0) {
    throw createError('Đơn đặt phòng đã hết hạn thanh toán.', 410, 'PAYMENT_EXPIRED');
  }

  const amount = Math.round(Number(booking.total_amount));
  let transaction = await findAvoraTransaction(booking.booking_id);

  if (transaction?.paid_at) {
    throw createError('Đơn đặt phòng này đã được thanh toán.', 409, 'ALREADY_PAID');
  }

  if (!transaction) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !transaction; attempt += 1) {
      const candidate = generatePaymentCode();
      const { data: inserted, error: insertError } = await supabase
        .from('t_payment_transaction')
        .insert({
          booking_id: booking.booking_id,
          payer_user_id: booking.user_id,
          amount_paid: 0,
          gateway_ref_id: candidate,
          paid_at: null,
        })
        .select('transaction_id, gateway_ref_id, paid_at')
        .single();

      if (!insertError) {
        transaction = inserted;
        break;
      }
      if (insertError.code === '23505') {
        // Trùng mã ngẫu nhiên, hoặc request song song đã tạo mã cho booking này.
        transaction = await findAvoraTransaction(booking.booking_id);
        continue;
      }
      throw createError(`Không thể tạo giao dịch thanh toán: ${insertError.message}`);
    }
    if (!transaction) throw createError('Không thể sinh mã thanh toán. Vui lòng thử lại.', 500);
  }

  const paymentCode = transaction.gateway_ref_id;
  return {
    booking_id: booking.booking_id,
    booking_ref: formatBookingRef(booking.booking_id),
    hotel_name: booking.m_hotel?.name || '',
    qr_url: buildQrUrl({ amount, paymentCode }),
    payment_code: paymentCode,
    amount,
    bank_code: env.BANK_CODE,
    account_number: env.ACCOUNT_NUMBER,
    account_holder: env.ACCOUNT_HOLDER_NAME,
    remaining_time_seconds: remainingSeconds,
  };
};

/**
 * API 3 - Trạng thái đơn để frontend polling.
 */
const getPaymentStatus = async (bookingId, currentUser) => {
  ensureClient();
  const [booking, statusCodes] = await Promise.all([
    loadBookingForPayment(bookingId, currentUser),
    loadBookingStatusCodes(),
  ]);

  const statusName = statusCodes.nameOf(booking.booking_status_cd);
  return {
    booking_id: booking.booking_id,
    booking_status_cd: booking.booking_status_cd,
    status_code_name: statusName,
    is_paid: statusName === 'CFM',
    remaining_time_seconds: statusName === 'PND' ? getRemainingSeconds(booking.created_at) : 0,
  };
};

// ─── Webhook ────────────────────────────────────────────────────────────────

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Xác thực request từ SePay:
 *  - HMAC-SHA256: header `X-SePay-Signature: sha256=<hex>` + `X-SePay-Timestamp`,
 *    message = `${timestamp}.${rawBody}`.
 *  - Hoặc API Key: header `Authorization: Apikey <SEPAY_API_KEY>`.
 */
const verifyWebhookRequest = (req) => {
  const hasHmac = Boolean(env.SEPAY_HMAC_SECRET);
  const hasApiKey = Boolean(env.SEPAY_API_KEY);

  if (!hasHmac && !hasApiKey) {
    if (env.NODE_ENV === 'production') return false;
    console.warn('[Payment] SEPAY_HMAC_SECRET/SEPAY_API_KEY chưa cấu hình - bỏ qua xác thực webhook (chỉ DEV).');
    return true;
  }

  if (hasHmac) {
    const signature = req.headers['x-sepay-signature'];
    const timestamp = req.headers['x-sepay-timestamp'];
    if (signature && timestamp && req.rawBody != null) {
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (Number.isFinite(age) && age <= WEBHOOK_TIMESTAMP_TOLERANCE_SEC) {
        const expected = `sha256=${crypto
          .createHmac('sha256', env.SEPAY_HMAC_SECRET)
          .update(`${timestamp}.${req.rawBody}`)
          .digest('hex')}`;
        if (safeEqual(signature, expected)) return true;
      }
    }
  }

  if (hasApiKey) {
    const authHeader = String(req.headers.authorization || '');
    const match = authHeader.match(/^(?:Apikey|Bearer)\s+(.+)$/i);
    if (match && safeEqual(match[1].trim(), env.SEPAY_API_KEY)) return true;
  }

  return false;
};

/**
 * API 2 - Xử lý webhook. Phần ghi DB chạy atomically trong hàm Postgres
 * `avora.fn_process_sepay_payment` (xem backend/sql/sepay_payment_setup.sql).
 */
const processWebhook = async (payload) => {
  ensureClient();

  if (String(payload?.transferType || 'in').toLowerCase() !== 'in') {
    return { result: 'IGNORED_OUTGOING' };
  }

  const match = String(payload?.content || payload?.description || '').match(PAYMENT_CODE_REGEX);
  if (!match) return { result: 'NO_PAYMENT_CODE' };

  const paymentCode = match[0].toUpperCase();
  const transferAmount = Number(payload?.transferAmount);
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return { result: 'INVALID_AMOUNT' };
  }

  const { data, error } = await supabase.rpc('fn_process_sepay_payment', {
    p_payment_code: paymentCode,
    p_transfer_amount: transferAmount,
  });
  if (error) throw createError(`Lỗi xử lý thanh toán: ${error.message}`);

  return { ...(data || {}), payment_code: paymentCode };
};

module.exports = {
  createQr,
  getPaymentStatus,
  verifyWebhookRequest,
  processWebhook,
};
