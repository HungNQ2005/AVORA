'use strict';

const { Router } = require('express');
const {
  handleGetUsers,
  handleGetUserStats,
  handleUpdateUserStatus,
  handleRequestRoleChange,
  handleConfirmRoleChange,
} = require('./user.controller');
const { authenticate, requireRole } = require('../../common/middlewares/authMiddleware');

const router = Router();

// Guard all user management routes for System Admin (ADM) only
router.use('/users', authenticate, requireRole('ADM'));

// GET /api/users - List of users with search, role filter, status filter, and pagination
router.get('/users', handleGetUsers);

// GET /api/users/stats - Summary KPI statistics and role counts
router.get('/users/stats', handleGetUserStats);

// PATCH /api/users/:id/status - Approve or toggle lock/active status
router.patch('/users/:id/status', handleUpdateUserStatus);

// POST /api/users/:id/request-role-change - Initiate role change (Step-up Auth with OTP if sensitive role)
router.post('/users/:id/request-role-change', handleRequestRoleChange);

// POST /api/users/:id/confirm-role-change - Confirm sensitive role change with 6-digit OTP
router.post('/users/:id/confirm-role-change', handleConfirmRoleChange);


module.exports = router;
