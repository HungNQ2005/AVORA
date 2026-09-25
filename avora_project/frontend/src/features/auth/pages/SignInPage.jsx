import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import Dialog from '../../../common/components/Dialog';
import './AuthPages.css';

/**
 * Sign In page — Discord-inspired dark theme.
 * Enforces account status gates via dialog notifications.
 */
const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dialog state
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', variant: 'info' });

  const closeDialog = () => setDialog((d) => ({ ...d, isOpen: false }));

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn(form.email, form.password);
      login(res.data.token, res.data.user);
      navigate('/myaccount');
    } catch (err) {
      const msg = err.response?.data?.message || '';

      if (msg === 'ACCOUNT_VERIFYING') {
        setDialog({
          isOpen: true,
          title: 'Email verification required',
          message: 'Your account has been created. Please check your email to activate your account before signing in.',
          variant: 'warning',
        });
      } else if (msg === 'ACCOUNT_DEACTIVATED') {
        setDialog({
          isOpen: true,
          title: 'Account deactivated',
          message: 'This account has been deactivated. Please contact Admin for further assistance.',
          variant: 'warning',
        });
      } else {
        setError(msg || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--left" />
      <div className="auth-blob auth-blob--right" />

      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">✦</span>
          <span className="auth-brand-name">AVORA</span>
        </div>

        <h1 className="auth-title">Welcome back!</h1>
        <p className="auth-subtitle">We're so excited to see you again!</p>

        <form id="signin-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="signin-email" className="auth-label">EMAIL</label>
            <input
              id="signin-email"
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
            <label htmlFor="signin-password" className="auth-label">PASSWORD</label>
            <input
              id="signin-password"
              name="password"
              type="password"
              className="auth-input"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button
            id="signin-submit-btn"
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : 'Log In'}
          </button>
        </form>

        <p className="auth-redirect">
          Need an account?{' '}
          <Link to="/signup" className="auth-link">Register</Link>
        </p>
      </div>

      <Dialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        onConfirm={closeDialog}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmLabel="Got it"
      />
    </div>
  );
};

export default SignInPage;
