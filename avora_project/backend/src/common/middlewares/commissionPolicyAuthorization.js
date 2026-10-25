"use strict";

const supabase = require("../../config/supabaseClient");
const { sendError } = require("../../utils/responseHelper");

/**
 * Middleware ensuring only Business Managers (BMR) or Administrators (ADM)
 * can access the commission policy management endpoints.
 */
const requireCommissionPolicyManager = async (req, res, next) => {
  if (!req.user?.user_id) {
    return sendError(res, 401, "Yêu cầu đăng nhập để truy cập tính năng này.");
  }

  if (!supabase) {
    const error = new Error("Database client is not initialized.");
    error.statusCode = 503;
    return next(error);
  }

  try {
    const { data: user, error: userError } = await supabase
      .from("m_user")
      .select("role_cd, is_deleted, account_status")
      .eq("user_id", req.user.user_id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (userError) return next(userError);
    if (!user) {
      return sendError(res, 401, "Tài khoản người dùng không tồn tại hoặc đã bị khóa.");
    }

    if (!user.role_cd) {
      return sendError(
        res,
        403,
        "Bạn không có quyền quản lý chính sách phí hoa hồng."
      );
    }

    // Role check: '3' is BMR
    if (String(user.role_cd) === "3") {
      return next();
    }

    const { data: role, error: roleError } = await supabase
      .from("m_system_code")
      .select("code_name")
      .eq("business_cd", "USER_ROLE")
      .eq("code_cd", user.role_cd)
      .maybeSingle();

    if (roleError) return next(roleError);
    if (role?.code_name !== "BMR") {
      return sendError(
        res,
        403,
        "Bạn không có quyền quản lý chính sách phí hoa hồng. Chỉ dành cho Business Manager."
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireCommissionPolicyManager };
