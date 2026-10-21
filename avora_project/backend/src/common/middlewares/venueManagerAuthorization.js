"use strict";

const supabase = require("../../config/supabaseClient");
const { sendError } = require("../../utils/responseHelper");

const requireVenueManager = async (req, res, next) => {
  if (!req.user?.user_id) {
    return sendError(res, 401, "Authentication required. Please sign in.");
  }

  if (!supabase) {
    return next(new Error("Database client is not initialized."));
  }

  try {
    const { data: user, error: userError } = await supabase
      .from("m_user")
      .select("role_cd")
      .eq("user_id", req.user.user_id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (userError) {
      return next(userError);
    }

    if (!user) {
      return sendError(res, 401, "Authenticated user was not found.");
    }

    if (!user.role_cd) {
      return sendError(
        res,
        403,
        "You do not have permission to access this resource.",
      );
    }

    // Role check: Only ADM ('1' / Administrator) is authorized for room types and amenities
    if (String(user.role_cd) === "1") {
      req.user.role_code_name = "ADM";
      return next();
    }

    const { data: role, error: roleError } = await supabase
      .from("m_system_code")
      .select("code_name")
      .eq("business_cd", "USER_ROLE")
      .eq("code_cd", user.role_cd)
      .maybeSingle();

    if (roleError) {
      return next(roleError);
    }

    if (!["ADM", "ADMIN", "ADMINISTRATOR", "SYSTEM_ADMIN"].includes(role?.code_name)) {
      return sendError(
        res,
        403,
        "Bạn không có quyền truy cập tài nguyên này. Chỉ dành cho Quản trị viên hệ thống (Admin).",
      );
    }

    req.user.role_code_name = role.code_name;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireVenueManager };
