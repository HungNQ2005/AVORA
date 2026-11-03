import React from 'react';
import './vendorBookingCard.css';

const VendorBookingCard = ({ booking, actionCutoff, statusNames, formatDate, formatMoney, onAction }) => {
  const canEdit = booking.is_editable === true;
  const canChangeDates = canEdit && booking.stay.check_in_date >= actionCutoff;
  const actionDisabledReason = 'Chỉ được thay đổi trước ngày nhận phòng ít nhất một tháng.';

  return (
    <article className="vendor-booking-card">
      <header>
        <div>
          <strong>{booking.booking_code}</strong>
          <span>{booking.guest.name || 'Khách lưu trú'}</span>
        </div>
        <span className={`vendor-booking-status vendor-booking-status--${booking.booking_status_cd}`}>
          {statusNames[booking.booking_status_cd] || booking.booking_status_cd}
        </span>
      </header>
      <div className="vendor-booking-card__body">
        <div className="vendor-booking-card__guest">
          <span>{booking.guest.email || 'Không có email'}</span>
          <span>{booking.guest.phone || 'Không có số điện thoại'}</span>
        </div>
        <div className="vendor-booking-card__stay">
          {booking.stay.rooms.map((room) => (
            <p key={room.booking_detail_id}>
              {room.quantity} × {room.room_type} · {room.guests_per_room} khách/phòng{room.bed_type ? ` · ${room.bed_type}` : ''}
              {canEdit && (
                <button type="button" onClick={() => onAction('room', booking, room)}>Đổi hạng phòng</button>
              )}
            </p>
          ))}
        </div>
        <div className="vendor-booking-card__total">
          <span>Tổng thanh toán</span>
          <strong>{formatMoney(booking.total_amount)}</strong>
        </div>
      </div>
      {booking.special_request && (
        <p className="vendor-booking-card__request"><strong>Yêu cầu:</strong> {booking.special_request}</p>
      )}
      <footer>
        <span>Ngày nhận phòng {formatDate(booking.stay.check_in_date)} · Ngày trả phòng {formatDate(booking.stay.check_out_date)}</span>
        {canEdit && (
          <div>
            <button
              type="button"
              disabled={!canChangeDates}
              title={!canChangeDates ? actionDisabledReason : ''}
              onClick={() => onAction('dates', booking)}
            >Đổi ngày lưu trú</button>
            <button
              type="button"
              className="is-danger"
              disabled={!canChangeDates}
              title={!canChangeDates ? actionDisabledReason : ''}
              onClick={() => onAction('cancel', booking)}
            >Hủy đơn</button>
          </div>
        )}
      </footer>
    </article>
  );
};

export default VendorBookingCard;
