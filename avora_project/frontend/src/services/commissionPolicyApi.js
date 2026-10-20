import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch list of commission policies with optional filtering.
 * @param {{ search?: string, status?: string, scope?: string, hotel_id?: string, sort_by?: string }} params
 */
export const fetchCommissionPolicies = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) {
    query.append('search', params.search);
  }
  if (params.status && params.status !== 'ALL') {
    query.append('status', params.status);
  }
  if (params.scope && params.scope !== 'ALL') {
    query.append('scope', params.scope);
  }
  if (params.hotel_id && params.hotel_id !== 'ALL') {
    query.append('hotel_id', params.hotel_id);
  }
  if (params.sort_by) {
    query.append('sort_by', params.sort_by);
  }

  const queryString = query.toString();
  const url = `${API_ENDPOINTS.COMMISSION_POLICIES}${queryString ? `?${queryString}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách chính sách phí hoa hồng.');
  }

  return json.data;
};

/**
 * Fetch hotels list for commission policy assignment.
 */
export const fetchCommissionPolicyHotels = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.COMMISSION_POLICY_HOTELS);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách khách sạn.');
  }

  return json.data;
};

/**
 * Fetch single commission policy details by ID.
 * @param {string} id
 */
export const fetchCommissionPolicyById = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COMMISSION_POLICIES}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết chính sách phí hoa hồng.');
  }

  return json.data;
};

/**
 * Create a new commission policy.
 * @param {object} payload
 */
export const createCommissionPolicy = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.COMMISSION_POLICIES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo mới chính sách phí hoa hồng.');
  }

  return json.data;
};

/**
 * Update an existing commission policy.
 * @param {string} id
 * @param {object} payload
 */
export const updateCommissionPolicy = async (id, payload) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COMMISSION_POLICIES}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật chính sách phí hoa hồng.');
  }

  return json.data;
};

/**
 * Delete a commission policy.
 * @param {string} id
 */
export const deleteCommissionPolicy = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.COMMISSION_POLICIES}/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể xóa chính sách phí hoa hồng.');
  }

  return json.data;
};
