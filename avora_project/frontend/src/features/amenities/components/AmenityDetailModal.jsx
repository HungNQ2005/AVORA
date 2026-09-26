import React from 'react';
import AmenityIconRenderer from './AmenityIconRenderer';
import './AmenityDetailModal.css';

const FACILITY_TYPE_LABELS = {
  INTERNET: 'Internet / Wi-Fi',
  POOL: 'Hồ bơi',
  FOOD: 'Bữa sáng / Ẩm thực',
  PARKING: 'Bãi đỗ xe',
  SERVICE: 'Dịch vụ / Lễ tân 24/7',
  GYM: 'Thể hình / Fitness',
  RESTAURANT: 'Nhà hàng',
  SPA: 'Spa & Chăm sóc',
};

const AmenityDetailModal = ({ isOpen, onClose, amenity, onEdit }) => {
  if (!isOpen || !amenity) return null;

  const displayName = amenity.name_vi || amenity.facility_name || 'Tiện ích';

  return (
    <div className="rt-modal-overlay">
      <div className="rt-modal-content rt-detail-modal-content" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="rt-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">Chi tiết tiện nghi</h2>
              <p className="rt-modal-subtitle">
                Thông tin lưu trữ trong hệ thống Avora.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rt-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="rt-modal-body">
          <div className="rt-modal-grid">
            {/* Cột 1: Thông tin tiện nghi */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Thông tin tiện nghi</h3>

              <div className="amenity-detail-hero">
                <div className="amenity-detail-icon-box">
                  <AmenityIconRenderer
                    name={displayName}
                    code={amenity.code}
                    type={amenity.type || amenity.scope_type}
                    icon={amenity.icon}
                    size={32}
                  />
                </div>
                <div className="amenity-detail-title-block">
                  <h4 className="amenity-detail-name">{displayName}</h4>
                  <div className="amenity-detail-tags">
                    <span className="amenity-type-badge">
                      {FACILITY_TYPE_LABELS[amenity.type] || amenity.type || 'Chưa phân loại'}
                    </span>
                    <span className="amenity-icon-badge">
                      Icon: {amenity.icon || 'wifi-icon'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="amenity-info-list">
                <div className="amenity-info-item">
                  <span className="amenity-info-label">Tên hiển thị:</span>
                  <span className="amenity-info-value">{displayName}</span>
                </div>
                <div className="amenity-info-item">
                  <span className="amenity-info-label">Mã tiện ích (PK):</span>
                  <span className="amenity-info-code">{amenity.facility_id}</span>
                </div>
                <div className="amenity-info-item">
                  <span className="amenity-info-label">Phân loại (Type):</span>
                  <span className="amenity-info-value">{amenity.type || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Cột 2: Trạng thái & Áp dụng */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Trạng thái & Áp dụng</h3>

              <div className="amenity-detail-stats-grid">
                <div className="amenity-detail-stat-card">
                  <span className="stat-title">ĐANG ÁP DỤNG</span>
                  <span className="stat-number">{amenity.applied_count ?? 0}</span>
                  <span className="stat-unit">{amenity.applied_unit || 'Hạng phòng'}</span>
                </div>
                <div className="amenity-detail-stat-card">
                  <span className="stat-title">TRẠNG THÁI</span>
                  <span className="stat-status-badge">● Đang kích hoạt</span>
                  <span className="stat-unit">Kênh bán OTA</span>
                </div>
              </div>

              {/* <div className="amenity-meta-box">
                <h5 className="amenity-meta-title">Cơ sở dữ liệu Cloud</h5>
                <div className="amenity-meta-row">
                  <span>Bảng dữ liệu:</span>
                  <code>m_facility</code>
                </div>
                <div className="amenity-meta-row">
                  <span>Khóa chính (facility_id):</span>
                  <code>{amenity.facility_id}</code>
                </div>
                <div className="amenity-meta-row">
                  <span>Bảng quan hệ ánh xạ:</span>
                  <code>m_room_facility_map</code>
                </div> */}
              {/* </div> */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="rt-modal-footer">
          <button type="button" className="rt-btn rt-btn-cancel" onClick={onClose}>
            Đóng
          </button>
          <div className="rt-modal-footer-right">
            <button
              type="button"
              className="rt-btn rt-btn-primary"
              onClick={() => {
                onClose();
                onEdit(amenity);
              }}
            >
              Chỉnh sửa tiện ích
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default AmenityDetailModal;
