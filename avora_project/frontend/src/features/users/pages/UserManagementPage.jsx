import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchUsers, fetchUserStats, updateUserStatus } from '../../../services/userService';
import { fetchHotels } from '../../../services/roomTypeApi';
import { exportUsersToExcel } from '../../../utils/exportToExcel';
import UserStatsCards from '../components/UserStatsCards';
import UserRoleTabs from '../components/UserRoleTabs';
import UserFilterBar from '../components/UserFilterBar';
import UserTable from '../components/UserTable';
import EditUserModal from '../components/EditUserModal';
import Dialog from '../../../common/components/Dialog';
import './UserManagementPage.css';

const UserManagementPage = () => {
  const { user, loading: authLoading } = useAuth();

  // Guard: Only System Admin (ADM) can access
  if (!authLoading && user && user.role_code_name !== 'ADM') {
    return <Navigate to="/admin" replace />;
  }

  // Main Data States
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentRole, setCurrentRole] = useState('ALL');
  const [hotelFilter, setHotelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // Status Change Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');

  // Edit User Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Fetch KPI stats from Backend
  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchUserStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  }, []);

  // Fetch hotels for filter dropdown
  const loadHotels = useCallback(async () => {
    try {
      const hotelList = await fetchHotels();
      if (Array.isArray(hotelList)) {
        setHotels(hotelList);
      }
    } catch (err) {
      console.error('Error loading hotels:', err);
    }
  }, []);

  // Fetch paginated user list from Backend
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsers({
        page,
        limit: pageSize,
        search: searchTerm,
        role: currentRole,
        status: statusFilter,
        hotel_id: hotelFilter,
      });

      if (result) {
        setUsers(result.users || []);
        setTotalUsers(result.total || 0);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Không thể tải danh sách người dùng từ cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, currentRole, statusFilter, hotelFilter]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadHotels();
  }, [loadStats, loadHotels]);

  // Trigger users reload on filter change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Search & Filter events (reset to page 1)
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleRoleChange = (role) => {
    setCurrentRole(role);
    setPage(1);
  };

  const handleHotelChange = (hotelId) => {
    setHotelFilter(hotelId);
    setPage(1);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrentRole('ALL');
    setHotelFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
    showToast('Đã đặt lại tất cả bộ lọc.', 'info');
  };

  // Toggle user active / lock status
  const handleToggleStatusClick = (targetUser) => {
    // Không cho phép tự khóa tài khoản của chính mình
    if (
      (user?.user_id && String(targetUser.user_id) === String(user.user_id)) ||
      (user?.email && targetUser.email === user.email)
    ) {
      showToast('Bạn không thể tự khóa tài khoản của chính mình.', 'error');
      return;
    }

    const isCurrentlyDeactivated = targetUser.account_status === 'DEACTIVATED' || targetUser.account_status === 'LOCKED';
    const newStatus = isCurrentlyDeactivated ? 'ACTIVE' : 'DEACTIVATED';
    setUserToUpdate(targetUser);
    setTargetStatus(newStatus);
    setIsDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!userToUpdate || !targetStatus) return;

    try {
      await updateUserStatus(userToUpdate.user_id, targetStatus);
      showToast(
        targetStatus === 'DEACTIVATED' || targetStatus === 'LOCKED'
          ? `Đã khóa tài khoản "${userToUpdate.full_name}".`
          : `Đã kích hoạt lại tài khoản "${userToUpdate.full_name}".`,
        'success'
      );
      setIsDialogOpen(false);
      setUserToUpdate(null);
      // Refresh list & stats
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast(err.message || 'Không thể cập nhật trạng thái tài khoản.', 'error');
    }
  };

  // Handle Save Status from Edit User Modal (System Admin only updates account status)
  const handleSaveUserStatus = async ({ status }) => {
    if (!selectedUserForEdit || !status) return;

    // Không cho phép tự khóa tài khoản của chính mình
    const isSelf =
      (user?.user_id && String(selectedUserForEdit.user_id) === String(user.user_id)) ||
      (user?.email && selectedUserForEdit.email === user.email);

    const statusUpper = (status || '').toUpperCase();
    if (isSelf && ['DEACTIVATED', 'LOCKED', 'VERIFYING', 'PENDING'].includes(statusUpper)) {
      showToast('Bạn không thể tự khóa hoặc đổi trạng thái tài khoản của chính mình.', 'error');
      return;
    }

    setIsSavingStatus(true);
    try {
      await updateUserStatus(selectedUserForEdit.user_id, status);
      showToast(
        `Cập nhật trạng thái tài khoản "${selectedUserForEdit.full_name}" thành công!`,
        'success'
      );
      setIsEditModalOpen(false);
      setSelectedUserForEdit(null);
      // Refresh list and stats immediately without page reload
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error saving user status from modal:', err);
      showToast(err.message || 'Không thể cập nhật trạng thái tài khoản.', 'error');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Handle Send Reset Password link action
  const handleSendResetPassword = (targetUser) => {
    if (!targetUser) return;
    showToast(
      `Đã gửi liên kết đổi mật khẩu tới email "${targetUser.email}".`,
      'info'
    );
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

  return (
    <div className="user-management-page">
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

      {/* Page Header matching reference */}
      <div className="user-page-header">
        <div className="user-page-header__left">
          {/* Breadcrumb */}
          <nav className="user-breadcrumb" aria-label="Breadcrumb">
            <span>Hệ thống</span>
            <span className="user-breadcrumb__sep">&gt;</span>
            <span>Người dùng &amp; Phân quyền</span>
            <span className="user-breadcrumb__sep">&gt;</span>
            <span className="user-breadcrumb__current">Danh sách tài khoản người dùng</span>
          </nav>

          {/* Title & Badge */}
          <div className="user-title-row">
            <h1 className="user-main-title">Quản lý Người dùng &amp; Phân quyền</h1>
            <span className="user-rbac-badge">RBAC ENTERPRISE</span>
          </div>

          {/* Subtitle Description */}
          <p className="user-subtitle">
            Quản trị danh sách tài khoản {stats?.totalUsers ?? totalUsers} thành viên, phân quyền 4 vai trò chuẩn
            (Hotel Manager, Business Manager, Customer, System Admin) và kiểm soát trạng thái truy cập trên toàn hệ thống Avora.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="user-page-header__actions">
          {/* Nút 1: Xuất dữ liệu (Excel) */}
          <button
            type="button"
            className="user-btn user-btn--outline"
            onClick={handleExportExcel}
            title="Xuất danh sách người dùng ra file Excel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Xuất dữ liệu (Excel)</span>
          </button>

          {/* Nút 2: Phân quyền vai trò (RBAC) */}
          <button
            type="button"
            className="user-btn user-btn--outline"
            onClick={() => showToast('Hệ thống đang mở cấu hình phân quyền vai trò RBAC.', 'info')}
            title="Cấu hình phân quyền vai trò (RBAC)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Phân quyền vai trò (RBAC)</span>
          </button>

          {/* Nút 3: + Thêm người dùng mới */}
          <button
            type="button"
            className="user-btn user-btn--primary-gold"
            onClick={() => showToast('Tính năng thêm người dùng mới qua Form quản trị.', 'info')}
            title="Thêm tài khoản người dùng mới"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Thêm người dùng mới</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ thống kê KPI Cards (Backend Data) */}
      <UserStatsCards stats={stats || {}} />

      {/* Các tab theo vai trò (Backend Role Counts) */}
      <UserRoleTabs
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        roleCounts={stats?.roleCounts || {}}
        total={stats?.totalUsers || 0}
      />

      {/* Thanh tìm kiếm & Bộ lọc */}
      <UserFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        hotelFilter={hotelFilter}
        onHotelChange={handleHotelChange}
        roleFilter={currentRole}
        onRoleChange={handleRoleChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        hotels={hotels}
        onReset={handleResetFilters}
      />

      {/* Bảng danh sách người dùng & Phân trang */}
      <UserTable
        users={users}
        currentUserId={user?.user_id}
        currentUserEmail={user?.email}
        loading={loading}
        error={error}
        onRetry={loadUsers}
        page={page}
        pageSize={pageSize}
        totalItems={totalUsers}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onToggleStatus={handleToggleStatusClick}
        onEditUser={(user) => {
          setSelectedUserForEdit(user);
          setIsEditModalOpen(true);
        }}
      />

      {/* Modal Chỉnh sửa tài khoản (Chỉ SYSTEM ADMIN, chỉ chỉnh Trạng thái tài khoản) */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSavingStatus) {
            setIsEditModalOpen(false);
            setSelectedUserForEdit(null);
          }
        }}
        user={selectedUserForEdit}
        currentUserId={user?.user_id}
        currentUserEmail={user?.email}
        onSaveStatus={handleSaveUserStatus}
        onSendResetPassword={handleSendResetPassword}
        saving={isSavingStatus}
      />

      {/* Dialog xác nhận khóa / mở khóa tài khoản */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setUserToUpdate(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={targetStatus === 'DEACTIVATED' ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
        message={
          userToUpdate
            ? targetStatus === 'DEACTIVATED'
              ? `Bạn có chắc chắn muốn khóa quyền truy cập của người dùng "${userToUpdate.full_name}" (${userToUpdate.email})? Người dùng này sẽ không thể đăng nhập vào hệ thống cho tới khi được kích hoạt lại.`
              : `Bạn có muốn khôi phục quyền truy cập và mở khóa tài khoản cho "${userToUpdate.full_name}" (${userToUpdate.email})?`
            : ''
        }
        variant={targetStatus === 'DEACTIVATED' ? 'confirm' : 'info'}
        confirmLabel={targetStatus === 'DEACTIVATED' ? 'Khóa tài khoản' : 'Mở khóa ngay'}
        cancelLabel="Hủy bỏ"
      />
    </div>
  );
};

export default UserManagementPage;
