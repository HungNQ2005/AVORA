import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

const parseResponse = async (response, fallbackMessage) => {
  let json = null;
  try {
    json = await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !json || json.status === 'error') {
    const errorMsg = json?.message || fallbackMessage;
    const error = new Error(errorMsg);
    error.statusCode = response.status;
    error.response = { data: json };
    throw error;
  }

  return json.data;
};

/**
 * Lấy danh mục ngân hàng từ m_system_code (business_cd = 'BANK_CD') dành cho Admin
 */
export const fetchSystemBanks = async () => {
  const url = `${API_ENDPOINTS.HOTEL_BANK_REQUESTS}/banks`;
  const response = await authenticatedFetch(url);
  return parseResponse(response, 'Không thể tải danh mục ngân hàng từ hệ thống.');
};

/**
 * Lấy danh sách yêu cầu đổi tài khoản ngân hàng của khách sạn
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.q]
 * @param {string} [params.status='RSV']
 */
export const fetchHotelBankRequests = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.q && params.q.trim()) query.append('q', params.q.trim());
  if (params.status) query.append('status', params.status);

  const url = `${API_ENDPOINTS.HOTEL_BANK_REQUESTS}?${query.toString()}`;
  const response = await authenticatedFetch(url);
  return parseResponse(response, 'Không thể tải danh sách yêu cầu đổi tài khoản ngân hàng.');
};

/**
 * Lấy chi tiết một yêu cầu đổi tài khoản ngân hàng
 * @param {string} ticketId
 */
export const fetchHotelBankRequestDetail = async (ticketId) => {
  const url = API_ENDPOINTS.HOTEL_BANK_REQUEST_DETAIL(ticketId);
  const response = await authenticatedFetch(url);
  return parseResponse(response, 'Không thể tải chi tiết yêu cầu đổi tài khoản ngân hàng.');
};

/**
 * Admin xác nhận và thực thi đổi tài khoản ngân hàng cho khách sạn
 * @param {string} ticketId
 * @param {Object} payload
 * @param {string} payload.bank_cd
 * @param {string} payload.account_number
 * @param {string} payload.account_holder
 * @param {boolean} payload.confirmed_with_hotel
 */
export const applyHotelBankChange = async (ticketId, payload) => {
  const url = API_ENDPOINTS.HOTEL_BANK_REQUEST_APPLY(ticketId);
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, 'Không thể thực thi đổi tài khoản ngân hàng.');
};
