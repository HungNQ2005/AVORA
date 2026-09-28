import React, { useState } from 'react';
import './hotelDeleteOtpModal.css';

const HotelDeleteOtpModal = ({ hotel, onClose, onConfirm }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your account email.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (import.meta.env.DEV) console.info('[HotelManagement] Vendor deletion OTP submitted for verification.');
      await onConfirm(otp);
    } catch (err) {
      setError(err.response?.data?.message || 'The code could not be verified. Request a new code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hotel-otp__overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <section className="hotel-otp" role="dialog" aria-modal="true" aria-labelledby="hotel-otp-title">
        <header className="hotel-otp__header">
          <div className="hotel-otp__mark" aria-hidden="true">!</div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close dialog">×</button>
        </header>
        <p className="hotel-otp__eyebrow">VENDOR VERIFICATION</p>
        <h2 id="hotel-otp-title">Confirm hotel deletion</h2>
        <p className="hotel-otp__copy">Enter the one-time code sent for <strong>{hotel.name}</strong>. The hotel will be soft-deleted after verification.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="hotel-delete-otp">6-digit verification code</label>
          <input
            id="hotel-delete-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="000000"
            required
          />
          {error && <p className="hotel-otp__error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="hotel-button hotel-button--quiet" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="hotel-button hotel-button--danger" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify and delete'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default HotelDeleteOtpModal;
