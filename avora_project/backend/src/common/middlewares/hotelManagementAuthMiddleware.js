'use strict';

const supabase = require('../../config/supabaseClient');
const { sendError } = require('../../utils/responseHelper');

const ROLE_NAMES = new Set([
  'ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN', 'SYSTEM ADMIN',
  'BMR', 'BUSINESS_MANAGER', 'BUSINESS MANAGER',
]);

const authorizeHotelManagement = async (req, res, next) => {
  if (!supabase) {
    return sendError(res, 503, 'Database client is not initialized.');
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('m_user')
      .select('user_id, role_cd, account_status, is_deleted')
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user || user.is_deleted || user.account_status !== 'ACTIVE') {
      return sendError(res, 403, 'An active account is required to manage hotels.');
    }

    const { data: role, error: roleError } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'USER_ROLE')
      .eq('code_cd', user.role_cd)
      .maybeSingle();

    if (roleError) throw roleError;
    const roleName = String(role?.code_name || '').trim().toUpperCase();
    if (!ROLE_NAMES.has(roleName)) {
      return sendError(res, 403, 'You do not have permission to manage hotels.');
    }

    req.hotelAccess = {
      userId: user.user_id,
      isSystemAdmin: ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN', 'SYSTEM ADMIN'].includes(roleName),
    };
    return next();
  } catch (err) {
    console.error(`[HOTEL AUTH] ${err.message}`);
    return sendError(res, 500, 'Failed to verify hotel-management permissions.');
  }
};

module.exports = { authorizeHotelManagement };
