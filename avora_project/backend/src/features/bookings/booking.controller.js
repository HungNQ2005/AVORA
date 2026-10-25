'use strict';

const bookingService = require('./booking.service');
const {
  validateBookingPayload,
  validateBookingSelection,
  validateBookingListQuery,
  validateGuestInfoPayload,
  validateBookingDateChangePayload,
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
    const booking = await bookingService.getBookingById(id, req.user, { allowHotelOwner: true });
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
    const {
      isValid,
      errors,
      page,
      limit,
      requireVatOnly,
      search,
      status,
      timeRange,
    } = validateBookingListQuery(req.query);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: errors[0],
        errors,
      });
    }

    const result = await bookingService.getMyBookings({
      currentUser: req.user,
      search,
      status,
      timeRange,
      page,
      limit,
      requireVatOnly,
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
    const { isValid, errors } = validateBookingDateChangePayload(req.body);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: errors[0],
        errors,
      });
    }

    const { id } = req.params;
    const result = await bookingService.changeBookingDates(id, req.body, req.user);
    return res.status(200).json({
      status: 'success',
      message: 'Đổi ngày lưu trú thành công!',
      data: result,
    });
  } catch (error) {
    if (error.code === 'COUPON_REMOVAL_CONFIRMATION_REQUIRED') {
      return res.status(409).json({
        status: 'error',
        code: error.code,
        message: error.message,
        data: error.data,
      });
    }
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
    const voucher = await bookingService.getBookingVoucher(id, req.user);
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
    const invoice = await bookingService.getBookingInvoice(id, req.user);
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
