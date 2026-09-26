'use strict';

const { Router } = require('express');
const { handleSendOtp, handleVerifyOtp } = require('./otp.controller');
const { verifyJwt } = require('../../utils/tokenHelper');

const router = Router();

/**
 * Optional authentication middleware:
 * Attaches user to req.user if a valid Bearer token is present,
 * otherwise proceeds as unauthenticated request.
 */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyJwt(token);
    } catch {
      // Proceed without user object if token is invalid or expired
    }
  }
  next();
};

// POST /api/otp/send
router.post('/otp/send', optionalAuth, handleSendOtp);

// POST /api/otp/verify
router.post('/otp/verify', optionalAuth, handleVerifyOtp);

module.exports = router;
