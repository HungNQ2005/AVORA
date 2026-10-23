import React from 'react';

/**
 * Banner displaying logged-in user status and active database coupons from m_coupon.
 */
const GeniusBanner = ({ user, availableCoupons = [] }) => {
  const topCoupon = availableCoupons[0] || null;
  const couponHint = topCoupon
    ? `Mã ưu đãi đang mở trên hệ thống: ${topCoupon.code} (Giảm ${
        topCoupon.discount_type === 'PERCENT'
          ? `${topCoupon.discount_value}%`
          : `${Number(topCoupon.discount_value).toLocaleString('vi-VN')} đ`
      })`
    : 'Hỗ trợ đặt phòng trực tuyến và giữ chỗ tức thì trên AVORA.';

  return (
    <div className="genius-banner">
      <div className="genius-banner-left">
        <div className="genius-badge-icon">{user ? (user.full_name || user.email || 'U').charAt(0).toUpperCase() : 'A'}</div>
        <div className="genius-banner-text">
          <h4>
            {user
              ? `Xin chào, ${user.full_name || user.email}`
              : 'Đặt phòng trực tuyến trên hệ thống Avora'}
          </h4>
          <p>{couponHint}</p>
        </div>
      </div>
      <div className="genius-star-icon" title="Avora Member">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </div>
    </div>
  );
};

export default GeniusBanner;
