'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const controller = require('./disbursement.controller');

const router = Router();

// ─── VENDOR DISBURSEMENT ENDPOINTS ────────────────────────────────────────
router.get(
  '/vendor/disbursements/overview',
  authenticate,
  requireRole('VEN'),
  controller.getVendorOverview
);

router.get(
  '/vendor/disbursements/history',
  authenticate,
  requireRole('VEN'),
  controller.getVendorHistory
);

router.post(
  '/vendor/disbursements/request',
  authenticate,
  requireRole('VEN'),
  controller.createDisbursementRequest
);

// ─── BUSINESS MANAGER PROCESSING ENDPOINTS ────────────────────────────────
router.get(
  '/business/disbursements',
  authenticate,
  requireRole('BMR'),
  controller.getBusinessDisbursements
);

router.patch(
  '/business/disbursements/:id/approve',
  authenticate,
  requireRole('BMR'),
  controller.approveDisbursement
);

router.patch(
  '/business/disbursements/:id/settle',
  authenticate,
  requireRole('BMR'),
  controller.settleDisbursement
);

router.patch(
  '/business/disbursements/:id/reject',
  authenticate,
  requireRole('BMR'),
  controller.rejectDisbursement
);

module.exports = router;

