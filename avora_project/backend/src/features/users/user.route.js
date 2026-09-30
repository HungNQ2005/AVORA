'use strict';

const { Router } = require('express');
const {
  handleGetUsers,
  handleGetUserStats,
  handleUpdateUserStatus,
} = require('./user.controller');

const router = Router();

// GET /api/users - List of users with search, role filter, status filter, and pagination
router.get('/users', handleGetUsers);

// GET /api/users/stats - Summary KPI statistics and role counts
router.get('/users/stats', handleGetUserStats);

// PATCH /api/users/:id/status - Approve or toggle lock/active status
router.patch('/users/:id/status', handleUpdateUserStatus);

module.exports = router;
