import React from 'react';
import './RoomTypeStatsOverview.css';

/**
 * Format currency to Vietnamese dong format.
 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const RoomTypeStatsOverview = ({ stats, loading }) => {
  const totalActive = stats?.total_active_room_types ?? 0;
  const formattedTotal = loading ? '--' : (totalActive < 10 ? `0${totalActive}` : `${totalActive}`);
  const bestSeller = stats?.best_seller?.type_name ?? null;
  const occupancy = stats?.best_seller?.occupancy_rate ?? null;
  const adr = stats?.adr ?? null;
  const adrGrowth = stats?.adr_growth ?? null;

  // Card 4 — real data from API (no hardcoded fallbacks)
  const totalRooms = stats?.total_rooms ?? 0;
  const availableRooms = stats?.available_rooms ?? 0;
  const occupiedRooms = stats?.occupied_rooms ?? 0;
  const maintenanceRooms = stats?.maintenance_rooms ?? 0;

  // Compute progress bar widths dynamically
  const pctAvail = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;
  const pctOccupied = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const pctMaintenance = totalRooms > 0 ? Math.max(0, 100 - pctAvail - pctOccupied) : 0;

  return (
    <div className="rt-stats-grid">
      {/* Card 1: Tổng hạng phòng hoạt động */}
      <div className="rt-stat-card">
        <div className="rt-stat-card__header">
          <span className="rt-stat-card__title">Tổng hạng phòng hoạt động</span>
          <div className="rt-stat-card__icon rt-stat-card__icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="2"></line>
            </svg>
          </div>
        </div>
        <div className="rt-stat-card__body">
          <div className="rt-stat-card__metric-row">
            <span className="rt-stat-card__value">{formattedTotal}</span>
            <span className="rt-badge rt-badge--success">100% đạt chuẩn</span>
          </div>
          <p className="rt-stat-card__subtext">Không có hạng phòng bị khóa kiểm toán</p>
        </div>
      </div>

      {/* Card 2: Hạng phòng bán chạy nhất */}
      <div className="rt-stat-card">
        <div className="rt-stat-card__header">
          <span className="rt-stat-card__title">Hạng phòng bán chạy nhất</span>
          <div className="rt-stat-card__icon rt-stat-card__icon--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>
        <div className="rt-stat-card__body">
          <div className="rt-stat-card__highlight-name" title={bestSeller ?? ''}>
            {loading ? '--' : (bestSeller || 'Chưa có dữ liệu')}
          </div>
          {occupancy && (
            <div className="rt-badge rt-badge--navy">
              {occupancy} Tỷ lệ lấp đầy 30 ngày qua
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Giá trung bình đêm (ADR) */}
      <div className="rt-stat-card">
        <div className="rt-stat-card__header">
          <span className="rt-stat-card__title">Giá trung bình đêm (ADR)</span>
          <div className="rt-stat-card__icon rt-stat-card__icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
          </div>
        </div>
        <div className="rt-stat-card__body">
          <div className="rt-stat-card__value rt-stat-card__value--price">
            {loading ? '--' : formatCurrency(adr)}
          </div>
          {adrGrowth && (
            <p className="rt-stat-card__subtext rt-stat-card__subtext--trend">
              <span className="rt-trend-up">↗ {adrGrowth}</span> so với tháng trước
            </p>
          )}
        </div>
      </div>

      {/* Card 4: Tổng công suất phòng thực tế */}
      <div className="rt-stat-card">
        <div className="rt-stat-card__header">
          <span className="rt-stat-card__title">Tổng công suất phòng thực tế</span>
          <div className="rt-stat-card__icon rt-stat-card__icon--cyan">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2"></rect>
              <circle cx="8" cy="12" r="1.5"></circle>
            </svg>
          </div>
        </div>
        <div className="rt-stat-card__body">
          <div className="rt-stat-card__value">
            {loading ? '--' : totalRooms}{' '}
            <span className="rt-stat-card__unit">buồng</span>
          </div>
          <div
            className="rt-progress-bar"
            title={`Trống: ${availableRooms} | Có khách: ${occupiedRooms} | Bảo trì: ${maintenanceRooms}`}
          >
            {pctAvail > 0 && (
              <div
                className="rt-progress-segment rt-progress-segment--green"
                style={{ width: `${pctAvail}%` }}
                title={`Đang trống: ${availableRooms} buồng`}
              />
            )}
            {pctOccupied > 0 && (
              <div
                className="rt-progress-segment rt-progress-segment--yellow"
                style={{ width: `${pctOccupied}%` }}
                title={`Đang có khách: ${occupiedRooms} buồng`}
              />
            )}
            {pctMaintenance > 0 && (
              <div
                className="rt-progress-segment rt-progress-segment--red"
                style={{ width: `${pctMaintenance}%` }}
                title={`Bảo trì: ${maintenanceRooms} buồng`}
              />
            )}
            {/* If all rooms are available, show full green bar */}
            {!loading && totalRooms > 0 && pctAvail === 100 && (
              <div className="rt-progress-segment rt-progress-segment--green" style={{ width: '100%' }} />
            )}
            {/* Empty state bar when no rooms at all */}
            {!loading && totalRooms === 0 && (
              <div className="rt-progress-segment rt-progress-segment--green" style={{ width: '100%', opacity: 0.3 }} />
            )}
          </div>
          <div className="rt-stat-card__subtext rt-progress-legend">
            <span className="rt-legend-item rt-legend-item--green">Trống: {availableRooms}</span>
            <span className="rt-legend-item rt-legend-item--yellow">Có khách: {occupiedRooms}</span>
            {maintenanceRooms > 0 && (
              <span className="rt-legend-item rt-legend-item--red">Bảo trì: {maintenanceRooms}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomTypeStatsOverview;
