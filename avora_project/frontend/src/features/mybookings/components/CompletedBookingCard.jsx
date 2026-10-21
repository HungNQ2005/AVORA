import React from 'react';
import {
  HotelBuildingIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MapPinIcon,
  FolioInvoiceIcon,
  VoucherIcon,
} from './BookingIcons';
import { formatVnd, parseIsoToDate } from './bookingCardHelpers';

/**
 * Compact Card: Kỳ Nghỉ Đã Hoàn Thành
 */
const CompletedBookingCard = ({
  booking,
  onRebook,
  onOpenInvoice,
  onOpenVoucher,
}) => {
  return (
    <div className="my-bookings-compact-card">
      {/* Thumbnail */}
      <div className="my-bookings-compact-thumb-wrap">
        {booking.hotel.thumbnail_url ? (
          <img
            src={booking.hotel.thumbnail_url}
            alt={booking.hotel.name}
            className="my-bookings-compact-thumb"
            onError={(e) => {
              e.target.style.display = 'none';
              const fb = e.target.parentElement?.querySelector('.my-bookings-compact-fallback');
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="my-bookings-compact-fallback"
          style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}
        >
          <HotelBuildingIcon width="24" height="24" />
          <span>Avora Stay</span>
        </div>
      </div>

      {/* Body */}
      <div className="my-bookings-compact-body">
        <div className="my-bookings-compact-tag-row">
          <span className="my-bookings-compact-stay-time" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CalendarDaysIcon width="13" height="13" />
            <span>Đã lưu trú Tháng {new Date(booking.stay.check_in_date).getMonth() + 1}/{new Date(booking.stay.check_in_date).getFullYear()}</span>
          </span>
          <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircleIcon width="12" height="12" />
            <span>{booking.status_name}</span>
          </span>
        </div>

        <h4 className="my-bookings-compact-name">{booking.hotel.name}</h4>
        <p className="my-bookings-compact-address" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <MapPinIcon width="13" height="13" />
          <span>{booking.hotel.address}</span>
        </p>

        <p className="my-bookings-compact-stay-details">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CalendarDaysIcon width="12" height="12" />
            <span>Ngày đặt: {parseIsoToDate(booking.created_at)?.toLocaleDateString('vi-VN')}</span>
          </span> • Lưu trú: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
        </p>

        <div className="my-bookings-compact-payment-line">
          <span>Tổng cộng: <strong>{formatVnd(booking.total_amount)}</strong></span>
          <span>•</span>
          <span className="my-bookings-compact-payment-method">
            Trạng thái: {booking.status_name}
            {booking.payment?.is_paid ? ` • ${booking.payment.payment_method}` : ''}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="my-bookings-compact-actions">
        <button
          type="button"
          className="my-bookings-compact-btn-primary"
          onClick={onRebook}
        >
          <CalendarDaysIcon width="13" height="13" />
          <span>Đặt lại phòng này</span>
        </button>

        <button
          type="button"
          className="my-bookings-compact-btn-secondary"
          onClick={() => onOpenInvoice(booking)}
        >
          <FolioInvoiceIcon width="13" height="13" />
          <span>Xem hóa đơn VAT</span>
        </button>

        <span
          className="my-bookings-compact-link"
          onClick={() => onOpenVoucher(booking)}
        >
          <VoucherIcon width="12" height="12" />
          <span>Xem lại hóa đơn &amp; voucher</span>
        </span>
      </div>
    </div>
  );
};

export default CompletedBookingCard;
