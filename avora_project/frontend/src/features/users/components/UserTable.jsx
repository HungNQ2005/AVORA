import React, { useState } from 'react';
import './UserTable.css';

/**
 * Helper to get user initials for avatar
 */
const getInitials = (name) => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase();
};

/**
 * Format relative time or recent activity
 */
const formatActivityTime = (user) => {
  if (user.account_status === 'DEACTIVATED') {
    return {
      statusText: 'Vừa mới khóa',
      subText: 'Khôi phục truy cập',
      isDanger: true,
    };
  }

  if (user.updated_at) {
    const d = new Date(user.updated_at);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return {
      statusText: `Hôm nay ${timeStr}`,
      subText: 'Đăng nhập hệ thống',
      isDanger: false,
    };
  }

  return {
    statusText: 'Mới đăng ký',
    subText: 'Kích hoạt tài khoản',
    isDanger: false,
  };
};

const UserTable = ({
  users = [],
  loading = false,
  error = null,
  onRetry,
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  onToggleStatus,
  onEditUser,
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(users.map((u) => u.user_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.user_id));

  // Quick stats for current page
  const activeCount = users.filter((u) => u.account_status === 'ACTIVE').length;
  const pendingCount = users.filter((u) => u.account_status === 'VERIFYING').length;
  const lockedCount = users.filter((u) => u.account_status === 'DEACTIVATED').length;

  // Pagination calculations
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate visible pagination numbers
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisibleButtons = 5;

    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="user-table-card">
        <div className="user-table-loading">
          <div className="user-table-spinner"></div>
          <p>Đang tải danh sách người dùng từ cơ sở dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-table-card">
        <div className="user-table-error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Lỗi tải dữ liệu người dùng</h3>
          <p>{error}</p>
          <button type="button" className="user-table-retry-btn" onClick={onRetry}>
            Thử lại kết nối
          </button>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="user-table-card">
        <div className="user-table-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3>Không tìm thấy người dùng phù hợp</h3>
          <p>Hãy thử thay đổi điều kiện tìm kiếm hoặc chọn bộ lọc khác.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-table-wrapper">
      {/* Table Sub-header (Bulk selection & Quick status summary) */}
      <div className="user-table-subheader">
        <label className="user-table-bulk-select">
          <input
            type="checkbox"
            className="user-checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
          />
          <span>Chọn tất cả {users.length} bản ghi trên trang</span>
        </label>

        <div className="user-table-quick-stats">
          <span className="user-table-stat-dot user-table-stat-dot--active">
            ● Hoạt động: {activeCount}
          </span>
          <span className="user-table-stat-dot user-table-stat-dot--pending">
            ● Chờ duyệt: {pendingCount}
          </span>
          <span className="user-table-stat-dot user-table-stat-dot--locked">
            ● Đã khóa: {lockedCount}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="user-table-card">
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: '42px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="user-checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>NGƯỜI DÙNG & MÃ NV</th>
                <th>LIÊN HỆ & XÁC THỰC</th>
                <th>VAI TRÒ & CẤP BẬC</th>
                <th>CƠ SỞ TRỰC THUỘC</th>
                <th>HOẠT ĐỘNG GẦN NHẤT</th>
                <th>TRẠNG THÁI</th>
                <th style={{ width: '90px', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const activity = formatActivityTime(u);
                const isSelected = selectedIds.has(u.user_id);

                return (
                  <tr key={u.user_id} className={isSelected ? 'user-table-row--selected' : ''}>
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="user-checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(u.user_id)}
                      />
                    </td>

                    {/* Người dùng & Mã NV */}
                    <td>
                      <div className="user-cell-profile">
                        <div className="user-avatar" aria-hidden="true">
                          {getInitials(u.full_name)}
                        </div>
                        <div className="user-info-col">
                          <div className="user-name-row">
                            <span className="user-full-name">{u.full_name}</span>
                            {u.is_new && <span className="user-badge-new">MỚI</span>}
                            {(u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED') && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" title="Tài khoản đang bị khóa">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </div>
                          <span className="user-emp-code">{u.employee_code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Liên hệ & Xác thực */}
                    <td>
                      <div className="user-contact-col">
                        <div className="user-contact-item">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          <span className="user-email-text" title={u.email}>{u.email}</span>
                        </div>
                        <div className="user-contact-item">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <span className="user-phone-text">{u.phone || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Vai trò & Cấp bậc */}
                    <td>
                      <div className="user-role-badge">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {u.role_code === 'VEN' && (
                            <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                          )}
                          {u.role_code === 'BMR' && (
                            <>
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                              <polyline points="17 6 23 6 23 12" />
                            </>
                          )}
                          {u.role_code === 'CUS' && (
                            <>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </>
                          )}
                          {u.role_code === 'ADM' && (
                            <>
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </>
                          )}
                        </svg>
                        <span>{u.role_label}</span>
                      </div>
                    </td>

                    {/* Cơ sở trực thuộc */}
                    <td>
                      {u.hotel ? (
                        <div className="user-hotel-col">
                          <div className="user-hotel-name-row">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="user-hotel-name">{u.hotel.name}</span>
                          </div>
                          <span className="user-hotel-addr" title={u.hotel.address}>
                            {u.hotel.address}
                          </span>
                        </div>
                      ) : (
                        <span className="user-hotel-empty">Toàn hệ thống</span>
                      )}
                    </td>

                    {/* Hoạt động gần nhất */}
                    <td>
                      <div className="user-activity-col">
                        <span className={`user-activity-status ${activity.isDanger ? 'user-activity-status--danger' : ''}`}>
                          {activity.statusText}
                        </span>
                        <span className="user-activity-sub">{activity.subText}</span>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td>
                      {u.account_status === 'ACTIVE' && (
                        <span className="user-status-pill user-status-pill--active">
                          <span className="user-status-dot">●</span> Đang hoạt động
                        </span>
                      )}
                      {(u.account_status === 'VERIFYING' || u.account_status === 'PENDING') && (
                        <span className="user-status-pill user-status-pill--pending">
                          <span className="user-status-dot">●</span> Chờ kích hoạt
                        </span>
                      )}
                      {(u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED') && (
                        <span className="user-status-pill user-status-pill--locked">
                          <span className="user-status-dot">●</span> Đang bị khóa
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td>
                      <div className="user-action-buttons">
                        {(u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED') && (
                          <button
                            type="button"
                            className="user-btn-quick-unlock"
                            title="Mở khóa tài khoản"
                            onClick={() => onToggleStatus(u)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>Mở khóa</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="user-action-btn"
                          title="Chỉnh sửa thông tin"
                          onClick={() => onEditUser?.(u)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {/* Icon ổ khóa ở cuối mỗi dòng CHỈ DÙNG ĐỂ HIỂN THỊ trạng thái tài khoản */}
                        <span
                          className="user-status-lock-indicator"
                          title={
                            u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED'
                              ? 'Tài khoản đang bị khóa'
                              : u.account_status === 'VERIFYING' || u.account_status === 'PENDING'
                              ? 'Tài khoản đang chờ duyệt'
                              : 'Tài khoản đang hoạt động'
                          }
                          aria-label="Trạng thái tài khoản"
                        >
                          {u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          ) : u.account_status === 'VERIFYING' || u.account_status === 'PENDING' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="user-table-pagination">
          <div className="user-table-pagination__info">
            <span>
              Hiển thị {startItem} - {endItem} trên tổng số {totalItems} tài khoản
            </span>
            <div className="user-table-page-size-selector">
              <span>Số hàng mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="user-table-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="user-table-pagination__controls">
            {/* First Page */}
            <button
              type="button"
              className="user-page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              title="Trang đầu"
            >
              {'|<'}
            </button>

            {/* Prev Page */}
            <button
              type="button"
              className="user-page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              title="Trang trước"
            >
              {'<'}
            </button>

            {/* Page numbers */}
            {renderPaginationButtons().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="user-page-dots">
                    ...
                  </span>
                );
              }
              const isActive = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  className={`user-page-btn ${isActive ? 'user-page-btn--active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              className="user-page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              title="Trang sau"
            >
              {'>'}
            </button>

            {/* Last Page */}
            <button
              type="button"
              className="user-page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Trang cuối"
            >
              {'>|'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTable;
