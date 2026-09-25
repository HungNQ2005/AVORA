'use strict';

const { Router } = require('express');
const {
  handleSignUp,
  handleVerifyEmail,
  handleSignIn,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleDeactivateAccount,
} = require('./auth.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');

const router = Router();

// ─── Public Auth Routes ────────────────────────────────────────────────────────
// POST /api/auth/signup
router.post('/auth/signup', handleSignUp);

// GET /api/auth/verify/:token  (email link click)
router.get('/auth/verify/:token', handleVerifyEmail);

// POST /api/auth/signin
router.post('/auth/signin', handleSignIn);

// ─── Protected Account Routes ─────────────────────────────────────────────────
// GET /api/account/profile
router.get('/account/profile', authenticate, handleGetProfile);

// PUT /api/account/profile
router.put('/account/profile', authenticate, handleUpdateProfile);

// PUT /api/account/change-password
router.put('/account/change-password', authenticate, handleChangePassword);

// DELETE /api/account/deactivate
router.delete('/account/deactivate', authenticate, handleDeactivateAccount);

module.exports = router;
