import React, { useState, useRef, useEffect } from 'react';
import './RoomTypeFilterBar.css';

const SORT_OPTIONS = [
  { value: 'PRICE_DESC', label: 'Giá niêm yết cao nhất' },
  { value: 'PRICE_ASC', label: 'Giá niêm yết thấp nhất' },
  { value: 'NAME_ASC', label: 'Tên hạng phòng (A-Z)' },
  { value: 'ROOMS_DESC', label: 'Số buồng nhiều nhất' },
];

const RoomTypeFilterBar = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
  sortBy,
  onSortChange,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="rt-filter-bar">
      {/* Search Input */}
      <div className="rt-filter-bar__search">
        <svg
          className="rt-filter-bar__search-icon"
          width="16"
          height="16"
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
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên phòng, SKU hoặc tiện nghi..."
          className="rt-filter-bar__search-input"
        />
        {searchTerm && (
          <button
            className="rt-filter-bar__clear-btn"
            onClick={() => onSearchChange('')}
            title="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="rt-filter-bar__pills">
        <span className="rt-filter-bar__pills-label">LỌC NHANH:</span>
        <button
          className={`rt-pill ${activeFilter === 'ALL' ? 'rt-pill--active' : ''}`}
          onClick={() => onFilterChange('ALL')}
        >
          Tất cả ({counts?.all || 0})
        </button>
        <button
          className={`rt-pill ${activeFilter === 'ACTIVE' ? 'rt-pill--active' : ''}`}
          onClick={() => onFilterChange('ACTIVE')}
        >
          Đang mở bán ({counts?.active || 0})
        </button>
        <button
          className={`rt-pill ${activeFilter === 'INACTIVE' ? 'rt-pill--active' : ''}`}
          onClick={() => onFilterChange('INACTIVE')}
        >
          Ngừng Kinh Doanh ({counts?.inactive || 0})
        </button>
      </div>

      {/* Right Controls: Sort & Export */}
      <div className="rt-filter-bar__right">
        {/* Custom styled sort dropdown */}
        <div className="rt-sort-dropdown" ref={sortRef}>
          <button
            type="button"
            className={`rt-sort-btn ${isSortOpen ? 'rt-sort-btn--open' : ''}`}
            onClick={() => setIsSortOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isSortOpen}
          >
            {/* Sort icon (arrow down with bars) matching mockup */}
            <svg
              className="rt-sort-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 5h10"></path>
              <path d="M11 9h7"></path>
              <path d="M11 13h4"></path>
              <path d="M3 17l3 3 3-3"></path>
              <path d="M6 18V4"></path>
            </svg>
            <span className="rt-sort-btn__text">
              <span className="rt-sort-btn__prefix">Sắp xếp:</span> {currentOption.label}
            </span>
            <svg
              className={`rt-sort-chevron ${isSortOpen ? 'rt-sort-chevron--up' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isSortOpen && (
            <div className="rt-sort-menu" role="listbox">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = opt.value === sortBy;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rt-sort-menu__item ${isSelected ? 'rt-sort-menu__item--active' : ''}`}
                    onClick={() => {
                      onSortChange(opt.value);
                      setIsSortOpen(false);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="rt-export-btn" title="Xuất báo cáo cấu hình">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RoomTypeFilterBar;
