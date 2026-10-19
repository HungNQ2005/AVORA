import React from 'react';
import './RoomStatsOverview.css';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 đ';
  return `${Number(val).toLocaleString('vi-VN')} đ`;
};

const RoomStatsOverview = ({ stats, loading }) => {
  const total = stats?.total_rooms || 0;
  const available = stats?.available_rooms || 0;
  const occupied = stats?.occupied_rooms || 0;
  const occupancyRate = stats?.occupancy_rate || 0;
  const readyRate = total > 0 ? Math.round((available / total) * 100) : 0;
  const adr = stats?.adr || 0;
  const revpar = stats?.revpar || 0;
  const hotelName = stats?.hotel_name || 'Khách sạn hiện tại';

  return (
    <div className="room-stats-grid">
      {/* Card 1: Tổng buồng quản lý */}
      <div className="room-stat-card room-stat-card--blue">
        <div className="room-stat-card__top">
          <span className="room-stat-card__label">TỔNG BUỒNG QUẢN LÝ</span>
          <div className="room-stat-card__icon room-stat-card__icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
            </svg>
          </div>
        </div>
        <div className="room-stat-card__value-row">
          <span className="room-stat-card__value">
            {loading ? '—' : `${total} buồng`}
          </span>
          <span className="room-stat-card__sub-value">
            ({stats?.total_room_types || 0} hạng)
          </span>
          <span className="room-stat-card__trend room-stat-card__trend--up">
            +8.4%
          </span>
        </div>
        <div className="room-stat-card__footer">
          <span className="room-stat-card__meta-label">Cơ sở hiện tại:</span>
          <span className="room-stat-card__meta-val" title={hotelName}>
            {hotelName}
          </span>
        </div>
      </div>

      {/* Card 2: Đang mở bán trực tuyến */}
      <div className="room-stat-card room-stat-card--green">
        <div className="room-stat-card__top">
          <span className="room-stat-card__label">ĐANG MỞ BÁN TRỰC TUYẾN</span>
          <div className="room-stat-card__icon room-stat-card__icon--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
        </div>
        <div className="room-stat-card__value-row">
          <span className="room-stat-card__value room-stat-card__value--green">
            {loading ? '—' : available}
          </span>
          <span className="room-stat-card__sub-value">
            buồng khả dụng
          </span>
          <span className="room-stat-card__badge room-stat-card__badge--live">
            <span className="room-stat-card__pulse-dot"></span>
            Live OTA
          </span>
        </div>
        <div className="room-stat-card__footer">
          <span className="room-stat-card__meta-label">Tỷ lệ sẵn sàng đón khách:</span>
          <span className="room-stat-card__meta-val room-stat-card__meta-val--green">
            {readyRate}%
          </span>
        </div>
      </div>

      {/* Card 3: Công suất phòng thực tế */}
      <div className="room-stat-card room-stat-card--orange">
        <div className="room-stat-card__top">
          <span className="room-stat-card__label">CÔNG SUẤT PHÒNG THỰC TẾ</span>
          <div className="room-stat-card__icon room-stat-card__icon--orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
        </div>
        <div className="room-stat-card__value-row">
          <span className="room-stat-card__value">
            {loading ? '—' : `${occupancyRate}%`}
          </span>
          <span className="room-stat-card__sub-value">
            ({occupied} có khách)
          </span>
          <span className="room-stat-card__badge room-stat-card__badge--stable">
            Ổn định
          </span>
        </div>
        {/* Progress Bar */}
        <div className="room-stat-card__progress-wrap">
          <div
            className="room-stat-card__progress-fill room-stat-card__progress-fill--occupied"
            style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            title={`Đang có khách: ${occupied}`}
          ></div>
          <div
            className="room-stat-card__progress-fill room-stat-card__progress-fill--vacant"
            style={{ width: `${Math.max(100 - occupancyRate, 0)}%` }}
            title={`Đang trống: ${available}`}
          ></div>
        </div>
        <div className="room-stat-card__footer room-stat-card__footer--split">
          <span>{occupied} đang ở</span>
          <span>{available} đang trống</span>
        </div>
      </div>

      {/* Card 4: Giá trung bình đêm (ADR) */}
      <div className="room-stat-card room-stat-card--purple">
        <div className="room-stat-card__top">
          <span className="room-stat-card__label">GIÁ TRUNG BÌNH ĐÊM (ADR)</span>
          <div className="room-stat-card__icon room-stat-card__icon--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
        <div className="room-stat-card__value-row">
          <span className="room-stat-card__value">
            {loading ? '—' : formatCurrency(adr)}
          </span>
          <span className="room-stat-card__trend room-stat-card__trend--up">
            +0.4%
          </span>
        </div>
        <div className="room-stat-card__footer">
          <span className="room-stat-card__meta-label">RevPAR ước tính:</span>
          <span className="room-stat-card__meta-val room-stat-card__meta-val--purple">
            {formatCurrency(revpar)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoomStatsOverview;
