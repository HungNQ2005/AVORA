import React, { useState, useRef, useEffect } from 'react';
import './AmenityFilterBar.css';

const AmenityFilterBar = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  pricingFilter,
  onPricingChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  categories = [],
}) => {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const catRef = useRef(null);
  const priceRef = useRef(null);
  const statusRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setIsCategoryOpen(false);
      if (priceRef.current && !priceRef.current.contains(e.target)) setIsPricingOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setIsStatusOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pricingOptions = [
    { value: 'ALL', label: 'Biểu phí (Tất cả)' },
    { value: 'FREE', label: 'Miễn phí (Free)' },
    { value: 'PAID', label: 'Có phụ phí (Paid)' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'Trạng thái (Tất cả)' },
    { value: 'ACTIVE', label: 'Đang kích hoạt' },
    { value: 'INACTIVE', label: 'Tạm dừng hiển thị' },
  ];

  const sortOptions = [
    { value: 'POPULAR', label: 'Phổ biến nhất' },
    { value: 'NAME_ASC', label: 'Tên tiện nghi (A - Z)' },
    { value: 'NAME_DESC', label: 'Tên tiện nghi (Z - A)' },
    { value: 'CODE_ASC', label: 'Mã tiện nghi' },
  ];

  const currentPricingLabel = pricingOptions.find((p) => p.value === pricingFilter)?.label || 'Biểu phí (Tất cả)';
  const currentStatusLabel = statusOptions.find((s) => s.value === statusFilter)?.label || 'Trạng thái (Tất cả)';
  const currentSortLabel = sortOptions.find((s) => s.value === sortBy)?.label || 'Phổ biến nhất';
  const currentCategoryLabel = categoryFilter === 'ALL'
    ? `Tất cả nhóm danh mục (${categories.length || 6})`
    : categoryFilter;

  return (
    <div className="amenity-filter-bar">
      {/* Search Input Box */}
      <div className="amenity-filter-bar__search-box">
        <svg className="amenity-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="amenity-filter-bar__input"
          placeholder="Tìm theo tên tiện nghi, mã code (FAC-POOL, FAC-SPA, FAC-WIFI)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
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

      {/* Dropdown 1: Category */}
      <div className="amenity-filter-dropdown" ref={catRef}>
        <button
          type="button"
          className={`amenity-filter-dropdown__btn ${isCategoryOpen ? 'amenity-filter-dropdown__btn--open' : ''} ${categoryFilter !== 'ALL' ? 'amenity-filter-dropdown__btn--active' : ''}`}
          onClick={() => setIsCategoryOpen((prev) => !prev)}
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

      {/* Dropdown 2: Pricing */}
      <div className="amenity-filter-dropdown" ref={priceRef}>
        <button
          type="button"
          className={`amenity-filter-dropdown__btn ${isPricingOpen ? 'amenity-filter-dropdown__btn--open' : ''} ${pricingFilter !== 'ALL' ? 'amenity-filter-dropdown__btn--active' : ''}`}
          onClick={() => setIsPricingOpen((prev) => !prev)}
        >
          <span className="amenity-filter-dropdown__label">{currentPricingLabel}</span>
          <svg className={`amenity-filter-chevron ${isPricingOpen ? 'amenity-filter-chevron--up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isPricingOpen && (
          <div className="amenity-filter-menu">
            {pricingOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`amenity-filter-menu__item ${pricingFilter === opt.value ? 'amenity-filter-menu__item--active' : ''}`}
                onClick={() => {
                  onPricingChange(opt.value);
                  setIsPricingOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown 3: Status */}
      <div className="amenity-filter-dropdown" ref={statusRef}>
        <button
          type="button"
          className={`amenity-filter-dropdown__btn ${isStatusOpen ? 'amenity-filter-dropdown__btn--open' : ''} ${statusFilter !== 'ALL' ? 'amenity-filter-dropdown__btn--active' : ''}`}
          onClick={() => setIsStatusOpen((prev) => !prev)}
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

      {/* Dropdown 4: Sort */}
      <div className="amenity-filter-dropdown" ref={sortRef}>
        <button
          type="button"
          className={`amenity-filter-dropdown__btn amenity-filter-dropdown__btn--sort ${isSortOpen ? 'amenity-filter-dropdown__btn--open' : ''}`}
          onClick={() => setIsSortOpen((prev) => !prev)}
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
    </div>
  );
};

export default AmenityFilterBar;
