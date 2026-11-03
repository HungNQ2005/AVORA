import React, { useState, useRef, useEffect } from 'react';
import './AuditLogFilterBar.css';

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'INS', label: '1 - Thêm mới (Insert)', badge: 'INS', badgeCls: 'audit-badge--ins' },
  { value: 'UPD', label: '2 - Cập nhật (Update)', badge: 'UPD', badgeCls: 'audit-badge--upd' },
  { value: 'DEL', label: '3 - Xóa (Delete)', badge: 'DEL', badgeCls: 'audit-badge--del' },
  { value: 'LGN', label: '4 - Đăng nhập (Login)', badge: 'LGN', badgeCls: 'audit-badge--lgn' },
];

const COMMON_ENTITIES = [
  { value: 'ALL', label: 'Tất cả bảng / đối tượng' },
  { value: 'm_user', label: 'Người dùng (m_user)' },
  { value: 'm_hotel', label: 'Khách sạn (m_hotel)' },
  { value: 'm_room', label: 'Phòng (m_room)' },
  { value: 'm_room_type', label: 'Hạng phòng (m_room_type)' },
  { value: 't_booking', label: 'Đơn đặt phòng (t_booking)' },
  { value: 'm_coupon', label: 'Mã khuyến mãi (m_coupon)' },
  { value: 'm_facility', label: 'Tiện nghi (m_facility)' },
  { value: 'm_refund_policy', label: 'Chính sách hoàn tiền' },
];

const AuditLogFilterBar = ({
  searchTerm = '',
  onSearchChange,
  actionFilter = 'ALL',
  onActionChange,
  entityFilter = 'ALL',
  onEntityChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  dateError = '',
  onReset,
  onRefresh,
  isLoading = false,
}) => {
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isEntityOpen, setIsEntityOpen] = useState(false);

  const actionRef = useRef(null);
  const entityRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setIsActionOpen(false);
      }
      if (entityRef.current && !entityRef.current.contains(e.target)) {
        setIsEntityOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAction = ACTION_OPTIONS.find((a) => a.value === actionFilter) || ACTION_OPTIONS[0];
  const selectedEntity = COMMON_ENTITIES.find((e) => e.value === entityFilter);
  const entityDisplayLabel = selectedEntity ? selectedEntity.label : (entityFilter || 'Tất cả bảng / đối tượng');

  return (
    <div className="audit-filter-bar">
      {/* Top Controls Row */}
      <div className="audit-filter-bar__top">
        {/* Search Box */}
        <div className="audit-filter-bar__search-box">
          <svg
            className="audit-filter-bar__search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="audit-filter-bar__input"
            placeholder="Tìm theo tên/email người thực hiện, đối tượng, mã ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="audit-filter-bar__clear-btn"
              onClick={() => onSearchChange('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Dropdown */}
        <div className="audit-filter-dropdown" ref={actionRef}>
          <button
            type="button"
            className={`audit-filter-dropdown__btn ${actionFilter !== 'ALL' ? 'audit-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsActionOpen(!isActionOpen)}
          >
            <span className="audit-filter-dropdown__label-text">
              {selectedAction.label}
            </span>
            <svg
              className={`audit-filter-chevron ${isActionOpen ? 'audit-filter-chevron--open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isActionOpen && (
            <div className="audit-filter-dropdown__menu">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`audit-filter-dropdown__item ${actionFilter === opt.value ? 'audit-filter-dropdown__item--selected' : ''}`}
                  onClick={() => {
                    onActionChange(opt.value);
                    setIsActionOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.badge && (
                    <span className={`audit-badge-mini ${opt.badgeCls}`}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Target Entity Dropdown / Input */}
        <div className="audit-filter-dropdown" ref={entityRef}>
          <button
            type="button"
            className={`audit-filter-dropdown__btn ${entityFilter !== 'ALL' ? 'audit-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsEntityOpen(!isEntityOpen)}
          >
            <span className="audit-filter-dropdown__label-text">
              {entityDisplayLabel}
            </span>
            <svg
              className={`audit-filter-chevron ${isEntityOpen ? 'audit-filter-chevron--open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isEntityOpen && (
            <div className="audit-filter-dropdown__menu">
              {COMMON_ENTITIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`audit-filter-dropdown__item ${entityFilter === opt.value ? 'audit-filter-dropdown__item--selected' : ''}`}
                  onClick={() => {
                    onEntityChange(opt.value);
                    setIsEntityOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Range & Action Buttons Row */}
      <div className="audit-filter-bar__bottom">
        <div className="audit-date-picker-group">
          <div className="audit-date-field">
            <span className="audit-date-label">Từ ngày:</span>
            <input
              type="date"
              className={`audit-date-input ${dateError ? 'audit-date-input--error' : ''}`}
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <span className="audit-date-separator">→</span>

          <div className="audit-date-field">
            <span className="audit-date-label">Đến ngày:</span>
            <input
              type="date"
              className={`audit-date-input ${dateError ? 'audit-date-input--error' : ''}`}
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              className="audit-date-clear-btn"
              onClick={() => {
                onStartDateChange('');
                onEndDateChange('');
              }}
              title="Xóa khoảng ngày"
            >
              Xóa ngày
            </button>
          )}
        </div>

        {/* Action Buttons: Refresh & Reset */}
        <div className="audit-filter-actions">
          <button
            type="button"
            className="audit-filter-btn audit-filter-btn--outline"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách"
          >
            <svg
              className={isLoading ? 'audit-icon-spin' : ''}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="audit-filter-btn audit-filter-btn--ghost"
            onClick={onReset}
            title="Đặt lại toàn bộ bộ lọc"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Date Validation Alert */}
      {dateError && (
        <div className="audit-filter-error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{dateError}</span>
        </div>
      )}
    </div>
  );
};

export default AuditLogFilterBar;
