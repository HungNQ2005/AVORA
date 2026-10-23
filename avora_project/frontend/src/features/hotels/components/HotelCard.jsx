import React, { useState, useEffect } from 'react';
import { isHotelSaved, toggleFavoriteHotel } from '../../../utils/favoritesStorage';

import {
  StarIcon,
  HeartIcon,
  PinIcon as LocationPinIcon,
  CheckIcon,
  CalendarCheckIcon,
  AlertTriangleIcon as AlertDiamondIcon,
  ChevronRightIcon,
} from '../../../common/components/icons';


/**
 * Format currency in VND with dots (e.g. 2.350.000 VND)
 */
const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

const cleanPolicyText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.replace(/<!--META:[\s\S]*?-->/g, '').trim();
  clean = clean.replace(/^\[.*?\]\s*/g, '').trim();
  const condMatch = clean.match(/Điều kiện:\s*(.*)$/i);
  let descText = clean;
  if (condMatch) {
    descText = descText.replace(/Điều kiện:\s*.*$/i, '').trim();
  }
  if (descText) return descText;
  if (condMatch && condMatch[1] && condMatch[1].trim()) {
    return condMatch[1].trim();
  }
  return clean;
};

/**
 * Single Hotel Card Component matching the reference UI exactly.
 */
const HotelCard = ({ hotel, nights = 2, guests = 2, onSelectHotel }) => {
  if (!hotel || (hotel.hotel_status && hotel.hotel_status !== 'ACTIVE')) {
    return null;
  }

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isFavorite, setIsFavorite] = useState(() => isHotelSaved(hotel?.hotel_id || hotel?.id));

  useEffect(() => {
    setIsFavorite(isHotelSaved(hotel?.hotel_id || hotel?.id));
  }, [hotel]);

  const images = hotel.images && hotel.images.length > 0 ? hotel.images : (hotel.thumbnail ? [hotel.thumbnail] : []);
  const currentImage = images[selectedImageIdx] || images[0] || '';

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    const nowSaved = toggleFavoriteHotel(hotel);
    setIsFavorite(nowSaved);
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
            title={isFavorite ? "Đã lưu vào danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
            aria-label={isFavorite ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
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
              {hotel.room_highlight.room_numbers?.length > 0
                ? `Phòng ${hotel.room_highlight.room_numbers.join(', ')}${
                    hotel.room_highlight.floors?.length > 0
                      ? ` (${hotel.room_highlight.floors.join(', ')})`
                      : ''
                  } · `
                : ''}
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
              <span>
                {cleanPolicyText(hotel.cancellation_policy.description)}
              </span>
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
