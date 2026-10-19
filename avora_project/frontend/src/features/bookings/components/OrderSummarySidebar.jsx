import React from 'react';

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('vi-VN') + ' đ';
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = dayNames[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Right Column: Order Summary Sidebar component bound to DB hotel, room pricing, and m_coupon.
 */
const OrderSummarySidebar = ({
  hotel,
  pricing,
  checkInDate,
  checkOutDate,
  onCheckInChange,
  onCheckOutChange,
  minCheckIn = '',
  minCheckOut = '',
  nights = 1,
  couponCode = '',
  onCouponChange,
  onApplyCoupon,
  onRemoveCoupon,
  isApplyingCoupon = false,
  couponMessage = null,
  onConfirmBooking,
  isSubmitting = false,
}) => {
  const hotelName = hotel?.name || 'Đang tải thông tin khách sạn...';
  const hotelAddress = hotel?.address || '';
  const hotelImage = hotel?.thumbnail_url || hotel?.image_url || (Array.isArray(hotel?.images) && hotel.images[0]) || '';
  const starQuality = Number(hotel?.star_quality || 0);
  const ratingScore = hotel?.rating_score ?? hotel?.star_rating ?? null;
  const reviewCount = Number(hotel?.review_count ?? hotel?.reviews_count ?? 0);

  const rooms = Array.isArray(pricing?.rooms) ? pricing.rooms : [];
  const firstRoom = rooms[0] || {};
  const unitPrice = Number(firstRoom.unit_price || 0);
  const quantity = Number(firstRoom.quantity || 1);
  const subtotal = Number(pricing?.subtotal ?? unitPrice * quantity * nights);
  const discountAmount = Number(pricing?.discount_amount || 0);
  const totalAmount = Number(pricing?.total_amount ?? Math.max(0, subtotal - discountAmount));
  const appliedCoupon = pricing?.coupon || null;
  const availableCoupons = Array.isArray(pricing?.available_coupons) ? pricing.available_coupons : [];

  const getScoreLabel = (score) => {
    const num = Number(score);
    if (!num) return 'Chưa có đánh giá';
    if (num >= 9) return 'Xuất sắc';
    if (num >= 8) return 'Tuyệt vời';
    if (num >= 7) return 'Rất tốt';
    return 'Đánh giá tốt';
  };

  return (
    <div className="booking-summary-col">
      <div className="booking-summary-card">
        {/* Hotel Thumbnail Image */}
        {hotelImage ? (
          <img
            src={hotelImage}
            alt={hotelName}
            className="summary-hotel-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="summary-hotel-img"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            🏨 Ảnh khách sạn từ CSDL
          </div>
        )}

        <div className="summary-content">
          {/* Star Rating */}
          {starQuality > 0 && (
            <div className="summary-hotel-stars">
              {'★'.repeat(starQuality)} Khách sạn {starQuality} sao
            </div>
          )}

          {/* Hotel Name */}
          <h2 className="summary-hotel-name">{hotelName}</h2>

          {/* Location */}
          {hotelAddress && (
            <div className="summary-hotel-address">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{hotelAddress}</span>
            </div>
          )}

          {/* Review Score Badge */}
          {ratingScore != null && (
            <div className="summary-review-row">
              <div>
                <div className="summary-review-text">{getScoreLabel(ratingScore)}</div>
                <div className="summary-review-count">
                  {reviewCount > 0 ? `${reviewCount} lượt đánh giá trong CSDL` : 'Điểm chất lượng từ CSDL'}
                </div>
              </div>
              <div className="summary-review-score">{ratingScore}</div>
            </div>
          )}

          <div className="summary-divider" />

          {/* Stay Dates */}
          <div className="summary-dates-grid">
            <div className="summary-date-picker-box">
              <label className="summary-date-item-label" htmlFor="sidebar-checkin">
                NHẬN PHÒNG
              </label>
              <input
                id="sidebar-checkin"
                type="date"
                className="summary-date-input"
                value={checkInDate || ''}
                min={minCheckIn}
                onChange={(e) => onCheckInChange && onCheckInChange(e.target.value)}
              />
              <div className="summary-date-item-val">
                {formatDateLabel(checkInDate)}
              </div>
            </div>
            <div className="summary-date-picker-box">
              <label className="summary-date-item-label" htmlFor="sidebar-checkout">
                TRẢ PHÒNG
              </label>
              <input
                id="sidebar-checkout"
                type="date"
                className="summary-date-input"
                value={checkOutDate || ''}
                min={minCheckOut}
                onChange={(e) => onCheckOutChange && onCheckOutChange(e.target.value)}
              />
              <div className="summary-date-item-val">
                {formatDateLabel(checkOutDate)}
              </div>
            </div>
          </div>

          <div className="summary-stay-badge">
            <span>
              Thời gian lưu trú: <strong>{nights} đêm</strong> ({quantity} phòng)
            </span>
          </div>

          <div className="summary-divider" />

          {/* Price Breakdown */}
          <h4 className="summary-price-title">Chi tiết giá tiền</h4>

          {rooms.map((rm) => (
            <div key={rm.room_type_id} className="summary-price-row">
              <span>
                {rm.type_name} ({rm.quantity} phòng × {nights} đêm × {formatCurrency(rm.unit_price)})
              </span>
              {/* <span>{formatCurrency(rm.total_price ?? rm.unit_price * rm.quantity * nights)}</span> */}
            </div>
          ))}

          {discountAmount > 0 && appliedCoupon && (
            <div className="summary-price-row discount-row">
              <span className="summary-coupon-tag">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                {appliedCoupon.code} (Đã áp dụng)
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          {/* Add Coupon Section */}
          <div className="summary-coupon-section">
            <label className="summary-coupon-label">MÃ GIẢM GIÁ</label>
            <div className="summary-coupon-input-group">
              <input
                type="text"
                className="summary-coupon-input"
                placeholder="Nhập mã coupon (VD: SAIGON10)"
                value={couponCode}
                onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon()}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  className="summary-coupon-btn"
                  onClick={onRemoveCoupon}
                  disabled={isApplyingCoupon}
                >
                  Bỏ mã
                </button>
              ) : (
                <button
                  type="button"
                  className="summary-coupon-btn"
                  onClick={() => onApplyCoupon()}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                >
                  {isApplyingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              )}
            </div>

            {availableCoupons.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableCoupons.slice(0, 5).map((c) => (
                  <button
                    key={c.coupon_id || c.code}
                    type="button"
                    onClick={() => {
                      onCouponChange(c.code);
                      onApplyCoupon(c.code);
                    }}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: appliedCoupon?.code === c.code ? '1px solid #059669' : '1px dashed #94a3b8',
                      background: appliedCoupon?.code === c.code ? '#ecfdf5' : '#f8fafc',
                      color: appliedCoupon?.code === c.code ? '#059669' : '#334155',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    title={`Đơn tối thiểu: ${formatCurrency(c.min_order_amount || 0)}`}
                  >
                    🎟 {c.code} (-{c.discount_type === 'PERCENT' ? `${c.discount_value}%` : formatCurrency(c.discount_value)})
                  </button>
                ))}
              </div>
            )}

            {couponMessage && (
              <div
                className={`summary-coupon-msg ${discountAmount > 0 ? 'success' : 'error'
                  }`}
              >
                {couponMessage}
              </div>
            )}
          </div>

          <div className="summary-divider" />

          {/* Total Price */}
          <div className="summary-total-container">
            <span className="summary-total-label">Tổng chi phí</span>
            <span className="summary-total-price">{formatCurrency(totalAmount)}</span>
          </div>


          {/* Submit Action Button */}
          <button
            type="button"
            className="booking-confirm-btn"
            onClick={onConfirmBooking}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Đang lưu đơn đặt phòng...</span>
            ) : (
              <>
                <span>Xác nhận Đặt phòng</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummarySidebar;
