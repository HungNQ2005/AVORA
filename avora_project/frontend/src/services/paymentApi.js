import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Service handling VietQR / SePay payment API requests.
 */

const parseResponse = async (response, fallbackMessage) => {
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok || !json || json.status === 'error') {
    const error = new Error(json?.message || fallbackMessage);
    error.code = json?.code;
    error.httpStatus = response.status;
    throw error;
  }
  return json.data;
};

export const createPaymentQr = async (bookingId) => {
  const response = await authenticatedFetch(API_ENDPOINTS.PAYMENT_CREATE_QR, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  return parseResponse(response, 'Không thể tạo mã QR thanh toán.');
};

export const fetchPaymentStatus = async (bookingId) => {
  const response = await authenticatedFetch(API_ENDPOINTS.PAYMENT_STATUS(bookingId));
  return parseResponse(response, 'Không thể kiểm tra trạng thái thanh toán.');
};
