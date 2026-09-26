import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { signIn } from '../../../services/authService';
import { sendOtp } from '../../../services/otpService';
import { useAuth } from '../../../context/AuthContext';
import Dialog from '../../../common/components/Dialog';
import './AuthPages.css';

/* SVG Icons matching Reference Image 2 */
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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

const AlertCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Dedicated Login Screen component in the Screen Flow architecture.
 * Reuses existing merged Login logic and authentication state.
 * Faithfully matches Reference Image 2 for layout and primary button styling.
 */
const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();

  const activatedParam = searchParams.get('activated');
  const emailParam = searchParams.get('email');

  // If already logged in, redirect through the screen flow
  useEffect(() => {
    if (user) {
      const redirectPath = location.state?.from?.pathname || '/myaccount';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, location]);

  const initialEmail = emailParam || location.state?.email || localStorage.getItem('avora_remembered_email') || '';
  const [form, setForm] = useState({ email: initialEmail, password: '' });
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('avora_remembered_email'));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState(() => {
    if (activatedParam === 'true') {
      return '🎉 Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.';
    }
    if (location.state?.justSignedUp) {
      return 'Tài khoản của bạn đã được tạo thành công! Vui lòng kiểm tra email kích hoạt (hoặc console Terminal backend) trước khi đăng nhập.';
    }
    return '';
  });

  // Dialog state for verification & deactivation gates
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', variant: 'info' });

  const closeDialog = () => setDialog((d) => ({ ...d, isOpen: false }));

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn(form.email, form.password);
      if (rememberMe) {
        localStorage.setItem('avora_remembered_email', form.email.trim());
      } else {
        localStorage.removeItem('avora_remembered_email');
      }
      login(res.data.token, res.data.user);
      const destination = location.state?.from?.pathname || '/myaccount';
      navigate(destination);
    } catch (err) {
      const msg = err.response?.data?.message || '';

      if (msg === 'ACCOUNT_VERIFYING') {
        setDialog({
          isOpen: true,
          title: 'Xác thực tài khoản',
          message: 'Tài khoản của bạn đã được đăng ký nhưng chưa kích hoạt email. Vui lòng kiểm tra hộp thư email để nhấn liên kết kích hoạt trước khi đăng nhập (Trong môi trường chạy thử nghiệm, liên kết kích hoạt được in trực tiếp ở Terminal Backend).',
          variant: 'warning',
        });
      } else if (msg === 'ACCOUNT_DEACTIVATED') {
        setDialog({
          isOpen: true,
          title: 'Tài khoản đã bị khóa',
          message: 'Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ mở lại.',
          variant: 'warning',
        });
      } else {
        setError(msg || 'Địa chỉ email hoặc mật khẩu không chính xác.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setDialog({
      isOpen: true,
      title: 'Quên mật khẩu',
      message: 'Vui lòng liên hệ hotline hỗ trợ 1900 8668 hoặc gửi email đến hotro@avora.vn để được hỗ trợ khôi phục tài khoản.',
      variant: 'info',
    });
  };

  const handleMagicLink = async () => {
    if (!form.email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn ở ô bên trên để nhận mã OTP.');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      await sendOtp({ email: form.email.trim(), purpose: 'LOGIN' });
      setDialog({
        isOpen: true,
        title: 'Mã xác thực OTP đã được gửi',
        message: `Mã OTP xác thực 6 chữ số đã được gửi tới email ${form.email.trim()}. (Trong môi trường thử nghiệm, mã OTP được in trực tiếp tại Terminal Backend).`,
        variant: 'info',
      });
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Gửi mã xác thực',
        message: err.response?.data?.message || 'Không thể gửi mã xác thực OTP. Vui lòng thử lại.',
        variant: 'warning',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Centered Brand Pill Badge matching Reference Image */}
      <Link to="/" className="auth-brand-pill" title="Quay lại Trang chủ Avora">
        <span className="auth-brand-logo">Avora</span>
        <span className="auth-brand-badge">VIỆT NAM</span>
      </Link>

      {/* Main Login Card matching Reference Image 2 */}
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập tài khoản</h1>
        <p className="auth-desc">
          Đăng nhập để nhận ưu đãi thành viên <strong>Genius giảm đến 15%</strong> tại hàng ngàn khách sạn, resort trên khắp Việt Nam.
        </p>

        <form id="signin-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="auth-field">
            <label htmlFor="signin-email" className="auth-label">
              Địa chỉ email
            </label>
            <div className={`auth-input-wrapper ${error ? 'auth-input-wrapper--error' : ''}`}>
              <span className="auth-input-icon">
                <MailIcon />
              </span>
              <input
                id="signin-email"
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

          {/* Password Field */}
          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="signin-password" className="auth-label">
                Mật khẩu
              </label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={handleForgotPassword}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className={`auth-input-wrapper ${error ? 'auth-input-wrapper--error' : ''}`}>
              <span className="auth-input-icon">
                <LockIcon />
              </span>
              <input
                id="signin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div
            className="auth-checkbox-row"
            onClick={() => setRememberMe((prev) => !prev)}
            role="checkbox"
            aria-checked={rememberMe}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setRememberMe((prev) => !prev);
              }
            }}
          >
            <div className={`auth-checkbox-box ${rememberMe ? 'auth-checkbox-box--checked' : ''}`}>
              {rememberMe && <CheckIcon />}
            </div>
            <span className="auth-checkbox-label">
              Ghi nhớ đăng nhập trên thiết bị này
            </span>
          </div>

          {/* Success Notice Display (Activation or Signup redirect) */}
          {successNotice && (
            <div className="auth-success-alert" role="status">
              <CheckIcon />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Alert Display */}
          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircleIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Dedicated Login Button closely matching Reference Image */}
          <button
            id="signin-submit-btn"
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <span className="auth-spinner" /> : 'Đăng nhập ngay'}
          </button>

          {/* Secondary Action: Login with Email magic link / OTP */}
          <button
            type="button"
            className="auth-btn-secondary"
            onClick={handleMagicLink}
            disabled={otpLoading}
          >
            <MailIcon />
            <span>{otpLoading ? 'Đang gửi mã...' : 'Nhận mã OTP đăng nhập qua Email'}</span>
          </button>
        </form>

        {/* Redirect to Register */}
        <p className="auth-switch-text">
          Chưa có tài khoản Avora?{' '}
          <Link to="/signup" className="auth-switch-link">
            Đăng ký ngay
          </Link>
        </p>

        {/* Legal Disclaimer */}
        <p className="auth-legal-text">
          Khi đăng nhập, bạn đồng ý với{' '}
          <a href="#terms" onClick={(e) => e.preventDefault()}>
            Điều khoản và Điều kiện
          </a>{' '}
          và{' '}
          <a href="#privacy" onClick={(e) => e.preventDefault()}>
            Quyền riêng tư
          </a>{' '}
          của Avora.
        </p>
      </div>

      {/* Notification Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        onConfirm={closeDialog}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmLabel="Đã hiểu"
      />
    </div>
  );
};

export default SignInPage;
