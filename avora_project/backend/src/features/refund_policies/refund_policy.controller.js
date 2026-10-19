"use strict";

const refundPolicyService = require("./refund_policy.service");
const { sendSuccess, sendError } = require("../../utils/responseHelper");
const { validateRefundPolicyPayload, isValidUuid } = require("./refund_policy.validation");

/**
 * GET /api/refund-policies
 * Returns list of refund policies with stats and filters.
 */
const getAllRefundPolicies = async (req, res, next) => {
  try {
    const filters = {
      search: typeof req.query.search === "string" ? req.query.search : "",
      status: req.query.status || "ALL",
      hotel_id: req.query.hotel_id || "ALL",
      sort_by: req.query.sort_by || "PERCENT_DESC",
    };

    if (filters.search && filters.search.length > 200) {
      return sendError(res, 400, "Từ khóa tìm kiếm không được vượt quá 200 ký tự.");
    }

    if (filters.status !== "ALL" && !["ACTIVE", "INACTIVE"].includes(filters.status)) {
      return sendError(res, 400, "Bộ lọc trạng thái không hợp lệ.");
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
    if (!id || !isValidUuid(id)) {
      return sendError(res, 400, "Mã chính sách hoàn tiền không hợp lệ.");
    }

    const policy = await refundPolicyService.getRefundPolicyById(id);
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
    if (!id || !isValidUuid(id)) {
      return sendError(res, 400, "Mã chính sách hoàn tiền không hợp lệ.");
    }

    const { payload, error } = validateRefundPolicyPayload(req.body, {
      partial: req.method === "PATCH",
    });
    if (error) {
      return sendError(res, 400, error);
    }

    const updated = await refundPolicyService.updateRefundPolicy(id, payload);
    return sendSuccess(res, 200, "Cập nhật chính sách hoàn tiền thành công.", updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/refund-policies/:id
 * Deletes a refund policy with booking constraint check.
 */
const deleteRefundPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !isValidUuid(id)) {
      return sendError(res, 400, "Mã chính sách hoàn tiền không hợp lệ.");
    }

    const result = await refundPolicyService.deleteRefundPolicy(id);
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
