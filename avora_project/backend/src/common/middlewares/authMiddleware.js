'use strict';

const { verifyJwt } = require('../../utils/tokenHelper');
const { sendError } = require('../../utils/responseHelper');

/**
 * Express middleware to authenticate requests via JWT Bearer token.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Authentication required. Please sign in.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token. Please sign in again.');
  }
};

module.exports = { authenticate };
