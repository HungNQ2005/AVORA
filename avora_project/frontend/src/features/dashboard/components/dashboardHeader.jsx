import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { codeNameParser } from '../../../utils/codeNameParser';
import './dashboardHeader.css';

const ROLE_BADGE_CONFIG = {
  VEN: { label: 'Chủ khách sạn', className: 'role-badge--vendor' },
  VENDOR: { label: 'Chủ khách sạn', className: 'role-badge--vendor' },
  ADM: { label: 'Quản trị hệ thống', className: 'role-badge--admin' },
  ADMIN: { label: 'Quản trị hệ thống', className: 'role-badge--admin' },
  SYSTEM_ADMIN: { label: 'Quản trị hệ thống', className: 'role-badge--admin' },
  BMR: { label: 'Quản lý kinh doanh', className: 'role-badge--bmr' },
  BUSINESS_MANAGER: { label: 'Quản lý kinh doanh', className: 'role-badge--bmr' },
};

// Quick navigation items for search bar based on roles
const DASHBOARD_SEARCH_ITEMS = [
  { path: '/dashboard/wallet', title: 'Ví & Liên kết ngân hàng', category: 'Tài chính', roles: ['VEN', 'VENDOR'] },
  { path: '/dashboard/statistics', title: 'Báo cáo doanh thu & Thống kê', category: 'Tổng quan', roles: ['VEN', 'VENDOR', 'ADM', 'ADMIN'] },
  { path: '/dashboard/hotel-management', title: 'Quản lý khách sạn', category: 'Hệ thống khách sạn', roles: ['VEN', 'VENDOR', 'ADM', 'ADMIN'] },
  { path: '/dashboard/rooms', title: 'Quản lý buồng phòng', category: 'Phòng & Lưu trú', roles: ['VEN', 'VENDOR', 'ADM', 'ADMIN'] },
  { path: '/dashboard/room-types', title: 'Quản lý loại phòng', category: 'Phòng & Lưu trú', roles: ['ADM', 'ADMIN'] },
  { path: '/dashboard/amenities', title: 'Quản lý tiện nghi', category: 'Phòng & Lưu trú', roles: ['ADM', 'ADMIN'] },
  { path: '/dashboard/coupons', title: 'Khuyến mãi & Mã giảm giá', category: 'Marketing', roles: ['BMR', 'BUSINESS_MANAGER'] },
  { path: '/dashboard/refund-policies', title: 'Chính sách hoàn tiền', category: 'Chính sách', roles: ['BMR', 'BUSINESS_MANAGER'] },
  { path: '/dashboard/commission-policies', title: 'Chính sách phí hoa hồng', category: 'Chính sách', roles: ['BMR', 'BUSINESS_MANAGER'] },
  { path: '/dashboard/users', title: 'Quản lý người dùng', category: 'Hệ thống', roles: ['ADM', 'ADMIN'] },
  { path: '/dashboard/roles', title: 'Vai trò & Phân quyền (RBAC)', category: 'Hệ thống', roles: ['ADM', 'ADMIN'] },
];

const DashboardHeader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const notifRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Role badge resolution
  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
    .trim().toUpperCase().replace(/[ -]+/g, '_');
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');

  let roleKey = roleCode;
  if (!roleKey && roleCd === '1') roleKey = 'ADM';
  if (!roleKey && roleCd === '3') roleKey = 'BMR';
  if (!roleKey && roleCd === '4') roleKey = 'VEN';

  const badgeConfig = ROLE_BADGE_CONFIG[roleKey] || {
    label: roleKey ? codeNameParser(roleKey) : 'Thành viên',
    className: 'role-badge--default',
  };

  // Filter search items by user role and search query
  const availableItems = DASHBOARD_SEARCH_ITEMS.filter((item) => {
    if (!item.roles.includes(roleKey)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="dashboard-header">
      {/* Left: Global Quick Search (Replaces duplicated page titles and breadcrumbs) */}
      <div className="dashboard-header__left" ref={searchRef}>
        <div className={`dashboard-header__search ${searchFocused ? 'dashboard-header__search--focused' : ''}`}>
          <svg className="dashboard-header__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="dashboard-header__search-input"
            placeholder="Tìm nhanh tính năng, trang quản lý..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
          />

        </div>

        {/* Quick Search Dropdown Menu */}
        {searchFocused && (
          <div className="dashboard-header__search-menu" role="listbox">
            <div className="dashboard-header__search-menu-label">
              {searchQuery.trim() ? 'Kết quả tìm kiếm' : 'Điều hướng nhanh'}
            </div>
            {availableItems.length === 0 ? (
              <div className="dashboard-header__search-empty">Không tìm thấy trang phù hợp</div>
            ) : (
              availableItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="dashboard-header__search-item"
                  onClick={() => {
                    navigate(item.path);
                    setSearchFocused(false);
                    setSearchQuery('');
                  }}
                >
                  <div className="dashboard-header__search-item-info">
                    <span className="dashboard-header__search-item-title">{item.title}</span>
                    <span className="dashboard-header__search-item-cat">{item.category}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Actions, Badges, Notifications, Navigation */}
      <div className="dashboard-header__actions" ref={notifRef}>
        {/* Role Pill */}
        <div className={`dashboard-header__role-badge ${badgeConfig.className}`}>
          <span className="dashboard-header__role-dot" />
          <span>{badgeConfig.label}</span>
        </div>

        {/* Bell Notification */}
        <div className="dashboard-header__notif-wrapper">
          <button
            type="button"
            className={`dashboard-header__bell ${notifOpen ? 'dashboard-header__bell--active' : ''}`}
            aria-label="Thông báo hệ thống"
            title="Thông báo hệ thống"
            onClick={() => setNotifOpen((prev) => !prev)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasUnread && <span className="dashboard-header__unread-dot" />}
          </button>
        </div>

        {/* Back to Homepage Button */}
        <Link to="/" className="dashboard-header__home-link" title="Quay lại trang chủ Avora">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Về trang chủ</span>
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
