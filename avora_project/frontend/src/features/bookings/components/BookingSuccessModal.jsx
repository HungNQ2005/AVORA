import React from 'react';

/**
 * Handover Modal shown after booking creation succeeds in DB.
 */
const BookingSuccessModal = ({ bookingData, onClose, onViewMyBookings }) => {
  if (!bookingData) return null;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-box">
        <div className="booking-modal-success-icon">✓</div>
        <h3 className="booking-modal-title">Đặt phòng thành công!</h3>
        <p className="booking-modal-desc">
          Đơn đặt chỗ của bạn đã được lưu vào cơ sở dữ liệu với trạng thái chờ thanh toán.
        </p>

        <div className="booking-modal-info-card">
          <div className="booking-modal-info-row">
            <span className="booking-modal-info-label">Mã đơn đặt phòng:</span>
            <span className="booking-modal-info-val" style={{ fontFamily: 'monospace', color: '#003580' }}>
              {bookingData.booking_code || bookingData.booking_id}
            </span>
          </div>
          <div className="booking-modal-info-row">
            <span className="booking-modal-info-label">Khách nhận phòng:</span>
            <span className="booking-modal-info-val">{bookingData.guest_name}</span>
          </div>
          <div className="booking-modal-info-row">
            <span className="booking-modal-info-label">Số điện thoại:</span>
            <span className="booking-modal-info-val">{bookingData.guest_phone}</span>
          </div>
          <div className="booking-modal-info-row">
            <span className="booking-modal-info-label">Trạng thái đơn:</span>
            <span className="booking-modal-info-val" style={{ color: '#d97706', fontWeight: 600 }}>
              Chờ thanh toán
            </span>
          </div>
          {bookingData.coupon_applied && (
            <div className="booking-modal-info-row">
              <span className="booking-modal-info-label">Mã giảm giá đã áp dụng:</span>
              <span className="booking-modal-info-val" style={{ color: '#059669' }}>
                {bookingData.coupon_applied} (-{Number(bookingData.discount_amount || 0).toLocaleString('vi-VN')} đ)
              </span>
            </div>
          )}
          <div className="booking-modal-info-row">
            <span className="booking-modal-info-label">Tổng tiền đơn hàng:</span>
            <span className="booking-modal-info-val" style={{ color: '#059669', fontSize: 15 }}>
              {Number(bookingData.total_amount || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="booking-modal-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="booking-modal-btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            type="button"
            className="booking-modal-btn-primary"
            onClick={onViewMyBookings}
          >
            Xem đơn đặt chỗ của tôi
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessModal;
