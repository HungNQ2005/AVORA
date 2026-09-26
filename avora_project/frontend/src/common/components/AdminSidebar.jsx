import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminSidebar.css';

const AdminSidebar = () => {
  return (
    <aside className="admin-sidebar">
      {/* Brand & Logo Header */}
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo-group">
          <span className="admin-sidebar__logo-text">Avora</span>
          <span className="admin-sidebar__badge">ENTERPRISE</span>
        </div>
        <button className="admin-sidebar__toggle-btn" title="Tìm nhanh & Thu gọn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="admin-sidebar__nav">
        {/* TỔNG QUAN */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">TỔNG QUAN</div>
          <NavLink to="/admin" className="admin-sidebar__link" end>
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            <span className="admin-sidebar__label">Bảng điều khiển</span>
          </NavLink>
        </div>

        {/* NGƯỜI DÙNG & PHÂN QUYỀN */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">NGƯỜI DÙNG & PHÂN QUYỀN</div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Quản lý người dùng</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Vai trò & Quyền hạn (RBAC)</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span className="admin-sidebar__label">Lịch sử truy cập</span>
          </div>
        </div>

        {/* HỆ THỐNG KHÁCH SẠN */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">HỆ THỐNG KHÁCH SẠN</div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Quản lý khách sạn</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15l2 2 4-4"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Phê duyệt hồ sơ chỗ nghỉ</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </span>
            <span className="admin-sidebar__label">Phân loại & Xếp hạng sao</span>
          </div>
        </div>

        {/* QUẢN LÝ PHÒNG & LƯU TRÚ (ACTIVE SECTION) */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">QUẢN LÝ PHÒNG & LƯU TRÚ</div>
          <NavLink
            to="/admin/room-types"
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Quản lý loại phòng</span>
          </NavLink>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </span>
            <span className="admin-sidebar__label">Sơ đồ buồng phòng & Trạng thái</span>
          </div>
          <NavLink
            to="/admin/amenities"
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
            </span>
            <span className="admin-sidebar__label">Quản lý tiện nghi</span>
          </NavLink>
        </div>

        {/* MARKETING & DOANH THU */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">MARKETING & DOANH THU</div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </span>
            <span className="admin-sidebar__label">Khuyến mãi & Coupon</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </span>
            <span className="admin-sidebar__label">Báo cáo doanh thu & Booking</span>
          </div>
        </div>

        {/* HỆ THỐNG */}
        <div className="admin-sidebar__group">
          <div className="admin-sidebar__group-title">HỆ THỐNG</div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Cài đặt chung</span>
          </div>
          <div className="admin-sidebar__link disabled">
            <span className="admin-sidebar__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
            <span className="admin-sidebar__label">Cấu hình thông báo & Audit</span>
          </div>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__profile">
          <div className="admin-sidebar__avatar">TN</div>
          <div className="admin-sidebar__user-info">
            <span className="admin-sidebar__user-name">Nguyễn Thành Nam</span>
            <span className="admin-sidebar__user-role">Hotel Manager</span>
          </div>
          <button className="admin-sidebar__logout-btn" title="Đăng xuất / Tùy chọn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
