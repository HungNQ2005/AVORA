import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

const SOFT_DELETED_KEY = 'avora_soft_deleted_commission_policies';

export const getSoftDeletedCommissionPolicyIds = () => {
  try {
    const raw = localStorage.getItem(SOFT_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addSoftDeletedCommissionPolicyId = (id) => {
  try {
    const list = getSoftDeletedCommissionPolicyIds();
    const strId = String(id).trim();
    if (!list.includes(strId)) {
      list.push(strId);
      localStorage.setItem(SOFT_DELETED_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Lỗi khi lưu id hoa hồng xóa mềm vào localStorage:', err);
  }
};

export const restoreCommissionPolicy = (id) => {
  try {
    const list = getSoftDeletedCommissionPolicyIds();
    const strId = String(id).trim();
    const updated = list.filter((item) => item !== strId);
    localStorage.setItem(SOFT_DELETED_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Lỗi khi khôi phục chính sách hoa hồng:', err);
  }
};

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

  const softDeletedIds = getSoftDeletedCommissionPolicyIds();
  const rawPolicies = Array.isArray(json.data?.policies)
    ? json.data.policies
    : Array.isArray(json.data)
    ? json.data
    : [];

  const filteredPolicies = rawPolicies.filter((p) => {
    const pId = String(p.policy_id || '').trim();
    return !softDeletedIds.includes(pId) && p.is_active !== false;
  });

  const total = filteredPolicies.length;
  const activeCount = filteredPolicies.filter((p) => (p.status ? p.status === 'ACTIVE' : p.is_active !== false)).length;
  const upcomingCount = filteredPolicies.filter((p) => p.status === 'UPCOMING').length;
  const expiredCount = filteredPolicies.filter((p) => p.status === 'EXPIRED').length;
  const sumRate = filteredPolicies.reduce((acc, p) => acc + (Number(p.commission_rate) || 0), 0);
  const avgRate = total > 0 ? Math.round((sumRate / total) * 10) / 10 : 0;

  const updatedStats = json.data?.stats
    ? {
        ...json.data.stats,
        total_policies: total,
        active_policies: activeCount,
        upcoming_policies: upcomingCount,
        expired_policies: expiredCount,
        avg_commission_rate: avgRate,
      }
    : null;

  if (Array.isArray(json.data)) {
    return filteredPolicies;
  }

  return {
    ...json.data,
    policies: filteredPolicies,
    stats: updatedStats,
  };
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
  const softDeletedIds = getSoftDeletedCommissionPolicyIds();
  if (softDeletedIds.includes(String(id).trim())) {
    throw new Error('Chính sách phí hoa hồng không tồn tại hoặc đã bị gỡ bỏ.');
  }

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
  addSoftDeletedCommissionPolicyId(id);
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
  return json.data || { success: true, policy_id: id };
};
