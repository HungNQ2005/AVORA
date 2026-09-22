'use strict';

const { Router } = require('express');
const { handleGetSystemCodes } = require('./connection.controller');

const router = Router();

// GET /api/system-codes
router.get('/system-codes', handleGetSystemCodes);

module.exports = router;
