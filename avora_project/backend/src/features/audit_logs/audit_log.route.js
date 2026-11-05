'use strict';

const express = require('express');
const router = express.Router();
const auditLogController = require('./audit_log.controller');
const {
  auditLogListQuerySchema,
  auditLogParamsSchema,
  validateAuditLogRequest,
} = require('./audit_log.validation');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');

// Strictly enforce Admin authorization (ADM role)
const adminGuard = [authenticate, requireRole('ADM')];

// ─── Standard AVORA mounted routes (/api/admin/audit-logs) ───────────────────
router.get(
  '/admin/audit-logs',
  ...adminGuard,
  validateAuditLogRequest({ query: auditLogListQuerySchema }),
  auditLogController.getAuditLogs
);

router.get(
  '/admin/audit-logs/:id',
  ...adminGuard,
  validateAuditLogRequest({ params: auditLogParamsSchema }),
  auditLogController.getAuditLogById
);

// ─── Direct /audit-logs routes alias ──────────────────────────────────────────
router.get(
  '/audit-logs',
  ...adminGuard,
  validateAuditLogRequest({ query: auditLogListQuerySchema }),
  auditLogController.getAuditLogs
);

router.get(
  '/audit-logs/:id',
  ...adminGuard,
  validateAuditLogRequest({ params: auditLogParamsSchema }),
  auditLogController.getAuditLogById
);

// ─── Root '/' router fallback for isolated mounting (e.g. app.use('/api/admin/audit-logs', route)) ──
router.get(
  '/',
  ...adminGuard,
  validateAuditLogRequest({ query: auditLogListQuerySchema }),
  auditLogController.getAuditLogs
);

router.get(
  '/:id',
  ...adminGuard,
  validateAuditLogRequest({ params: auditLogParamsSchema }),
  auditLogController.getAuditLogById
);

module.exports = router;
