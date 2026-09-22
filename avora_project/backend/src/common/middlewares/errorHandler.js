'use strict';

const { sendError } = require('../../utils/responseHelper');

/**
 * Global Express error-handling middleware.
 * Must be registered LAST in app.use() chain.
 * Signature must have 4 params for Express to treat it as error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  return sendError(res, statusCode, message);
};

module.exports = errorHandler;
