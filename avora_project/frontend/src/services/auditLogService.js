import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Audit Log API Service
 * Handles fetching paginated audit records and detailed audit entry diffs.
 */

/**
 * Fetch paginated list of audit logs with search and filtering options.
 *
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Current page number
 * @param {number} [params.limit=10] - Items per page
 * @param {string} [params.search] - Search keyword (actor name, email, or entity ID)
 * @param {string} [params.action_cd] - Filter by AUDIT_ACTION (INS, UPD, DEL, LGN or numeric)
 * @param {string} [params.entity_name] - Target entity name (e.g. m_user, m_hotel, etc.)
 * @param {string} [params.actor_id] - Specific actor UUID
 * @param {string} [params.ip_address] - Filter by client IP address
 * @param {string} [params.start_date] - Start date (YYYY-MM-DD)
 * @param {string} [params.end_date] - End date (YYYY-MM-DD)
 * @returns {Promise<{ items: Array, pagination: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export const fetchAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();

  if (params.page !== undefined && params.page !== null) {
    query.append('page', String(params.page));
  }
  if (params.limit !== undefined && params.limit !== null) {
    query.append('limit', String(params.limit));
  }
  if (params.search && params.search.trim()) {
    query.append('search', params.search.trim());
  }
  if (params.action_cd && params.action_cd !== 'ALL') {
    query.append('action_cd', params.action_cd);
  }
  if (params.entity_name && params.entity_name !== 'ALL' && params.entity_name.trim()) {
    query.append('entity_name', params.entity_name.trim());
  }
  if (params.actor_id && params.actor_id.trim()) {
    query.append('actor_id', params.actor_id.trim());
  }
  if (params.ip_address && params.ip_address.trim()) {
    query.append('ip_address', params.ip_address.trim());
  }
  if (params.start_date) {
    query.append('start_date', params.start_date);
  }
  if (params.end_date) {
    query.append('end_date', params.end_date);
  }

  const queryString = query.toString();
  const url = `${API_ENDPOINTS.AUDIT_LOGS}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await authenticatedFetch(url);
    const json = await response.json();

    if (!response.ok || json.status === 'error') {
      const msg = json.message || 'Không thể tải danh sách nhật ký kiểm toán.';
      throw new Error(msg);
    }

    return json.data || { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền.');
    }
    throw error;
  }
};

/**
 * Fetch detailed audit log record including pre-calculated diff.
 *
 * @param {string} id - UUID of the audit log record
 * @returns {Promise<Object>} Detailed log entry with old_data, new_data, and diff
 */
export const fetchAuditLogById = async (id) => {
  if (!id) {
    throw new Error('Mã nhật ký kiểm toán không hợp lệ.');
  }

  const url = API_ENDPOINTS.AUDIT_LOG_DETAIL(id);

  try {
    const response = await authenticatedFetch(url);
    const json = await response.json();

    if (!response.ok || json.status === 'error') {
      const msg = json.message || 'Không thể tải chi tiết nhật ký kiểm toán.';
      throw new Error(msg);
    }

    return json.data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền.');
    }
    throw error;
  }
};
