"use strict";

const couponService = require("./coupon.service");
const { sendSuccess, sendError } = require("../../utils/responseHelper");
const { validateCouponPayload } = require("./coupon.validation");
const { recordAuditLog } = require("../../utils/auditLogger");

const validateCouponId = (id) =>
  typeof id === "string" && id.trim().length > 0;

/**
 * GET /api/coupons
 * Returns list of all coupons with stats.
 */
const getAllCoupons = async (req, res, next) => {
  try {
    if (
      (req.query.search !== undefined && typeof req.query.search !== "string") ||
      (req.query.discount_type !== undefined &&
        !["ALL", "PERCENT", "FIXED", "FLASH_PERCENT", "FIXED_AMOUNT"].includes(req.query.discount_type)) ||
      (req.query.include_deleted !== undefined &&
        !["true", "false"].includes(req.query.include_deleted))
    ) {
      return sendError(res, 400, "Bộ lọc mã coupon không hợp lệ.");
    }
    if (req.query.search && req.query.search.length > 200) {
      return sendError(res, 400, "Từ khóa tìm kiếm không được vượt quá 200 ký tự.");
    }

    const filters = {
      search: req.query.search || "",
      discount_type: req.query.discount_type || "ALL",
      include_deleted: req.query.include_deleted === "true",
    };

    const result = await couponService.getCoupons(filters);

    return sendSuccess(res, 200, "Lấy danh sách coupon thành công", result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/coupons/:id
 * Returns detail of a single coupon.
 */
const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateCouponId(id)) {
      return sendError(res, 400, "Mã coupon không hợp lệ.");
    }
    const coupon = await couponService.getCouponById(id);

    return sendSuccess(res, 200, "Lấy chi tiết coupon thành công", coupon);
  } catch (err) {
    next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { payload, error } = validateCouponPayload(req.body);
    if (error) return sendError(res, 400, error);

    const coupon = await couponService.createCoupon(payload);

    recordAuditLog({
      req,
      action_cd: '1', // INS
      entity_name: 'm_coupon',
      entity_id: coupon?.coupon_id || coupon?.code,
      new_data: coupon,
    });
    return sendSuccess(res, 201, "Tạo coupon thành công", coupon);
  } catch (err) {
    next(err);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateCouponId(id)) {
      return sendError(res, 400, "Mã coupon không hợp lệ.");
    }

    const { payload, error } = validateCouponPayload(req.body, { partial: req.method === "PATCH" });
    if (error) return sendError(res, 400, error);

    const coupon = await couponService.updateCoupon(id, payload);

    recordAuditLog({
      req,
      action_cd: '2', // UPD
      entity_name: 'm_coupon',
      entity_id: id,
      new_data: coupon,
    });
    return sendSuccess(res, 200, "Cập nhật coupon thành công", coupon);
  } catch (err) {
    next(err);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateCouponId(id)) {
      return sendError(res, 400, "Mã coupon không hợp lệ.");
    }

    await couponService.deleteCoupon(id);

    recordAuditLog({
      req,
      action_cd: '3', // DEL
      entity_name: 'm_coupon',
      entity_id: id,
      new_data: { is_deleted: true },
    });
    return sendSuccess(res, 200, "Vô hiệu hóa coupon thành công");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
