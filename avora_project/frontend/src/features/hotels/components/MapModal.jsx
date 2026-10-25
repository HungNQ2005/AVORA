import React from 'react';

import { CloseIcon, StarIcon } from '../../../common/components/icons';


const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

const MapModal = ({ isOpen, onClose, hotels = [], destination = '' }) => {
  const [activeHotel, setActiveHotel] = React.useState(hotels[0] || null);

  React.useEffect(() => {
    if (hotels && hotels.length > 0 && !activeHotel) {
      setActiveHotel(hotels[0]);
    }
  }, [hotels, activeHotel]);

  if (!isOpen) return null;

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="map-modal-header">
          <div>
            <h3 className="map-modal-title">Bản đồ khách sạn{destination ? ` tại ${destination}` : ''}</h3>
            <span className="map-modal-subtitle">
              Hiển thị {hotels.length} chỗ nghỉ có sẵn trong khu vực
            </span>
          </div>
          <button
            type="button"
            className="map-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng bản đồ"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="map-modal-body">
          {/* Interactive stylized Map Area */}
          <div className="map-modal-canvas">
            <div className="map-canvas-background">
              {/* Simulated Map Ocean and Coastline */}
              <div className="map-coastline" />
              <div className="map-roads-grid" />

              {/* Hotel Pins */}
              {hotels.map((hotel, index) => {
                // Approximate positions based on lat/lng or indexed grid for clean visuals
                const leftPos = hotel.lng ? Math.min(85, Math.max(15, ((hotel.lng - 108.15) / 0.15) * 100)) : 25 + (index * 12) % 65;
                const topPos = hotel.lat ? Math.min(85, Math.max(15, ((16.12 - hotel.lat) / 0.15) * 100)) : 20 + (index * 14) % 60;
                const isSelected = activeHotel?.hotel_id === hotel.hotel_id;

                return (
                  <button
                    key={hotel.hotel_id || index}
                    type="button"
                    className={`map-hotel-pin ${isSelected ? 'is-selected' : ''}`}
                    style={{ left: `${leftPos}%`, top: `${topPos}%` }}
                    onClick={() => setActiveHotel(hotel)}
                  >
                    <span className="map-pin-price">{formatPrice(hotel.price)}</span>
                    <span className="map-pin-arrow" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Hotel Preview Card inside map */}
          {activeHotel && (
            <div className="map-modal-hotel-preview">
              <img
                src={activeHotel.thumbnail || (activeHotel.images && activeHotel.images[0])}
                alt={activeHotel.name}
                className="map-preview-img"
              />
              <div className="map-preview-content">
                <div className="map-preview-stars">
                  {Array.from({ length: activeHotel.star_quality || 4 }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                  <span className="map-preview-score">{activeHotel.star_rating?.toFixed(1) || '9.0'}</span>
                </div>
                <h4 className="map-preview-title">{activeHotel.name}</h4>
                <p className="map-preview-address">{activeHotel.address}</p>
                <div className="map-preview-price">
                  <span className="map-preview-price-val">{formatPrice(activeHotel.price)}</span>
                  <span className="map-preview-price-sub">/ đêm</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapModal;
