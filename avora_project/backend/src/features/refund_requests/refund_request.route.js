'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const controller = require('./refund_request.controller');

const router = Router();

// ─── BUSINESS MANAGER REFUND PROCESSING ENDPOINTS ──────────────────────────
router.get(
  '/business/refund-requests',
  authenticate,
  requireRole('BMR'),
  controller.getBusinessRefundOverview
);

router.post(
  '/business/refund-requests/from-ticket/:ticketId',
  authenticate,
  requireRole('BMR'),
  controller.createRefundFromTicket
);

router.patch(
  '/business/refund-requests/:id',
  authenticate,
  requireRole('BMR'),
  controller.updateRefundRequestInfo
);

router.get(
  '/business/refund-requests/:id/payment-qr',
  authenticate,
  requireRole('BMR'),
  controller.getRefundPaymentQr
);

router.get(
  '/business/refund-requests/:id/payment-status',
  authenticate,
  requireRole('BMR'),
  controller.getRefundPaymentStatus
);

router.patch(
  '/business/refund-requests/:id/settle',
  authenticate,
  requireRole('BMR'),
  controller.settleRefundManually
);

router.post(
  '/business/refund-requests/:id/settle',
  authenticate,
  requireRole('BMR'),
  controller.settleRefundManually
);

module.exports = router;

