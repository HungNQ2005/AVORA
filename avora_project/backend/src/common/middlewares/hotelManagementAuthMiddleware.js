'use strict';

const supabase = require('../../config/supabaseClient');
const { sendError } = require('../../utils/responseHelper');

const authorizeHotelManagement = async (req, res, next) => {
  if (!supabase) {
    return sendError(res, 503, 'Database client is not initialized.');
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('m_user')
      .select('user_id, email, role_cd, account_status, is_deleted')
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
    const isSystemAdmin = roleName === 'ADM';
    const isBusinessManager = roleName === 'BMR';
    const isVendor = roleName === 'VEN';
    if (!isSystemAdmin && !isBusinessManager && !isVendor) {
      return sendError(res, 403, 'You do not have permission to manage hotels.');
    }

    req.hotelAccess = {
      userId: user.user_id,
      email: user.email,
      roleName,
      isSystemAdmin,
      isBusinessManager,
      isVendor,
    };
    return next();
  } catch (err) {
    console.error(`[HOTEL AUTH] ${err.message}`);
    return sendError(res, 500, 'Failed to verify hotel-management permissions.');
  }
};

module.exports = { authorizeHotelManagement };
