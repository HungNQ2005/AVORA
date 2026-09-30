import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { verifyResetToken, resetPasswordWithToken } from '../../../services/authService';
import './ResetPasswordPage.css';

/* Lock Icon */
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* Eye Icons */
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

/**
 * Dedicated Reset Password Page.
 * Verifies one-time token and allows user to enter 2 new password fields.
 * Displays cute white & blue error page if link is invalid or expired.
 */
const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsInvalid(true);
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        await verifyResetToken(token);
        setIsInvalid(false);
      } catch (err) {
        setIsInvalid(true);
        setErrorMessage(
          err.response?.data?.message ||
          'Liên kết đặt lại mật khẩu này đã được sử dụng hoặc đã hết thời gian hiệu lực rồi nè.'
        );
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  // Handle password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!password || !confirmPassword) {
      setFormError('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu.');
      return;
    }

    if (password.length < 8) {
      setFormError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithToken(token, password);
      setIsSuccess(true);
      // Auto-redirect after 2.5 seconds
      setTimeout(() => {
        navigate('/signin', {
          state: {
            successMessage: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
          },
        });
      }, 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể đặt lại mật khẩu.';
      if (msg.includes('hết hạn') || msg.includes('không hợp lệ')) {
        setIsInvalid(true);
        setErrorMessage(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading State while checking token
  if (verifying) {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-spinner" style={{ width: 32, height: 32, borderColor: '#bae6fd', borderTopColor: '#0284c7', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 14.5 }}>Đang kiểm tra liên kết đặt lại mật khẩu...</p>
        </div>
      </div>
    );
  }

  // 2. Cute Expired / Invalid One-Time Link View
  if (isInvalid) {
    return (
      <div className="rp-page">
        <div className="rp-bubble rp-bubble-1" />
        <div className="rp-bubble rp-bubble-2" />
        <div className="rp-bubble rp-bubble-3" />

        <div className="rp-card">
          {/* Brand Logo Header */}
          <Link to="/" className="rp-brand-pill" title="Trang chủ Avora">
            <span className="rp-brand-logo">Avora</span>
            <span className="rp-brand-badge">VIỆT NAM</span>
          </Link>

          {/* Cute Compass / Lost Character Illustration */}
          <div className="cute-illustration">
            <svg class="cute-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="52" fill="#E0F2FE" />
              <circle cx="60" cy="60" r="44" fill="#BAE6FD" />
              <circle cx="60" cy="60" r="36" fill="#FFFFFF" stroke="#0284C7" strokeWidth="3" />
              <polygon points="60,34 66,60 60,54 54,60" fill="#EF4444" />
              <polygon points="60,86 66,60 60,66 54,60" fill="#0284C7" />
              <circle cx="60" cy="60" r="4" fill="#0F172A" />
              <circle cx="48" cy="50" r="3" fill="#0F172A" />
              <circle cx="72" cy="50" r="3" fill="#0F172A" />
              <ellipse cx="44" cy="56" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
              <ellipse cx="76" cy="56" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
              <path d="M57 66 Q60 63 63 66" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M22 36 L24 42 L30 44 L24 46 L22 52 L20 46 L14 44 L20 42 Z" fill="#FBBF24" />
              <circle cx="94" cy="38" r="4" fill="#38BDF8" />
            </svg>
          </div>

          {/* Error Code Badge */}
          <div className="error-code-pill">
            <span>MÃ SỐ: 410</span>
            <span>• LINK ĐÃ HẾT HẠN</span>
          </div>

          <h1 className="rp-title">Ối... Hình như bạn bị lạc rồi! (｡•́︿•̀｡)</h1>
          <p className="rp-subtitle">
            {errorMessage ||
              'Liên kết đặt lại mật khẩu này là liên kết dùng 1 lần và đã được sử dụng trước đó, hoặc đã hết hạn rồi nè.'}
          </p>

          <div className="cute-tip-box">
            💡 <span>Đừng lo lắng, bạn có thể quay lại trang đăng nhập để yêu cầu gửi lại một liên kết đặt lại mật khẩu mới nhé!</span>
          </div>

          {/* Single Go Back Button */}
          <Link to="/signin" className="btn-go-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span>Về trang đăng nhập</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Success State
  if (isSuccess) {
    return (
      <div className="rp-page">
        <div className="rp-card">
          <div className="rp-success-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="rp-title">Đặt lại mật khẩu thành công!</h1>
          <p className="rp-subtitle">
            Mật khẩu mới của bạn đã được cập nhật thành công.
            <br />
            Hệ thống đang tự động chuyển hướng bạn về trang đăng nhập...
          </p>

          <Link to="/signin" className="rp-btn-submit" style={{ textDecoration: 'none' }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  // 4. Form State: Enter 2 new passwords
  return (
    <div className="rp-page">
      <div className="rp-bubble rp-bubble-1" />
      <div className="rp-bubble rp-bubble-2" />
      <div className="rp-bubble rp-bubble-3" />

      {/* Brand Logo Header */}
      <Link to="/" className="rp-brand-pill" title="Trang chủ Avora">
        <span className="rp-brand-logo">Avora</span>
        <span className="rp-brand-badge">VIỆT NAM</span>
      </Link>

      <div className="rp-card">
        <h1 className="rp-title">Tạo mật khẩu mới</h1>
        <p className="rp-subtitle">
          Vui lòng nhập mật khẩu mới gồm ít nhất 8 ký tự cho tài khoản Avora của bạn.
        </p>

        <form className="rp-form" onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="rp-field">
            <label className="rp-label" htmlFor="rp-new-password">
              Mật khẩu mới
            </label>
            <div className="rp-input-wrapper">
              <span className="rp-input-icon">
                <LockIcon />
              </span>
              <input
                id="rp-new-password"
                type={showPassword ? 'text' : 'password'}
                className="rp-input"
                placeholder="Nhập ít nhất 8 ký tự"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError('');
                }}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="rp-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="rp-field">
            <label className="rp-label" htmlFor="rp-confirm-password">
              Xác nhận mật khẩu mới
            </label>
            <div className="rp-input-wrapper">
              <span className="rp-input-icon">
                <LockIcon />
              </span>
              <input
                id="rp-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="rp-input"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFormError('');
                }}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="rp-eye-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {formError && (
            <div className="rp-error-box" role="alert">
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            className="rp-btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="rp-spinner" />
                <span>Đang lưu mật khẩu...</span>
              </>
            ) : (
              'Lưu mật khẩu mới & Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
