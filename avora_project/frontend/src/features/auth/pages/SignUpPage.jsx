import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../../../services/authService';
import './AuthPages.css';

/**
 * Sign Up page — Discord-inspired dark theme.
 * Creates a new account with VERIFYING status.
 * Redirects to /signin after successful registration.
 */
const SignUpPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
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

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(form.email, form.password, form.full_name);
      setSuccess(res.message || 'Account created! Please check your email to activate.');
      setTimeout(() => navigate('/signin'), 3500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background decorative blobs */}
      <div className="auth-blob auth-blob--left" />
      <div className="auth-blob auth-blob--right" />

      <div className="auth-card">
        {/* Logo / Brand */}
        <div className="auth-brand">
          <span className="auth-brand-icon">✦</span>
          <span className="auth-brand-name">AVORA</span>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Join AVORA and start exploring hotels.</p>

        <form id="signup-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="signup-fullname" className="auth-label">DISPLAY NAME</label>
            <input
              id="signup-fullname"
              name="full_name"
              type="text"
              className="auth-input"
              placeholder="Your full name"
              value={form.full_name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">EMAIL</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">PASSWORD</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              className="auth-input"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">CONFIRM PASSWORD</label>
            <input
              id="signup-confirm"
              name="confirm_password"
              type="password"
              className="auth-input"
              placeholder="Repeat your password"
              value={form.confirm_password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <button
            id="signup-submit-btn"
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : 'Continue'}
          </button>
        </form>

        <p className="auth-redirect">
          Already have an account?{' '}
          <Link to="/signin" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
