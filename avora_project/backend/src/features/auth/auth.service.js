'use strict';

const supabase = require('../../config/supabaseClient');
const otpService = require('../otp/otp.service');
const { hashPassword, comparePassword } = require('../../utils/passwordHelper');
const { signJwt, generateSecureToken } = require('../../utils/tokenHelper');

// Account status codes aligned with m_system_code values
const STATUS = {
  VERIFYING: 'VERIFYING',
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
};

// Default role for new registrations.
// Stores code_cd from m_system_code (business_cd='USER_ROLE'), NOT the code_name.
// code_cd '2' => code_name 'CUS' => display 'Customer'
const DEFAULT_ROLE_CD = '2';

/**
 * Register a new user account.
 * Creates the user in m_user with VERIFYING status and returns an activation token.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 * @returns {{ activationToken: string, user: object }}
 */
const registerUser = async (email, password, fullName) => {
  // Check for existing email
  const { data: existing } = await supabase
    .from('m_user')
    .select('user_id, account_status')
    .eq('email', email.toLowerCase())
    .eq('is_deleted', false)
    .maybeSingle();

  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const activationToken = generateSecureToken();

  const { data: user, error } = await supabase
    .from('m_user')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name: fullName,
      // Store numeric code_cd, not code_name — m_system_code is the true lookup
      role_cd: DEFAULT_ROLE_CD,
      account_status: STATUS.VERIFYING,
      is_email_verified: false,
      is_deleted: false,
    })
    .select('user_id, email, full_name, role_cd, account_status, created_at')
    .single();

  if (error) {
    const err = new Error('Failed to create account. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  // Store activation token alongside user_id in a temp lookup using avatar_url field
  // For a real implementation, a dedicated token table should be used.
  // Here we store token in a separate record — we use h_system_audit_log-style pattern
  // by embedding token in the user record's avatar_url temporarily with a prefix.
  // Actually: store in a lightweight way using a separate column — we'll use
  // a dedicated in-memory approach simulated via a global Map for this prototype.
  tokenStore.set(activationToken, { userId: user.user_id, expiresAt: Date.now() + 24 * 3600 * 1000 });

  return { activationToken, user };
};

/**
 * Activate a user account using an email verification token.
 * @param {string} token
 * @returns {object} updated user info
 */
const verifyEmail = async (token) => {
  const entry = tokenStore.get(token);

  if (!entry || Date.now() > entry.expiresAt) {
    const err = new Error('Activation link is invalid or has expired.');
    err.statusCode = 400;
    throw err;
  }

  const { data: user, error } = await supabase
    .from('m_user')
    .update({ account_status: STATUS.ACTIVE, is_email_verified: true, updated_at: new Date().toISOString() })
    .eq('user_id', entry.userId)
    .select('user_id, email, account_status')
    .single();

  if (error) {
    const err = new Error('Failed to activate account.');
    err.statusCode = 500;
    throw err;
  }

  tokenStore.delete(token);
  return user;
};

/**
 * Authenticate a user with email and password.
 * Returns a signed JWT on success. Throws descriptive errors for status violations.
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, user: object }}
 */
const signInUser = async (email, password) => {
  const { data: user, error } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, phone, role_cd, account_status, password_hash, avatar_url')
    .eq('email', email.toLowerCase())
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // Status gate checks before password verification (fast-fail)
  if (user.account_status === STATUS.VERIFYING) {
    const err = new Error('ACCOUNT_VERIFYING');
    err.statusCode = 403;
    throw err;
  }

  if (user.account_status === STATUS.DEACTIVATED) {
    const err = new Error('ACCOUNT_DEACTIVATED');
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const payload = {
    user_id: user.user_id,
    email: user.email,
    role_cd: user.role_cd,
  };

  const token = signJwt(payload);

  // Strip sensitive fields before returning
  const { password_hash: _ph, ...safeUser } = user;

  // Resolve role_cd -> code_name for client convenience
  let role_code_name = user.role_cd;
  if (user.role_cd) {
    const { data: sysCode } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'USER_ROLE')
      .eq('code_cd', user.role_cd)
      .maybeSingle();

    if (sysCode) {
      role_code_name = sysCode.code_name;
    }
  }

  return { token, user: { ...safeUser, role_code_name } };
};

/**
 * Get authenticated user's full profile.
 * Resolves role_cd (numeric code_cd) against m_system_code to get code_name,
 * so the frontend can feed it into codeNameParser without knowing the numeric key.
 * @param {string} userId
 * @returns {object} user profile with role_code_name resolved
 */
const getUserProfile = async (userId) => {
  const { data: user, error } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, phone, role_cd, account_status, avatar_url, is_email_verified, created_at')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .single();

  if (error || !user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }


  // Resolve role_cd (code_cd) -> code_name from m_system_code lookup table
  let role_code_name = user.role_cd; // fallback to raw value
  if (user.role_cd) {
    const { data: sysCode } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'USER_ROLE')
      .eq('code_cd', user.role_cd)
      .maybeSingle();

    if (sysCode) {
      role_code_name = sysCode.code_name; // e.g. 'CUS', 'ADM'
    }
  }

  return { ...user, role_code_name };
};

