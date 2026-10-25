import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Fetch all hotels in the user's wishlist from database (t_wishlist)
 * @returns {Promise<{ hotels: Array, total: number }>}
 */
export const fetchWishlist = async () => {
  const token = localStorage.getItem('avora_token');
  if (!token) {
    return { hotels: [], total: 0 };
  }

  const response = await authenticatedFetch(API_ENDPOINTS.WISHLIST);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách yêu thích từ máy chủ.');
  }

  return json.data || { hotels: [], total: 0 };
};

/**
 * Add a hotel to user's wishlist in database (t_wishlist)
 * @param {string} hotelId
 */
export const addToWishlistApi = async (hotelId) => {
  const token = localStorage.getItem('avora_token');
  if (!token) return null;

  const response = await authenticatedFetch(API_ENDPOINTS.WISHLIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotel_id: hotelId }),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể lưu vào danh sách yêu thích.');
  }

  return json.data;
};

/**
 * Remove a hotel from user's wishlist in database (t_wishlist)
 * @param {string} hotelId
 */
export const removeFromWishlistApi = async (hotelId) => {
  const token = localStorage.getItem('avora_token');
  if (!token) return null;

  const response = await authenticatedFetch(
    `${API_ENDPOINTS.WISHLIST}/${encodeURIComponent(hotelId)}`,
    {
      method: 'DELETE',
    }
  );
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể xóa khỏi danh sách yêu thích.');
  }

  return json.data;
};

/**
 * Check if a hotel is in user's wishlist in database (t_wishlist)
 * @param {string} hotelId
 */
export const checkWishlistStatusApi = async (hotelId) => {
  const token = localStorage.getItem('avora_token');
  if (!token) return false;

  try {
    const response = await authenticatedFetch(API_ENDPOINTS.WISHLIST_CHECK(hotelId));
    const json = await response.json();
    return Boolean(json.data?.isSaved);
  } catch {
    return false;
  }
};
