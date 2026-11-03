'use strict';

const supabase = require('../../config/supabaseClient');
const bookingService = require('../bookings/booking.service');
const { validateStayDates } = require('../bookings/booking.validation');
const { sendMail } = require('../../common/services/email/email.service');

const createError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const getVietnamToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const formatBookingCode = (bookingId, createdAt) => {
  const date = createdAt ? new Date(createdAt) : new Date();
  return `AV-${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear() % 100).padStart(2, '0')}-${String(bookingId || '').slice(0, 4).toUpperCase()}`;
};
const hasPayment = (transactions) => (transactions || []).some((payment) => (
  Number(payment.amount_paid) > 0 || Boolean(payment.paid_at)
));
const addCalendarMonth = (dateOnly) => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
};
const formatDate = (value) => value ? String(value).slice(0, 10) : '';
const isReadOnlyBookingStatus = (status) => [
  'CAN',
  'CANCELLED',
  'CHECKED_OUT',
  'COMPLETED',
  'COMPLETE',
].includes(String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_'));

const assertHotelOwnership = async (hotelId, vendorId) => {
  const { data: hotel, error } = await supabase.from('m_hotel')
    .select('hotel_id, name, owner_id')
    .eq('hotel_id', hotelId)
    .eq('owner_id', vendorId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (!hotel) throw createError(404, 'Không tìm thấy khách sạn thuộc quyền quản lý của bạn.');
  return hotel;
};

const getBookingStatusNames = async () => {
  const { data, error } = await supabase.from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BOOKING_STS');
  if (error) throw error;
  return new Map((data || []).flatMap((row) => [
    [String(row.code_cd), String(row.code_name).toUpperCase()],
    [String(row.code_name).toUpperCase(), String(row.code_name).toUpperCase()],
  ]));
};

const listHotelBookings = async (hotelId, vendorId, query) => {
  const hotel = await assertHotelOwnership(hotelId, vendorId);
  const [{ data: bookingRows, error }, statusNames] = await Promise.all([
    supabase.from('t_booking').select(`
      booking_id, user_id, hotel_id, total_amount, guest_name, guest_phone, special_request,
      booking_status_cd, created_at, updated_at,
      m_user(user_id, full_name, email),
      t_booking_detail(
        booking_detail_id, room_type_id, check_in_date, check_out_date, quantity, unit_price,
        m_room_type(room_type_id, type_name, max_adults, max_children, bed_type, room_size)
      ),
      t_payment_transaction(transaction_id, amount_paid, paid_at, is_refunded, created_at)
    `).eq('hotel_id', hotelId).order('created_at', { ascending: false }),
    getBookingStatusNames(),
  ]);
  if (error) throw error;

  const today = getVietnamToday();
  const paidBookings = (bookingRows || []).filter((booking) => hasPayment(booking.t_payment_transaction));
  const filtered = paidBookings.filter((booking) => {
    const details = booking.t_booking_detail || [];
    if (!details.length) return false;
    const statusName = statusNames.get(String(booking.booking_status_cd || '').toUpperCase()) || '';
    const checkIn = details.map((detail) => formatDate(detail.check_in_date)).sort()[0];
    const checkOut = details.map((detail) => formatDate(detail.check_out_date)).sort().reverse()[0];
    if (query.status === 'cancelled' && statusName !== 'CAN') return false;
    if (query.status === 'in_use' && (statusName === 'CAN' || checkIn > today || checkOut <= today)) return false;
    if (query.status === 'completed' && (statusName === 'CAN' || checkOut > today)) return false;
    if (query.status !== 'cancelled' && statusName === 'CAN' && query.status !== 'all') return false;
    if (query.check_in_date && checkIn !== query.check_in_date) return false;
    if (query.check_out_date && checkOut !== query.check_out_date) return false;
    return true;
  });

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const items = filtered.slice(start, start + query.limit).map((booking) => {
    const statusName = statusNames.get(String(booking.booking_status_cd || '').toUpperCase()) || '';
    const checkInDate = booking.t_booking_detail.map((detail) => formatDate(detail.check_in_date)).sort()[0];
    const checkOutDate = booking.t_booking_detail.map((detail) => formatDate(detail.check_out_date)).sort().reverse()[0];
    return {
      booking_id: booking.booking_id,
      booking_code: formatBookingCode(booking.booking_id, booking.created_at),
      booking_status_cd: statusName || booking.booking_status_cd,
      total_amount: Number(booking.total_amount || 0),
      created_at: booking.created_at,
      guest: {
        name: booking.guest_name || booking.m_user?.full_name || '',
        phone: booking.guest_phone || '',
        email: booking.m_user?.email || '',
      },
      hotel: { hotel_id: hotelId, name: hotel.name },
      special_request: booking.special_request || '',
      is_paid: true,
      payment_amount: (booking.t_payment_transaction || []).reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0),
      stay: {
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        rooms: booking.t_booking_detail.map((detail) => ({
          booking_detail_id: detail.booking_detail_id,
          room_type_id: detail.room_type_id,
          room_type: detail.m_room_type?.type_name || 'Phòng',
          quantity: Number(detail.quantity || 0),
          guests_per_room: Number(detail.m_room_type?.max_adults || 0) + Number(detail.m_room_type?.max_children || 0),
          bed_type: detail.m_room_type?.bed_type || '',
          room_size: detail.m_room_type?.room_size || '',
        })),
      },
      is_editable: !isReadOnlyBookingStatus(statusName) && checkOutDate > today,
    };
  });
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
};

const getOwnedPaidBooking = async (hotelId, bookingId, vendor) => {
  await assertHotelOwnership(hotelId, vendor.userId);
  const user = { ...vendor, user_id: vendor.userId, role_code_name: 'VEN' };
  const booking = await bookingService.getBookingById(bookingId, user, { allowHotelOwner: true });
  if (String(booking.hotel_id) !== String(hotelId)) throw createError(404, 'Không tìm thấy đơn đặt phòng của khách sạn này.');
  if (!hasPayment(booking.t_payment_transaction)) throw createError(409, 'Chỉ được quản lý đơn đặt phòng đã thanh toán.');
  const names = await getBookingStatusNames();
  const statusName = names.get(String(booking.booking_status_cd || '').toUpperCase()) || '';
  if (isReadOnlyBookingStatus(statusName)) {
    if (statusName === 'CAN' || statusName === 'CANCELLED') {
      throw createError(409, 'Đơn đặt phòng đã bị hủy.');
    }
    throw createError(409, 'Không thể chỉnh sửa đơn đặt phòng đã trả phòng.');
  }
  const checkOut = (booking.t_booking_detail || [])
    .map((detail) => formatDate(detail.check_out_date))
    .sort()
    .reverse()[0];
  if (!checkOut) throw createError(409, 'Đơn đặt phòng không có ngày trả phòng hợp lệ.');
  if (checkOut <= getVietnamToday()) {
    throw createError(409, 'Không thể chỉnh sửa đơn đặt phòng sau ngày trả phòng.');
  }
  return { booking, user };
};

const sendBookingNotice = async (email, templateData, subject) => {
  if (!email) return;
  try {
    const result = await sendMail({ to: email, subject, templateName: 'vendorBookingNotice', templateData });
    if (!result.success) console.error(`[VENDOR BOOKING] Guest email failed: ${result.error || 'unknown error'}`);
  } catch (error) {
    console.error(`[VENDOR BOOKING] Guest email failed: ${error.message}`);
  }
};

const getGuestEmail = async (userId) => {
  const { data: guest, error } = await supabase.from('m_user').select('email')
    .eq('user_id', userId).maybeSingle();
  if (error) {
    console.error(`[VENDOR BOOKING] Guest email lookup failed: ${error.message}`);
    return null;
  }
  return guest?.email || null;
};

const cancelHotelBooking = async (hotelId, bookingId, vendor, reason) => {
  const { booking, user } = await getOwnedPaidBooking(hotelId, bookingId, vendor);
  const details = booking.t_booking_detail || [];
  if (!details.length) throw createError(409, 'Đơn đặt phòng không có thông tin lưu trú.');
  const checkIn = details.map((detail) => formatDate(detail.check_in_date)).sort()[0];
  const checkOut = details.map((detail) => formatDate(detail.check_out_date)).sort().reverse()[0];
  const cutoff = addCalendarMonth(getVietnamToday());
  if (checkIn < cutoff) {
    throw createError(409, 'Chỉ có thể hủy đơn trước ngày nhận phòng ít nhất một tháng.');
  }
  const result = await bookingService.cancelBooking(bookingId, { reason, vendorCancellation: true }, user);
  await sendBookingNotice(await getGuestEmail(booking.user_id), {
    action: 'hủy',
    bookingCode: formatBookingCode(booking.booking_id, booking.created_at),
    hotelName: booking.m_hotel?.name || 'khách sạn',
    reason,
    checkIn,
    checkOut,
  }, 'Thông báo hủy đặt phòng từ khách sạn');
  return result;
};

const changeHotelBookingDates = async (hotelId, bookingId, vendor, input) => {
  const { booking } = await getOwnedPaidBooking(hotelId, bookingId, vendor);
  const dateErrors = validateStayDates(input.check_in_date, input.check_out_date);
  if (dateErrors.length) throw createError(400, dateErrors[0]);
  const details = booking.t_booking_detail || [];
  if (!details.length) throw createError(409, 'Đơn đặt phòng không có thông tin lưu trú.');
  const oldCheckIn = details.map((detail) => formatDate(detail.check_in_date)).sort()[0];
  const cutoff = addCalendarMonth(getVietnamToday());
  if (oldCheckIn < cutoff || input.check_in_date < cutoff) {
    throw createError(409, 'Chỉ có thể đổi ngày khi ngày nhận phòng cũ và mới đều cách hiện tại ít nhất một tháng.');
  }
  const oldCheckOut = details.map((detail) => formatDate(detail.check_out_date)).sort().reverse()[0];
  const rooms = details.map((detail) => ({ room_type_id: detail.room_type_id, quantity: detail.quantity }));
  const oldNights = new Set();
  details.forEach((detail) => {
    for (let date = new Date(`${formatDate(detail.check_in_date)}T00:00:00.000Z`);
      date < new Date(`${formatDate(detail.check_out_date)}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1)) {
      oldNights.add(`${detail.room_type_id}:${date.toISOString().slice(0, 10)}`);
    }
  });
  const newNights = new Set();
  rooms.forEach((room) => {
    for (let date = new Date(`${input.check_in_date}T00:00:00.000Z`);
      date < new Date(`${input.check_out_date}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1)) {
      newNights.add(`${room.room_type_id}:${date.toISOString().slice(0, 10)}`);
    }
  });
  const addedNights = new Set([...newNights].filter((night) => !oldNights.has(night)));
  const removedNights = new Set([...oldNights].filter((night) => !newNights.has(night)));
  let reserved = false;
  const changed = [];
  try {
    if (addedNights.size) {
      await bookingService.adjustInventoryForStay(rooms, input.check_in_date, input.check_out_date, 1, bookingId, addedNights);
      reserved = true;
    }
    for (const detail of details) {
      const { error } = await supabase.from('t_booking_detail')
        .update({
          check_in_date: input.check_in_date,
          check_out_date: input.check_out_date,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_detail_id', detail.booking_detail_id);
      if (error) throw error;
      changed.push(detail);
    }
    if (removedNights.size) {
      await bookingService.adjustInventoryForStay(rooms, oldCheckIn, oldCheckOut, -1, bookingId, removedNights);
    }
  } catch (error) {
    for (const detail of changed.reverse()) {
      const { error: rollbackError } = await supabase.from('t_booking_detail')
        .update({ check_in_date: detail.check_in_date, check_out_date: detail.check_out_date })
        .eq('booking_detail_id', detail.booking_detail_id);
      if (rollbackError) console.error(`[VENDOR BOOKING] Date rollback failed: ${rollbackError.message}`);
    }
    if (reserved) {
      try {
        await bookingService.adjustInventoryForStay(rooms, input.check_in_date, input.check_out_date, -1, bookingId, addedNights);
      } catch (rollbackError) {
        console.error(`[VENDOR BOOKING] Inventory rollback failed: ${rollbackError.message}`);
      }
    }
    throw error;
  }
  await sendBookingNotice(await getGuestEmail(booking.user_id), {
    action: 'thay đổi ngày lưu trú',
    bookingCode: formatBookingCode(booking.booking_id, booking.created_at),
    hotelName: booking.m_hotel?.name || 'khách sạn',
    reason: input.reason,
    checkIn: input.check_in_date,
    checkOut: input.check_out_date,
  }, 'Thông báo thay đổi ngày lưu trú');
  return {
    booking_id: bookingId,
    check_in_date: input.check_in_date,
    check_out_date: input.check_out_date,
    reason: input.reason,
  };
};

const changeHotelBookingRoomType = async (hotelId, bookingId, vendor, input) => {
  const { booking } = await getOwnedPaidBooking(hotelId, bookingId, vendor);
  const detail = booking.t_booking_detail.find((row) => String(row.booking_detail_id) === String(input.booking_detail_id));
  if (!detail) throw createError(404, 'Không tìm thấy hạng phòng trong đơn đặt phòng.');
  if (String(detail.room_type_id) === String(input.room_type_id)) {
    throw createError(400, 'Hạng phòng mới phải khác hạng phòng hiện tại.');
  }
  const { data: roomType, error: typeError } = await supabase.from('m_room_type')
    .select('room_type_id, hotel_id, type_name, is_deleted')
    .eq('room_type_id', input.room_type_id)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  if (typeError) throw typeError;
  if (!roomType || roomType.is_deleted) throw createError(404, 'Hạng phòng mới không thuộc khách sạn này hoặc đã ngừng hoạt động.');

  const checkIn = formatDate(detail.check_in_date);
  const checkOut = formatDate(detail.check_out_date);
  const movedRoom = [{ room_type_id: input.room_type_id, quantity: detail.quantity }];
  await bookingService.adjustInventoryForStay(movedRoom, checkIn, checkOut, 1, bookingId);
  const { error: updateError } = await supabase.from('t_booking_detail')
    .update({ room_type_id: input.room_type_id, updated_at: new Date().toISOString() })
    .eq('booking_detail_id', detail.booking_detail_id);
  if (updateError) {
    try {
      await bookingService.adjustInventoryForStay(movedRoom, checkIn, checkOut, -1, bookingId);
    } catch (rollbackError) {
      console.error(`[VENDOR BOOKING] Room inventory rollback failed: ${rollbackError.message}`);
    }
    throw updateError;
  }
  try {
    await bookingService.adjustInventoryForStay(
      [{ room_type_id: detail.room_type_id, quantity: detail.quantity }],
      checkIn,
      checkOut,
      -1,
      bookingId
    );
  } catch (error) {
    const { error: updateRollbackError } = await supabase.from('t_booking_detail')
      .update({ room_type_id: detail.room_type_id })
      .eq('booking_detail_id', detail.booking_detail_id);
    try {
      await bookingService.adjustInventoryForStay(movedRoom, checkIn, checkOut, -1, bookingId);
    } catch (inventoryRollbackError) {
      console.error(`[VENDOR BOOKING] Room inventory rollback failed: ${inventoryRollbackError.message}`);
    }
    if (updateRollbackError) console.error(`[VENDOR BOOKING] Room change rollback failed: ${updateRollbackError.message}`);
    throw error;
  }
  await sendBookingNotice(await getGuestEmail(booking.user_id), {
    action: 'thay đổi hạng phòng',
    bookingCode: formatBookingCode(booking.booking_id, booking.created_at),
    hotelName: booking.m_hotel?.name || 'khách sạn',
    reason: input.reason,
    oldRoom: detail.m_room_type?.type_name || 'Phòng đã đặt',
    newRoom: roomType.type_name,
    checkIn,
    checkOut,
  }, 'Thông báo thay đổi hạng phòng');
  return {
    booking_id: bookingId,
    booking_detail_id: detail.booking_detail_id,
    room_type_id: roomType.room_type_id,
    room_type: roomType.type_name,
    reason: input.reason,
  };
};

module.exports = {
  listHotelBookings,
  cancelHotelBooking,
  changeHotelBookingDates,
  changeHotelBookingRoomType,
};