/**
 * Update user profile information (full_name, phone).
 * @param {string} userId
 * @param {{ fullName?: string, phone?: string }} fields
 * @returns {object} updated user profile
 */
const updateUserProfile = async (userId, { fullName, phone }) => {
  const updates = { updated_at: new Date().toISOString() };
  if (fullName !== undefined) updates.full_name = fullName;
  if (phone !== undefined) updates.phone = phone;

  const { data: user, error } = await supabase
    .from('m_user')
    .update(updates)
    .eq('user_id', userId)
    .select('user_id, email, full_name, phone, role_cd, account_status, avatar_url')
    .single();

  if (error) {
    const err = new Error('Failed to update profile.');
    err.statusCode = 500;
    throw err;
  }

  return user;
};

/**
 * Change the user's password after verifying current password.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const { data: user, error } = await supabase
    .from('m_user')
    .select('password_hash')
    .eq('user_id', userId)
    .single();

  if (error || !user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  const newHash = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from('m_user')
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    const err = new Error('Failed to change password.');
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Request a 6-digit OTP for account deactivation.
 * Delegates OTP creation, storage, and dispatch to the dedicated OTP service.
 * @param {string} userId
 * @returns {Promise<{ identifier: string, email: string, purpose: string, expiresInMinutes: number }>}
 */
const requestDeactivateOtp = async (userId) => {
  const { data: user, error } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, account_status')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !user) {
    const err = new Error('User account not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.account_status !== STATUS.ACTIVE) {
    const err = new Error('Only active accounts can be deactivated.');
    err.statusCode = 400;
    throw err;
  }

  return otpService.sendOtp({
    identifier: userId,
    email: user.email,
    purpose: 'DEACTIVATE_ACCOUNT',
    expiryMinutes: 5,
  });
};

/**
 * Deactivate (soft-disable) the user's own account.
 * Verifies OTP via the dedicated OTP service before updating DB.
 * @param {string} userId
 * @param {string} otp - 6-digit verification code
 */
const deactivateAccount = async (userId, otp) => {
  // Delegate verification to otp.service
  await otpService.verifyOtp({
    identifier: userId,
    otp,
    purpose: 'DEACTIVATE_ACCOUNT',
  });

  // Soft-deactivate by flagging account_status to DEACTIVATED
  const { error } = await supabase
    .from('m_user')
    .update({ account_status: STATUS.DEACTIVATED, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    const err = new Error('Failed to deactivate account.');
    err.statusCode = 500;
    throw err;
  }
};

// In-memory token store for email verification (prototype).
// Replace with a database table in production.
const tokenStore = new Map();

module.exports = {
  registerUser,
  verifyEmail,
  signInUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  requestDeactivateOtp,
  deactivateAccount,
};
