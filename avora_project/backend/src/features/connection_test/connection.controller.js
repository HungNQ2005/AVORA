'use strict';

const { getSystemCodes } = require('./connection.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/system-codes
 * Returns all records from m_system_code.
 */
const handleGetSystemCodes = async (req, res, next) => {
  try {
    const data = await getSystemCodes();
    return sendSuccess(res, 200, 'System codes fetched successfully', data);
  } catch (error) {
    // Forward to global error handler
    next(error);
  }
};

module.exports = { handleGetSystemCodes };
