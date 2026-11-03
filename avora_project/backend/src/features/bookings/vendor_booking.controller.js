'use strict';

const vendorBookingService = require('./vendor_booking.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/vendor/bookings
 * Lấy danh sách đơn đặt phòng dành cho Vendor
 */
const getVendorBookings = async (req, res) => {
  try {
    const { page, limit, status, hotelId, search, startDate, endDate } = req.query;

    const result = await vendorBookingService.getVendorBookings({
      hotelAccess: req.hotelAccess,
      page,
      limit,
      status,
      hotelId,
      search,
      startDate,
      endDate,
    });

    return sendSuccess(res, 200, 'Lấy danh sách đơn đặt phòng thành công.', result);
  } catch (err) {
    console.error('[VendorBookingController] getVendorBookings error:', err.message);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Không thể tải danh sách đơn đặt phòng. Vui lòng thử lại.';
    return sendError(res, statusCode, message);
  }
};

/**
 * GET /api/vendor/bookings/:id
 * Lấy chi tiết một đơn đặt phòng
 */
const getVendorBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Mã đơn đặt phòng không hợp lệ.');
    }

    const booking = await vendorBookingService.getVendorBookingById({
      hotelAccess: req.hotelAccess,
      bookingId: id.trim(),
    });

    return sendSuccess(res, 200, 'Lấy chi tiết đơn đặt phòng thành công.', booking);
  } catch (err) {
    console.error('[VendorBookingController] getVendorBookingById error:', err.message);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Không thể xem chi tiết đơn đặt phòng.';
    return sendError(res, statusCode, message);
  }
};

/**
 * PATCH /api/vendor/bookings/:id/status
 * Cập nhật trạng thái đơn đặt phòng (Xác nhận / Hủy)
 */
const updateVendorBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Mã đơn đặt phòng không hợp lệ.');
    }

    if (!status || typeof status !== 'string') {
      return sendError(res, 400, 'Vui lòng chọn trạng thái mới cần cập nhật.');
    }

    // Nếu lý do hủy được gửi lên, validate độ dài
    if (reason && typeof reason === 'string' && reason.length > 500) {
      return sendError(res, 400, 'Lý do hủy đơn không được vượt quá 500 ký tự.');
    }

    const result = await vendorBookingService.updateVendorBookingStatus({
      hotelAccess: req.hotelAccess,
      bookingId: id.trim(),
      newStatus: status.trim(),
      reason: reason || '',
    });

    return sendSuccess(res, 200, result.message, result);
  } catch (err) {
    console.error('[VendorBookingController] updateVendorBookingStatus error:', err.message);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Không thể cập nhật trạng thái đơn đặt phòng.';
    return sendError(res, statusCode, message);
  }
};

module.exports = {
  getVendorBookings,
  getVendorBookingById,
  updateVendorBookingStatus,
};
