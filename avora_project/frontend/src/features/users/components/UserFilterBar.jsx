import React, { useState, useRef, useEffect } from 'react';
import './UserFilterBar.css';

/**
 * Filter bar component for User Management matching the reference design.
 * Includes Search box, Hotel/Branch selector, Role selector, Status selector, Filter button, and Reset button.
 */
const UserFilterBar = ({
  searchTerm = '',
  onSearchChange,
  hotelFilter = 'ALL',
  onHotelChange,
  roleFilter = 'ALL',
  onRoleChange,
  statusFilter = 'ALL',
  onStatusChange,
  hotels = [],
  onReset,
}) => {
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const hotelRef = useRef(null);
  const roleRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hotelRef.current && !hotelRef.current.contains(e.target)) setIsHotelOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setIsRoleOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setIsStatusOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleOptions = [
    { value: 'ALL', label: 'Tất cả 4 Vai trò' },
    { value: 'VEN', label: 'Hotel Manager' },
    { value: 'BMR', label: 'Business Manager' },
    { value: 'CUS', label: 'Customer' },
    { value: 'ADM', label: 'System Admin' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'VERIFYING', label: 'Chờ duyệt / Kích hoạt' },
    { value: 'DEACTIVATED', label: 'Đang khóa' },
  ];

  const currentRoleLabel = roleOptions.find((r) => r.value === roleFilter)?.label || 'Tất cả 4 Vai trò';
  const currentStatusLabel = statusOptions.find((s) => s.value === statusFilter)?.label || 'Tất cả trạng thái';

  let currentHotelLabel = 'Khách sạn / Chi nhánh: Tất cả';
  if (hotelFilter !== 'ALL') {
    const selectedHotel = hotels.find((h) => String(h.hotel_id) === String(hotelFilter));
    currentHotelLabel = selectedHotel ? selectedHotel.name : 'Khách sạn / Chi nhánh: Tất cả';
  }

  return (
    <div className="user-filter-bar">
      {/* Search Input Box */}
      <div className="user-filter-bar__search-box">
        <svg
          className="user-filter-bar__search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="user-filter-bar__input"
          placeholder="Tìm theo tên, email, SĐT, mã NV, vai trò, khách sạn..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="user-filter-bar__clear-btn"
            onClick={() => onSearchChange('')}
            title="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Controls Right */}
      <div className="user-filter-bar__controls">
        {/* Dropdown 1: Hotel / Branch */}
        <div className="user-filter-dropdown" ref={hotelRef}>
          <button
            type="button"
            className={`user-filter-dropdown__btn ${isHotelOpen ? 'user-filter-dropdown__btn--open' : ''} ${hotelFilter !== 'ALL' ? 'user-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsHotelOpen((prev) => !prev)}
            title={currentHotelLabel}
          >
            <span className="user-filter-dropdown__label">{currentHotelLabel}</span>
            <svg
              className={`user-filter-chevron ${isHotelOpen ? 'user-filter-chevron--up' : ''}`}
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

          {isHotelOpen && (
            <div className="user-filter-menu">
              <button
                type="button"
                className={`user-filter-menu__item ${hotelFilter === 'ALL' ? 'user-filter-menu__item--active' : ''}`}
                onClick={() => {
                  onHotelChange('ALL');
                  setIsHotelOpen(false);
                }}
              >
                Khách sạn / Chi nhánh: Tất cả
              </button>
              {hotels.map((h) => (
                <button
                  key={h.hotel_id}
                  type="button"
                  className={`user-filter-menu__item ${String(hotelFilter) === String(h.hotel_id) ? 'user-filter-menu__item--active' : ''}`}
                  onClick={() => {
                    onHotelChange(h.hotel_id);
                    setIsHotelOpen(false);
                  }}
                >
                  {h.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown 2: Role */}
        <div className="user-filter-dropdown" ref={roleRef}>
          <button
            type="button"
            className={`user-filter-dropdown__btn ${isRoleOpen ? 'user-filter-dropdown__btn--open' : ''} ${roleFilter !== 'ALL' ? 'user-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsRoleOpen((prev) => !prev)}
          >
            <span className="user-filter-dropdown__label">{currentRoleLabel}</span>
            <svg
              className={`user-filter-chevron ${isRoleOpen ? 'user-filter-chevron--up' : ''}`}
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

          {isRoleOpen && (
            <div className="user-filter-menu">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`user-filter-menu__item ${roleFilter === opt.value ? 'user-filter-menu__item--active' : ''}`}
                  onClick={() => {
                    onRoleChange(opt.value);
                    setIsRoleOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown 3: Status */}
        <div className="user-filter-dropdown" ref={statusRef}>
          <button
            type="button"
            className={`user-filter-dropdown__btn ${isStatusOpen ? 'user-filter-dropdown__btn--open' : ''} ${statusFilter !== 'ALL' ? 'user-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsStatusOpen((prev) => !prev)}
          >
            <span className="user-filter-dropdown__label">{currentStatusLabel}</span>
            <svg
              className={`user-filter-chevron ${isStatusOpen ? 'user-filter-chevron--up' : ''}`}
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

          {isStatusOpen && (
            <div className="user-filter-menu">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`user-filter-menu__item ${statusFilter === opt.value ? 'user-filter-menu__item--active' : ''}`}
                  onClick={() => {
                    onStatusChange(opt.value);
                    setIsStatusOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Action Icon Button */}
        <button
          type="button"
          className="user-filter-bar__icon-btn user-filter-bar__icon-btn--primary"
          title="Bộ lọc nâng cao"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>

        {/* Reset Filter Button */}
        <button
          type="button"
          className="user-filter-bar__icon-btn user-filter-bar__icon-btn--reset"
          onClick={onReset}
          title="Đặt lại bộ lọc"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UserFilterBar;
