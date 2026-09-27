'use strict';

const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * POST /api/auth/signup
 * Register a new user account.
 */
const handleSignUp = async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return sendError(res, 400, 'email, password, and full_name are required.');
    }

    if (password.length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters.');
    }

    const { activationToken, user } = await authService.registerUser(email, password, full_name);

    // Simulate sending email: log the activation link to console
    const activationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${activationToken}`;
    console.log('\n[EMAIL SIMULATION] ========================================');
    console.log(`  To: ${user.email}`);
    console.log(`  Subject: Activate your AVORA account`);
    console.log(`  Activation Link: ${activationUrl}`);
    console.log('============================================================\n');

    return sendSuccess(res, 201, 'Account created successfully. Please check your email to activate.', {
      user_id: user.user_id,
      email: user.email,
    });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * GET /api/auth/verify/:token
 * Activate a user account via email verification token.
 */
const handleVerifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await authService.verifyEmail(token);

    // Return a simple HTML page so clicking the email link gives feedback
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Account Activated - AVORA</title>
        <style>
          body { font-family: Inter, sans-serif; background: #1e2330; color: #e2e8f0;
                 display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #2b3245; border-radius: 12px; padding: 48px; text-align: center; max-width: 420px; }
          h1 { color: #5865f2; margin-bottom: 12px; }
          p { color: #94a3b8; margin-bottom: 24px; }
          a { display: inline-block; background: #5865f2; color: white; padding: 12px 32px;
              border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Account Activated!</h1>
          <p>Your account <strong>${user.email}</strong> is now active. You can sign in.</p>
          <a href="http://localhost:5173/signin">Sign In</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * POST /api/auth/signin
 * Authenticate user and return JWT token.
 */
const handleSignIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'email and password are required.');
    }

    const { token, user } = await authService.signInUser(email, password);

    return sendSuccess(res, 200, 'Signed in successfully.', { token, user });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * GET /api/account/profile
 * Get the authenticated user's profile.
 */
const handleGetProfile = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.user_id);
    return sendSuccess(res, 200, 'Profile fetched successfully.', user);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * PUT /api/account/profile
 * Update the authenticated user's profile (full_name, phone).
 */
const handleUpdateProfile = async (req, res, next) => {
  try {
    const { full_name, phone } = req.body;
    const user = await authService.updateUserProfile(req.user.user_id, { fullName: full_name, phone });
    return sendSuccess(res, 200, 'Profile updated successfully.', user);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * PUT /api/account/change-password
 * Change the authenticated user's password.
 */
const handleChangePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return sendError(res, 400, 'current_password and new_password are required.');
    }

    if (new_password.length < 8) {
      return sendError(res, 400, 'New password must be at least 8 characters.');
    }

    await authService.changePassword(req.user.user_id, current_password, new_password);
    return sendSuccess(res, 200, 'Password changed successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * POST /api/account/deactivate/request-otp
 * Generate and send a 6-digit verification code to the user's email for deactivation.
 */
const handleRequestDeactivateOtp = async (req, res, next) => {
  try {
    const result = await authService.requestDeactivateOtp(req.user.user_id);
    return sendSuccess(res, 200, 'Verification code sent to your email.', result);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * DELETE /api/account/deactivate (or POST /api/account/deactivate)
 * Deactivate the authenticated user's own account using OTP.
 */
const handleDeactivateAccount = async (req, res, next) => {
  try {
    const otp = req.body?.otp || req.query?.otp;
    if (!otp) {
      return sendError(res, 400, 'Verification code (OTP) is required.');
    }
    await authService.deactivateAccount(req.user.user_id, otp);
    return sendSuccess(res, 200, 'Account deactivated successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

module.exports = {
  handleSignUp,
  handleVerifyEmail,
  handleSignIn,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleRequestDeactivateOtp,
  handleDeactivateAccount,
};
