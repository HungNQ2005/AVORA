/**
 * Helper utility for managing saved/favorited hotels in persistent client storage
 * and dispatching reactive sync events across the application.
 * All hotel data is sourced strictly from the database.
 */

const FAVORITES_KEY = 'avora_user_favorites';

/**
 * Get all saved favorite hotels from localStorage.
 * Returns an array of saved hotel IDs or database hotel objects.
 */
export const getSavedFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading favorites from localStorage:', e);
    return [];
  }
};

/**
 * Check if a hotel is in the saved list by ID.
 * @param {string|number} hotelId
 * @returns {boolean}
 */
export const isHotelSaved = (hotelId) => {
  if (!hotelId) return false;
  const list = getSavedFavorites();
  return list.some((item) => {
    const id = typeof item === 'object' && item !== null ? (item.hotel_id || item.id) : item;
    return String(id) === String(hotelId);
  });
};

/**
 * Normalize and sanitize hotel object strictly to real database attributes (m_hotel, m_city, etc.)
 */
const sanitizeDbHotel = (hotel) => {
  if (!hotel || typeof hotel !== 'object') return hotel;
  const hotelId = hotel.hotel_id || hotel.id;
  if (!hotelId) return hotel;

  return {
    hotel_id: String(hotelId),
    name: hotel.name || 'Chỗ nghỉ Avora',
    address: hotel.address || '',
    city_name: hotel.city_name || hotel.city || '',
    city_id: hotel.city_id || '',
    star_quality: Math.max(1, Math.min(5, Number(hotel.star_quality || hotel.star_rating || 4))),
    star_rating: hotel.star_rating !== undefined && hotel.star_rating !== null ? Number(hotel.star_rating) : undefined,
    reviews_count: Number(hotel.reviews_count || hotel.review_count || 0),
    score_label: hotel.score_label || '',
    price: Number(hotel.price || 0),
    original_price: hotel.original_price ? Number(hotel.original_price) : undefined,
    thumbnail: hotel.thumbnail || (Array.isArray(hotel.images) ? hotel.images[0] : '') || '',
    images: Array.isArray(hotel.images) ? hotel.images : [],
    facilities: Array.isArray(hotel.facilities) ? hotel.facilities : [],
    room_highlight: hotel.room_highlight || null,
    cancellation_policy: hotel.cancellation_policy || null,
    available_rooms: hotel.available_rooms !== undefined ? Number(hotel.available_rooms) : undefined,
    saved_at: hotel.saved_at || new Date().toISOString(),
  };
};

/**
 * Save a hotel to favorites / WatchList.
 * Accepts real database hotel object or hotel ID.
 * @param {Object|string|number} hotel
 * @returns {Array} Updated list of favorites
 */
export const saveFavoriteHotel = (hotel) => {
  if (!hotel) return [];
  const list = getSavedFavorites();
  const hotelId = typeof hotel === 'object' && hotel !== null ? (hotel.hotel_id || hotel.id) : hotel;
  const itemToStore = typeof hotel === 'object' && hotel !== null ? sanitizeDbHotel(hotel) : hotelId;

  const existingIdx = list.findIndex((item) => {
    const id = typeof item === 'object' && item !== null ? (item.hotel_id || item.id) : item;
    return String(id) === String(hotelId);
  });

  let nextList;
  if (existingIdx >= 0) {
    if (typeof itemToStore === 'object' && itemToStore !== null) {
      nextList = [...list];
      nextList[existingIdx] = { ...list[existingIdx], ...itemToStore };
    } else {
      nextList = list;
    }
  } else {
    nextList = [itemToStore, ...list];
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new Event('avora_favorites_updated'));
    window.dispatchEvent(new Event('avora_watchlist_updated'));
  } catch (e) {
    console.error('Error saving favorite to localStorage:', e);
  }
  return nextList;
};

/**
 * Remove a hotel from favorites by ID.
 * @param {string|number} hotelId
 * @returns {Array} Updated list of favorites
 */
export const removeFavoriteHotel = (hotelId) => {
  if (!hotelId) return [];
  const list = getSavedFavorites();
  const nextList = list.filter((item) => {
    const id = typeof item === 'object' && item !== null ? (item.hotel_id || item.id) : item;
    return String(id) !== String(hotelId);
  });

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new Event('avora_favorites_updated'));
    window.dispatchEvent(new Event('avora_watchlist_updated'));
  } catch (e) {
    console.error('Error removing favorite from localStorage:', e);
  }
  return nextList;
};

/**
 * Toggle favorite status for a hotel.
 * @param {Object|string|number} hotel
 * @returns {boolean} true if now saved, false if removed
 */
export const toggleFavoriteHotel = (hotel) => {
  const hotelId = typeof hotel === 'object' && hotel !== null ? (hotel.hotel_id || hotel.id) : hotel;
  if (isHotelSaved(hotelId)) {
    removeFavoriteHotel(hotelId);
    return false;
  } else {
    saveFavoriteHotel(hotel);
    return true;
  }
};
