import React, { useState, useEffect, useRef } from 'react';
import { requestDeactivateOtp, deactivateAccount } from '../../../services/authService';
import './DeactivateOtpModal.css';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes

/**
 * Modal to verify 6-digit OTP before deactivating account.
 *
 * Props:
 *   isOpen    {boolean}  - controls modal visibility
 *   userEmail {string}   - user's email to display in prompt
 *   onClose   {function} - called when cancelling/closing
 *   onSuccess {function} - called after successful deactivation
 */
const DeactivateOtpModal = ({ isOpen, userEmail, onClose, onSuccess }) => {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const inputRefs = useRef([]);

  // Focus first digit box on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for 5 minutes
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Close on Escape key (disabled during loading or success)
  useEffect(() => {
    if (!isOpen || isSuccess) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSuccess, loading, onClose]);

  // Auto-redirect countdown once deactivation succeeds
  useEffect(() => {
    if (!isSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, onSuccess]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isExpired = timeLeft === 0;
  const otpString = digits.join('');
  const isOtpComplete = otpString.length === OTP_LENGTH;

  // Handle digit change
  const handleChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setErrorMsg('');

    // Advance focus to next input
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and navigation keys
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is empty, focus previous and clear it
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < OTP_LENGTH && i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setDigits(newDigits);
    setErrorMsg('');

    // Focus last filled digit or submit button
    const lastIndex = Math.min(pasteData.length, OTP_LENGTH) - 1;
    if (lastIndex >= 0 && inputRefs.current[lastIndex]) {
      inputRefs.current[lastIndex].focus();
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resending || loading) return;
    setResending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await requestDeactivateOtp();
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      setSuccessMsg('A new 6-digit verification code has been sent to your email.');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Submit OTP and deactivate
  const handleConfirmDeactivate = async (e) => {
    e?.preventDefault();
    if (!isOtpComplete || loading) return;

    if (isExpired) {
      setErrorMsg('Verification code has expired. Please click "Resend code" to get a new one.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await deactivateAccount(otpString);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success notification view before logout & redirect
  if (isSuccess) {
    return (
      <div className="otp-modal-overlay" role="dialog" aria-modal="true">
        <div className="otp-modal-card otp-modal-card--success" onClick={(e) => e.stopPropagation()}>
          <div className="otp-modal-icon otp-modal-icon--success" aria-hidden="true">
            ✓
          </div>

          <h2 className="otp-modal-title">Account Deactivated</h2>
          <p className="otp-modal-subtitle">
            Your account has been deactivated successfully.
            <br />
            Redirecting to sign-in page in{' '}
            <span className="otp-countdown-num">{countdown}s</span>...
          </p>

          <div className="otp-redirect-progress">
            <div className="otp-redirect-bar" />
          </div>

          <div className="otp-modal-actions otp-modal-actions--center">
            <button
              id="otp-signin-now-btn"
              type="button"
              className="otp-btn otp-btn--primary"
              onClick={onSuccess}
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="otp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="otp-modal-icon" aria-hidden="true">
          !
        </div>

        <h2 className="otp-modal-title">Security Verification</h2>
        <p className="otp-modal-subtitle">
          Please enter the 6-digit code sent to <br />
          <span className="otp-modal-email">{userEmail}</span> to confirm deactivation.
        </p>

        <form onSubmit={handleConfirmDeactivate}>
          {/* 6 Digit Inputs */}
          <div className="otp-inputs-group" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                id={`deactivate-otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete="one-time-code"
                className={`otp-digit-input ${digit ? 'has-value' : ''}`}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={loading}
                aria-label={`Digit ${idx + 1} of 6`}
              />
            ))}
          </div>

          {/* Timer and Resend Row */}
          <div className="otp-timer-wrap">
            <span className="otp-timer-text">
              Code expires in:
              <span className={`otp-timer-clock ${timeLeft <= 60 ? 'otp-timer-clock--urgent' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </span>

            <button
              id="otp-resend-btn"
              type="button"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={resending || loading}
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          {/* Status / Alert Messages */}
          {errorMsg && (
            <div className="otp-msg otp-msg--error" role="alert">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="otp-msg otp-msg--success" role="status">
              {successMsg}
            </div>
          )}

          {/* Actions */}
          <div className="otp-modal-actions">
            <button
              id="otp-cancel-btn"
              type="button"
              className="otp-btn otp-btn--cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="otp-confirm-btn"
              type="submit"
              className="otp-btn otp-btn--confirm"
              disabled={!isOtpComplete || loading || isExpired}
            >
              {loading ? (
                <>
                  <span className="otp-btn-spinner" />
                  Deactivating...
                </>
              ) : (
                'Confirm Deactivation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivateOtpModal;
