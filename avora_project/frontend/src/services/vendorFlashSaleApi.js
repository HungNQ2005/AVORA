import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch list of vendor flash sales with filters, hotel selection, and pagination.
 * @param {{ hotel_id?: string, status?: string, search?: string, page?: number, limit?: number }} params
 * @returns {Promise<{ flash_sales: Array, hotels: Array, stats: Object, pagination: Object }>}
 */
export const fetchVendorFlashSales = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.hotel_id && params.hotel_id !== 'ALL') {
    query.append('hotel_id', params.hotel_id);
  }
  if (params.status && params.status !== 'ALL') {
    query.append('status', params.status);
  }
  if (params.search && params.search.trim()) {
    query.append('search', params.search.trim());
  }
  if (params.page) {
    query.append('page', String(params.page));
  }
  if (params.limit) {
    query.append('limit', String(params.limit));
  }

  const url = `${API_ENDPOINTS.VENDOR_FLASH_SALES}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách Flash Sale.');
  }

  return json.data;
};

/**
 * Fetch single Flash Sale detail by coupon UUID (including recent booking usage history).
 * @param {string} id - coupon_id UUID
 * @returns {Promise<Object>}
 */
export const fetchVendorFlashSaleById = async (id) => {
  const url = API_ENDPOINTS.VENDOR_FLASH_SALE_DETAIL(id);
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết Flash Sale.');
  }

  return json.data;
};

/**
 * Create a new Hotel Flash Sale.
 * @param {{
 *   hotel_id: string,
 *   code_name: string,
 *   discount_type: 'FLASH_PERCENT' | 'FIXED_AMOUNT',
 *   discount_value: number,
 *   max_discount_amount?: number | null,
 *   min_order_amount?: number | null,
 *   usage_limit?: number | null,
 *   valid_from: string, // ISO string
 *   valid_to: string    // ISO string
 * }} payload
 * @returns {Promise<Object>}
 */
export const createVendorFlashSale = async (payload) => {
  const response = await authenticatedFetch(API_ENDPOINTS.VENDOR_FLASH_SALES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo chương trình Flash Sale.');
  }

  return json.data;
};

/**
 * Update an existing Hotel Flash Sale.
 * @param {string} id - coupon_id UUID
 * @param {{
 *   code_name?: string,
 *   discount_type?: 'FLASH_PERCENT' | 'FIXED_AMOUNT',
 *   discount_value?: number,
 *   max_discount_amount?: number | null,
 *   min_order_amount?: number | null,
 *   usage_limit?: number | null,
 *   valid_from?: string, // ISO string
 *   valid_to?: string    // ISO string
 * }} payload
 * @returns {Promise<Object>}
 */
export const updateVendorFlashSale = async (id, payload) => {
  const url = API_ENDPOINTS.VENDOR_FLASH_SALE_DETAIL(id);
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật chương trình Flash Sale.');
  }

  return json.data;
};

/**
 * Soft-delete / deactivate a Hotel Flash Sale.
 * @param {string} id - coupon_id UUID
 * @returns {Promise<Object>}
 */
export const deleteVendorFlashSale = async (id) => {
  const url = API_ENDPOINTS.VENDOR_FLASH_SALE_DETAIL(id);
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể vô hiệu hóa Flash Sale.');
  }

  return json.data;
};
