'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const controller = require('./hotel_bank_requests.controller');
const {
  ticketIdParamSchema,
  listRequestsQuerySchema,
  applyBankChangeBodySchema,
} = require('./hotel_bank_requests.validation');

const router = Router();

router.get(
  '/admin/hotel-bank-requests',
  authenticate,
  requireRole('ADM'),
  validateRequest({ query: listRequestsQuerySchema }),
  controller.listRequests
);

router.get(
  '/admin/hotel-bank-requests/banks',
  authenticate,
  requireRole('ADM'),
  controller.getBanks
);

router.get(
  '/admin/hotel-bank-requests/:ticketId',
  authenticate,
  requireRole('ADM'),
  validateRequest({ params: ticketIdParamSchema }),
  controller.getRequestDetail
);

router.post(
  '/admin/hotel-bank-requests/:ticketId/apply',
  authenticate,
  requireRole('ADM'),
  validateRequest({ params: ticketIdParamSchema, body: applyBankChangeBodySchema }),
  controller.applyChange
);

module.exports = router;
