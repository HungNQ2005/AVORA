import React from 'react';
import {
  ClockIcon,
  KeyCardIcon,
  HotelBuildingIcon,
  StarIcon,
  MapPinIcon,
  XCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  TagDiscountIcon,
  BedDoubleIcon,
  RoomSizeIcon,
  GuestsIcon,
  CheckIcon,
  VoucherIcon,
  GuestEditIcon,
  CalendarEditIcon,
  CalendarCancelIcon,
} from './BookingIcons';
import {
  formatVnd,
  formatVnStayDate,
  getBookingCountdown,
  parseIsoToDate,
  canEditBooking,
} from './bookingCardHelpers';

/**
 * Hero Card: Chuyến Đi Sắp Tới Của Bạn
 */
const UpcomingBookingCard = ({
  booking,
  nowMs,
  onOpenVoucher,
  onOpenEditGuest,
  onOpenDateChange,
  onOpenCancel,
}) => {
  const countdown = (booking.status_badge_variant === 'amber' || booking.status_badge_variant === 'pending') &&
    booking.payment?.is_paid !== true
    ? getBookingCountdown(booking, nowMs)
    : null;
  const canEdit = canEditBooking(booking);

  return (
    <div className="my-bookings-hero-card">
      {/* Media Left */}
      <div className="my-bookings-hero-media">
        {booking.hotel.thumbnail_url ? (
          <img
            src={booking.hotel.thumbnail_url}
            alt={booking.hotel.name}
            className="my-bookings-hero-img"
            onError={(e) => {
              e.target.style.display = 'none';
              const fb = e.target.parentElement?.querySelector('.my-bookings-img-fallback');
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="my-bookings-img-fallback"
          style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}
        >
          <div className="my-bookings-fallback-icon-wrap">
            <HotelBuildingIcon width="34" height="34" />
          </div>
          <span className="my-bookings-fallback-main">Hình ảnh chỗ nghỉ</span>
          <span className="my-bookings-fallback-sub">Đang đồng bộ từ hệ thống lưu trú</span>
        </div>

        <div className="my-bookings-hero-badges-top">
          <span className="my-bookings-badge-time">
            <ClockIcon width="13" height="13" />
            <span>{booking.stay.days_left_text}</span>
          </span>
          <span className="my-bookings-badge-checkin">
            <KeyCardIcon width="13" height="13" />
            <span>Check-in trực tuyến mở trước 24h</span>
          </span>
        </div>
      </div>

      {/* Details Right */}
      <div className="my-bookings-hero-body">
        <div>
          {/* Top stars & Rating from DB */}
          <div className="my-bookings-hero-top-meta">
            <div className="my-bookings-hotel-stars">
              {booking.hotel.star_quality > 0 && (
                <>
                  <span className="my-bookings-stars-icons" aria-label={`Khách sạn ${booking.hotel.star_quality} sao`}>
                    {Array.from({ length: booking.hotel.star_quality }).map((_, i) => (
                      <StarIcon key={i} width="13" height="13" />
                    ))}
                  </span>
                  <span className="my-bookings-badge-hotel-class">
                    Khách Sạn {booking.hotel.star_quality} Sao
                  </span>
                </>
              )}
            </div>

            {booking.hotel.rating_score != null && (
              <div className="my-bookings-rating-score-box">
                <div className="my-bookings-rating-text">
                  <div className="my-bookings-rating-text-label">
                    {booking.hotel.rating_score >= 9
                      ? 'Xuất sắc'
                      : booking.hotel.rating_score >= 8
                        ? 'Tuyệt vời'
                        : 'Đánh giá tốt'}
                  </div>
                  <div className="my-bookings-rating-text-count">
                    {booking.hotel.review_count > 0
                      ? `${booking.hotel.review_count} đánh giá `
                      : ' '}
                  </div>
                </div>
                <div className="my-bookings-rating-number">
                  {booking.hotel.rating_score}
                </div>
              </div>
            )}
          </div>

          {/* Hotel Name */}
          <h3 className="my-bookings-hero-hotel-name">
            <span>{booking.hotel.name}</span>
            <span
              className="my-bookings-view-map-link"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.hotel.name + ' ' + booking.hotel.address)}`, '_blank')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span>Xem trên bản đồ</span>
              <MapPinIcon width="12" height="12" />
            </span>
          </h3>

          {/* Address */}
          <p className="my-bookings-hero-address">
            <MapPinIcon width="14" height="14" />
            <span>{booking.hotel.address}</span>
          </p>

          {/* Real booking date from database, Status Badge, Booking Code and Coupon info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0 14px 0', fontSize: 13, color: '#475569' }}>
            <span className={`my-bookings-hero-status-badge my-bookings-hero-status-badge--${booking.status_badge_variant || 'confirmed'}`}>
              {booking.status_badge_variant === 'cancelled' ? (
                <XCircleIcon width="13" height="13" />
              ) : booking.status_badge_variant === 'amber' || booking.status_badge_variant === 'pending' ? (
                <ClockIcon width="13" height="13" />
              ) : (
                <CheckCircleIcon width="13" height="13" />
              )}
              <span>{booking.status_name}</span>
              {countdown && (
                <span
                  className={`my-bookings-payment-timer ${countdown.expired ? 'is-expired' : ''}`}
                  aria-label={countdown.expired ? 'Đã hết thời gian thanh toán' : `Còn ${countdown.label} để thanh toán`}
                >
                  <ClockIcon width="12" height="12" />
                  <span>{countdown.label}</span>
                </span>
              )}
            </span>

            {booking.booking_code && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
                <span>Mã: #{booking.booking_code}</span>
              </span>
            )}

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalendarDaysIcon width="14" height="14" />
              <span>Ngày đặt: <strong>{booking.booking_date_formatted || parseIsoToDate(booking.created_at)?.toLocaleDateString('vi-VN')}</strong></span>
            </span>
            {booking.coupon?.code && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                <TagDiscountIcon width="13" height="13" />
                <span>Voucher: {booking.coupon.code} ({booking.coupon.discount_text})</span>
              </span>
            )}
          </div>

          {/* 3-Column Stay Dates & Pricing Grid */}
          <div className="my-bookings-stay-grid">
            <div className="my-bookings-stay-col">
              <span className="my-bookings-stay-label">NHẬN PHÒNG (CHECK-IN)</span>
              <span className="my-bookings-stay-time">
                {formatVnStayDate(booking.stay.check_in_date)}
              </span>
            </div>

            <div className="my-bookings-stay-col">
              <span className="my-bookings-stay-label">TRẢ PHÒNG (CHECK-OUT)</span>
              <span className="my-bookings-stay-time">
                {formatVnStayDate(booking.stay.check_out_date)} ({booking.stay.nights} đêm)
              </span>
            </div>

            <div className="my-bookings-stay-col">
              <span className="my-bookings-stay-label">TỔNG CHI PHÍ ĐƠN</span>
              <span className="my-bookings-stay-price">
                {formatVnd(booking.total_amount)}
              </span>
              <span className="my-bookings-stay-price-sub">
                {booking.discount_amount > 0
                  ? `Đã giảm ${formatVnd(booking.discount_amount)}`
                  : `${booking.stay.quantity} phòng × ${booking.stay.nights} đêm`}
              </span>
            </div>
          </div>

          {/* Room specs & facilities from DB */}
          <div className="my-bookings-room-amenities-line">
            <span className="my-bookings-room-bullet-item">
              <BedDoubleIcon width="15" height="15" />
              <span>
                {booking.stay.room_type_name || 'Hạng phòng tiêu chuẩn'}
                {booking.stay.quantity > 1 ? ` (×${booking.stay.quantity})` : ''}
              </span>
            </span>
            {booking.stay.bed_type && (
              <>
                <span className="my-bookings-bullet-divider">•</span>
                <span className="my-bookings-room-bullet-item">
                  <BedDoubleIcon width="14" height="14" />
                  <span>{booking.stay.bed_type}</span>
                </span>
              </>
            )}
            {booking.stay.room_size && (
              <>
                <span className="my-bookings-bullet-divider">•</span>
                <span className="my-bookings-room-bullet-item">
                  <RoomSizeIcon width="14" height="14" />
                  <span>{booking.stay.room_size}</span>
                </span>
              </>
            )}
            <span className="my-bookings-bullet-divider">•</span>
            <span className="my-bookings-room-bullet-item">
              <GuestsIcon width="14" height="14" />
              <span>Sức chứa: {booking.stay.guests_summary}</span>
            </span>
            {(booking.stay.facilities || []).map((fac) => (
              <React.Fragment key={fac.facility_id || fac.facility_name}>
                <span className="my-bookings-bullet-divider">•</span>
                <span className="my-bookings-room-bullet-item my-bookings-room-bullet-item--green">
                  <CheckIcon width="12" height="12" />
                  <span>{fac.facility_name}</span>
                </span>
              </React.Fragment>
            ))}
          </div>

          {booking.special_request && (
            <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 10 }}>
              <strong>Ghi chú / Yêu cầu đặc biệt:</strong> {booking.special_request}
            </div>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="my-bookings-hero-actions">
          <button
            type="button"
            className="my-bookings-btn-primary"
            onClick={() => onOpenVoucher(booking)}
          >
            <VoucherIcon width="15" height="15" />
            <span>Xem chi tiết &amp; Voucher</span>
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                className="my-bookings-btn-secondary"
                onClick={() => onOpenEditGuest(booking)}
              >
                <GuestEditIcon width="15" height="15" />
                <span>Cập nhật thông tin booking</span>
              </button>

              <button
                type="button"
                className="my-bookings-btn-secondary"
                onClick={() => onOpenDateChange(booking)}
              >
                <CalendarEditIcon width="15" height="15" />
                <span>Đổi ngày nhận/trả phòng</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="my-bookings-btn-danger"
            onClick={() => onOpenCancel(booking)}
          >
            <CalendarCancelIcon width="15" height="15" />
            <span>Hủy đặt phòng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpcomingBookingCard;
