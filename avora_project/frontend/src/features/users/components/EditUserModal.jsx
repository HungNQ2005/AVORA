import React, { useState, useEffect } from 'react';
import './EditUserModal.css';

/**
 * Edit User Modal for System Admin to update account status.
 * All other user information fields are strictly read-only/disabled.
 */
const EditUserModal = ({
  isOpen,
  onClose,
  user,
  currentUserId,
  currentUserEmail,
  onSaveStatus,
  onSendResetPassword,
  saving = false,
}) => {
  const isSelf = Boolean(
    user && (
      (currentUserId && String(user.user_id) === String(currentUserId)) ||
      (currentUserEmail && user.email === currentUserEmail)
    )
  );

  // Normalize status from DB (ACTIVE, VERIFYING, DEACTIVATED) to selection value
  const getNormalizedStatus = (accountStatus) => {
    if (!accountStatus) return 'ACTIVE';
    const upper = accountStatus.toUpperCase();
    if (upper === 'DEACTIVATED' || upper === 'LOCKED') return 'LOCKED';
    if (upper === 'VERIFYING' || upper === 'PENDING') return 'PENDING';
    return 'ACTIVE';
  };

  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  useEffect(() => {
    if (user) {
      setSelectedStatus(getNormalizedStatus(user.account_status));
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving || isSelf) return;

    // Send only status payload
    onSaveStatus?.({
      status: selectedStatus,
    });
  };

  const handleResetPasswordClick = () => {
    if (onSendResetPassword) {
      onSendResetPassword(user);
    }
  };

  return (
    <div className="user-modal-overlay" role="dialog" aria-modal="true">
      <div className="user-modal-card">
        {/* Header */}
        <div className="user-modal-header">
          <div className="user-modal-header-left">
            <div className="user-modal-header-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <circle cx="19" cy="11" r="2" />
                <path d="M19 8v1" />
                <path d="M19 13v1" />
                <path d="M16 11h1" />
                <path d="M21 11h1" />
              </svg>
            </div>
            <div className="user-modal-title-wrap">
              <h2 className="user-modal-title">
                Chỉnh sửa tài khoản: {user.full_name || 'Người dùng'}
                {isSelf && <span className="user-modal-self-badge">Tài khoản của bạn</span>}
              </h2>
              <span className="user-modal-subtitle">
                #{user.employee_code || user.user_id}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="user-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="user-modal-body">
            {/* Họ và tên - Read only */}
            <div className="user-modal-form-group">
              <label className="user-modal-label">Họ và tên</label>
              <input
                type="text"
                className="user-modal-input"
                value={user.full_name || ''}
                disabled
                readOnly
              />
            </div>

            {/* Email & SĐT - Read only */}
            <div className="user-modal-grid-2">
              <div className="user-modal-form-group">
                <label className="user-modal-label">Email</label>
                <input
                  type="email"
                  className="user-modal-input"
                  value={user.email || ''}
                  disabled
                  readOnly
                />
              </div>
              <div className="user-modal-form-group">
                <label className="user-modal-label">Số điện thoại</label>
                <input
                  type="text"
                  className="user-modal-input"
                  value={user.phone || 'Chưa cập nhật'}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Vai trò & Quyền hạn - Read only */}
            <div className="user-modal-form-group">
              <label className="user-modal-label">Vai trò &amp; Quyền hạn (4 Roles)</label>
              <select className="user-modal-select" disabled value="default">
                <option value="default">{user.role_label || 'Hotel Manager (Quản lý Khách sạn & Cơ sở)'}</option>
              </select>
            </div>

            {/* Cơ sở trực thuộc - Read only */}
            <div className="user-modal-form-group">
              <label className="user-modal-label">Cơ sở trực thuộc</label>
              <input
                type="text"
                className="user-modal-input"
                value={user.hotel?.name || 'Khách hàng OTA'}
                disabled
                readOnly
              />
            </div>

            {/* Trạng thái tài khoản - DUY NHẤT ĐƯỢC PHÉP CHỈNH */}
            <div className="user-modal-form-group">
              <label className="user-modal-label">Trạng thái tài khoản</label>
              {isSelf ? (
                <div className="user-modal-self-lock-box">
                  <div className="user-modal-self-lock-status">
                    <span className="user-status-dot">●</span> Đang hoạt động (Active)
                  </div>
                  <div className="user-modal-self-lock-hint">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Bạn đang đăng nhập bằng tài khoản này. Không thể tự khóa tài khoản của chính mình.</span>
                  </div>
                </div>
              ) : (
                <select
                  className="user-modal-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={saving}
                >
                  <option value="ACTIVE">Đang hoạt động (Active)</option>
                  <option value="PENDING">Chờ kích hoạt / Duyệt (Pending)</option>
                  <option value="LOCKED">Tạm khóa tài khoản (Locked)</option>
                </select>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="user-modal-footer">
            <button
              type="button"
              className="user-modal-btn-pwd"
              onClick={handleResetPasswordClick}
              disabled={saving}
              title="Gửi link đổi mật khẩu qua email"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                <rect x="8" y="11" width="8" height="7" rx="2" ry="2" />
                <path d="M10 11V9a2 2 0 1 1 4 0v2" />
              </svg>
              <span>Gửi link đổi mật khẩu</span>
            </button>

            <div className="user-modal-footer-right">
              <button
                type="button"
                className="user-modal-btn-cancel"
                onClick={onClose}
                disabled={saving}
              >
                {isSelf ? 'Đóng' : 'Hủy'}
              </button>
              {!isSelf && (
                <button
                  type="submit"
                  className="user-modal-btn-save"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
