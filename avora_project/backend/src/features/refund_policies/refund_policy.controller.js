"use strict";

const refundPolicyService = require("./refund_policy.service");
const { sendSuccess, sendError } = require("../../utils/responseHelper");
const {
  validateRefundPolicyPayload,
  validateRefundPolicyFilters,
  isValidUuid,
} = require("./refund_policy.validation");

/**
 * GET /api/refund-policies
 * Returns list of refund policies with stats and filters.
 */
const getAllRefundPolicies = async (req, res, next) => {
  try {
    const { filters, error } = validateRefundPolicyFilters(req.query);
    if (error) {
      return sendError(res, 400, error);
    }

    const result = await refundPolicyService.getRefundPolicies(filters);
    return sendSuccess(res, 200, "Lấy danh sách chính sách hoàn tiền thành công.", result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/refund-policies/hotels
 * Returns list of hotels for dropdown.
 */
const getHotels = async (req, res, next) => {
  try {
    const hotels = await refundPolicyService.getHotelsList();
    return sendSuccess(res, 200, "Lấy danh sách khách sạn thành công.", hotels);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/refund-policies/:id
 * Returns detail of a single refund policy.
 */
const getRefundPolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return sendError(res, 400, "Mã định danh chính sách hoàn tiền không được để trống.");
    }
    if (cleanId.length > 100) {
      return sendError(res, 400, "Mã định danh chính sách hoàn tiền không hợp lệ.");
    }

    const policy = await refundPolicyService.getRefundPolicyById(cleanId);
    return sendSuccess(res, 200, "Lấy chi tiết chính sách hoàn tiền thành công.", policy);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/refund-policies
 * Creates a new refund policy.
 */
const createRefundPolicy = async (req, res, next) => {
  try {
    const { payload, error } = validateRefundPolicyPayload(req.body);
    if (error) {
      return sendError(res, 400, error);
    }

    const policy = await refundPolicyService.createRefundPolicy(payload);
    return sendSuccess(res, 201, "Tạo chính sách hoàn tiền mới thành công.", policy);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/refund-policies/:id
 * PATCH /api/refund-policies/:id
 * Updates an existing refund policy.
 */
const updateRefundPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || "").trim();
    if (!cleanId || !isValidUuid(cleanId)) {
      return sendError(res, 400, "Mã chính sách hoàn tiền không đúng định dạng UUID.");
    }

    const { payload, error } = validateRefundPolicyPayload(req.body, {
      partial: req.method === "PATCH",
    });
    if (error) {
      return sendError(res, 400, error);
    }

    const updated = await refundPolicyService.updateRefundPolicy(cleanId, payload);
    return sendSuccess(res, 200, "Cập nhật chính sách hoàn tiền thành công.", updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/refund-policies/:id
 * Deletes a refund policy with booking and assignment constraint check.
 */
const deleteRefundPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || "").trim();
    if (!cleanId || !isValidUuid(cleanId)) {
      return sendError(res, 400, "Mã chính sách hoàn tiền không đúng định dạng UUID.");
    }

    const result = await refundPolicyService.deleteRefundPolicy(cleanId);
    return sendSuccess(res, 200, result.message || "Xóa chính sách hoàn tiền thành công.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllRefundPolicies,
  getHotels,
  getRefundPolicyById,
  createRefundPolicy,
  updateRefundPolicy,
  deleteRefundPolicy,
};

