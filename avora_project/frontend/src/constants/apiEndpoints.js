/**
 * Central registry for all API endpoint paths.
 * Base URL is driven by the VITE_API_BASE_URL environment variable.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  SYSTEM_CODES: `${API_BASE_URL}/api/system-codes`,
  HEALTH: `${API_BASE_URL}/api/health`,
  HOTELS: `${API_BASE_URL}/api/hotels`,
  HOTEL_DETAIL: (id) => `${API_BASE_URL}/api/hotels/${id}`,
  HOTEL_REVIEWS: (id) => `${API_BASE_URL}/api/reviews/hotels/${id}`,
  BOOKING_REVIEWS: (bookingId) => `${API_BASE_URL}/api/reviews/bookings/${bookingId}`,
  REVIEW: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
  ROOM_TYPES: `${API_BASE_URL}/api/room-types`,
  ROOM_TYPES_HOTELS: `${API_BASE_URL}/api/room-types/hotels`,
  FACILITIES: `${API_BASE_URL}/api/facilities`,
  AMENITIES: `${API_BASE_URL}/api/amenities`,
  COUPONS: `${API_BASE_URL}/api/coupons`,
  USERS: `${API_BASE_URL}/api/users`,
  USER_STATS: `${API_BASE_URL}/api/users/stats`,
  ROOMS: `${API_BASE_URL}/api/rooms`,
  ROOMS_HOTELS: `${API_BASE_URL}/api/rooms/hotels`,
  ROOMS_ROOM_TYPES: `${API_BASE_URL}/api/rooms/room-types`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  BOOKINGS_MY: `${API_BASE_URL}/api/bookings/my`,
  BOOKING_CALCULATE: `${API_BASE_URL}/api/bookings/calculate`,
  BOOKING_DETAIL: (id) => `${API_BASE_URL}/api/bookings/${id}`,
  BOOKING_VOUCHER: (id) => `${API_BASE_URL}/api/bookings/${id}/voucher`,
  BOOKING_INVOICE: (id) => `${API_BASE_URL}/api/bookings/${id}/invoice`,
  BOOKING_CANCEL: (id) => `${API_BASE_URL}/api/bookings/${id}/cancel`,
  BOOKING_DATES: (id) => `${API_BASE_URL}/api/bookings/${id}/dates`,
};

