const CanceledBooking = ({ bookings, icons, actions, formatVnd, navigate }) => {
  const { HotelBuildingIcon, CalendarCancelIcon, XCircleIcon, MapPinIcon, CalendarDaysIcon, SearchIcon, ReceiptRefundIcon } = icons;

  return (
    <section className="my-bookings-section">
      <div className="my-bookings-section-header">
        <h2 className="my-bookings-section-title"><span className="my-bookings-dot-gray" />Đơn Đặt Phòng Đã Hủy</h2>
        <span className="my-bookings-section-count-right">{bookings.length} đơn đã hoàn tất hoàn tiền</span>
      </div>
      {bookings.map((booking) => (
        <div key={booking.booking_id} className="my-bookings-compact-card my-bookings-compact-card--cancelled">
          <div className="my-bookings-compact-thumb-wrap">
            {booking.hotel.thumbnail_url ? (
              <img src={booking.hotel.thumbnail_url} alt={booking.hotel.name} className="my-bookings-compact-thumb" onError={(event) => {
                event.target.style.display = 'none';
                const fallback = event.target.parentElement?.querySelector('.my-bookings-compact-fallback');
                if (fallback) fallback.style.display = 'flex';
              }} />
            ) : null}
            <div className="my-bookings-compact-fallback" style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}><HotelBuildingIcon width="24" height="24" /><span>Đã hủy</span></div>
          </div>

          <div className="my-bookings-compact-body">
            <div className="my-bookings-compact-tag-row">
              <span className="my-bookings-compact-stay-time my-bookings-compact-stay-time--cancelled"><CalendarCancelIcon width="13" height="13" />Đã hủy ngày {new Date(booking.refund?.created_at || booking.updated_at || booking.created_at).toLocaleDateString('vi-VN')}</span>
              <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--cancelled"><XCircleIcon width="12" height="12" />{booking.status_name}{booking.refund?.refund_status_label ? ` • ${booking.refund.refund_status_label}` : ''}</span>
            </div>
            <h4 className="my-bookings-compact-name">{booking.hotel.name}</h4>
            <p className="my-bookings-compact-address"><MapPinIcon width="13" height="13" /><span>{booking.hotel.address}</span></p>
            <p className="my-bookings-compact-stay-details">
              <span><CalendarDaysIcon width="12" height="12" />Ngày đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
              {' '}• Dự kiến: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
            </p>
            {booking.refund ? (
              <div className="my-bookings-compact-refund-box">
                <span>Số tiền hoàn lại: <strong className="my-bookings-compact-refund-amount">{formatVnd(booking.refund.refund_amount)}</strong></span>
                <div>(Mã tham chiếu: {booking.refund.gateway_refund_ref || 'Chưa có'} • Trạng thái: {booking.refund.refund_status_label || booking.refund.refund_status_cd}{booking.refund.reason ? ` • ${booking.refund.reason}` : ''})</div>
              </div>
            ) : <div className="my-bookings-compact-refund-box"><span>Đơn đặt phòng đã hủy</span></div>}
          </div>

          <div className="my-bookings-compact-actions">
            <button type="button" className="my-bookings-compact-btn-primary" onClick={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}><SearchIcon width="13" height="13" /><span>Tìm lại chỗ nghỉ</span></button>
            <button type="button" className="my-bookings-compact-btn-secondary" onClick={() => actions.openRefundReceipt(booking)}><ReceiptRefundIcon width="13" height="13" /><span>Biên lai hoàn tiền</span></button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default CanceledBooking;