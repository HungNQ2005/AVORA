'use strict';

const supabase = require('../../config/supabaseClient');
const { searchHotels } = require('../hotels/hotel.service');

const ensureClient = () => {
  if (!supabase) {
    const error = new Error('Database client is not initialized.');
    error.statusCode = 503;
    throw error;
  }
};

/**
 * Get all hotels in the user's WatchList / Wishlist strictly from t_wishlist and m_hotel.
 * @param {string} userId - UUID of the user
 * @returns {Promise<{ hotels: Array, total: number }>}
 */
const getUserWishlist = async (userId) => {
  if (!userId) {
    return { hotels: [], total: 0 };
  }
  ensureClient();

  try {
    const { data: wishlistRecords, error } = await supabase
      .from('t_wishlist')
      .select('wishlist_id, user_id, hotel_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet in Supabase (PostgREST error 42P01), fail softly
      if (error.code === '42P01') {
        console.warn('[WatchList] Table avora.t_wishlist does not exist yet. Please execute create_wishlist_table.sql.');
        return { hotels: [], total: 0 };
      }
      throw error;
    }

    if (!wishlistRecords || wishlistRecords.length === 0) {
      return { hotels: [], total: 0 };
    }

    const hotelIds = wishlistRecords.map((r) => r.hotel_id).filter(Boolean);
    if (hotelIds.length === 0) {
      return { hotels: [], total: 0 };
    }

    // Fetch full, enriched hotel details from database
    const { hotels: dbHotels } = await searchHotels({ hotelIds });

    // Preserve the order of t_wishlist (most recently added first)
    const hotelMap = new Map();
    (dbHotels || []).forEach((h) => hotelMap.set(String(h.hotel_id), h));

    const sortedHotels = [];
    wishlistRecords.forEach((item) => {
      const match = hotelMap.get(String(item.hotel_id));
      if (match) {
        sortedHotels.push({
          ...match,
          wishlist_id: item.wishlist_id,
          saved_at: item.created_at,
        });
      }
    });

    return {
      hotels: sortedHotels,
      total: sortedHotels.length,
    };
  } catch (err) {
    console.error('[WatchList] Error fetching wishlist for user:', userId, err);
    throw err;
  }
};

/**
 * Add a hotel to user's WatchList / Wishlist in t_wishlist.
 * @param {string} userId - UUID of the user
 * @param {string} hotelId - UUID of the hotel
 */
const addToWishlist = async (userId, hotelId) => {
  if (!userId || !hotelId) {
    const error = new Error('Thiếu thông tin người dùng hoặc mã khách sạn.');
    error.statusCode = 400;
    throw error;
  }
  ensureClient();

  // 1. Verify hotel exists and is active in DB
  const { data: hotel, error: hotelErr } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, hotel_status, is_deleted')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (hotelErr) {
    const error = new Error(`Lỗi khi kiểm tra thông tin khách sạn: ${hotelErr.message}`);
    error.statusCode = 500;
    throw error;
  }

  if (!hotel || hotel.is_deleted) {
    const error = new Error('Khách sạn không tồn tại hoặc đã ngừng hoạt động.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check if already exists in t_wishlist
  const { data: existing, error: findErr } = await supabase
    .from('t_wishlist')
    .select('wishlist_id')
    .eq('user_id', userId)
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (findErr && findErr.code !== '42P01') {
    console.error('[WatchList] Error checking existing wishlist record:', findErr);
  }

  if (existing) {
    return {
      success: true,
      alreadyExists: true,
      message: `Khách sạn "${hotel.name}" đã có trong WatchList của bạn.`,
      wishlist_id: existing.wishlist_id,
    };
  }

  // 3. Insert into t_wishlist
  const { data: inserted, error: insertErr } = await supabase
    .from('t_wishlist')
    .insert({
      user_id: userId,
      hotel_id: hotelId,
    })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return {
        success: true,
        alreadyExists: true,
        message: `Khách sạn "${hotel.name}" đã có trong WatchList của bạn.`,
      };
    }
    const error = new Error(`Không thể lưu khách sạn vào WatchList: ${insertErr.message}`);
    error.statusCode = 500;
    throw error;
  }

  return {
    success: true,
    message: `Đã lưu "${hotel.name}" vào WatchList thành công.`,
    wishlist_id: inserted?.wishlist_id,
    hotel_id: hotelId,
  };
};

/**
 * Remove a hotel from user's WatchList / Wishlist in t_wishlist.
 * @param {string} userId - UUID of the user
 * @param {string} hotelId - UUID of the hotel
 */
const removeFromWishlist = async (userId, hotelId) => {
  if (!userId || !hotelId) {
    const error = new Error('Thiếu thông tin người dùng hoặc mã khách sạn.');
    error.statusCode = 400;
    throw error;
  }
  ensureClient();

  const { error } = await supabase
    .from('t_wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('hotel_id', hotelId);

  if (error && error.code !== '42P01') {
    const err = new Error(`Lỗi khi xóa khỏi WatchList: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }

  return {
    success: true,
    message: 'Đã xóa chỗ nghỉ khỏi WatchList thành công.',
    hotel_id: hotelId,
  };
};

/**
 * Check if a hotel is in user's WatchList in t_wishlist.
 * @param {string} userId - UUID of the user
 * @param {string} hotelId - UUID of the hotel
 * @returns {Promise<{ isSaved: boolean }>}
 */
const checkWishlistStatus = async (userId, hotelId) => {
  if (!userId || !hotelId) {
    return { isSaved: false };
  }
  ensureClient();

  const { data, error } = await supabase
    .from('t_wishlist')
    .select('wishlist_id')
    .eq('user_id', userId)
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (error) {
    return { isSaved: false };
  }

  return { isSaved: !!data };
};

module.exports = {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus,
};
