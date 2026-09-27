'use strict';

const otpService = require('./otp.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * POST /api/otp/send
 * Generate and dispatch a 6-digit OTP code to the requested email.
 */
const handleSendOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'GENERAL' } = req.body;
    const targetEmail = email || req.user?.email;
    const identifier = req.user?.user_id || targetEmail;

    if (!targetEmail) {
      return sendError(res, 400, 'Recipient email is required.');
    }

    const result = await otpService.sendOtp({
      identifier,
      email: targetEmail,
      purpose,
    });

    return sendSuccess(res, 200, 'Verification code sent successfully.', result);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * POST /api/otp/verify
 * Standalone endpoint to verify an OTP.
 */
const handleVerifyOtp = async (req, res, next) => {
  try {
    const { otp, purpose = 'GENERAL', email } = req.body;
    const identifier = req.user?.user_id || email;

    if (!identifier) {
      return sendError(res, 400, 'Identifier or email is required for verification.');
    }

    if (!otp) {
      return sendError(res, 400, 'Verification code (OTP) is required.');
    }

    await otpService.verifyOtp({
      identifier,
      otp,
      purpose,
    });

    return sendSuccess(res, 200, 'Verification code verified successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

module.exports = {
  handleSendOtp,
  handleVerifyOtp,
};
