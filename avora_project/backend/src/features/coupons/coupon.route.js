"use strict";

const express = require("express");
const router = express.Router();
const couponController = require("./coupon.controller");
const { authenticate } = require("../../common/middlewares/authMiddleware");
const { requireCouponManager } = require("../../common/middlewares/couponAuthorization");

router.use("/coupons", authenticate, requireCouponManager);

// GET /api/coupons - list all coupons
router.get("/coupons", couponController.getAllCoupons);

// GET /api/coupons/:id - get single coupon detail
router.get("/coupons/:id", couponController.getCouponById);
router.post("/coupons", couponController.createCoupon);
router.put("/coupons/:id", couponController.updateCoupon);
router.patch("/coupons/:id", couponController.updateCoupon);
router.delete("/coupons/:id", couponController.deleteCoupon);

module.exports = router;
