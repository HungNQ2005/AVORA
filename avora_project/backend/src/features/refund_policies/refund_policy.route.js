"use strict";

const express = require("express");
const router = express.Router();
const refundPolicyController = require("./refund_policy.controller");
const { authenticate } = require("../../common/middlewares/authMiddleware");
const { requireRefundPolicyManager } = require("../../common/middlewares/refundPolicyAuthorization");

// All refund policy routes require authentication and Business Manager/Admin role
router.use("/refund-policies", authenticate, requireRefundPolicyManager);

// GET /api/refund-policies/hotels - list of hotels for dropdown
router.get("/refund-policies/hotels", refundPolicyController.getHotels);

// GET /api/refund-policies - list all refund policies with filters
router.get("/refund-policies", refundPolicyController.getAllRefundPolicies);

// GET /api/refund-policies/:id - single policy details
router.get("/refund-policies/:id", refundPolicyController.getRefundPolicyById);

// POST /api/refund-policies - create new policy
router.post("/refund-policies", refundPolicyController.createRefundPolicy);

// PUT /api/refund-policies/:id - full update
router.put("/refund-policies/:id", refundPolicyController.updateRefundPolicy);

// PATCH /api/refund-policies/:id - partial update
router.patch("/refund-policies/:id", refundPolicyController.updateRefundPolicy);

// DELETE /api/refund-policies/:id - delete policy
router.delete("/refund-policies/:id", refundPolicyController.deleteRefundPolicy);

module.exports = router;
