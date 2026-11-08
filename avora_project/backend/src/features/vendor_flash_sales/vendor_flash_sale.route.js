'use strict';

const express = require('express');
const router = express.Router();
const vendorFlashSaleController = require('./vendor_flash_sale.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { authorizeHotelManagement } = require('../../common/middlewares/hotelManagementAuthMiddleware');
const { sendError } = require('../../utils/responseHelper');

// Middleware giới hạn nghiêm ngặt CHỈ dành cho Quản lý khách sạn (Vendor)
const requireVendorOnly = (req, res, next) => {
  if (!req.hotelAccess || !req.hotelAccess.isVendor) {
    return sendError(res, 403, 'Chức năng này chỉ dành riêng cho tài khoản Quản lý khách sạn (Vendor).');
  }
  return next();
};

const protectVendor = [authenticate, authorizeHotelManagement, requireVendorOnly];

// Standard routes mounted at: app.use('/api/vendor/flash-sales', router)
router.get('/', ...protectVendor, vendorFlashSaleController.getVendorFlashSales);
router.post('/', ...protectVendor, vendorFlashSaleController.createVendorFlashSale);
router.get('/:id', ...protectVendor, vendorFlashSaleController.getVendorFlashSaleById);
router.put('/:id', ...protectVendor, vendorFlashSaleController.updateVendorFlashSale);
router.patch('/:id', ...protectVendor, vendorFlashSaleController.updateVendorFlashSale);
router.delete('/:id', ...protectVendor, vendorFlashSaleController.deleteVendorFlashSale);

module.exports = router;
