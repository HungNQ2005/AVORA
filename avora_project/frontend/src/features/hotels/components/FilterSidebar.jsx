import React from 'react';

import {
  SlidersIcon,
  MapIcon as MapPinIcon,
  StarIcon,
} from '../../../common/components/icons';


/**
 * FilterSidebar component matching the left sidebar in reference image.
 * All counts are bound dynamically to the filterStats computed from the database.
 */
const FilterSidebar = ({
  filterStats = {},
  selectedPriceRange,
  onPriceRangeChange,
  selectedStars = [],
  onStarToggle,
  selectedScore,
  onScoreChange,
  selectedFacilities = [],
  onFacilityToggle,
  onlyAvailable,
  onOnlyAvailableChange,
  selectedCapacity = 'all',
  onCapacityChange,
  guestsPerRoom = 2,
  onResetAll,
  onOpenMap,
}) => {
  const priceStats = filterStats.priceRanges || {};
  const starStats = filterStats.stars || {};
  const scoreStats = filterStats.ratings || {};
  const facilityStats = filterStats.popularFacilities || {};
  const capacityStats = filterStats.capacities || {};

  return (
    <aside className="filter-sidebar">
      {/* ─── Map Widget Card ─── */}
      <div className="filter-map-card">
        <div className="filter-map-card__bg">
          <div className="filter-map-card__pin-demo">
            <span className="filter-map-card__pulse" />
          </div>
        </div>
        <button
          type="button"
          className="filter-map-card__btn"
          onClick={onOpenMap}
        >
          <MapPinIcon />
          <span>Hiển thị trên bản đồ</span>
        </button>
      </div>

      {/* ─── Filter Options Card ─── */}
      <div className="filter-card">
        {/* Header */}
        <div className="filter-card__header">
          <div className="filter-card__title">
            <SlidersIcon />
            <span>Chọn lọc theo:</span>
          </div>
          <button
            type="button"
            className="filter-card__reset-btn"
            onClick={onResetAll}
          >
            Xóa tất cả
          </button>
        </div>

        {/* Available Rooms Only Checkbox */}
        <div className="filter-group filter-group--availability">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => onOnlyAvailableChange(e.target.checked)}
              className="filter-checkbox"
            />
            <div className="filter-checkbox-text">
              <span className="filter-checkbox-title">Chỉ hiển thị chỗ nghỉ còn phòng</span>
              <span className="filter-checkbox-desc">
                Ẩn các khách sạn đã hết phòng cho ngày bạn chọn
              </span>
            </div>
          </label>
        </div>

        <div className="filter-divider" />

        {/* 1. SỨC CHỨA & LOẠI GIƯỜNG (LIÊN KẾT BỘ LỌC) */}
        <div className="filter-group">
          <h3 className="filter-group__heading">SỨC CHỨA &amp; LOẠI GIƯỜNG</h3>
          <div className="filter-capacity-rule-tip">
            <span className="filter-capacity-rule-icon">ℹ️</span>
            <span>
              2 giường tiêu chuẩn = 4 người • Giường phụ = +1 người (Tối đa 5 người/phòng)
            </span>
          </div>
          <div className="filter-options-list">
            {[
              { id: 'all', label: 'Tất cả loại phòng', count: capacityStats.all ?? priceStats.all ?? 0 },
              {
                id: 'standard_two_beds',
                label: '2 giường tiêu chuẩn (4-5 người)',
                count: capacityStats.standard_two_beds ?? 0,
              },
              {
                id: 'standard_double',
                label: '1 giường đôi (2-3 người)',
                count: capacityStats.standard_double ?? 0,
                disabled: guestsPerRoom > 3,
                disabledReason: 'Không phù hợp số khách bạn chọn',
              },
              {
                id: 'with_extra_bed',
                label: 'Có hỗ trợ giường phụ (Tối đa 5 người)',
                count: capacityStats.with_extra_bed ?? 0,
              },
            ].map((option) => (
              <label
                key={option.id}
                className={`filter-option-row ${option.disabled ? 'is-disabled' : ''}`}
                title={option.disabled ? option.disabledReason : undefined}
              >
                <div className="filter-option-left">
                  <input
                    type="radio"
                    name="capacityFilter"
                    checked={selectedCapacity === option.id}
                    disabled={option.disabled}
                    onChange={() => onCapacityChange && onCapacityChange(option.id)}
                    className="filter-radio"
                  />
                  <span className="filter-option-name">{option.label}</span>
                </div>
                <span className="filter-option-count">
                  {option.disabled ? '0' : option.count}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* 2. NGÂN SÁCH CỦA BẠN (MỖI ĐÊM) */}
        <div className="filter-group">
          <h3 className="filter-group__heading">NGÂN SÁCH CỦA BẠN (MỖI ĐÊM)</h3>
          <div className="filter-options-list">
            {[
              { id: 'all', label: 'Tất cả mức giá', count: priceStats.all ?? 0 },
              { id: '0-1.2m', label: '0 VND - 1.200.000 VND', count: priceStats.under1m2 ?? 0 },
              { id: '1.2m-2.5m', label: '1.200.000 VND - 2.500.000 VND', count: priceStats.from1m2To2m5 ?? 0 },
              { id: '2.5m-5m', label: '2.500.000 VND - 5.000.000 VND', count: priceStats.from2m5To5m ?? 0 },
              { id: 'above-5m', label: '5.000.000 VND trở lên', count: priceStats.above5m ?? 0 },
            ].map((option) => (
              <label key={option.id} className="filter-option-row">
                <div className="filter-option-left">
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === option.id}
                    onChange={() => onPriceRangeChange(option.id)}
                    className="filter-radio"
                  />
                  <span className="filter-option-name">{option.label}</span>
                </div>
                <span className="filter-option-count">{option.count}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* 2. XẾP HẠNG SAO */}
        <div className="filter-group">
          <h3 className="filter-group__heading">XẾP HẠNG SAO</h3>
          <div className="filter-options-list">
            {[5, 4, 3].map((star) => (
              <label key={star} className="filter-option-row">
                <div className="filter-option-left">
                  <input
                    type="checkbox"
                    checked={selectedStars.includes(star)}
                    onChange={() => onStarToggle(star)}
                    className="filter-checkbox"
                  />
                  <span className="filter-option-name">
                    {star} sao <StarIcon />
                  </span>
                </div>
                <span className="filter-option-count">{starStats[star] ?? 0}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* 3. ĐIỂM ĐÁNH GIÁ CỦA KHÁCH */}
        <div className="filter-group">
          <h3 className="filter-group__heading">ĐIỂM ĐÁNH GIÁ CỦA KHÁCH</h3>
          <div className="filter-options-list">
            {[
              { id: 9, label: 'Tuyệt hảo: 9 điểm trở lên', count: scoreStats[9] ?? 0 },
              { id: 8, label: 'Rất tốt: 8 điểm trở lên', count: scoreStats[8] ?? 0 },
              { id: 7, label: 'Tốt: 7 điểm trở lên', count: scoreStats[7] ?? 0 },
            ].map((option) => (
              <label key={option.id} className="filter-option-row">
                <div className="filter-option-left">
                  <input
                    type="radio"
                    name="scoreFilter"
                    checked={selectedScore === option.id}
                    onChange={() => onScoreChange(selectedScore === option.id ? null : option.id)}
                    className="filter-radio"
                  />
                  <span className="filter-option-name">{option.label}</span>
                </div>
                <span className="filter-option-count">{option.count}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-divider" />

        {/* 4. TIỆN NGHI ĐƯỢC ƯA CHUỘNG */}
        <div className="filter-group">
          <h3 className="filter-group__heading">TIỆN NGHI ĐƯỢC ƯA CHUỘNG</h3>
          <div className="filter-options-list">
            {[
              { key: 'beach', label: 'Bãi biển riêng / Sát biển', count: facilityStats.beach ?? 0 },
              { key: 'pool', label: 'Hồ bơi vô cực', count: facilityStats.pool ?? 0 },
              { key: 'breakfast', label: 'Bao bữa sáng tự chọn', count: facilityStats.breakfast ?? 0 },
              { key: 'freeCancel', label: 'Miễn phí hủy phòng', count: facilityStats.freeCancel ?? 0 },
            ].map((f) => (
              <label key={f.key} className="filter-option-row">
                <div className="filter-option-left">
                  <input
                    type="checkbox"
                    checked={selectedFacilities.includes(f.key)}
                    onChange={() => onFacilityToggle(f.key)}
                    className="filter-checkbox"
                  />
                  <span className="filter-option-name">{f.label}</span>
                </div>
                <span className="filter-option-count">{f.count}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
