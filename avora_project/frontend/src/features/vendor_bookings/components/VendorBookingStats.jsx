import React from 'react';
import './VendorBookingStats.css';

const VendorBookingStats = ({ counts = {}, loading = false }) => {
  const total = counts.all || 0;
  const pending = counts.pnd || 0;
  const confirmed = counts.cfm || 0;
  const cancelled = counts.can || 0;

  return (
    <div className="vbooking-stats-grid">
      {/* Thẻ 1: Tổng đơn đặt phòng */}
      <div className="vbooking-stat-card vbooking-stat-card--blue">
        <div className="vbooking-stat-card__top">
          <span className="vbooking-stat-card__label">TỔNG ĐƠN ĐẶT PHÒNG</span>
          <div className="vbooking-stat-card__icon vbooking-stat-card__icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        <div className="vbooking-stat-card__value-row">
          <span className="vbooking-stat-card__value">
            {loading ? '—' : total}
          </span>
          <span className="vbooking-stat-card__unit">đơn</span>
        </div>
        <div className="vbooking-stat-card__footer">
          Toàn bộ lịch sử đặt phòng thuộc cơ sở của bạn
        </div>
      </div>

      {/* Thẻ 2: Chờ xác nhận */}
      <div className="vbooking-stat-card vbooking-stat-card--amber">
        <div className="vbooking-stat-card__top">
          <span className="vbooking-stat-card__label">CHỜ XÁC NHẬN</span>
          <div className="vbooking-stat-card__icon vbooking-stat-card__icon--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>
        <div className="vbooking-stat-card__value-row">
          <span className="vbooking-stat-card__value vbooking-stat-card__value--amber">
            {loading ? '—' : pending}
          </span>
          <span className="vbooking-stat-card__unit">đơn mới</span>
        </div>
        <div className="vbooking-stat-card__footer">
          Cần khách sạn kiểm tra và xác nhận phòng
        </div>
      </div>

      {/* Thẻ 3: Đã xác nhận */}
      <div className="vbooking-stat-card vbooking-stat-card--green">
        <div className="vbooking-stat-card__top">
          <span className="vbooking-stat-card__label">ĐÃ XÁC NHẬN</span>
          <div className="vbooking-stat-card__icon vbooking-stat-card__icon--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
        <div className="vbooking-stat-card__value-row">
          <span className="vbooking-stat-card__value vbooking-stat-card__value--green">
            {loading ? '—' : confirmed}
          </span>
          <span className="vbooking-stat-card__unit">đơn thành công</span>
        </div>
        <div className="vbooking-stat-card__footer">
          Đơn hợp lệ, sẵn sàng đón khách đến lưu trú
        </div>
      </div>

      {/* Thẻ 4: Đã hủy */}
      <div className="vbooking-stat-card vbooking-stat-card--red">
        <div className="vbooking-stat-card__top">
          <span className="vbooking-stat-card__label">ĐÃ HỦY</span>
          <div className="vbooking-stat-card__icon vbooking-stat-card__icon--red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
        </div>
        <div className="vbooking-stat-card__value-row">
          <span className="vbooking-stat-card__value vbooking-stat-card__value--red">
            {loading ? '—' : cancelled}
          </span>
          <span className="vbooking-stat-card__unit">đơn hủy</span>
        </div>
        <div className="vbooking-stat-card__footer">
          Đơn đã bị hủy bởi khách hoặc cơ sở lưu trú
        </div>
      </div>
    </div>
  );
};

export default VendorBookingStats;

