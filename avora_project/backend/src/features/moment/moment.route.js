'use strict';

const { Router } = require('express');
const multer = require('multer');
const { authenticate, optionalAuthenticate, requireRole } = require('../../common/middlewares/authMiddleware');
const { validateRequest } = require('../../common/middlewares/validationMiddleware');
const controller = require('./moment.controller');
const {
  momentListQuerySchema,
  adminMomentListQuerySchema,
  momentParamsSchema,
  adminMomentRemovalBodySchema,
  createMomentBodySchema,
  updateMomentBodySchema,
  momentVisibilityBodySchema,
} = require('./moment.validation');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

router.get('/moment/banner', controller.listBannerMoments);
router.get('/moment/admin', authenticate, requireRole('ADM'), validateRequest({ query: adminMomentListQuerySchema }), controller.listAdminMoments);
router.delete('/moment/admin/:id', authenticate, requireRole('ADM'), validateRequest({ params: momentParamsSchema, body: adminMomentRemovalBodySchema }), controller.adminRemoveMoment);
router.get('/moment/eligible-bookings', authenticate, controller.listEligibleBookings);
router.get('/moment', optionalAuthenticate, validateRequest({ query: momentListQuerySchema }), controller.listMoments);
router.post('/moment', authenticate, upload.single('image'), validateRequest({ body: createMomentBodySchema }), controller.createMoment);
router.put('/moment/:id', authenticate, upload.single('image'), validateRequest({ params: momentParamsSchema, body: updateMomentBodySchema }), controller.updateMoment);
router.patch('/moment/:id/visibility', authenticate, validateRequest({ params: momentParamsSchema, body: momentVisibilityBodySchema }), controller.setMomentVisibility);
router.post('/moment/:id/like', authenticate, validateRequest({ params: momentParamsSchema }), controller.toggleMomentLike);
router.get('/moment/:id', optionalAuthenticate, validateRequest({ params: momentParamsSchema }), controller.getMoment);

module.exports = router;
