import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, CloseIcon, BuildingIcon, ChevronDownIcon, CheckIcon, ListIcon, GridIcon } from '../../../common/components/icons';
import './RoomFilterBar.css';

const RoomFilterBar = ({
  searchTerm,
  onSearchChange,
  hotels = [],
  selectedHotelId,
  onHotelChange,
  floors = [],
  selectedFloor,
  onFloorChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}) => {
  const [isHotelOpen, setIsHotelOpen] = useState(false);
  const [hotelFilterTerm, setHotelFilterTerm] = useState('');
  const hotelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hotelRef.current && !hotelRef.current.contains(e.target)) {
        setIsHotelOpen(false);
        setHotelFilterTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentHotelName = selectedHotelId === 'ALL'
    ? `Tất cả cơ sở (${hotels.length} khách sạn)`
    : hotels.find((h) => h.hotel_id === selectedHotelId)?.name || 'Chọn cơ sở lưu trú';

  const displayedHotels = hotels.filter((h) =>
    (h.name || '').toLowerCase().includes(hotelFilterTerm.trim().toLowerCase())
  );

  return (
    <div className="room-filter-bar">
      {/* Search Input */}
      <div className="room-search-box">
        <SearchIcon size={16} className="room-search-box__icon" />
        <input
          type="text"
          className="room-search-box__input"
          placeholder="Tìm theo khách sạn, số phòng, tên hạng phòng, tiện nghi..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="room-search-box__clear"
            onClick={() => onSearchChange('')}
            title="Xóa tìm kiếm"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <div className="room-filter-controls">
        {/* Hotel Selector Custom Dropdown */}
        <div className="room-hotel-selector" ref={hotelRef}>
          <button
            type="button"
            className={`room-hotel-selector__btn ${isHotelOpen ? 'room-hotel-selector__btn--open' : ''}`}
            onClick={() => {
              setIsHotelOpen((prev) => !prev);
              setHotelFilterTerm('');
            }}
            aria-haspopup="listbox"
            aria-expanded={isHotelOpen}
          >
            <BuildingIcon size={14} />
            <span className="room-hotel-selector__text" title={currentHotelName}>
              {currentHotelName}
            </span>
            <ChevronDownIcon size={12} className={`room-chevron ${isHotelOpen ? 'room-chevron--up' : ''}`} />
          </button>

          {isHotelOpen && (
            <div className="room-hotel-menu" role="listbox">
              {hotels.length > 5 && (
                <div style={{ padding: '4px 6px 8px 6px' }}>
                  <input
                    type="text"
                    value={hotelFilterTerm}
                    onChange={(e) => setHotelFilterTerm(e.target.value)}
                    placeholder="Lọc tên khách sạn..."
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                </div>
              )}
              {hotels.length > 1 && !hotelFilterTerm && (
                <button
                  type="button"
                  className={`room-hotel-menu__item ${selectedHotelId === 'ALL' ? 'room-hotel-menu__item--active' : ''}`}
                  onClick={() => { onHotelChange('ALL'); setIsHotelOpen(false); }}
                >
                  <span>Tất cả cơ sở ({hotels.length} khách sạn)</span>
                  {selectedHotelId === 'ALL' && (
                    <CheckIcon size={13} strokeWidth={2.5} />
                  )}
                </button>
              )}
              {displayedHotels.length === 0 ? (
                <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                  Không tìm thấy khách sạn phù hợp
                </div>
              ) : (
                displayedHotels.map((h) => (
                  <button
                    key={h.hotel_id}
                    type="button"
                    className={`room-hotel-menu__item ${selectedHotelId === h.hotel_id ? 'room-hotel-menu__item--active' : ''}`}
                    onClick={() => { onHotelChange(h.hotel_id); setIsHotelOpen(false); }}
                  >
                    <span title={h.name}>{h.name}</span>
                    {selectedHotelId === h.hotel_id && (
                      <CheckIcon size={13} strokeWidth={2.5} />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Floor Filter */}
        <select
          className="room-select"
          value={selectedFloor}
          onChange={(e) => onFloorChange(e.target.value)}
        >
          <option value="ALL">Tất cả tầng</option>
          {floors.map((fl) => (
            <option key={fl} value={fl}>{fl}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="room-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="AVAILABLE">Đang mở bán (Khả dụng)</option>
          <option value="OCCUPIED">Đang có khách (Ở)</option>
          <option value="MAINTENANCE">Đang bảo trì</option>
          <option value="LOCKED">Đang tạm khóa</option>
        </select>

        {/* Sort Filter */}
        <select
          className="room-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="PRICE_DESC">Giá: Cao đến thấp</option>
          <option value="PRICE_ASC">Giá: Thấp đến cao</option>
          <option value="ROOM_NUM_ASC">Số phòng: 101 → 999</option>
          <option value="NAME_ASC">Hạng phòng: A → Z</option>
        </select>

        {/* View Switcher */}
        <div className="room-view-toggle">
          <button
            type="button"
            className={`room-view-btn ${viewMode === 'TABLE' ? 'room-view-btn--active' : ''}`}
            onClick={() => onViewModeChange('TABLE')}
            title="Dạng bảng danh sách"
          >
            <ListIcon size={15} />
          </button>
          <button
            type="button"
            className={`room-view-btn ${viewMode === 'MATRIX' ? 'room-view-btn--active' : ''}`}
            onClick={() => onViewModeChange('MATRIX')}
            title="Sơ đồ buồng phòng theo tầng"
          >
            <GridIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomFilterBar;
