import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch all disbursement requests for Business Manager
 */
export const fetchBusinessDisbursements = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') {
    query.append('status', params.status);
  }
  if (params.search) {
    query.append('search', params.search);
  }
  if (params.page) {
    query.append('page', params.page);
  }
  if (params.limit) {
    query.append('limit', params.limit);
  }

  const queryString = query.toString();
  const url = `${API_ENDPOINTS.DISBURSEMENTS_BUSINESS}${queryString ? `?${queryString}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách yêu cầu giải ngân.');
  }

  return json.data;
};

/**
 * Business Manager approves a disbursement request (PND -> APR / Pending Payment)
 */
export const approveDisbursement = async (id) => {
  const response = await authenticatedFetch(API_ENDPOINTS.DISBURSEMENT_APPROVE(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Phê duyệt yêu cầu giải ngân thất bại.');
  }

  return json.data;
};

/**
 * Business Manager / Settlement user completes payment (APR -> CMP / Settled)
 */
export const settleDisbursement = async (id, payload = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.DISBURSEMENT_SETTLE(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Xác nhận quyết toán giải ngân thất bại.');
  }

  return json.data;
};

/**
 * Business Manager rejects a disbursement request (PND -> REJ, refunding balance)
 */
export const rejectDisbursement = async (id, payload = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.DISBURSEMENT_REJECT(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Từ chối yêu cầu giải ngân thất bại.');
  }

  return json.data;
};

/**
 * Vendor: fetch wallet overview and bank accounts
 */
export const fetchVendorDisbursementOverview = async (hotelId = null) => {
  const url = hotelId
    ? `${API_ENDPOINTS.DISBURSEMENTS_VENDOR_OVERVIEW}?hotel_id=${encodeURIComponent(hotelId)}`
    : API_ENDPOINTS.DISBURSEMENTS_VENDOR_OVERVIEW;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin ví của khách sạn.');
  }

  return json.data;
};

/**
 * Vendor: fetch disbursement request history
 */
export const fetchVendorDisbursementHistory = async (hotelId = null) => {
  const url = hotelId
    ? `${API_ENDPOINTS.DISBURSEMENTS_VENDOR_HISTORY}?hotel_id=${encodeURIComponent(hotelId)}`
    : API_ENDPOINTS.DISBURSEMENTS_VENDOR_HISTORY;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải lịch sử giải ngân.');
  }

  return json.data;
};

/**
 * Vendor: create a new disbursement request
 */
export const createVendorDisbursementRequest = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.DISBURSEMENTS_VENDOR_REQUEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo yêu cầu giải ngân.');
  }

  return json.data;
};

