'use strict';

const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');
const { sendMail } = require('../../common/services/email/email.service');
const { renderExpiredLinkPage } = require('./templates/expiredLinkPage');

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

    // Send activation link using centralized email service
    const activationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${activationToken}`;
    await sendMail({
      to: user.email,
      subject: 'Kích hoạt tài khoản Avora Booking',
      templateName: 'activation',
      templateData: {
        fullName: user.full_name || full_name,
        activationUrl,
      },
    });

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

    // Return unified white-and-blue brand success page
    return res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kích hoạt tài khoản thành công - AVORA</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
            display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;
          }
          .card {
            background: #ffffff; border: 2px solid #e0f2fe; border-radius: 24px; padding: 48px 36px;
            text-align: center; max-width: 460px; width: 100%;
            box-shadow: 0 20px 45px -10px rgba(14, 165, 233, 0.18);
            animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          @keyframes pop { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
          .logo {
            display: inline-block; font-size: 22px; font-weight: 800;
            background: linear-gradient(135deg, #0284c7, #2563eb);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
          }
          .icon {
            width: 72px; height: 72px; border-radius: 50%; background: #dcfce7; color: #16a34a;
            display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px;
          }
          h1 { color: #0f172a; font-size: 22px; margin-bottom: 12px; font-weight: 800; }
          p { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
          .btn {
            display: block; background: linear-gradient(135deg, #0284c7, #2563eb); color: white;
            padding: 14px 28px; border-radius: 14px; text-decoration: none; font-weight: 700;
            font-size: 15px; box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4);
            transition: transform 0.2s;
          }
          .btn:hover { transform: translateY(-2px); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">AVORA VIỆT NAM</div>
          <div class="icon">✓</div>
          <h1>Kích hoạt thành công!</h1>
          <p>Tài khoản cho email <strong>${user.email}</strong> đã được kích hoạt thành công. Bây giờ bạn có thể đăng nhập.</p>
          <a href="http://localhost:5173/signin?activated=true" class="btn">Đăng nhập ngay</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    // If token is invalid, expired, or already used — render the cute white & blue 410 page!
    return res.status(err.statusCode || 400).send(
      renderExpiredLinkPage({
        code: '410',
        title: 'Ối... Hình như bạn bị lạc rồi! (｡•́︿•̀｡)',
        message: 'Liên kết kích hoạt tài khoản này đã được sử dụng trước đó, hoặc đã hết hạn mất rồi.',
        backUrl: 'http://localhost:5173/signin',
        backLabel: 'Về trang đăng nhập',
      })
    );
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

/**
 * POST /api/auth/forgot-password
 * Request a one-time password reset link.
 */
const handleForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 400, 'Vui lòng cung cấp địa chỉ email.');
    }

    const originHost = req.headers.origin || 'http://localhost:5173';
    const result = await authService.requestPasswordReset(email, originHost);

    return sendSuccess(res, 200, result.message, { email: result.email });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * GET /api/auth/verify-reset-token/:token
 * Check if a reset token is valid before rendering the form.
 */
const handleVerifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = authService.verifyResetPasswordToken(token);
    return sendSuccess(res, 200, 'Mã liên kết hợp lệ.', result);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset user password using the one-time token.
 */
const handleResetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return sendError(res, 400, 'Vui lòng cung cấp token và mật khẩu mới.');
    }

    const result = await authService.resetPasswordWithToken(token, new_password);
    return sendSuccess(res, 200, result.message);
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
  handleForgotPassword,
  handleVerifyResetToken,
  handleResetPassword,
};
