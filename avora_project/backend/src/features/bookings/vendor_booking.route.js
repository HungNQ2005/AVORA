'use strict';

const express = require('express');
const router = express.Router();
const vendorBookingController = require('./vendor_booking.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { authorizeHotelManagement } = require('../../common/middlewares/hotelManagementAuthMiddleware');
const { sendError } = require('../../utils/responseHelper');

// Middleware giới hạn nghiêm ngặt CHỈ dành cho Vendor (roleName === 'VEN' hoặc role_cd === '4')
const requireVendorOnly = (req, res, next) => {
  if (!req.hotelAccess || !req.hotelAccess.isVendor) {
    return sendError(res, 403, 'Chức năng này chỉ dành riêng cho tài khoản Quản lý khách sạn (Vendor).');
  }
  return next();
};

const protectVendor = [authenticate, authorizeHotelManagement, requireVendorOnly];

// GET /api/vendor/bookings - Danh sách đơn đặt phòng dành cho Vendor
router.get('/vendor/bookings', ...protectVendor, vendorBookingController.getVendorBookings);

// GET /api/vendor/bookings/:id - Chi tiết đơn đặt phòng
router.get('/vendor/bookings/:id', ...protectVendor, vendorBookingController.getVendorBookingById);

// PATCH /api/vendor/bookings/:id/status - Cập nhật trạng thái đơn (Xác nhận / Hủy)
router.patch('/vendor/bookings/:id/status', ...protectVendor, vendorBookingController.updateVendorBookingStatus);

module.exports = router;
