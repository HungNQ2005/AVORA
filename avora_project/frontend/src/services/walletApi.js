import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

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
 * Fetch supported banks list.
 */
export const fetchWalletBanks = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.WALLET_BANKS);
  const data = await parseResponse(response, 'Không thể tải danh sách ngân hàng.');
  return Array.isArray(data) ? data : [];
};

/**
 * Fetch hotels owned by this vendor.
 */
export const fetchWalletHotels = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.WALLET_HOTELS);
  const data = await parseResponse(response, 'Không thể tải danh sách khách sạn.');
  return Array.isArray(data) ? data : [];
};

/**
 * Fetch wallet & linked bank account for one hotel.
 * @param {string} hotelId
 * @param {AbortSignal} [signal]
 */
export const fetchHotelWallet = async (hotelId, signal) => {
  const response = await authenticatedFetch(API_ENDPOINTS.WALLET_HOTEL(hotelId), { signal });
  return parseResponse(response, 'Không thể tải thông tin ví khách sạn.');
};

/**
 * Link a single bank account to the hotel's wallet.
 * @param {string} hotelId
 * @param {{ bank_cd: string, bin_code?: string, account_number: string, account_holder: string, bank_branch?: string }} payload
 */
export const linkHotelBankAccount = async (hotelId, payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.WALLET_LINK_BANK(hotelId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, 'Không thể liên kết tài khoản ngân hàng.');
};

