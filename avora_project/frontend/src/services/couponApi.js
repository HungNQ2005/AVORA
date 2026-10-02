import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch coupons with optional filtering.
 * @param {{ search?: string, discount_type?: string, include_deleted?: boolean }} params
 */
export const fetchCoupons = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) {
    query.append('search', params.search);
  }
  if (params.discount_type && params.discount_type !== 'ALL') {
    query.append('discount_type', params.discount_type);
  }
  if (params.include_deleted) {
    query.append('include_deleted', 'true');
  }

  const url = `${API_ENDPOINTS.COUPONS}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách coupon.');
  }

  return json.data;
};

/**
 * Fetch a coupon by ID.
 * @param {string} id
 */
export const fetchCouponById = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COUPONS}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết coupon.');
  }

  return json.data;
};

/**
 * Create a coupon.
 * @param {object} payload
 */
export const createCoupon = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.COUPONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo coupon.');
  }

  return json.data;
};

/**
 * Update a coupon.
 * @param {string} id
 * @param {object} payload
 */
export const updateCoupon = async (id, payload) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COUPONS}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật coupon.');
  }

  return json.data;
};

/**
 * Disable a coupon without removing its booking history.
 * @param {string} id
 */
export const deleteCoupon = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COUPONS}/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể vô hiệu hóa coupon.');
  }

  return json.data;
};
