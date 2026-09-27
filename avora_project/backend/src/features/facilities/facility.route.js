'use strict';

const { Router } = require('express');
const {
  handleGetFacilities,
  handleGetFacilityById,
  handleCreateFacility,
  handleUpdateFacility,
  handleDeleteFacility,
} = require('./facility.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { requireVenueManager } = require('../../common/middlewares/venueManagerAuthorization');

const router = Router();

router.use('/amenities', authenticate, requireVenueManager);
router.use('/facilities', authenticate, requireVenueManager);

router.get('/amenities', handleGetFacilities);
router.get('/amenities/:id', handleGetFacilityById);
router.post('/amenities', handleCreateFacility);
router.patch('/amenities/:id', handleUpdateFacility);
router.put('/amenities/:id', handleUpdateFacility);
router.delete('/amenities/:id', handleDeleteFacility);

router.get('/facilities/:id', handleGetFacilityById);
router.post('/facilities', handleCreateFacility);
router.patch('/facilities/:id', handleUpdateFacility);
router.put('/facilities/:id', handleUpdateFacility);
router.delete('/facilities/:id', handleDeleteFacility);

module.exports = router;
