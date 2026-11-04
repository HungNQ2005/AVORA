'use strict';

const { Router } = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const controller = require('./support.controller');
const {
  ticketIdParamsSchema,
  attachmentParamsSchema,
  ticketListQuerySchema,
  createTicketBodySchema,
  createReplyBodySchema,
  ticketStatusBodySchema,
  aiChatBodySchema,
} = require('./support.validation');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 3 },
});
const participants = ['CUS', 'VEN', 'BMR', 'ADM'];
const requesters = ['CUS', 'VEN', 'BMR'];

router.get('/support/categories', authenticate, requireRole(...participants), controller.getCategories);
router.get('/support/counts', authenticate, requireRole(...participants), controller.getCounts);
router.get('/support/tickets', authenticate, requireRole(...participants), validateRequest({ query: ticketListQuerySchema }), controller.listTickets);
router.post('/support/tickets', authenticate, requireRole(...requesters), upload.array('attachments', 3), validateRequest({ body: createTicketBodySchema }), controller.createTicket);
router.get('/support/tickets/:ticketId/attachments/:key', authenticate, requireRole(...participants), validateRequest({ params: attachmentParamsSchema }), controller.downloadAttachment);
router.delete('/support/tickets/:ticketId/attachments/:key', authenticate, requireRole(...participants), validateRequest({ params: attachmentParamsSchema }), controller.deleteAttachment);
router.get('/support/tickets/:ticketId/events', authenticate, requireRole(...participants), validateRequest({ params: ticketIdParamsSchema }), controller.streamTicketEvents);
router.post('/support/tickets/:ticketId/ai-chat', authenticate, requireRole(...requesters), validateRequest({ params: ticketIdParamsSchema, body: aiChatBodySchema }), controller.chatWithAI);
router.post('/support/tickets/:ticketId/claim', authenticate, requireRole('ADM'), validateRequest({ params: ticketIdParamsSchema }), controller.claimTicket);
router.post('/support/tickets/:ticketId/replies', authenticate, requireRole(...participants), upload.array('attachments', 3), validateRequest({ params: ticketIdParamsSchema, body: createReplyBodySchema }), controller.createReply);
router.patch('/support/tickets/:ticketId/status', authenticate, requireRole(...participants), validateRequest({ params: ticketIdParamsSchema, body: ticketStatusBodySchema }), controller.updateTicketStatus);
router.delete('/support/tickets/:ticketId', authenticate, requireRole(...participants), validateRequest({ params: ticketIdParamsSchema }), controller.deleteTicket);
router.get('/support/tickets/:ticketId', authenticate, requireRole(...participants), validateRequest({ params: ticketIdParamsSchema }), controller.getTicket);

module.exports = router;
