"use strict";

const express = require("express");
const router = express.Router();
const commissionPolicyController = require("./commission_policy.controller");
const { authenticate } = require("../../common/middlewares/authMiddleware");
const {
  requireCommissionPolicyManager,
} = require("../../common/middlewares/commissionPolicyAuthorization");

// All commission policy routes require authentication and Business Manager/Admin role
router.use("/commission-policies", authenticate, requireCommissionPolicyManager);

// GET /api/commission-policies/hotels - list of hotels for dropdown
router.get("/commission-policies/hotels", commissionPolicyController.getHotels);

// GET /api/commission-policies - list all commission policies with filters
router.get("/commission-policies", commissionPolicyController.getAllCommissionPolicies);

// GET /api/commission-policies/:id - single policy details
router.get("/commission-policies/:id", commissionPolicyController.getCommissionPolicyById);

// POST /api/commission-policies - create new policy
router.post("/commission-policies", commissionPolicyController.createCommissionPolicy);

// PUT /api/commission-policies/:id - full update
router.put("/commission-policies/:id", commissionPolicyController.updateCommissionPolicy);

// PATCH /api/commission-policies/:id - partial update
router.patch("/commission-policies/:id", commissionPolicyController.updateCommissionPolicy);

// DELETE /api/commission-policies/:id - delete policy
router.delete("/commission-policies/:id", commissionPolicyController.deleteCommissionPolicy);

module.exports = router;
