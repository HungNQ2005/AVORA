import React from 'react';
import { BuildingIcon, ShieldCheckIcon, ActivityIcon, DollarSignIcon } from '../../../common/components/icons';
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
            <BuildingIcon size={18} />
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
            <ShieldCheckIcon size={18} />
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
            <ActivityIcon size={18} />
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
            <DollarSignIcon size={18} />
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
