import React from 'react';
import './VendorBookingFilterBar.css';

const TABS = [
  { key: 'all', label: 'Tất cả đơn' },
  { key: 'PND', label: 'Chờ xác nhận' },
  { key: 'CFM', label: 'Đã xác nhận' },
  { key: 'CAN', label: 'Đã hủy' },
];

const VendorBookingFilterBar = ({
  activeStatus = 'all',
  onStatusChange,
  counts = {},
  hotels = [],
  selectedHotelId = 'all',
  onHotelChange,
  searchTerm = '',
  onSearchChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  onResetFilters,
  onRefresh,
  loading = false,
}) => {
  const getBadgeCount = (key) => {
    if (key === 'all') return counts.all || 0;
    if (key === 'PND') return counts.pnd || 0;
    if (key === 'CFM') return counts.cfm || 0;
    if (key === 'CAN') return counts.can || 0;
    return 0;
  };

  return (
    <div className="vbooking-filter-container">
      {/* 1. Hàng Tabs Lọc Trạng Thái Nhanh */}
      <div className="vbooking-filter-tabs">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          const count = getBadgeCount(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              className={`vbooking-filter-tab ${isActive ? 'vbooking-filter-tab--active' : ''}`}
              onClick={() => onStatusChange(tab.key)}
            >
              <span>{tab.label}</span>
              <span className={`vbooking-tab-badge vbooking-tab-badge--${tab.key.toLowerCase()}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Hàng Bộ Lọc Chi Tiết */}
      <div className="vbooking-filter-controls">
        {/* Lọc Khách sạn */}
        {hotels.length > 1 && (
          <div className="vbooking-control-group">
            <label className="vbooking-control-label">Khách sạn:</label>
            <select
              value={selectedHotelId}
              onChange={(e) => onHotelChange(e.target.value)}
              className="vbooking-select"
            >
              <option value="all">Tất cả khách sạn ({hotels.length})</option>
              {hotels.map((h) => (
                <option key={h.hotel_id} value={h.hotel_id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ô Tìm kiếm */}
        <div className="vbooking-control-group vbooking-control-group--search">
          <label className="vbooking-control-label">Tìm kiếm đơn:</label>
          <div className="vbooking-search-input-wrapper">
            <svg
              className="vbooking-search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Tên khách, SĐT hoặc mã đơn..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="vbooking-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="vbooking-search-clear"
                onClick={() => onSearchChange('')}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Khoảng ngày (Từ ngày) */}
        <div className="vbooking-control-group">
          <label className="vbooking-control-label">Từ ngày:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="vbooking-input vbooking-input--date"
          />
        </div>

        {/* Khoảng ngày (Đến ngày) */}
        <div className="vbooking-control-group">
          <label className="vbooking-control-label">Đến ngày:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="vbooking-input vbooking-input--date"
          />
        </div>

        {/* Nút Làm mới & Đặt lại */}
        <div className="vbooking-filter-actions">
          {(searchTerm || startDate || endDate || selectedHotelId !== 'all' || activeStatus !== 'all') && (
            <button
              type="button"
              className="vbooking-btn vbooking-btn--secondary"
              onClick={onResetFilters}
              title="Đặt lại bộ lọc"
            >
              Đặt lại
            </button>
          )}

          <button
            type="button"
            className="vbooking-btn vbooking-btn--refresh"
            onClick={onRefresh}
            disabled={loading}
            title="Tải lại dữ liệu"
          >
            <svg
              className={`vbooking-refresh-icon ${loading ? 'vbooking-refresh-icon--spin' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Làm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorBookingFilterBar;

