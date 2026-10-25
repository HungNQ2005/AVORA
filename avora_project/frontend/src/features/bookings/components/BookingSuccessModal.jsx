import React, { useEffect, useState } from 'react';

const PAYMENT_HOLD_MS = 10 * 60 * 1000;

const parseIsoToDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr).trim();
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Handover Modal shown after booking creation succeeds in DB.
 */
const BookingSuccessModal = ({ bookingData, onClose, onViewMyBookings, onPayNow }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = (() => {
    if (!bookingData?.created_at) return null;

    const createdAt = parseIsoToDate(bookingData.created_at);
    if (!createdAt) return null;

    const deadline = new Date(createdAt.getTime() + PAYMENT_HOLD_MS);
    const remainingMs = Math.max(0, deadline.getTime() - now);
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      expired: remainingMs <= 0,
    };
  })();

  if (!bookingData) return null;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-box">
        <div className="booking-modal-success-icon">✓</div>
        <h3 className="booking-modal-title">Đặt phòng thành công!</h3>
        <p className="booking-modal-desc">
          Đơn đặt chỗ của bạn đã được tiếp nhận thành công với trạng thái chờ thanh toán.
        </p>

        {countdown && (
          <div className={`booking-modal-payment-countdown ${countdown.expired ? 'is-expired' : ''}`}>
            <span className="booking-modal-payment-countdown-icon" aria-hidden="true">
              {countdown.expired ? '!' : 'i'}
            </span>
            <div className="booking-modal-payment-countdown-content">
              <strong>
                {countdown.expired
                  ? 'Đơn đặt phòng đã hết hạn'
                  : 'Vui lòng hoàn tất thanh toán trong 10 phút'}
              </strong>
              <span>
                {countdown.expired
                  ? 'Đơn sẽ được hệ thống tự động hủy.'
                  : <>Nếu không thanh toán, đơn sẽ tự động hủy sau <b>{countdown.label}</b>.</>}
              </span>
            </div>
          </div>
        )}

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
          {onPayNow && !countdown?.expired && (
            <button
              type="button"
              className="booking-modal-btn-primary"
              onClick={onPayNow}
            >
              Thanh toán ngay
            </button>
          )}
          <button
            type="button"
            className={onPayNow && !countdown?.expired ? 'booking-modal-btn-secondary' : 'booking-modal-btn-primary'}
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
