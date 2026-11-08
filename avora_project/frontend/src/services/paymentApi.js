import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Service handling VietQR / SePay single & group payment API requests.
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

export const createOrUpdatePaymentGroup = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.PAYMENT_GROUPS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, 'Không thể tạo hoặc cập nhật nhóm thanh toán.');
};

export const fetchPaymentGroupByBooking = async (bookingId) => {
  const response = await authenticatedFetch(API_ENDPOINTS.PAYMENT_GROUP_BY_BOOKING(bookingId));
  return parseResponse(response, 'Không thể tải thông tin nhóm thanh toán.');
};

export const fetchPaymentGroupByHash = async (inviteHash) => {
  const response = await fetch(API_ENDPOINTS.PAYMENT_GROUP_BY_HASH(inviteHash), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseResponse(response, 'Không tìm thấy phòng thanh toán nhóm hoặc liên kết không hợp lệ.');
};

export const claimPaymentGroupMember = async (inviteHash, memberId, payload) => {
  const token = localStorage.getItem('avora_token') || sessionStorage.getItem('avora_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(API_ENDPOINTS.PAYMENT_GROUP_CLAIM_MEMBER(inviteHash, memberId), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  return parseResponse(response, 'Không thể nhận suất thanh toán này.');
};

export const payRemainingGroupAmount = async (groupId) => {
  const response = await authenticatedFetch(API_ENDPOINTS.PAYMENT_GROUP_PAY_REMAINING(groupId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseResponse(response, 'Không thể gom phần tiền còn thiếu.');
};
