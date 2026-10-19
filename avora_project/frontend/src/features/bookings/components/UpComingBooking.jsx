import React from 'react';

const UpComingBooking = ({ bookings, icons, actions, formatVnd, formatStayDate, isConfirmedBooking }) => {
  const {
    HotelBuildingIcon, ClockIcon, KeyCardIcon, StarIcon, MapPinIcon, CalendarDaysIcon,
    TagDiscountIcon, BedDoubleIcon, RoomSizeIcon, GuestsIcon, CheckIcon, VoucherIcon,
    GuestEditIcon, CalendarEditIcon, CalendarCancelIcon,
  } = icons;

  return (
    <section className="my-bookings-section">
      <div className="my-bookings-section-header">
        <h2 className="my-bookings-section-title"><span className="my-bookings-dot-green" />Chuyến Đi Sắp Tới Của Bạn</h2>
        <span className="my-bookings-section-badge-right">Hỗ trợ nhận phòng 24/7 trực tuyến</span>
      </div>

      {bookings.map((booking) => (
        <div key={booking.booking_id} className="my-bookings-hero-card">
          <div className="my-bookings-hero-media">
            {booking.hotel.thumbnail_url ? (
              <img
                src={booking.hotel.thumbnail_url}
                alt={booking.hotel.name}
                className="my-bookings-hero-img"
                onError={(event) => {
                  event.target.style.display = 'none';
                  const fallback = event.target.parentElement?.querySelector('.my-bookings-img-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="my-bookings-img-fallback" style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}>
              <div className="my-bookings-fallback-icon-wrap"><HotelBuildingIcon width="34" height="34" /></div>
              <span className="my-bookings-fallback-main">Hình ảnh chỗ nghỉ</span>
              <span className="my-bookings-fallback-sub">Đang đồng bộ từ hệ thống lưu trú</span>
            </div>
            <div className="my-bookings-hero-badges-top">
              <span className="my-bookings-badge-time"><ClockIcon width="13" height="13" /><span>{booking.stay.days_left_text}</span></span>
              <span className="my-bookings-badge-checkin"><KeyCardIcon width="13" height="13" /><span>Check-in trực tuyến mở trước 24h</span></span>
            </div>
          </div>

          <div className="my-bookings-hero-body">
            <div>
              <div className="my-bookings-hero-top-meta">
                <div className="my-bookings-hotel-stars">
                  {booking.hotel.star_quality > 0 && (
                    <>
                      <span className="my-bookings-stars-icons" aria-label={`Khách sạn ${booking.hotel.star_quality} sao`}>
                        {Array.from({ length: booking.hotel.star_quality }).map((_, index) => <StarIcon key={index} width="13" height="13" />)}
                      </span>
                      <span className="my-bookings-badge-hotel-class">Khách Sạn {booking.hotel.star_quality} Sao</span>
                    </>
                  )}
                </div>

                {booking.hotel.rating_score != null && (
                  <div className="my-bookings-rating-score-box">
                    <div className="my-bookings-rating-text">
                      <div className="my-bookings-rating-text-label">
                        {booking.hotel.rating_score >= 9 ? 'Xuất sắc' : booking.hotel.rating_score >= 8 ? 'Tuyệt vời' : 'Đánh giá tốt'}
                      </div>
                      <div className="my-bookings-rating-text-count">
                        {booking.hotel.review_count > 0 ? `${booking.hotel.review_count} đánh giá (t_review)` : ' '}
                      </div>
                    </div>
                    <div className="my-bookings-rating-number">{booking.hotel.rating_score}</div>
                  </div>
                )}
              </div>

              <h3 className="my-bookings-hero-hotel-name">
                <span>{booking.hotel.name}</span>
                <button
                  type="button"
                  className="my-bookings-view-map-link"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.hotel.name} ${booking.hotel.address}`)}`, '_blank', 'noopener,noreferrer')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Xem trên bản đồ</span><MapPinIcon width="12" height="12" />
                </button>
              </h3>

              <p className="my-bookings-hero-address"><MapPinIcon width="14" height="14" /><span>{booking.hotel.address}</span></p>

              <div className="my-bookings-booking-meta">
                <span><CalendarDaysIcon width="14" height="14" />Ngày đặt phòng: <strong>{booking.booking_date_formatted || new Date(booking.created_at).toLocaleDateString('vi-VN')}</strong></span>
                {booking.coupon?.code && (
                  <span className="my-bookings-coupon-meta"><TagDiscountIcon width="13" height="13" />Voucher/Coupon: {booking.coupon.code} ({booking.coupon.discount_text})</span>
                )}
              </div>

              <div className="my-bookings-stay-grid">
                <div className="my-bookings-stay-col"><span className="my-bookings-stay-label">NHẬN PHÒNG (CHECK-IN)</span><span className="my-bookings-stay-time">{formatStayDate(booking.stay.check_in_date)}</span></div>
                <div className="my-bookings-stay-col"><span className="my-bookings-stay-label">TRẢ PHÒNG (CHECK-OUT)</span><span className="my-bookings-stay-time">{formatStayDate(booking.stay.check_out_date)} ({booking.stay.nights} đêm)</span></div>
                <div className="my-bookings-stay-col">
                  <span className="my-bookings-stay-label">TỔNG CHI PHÍ ĐƠN</span>
                  <span className="my-bookings-stay-price">{formatVnd(booking.total_amount)}</span>
                  <span className="my-bookings-stay-price-sub">{booking.discount_amount > 0 ? `Đã giảm ${formatVnd(booking.discount_amount)}` : `${booking.stay.quantity} phòng × ${booking.stay.nights} đêm`}</span>
                </div>
              </div>

              <div className="my-bookings-room-amenities-line">
                <span className="my-bookings-room-bullet-item"><BedDoubleIcon width="15" height="15" /><span>{booking.stay.room_type_name || 'Hạng phòng tiêu chuẩn'}{booking.stay.quantity > 1 ? ` (×${booking.stay.quantity})` : ''}</span></span>
                {booking.stay.bed_type && <><span className="my-bookings-bullet-divider">•</span><span className="my-bookings-room-bullet-item"><BedDoubleIcon width="14" height="14" /><span>{booking.stay.bed_type}</span></span></>}
                {booking.stay.room_size && <><span className="my-bookings-bullet-divider">•</span><span className="my-bookings-room-bullet-item"><RoomSizeIcon width="14" height="14" /><span>{booking.stay.room_size}</span></span></>}
                <span className="my-bookings-bullet-divider">•</span><span className="my-bookings-room-bullet-item"><GuestsIcon width="14" height="14" /><span>Sức chứa: {booking.stay.guests_summary}</span></span>
                {(booking.stay.facilities || []).map((facility) => (
                  <React.Fragment key={facility.facility_id || facility.facility_name}>
                    <span className="my-bookings-bullet-divider">•</span><span className="my-bookings-room-bullet-item my-bookings-room-bullet-item--green"><CheckIcon width="12" height="12" /><span>{facility.facility_name}</span></span>
                  </React.Fragment>
                ))}
              </div>
              {booking.special_request && <div className="my-bookings-special-request"><strong>Ghi chú / Yêu cầu đặc biệt:</strong> {booking.special_request}</div>}
            </div>

            <div className="my-bookings-hero-actions">
              <button type="button" className="my-bookings-btn-primary" onClick={() => actions.openVoucher(booking)}><VoucherIcon width="15" height="15" /><span>Xem chi tiết &amp; Voucher</span></button>
              <button type="button" className="my-bookings-btn-secondary" onClick={() => actions.openEditGuest(booking)}><GuestEditIcon width="15" height="15" /><span>Cập nhật thông tin booking</span></button>
              <button type="button" className="my-bookings-btn-secondary" onClick={() => actions.openDateChange(booking)}><CalendarEditIcon width="15" height="15" /><span>Đổi ngày nhận/trả phòng</span></button>
              {isConfirmedBooking(booking.booking_status_cd) && <button type="button" className="my-bookings-btn-secondary my-bookings-review-button" onClick={() => actions.openReview(booking)}><StarIcon width="14" height="14" /><span>Đánh giá</span></button>}
              <button type="button" className="my-bookings-btn-danger" onClick={() => actions.openCancel(booking)}><CalendarCancelIcon width="15" height="15" /><span>Hủy đặt phòng</span></button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default UpComingBooking;