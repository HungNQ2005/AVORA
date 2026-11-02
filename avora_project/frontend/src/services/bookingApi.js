import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Service handling customer booking API requests.
 */

export const calculateBookingPricing = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BOOKING_CALCULATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tính toán chi phí booking.');
  }

  return json.data;
};

export const createBooking = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BOOKINGS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.status === 'error') {
    const error = new Error(json.message || 'Không thể tạo đơn đặt phòng.');
    error.code = json.code;
    throw error;
  }

  return json.data;
};

export const fetchBookingById = async (id) => {
  const url = API_ENDPOINTS.BOOKING_DETAIL(id);
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin đặt phòng.');
  }

  return json.data;
};

export const fetchMyBookings = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.timeRange && params.timeRange !== 'all') query.append('timeRange', params.timeRange);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.requireVatOnly) query.append('requireVatOnly', 'true');

  const qs = query.toString();
  const url = `${API_ENDPOINTS.BOOKINGS_MY}${qs ? `?${qs}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách đơn đặt phòng.');
  }

  return json.data;
};

export const updateBookingGuestInfo = async (id, payload) => {
  const url = API_ENDPOINTS.BOOKING_DETAIL(id);
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật thông tin đơn phòng.');
  }

  return json.data;
};

export const changeBookingDates = async (id, payload) => {
  const url = API_ENDPOINTS.BOOKING_DATES(id);
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    const error = new Error(json.message || 'Không thể đổi ngày lưu trú.');
    error.code = json.code;
    error.data = json.data;
    throw error;
  }

  return json.data;
};

export const cancelBooking = async (id, payload = {}) => {
  const url = API_ENDPOINTS.BOOKING_CANCEL(id);
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể hủy đơn đặt phòng.');
  }

  return json.data;
};

export const fetchRefundBanks = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.BOOKING_BANKS);
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[BookingApi] Backend banks fetch warning:', err.message);
  }

  // Fallback to direct VietQR public API
  try {
    const directRes = await fetch('https://api.vietqr.io/v2/banks');
    if (directRes.ok) {
      const directJson = await directRes.json();
      if (Array.isArray(directJson?.data)) {
        return directJson.data.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          bin: b.bin,
          short_name: b.shortName || b.short_name || b.code,
          logo: b.logo,
        }));
      }
    }
  } catch (directErr) {
    console.error('[BookingApi] Direct VietQR fetch failed:', directErr);
  }
  return [];
};

export const fetchBookingVoucher = async (id) => {
  const url = API_ENDPOINTS.BOOKING_VOUCHER(id);
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin voucher.');
  }

  return json.data;
};

export const fetchBookingInvoice = async (id) => {
  const url = API_ENDPOINTS.BOOKING_INVOICE(id);
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải hóa đơn VAT điện tử.');
  }

  return json.data;
};
