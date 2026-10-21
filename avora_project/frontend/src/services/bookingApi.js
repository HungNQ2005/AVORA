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
  if (params.userId) query.append('user_id', params.userId);

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
    throw new Error(json.message || 'Không thể đổi ngày lưu trú.');
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
