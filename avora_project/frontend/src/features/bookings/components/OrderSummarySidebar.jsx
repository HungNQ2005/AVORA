import React from 'react';


const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('vi-VN') + ' đ';
};

const getScoreLabel = (score) => {
  const num = Number(score);
  if (isNaN(num)) return 'Đánh giá tốt';
  if (num >= 9.0) return 'Xuất sắc';
  if (num >= 8.0) return 'Tuyệt vời';
  if (num >= 7.0) return 'Rất tốt';
  if (num >= 6.0) return 'Tốt';
  return 'Hài lòng';
};

const getDailyCoupons = (coupons) => {
  if (!Array.isArray(coupons)) return [];
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const dateKey = ['year', 'month', 'day']
    .map((type) => dateParts.find((part) => part.type === type)?.value)
    .join('-');
  const getRank = (coupon) => {
    const key = `${dateKey}:${coupon.coupon_id || coupon.code}`;
    let hash = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
  };

  return [...coupons]
    .sort((a, b) => getRank(a) - getRank(b) || String(a.code).localeCompare(String(b.code)))
    .slice(0, 5);
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
 * Right Column: Order Summary Sidebar component.
 * Integrates database-driven hotel info, room pricing, Flash Sale golden hours,
 * manual coupon input, transparent conflict notification banners, and real-time price synchronization.
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
  maxCheckIn = '',
  maxCheckOut = '',
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
  const hotelImage =
    hotel?.thumbnail_url ||
    hotel?.image_url ||
    (Array.isArray(hotel?.images) && hotel.images[0]) ||
    '';
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
  const dailyCoupons = getDailyCoupons(availableCoupons);

  // Promotion Resolution Details from Backend: % = Flash Sale | Tiền thuần = Coupon
  const promotionDetails = pricing?.promotion_details || null;
  const isPercentType =
    appliedCoupon?.discount_type === 'FLASH_PERCENT' ||
    appliedCoupon?.discount_type === 'PERCENT' ||
    Boolean(appliedCoupon?.code?.startsWith('FS_'));

  const appliedType =
    promotionDetails?.applied_type ||
    (isPercentType
      ? 'FLASH_SALE'
      : appliedCoupon
        ? 'MANUAL_COUPON'
        : null);

  const isFlashSaleApplied = appliedType === 'FLASH_SALE';
  const isManualCouponApplied = appliedType === 'MANUAL_COUPON';
  const isFlashSaleAvailable = Boolean(promotionDetails?.flash_sale_available || pricing?.active_flash_sale);
  const isFlashSaleReplaced = isManualCouponApplied && isFlashSaleAvailable;
  const isFlashSaleKept =
    isFlashSaleApplied &&
    Boolean(couponCode) &&
    Number(promotionDetails?.manual_coupon_discount || 0) > 0 &&
    Number(promotionDetails?.flash_sale_discount || 0) >= Number(promotionDetails?.manual_coupon_discount || 0);

  // Smart Button state: Show "Bỏ mã" only if manual coupon is currently active AND input matches it
  const isCleanMatchWithAppliedManual =
    isManualCouponApplied &&
    appliedCoupon?.code &&
    couponCode.trim().toUpperCase() === appliedCoupon.code.toUpperCase();

  const showRemoveButton = isCleanMatchWithAppliedManual;

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
            🏨 Hình ảnh khách sạn
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
                  {reviewCount > 0 ? `${reviewCount} lượt đánh giá` : 'Điểm chất lượng'}
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
                max={maxCheckIn || undefined}
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
                max={maxCheckOut || undefined}
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

          {/* Transparent Promotion Notification Banner */}
          {isFlashSaleReplaced ? (
            <div className="summary-promo-banner summary-promo-banner--replaced">
              <div className="summary-promo-banner__header">
                <span className="summary-promo-banner__badge">TỐI ƯU GIÁ</span>
                <span className="summary-promo-banner__title">Mã giảm giá đã thay thế Flash Sale</span>
              </div>
              <p className="summary-promo-banner__desc">
                {promotionDetails?.message || `Mã ${appliedCoupon?.code} (-${formatCurrency(discountAmount)}) mang lại mức tiết kiệm tốt hơn Flash Sale của khách sạn.`}
              </p>
            </div>
          ) : isFlashSaleKept ? (
            <div className="summary-promo-banner summary-promo-banner--kept">
              <div className="summary-promo-banner__header">
                <span className="summary-promo-banner__badge">BẢO VỆ QUYỀN LỢI</span>
                <span className="summary-promo-banner__title">Giữ ưu đãi Flash Sale có lợi nhất</span>
              </div>
              <p className="summary-promo-banner__desc">
                {promotionDetails?.message || couponMessage || `Ưu đãi Flash Sale (-${formatCurrency(discountAmount)}) có lợi hơn mã vừa nhập. Hệ thống tiếp tục giữ ưu đãi Flash Sale cho bạn.`}
              </p>
            </div>
          ) : isFlashSaleApplied ? (
            <div className="summary-promo-banner summary-promo-banner--flash">
              <div className="summary-promo-banner__header">
                <span className="summary-promo-banner__icon">⚡</span>
                <span className="summary-promo-banner__title">Ưu đãi Flash Sale Khung Giờ Vàng</span>
              </div>
              <p className="summary-promo-banner__desc">
                {promotionDetails?.message || couponMessage || `Khách sạn đang trong khung giờ vàng! Đã tự động áp dụng giảm -${formatCurrency(discountAmount)} cho đơn phòng của bạn.`}
              </p>
            </div>
          ) : isManualCouponApplied ? (
            <div className="summary-promo-banner summary-promo-banner--coupon">
              <div className="summary-promo-banner__header">
                <span className="summary-promo-banner__icon">🎟️</span>
                <span className="summary-promo-banner__title">Mã giảm giá đã áp dụng</span>
              </div>
              <p className="summary-promo-banner__desc">
                {promotionDetails?.message || couponMessage || `Đã áp dụng mã ${appliedCoupon?.code} (-${formatCurrency(discountAmount)}).`}
              </p>
            </div>
          ) : null}

          <div className="summary-divider" />

          {/* Price Breakdown */}
          <h4 className="summary-price-title">Chi tiết giá tiền</h4>

          {rooms.map((rm) => (
            <div key={rm.room_type_id} className="summary-price-row">
              <span>
                {rm.type_name} ({rm.quantity} phòng × {nights} đêm × {formatCurrency(rm.unit_price)})
              </span>
              <span>{formatCurrency(rm.total_price ?? rm.unit_price * (rm.quantity || 1) * nights)}</span>
            </div>
          ))}

          <div className="summary-price-row">
            <span>Tạm tính ({rooms.reduce((acc, r) => acc + (r.quantity || 1), 0)} phòng)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {discountAmount > 0 && appliedCoupon && (
            <div className={`summary-price-row discount-row ${isFlashSaleApplied ? 'discount-row--flash' : 'discount-row--coupon'}`}>
              <span className="summary-coupon-tag">
                {isFlashSaleApplied ? (
                  <span className="summary-flash-tag">
                    ⚡ Flash Sale: <strong>{appliedCoupon.code}</strong>
                    {appliedCoupon.discount_type === 'FLASH_PERCENT' && (
                      <span className="summary-discount-pill">-{appliedCoupon.discount_value}%</span>
                    )}
                  </span>
                ) : (
                  <span className="summary-manual-tag">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    Mã coupon: <strong>{appliedCoupon.code}</strong>
                    {appliedCoupon.discount_type === 'PERCENT' && (
                      <span className="summary-discount-pill">-{appliedCoupon.discount_value}%</span>
                    )}
                  </span>
                )}
              </span>
              <span className="summary-discount-num">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          {/* Add Coupon Section */}
          <div className="summary-coupon-section">
            <label className="summary-coupon-label">
              {isFlashSaleApplied ? 'MÃ GIẢM GIÁ (THAY THẾ FLASH SALE)' : 'MÃ GIẢM GIÁ'}
            </label>
            <div className="summary-coupon-input-group">
              <input
                type="text"
                className="summary-coupon-input"
                placeholder={isFlashSaleApplied ? 'Nhập mã coupon khác (VD: AVORA50K)' : 'Nhập mã coupon (VD: AVORA50K)'}
                value={couponCode}
                onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon()}
              />
              {showRemoveButton ? (
                <button
                  type="button"
                  className="summary-coupon-btn summary-coupon-btn--remove"
                  onClick={onRemoveCoupon}
                  disabled={isApplyingCoupon}
                  title="Gỡ bỏ mã giảm giá và khôi phục Flash Sale (nếu có)"
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

            {dailyCoupons.length > 0 && (
              <>
                <div style={{ marginTop: 10, marginBottom: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  Gợi ý ưu đãi hôm nay
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dailyCoupons.map((c) => {
                    const isThisApplied = appliedCoupon?.code === c.code;
                    return (
                      <button
                        key={c.coupon_id || c.code}
                        type="button"
                        onClick={() => {
                          if (isThisApplied) {
                            onRemoveCoupon();
                          } else {
                            onCouponChange(c.code);
                            onApplyCoupon(c.code);
                          }
                        }}
                        className={`summary-daily-coupon-btn ${isThisApplied ? 'active' : ''}`}
                        title={`Đơn tối thiểu: ${formatCurrency(c.min_order_amount || 0)}`}
                      >
                        🎟 {c.code} (-{c.discount_type === 'PERCENT' || c.discount_type === 'FLASH_PERCENT' ? `${c.discount_value}%` : formatCurrency(c.discount_value)})
                        {isThisApplied && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Error feedback message directly under input */}
            {couponMessage && !isFlashSaleApplied && !isFlashSaleReplaced && (
              <div
                className={`summary-coupon-msg ${discountAmount > 0 ? 'success' : 'error'}`}
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
          <div className="summary-total-note">Đã bao gồm thuế và phí</div>

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
