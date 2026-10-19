'use strict';

/**
 * Validation schema and helpers for Booking requests.
 */

const validateBookingPayload = (body) => {
  const errors = [];

  if (!body.hotel_id) {
    errors.push('hotel_id là bắt buộc.');
  }

  if (!body.check_in_date) {
    errors.push('check_in_date là bắt buộc (định dạng YYYY-MM-DD).');
  }

  if (!body.check_out_date) {
    errors.push('check_out_date là bắt buộc (định dạng YYYY-MM-DD).');
  }

  if (body.check_in_date && body.check_out_date) {
    const checkIn = new Date(body.check_in_date);
    const checkOut = new Date(body.check_out_date);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      errors.push('Ngày nhận phòng hoặc trả phòng không đúng định dạng.');
    } else if (checkOut <= checkIn) {
      errors.push('Ngày trả phòng phải sau ngày nhận phòng.');
    } else {
      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
      if (String(body.check_in_date).trim() < todayStr) {
        errors.push('Không được đặt phòng với ngày nhận phòng ở quá khứ.');
      }
    }
  }

  if (!body.guest_name || !body.guest_name.trim()) {
    errors.push('Họ và tên người nhận phòng là bắt buộc.');
  }

  if (!body.guest_phone || !body.guest_phone.trim()) {
    errors.push('Số điện thoại liên hệ là bắt buộc.');
  }

  if (!Array.isArray(body.rooms) || body.rooms.length === 0) {
    // If room_type_id is provided directly in root, allow fallback
    if (!body.room_type_id) {
      errors.push('Vui lòng chọn ít nhất 1 phòng để đặt.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateBookingPayload,
};
