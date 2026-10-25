import React from 'react';
import { SearchIcon } from './BookingIcons';

/**
 * Filter Bar: Status Tabs, Search Input, Time Range, VAT Invoice Toggle
 */
const BookingFilterBar = ({
  activeTab,
  onTabChange,
  counts,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  timeRange,
  setTimeRange,
  availableYears,
  currentYear,
  requireVatOnly,
  setRequireVatOnly,
}) => {
  return (
    <>
      {/* ─── STATUS TABS BAR ───────────────────────────────────────── */}
      <div className="my-bookings-tabs-bar" role="tablist">
        <button
          type="button"
          className={`my-bookings-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => onTabChange('all')}
        >
          <span>Tất cả đơn</span>
          <span className="my-bookings-tab-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`my-bookings-tab-btn ${activeTab === 'upcoming' ? 'is-active' : ''}`}
          onClick={() => onTabChange('upcoming')}
        >
          <span>Sắp tới / Hiện tại</span>
          <span className="my-bookings-tab-badge my-bookings-tab-badge--amber">
            {counts.upcoming}
          </span>
        </button>

        <button
          type="button"
          className={`my-bookings-tab-btn ${activeTab === 'completed' ? 'is-active' : ''}`}
          onClick={() => onTabChange('completed')}
        >
          <span>Đã hoàn thành</span>
          <span className="my-bookings-tab-badge">{counts.completed}</span>
        </button>

        <button
          type="button"
          className={`my-bookings-tab-btn ${activeTab === 'cancelled' ? 'is-active' : ''}`}
          onClick={() => onTabChange('cancelled')}
        >
          <span>Đã hủy</span>
          <span className="my-bookings-tab-badge">{counts.cancelled}</span>
        </button>
      </div>

      {/* ─── SEARCH & FILTER BAR ───────────────────────────────────── */}
      <form onSubmit={onSearchSubmit} className="my-bookings-filter-bar">
        <div className="my-bookings-search-wrap">
          <span className="my-bookings-search-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="my-bookings-search-input"
            placeholder="Tìm theo mã đơn (AV#...), tên khách sạn, địa danh..."
            value={searchInput}
            onChange={onSearchInputChange}
          />
        </div>

        <select
          className="my-bookings-filter-select"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          aria-label="Lọc đơn đặt phòng theo ngày đặt"
        >
          <option value="all">Ngày đặt: Tất cả</option>
          <option value="last_30_days">30 ngày qua</option>
          <option value="last_90_days">90 ngày qua</option>
          <option value="this_month">Tháng này</option>
          <option value="last_month">Tháng trước</option>
          <option value="this_year">Năm nay</option>
          {availableYears.map((yr) => (
            yr !== currentYear && yr !== 2024 && (
              <option key={yr} value={String(yr)}>
                Năm {yr}
              </option>
            )
          ))}
        </select>

        <label className="my-bookings-filter-vat-toggle">
          <input
            type="checkbox"
            checked={requireVatOnly}
            onChange={(e) => setRequireVatOnly(e.target.checked)}
          />
          <span>Xuất hóa đơn lưu trú</span>
        </label>

        <button type="submit" className="my-bookings-search-submit-btn">
          <SearchIcon />
          <span>Tra cứu vé nhanh</span>
        </button>
      </form>
    </>
  );
};

export default BookingFilterBar;
