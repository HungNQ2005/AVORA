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
 * Save a hotel to favorites.
 * Accepts real database hotel object or hotel ID.
 * @param {Object|string|number} hotel
 * @returns {Array} Updated list of favorites
 */
export const saveFavoriteHotel = (hotel) => {
  if (!hotel) return [];
  const list = getSavedFavorites();
  const hotelId = typeof hotel === 'object' && hotel !== null ? (hotel.hotel_id || hotel.id) : hotel;

  const existingIdx = list.findIndex((item) => {
    const id = typeof item === 'object' && item !== null ? (item.hotel_id || item.id) : item;
    return String(id) === String(hotelId);
  });

  let nextList;
  if (existingIdx >= 0) {
    if (typeof hotel === 'object' && hotel !== null) {
      nextList = [...list];
      nextList[existingIdx] = { ...list[existingIdx], ...hotel };
    } else {
      nextList = list;
    }
  } else {
    nextList = [hotel, ...list];
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextList));
    window.dispatchEvent(new Event('avora_favorites_updated'));
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
