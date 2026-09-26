import React from 'react';
import './AmenityStatsCards.css';

const AmenityStatsCards = ({ stats, onAuditClick }) => {
  const total = stats?.totalFacilities ?? 0;
  const newCount = stats?.newFacilitiesCount ?? 0;
  const roomCount = stats?.roomFacilitiesCount ?? 0;
  const hotelCount = stats?.hotelFacilitiesCount ?? 0;
  const categoryCount = stats?.categoryCount ?? 0;
  const categories = stats?.categories ?? [];
  const activeCount = stats?.activeCount ?? 0;
  const inactiveCount = stats?.inactiveCount ?? 0;
  const mostPopularName = stats?.mostPopularFacility?.name || 'Chưa có dữ liệu';
  const mostPopularRate = stats?.mostPopularFacility?.rate ?? '0%';

  return (
    <div className="amenity-stats-grid">
      {/* Card 1: TỔNG TIỆN NGHI HỆ THỐNG */}
      <div className="amenity-stat-card">
        <div className="amenity-stat-card__header">
          <span className="amenity-stat-card__title">TỔNG TIỆN NGHI HỆ THỐNG</span>
          <div className="amenity-stat-card__icon-box amenity-stat-card__icon-box--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        <div className="amenity-stat-card__body">
          <div className="amenity-stat-card__main-val">
            <span className="amenity-stat-card__number">{total}</span>
            <span className="amenity-stat-card__badge-green">+{newCount} mới</span>
          </div>
        </div>

        <div className="amenity-stat-card__footer">
          <div className="amenity-stat-card__dot-item">
            <span className="amenity-dot amenity-dot--blue"></span>
            <span>{roomCount} Trong buồng phòng</span>
          </div>
          <div className="amenity-stat-card__dot-item">
            <span className="amenity-dot amenity-dot--amber"></span>
            <span>{hotelCount} Toàn khách sạn</span>
          </div>
        </div>
      </div>

      {/* Card 2: NHÓM PHÂN LOẠI CHÍNH */}
      <div className="amenity-stat-card">
        <div className="amenity-stat-card__header">
          <span className="amenity-stat-card__title">NHÓM PHÂN LOẠI CHÍNH</span>
          <div className="amenity-stat-card__icon-box amenity-stat-card__icon-box--indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
        </div>

        <div className="amenity-stat-card__body">
          <div className="amenity-stat-card__main-val">
            <span className="amenity-stat-card__number">
              {categoryCount === 0 ? '0' : String(categoryCount).padStart(2, '0')}
            </span>
            <span className="amenity-stat-card__sub-label">tiêu chuẩn OTA</span>
          </div>
        </div>

        <div className="amenity-stat-card__footer amenity-stat-card__tags">
          {categories.length > 0 ? (
            <>
              {categories.slice(0, 3).map((category) => (
                <span className="amenity-tag-chip" key={category}>{category}</span>
              ))}
              {categories.length > 3 && (
                <span className="amenity-tag-chip amenity-tag-chip--more">
                  +{categories.length - 3} nhóm
                </span>
              )}
            </>
          ) : (
            <span className="amenity-tag-chip">Chưa có nhóm</span>
          )}
        </div>
      </div>

      {/* Card 3: TIỆN NGHI PHỔ BIẾN NHẤT */}
      <div className="amenity-stat-card">
        <div className="amenity-stat-card__header">
          <span className="amenity-stat-card__title">TIỆN NGHI PHỔ BIẾN NHẤT</span>
          <div className="amenity-stat-card__icon-box amenity-stat-card__icon-box--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        <div className="amenity-stat-card__body">
          <div className="amenity-stat-card__popular-name" title={mostPopularName}>
            {mostPopularName}
          </div>
          <div className="amenity-stat-card__popular-rate">
            Tần suất áp dụng: <strong>{mostPopularRate}</strong>
          </div>
        </div>

        <div className="amenity-stat-card__progress-container">
          <div className="amenity-stat-card__progress-bar"></div>
        </div>
      </div>

      {/* Card 4: TRẠNG THÁI VẬN HÀNH */}
      <div className="amenity-stat-card">
        <div className="amenity-stat-card__header">
          <span className="amenity-stat-card__title">TRẠNG THÁI VẬN HÀNH</span>
          <div className="amenity-stat-card__icon-box amenity-stat-card__icon-box--rose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
              <circle cx="16" cy="12" r="3" />
            </svg>
          </div>
        </div>

        <div className="amenity-stat-card__body">
          <div className="amenity-stat-card__main-val">
            <span className="amenity-stat-card__number amenity-stat-card__number--green">{activeCount}</span>
            <span className="amenity-stat-card__sub-label">Đang kích hoạt</span>
          </div>
        </div>

        <div className="amenity-stat-card__footer amenity-stat-card__footer--between">
          <div className="amenity-stat-card__alert-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{inactiveCount} Tạm dừng hiển thị</span>
          </div>
          {/* <button type="button" className="amenity-stat-card__audit-link" onClick={onAuditClick}>
            Kiểm toán CMS
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default AmenityStatsCards;
