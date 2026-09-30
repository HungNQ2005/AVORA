import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch paginated list of users with search, role, status filters.
 */
export const fetchUsers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.role && params.role !== 'ALL') query.append('role', params.role);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.hotel_id && params.hotel_id !== 'ALL') query.append('hotel_id', params.hotel_id);

  const url = `${API_ENDPOINTS.USERS}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách người dùng.');
  }

  return json.data;
};

/**
 * Fetch user statistics for KPI cards & role counts.
 */
export const fetchUserStats = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.USER_STATS);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thống kê người dùng.');
  }

  return json.data;
};

/**
 * Update user status (ACTIVE, DEACTIVATED, VERIFYING).
 */
export const updateUserStatus = async (userId, status) => {
  const response = await authenticatedFetch(`${API_ENDPOINTS.USERS}/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật trạng thái người dùng.');
  }

  return json.data;
};
