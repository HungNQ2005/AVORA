import React, { useState, useEffect } from 'react';
import { requestRoleChange, confirmRoleChange } from '../../../services/userService';
import AvatarContent from '../../../common/components/AvatarContent';
import './RoleChangeModal.css';

/**
 * Roles definition with labels and security classifications.
 */
const ROLE_OPTIONS = [
  {
    code: 'CUS',
    name: 'CUSTOMER',
    label: 'Khách hàng (Customer)',
    desc: 'Quyền thành viên tiêu chuẩn: Đặt phòng, đánh giá và quản lý tài khoản cá nhân.',
    isSensitive: false,
    badgeColor: '#64748b',
  },
  {
    code: 'VEN',
    name: 'VENDOR',
    label: 'Hotel Manager (Vendor)',
    desc: 'Quản lý cơ sở lưu trú: Loại phòng, giá, tình trạng phòng và tiện nghi khách sạn.',
    isSensitive: false,
    badgeColor: '#0284c7',
  },
  {
    code: 'BMR',
    name: 'BUSINESS_MANAGER',
    label: 'Business Manager (Quản lý kinh doanh)',
    desc: 'Quản lý mã khuyến mãi, chiến dịch marketing và báo cáo doanh thu trên toàn sàn.',
    isSensitive: true,
    badgeColor: '#9333ea',
  },
  {
    code: 'ADM',
    name: 'ADMIN',
    label: 'System Admin (Quản trị viên hệ thống)',
    desc: 'Toàn quyền cấu hình hệ thống, quản lý người dùng, phân quyền RBAC và kiểm soát truy cập.',
    isSensitive: true,
    badgeColor: '#dc2626',
  },
];

/**
 * Helper to get initials
 */
const getInitials = (name) => {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase();
};

