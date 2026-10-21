import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchUsers, fetchUserStats } from '../../../services/userService';
import { exportUsersToExcel } from '../../../utils/exportToExcel';
import UserStatsCards from '../components/UserStatsCards';
import UserRoleTabs from '../components/UserRoleTabs';
import RoleChangeModal from '../components/RoleChangeModal';
import AvatarContent from '../../../common/components/AvatarContent';
import './RoleManagementPage.css';

/**
 * Helper to get user initials for avatar
 */
const getInitials = (name) => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase();
};

const RoleManagementPage = () => {
  const { user, loading: authLoading } = useAuth();

  // Guard: Only System Admin (ADM) can access
  if (!authLoading && user && user.role_code_name !== 'ADM') {
    return <Navigate to="/admin" replace />;
  }

  // Data states
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentRole, setCurrentRole] = useState('ALL');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 4000);
  };

  // Load KPI stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchUserStats();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Error loading role stats:', err);
    }
  }, []);

  // Load paginated users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsers({
        page,
        limit: pageSize,
        search: debouncedSearch,
        role: currentRole,
      });

      if (result) {
        setUsers(result.users || []);
        setTotalUsers(result.total || 0);
      }
    } catch (err) {
      console.error('Error fetching users for role management:', err);
      setError(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, currentRole]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Role tab change
  const handleRoleChange = (role) => {
    setCurrentRole(role);
    setPage(1);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const res = await exportUsersToExcel(users);
      if (res.success) {
        showToast(`Đã xuất thành công ${res.count} tài khoản ra file Excel!`, 'success');
      } else {
        showToast(res.message || 'Lỗi khi xuất file Excel.', 'error');
      }
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Lỗi khi tải xuống file Excel.', 'error');
    }
  };

  // Open Role Change Modal
  const handleOpenRoleChange = (targetUser) => {
    setSelectedUserForRole(targetUser);
    setIsRoleModalOpen(true);
  };

  // Callback when role successfully changed
  const handleRoleChangedSuccess = (updatedUser, successMsg) => {
    showToast(successMsg || 'Cập nhật vai trò thành công!', 'success');
    loadUsers();
    loadStats();
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;
  const startItem = totalUsers > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalUsers);

  return (
    <div className="role-page">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`user-mgmt-toast user-mgmt-toast--${toast.type}`}>
          <div className="user-mgmt-toast__icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="role-header">
        <div className="role-header__left">
          {/* Breadcrumb */}
          <nav className="role-breadcrumb" aria-label="Breadcrumb">
            <span>Hệ thống</span>
            <span className="role-breadcrumb__sep">&gt;</span>
            <span>Người dùng &amp; Phân quyền</span>
            <span className="role-breadcrumb__sep">&gt;</span>
            <span className="role-breadcrumb__current">Vai trò &amp; Quyền hạn (RBAC)</span>
          </nav>

          {/* Title & Badge */}
          <div className="role-title-row">
            <h1 className="role-main-title">Quản lý Vai trò &amp; Phân quyền (RBAC)</h1>
            <span className="role-rbac-badge">RBAC ENTERPRISE</span>
          </div>

          {/* Subtitle */}
          <p className="role-subtitle">
            Kiểm soát cấp bậc phân quyền 4 vai trò chuẩn (System Admin, Business Manager, Hotel Manager, Customer)
            và thực thi cơ chế xác thực tăng cường Step-up Authentication khi cấp quyền quản trị nhạy cảm.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="role-header__actions">
          <Link
            to="/admin/users"
            className="role-btn role-btn--outline"
            title="Chuyển đến trang danh sách người dùng"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Quản lý người dùng</span>
          </Link>

          <button
            type="button"
            className="role-btn role-btn--outline"
            onClick={handleExportExcel}
            title="Xuất dữ liệu người dùng ra Excel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Xuất báo cáo (Excel)</span>
          </button>
        </div>
      </div>

      {/* Security Banner / Step-up Notice */}
      <div className="role-stepup-notice">
        <div className="role-stepup-notice-left">
          <div className="role-stepup-notice-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="role-stepup-notice-text">
            <strong>Cơ chế Bảo mật Step-up Authentication:</strong> Khi nâng cấp tài khoản lên vai trò
            <strong> System Admin</strong> hoặc <strong>Business Manager</strong>, hệ thống sẽ tự động kích hoạt xác thực 2 lớp qua mã OTP 6 số gửi về email Quản trị viên để ngăn chặn tấn công leo thang đặc quyền trái phép.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <UserStatsCards stats={stats || {}} />

      {/* Role Filter Tabs */}
      <UserRoleTabs
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        roleCounts={stats?.roleCounts || {}}
        total={stats?.totalUsers || 0}
      />

      {/* Search Bar */}
      <div style={{ marginBottom: '18px', display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên, email hoặc mã nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 16px 11px 40px',
              fontSize: '14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {searchTerm && (
          <button
            type="button"
            className="role-btn role-btn--outline"
            onClick={() => setSearchTerm('')}
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Users Role Management Table */}
      <div className="role-table-card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div className="user-table-spinner"></div>
            <p style={{ marginTop: '14px' }}>Đang tải danh sách người dùng...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
            <p>{error}</p>
            <button
              type="button"
              className="role-btn role-btn--outline"
              onClick={loadUsers}
              style={{ marginTop: '12px' }}
            >
              Thử lại
            </button>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <p>Không tìm thấy người dùng phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="role-table-container">
            <table className="role-table">
              <thead>
                <tr>
                  <th>NGƯỜI DÙNG & MÃ NV</th>
                  <th>LIÊN HỆ & EMAIL</th>
                  <th>QUYỀN HIỆN TẠI</th>
                  <th>CẤP ĐỘ BẢO MẬT</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = Boolean(
                    user && (
                      (user.user_id && String(u.user_id) === String(user.user_id)) ||
                      (user.email && u.email === user.email)
                    )
                  );
                  const isHighPrivilege = ['ADM', 'BMR'].includes(u.role_code || u.role_code_name);

                  return (
                    <tr key={u.user_id}>
                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13.5px',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <AvatarContent src={u.avatar_url} fallback={getInitials(u.full_name)} alt={u.full_name} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{u.full_name}</span>
                              {isSelf && (
                                <span style={{ fontSize: '10.5px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{u.employee_code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td>
                        <div style={{ fontSize: '13px', color: '#0f172a' }}>{u.email}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {u.phone || 'Chưa có SĐT'}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span
                          className={`role-pill ${u.role_code === 'ADM'
                            ? 'role-pill--adm'
                            : u.role_code === 'BMR'
                              ? 'role-pill--bmr'
                              : u.role_code === 'VEN'
                                ? 'role-pill--ven'
                                : 'role-pill--cus'
                            }`}
                        >
                          {u.role_code === 'ADM'}
                          {u.role_code === 'BMR'}
                          {u.role_code === 'VEN'}
                          {u.role_code === 'CUS'}
                          {u.role_label}
                        </span>
                      </td>

                      {/* Security Classification */}
                      <td>
                        {isHighPrivilege ? (
                          <span className="sec-level-badge sec-level-badge--high" title="Yêu cầu Step-up Authentication khi thay đổi">
                            🔒 Bảo mật cấp cao (Step-up Auth)
                          </span>
                        ) : (
                          <span className="sec-level-badge sec-level-badge--normal">
                            ✓ Tiêu chuẩn
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {u.account_status === 'ACTIVE' && (
                          <span className="user-status-pill user-status-pill--active">
                            ● Hoạt động
                          </span>
                        )}
                        {(u.account_status === 'VERIFYING' || u.account_status === 'PENDING') && (
                          <span className="user-status-pill user-status-pill--pending">
                            ● Chờ duyệt
                          </span>
                        )}
                        {(u.account_status === 'DEACTIVATED' || u.account_status === 'LOCKED') && (
                          <span className="user-status-pill user-status-pill--locked">
                            ● Đang khóa
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }}>
                        {isSelf ? (
                          <span className="role-action-self-tag" title="Bạn không thể tự thay đổi vai trò của chính mình">
                            🔒 Tài khoản của bạn
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="role-action-btn-change"
                            onClick={() => handleOpenRoleChange(u)}
                            title={`Thay đổi vai trò cho ${u.full_name}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <polyline points="17 11 19 13 23 9" />
                            </svg>
                            <span>Đổi quyền</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && users.length > 0 && (
          <div className="user-table-pagination" style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px' }}>
            <div className="user-table-pagination__info">
              <span>
                Hiển thị {startItem} - {endItem} trên tổng số {totalUsers} người dùng
              </span>
              <div className="user-table-page-size-selector">
                <span>Số hàng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
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
              <button
                type="button"
                className="user-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {'<'}
              </button>
              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="user-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {'>'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change & Step-up Authentication Modal */}
      <RoleChangeModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedUserForRole(null);
        }}
        user={selectedUserForRole}
        currentAdmin={user}
        onRoleChanged={handleRoleChangedSuccess}
      />
    </div>
  );
};

export default RoleManagementPage;
