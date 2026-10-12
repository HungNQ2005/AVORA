import React, { useState, useRef, useEffect } from 'react';
import './AmenityFilterBar.css';

const AmenityFilterBar = ({
  searchTerm = '',
  onSearchChange,
  categoryFilter = 'ALL',
  onCategoryChange,
  statusFilter = 'ALL',
  onStatusChange,
  sortBy = 'POPULAR',
  onSortChange,
  categories = [],
  onReset,
}) => {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const catRef = useRef(null);
  const statusRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setIsCategoryOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setIsStatusOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusOptions = [
    { value: 'ALL', label: 'Trạng thái (Tất cả)' },
    { value: 'ACTIVE', label: 'Đang kích hoạt' },
    { value: 'INACTIVE', label: 'Tạm dừng hiển thị' },
  ];

  const sortOptions = [
    { value: 'POPULAR', label: 'Phổ biến nhất' },
    { value: 'NAME_ASC', label: 'Tên tiện nghi (A - Z)' },
    { value: 'NAME_DESC', label: 'Tên tiện nghi (Z - A)' },
  ];

  const currentStatusLabel = statusOptions.find((s) => s.value === statusFilter)?.label || 'Trạng thái (Tất cả)';
  const currentSortLabel = sortOptions.find((s) => s.value === sortBy)?.label || 'Phổ biến nhất';
  const currentCategoryLabel = categoryFilter === 'ALL'
    ? `Tất cả nhóm danh mục (${categories.length || 6})`
    : categoryFilter;

  return (
    <div className="amenity-filter-bar">
      {/* Search Input Box */}
      <div className="amenity-filter-bar__search-box">
        <svg
          className="amenity-filter-bar__search-icon"
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
          className="amenity-filter-bar__input"
          placeholder="Tìm theo tên tiện nghi, mã code, danh mục, loại dịch vụ (hồ bơi, wifi, spa...)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onSearchChange('');
          }}
          aria-label="Tìm kiếm tiện nghi"
        />
        {searchTerm && (
          <button
            type="button"
            className="amenity-filter-bar__clear-btn"
            onClick={() => onSearchChange('')}
            title="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Controls Right */}
      <div className="amenity-filter-bar__controls">
        {/* Dropdown 1: Category */}
        <div className="amenity-filter-dropdown" ref={catRef}>
          <button
            type="button"
            className={`amenity-filter-dropdown__btn ${isCategoryOpen ? 'amenity-filter-dropdown__btn--open' : ''} ${categoryFilter !== 'ALL' ? 'amenity-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            title={currentCategoryLabel}
          >
            <span className="amenity-filter-dropdown__label">{currentCategoryLabel}</span>
            <svg className={`amenity-filter-chevron ${isCategoryOpen ? 'amenity-filter-chevron--up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isCategoryOpen && (
            <div className="amenity-filter-menu">
              <button
                type="button"
                className={`amenity-filter-menu__item ${categoryFilter === 'ALL' ? 'amenity-filter-menu__item--active' : ''}`}
                onClick={() => {
                  onCategoryChange('ALL');
                  setIsCategoryOpen(false);
                }}
              >
                Tất cả nhóm danh mục ({categories.length || 6})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`amenity-filter-menu__item ${categoryFilter === cat ? 'amenity-filter-menu__item--active' : ''}`}
                  onClick={() => {
                    onCategoryChange(cat);
                    setIsCategoryOpen(false);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown 2: Status */}
        <div className="amenity-filter-dropdown" ref={statusRef}>
          <button
            type="button"
            className={`amenity-filter-dropdown__btn ${isStatusOpen ? 'amenity-filter-dropdown__btn--open' : ''} ${statusFilter !== 'ALL' ? 'amenity-filter-dropdown__btn--active' : ''}`}
            onClick={() => setIsStatusOpen((prev) => !prev)}
            title={currentStatusLabel}
          >
            <span className="amenity-filter-dropdown__label">{currentStatusLabel}</span>
            <svg className={`amenity-filter-chevron ${isStatusOpen ? 'amenity-filter-chevron--up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isStatusOpen && (
            <div className="amenity-filter-menu">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`amenity-filter-menu__item ${statusFilter === opt.value ? 'amenity-filter-menu__item--active' : ''}`}
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

        {/* Dropdown 3: Sort */}
        <div className="amenity-filter-dropdown" ref={sortRef}>
          <button
            type="button"
            className={`amenity-filter-dropdown__btn amenity-filter-dropdown__btn--sort ${isSortOpen ? 'amenity-filter-dropdown__btn--open' : ''}`}
            onClick={() => setIsSortOpen((prev) => !prev)}
            title={currentSortLabel}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            <span className="amenity-filter-dropdown__label">{currentSortLabel}</span>
          </button>

          {isSortOpen && (
            <div className="amenity-filter-menu amenity-filter-menu--right">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`amenity-filter-menu__item ${sortBy === opt.value ? 'amenity-filter-menu__item--active' : ''}`}
                  onClick={() => {
                    onSortChange(opt.value);
                    setIsSortOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset Filter Button */}
        {onReset && (
          <button
            type="button"
            className="amenity-filter-bar__icon-btn amenity-filter-bar__icon-btn--reset"
            onClick={onReset}
            title="Đặt lại bộ lọc"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default AmenityFilterBar;
