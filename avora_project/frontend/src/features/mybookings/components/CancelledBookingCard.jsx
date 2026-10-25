import React from 'react';
import {
  HotelBuildingIcon,
  CalendarCancelIcon,
  XCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  SearchIcon,
  ReceiptRefundIcon,
} from './BookingIcons';
import { formatVnd, parseIsoToDate } from './bookingCardHelpers';

/**
 * Compact Card: Đơn Đặt Phòng Đã Hủy
 */
const CancelledBookingCard = ({
  booking,
  onRebook,
  onOpenRefundReceipt,
}) => {
  return (
    <div className="my-bookings-compact-card my-bookings-compact-card--cancelled">
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
          <span>Đã hủy</span>
        </div>
      </div>

      {/* Body */}
      <div className="my-bookings-compact-body">
        <div className="my-bookings-compact-tag-row">
          <span className="my-bookings-compact-stay-time" style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CalendarCancelIcon width="13" height="13" />
            <span>Đã hủy ngày {parseIsoToDate(booking.refund?.created_at || booking.updated_at || booking.created_at)?.toLocaleDateString('vi-VN')}</span>
          </span>
          <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircleIcon width="12" height="12" />
            <span>{booking.status_name}{booking.refund?.refund_status_label ? ` • ${booking.refund.refund_status_label}` : ''}</span>
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
          </span> • Dự kiến: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
        </p>

        {/* Refund detail box from t_refund_request */}
        {booking.refund ? (
          <div className="my-bookings-compact-refund-box">
            <span>
              Số tiền hoàn lại:{' '}
              <strong className="my-bookings-compact-refund-amount">
                {formatVnd(booking.refund.refund_amount)}
              </strong>
            </span>
            <div>
              (Mã tham chiếu: {booking.refund.gateway_refund_ref || 'Chưa có'} • Trạng thái:{' '}
              {booking.refund.refund_status_label || booking.refund.refund_status_cd}
              {booking.refund.reason ? ` • ${booking.refund.reason}` : ''})
            </div>
          </div>
        ) : (
          <div className="my-bookings-compact-refund-box">
            <span>Đơn đặt phòng đã hủy</span>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="my-bookings-compact-actions">
        <button
          type="button"
          className="my-bookings-compact-btn-primary"
          onClick={onRebook}
        >
          <SearchIcon width="13" height="13" />
          <span>Tìm lại chỗ nghỉ</span>
        </button>

        <button
          type="button"
          className="my-bookings-compact-btn-secondary"
          onClick={() => onOpenRefundReceipt(booking)}
        >
          <ReceiptRefundIcon width="13" height="13" />
          <span>Biên lai hoàn tiền</span>
        </button>
      </div>
    </div>
  );
};

export default CancelledBookingCard;
