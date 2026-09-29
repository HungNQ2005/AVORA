"use strict";

const express = require("express");
const router = express.Router();
const promotionController = require("./coupon.controller");
const { authenticate } = require("../../common/middlewares/authMiddleware");
const { requireCouponManager } = require("./couponAuthorization");

router.use("/coupons", authenticate, requireCouponManager);

// GET /api/coupons - list all promotions/coupons
router.get("/coupons", promotionController.getAllCoupons);

// GET /api/coupons/:id - get single promotion detail
router.get("/coupons/:id", promotionController.getCouponById);
router.post("/coupons", promotionController.createCoupon);
router.put("/coupons/:id", promotionController.updateCoupon);
router.patch("/coupons/:id", promotionController.updateCoupon);
router.delete("/coupons/:id", promotionController.deleteCoupon);

module.exports = router;
