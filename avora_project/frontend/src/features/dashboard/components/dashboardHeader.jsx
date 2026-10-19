import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { codeNameParser } from '../../../utils/codeNameParser';
import './dashboardHeader.css';

const ROLE_BADGE_LABELS = {
  VEN: 'Chủ khách sạn',
  VENDOR: 'Chủ khách sạn',
  ADM: 'Quản trị hệ thống',
  ADMIN: 'Quản trị hệ thống',
  SYSTEM_ADMIN: 'Quản trị hệ thống',
  BMR: 'Quản lý kinh doanh',
  BUSINESS_MANAGER: 'Quản lý kinh doanh',
};

const DashboardHeader = () => {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const roleCode = String(user?.role_code_name || user?.role_cd || '').trim().toUpperCase();
  const roleLabel = ROLE_BADGE_LABELS[roleCode] || (roleCode ? codeNameParser(roleCode) : 'Chưa xác định');

  return (
    <header className="dashboard-header">
      <h1 className="dashboard-header__title">Bảng điều khiển</h1>
      <div className="dashboard-header__actions">
        <span className="dashboard-header__role-badge">{roleLabel}</span>
        <button
          type="button"
          className="dashboard-header__bell"
          aria-label="Thông báo"
          onClick={() => setNotifOpen((open) => !open)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        {notifOpen && (
          <div className="dashboard-header__notif-panel" role="dialog">
            <p>Không có thông báo mới.</p>
          </div>
        )}
        <Link to="/" className="dashboard-header__home-link">← Về trang chủ</Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
