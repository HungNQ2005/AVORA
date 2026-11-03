'use strict';

const { getVenueWalletDetails } = require('./venueWallet.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getVendorId = (req) => {
  const roleCd = String(req.user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const roleCodeName = String(req.user?.role_code_name || '').trim().toUpperCase();
  const isVendor = roleCodeName === 'VEN' || roleCd === '4';
  return isVendor ? req.user?.user_id : req.user?.user_id || null;
};

/**
 * GET /api/venue-wallet/hotels/:hotelId
 * Returns complete venue wallet details: current balances, 2-tab transactions (Tiền Vào, Tiền Ra),
 * notes, policy calculations, and summary metrics.
 */
const handleGetVenueWallet = async (req, res, next) => {
  const { hotelId } = req.params;
  if (!hotelId || (hotelId !== 'default' && hotelId !== 'current' && !uuidPattern.test(hotelId))) {
    return sendError(res, 400, 'Mã chỗ nghỉ (hotelId) không hợp lệ.');
  }

  const { search, tab, from, to } = req.query || {};

  try {
    const vendorId = getVendorId(req);
    const data = await getVenueWalletDetails({
      hotelId,
      vendorId,
      search: typeof search === 'string' ? search : '',
      tab: typeof tab === 'string' ? tab : 'all',
      from: typeof from === 'string' ? from : null,
      to: typeof to === 'string' ? to : null,
    });

    return sendSuccess(res, 200, 'Lấy dữ liệu ví doanh thu chỗ nghỉ thành công.', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  handleGetVenueWallet,
};
