import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch list of promotions/coupons with optional filtering.
 * @param {{ search?: string, discount_type?: string, include_deleted?: boolean }} params
 */
export const fetchPromotions = async (params = {}) => {
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
    throw new Error(json.message || 'Không thể tải danh sách khuyến mãi.');
  }

  return json.data;
};

/**
 * Fetch single promotion detail by ID.
 * @param {string} id
 */
export const fetchPromotionById = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COUPONS}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết khuyến mãi.');
  }

  return json.data;
};

/**
 * Create a promotion/coupon.
 * @param {object} payload
 */
export const createPromotion = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.COUPONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo mã khuyến mãi.');
  }

  return json.data;
};

/**
 * Update an existing promotion/coupon.
 * @param {string} id
 * @param {object} payload
 */
export const updatePromotion = async (id, payload) => {
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
    throw new Error(json.message || 'Không thể cập nhật mã khuyến mãi.');
  }

  return json.data;
};

/**
 * Disable a promotion/coupon without removing its booking history.
 * @param {string} id
 */
export const deletePromotion = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COUPONS}/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể xóa mã khuyến mãi.');
  }

  return json.data;
};
