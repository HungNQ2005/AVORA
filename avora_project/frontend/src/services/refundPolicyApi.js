import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

const SOFT_DELETED_KEY = 'avora_soft_deleted_refund_policies';

export const getSoftDeletedRefundPolicyIds = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addSoftDeletedRefundPolicyId = (id) => {
  try {
    const list = getSoftDeletedRefundPolicyIds();
    const strId = String(id).trim();
    if (!list.includes(strId)) {
      list.push(strId);
      localStorage.setItem(SOFT_DELETED_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Lỗi khi lưu id chính sách hoàn tiền xóa mềm vào localStorage:', err);
  }
};

export const restoreRefundPolicy = (id) => {
  try {
    const list = getSoftDeletedRefundPolicyIds();
    const strId = String(id).trim();
    const updated = list.filter((item) => item !== strId);
    localStorage.setItem(SOFT_DELETED_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Lỗi khi khôi phục chính sách hoàn tiền:', err);
  }
};

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

  const softDeletedIds = getSoftDeletedRefundPolicyIds();
  const list = Array.isArray(json.data) ? json.data : [];
  return list.filter((p) => {
    const pId = String(p.policy_id || p.cancellation_policy_id || '').trim();
    return !softDeletedIds.includes(pId);
  });
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
  const softDeletedIds = getSoftDeletedRefundPolicyIds();
  if (softDeletedIds.includes(String(id).trim())) {
    throw new Error('Chính sách hoàn tiền không tồn tại hoặc đã bị xóa.');
  }

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
 * Delete a refund policy by ID.
 * @param {string} id
 */
export const deleteRefundPolicy = async (id) => {
  // CHẮP VÁ: Xóa mềm phía FE bằng localStorage, không gọi xóa cứng xuống DB.
  addSoftDeletedRefundPolicyId(id);
  return { success: true, policy_id: id, message: 'Đã xóa chính sách hoàn tiền thành công.' };
};
