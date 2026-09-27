'use strict';

const crypto = require('crypto');

// In-memory OTP store (prototype).
// Key: `${identifier}:${purpose}`
// Value: { otp, expiresAt, email, purpose }
const otpStore = new Map();

/**
 * Generate a cryptographically secure numeric OTP.
 * @param {number} length
 * @returns {string} numeric string (default 6 digits)
 */
const generateOtp = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Generate and send an OTP to the given email address.
 * @param {object} params
 * @param {string} params.identifier - Unique user ID or email identifier
 * @param {string} params.email - Recipient email
 * @param {string} [params.purpose='GENERAL'] - Action identifier (e.g., 'DEACTIVATE_ACCOUNT')
 * @param {number} [params.expiryMinutes=5] - Time to live in minutes
 * @returns {Promise<{ identifier: string, email: string, purpose: string, expiresInMinutes: number }>}
 */
const sendOtp = async ({ identifier, email, purpose = 'GENERAL', expiryMinutes = 5 }) => {
  if (!identifier || !email) {
    const err = new Error('Identifier and email are required to send OTP.');
    err.statusCode = 400;
    throw err;
  }

  const otp = generateOtp(6);
  const ttlMs = expiryMinutes * 60 * 1000;
  const expiresAt = Date.now() + ttlMs;
  const storeKey = `${identifier}:${purpose}`;

  otpStore.set(storeKey, {
    otp,
    expiresAt,
    email,
    purpose,
  });

  // Simulate email sending via console log
  console.log('\n[EMAIL SIMULATION - OTP SERVICE] ========================================');
  console.log(`  To: ${email}`);
  console.log(`  Purpose: ${purpose}`);
  console.log(`  OTP Code: ${otp}`);
  console.log(`  Valid for: ${expiryMinutes} minutes (expires at ${new Date(expiresAt).toLocaleTimeString()})`);
  console.log('=========================================================================\n');

  return {
    identifier,
    email,
    purpose,
    expiresInMinutes: expiryMinutes,
  };
};

/**
 * Verify an OTP for the given identifier and purpose.
 * Consumes the OTP if valid.
 * @param {object} params
 * @param {string} params.identifier - Unique user ID or email
 * @param {string} params.otp - 6-digit verification code
 * @param {string} [params.purpose='GENERAL'] - Action identifier
 * @returns {Promise<boolean>}
 */
const verifyOtp = async ({ identifier, otp, purpose = 'GENERAL' }) => {
  if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
    const err = new Error('A valid 6-digit verification code is required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanOtp = otp.trim();
  const storeKey = `${identifier}:${purpose}`;
  const entry = otpStore.get(storeKey);

  if (!entry) {
    const err = new Error('No active verification code found. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(storeKey);
    const err = new Error('Verification code has expired. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (entry.otp !== cleanOtp) {
    const err = new Error('Incorrect verification code. Please check and try again.');
    err.statusCode = 400;
    throw err;
  }

  // Consume OTP upon successful verification
  otpStore.delete(storeKey);
  return true;
};

/**
 * Manually invalidate an existing OTP.
 * @param {string} identifier
 * @param {string} [purpose='GENERAL']
 */
const clearOtp = (identifier, purpose = 'GENERAL') => {
  otpStore.delete(`${identifier}:${purpose}`);
};

module.exports = {
  generateOtp,
  sendOtp,
  verifyOtp,
  clearOtp,
};
