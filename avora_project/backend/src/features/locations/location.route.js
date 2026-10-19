'use strict';

const { Router } = require('express');
const locationController = require('./location.controller');

const router = Router();

router.get('/locations/cities', locationController.getCities);
router.get('/locations/districts', locationController.getDistricts);
router.get('/locations/wards', locationController.getWards);

module.exports = router;
