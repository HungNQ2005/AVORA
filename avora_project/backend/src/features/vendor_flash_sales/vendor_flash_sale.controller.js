'use strict';

const vendorFlashSaleService = require('./vendor_flash_sale.service');
const {
  validateCreateFlashSale,
  validateUpdateFlashSale,
  validateFlashSaleId,
} = require('./vendor_flash_sale.validation');
const { sendSuccess, sendError } = require('../../utils/responseHelper');
const { recordAuditLog } = require('../../utils/auditLogger');

const getVendorFlashSales = async (req, res, next) => {
  try {
    const userId = req.hotelAccess.userId;
    const { hotel_id, status, search, page, limit } = req.query;

    const result = await vendorFlashSaleService.getVendorFlashSales({
      userId,
      hotelId: hotel_id || 'ALL',
      status: status || 'ALL',
      search: search || '',
      page,
      limit,
    });

    return sendSuccess(res, 200, 'Lấy danh sách Flash Sale thành công', result);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

const getVendorFlashSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateFlashSaleId(id)) {
      return sendError(res, 400, 'Mã định danh khuyến mãi không hợp lệ.');
    }

    const userId = req.hotelAccess.userId;
    const flashSale = await vendorFlashSaleService.getVendorFlashSaleById({ userId, couponId: id });

    return sendSuccess(res, 200, 'Lấy chi tiết Flash Sale thành công', flashSale);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

const createVendorFlashSale = async (req, res, next) => {
  try {
    const { payload, error } = validateCreateFlashSale(req.body);
    if (error) {
      return sendError(res, 400, error);
    }

    const userId = req.hotelAccess.userId;
    const flashSale = await vendorFlashSaleService.createVendorFlashSale({ userId, payload });

    recordAuditLog({
      req,
      action_cd: '1', // INS
      entity_name: 'm_coupon',
      entity_id: flashSale?.coupon_id || flashSale?.code,
      new_data: flashSale,
    });

    return sendSuccess(res, 201, 'Tạo chương trình Flash Sale thành công', flashSale);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

const updateVendorFlashSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateFlashSaleId(id)) {
      return sendError(res, 400, 'Mã định danh khuyến mãi không hợp lệ.');
    }

    const { payload, error } = validateUpdateFlashSale(req.body);
    if (error) {
      return sendError(res, 400, error);
    }

    const userId = req.hotelAccess.userId;
    const updateResult = await vendorFlashSaleService.updateVendorFlashSale({
      userId,
      couponId: id,
      updates: payload,
    });

    recordAuditLog({
      req,
      action_cd: '2', // UPD
      entity_name: 'm_coupon',
      entity_id: id,
      old_data: updateResult.previous,
      new_data: updateResult.current,
    });

    return sendSuccess(res, 200, 'Cập nhật Flash Sale thành công', updateResult.current);
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

const deleteVendorFlashSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateFlashSaleId(id)) {
      return sendError(res, 400, 'Mã định danh khuyến mãi không hợp lệ.');
    }

    const userId = req.hotelAccess.userId;
    const deletedCoupon = await vendorFlashSaleService.deleteVendorFlashSale({ userId, couponId: id });

    recordAuditLog({
      req,
      action_cd: '3', // DEL
      entity_name: 'm_coupon',
      entity_id: id,
      old_data: deletedCoupon,
      new_data: { ...deletedCoupon, is_deleted: true },
    });

    return sendSuccess(res, 200, 'Đã vô hiệu hóa khuyến mãi thành công');
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
};

module.exports = {
  getVendorFlashSales,
  getVendorFlashSaleById,
  createVendorFlashSale,
  updateVendorFlashSale,
  deleteVendorFlashSale,
};
