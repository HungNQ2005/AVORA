'use strict';

const vendorBookingService = require('./vendor_booking.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');
const { recordAuditLog } = require('../../utils/auditLogger');

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

    // Nếu trạng thái là HỦY (CAN hoặc 3), kiểm tra validate lý do hủy chặt chẽ
    const isCancel = ['CAN', '3'].includes(String(status).trim().toUpperCase());
    if (isCancel) {
      const trimmedReason = String(reason || '').trim();
      if (!trimmedReason) {
        return sendError(res, 400, 'Vui lòng nhập lý do hủy đơn đặt phòng, không được để trống.');
      }
      if (trimmedReason.length < 5) {
        return sendError(res, 400, 'Lý do hủy đơn cần ít nhất 5 ký tự để khách hàng hiểu rõ.');
      }
      if (trimmedReason.length > 500) {
        return sendError(res, 400, 'Lý do hủy đơn không được vượt quá 500 ký tự.');
      }
      if (!/[a-zA-ZÀ-ỹ]/.test(trimmedReason)) {
        return sendError(res, 400, 'Lý do hủy phòng phải chứa chữ cái mô tả rõ ràng, không được chỉ chứa ký tự đặc biệt hoặc số.');
      }
    } else if (reason && typeof reason === 'string' && reason.length > 500) {
      return sendError(res, 400, 'Lý do không được vượt quá 500 ký tự.');
    }

    const result = await vendorBookingService.updateVendorBookingStatus({
      hotelAccess: req.hotelAccess,
      bookingId: id.trim(),
      newStatus: status.trim(),
      reason: reason || '',
    });

    recordAuditLog({
      actor_user_id: req.user?.user_id || req.hotelAccess?.userId,
      action_cd: '2', // UPD
      entity_name: 't_booking',
      entity_id: id.trim(),
      new_data: {
        status: result.status,
        reason: reason || null,
        booking_ref: result.booking_ref,
      },
      req,
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