const RoleChangeModal = ({
  isOpen,
  onClose,
  user,
  currentAdmin,
  onRoleChanged,
}) => {
  const [selectedRole, setSelectedRole] = useState('VEN');
  const [step, setStep] = useState('SELECT_ROLE'); // 'SELECT_ROLE' | 'STEP_UP_OTP'
  const [otpCode, setOtpCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Check if target user is self
  const isSelf = Boolean(
    user && currentAdmin && (
      (currentAdmin.user_id && String(user.user_id) === String(currentAdmin.user_id)) ||
      (currentAdmin.email && user.email === currentAdmin.email)
    )
  );

  // Initialize or reset state when opening modal
  useEffect(() => {
    if (isOpen && user) {
      setStep('SELECT_ROLE');
      setOtpCode('');
      setError('');
      setLoading(false);

      // Default selected role to next available role or current
      const currentCode = (user.role_code || user.role_code_name || 'CUS').toUpperCase();
      const currentOption = ROLE_OPTIONS.find((r) => r.code === currentCode);
      setSelectedRole(currentOption ? currentOption.name : 'VEN');
    }
  }, [isOpen, user]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step !== 'STEP_UP_OTP' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen || !user) return null;

  const currentRoleCode = (user.role_code || user.role_code_name || 'CUS').toUpperCase();
  const currentRoleOpt = ROLE_OPTIONS.find((r) => r.code === currentRoleCode) || {
    label: user.role_label || 'Customer',
  };
  const selectedRoleOpt = ROLE_OPTIONS.find((r) => r.name === selectedRole) || ROLE_OPTIONS[0];

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  /**
   * Handle primary action from Select Role step
   */
  const handleInitiateRoleChange = async () => {
    if (isSelf) {
      setError('Quản trị viên không được phép tự thay đổi vai trò của chính mình.');
      return;
    }

    if (selectedRoleOpt.code === currentRoleCode) {
      setError(`Người dùng hiện đã có vai trò "${selectedRoleOpt.label}". Vui lòng chọn vai trò khác.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await requestRoleChange(user.user_id, selectedRoleOpt.name);

      if (result.status === 'REQUIRES_OTP') {
        // Sensitive role: Prompt for Step-up OTP
        setAdminEmail(result.data?.adminEmail || currentAdmin?.email || 'email quản trị viên');
        setCountdown(300);
        setStep('STEP_UP_OTP');
      } else {
        // Non-sensitive role: Completed immediately
        onRoleChanged?.(result.data?.user, result.message);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Không thể yêu cầu thay đổi vai trò.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend OTP code if expired
   */
  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await requestRoleChange(user.user_id, selectedRoleOpt.name);
      setCountdown(300);
      setOtpCode('');
      setAdminEmail(result.data?.adminEmail || adminEmail);
    } catch (err) {
      setError(err.message || 'Không thể gửi lại mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirm sensitive role change with entered OTP
   */
  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Vui lòng nhập đúng 6 chữ số mã OTP đã gửi đến email của bạn.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await confirmRoleChange(user.user_id, selectedRoleOpt.name, otpCode.trim());
      onRoleChanged?.(result.data?.user, result.message);
      onClose();
    } catch (err) {
      setError(err.message || 'Xác thực OTP thất bại. Vui lòng kiểm tra lại mã.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-modal-overlay" role="dialog" aria-modal="true">
      <div className="role-modal-card">
        {/* Header */}
        <div className={`role-modal-header ${step === 'STEP_UP_OTP' ? 'role-modal-header--stepup' : ''}`}>
          <div className="role-modal-header-left">
            <div className={`role-modal-icon-wrap ${step === 'STEP_UP_OTP' ? 'role-modal-icon-wrap--stepup' : ''}`} aria-hidden="true">
              {step === 'STEP_UP_OTP' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="role-modal-title">
                {step === 'STEP_UP_OTP' ? 'Xác thực tăng cường (Step-up Auth)' : 'Phân quyền & Đổi vai trò'}
              </h2>
              <span className="role-modal-subtitle">
                {step === 'STEP_UP_OTP'
                  ? 'Bảo vệ thao tác cấp quyền quản trị nhạy cảm'
                  : `Cập nhật quyền hạn cho tài khoản: ${user.full_name}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="role-modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="role-modal-body">
          {/* Target User Info Summary */}
          <div className="role-modal-user-card">
            <div className="role-modal-user-avatar" aria-hidden="true">
              <AvatarContent src={user.avatar_url} fallback={getInitials(user.full_name)} alt={user.full_name} />
            </div>
            <div className="role-modal-user-info">
              <div className="role-modal-user-name-row">
                <span className="role-modal-user-name" title={user.full_name}>{user.full_name}</span>
                <span className="role-badge-current">
                  Vai trò hiện tại: {currentRoleOpt.label}
                </span>
              </div>
              <div className="role-modal-user-email" title={user.email}>{user.email}</div>
            </div>
          </div>

          {/* STEP 1: Select Role */}
          {step === 'SELECT_ROLE' && (
            <div className="role-select-view">
              <div className="role-selection-group">
                <label className="role-selection-label">
                  Chọn vai trò mới cần chỉ định:
                </label>
                <div className="role-option-list">
                  {ROLE_OPTIONS.map((opt) => {
                    const isSelected = selectedRole === opt.name;
                    const isCurrent = opt.code === currentRoleCode;

                    return (
                      <label
                        key={opt.name}
                        className={`role-option-card ${isSelected ? 'role-option-card--selected' : ''
                          } ${opt.isSensitive ? 'role-option-card--sensitive' : ''}`}
                      >
                        <input
                          type="radio"
                          name="roleOption"
                          value={opt.name}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedRole(opt.name);
                            setError('');
                          }}
                          disabled={loading || isSelf}
                        />
                        <div className="role-option-content">
                          <div className="role-option-header">
                            <div className="role-option-title">
                              <span>{opt.label}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                  (Hiện tại)
                                </span>
                              )}
                            </div>
                            {opt.isSensitive ? (
                              <span className="role-tag-sensitive" title="Yêu cầu nhập OTP gửi về email Quản trị viên">
                                🔒 Cần OTP bảo mật
                              </span>
                            ) : (
                              <span className="role-tag-normal">
                                Chuẩn
                              </span>
                            )}
                          </div>
                          <p className="role-option-desc">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Security Hint */}
              {selectedRoleOpt.isSensitive ? (
                <div className="role-security-alert">
                  <div className="role-security-alert-icon">⚠️</div>
                  <div>
                    <strong>Cơ chế Step-up Authentication:</strong> Bạn đang chọn cấp vai trò quản trị cấp cao.
                    Hệ thống sẽ gửi mã OTP 6 số về email của bạn để xác nhận danh tính trước khi cấp quyền.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '12px' }}>
                  Các vai trò có quyền quản lí cao cấp cần phải được xác minh danh tính Admin trước khi cập nhật.
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Step-up OTP Verification */}
          {step === 'STEP_UP_OTP' && (
            <div className="stepup-view">
              <div className="stepup-alert-banner">
                <div className="stepup-alert-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Cảnh báo bảo mật: Yêu cầu cấp quyền quản trị</span>
                </div>
                <p className="stepup-alert-desc">
                  Bạn đang chuẩn bị cấp quyền <strong>{selectedRoleOpt.label}</strong> cho tài khoản <strong>{user.email}</strong>.
                  Đây là hành động đặc quyền nhạy cảm, vui lòng xác thực OTP để đảm bảo an toàn.
                </p>
              </div>

              <div className="stepup-destination-box">
                Đã gửi mã xác thực 6 số đến email Quản trị viên:
                <br />
                <span className="stepup-destination-email">{adminEmail}</span>
              </div>

              <div className="stepup-otp-input-section">
                <label className="stepup-otp-label" htmlFor="stepup-otp-field">
                  Nhập mã OTP (6 số):
                </label>
                <input
                  id="stepup-otp-field"
                  type="text"
                  maxLength={6}
                  className="stepup-otp-input"
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                    setError('');
                  }}
                  disabled={loading}
                  autoFocus
                  autoComplete="one-time-code"
                />

                <div className="stepup-timer-row">
                  <span className="stepup-timer">
                    ⏱ Thời gian còn lại: {formatCountdown(countdown)}
                  </span>
                  <button
                    type="button"
                    className="stepup-resend-btn"
                    onClick={handleResendOtp}
                    disabled={loading || countdown > 240}
                  >
                    Gửi lại mã
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="role-modal-error">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="role-modal-footer">
          {step === 'STEP_UP_OTP' ? (
            <>
              <button
                type="button"
                className="role-modal-btn role-modal-btn--cancel"
                onClick={() => {
                  setStep('SELECT_ROLE');
                  setOtpCode('');
                  setError('');
                }}
                disabled={loading}
              >
                ← Quay lại
              </button>
              <button
                type="button"
                className="role-modal-btn role-modal-btn--danger"
                onClick={handleConfirmOtp}
                disabled={loading || otpCode.trim().length !== 6 || countdown <= 0}
              >
                {loading ? 'Đang xác thực...' : 'Xác thực OTP & Cấp quyền'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="role-modal-btn role-modal-btn--cancel"
                onClick={onClose}
                disabled={loading}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`role-modal-btn ${selectedRoleOpt.isSensitive ? 'role-modal-btn--danger' : 'role-modal-btn--primary'
                  }`}
                onClick={handleInitiateRoleChange}
                disabled={loading || isSelf || selectedRoleOpt.code === currentRoleCode}
              >
                {loading
                  ? 'Đang xử lý...'
                  : selectedRoleOpt.isSensitive
                    ? 'Xác thực Step-up (Lấy OTP)'
                    : 'Xác nhận đổi quyền'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleChangeModal;
