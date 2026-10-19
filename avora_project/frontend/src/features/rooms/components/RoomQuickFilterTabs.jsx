import React from 'react';
import './RoomQuickFilterTabs.css';

const RoomQuickFilterTabs = ({
  activeTab = 'ALL',
  onTabChange,
  counts = {},
  roomTypeCategories = [],
}) => {
  return (
    <div className="room-quick-tabs">
      {/* Tab: Tất cả */}
      <button
        type="button"
        className={`room-quick-tab ${activeTab === 'ALL' ? 'room-quick-tab--active' : ''}`}
        onClick={() => onTabChange('ALL')}
      >
        <span className="room-quick-tab__icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </span>
        <span>Tất cả buồng phòng</span>
        <span className="room-quick-tab__count">{counts.total || 0}</span>
      </button>

      {/* Dynamic Category Tabs */}
      {roomTypeCategories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`room-quick-tab ${activeTab === cat.id ? 'room-quick-tab--active' : ''}`}
          onClick={() => onTabChange(cat.id)}
        >
          <span>{cat.name}</span>
          <span className="room-quick-tab__count">{cat.count}</span>
        </button>
      ))}

      {/* Tab: Đang mở bán */}
      <button
        type="button"
        className={`room-quick-tab room-quick-tab--status-green ${activeTab === 'STATUS_AVAILABLE' ? 'room-quick-tab--active' : ''}`}
        onClick={() => onTabChange('STATUS_AVAILABLE')}
      >
        <span className="room-quick-tab__dot room-quick-tab__dot--green"></span>
        <span>Đang mở bán</span>
        <span className="room-quick-tab__count">{counts.available || 0}</span>
      </button>

      {/* Tab: Đang tạm khóa / Bảo trì */}
      <button
        type="button"
        className={`room-quick-tab room-quick-tab--status-orange ${activeTab === 'STATUS_LOCKED' ? 'room-quick-tab--active' : ''}`}
        onClick={() => onTabChange('STATUS_LOCKED')}
      >
        <span className="room-quick-tab__dot room-quick-tab__dot--orange"></span>
        <span>Đang tạm khóa</span>
        <span className="room-quick-tab__count">{counts.locked || 0}</span>
      </button>
    </div>
  );
};

export default RoomQuickFilterTabs;
