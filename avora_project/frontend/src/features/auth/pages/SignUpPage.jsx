import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../../../services/authService';
import './AuthPages.css';

/* SVG Icons */
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

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
    <line x1="2" x2="22" y1="2" x2="22" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Sign Up page matching Reference Image 3.
 * Creates an account in VERIFYING status and redirects to /signin.
 */
const SignUpPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [receiveNews, setReceiveNews] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email.trim() || !form.full_name.trim() || !form.password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (form.password !== form.confirm_password) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (form.password.length < 8) {
      setError('Mật khẩu phải chứa ít nhất 8 ký tự.');
      return;
    }

    if (!agreedTerms) {
      setError('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(form.email, form.password, form.full_name);
      setSuccess(res.message || 'Tạo tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...');
      setTimeout(() => {
        navigate('/signin', { state: { email: form.email, justSignedUp: true } });
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Brand Badge */}
      <Link to="/" className="auth-brand-pill" title="Về trang chủ Avora">
        <span className="auth-brand-logo">Avora</span>
        <span className="auth-brand-badge">VIỆT NAM</span>
      </Link>

      <div className="auth-card">
        <h1 className="auth-title">Tạo tài khoản thành viên Avora</h1>
        <p className="auth-desc">
          Mở khóa giá ưu đãi <strong>Genius giảm đến 15%</strong> và quản lý đơn đặt phòng tại Việt Nam tiện lợi, an toàn.
        </p>

        <form id="signup-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">
              Địa chỉ email
            </label>
            <div className={`auth-input-wrapper ${error ? 'auth-input-wrapper--error' : ''}`}>
              <span className="auth-input-icon">
                <MailIcon />
              </span>
              <input
                id="signup-email"
                name="email"
                type="email"
                className="auth-input"
                placeholder="vi-du@domain.vn"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="auth-field">
            <label htmlFor="signup-fullname" className="auth-label">
              Họ và tên đầy đủ
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <UserIcon />
              </span>
              <input
                id="signup-fullname"
                name="full_name"
                type="text"
                className="auth-input"
                placeholder="Ví dụ: Nguyễn Văn An"
                value={form.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="auth-field">
            <label htmlFor="signup-phone" className="auth-label">
              Số điện thoại liên lạc
            </label>
            <div className="auth-phone-row">
              <div className="auth-phone-prefix">VN +84</div>
              <div className="auth-input-wrapper" style={{ flex: 1 }}>
                <input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  className="auth-input"
                  placeholder="0912 345 678"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">
              Mật khẩu
            </label>
            <div className="auth-input-wrapper">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Tối thiểu 8 ký tự"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div className="auth-strength-row">
              <span>Độ mạnh mật khẩu</span>
              <span>Tối thiểu 8 ký tự, chữ hoa và số</span>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">
              Xác nhận mật khẩu
            </label>
            <div className="auth-input-wrapper">
              <input
                id="signup-confirm"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Nhập lại mật khẩu"
                value={form.confirm_password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          <div
            className="auth-checkbox-row"
            onClick={() => setAgreedTerms((prev) => !prev)}
            role="checkbox"
            aria-checked={agreedTerms}
            tabIndex={0}
          >
            <div className={`auth-checkbox-box ${agreedTerms ? 'auth-checkbox-box--checked' : ''}`}>
              {agreedTerms && <CheckIcon />}
            </div>
            <span className="auth-checkbox-label">
              Tôi đồng ý với{' '}
              <a href="#terms" onClick={(e) => e.stopPropagation()}>
                Điều khoản dịch vụ
              </a>{' '}
              và{' '}
              <a href="#privacy" onClick={(e) => e.stopPropagation()}>
                Chính sách quyền riêng tư
              </a>{' '}
              của Avora.
            </span>
          </div>

          <div
            className="auth-checkbox-row"
            onClick={() => setReceiveNews((prev) => !prev)}
            role="checkbox"
            aria-checked={receiveNews}
            tabIndex={0}
          >
            <div className={`auth-checkbox-box ${receiveNews ? 'auth-checkbox-box--checked' : ''}`}>
              {receiveNews && <CheckIcon />}
            </div>
            <span className="auth-checkbox-label">
              Gửi cho tôi thông tin ưu đãi giảm giá phòng khách sạn độc quyền và mã thưởng du lịch.
            </span>
          </div>

          {/* Error & Success Alerts */}
          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircleIcon />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-alert" role="status">
              <CheckCircleIcon />
              <span>{success}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            id="signup-submit-btn"
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                <span>Tạo tài khoản ngay</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>

        {/* Switch Link */}
        <p className="auth-switch-text">
          Bạn đã có tài khoản Avora?{' '}
          <Link to="/signin" className="auth-switch-link">
            Đăng nhập ngay
          </Link>
        </p>

        {/* SSL Badge */}
        <div className="auth-ssl-badge">
          <ShieldCheckIcon />
          <span>Thông tin được mã hóa bảo mật 256-bit SSL chuẩn quốc tế</span>
        </div>
      </div>

      {/* 3 Value Perks (Image 3 bottom) */}
      <div className="auth-perks-row">
        <div className="auth-perk-item">
          <CheckCircleIcon />
          <span>Giá minh bạch không phụ phí ẩn</span>
        </div>
        <div className="auth-perk-item">
          <CheckCircleIcon />
          <span>Xác nhận phòng tức thì 24/7</span>
        </div>
        <div className="auth-perk-item">
          <CheckCircleIcon />
          <span>Hỗ trợ tiếng Việt chuyên nghiệp</span>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
