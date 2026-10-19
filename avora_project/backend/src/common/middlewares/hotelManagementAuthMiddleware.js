'use strict';

const supabase = require('../../config/supabaseClient');
const { sendError } = require('../../utils/responseHelper');
const { codeNameParser } = require('../../utils/codeNameParser');

const authorizeHotelManagement = async (req, res, next) => {
  if (!supabase) {
    return sendError(res, 503, 'Kết nối cơ sở dữ liệu chưa được khởi tạo.');
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('m_user')
      .select('user_id, email, role_cd, account_status, is_deleted')
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user || user.is_deleted || user.account_status !== 'ACTIVE') {
      return sendError(res, 403, 'Cần sử dụng tài khoản đang hoạt động để quản lý khách sạn.');
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
      return sendError(res, 403, 'Bạn không có quyền quản lý khách sạn.');
    }

    req.hotelAccess = {
      userId: user.user_id,
      email: user.email,
      roleName,
      roleDisplayName: codeNameParser(roleName),
      isSystemAdmin,
      isBusinessManager,
      isVendor,
    };
    return next();
  } catch (err) {
    console.error(`[HOTEL AUTH] ${err.message}`);
    return sendError(res, 500, 'Không thể xác minh quyền quản lý khách sạn.');
  }
};

module.exports = { authorizeHotelManagement };
