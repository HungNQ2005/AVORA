'use strict';

const supabase = require('../../config/supabaseClient');

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const isWithinEditWindow = (createdAt) => {
  const createdTime = Date.parse(createdAt);
  const age = Date.now() - createdTime;
  return Number.isFinite(createdTime) && age >= 0 && age <= EDIT_WINDOW_MS;
};

const getHotelReviewRows = async (hotelId) => {
  const { data: bookings, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, user_id')
    .eq('hotel_id', hotelId);

  if (bookingError) throw bookingError;
  if (!bookings?.length) return { bookings: [], reviews: [] };

  const { data: reviews, error: reviewError } = await supabase
    .from('t_review')
    .select('review_id, booking_id, rating_score, comment, created_at')
    .in('booking_id', bookings.map((booking) => booking.booking_id))
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false });

  if (reviewError) throw reviewError;
  return { bookings, reviews: reviews || [] };
};

const getHotelReviews = async (hotelId, viewerId = null) => {
  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_id, hotel_status, is_deleted, star_rating')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (hotelError) throw hotelError;
  if (!hotel || hotel.hotel_status !== 'ACTIVE' || hotel.is_deleted === true) {
    return { reviews: [], star_rating: hotel?.star_rating ?? null, reviews_count: 0 };
  }

  const { bookings, reviews } = await getHotelReviewRows(hotelId);
  if (!reviews.length) {
    return { reviews: [], star_rating: hotel.star_rating ?? null, reviews_count: 0 };
  }

  const bookingById = new Map(bookings.map((booking) => [booking.booking_id, booking]));
  const userIds = [...new Set(bookings.map((booking) => booking.user_id).filter(Boolean))];
  const { data: users, error: usersError } = userIds.length
    ? await supabase.from('m_user').select('user_id, full_name').in('user_id', userIds)
    : { data: [], error: null };
  if (usersError) throw usersError;

  const nameByUserId = new Map((users || []).map((user) => [user.user_id, user.full_name]));
  const shapedReviews = reviews.map((review) => {
    const booking = bookingById.get(review.booking_id);
    return {
      review_id: review.review_id,
      reviewer_name: nameByUserId.get(booking?.user_id) || 'Khách hàng Avora',
      rating_score: Number(review.rating_score),
      comment: review.comment,
      created_at: review.created_at,
      can_manage: Boolean(viewerId && booking?.user_id === viewerId && isWithinEditWindow(review.created_at)),
    };
  });
  const average = shapedReviews.reduce((total, review) => total + review.rating_score, 0) / shapedReviews.length;

  return {
    reviews: shapedReviews,
    star_rating: Number(average.toFixed(1)),
    reviews_count: shapedReviews.length,
  };
};

const refreshHotelRating = async (hotelId) => {
  const { bookings, reviews } = await getHotelReviewRows(hotelId);
  const average = reviews.length
    ? Number((reviews.reduce((total, review) => total + Number(review.rating_score), 0) / reviews.length).toFixed(1))
    : null;

  const { error } = await supabase
    .from('m_hotel')
    .update({ star_rating: average, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId);
  if (error) throw error;

  return { star_rating: average, reviews_count: reviews.length };
};

const createReview = async (userId, bookingId, payload) => {
  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id')
    .eq('booking_id', bookingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đặt phòng thuộc tài khoản của bạn.');

  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_id, hotel_status, is_deleted')
    .eq('hotel_id', booking.hotel_id)
    .maybeSingle();
  if (hotelError) throw hotelError;
  if (!hotel || hotel.hotel_status !== 'ACTIVE' || hotel.is_deleted === true) {
    throw httpError(403, 'Chỉ có thể đánh giá khách sạn đang hoạt động.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('t_review')
    .select('review_id')
    .eq('booking_id', bookingId)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw httpError(409, 'Đặt phòng này đã có đánh giá.');

  const { data: review, error } = await supabase
    .from('t_review')
    .insert({
      booking_id: bookingId,
      rating_score: payload.rating_score,
      comment: payload.comment ?? null,
      is_deleted: false,
    })
    .select('review_id')
    .single();
  if (error) throw error;

  const rating = await refreshHotelRating(booking.hotel_id);
  const result = await getHotelReviews(booking.hotel_id, userId);
  return { review: result.reviews.find((item) => item.review_id === review.review_id), ...rating };
};

const getOwnedReview = async (userId, reviewId) => {
  const { data: review, error: reviewError } = await supabase
    .from('t_review')
    .select('review_id, booking_id, created_at, is_deleted')
    .eq('review_id', reviewId)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (!review || review.is_deleted === true) throw httpError(404, 'Không tìm thấy đánh giá.');

  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id')
    .eq('booking_id', review.booking_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đánh giá thuộc tài khoản của bạn.');
  if (!isWithinEditWindow(review.created_at)) {
    throw httpError(403, 'Bạn chỉ có thể chỉnh sửa hoặc xóa đánh giá trong vòng 30 ngày.');
  }
  return { review, booking };
};

const updateReview = async (userId, reviewId, payload) => {
  const { booking } = await getOwnedReview(userId, reviewId);
  const updates = { ...payload, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('t_review')
    .update(updates)
    .eq('review_id', reviewId)
    .or('is_deleted.is.null,is_deleted.eq.false');
  if (error) throw error;

  const rating = await refreshHotelRating(booking.hotel_id);
  const result = await getHotelReviews(booking.hotel_id, userId);
  return { review: result.reviews.find((item) => item.review_id === reviewId), ...rating };
};

const deleteReview = async (userId, reviewId) => {
  const { booking } = await getOwnedReview(userId, reviewId);
  const { error } = await supabase
    .from('t_review')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('review_id', reviewId)
    .or('is_deleted.is.null,is_deleted.eq.false');
  if (error) throw error;

  const rating = await refreshHotelRating(booking.hotel_id);
  return rating;
};

module.exports = { getHotelReviews, createReview, updateReview, deleteReview };