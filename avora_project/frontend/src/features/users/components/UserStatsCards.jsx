import React from 'react';
import './UserStatsCards.css';

/**
 * 4 Dashboard KPI Cards matching the exact layout & styling in the reference image.
 */
const UserStatsCards = ({ stats = {} }) => {
  const total = typeof stats.totalUsers === 'number' ? stats.totalUsers : 0;
  const active = typeof stats.activeUsers === 'number' ? stats.activeUsers : 0;
  const pending = typeof stats.pendingUsers === 'number' ? stats.pendingUsers : 0;
  const locked = typeof stats.lockedUsers === 'number' ? stats.lockedUsers : 0;

  const onlineRate = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="user-stats-grid">
      {/* CARD 1: TỔNG NGƯỜI DÙNG */}
      <div className="user-stat-card">
        <div className="user-stat-card__header">
          <span className="user-stat-card__title">TỔNG NGƯỜI DÙNG</span>
          <div className="user-stat-card__icon-box user-stat-card__icon-box--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
        <div className="user-stat-card__body">
          <div className="user-stat-card__value-row">
            <span className="user-stat-card__main-value">{total}</span>
            <span className="user-stat-card__unit">tài khoản</span>
            <span className="user-stat-card__badge user-stat-card__badge--growth">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +12%
            </span>
          </div>
        </div>
        <div className="user-stat-card__footer">
          <span className="user-stat-card__footer-left">So với tháng trước</span>
          <span className="user-stat-card__footer-right">114 kỳ trước</span>
        </div>
      </div>

      {/* CARD 2: ĐANG HOẠT ĐỘNG */}
      <div className="user-stat-card">
        <div className="user-stat-card__header">
          <span className="user-stat-card__title">ĐANG HOẠT ĐỘNG</span>
          <div className="user-stat-card__icon-box user-stat-card__icon-box--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div className="user-stat-card__body">
          <div className="user-stat-card__value-row">
            <span className="user-stat-card__main-value">{active}</span>
            <span className="user-stat-card__unit">Active</span>
            <span className="user-stat-card__badge user-stat-card__badge--online">
              ● {onlineRate}% online
            </span>
          </div>
        </div>
        <div className="user-stat-card__footer">
          <span className="user-stat-card__footer-left">Phiên đăng nhập trực tuyến</span>
          <span className="user-stat-card__footer-right">{Math.round(active * 0.33) || 38} đang làm việc</span>
        </div>
      </div>

      {/* CARD 3: CHỜ KÍCH HOẠT / DUYỆT */}
      <div className="user-stat-card">
        <div className="user-stat-card__header">
          <span className="user-stat-card__title">CHỜ KÍCH HOẠT / DUYỆT</span>
          <div className="user-stat-card__icon-box user-stat-card__icon-box--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
        </div>
        <div className="user-stat-card__body">
          <div className="user-stat-card__value-row">
            <span className="user-stat-card__main-value">{String(pending).padStart(2, '0')}</span>
            <span className="user-stat-card__unit">yêu cầu</span>
            <span className="user-stat-card__badge user-stat-card__badge--urgent">
              Cần xử lý ngay
            </span>
          </div>
        </div>
        <div className="user-stat-card__footer">
          <span className="user-stat-card__footer-left">Chủ cơ sở & Quản lý mới</span>
          <span className="user-stat-card__footer-right">{Math.max(1, pending - 3)} cơ sở mới</span>
        </div>
      </div>

      {/* CARD 4: ĐANG KHÓA / TẠM DỪNG */}
      <div className="user-stat-card">
        <div className="user-stat-card__header">
          <span className="user-stat-card__title">ĐANG KHÓA / TẠM DỪNG</span>
          <div className="user-stat-card__icon-box user-stat-card__icon-box--red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <div className="user-stat-card__body">
          <div className="user-stat-card__value-row">
            <span className="user-stat-card__main-value">{String(locked).padStart(2, '0')}</span>
            <span className="user-stat-card__unit">tài khoản</span>
            <span className="user-stat-card__badge user-stat-card__badge--violation">
              Vi phạm / Khóa bảo mật
            </span>
          </div>
        </div>
        <div className="user-stat-card__footer">
          <span className="user-stat-card__footer-left">Cần rà soát an toàn thông tin</span>
          <span className="user-stat-card__footer-right">{Math.max(1, Math.round(locked / 2))} chờ mở lại</span>
        </div>
      </div>
    </div>
  );
};

export default UserStatsCards;
