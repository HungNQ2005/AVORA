'use strict';

/**
 * Send a standardized success response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {string} message
 * @param {*} data
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Send a standardized error response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {string} message
 * @param {*} data
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', data = null) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data,
  });
};

module.exports = { sendSuccess, sendError };
