"use strict";

const commissionPolicyService = require("./commission_policy.service");
const { sendSuccess, sendError } = require("../../utils/responseHelper");
const {
  validateCommissionPolicyPayload,
  isValidUuid,
} = require("./commission_policy.validation");

/**
 * GET /api/commission-policies
 * Returns list of commission policies with stats and filters.
 */
const getAllCommissionPolicies = async (req, res, next) => {
  try {
    const filters = {
      search: typeof req.query.search === "string" ? req.query.search : "",
      status: req.query.status || "ALL",
      scope: req.query.scope || "ALL",
      hotel_id: req.query.hotel_id || "ALL",
      sort_by: req.query.sort_by || "PRIORITY_DESC",
    };

    if (filters.search && filters.search.length > 200) {
      return sendError(res, 400, "Từ khóa tìm kiếm không được vượt quá 200 ký tự.");
    }

    if (filters.status !== "ALL" && !["ACTIVE", "UPCOMING", "EXPIRED"].includes(filters.status)) {
      return sendError(res, 400, "Bộ lọc trạng thái không hợp lệ.");
    }

    const result = await commissionPolicyService.getCommissionPolicies(filters);
    return sendSuccess(res, 200, "Lấy danh sách chính sách phí hoa hồng thành công.", result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/commission-policies/hotels
 * Returns list of hotels for dropdown.
 */
const getHotels = async (req, res, next) => {
  try {
    const hotels = await commissionPolicyService.getHotelsList();
    return sendSuccess(res, 200, "Lấy danh sách khách sạn thành công.", hotels);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/commission-policies/:id
 * Returns detail of a single commission policy.
 */
const getCommissionPolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return sendError(res, 400, "Mã chính sách hoa hồng không được để trống.");
    }

    const policy = await commissionPolicyService.getCommissionPolicyById(cleanId);
    return sendSuccess(res, 200, "Lấy chi tiết chính sách phí hoa hồng thành công.", policy);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/commission-policies
 * Creates a new commission policy.
 */
const createCommissionPolicy = async (req, res, next) => {
  try {
    const { payload, error } = validateCommissionPolicyPayload(req.body);
    if (error) {
      return sendError(res, 400, error);
    }

    const policy = await commissionPolicyService.createCommissionPolicy(payload);
    return sendSuccess(res, 201, "Tạo chính sách phí hoa hồng mới thành công.", policy);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/commission-policies/:id
 * PATCH /api/commission-policies/:id
 * Updates an existing commission policy.
 */
const updateCommissionPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !isValidUuid(id)) {
      return sendError(res, 400, "Mã chính sách hoa hồng không hợp lệ.");
    }

    const { payload, error } = validateCommissionPolicyPayload(req.body, {
      partial: req.method === "PATCH",
    });
    if (error) {
      return sendError(res, 400, error);
    }

    const updated = await commissionPolicyService.updateCommissionPolicy(id, payload);
    return sendSuccess(res, 200, "Cập nhật chính sách phí hoa hồng thành công.", updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/commission-policies/:id
 * Deletes an existing commission policy.
 */
const deleteCommissionPolicy = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !isValidUuid(id)) {
      return sendError(res, 400, "Mã chính sách hoa hồng không hợp lệ.");
    }

    const result = await commissionPolicyService.deleteCommissionPolicy(id);
    return sendSuccess(res, 200, "Xóa chính sách phí hoa hồng thành công.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCommissionPolicies,
  getHotels,
  getCommissionPolicyById,
  createCommissionPolicy,
  updateCommissionPolicy,
  deleteCommissionPolicy,
};
