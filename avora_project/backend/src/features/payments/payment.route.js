'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');

// POST /api/payment/create-qr - Tạo / lấy lại QR VietQR cho booking PENDING
router.post('/payment/create-qr', authenticate, paymentController.createQr);

// GET /api/payment/status/:booking_id - Polling trạng thái thanh toán
router.get('/payment/status/:booking_id', authenticate, paymentController.getStatus);

// Webhook: POST để nhận dữ liệu từ SePay, GET để kiểm tra probe trên trình duyệt
router.get('/payment/webhook', (_req, res) => {
  res.json({
    status: 'ready',
    message: 'SePay Webhook endpoint is active and listening for POST requests.',
  });
});
router.post('/payment/webhook', paymentController.handleWebhook);

module.exports = router;
