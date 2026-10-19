'use strict';

const { getStatisticsHotels, getHotelOverview } = require('./statistics.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/statistics/hotels
 */
const handleGetStatisticsHotels = async (req, res, next) => {
  try {
    const vendorId = req.user?.user_id;
    const data = await getStatisticsHotels(vendorId);
    return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công', data);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/statistics/overview?hotel_id=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
const handleGetOverview = async (req, res, next) => {
  const { hotel_id: hotelId, from, to } = req.query;
  const vendorId = req.user?.user_id;

  if (typeof hotelId !== 'string' || !uuidPattern.test(hotelId)) {
    return sendError(res, 400, 'Mã khách sạn không hợp lệ.');
  }
  if ((from !== undefined && typeof from !== 'string') || (to !== undefined && typeof to !== 'string')) {
    return sendError(res, 400, 'Khoảng ngày thống kê không hợp lệ.');
  }

  try {
    const data = await getHotelOverview({
      hotelId,
      from: from || undefined,
      to: to || undefined,
      vendorId,
    });
    return sendSuccess(res, 200, 'Lấy thống kê khách sạn thành công', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = { handleGetStatisticsHotels, handleGetOverview };
