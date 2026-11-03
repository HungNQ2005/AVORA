'use strict';

const vendorBookingService = require('./vendor_booking.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getBookings = async (req, res, next) => {
  try {
    const result = await vendorBookingService.listHotelBookings(req.validated.params.id, req.hotelAccess.userId, req.validated.query);
    return sendSuccess(res, 200, 'Lấy danh sách đặt phòng thành công.', result);
  } catch (error) {
    return next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const result = await vendorBookingService.cancelHotelBooking(
      req.validated.params.id,
      req.validated.params.bookingId,
      req.hotelAccess,
      req.validated.body.reason
    );
    return sendSuccess(res, 200, result.message || 'Đã hủy đơn đặt phòng và gửi thông báo cho khách.', result);
  } catch (error) {
    return next(error);
  }
};

const changeDates = async (req, res, next) => {
  try {
    const result = await vendorBookingService.changeHotelBookingDates(
      req.validated.params.id,
      req.validated.params.bookingId,
      req.hotelAccess,
      req.validated.body
    );
    return sendSuccess(res, 200, 'Đã đổi ngày lưu trú và gửi thông báo cho khách.', result);
  } catch (error) {
    return next(error);
  }
};

const changeRoomType = async (req, res, next) => {
  try {
    const result = await vendorBookingService.changeHotelBookingRoomType(
      req.validated.params.id,
      req.validated.params.bookingId,
      req.hotelAccess,
      req.validated.body
    );
    return sendSuccess(res, 200, 'Đã đổi hạng phòng và gửi thông báo cho khách.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getBookings, cancelBooking, changeDates, changeRoomType };
