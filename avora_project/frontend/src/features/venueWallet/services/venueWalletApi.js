import { authenticatedFetch } from '../../../services/authenticatedFetch';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const parseResponse = async (response, fallbackMessage) => {
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.status === 'error') {
    throw new Error(json?.message || fallbackMessage);
  }

  return json.data;
};

/**
 * Fetch hotels owned by the current vendor.
 */
export const fetchVenueHotels = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.WALLET_HOTELS);
  const data = await parseResponse(response, 'Không thể tải danh sách chỗ nghỉ.');
  return Array.isArray(data) ? data : [];
};

/**
 * Fetch venue wallet details: real-time balances, 2-tab transactions (Tiền Vào, Tiền Ra),
 * notes, policy computations, and summary statistics.
 * @param {string} hotelId
 * @param {{ search?: string, tab?: string, from?: string, to?: string }} [params]
 * @param {AbortSignal} [signal]
 */
export const fetchVenueWallet = async (hotelId, params = {}, signal) => {
  if (!hotelId) return null;

  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search.trim());
  if (params.tab && params.tab !== 'all') query.set('tab', params.tab);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const url = `${API_BASE_URL}/api/venue-wallet/hotels/${hotelId}${qs}`;

  const response = await authenticatedFetch(url, { signal });
  const data = await parseResponse(response, 'Không thể tải dữ liệu ví doanh thu chỗ nghỉ.');
  return { data };
};

export const getVenueWallet = fetchVenueWallet;
