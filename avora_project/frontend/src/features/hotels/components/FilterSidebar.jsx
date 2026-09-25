import React from 'react';

/* SVG Icons */
const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
);

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

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
  selectedTypes = [],
  onTypeToggle,
  onResetAll,
  onOpenMap,
}) => {
  const priceStats = filterStats.priceRanges || {};
  const starStats = filterStats.stars || {};
  const scoreStats = filterStats.ratings || {};
  const facilityStats = filterStats.popularFacilities || {};
  const typeStats = filterStats.hotelTypes || {};

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

        {/* 1. NGÂN SÁCH CỦA BẠN (MỖI ĐÊM) */}
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

        <div className="filter-divider" />

        {/* 5. LOẠI HÌNH KHÁCH SẠN */}
        <div className="filter-group">
          <h3 className="filter-group__heading">LOẠI HÌNH KHÁCH SẠN</h3>
          <div className="filter-options-list">
            {[
              { key: 'beachCenter', label: 'Khách sạn ven biển & trung tâm', count: typeStats.beachAndCenter ?? 0 },
              { key: 'boutiqueOldQuarter', label: 'Khách sạn Boutique & Phố Cổ', count: typeStats.boutiqueOldQuarter ?? 0 },
            ].map((t) => (
              <label key={t.key} className="filter-option-row">
                <div className="filter-option-left">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.key)}
                    onChange={() => onTypeToggle(t.key)}
                    className="filter-checkbox"
                  />
                  <span className="filter-option-name">{t.label}</span>
                </div>
                <span className="filter-option-count">{t.count}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
