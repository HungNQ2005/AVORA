import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile, changePassword, requestDeactivateOtp } from '../../../services/authService';
import Dialog from '../../../common/components/Dialog';
import DeactivateOtpModal from '../components/DeactivateOtpModal';
import { codeNameParser } from '../../../utils/codeNameParser';
import './MyAccountPage.css';

/**
 * My Account page — profile management, password change, and account deactivation.
 */
const MyAccountPage = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();

  // Profile form state
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password form state
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  // Deactivate dialog & OTP modal state
  const [deactivateDialog, setDeactivateDialog] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  // Load current user data into form
  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.full_name || '', phone: user.phone || '' });
    }
  }, [user]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!localStorage.getItem('avora_token')) {
      navigate('/signin');
    }
  }, [navigate]);

  /* ── Profile Update ──────────────────────────────────────── */
  const handleProfileChange = (e) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setProfileMsg({ type: '', text: '' });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await updateProfile({ full_name: profile.full_name, phone: profile.phone });
      setUser(res.data);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' });
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── Password Change ─────────────────────────────────────── */
  const handlePassChange = (e) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPassMsg({ type: '', text: '' });
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwords.new_password.length < 8) {
      setPassMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPassLoading(true);
    setPassMsg({ type: '', text: '' });
    try {
      await changePassword(passwords.current_password, passwords.new_password);
      setPassMsg({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed.' });
    } finally {
      setPassLoading(false);
    }
  };

  /* ── Account Deactivation Flow ──────────────────────────── */
  // Step 1: User confirms intent -> request OTP from backend -> open OTP modal
  const handleDeactivateRequestOtp = async () => {
    setDeactivateLoading(true);
    setDeactivateError('');
    try {
      await requestDeactivateOtp();
      setDeactivateDialog(false);
      setOtpModalOpen(true);
    } catch (err) {
      setDeactivateError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Step 2: Successfully verified OTP in modal -> logout and redirect to signin
  const handleDeactivateSuccess = () => {
    setOtpModalOpen(false);
    logout();
    navigate('/signin');
  };

  /* ── Role label helper ───────────────────────────────────── */
  // role_code_name is resolved by backend from m_system_code (e.g. 'CUS', 'ADM')
  // codeNameParser maps code_name -> display label (e.g. 'CUS' -> 'Customer')
  const roleDisplayName = codeNameParser(user?.role_code_name);

  return (
    <div className="myaccount-page">
      {/* Background blobs */}
      <div className="myaccount-blob myaccount-blob--tl" />
      <div className="myaccount-blob myaccount-blob--br" />

      <div className="myaccount-container">
        {/* Page header */}
        <div className="myaccount-header">
          <div className="myaccount-avatar" aria-label="User avatar">
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="myaccount-header-info">
            <h1 className="myaccount-name">{user?.full_name || 'Loading...'}</h1>
            <span className="myaccount-email">{user?.email}</span>
            <div className="myaccount-badges">
              <span className="badge badge--role">{roleDisplayName}</span>
              <span className={`badge badge--status badge--${user?.account_status?.toLowerCase()}`}>
                {user?.account_status}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <section className="myaccount-section">
          <div className="section-header">
            <h2 className="section-title">Profile Information</h2>
            <p className="section-desc">Update your display name and contact number.</p>
          </div>

          <form id="profile-form" className="account-form" onSubmit={handleProfileSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="acc-fullname" className="form-label">Full Name</label>
                <input
                  id="acc-fullname"
                  name="full_name"
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={profile.full_name}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="acc-phone" className="form-label">Phone Number</label>
                <input
                  id="acc-phone"
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="+84 xxx xxx xxx"
                  value={profile.phone}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="acc-email" className="form-label">Email Address</label>
              <input
                id="acc-email"
                type="email"
                className="form-input form-input--readonly"
                value={user?.email || ''}
                readOnly
                tabIndex={-1}
              />
              <span className="form-hint">Email cannot be changed.</span>
            </div>

            {profileMsg.text && (
              <div className={`form-msg form-msg--${profileMsg.type}`} role={profileMsg.type === 'error' ? 'alert' : 'status'}>
                {profileMsg.text}
              </div>
            )}

            <div className="form-actions">
              <button
                id="profile-save-btn"
                type="submit"
                className="btn btn--primary"
                disabled={profileLoading}
              >
                {profileLoading ? <span className="btn-spinner" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* Password Section */}
        <section className="myaccount-section">
          <div className="section-header">
            <h2 className="section-title">Change Password</h2>
            <p className="section-desc">Choose a strong password with at least 8 characters.</p>
          </div>

          <form id="password-form" className="account-form" onSubmit={handlePassSubmit}>
            <div className="form-field">
              <label htmlFor="acc-current-pass" className="form-label">Current Password</label>
              <input
                id="acc-current-pass"
                name="current_password"
                type="password"
                className="form-input"
                placeholder="Enter current password"
                value={passwords.current_password}
                onChange={handlePassChange}
                autoComplete="current-password"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="acc-new-pass" className="form-label">New Password</label>
                <input
                  id="acc-new-pass"
                  name="new_password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={passwords.new_password}
                  onChange={handlePassChange}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-field">
                <label htmlFor="acc-confirm-pass" className="form-label">Confirm New Password</label>
                <input
                  id="acc-confirm-pass"
                  name="confirm_password"
                  type="password"
                  className="form-input"
                  placeholder="Repeat new password"
                  value={passwords.confirm_password}
                  onChange={handlePassChange}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {passMsg.text && (
              <div className={`form-msg form-msg--${passMsg.type}`} role={passMsg.type === 'error' ? 'alert' : 'status'}>
                {passMsg.text}
              </div>
            )}

            <div className="form-actions">
              <button
                id="password-save-btn"
                type="submit"
                className="btn btn--primary"
                disabled={passLoading}
              >
                {passLoading ? <span className="btn-spinner" /> : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* Divider */}
        <div className="section-divider section-divider--danger" />

        {/* Danger Zone */}
        <section className="myaccount-section myaccount-section--danger">
          <div className="section-header">
            <h2 className="section-title section-title--danger">Danger Zone</h2>
            <p className="section-desc">
              Deactivating your account will immediately sign you out. Contact Admin to restore access.
            </p>
          </div>
          <button
            id="deactivate-account-btn"
            type="button"
            className="btn btn--danger"
            onClick={() => setDeactivateDialog(true)}
          >
            Request deletion / Deactivate account
          </button>
        </section>
      </div>

      {/* Step 1: Deactivate Confirmation Dialog */}
      <Dialog
        isOpen={deactivateDialog}
        onClose={() => {
          setDeactivateDialog(false);
          setDeactivateError('');
        }}
        onConfirm={handleDeactivateRequestOtp}
        title="Deactivate your account?"
        message={
          deactivateError ||
          "Deactivating your account will disable access and sign you out. A 6-digit verification code will be sent to your email to verify your identity. Do you wish to proceed?"
        }
        variant="confirm"
        confirmLabel={deactivateLoading ? 'Sending code...' : 'Continue'}
        cancelLabel="Cancel"
      />

      {/* Step 2: 6-Digit OTP Verification Modal */}
      {otpModalOpen && (
        <DeactivateOtpModal
          isOpen={otpModalOpen}
          userEmail={user?.email}
          onClose={() => setOtpModalOpen(false)}
          onSuccess={handleDeactivateSuccess}
        />
      )}
    </div>
  );
};

export default MyAccountPage;
