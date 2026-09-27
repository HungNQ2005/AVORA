import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to request if user is authenticated
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Dispatch an OTP to the given email or authenticated user.
 * @param {object} params
 * @param {string} [params.email]
 * @param {string} [params.purpose='GENERAL']
 */
export const sendOtp = async ({ email, purpose = 'GENERAL' } = {}) => {
  const res = await api.post('/otp/send', { email, purpose });
  return res.data;
};

/**
 * Verify an OTP.
 * @param {object} params
 * @param {string} params.otp
 * @param {string} [params.email]
 * @param {string} [params.purpose='GENERAL']
 */
export const verifyOtp = async ({ otp, email, purpose = 'GENERAL' }) => {
  const res = await api.post('/otp/verify', { otp, email, purpose });
  return res.data;
};
