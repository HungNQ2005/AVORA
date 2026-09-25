import React, { useState } from 'react';

/* SVG Icons matching reference design */
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'rgba(0,0,0,0.3)'} stroke={filled ? '#ef4444' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const LocationPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#008009" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CalendarCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#008009" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <polyline points="9 13 11 15 15 11" />
  </svg>
);

const AlertDiamondIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Format currency in VND with dots (e.g. 2.350.000 VND)
 */
const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

/**
 * Single Hotel Card Component matching the reference UI exactly.
 */
const HotelCard = ({ hotel, nights = 2, guests = 2, onSelectHotel }) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const images = hotel.images && hotel.images.length > 0 ? hotel.images : [hotel.thumbnail];
  const currentImage = images[selectedImageIdx] || images[0];

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleCardClick = () => {
    if (onSelectHotel) {
      onSelectHotel(hotel);
    }
  };

  // Generate star icons
  const starCount = Math.max(1, Math.min(5, hotel.star_quality || 4));
  const starsArray = Array.from({ length: starCount }, (_, i) => i);

  return (
    <article className="hotel-card" onClick={handleCardClick}>
      {/* ─── 1. Left Gallery Column ─── */}
      <div className="hotel-card__gallery">
        <div className="hotel-card__image-container">
          <img
            src={currentImage}
            alt={hotel.name}
            className="hotel-card__image"
            loading="lazy"
          />

          {/* Top Favorite Heart Button */}
          <button
            type="button"
            className="hotel-card__favorite-btn"
            onClick={handleFavoriteClick}
            aria-label="Thêm vào danh sách yêu thích"
          >
            <HeartIcon filled={isFavorite} />
          </button>

          {/* Bottom Promotion Tag Overlay */}
          {hotel.tag && (
            <div className="hotel-card__promo-tag">
              {hotel.tag}
            </div>
          )}
        </div>

        {/* Thumbnail Preview Strip */}
        {images.length > 1 && (
          <div className="hotel-card__thumbnails">
            {images.slice(0, 4).map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`hotel-card__thumb-btn ${idx === selectedImageIdx ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIdx(idx);
                }}
              >
                <img src={img} alt={`Preview ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. Middle Content Column ─── */}
      <div className="hotel-card__body">
        {/* Top Header Row with Name & Review Score */}
        <div className="hotel-card__header-row">
          <div className="hotel-card__title-group">
            {/* Star Rating */}
            <div className="hotel-card__stars">
              {starsArray.map((_, i) => (
                <StarIcon key={i} />
              ))}
              {hotel.is_genius && (
                <span className="hotel-card__genius-badge">Genius VIP</span>
              )}
            </div>

            {/* Hotel Name */}
            <h2 className="hotel-card__name">
              {hotel.name}
            </h2>
          </div>

          {/* Review Score Block (Top Right) */}
          <div className="hotel-card__review-block">
            <div className="hotel-card__review-text">
              <span className="hotel-card__review-label">{hotel.score_label || 'Tuyệt vời'}</span>
              <span className="hotel-card__review-count">
                {new Intl.NumberFormat('vi-VN').format(hotel.reviews_count || 120)} đánh giá
              </span>
            </div>
            <div className="hotel-card__review-badge">
              {hotel.star_rating ? hotel.star_rating.toFixed(1) : '9.0'}
            </div>
          </div>
        </div>

        {/* Location Row */}
        <div className="hotel-card__location">
          <LocationPinIcon />
          <span>{hotel.address || hotel.city_name}</span>
        </div>

        {/* Highlighted Room Type Box */}
        {hotel.room_highlight && (
          <div className="hotel-card__room-box">
            <div className="hotel-card__room-name">
              {hotel.room_highlight.name}
            </div>
            <div className="hotel-card__room-details">
              {hotel.room_highlight.bed_type} · {hotel.room_highlight.room_size}
            </div>
          </div>
        )}

        {/* Key Features & Amenities List */}
        <ul className="hotel-card__amenities-list">
          {hotel.facilities && hotel.facilities.slice(0, 3).map((f) => (
            <li key={f.id || f.name} className="hotel-card__amenity-item">
              <CheckIcon />
              <span>{f.name}</span>
            </li>
          ))}

          {/* Cancellation Policy */}
          {hotel.cancellation_policy && (
            <li className="hotel-card__amenity-item hotel-card__amenity-item--policy">
              <CalendarCheckIcon />
              <span>{hotel.cancellation_policy.description}</span>
            </li>
          )}

          {/* Urgency Available Rooms Alert */}
          {hotel.available_rooms !== undefined && hotel.available_rooms <= 5 && (
            <li className="hotel-card__amenity-item hotel-card__amenity-item--urgency">
              <AlertDiamondIcon />
              <span>Còn {hotel.available_rooms} phòng với mức giá này</span>
            </li>
          )}
        </ul>

        {/* ─── 3. Pricing & CTA Section ─── */}
        <div className="hotel-card__footer-row">
          <div className="hotel-card__stay-info">
            <span className="hotel-card__stay-nights">
              {nights} đêm, {guests} người lớn
            </span>
            <span className="hotel-card__breakfast-tag">
              Bao gồm bữa sáng
            </span>
          </div>

          <div className="hotel-card__pricing-group">
            {hotel.original_price && hotel.original_price > hotel.price && (
              <span className="hotel-card__original-price">
                {formatPrice(hotel.original_price)}
              </span>
            )}
            <div className="hotel-card__current-price">
              {formatPrice(hotel.price)}
            </div>
            <div className="hotel-card__tax-note">
              Đã bao gồm thuế và phí
            </div>

            {/* CTA Button */}
            <button
              type="button"
              className="hotel-card__cta-btn"
              onClick={handleCardClick}
            >
              <span>Xem phòng trống</span>
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default HotelCard;
