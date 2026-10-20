'use strict';

const bookingService = require('./booking.service');
const {
  validateBookingPayload,
  validateBookingSelection,
  validateGuestInfoPayload,
} = require('./booking.validation');

/**
 * Controller handling customer booking actions.
 */

const calculatePricing = async (req, res, next) => {
  try {
    const { isValid, errors } = validateBookingSelection(req.body);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: errors[0],
        errors,
      });
    }

    const result = await bookingService.calculatePricing(req.body);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const { isValid, errors } = validateBookingPayload(req.body);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: errors[0],
        errors,
      });
    }

    const bookingResult = await bookingService.createBooking(req.body, req.user);
    return res.status(201).json({
      status: 'success',
      message: 'Đặt phòng thành công! Đơn đặt chỗ đã được ghi nhận.',
      data: bookingResult,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await bookingService.getBookingById(id);
    return res.status(200).json({
      status: 'success',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user?.user_id || req.query.user_id || null;
    const guestPhone = req.query.guest_phone || null;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const timeRange = req.query.timeRange || 'all';

    const result = await bookingService.getMyBookings({
      userId,
      guestPhone,
      search,
      status,
      timeRange,
    });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateBookingGuestInfo = async (req, res, next) => {
  try {
    const { isValid, errors } = validateGuestInfoPayload(req.body);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: errors[0],
        errors,
      });
    }

    const { id } = req.params;
    const updated = await bookingService.updateBookingGuestInfo(id, req.body, req.user);
    return res.status(200).json({
      status: 'success',
      message: 'Cập nhật thông tin đơn đặt phòng thành công!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const changeBookingDates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await bookingService.changeBookingDates(id, req.body, req.user);
    return res.status(200).json({
      status: 'success',
      message: 'Đổi ngày lưu trú thành công!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await bookingService.cancelBooking(id, req.body, req.user);
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucher = await bookingService.getBookingVoucher(id);
    return res.status(200).json({
      status: 'success',
      data: voucher,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await bookingService.getBookingInvoice(id);
    return res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculatePricing,
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingGuestInfo,
  changeBookingDates,
  cancelBooking,
  getBookingVoucher,
  getBookingInvoice,
};
