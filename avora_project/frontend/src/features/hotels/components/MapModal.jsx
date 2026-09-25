import React from 'react';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

const MapModal = ({ isOpen, onClose, hotels = [], destination = 'Đà Nẵng' }) => {
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
            <h3 className="map-modal-title">Bản đồ khách sạn tại {destination}</h3>
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
