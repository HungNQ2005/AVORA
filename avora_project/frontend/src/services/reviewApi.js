import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

const requestReview = async (url, options = {}) => {
  const response = await authenticatedFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Không thể xử lý đánh giá.');
  }
  return result.data;
};

export const getBookingReview = (bookingId) => requestReview(API_ENDPOINTS.BOOKING_REVIEWS(bookingId));

export const getMyReviews = () => requestReview(API_ENDPOINTS.REVIEWS_MY);

export const createReview = (bookingId, payload) => requestReview(API_ENDPOINTS.BOOKING_REVIEWS(bookingId), {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const updateReview = (reviewId, payload) => requestReview(API_ENDPOINTS.REVIEW(reviewId), {
  method: 'PUT',
  body: JSON.stringify(payload),
});

export const deleteReview = (reviewId) => requestReview(API_ENDPOINTS.REVIEW(reviewId), {
  method: 'DELETE',
});