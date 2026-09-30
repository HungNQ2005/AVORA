'use strict';

const supabase = require('../../config/supabaseClient');
const { verifyJwt } = require('../../utils/tokenHelper');
const { sendError } = require('../../utils/responseHelper');

/**
 * Express middleware to authenticate requests via JWT Bearer token.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Authentication required. Please sign in.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token. Please sign in again.');
  }
};

/**
 * Middleware factory to authorize user by role code names (e.g. 'ADM', 'VEN', 'BMR').
 * @param {...string} allowedRoles
 */
const requireRole = (...allowedRoles) => async (req, res, next) => {
  if (!req.user?.user_id) {
    return sendError(res, 401, 'Authentication required. Please sign in.');
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('m_user')
      .select('role_cd')
      .eq('user_id', req.user.user_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (userError) return next(userError);
    if (!user || !user.role_cd) {
      return sendError(res, 403, 'Bạn không có quyền thực hiện hành động này.');
    }

    const { data: role, error: roleError } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'USER_ROLE')
      .eq('code_cd', user.role_cd)
      .maybeSingle();

    if (roleError) return next(roleError);
    if (!allowedRoles.includes(role?.code_name)) {
      return sendError(
        res,
        403,
        `Bạn không có quyền truy cập. Chỉ dành cho: ${allowedRoles.join(', ')}.`
      );
    }

    req.user.role_code_name = role.code_name;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authenticate, requireRole };
