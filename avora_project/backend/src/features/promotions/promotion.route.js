'use strict';

const express = require('express');
const router = express.Router();
const promotionController = require('./promotion.controller');

// GET /api/promotions - list all promotions/coupons
router.get('/promotions', promotionController.getAllCoupons);

// GET /api/promotions/:id - get single promotion detail
router.get('/promotions/:id', promotionController.getCouponById);

module.exports = router;
