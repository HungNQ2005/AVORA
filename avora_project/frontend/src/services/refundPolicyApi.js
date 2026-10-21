import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

// Dọn dẹp key localStorage cũ nếu còn tồn tại trong trình duyệt
try {
  localStorage.removeItem('avora_soft_deleted_refund_policies');
} catch {
  // ignore
}

/**
 * Fetch list of refund policies with optional filtering.
 * @param {{ search?: string, status?: string, hotel_id?: string, sort_by?: string }} params
 */
export const fetchRefundPolicies = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) {
    query.append('search', params.search);
  }
  if (params.status && params.status !== 'ALL') {
    query.append('status', params.status);
  }
  if (params.hotel_id && params.hotel_id !== 'ALL') {
    query.append('hotel_id', params.hotel_id);
  }
  if (params.sort_by) {
    query.append('sort_by', params.sort_by);
  }

  const queryString = query.toString();
  const url = `${API_ENDPOINTS.REFUND_POLICIES}${queryString ? `?${queryString}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách chính sách hoàn tiền.');
  }

  return json.data;
};

/**
 * Fetch hotels list for policy assignment.
 */
export const fetchRefundPolicyHotels = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.REFUND_POLICY_HOTELS);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách khách sạn.');
  }

  return json.data;
};

/**
 * Fetch single refund policy details by ID.
 * @param {string} id
 */
export const fetchRefundPolicyById = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.REFUND_POLICIES}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết chính sách hoàn tiền.');
  }

  return json.data;
};

/**
 * Create a new refund policy.
 * @param {object} payload
 */
export const createRefundPolicy = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.REFUND_POLICIES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo mới chính sách hoàn tiền.');
  }

  return json.data;
};

/**
 * Update an existing refund policy.
 * @param {string} id
 * @param {object} payload
 */
export const updateRefundPolicy = async (id, payload) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.REFUND_POLICIES}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật chính sách hoàn tiền.');
  }

  return json.data;
};

/**
 * Delete a refund policy by ID (Soft delete in DB).
 * @param {string} id
 */
export const deleteRefundPolicy = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.REFUND_POLICIES}/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể xóa chính sách hoàn tiền.');
  }

  return json.data;
};
