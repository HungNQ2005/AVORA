import React, { useState, useEffect } from 'react';
import { requestPasswordReset } from '../../../services/authService';
import './ForgotPasswordModal.css';

/**
 * Modal to request a one-time password reset link.
 *
 * Props:
 *   isOpen {boolean} - controls visibility
 *   onClose {function} - called on cancel or close
 *   initialEmail {string} - optional pre-filled email from login form
 */
const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setError('');
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen, initialEmail]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await requestPasswordReset(cleanEmail);
      setSentEmail(cleanEmail);
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không thể gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra lại email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="fp-modal-close-btn"
          onClick={onClose}
          aria-label="Đóng"
          disabled={loading}
        >
          ✕
        </button>

        {!success ? (
          <>
            <div className="fp-modal-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h2 className="fp-modal-title">Quên mật khẩu?</h2>
            <p className="fp-modal-subtitle">
              Đừng lo lắng! Nhập địa chỉ email tài khoản của bạn dưới đây, chúng tôi sẽ gửi liên kết để bạn tạo lại mật khẩu mới.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="fp-input-wrapper">
                <span className="fp-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="forgot-password-email"
                  type="email"
                  className="fp-input"
                  placeholder="vi-du@domain.vn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="fp-error-alert" role="alert">
                  {error}
                </div>
              )}

              <button
                id="forgot-password-submit-btn"
                type="submit"
                className="fp-btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="fp-spinner" />
                    <span>Đang gửi liên kết...</span>
                  </>
                ) : (
                  'Gửi liên kết đặt lại mật khẩu'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="fp-success-content">
            <div className="fp-modal-icon fp-modal-icon--success" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h2 className="fp-modal-title">Đã gửi email khôi phục!</h2>
            <p className="fp-modal-subtitle">
              Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến email{' '}
              <span className="fp-success-email">{sentEmail}</span>.
            </p>

            <div className="fp-success-note">
              ⏱ Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> và chỉ sử dụng được <strong>1 lần duy nhất</strong>. Nếu không thấy trong Hộp thư đến, vui lòng kiểm tra thư mục Spam hoặc Rác.
            </div>

            <button
              type="button"
              className="fp-btn-submit"
              onClick={onClose}
            >
              Đã hiểu & Quay lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
