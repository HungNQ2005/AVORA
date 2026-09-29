'use strict';

const promotionService = require('./promotion.service');

/**
 * GET /api/promotions
 * Returns list of all coupons with stats.
 */
const getAllCoupons = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search || '',
      discount_type: req.query.discount_type || 'ALL',
      include_deleted: req.query.include_deleted === 'true',
    };

    const result = await promotionService.getCoupons(filters);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/promotions/:id
 * Returns detail of a single coupon.
 */
const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await promotionService.getCouponById(id);

    res.json({
      status: 'success',
      data: coupon,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
};
