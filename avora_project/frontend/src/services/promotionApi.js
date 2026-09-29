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

  const url = `${API_ENDPOINTS.PROMOTIONS}${query.toString() ? `?${query.toString()}` : ''}`;
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
    `${API_ENDPOINTS.PROMOTIONS}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết khuyến mãi.');
  }

  return json.data;
};
