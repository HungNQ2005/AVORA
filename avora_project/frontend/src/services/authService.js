import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Register a new account.
 * @param {string} email
 * @param {string} password
 * @param {string} full_name
 */
export const signUp = async (email, password, full_name) => {
  const res = await api.post('/auth/signup', { email, password, full_name });
  return res.data;
};

/**
 * Sign in and receive a JWT token.
 * @param {string} email
 * @param {string} password
 */
export const signIn = async (email, password) => {
  const res = await api.post('/auth/signin', { email, password });
  return res.data;
};

/**
 * Get the current user's profile (requires auth).
 */
export const getProfile = async () => {
  const res = await api.get('/account/profile');
  return res.data;
};

/**
 * Update the current user's profile.
 * @param {{ full_name?: string, phone?: string }} payload
 */
export const updateProfile = async (payload) => {
  const res = await api.put('/account/profile', payload);
  return res.data;
};

/**
 * Change the current user's password.
 * @param {string} current_password
 * @param {string} new_password
 */
export const changePassword = async (current_password, new_password) => {
  const res = await api.put('/account/change-password', { current_password, new_password });
  return res.data;
};

/**
 * Request a 6-digit OTP for deactivating the current user's account.
 */
export const requestDeactivateOtp = async () => {
  const res = await api.post('/account/deactivate/request-otp');
  return res.data;
};

/**
 * Deactivate the current user's account with a 6-digit OTP.
 * @param {string} otp
 */
export const deactivateAccount = async (otp) => {
  const res = await api.delete('/account/deactivate', { data: { otp } });
  return res.data;
};
