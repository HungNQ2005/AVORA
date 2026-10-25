'use strict';

const paymentService = require('./payment.service');
const { sendSuccess } = require('../../utils/responseHelper');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createQr = async (req, res, next) => {
  try {
    const bookingId = String(req.body?.booking_id || '').trim();
    if (!UUID_REGEX.test(bookingId)) {
      return res.status(400).json({ status: 'error', message: 'booking_id không hợp lệ.' });
    }
    const data = await paymentService.createQr(bookingId, req.user);
    return sendSuccess(res, 200, 'Tạo mã QR thanh toán thành công.', data);
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        status: 'error',
        code: error.code,
        message: error.message,
      });
    }
    return next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const bookingId = String(req.params.booking_id || '').trim();
    if (!UUID_REGEX.test(bookingId)) {
      return res.status(400).json({ status: 'error', message: 'booking_id không hợp lệ.' });
    }
    const data = await paymentService.getPaymentStatus(bookingId, req.user);
    return sendSuccess(res, 200, 'OK', data);
  } catch (error) {
    return next(error);
  }
};

const handleWebhook = async (req, res) => {
  if (!paymentService.verifyWebhookRequest(req)) {
    console.warn('[Payment] Webhook bị từ chối: xác thực không hợp lệ.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await paymentService.processWebhook(req.body || {});
    console.log('[Payment] Webhook processed:', JSON.stringify(result));
    return res.status(200).json({ success: true });
  } catch (error) {
    // 5xx để SePay tự động gửi lại webhook.
    console.error('[Payment] Webhook error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

module.exports = { createQr, getStatus, handleWebhook };
