const CompleteBooking = ({ bookings, icons, actions, formatVnd, navigate, isConfirmedBooking }) => {
  const { HotelBuildingIcon, CalendarDaysIcon, CheckCircleIcon, MapPinIcon, FolioInvoiceIcon, StarIcon, VoucherIcon } = icons;

  return (
    <section className="my-bookings-section">
      <div className="my-bookings-section-header">
        <h2 className="my-bookings-section-title"><span className="my-bookings-dot-blue" />Kỳ Nghỉ Đã Hoàn Thành</h2>
        <span className="my-bookings-section-count-right">{bookings.length} kỳ nghỉ lưu trú tuyệt vời cùng Avora</span>
      </div>
      {bookings.map((booking) => (
        <div key={booking.booking_id} className="my-bookings-compact-card">
          <div className="my-bookings-compact-thumb-wrap">
            {booking.hotel.thumbnail_url ? (
              <img src={booking.hotel.thumbnail_url} alt={booking.hotel.name} className="my-bookings-compact-thumb" onError={(event) => {
                event.target.style.display = 'none';
                const fallback = event.target.parentElement?.querySelector('.my-bookings-compact-fallback');
                if (fallback) fallback.style.display = 'flex';
              }} />
            ) : null}
            <div className="my-bookings-compact-fallback" style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}><HotelBuildingIcon width="24" height="24" /><span>Avora Stay</span></div>
          </div>

          <div className="my-bookings-compact-body">
            <div className="my-bookings-compact-tag-row">
              <span className="my-bookings-compact-stay-time"><CalendarDaysIcon width="13" height="13" />Đã lưu trú Tháng {new Date(booking.stay.check_in_date).getMonth() + 1}/{new Date(booking.stay.check_in_date).getFullYear()}</span>
              <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--success"><CheckCircleIcon width="12" height="12" />{booking.status_name}</span>
            </div>
            <h4 className="my-bookings-compact-name">{booking.hotel.name}</h4>
            <p className="my-bookings-compact-address"><MapPinIcon width="13" height="13" /><span>{booking.hotel.address}</span></p>
            <p className="my-bookings-compact-stay-details">
              <span><CalendarDaysIcon width="12" height="12" />Ngày đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
              {' '}• Lưu trú: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
            </p>
            <div className="my-bookings-compact-payment-line">
              <span>Tổng cộng: <strong>{formatVnd(booking.total_amount)}</strong></span><span>•</span>
              <span className="my-bookings-compact-payment-method">Trạng thái: {booking.status_name}{booking.payment?.is_paid ? ` • ${booking.payment.payment_method}` : ''}</span>
            </div>
          </div>

          <div className="my-bookings-compact-actions">
            <button type="button" className="my-bookings-compact-btn-primary" onClick={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}><CalendarDaysIcon width="13" height="13" /><span>Đặt lại phòng này</span></button>
            <button type="button" className="my-bookings-compact-btn-secondary" onClick={() => actions.openInvoice(booking)}><FolioInvoiceIcon width="13" height="13" /><span>Xem hóa đơn VAT</span></button>
            {isConfirmedBooking(booking.booking_status_cd) && <button type="button" className="my-bookings-compact-btn-secondary my-bookings-review-button" onClick={() => actions.openReview(booking)}><StarIcon width="13" height="13" /><span>Đánh giá</span></button>}
            <button type="button" className="my-bookings-compact-link" onClick={() => actions.openVoucher(booking)}><VoucherIcon width="12" height="12" /><span>Xem lại hóa đơn &amp; voucher</span></button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default CompleteBooking;