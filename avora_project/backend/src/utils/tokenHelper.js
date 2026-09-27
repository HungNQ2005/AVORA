'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Sign a JWT access token for authenticated sessions.
 * @param {object} payload - User data to embed (user_id, email, role_cd)
 * @returns {string} signed JWT
 */
const signJwt = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyJwt = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Generate a cryptographically secure random hex token.
 * Used for email verification links.
 * @param {number} bytes - number of random bytes (default 32)
 * @returns {string} hex string token
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

module.exports = { signJwt, verifyJwt, generateSecureToken };
