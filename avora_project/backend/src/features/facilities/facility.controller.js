'use strict';

const {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
} = require('./facility.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const handleGetFacilities = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      category: req.query.category,
      scope: req.query.scope,
      highlight_only: req.query.highlight_only === 'true',
      pricing: req.query.pricing,
      status: req.query.status,
      sort: req.query.sort,
    };

    const result = await getFacilities(filters);
    return sendSuccess(res, 200, 'Lấy danh sách tiện ích thành công', result);
  } catch (error) {
    next(error);
  }
};

const handleGetFacilityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return sendError(res, 400, 'Mã tiện ích không hợp lệ.');
    }

    const facility = await getFacilityById(id);
    return sendSuccess(res, 200, 'Lấy chi tiết tiện ích thành công', facility);
  } catch (error) {
    next(error);
  }
};

const handleCreateFacility = async (req, res, next) => {
  try {
    const { facility_name, name_vi, type, icon } = req.body;
    const name = facility_name || name_vi;
    if (!name || !String(name).trim()) {
      return sendError(res, 400, 'Tên tiện ích không được để trống.');
    }

    const newFacility = await createFacility({
      facility_name: name,
      type,
      icon,
    });
    return sendSuccess(res, 201, 'Tạo tiện ích mới thành công', newFacility);
  } catch (error) {
    next(error);
  }
};

const handleUpdateFacility = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return sendError(res, 400, 'Mã tiện ích không hợp lệ.');
    }

    const { facility_name, name_vi, type, icon } = req.body;
    const name = facility_name || name_vi;

    const updatedFacility = await updateFacility(id, {
      facility_name: name,
      type,
      icon,
    });
    return sendSuccess(res, 200, 'Cập nhật tiện ích thành công', updatedFacility);
  } catch (error) {
    next(error);
  }
};

const handleDeleteFacility = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return sendError(res, 400, 'Mã tiện ích không hợp lệ.');
    }

    await deleteFacility(id);
    return sendSuccess(res, 200, 'Xóa tiện ích thành công');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleGetFacilities,
  handleGetFacilityById,
  handleCreateFacility,
  handleUpdateFacility,
  handleDeleteFacility,
};
