import React from 'react';
import './AmenityCategoryTabs.css';

const AmenityCategoryTabs = ({
  activeTab, // 'ALL' | 'ROOM' | 'HOTEL' | 'HIGHLIGHT'
  onTabChange,
  stats,
}) => {
  const total = stats?.totalFacilities ?? 0;
  const roomCount = stats?.roomFacilitiesCount ?? 0;
  const hotelCount = stats?.hotelFacilitiesCount ?? 0;
  const highlightCount = stats?.highlightCount ?? 0;

  const tabs = [
    { id: 'ALL', label: 'Tất cả tiện nghi', count: total },
    { id: 'ROOM', label: 'Tiện nghi trong phòng', count: roomCount },
    { id: 'HOTEL', label: 'Tiện ích khách sạn / Resort', count: hotelCount },
    {
      id: 'HIGHLIGHT',
      label: 'Tiện ích nổi bật (Highlight)',
      count: highlightCount,
      hasIcon: true,
    },
  ];

  return (
    <div className="amenity-tabs-wrapper">
      <div className="amenity-tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`amenity-tab-btn ${isActive ? 'amenity-tab-btn--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.hasIcon && (
                <svg className="amenity-tab-spark-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              )}
              <span className="amenity-tab-label">{tab.label}</span>
              <span className={`amenity-tab-badge ${isActive ? 'amenity-tab-badge--active' : ''}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AmenityCategoryTabs;
