'use strict';

const supabase = require('../../config/supabaseClient');
const { sendMail } = require('../../common/services/email/email.service');

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const isConfirmedBooking = (statusCode) => ['2', 'CFM'].includes(String(statusCode ?? '').trim().toUpperCase());
const REVIEW_DELETION_REASONS = {
  VIOLENCE: 'Nội dung có yếu tố bạo lực',
  DEFAMATION: 'Nội dung phỉ báng hoặc không chính xác',
  SEXUAL_CONTENT: 'Nội dung không phù hợp hoặc gợi dục',
  POLITICAL_CONTENT: 'Nội dung chính trị không cần thiết',
};

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const isWithinEditWindow = (createdAt) => {
  const createdTime = Date.parse(createdAt);
  const age = Date.now() - createdTime;
  return Number.isFinite(createdTime) && age >= 0 && age <= EDIT_WINDOW_MS;
};

const selectRowsByIds = async (table, columns, key, ids) => {
  const rows = [];
  const batchSize = 500;
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(key, ids.slice(offset, offset + batchSize));
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
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

const getMyReviews = async (userId) => {
  const { data: bookings, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id')
    .eq('user_id', userId);
  if (bookingError) throw bookingError;
  if (!bookings?.length) return [];

  const bookingById = new Map(bookings.map((booking) => [booking.booking_id, booking]));
  const hotelIds = [...new Set(bookings.map((booking) => booking.hotel_id).filter(Boolean))];
  const [{ data: reviews, error: reviewError }, { data: hotels, error: hotelError }] = await Promise.all([
    supabase
      .from('t_review')
      .select('review_id, booking_id, rating_score, comment, created_at')
      .in('booking_id', bookings.map((booking) => booking.booking_id))
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false }),
    supabase
      .from('m_hotel')
      .select('hotel_id, name, address')
      .in('hotel_id', hotelIds)
      .eq('hotel_status', 'ACTIVE')
      .or('is_deleted.is.null,is_deleted.eq.false'),
  ]);
  if (reviewError) throw reviewError;
  if (hotelError) throw hotelError;
  if (!reviews?.length || !hotels?.length) return [];

  const hotelById = new Map(hotels.map((hotel) => [hotel.hotel_id, hotel]));
  const visibleReviews = reviews.filter((review) => hotelById.has(bookingById.get(review.booking_id)?.hotel_id));
  const visibleHotelIds = [...new Set(visibleReviews.map((review) => bookingById.get(review.booking_id)?.hotel_id).filter(Boolean))];
  const { data: images, error: imageError } = visibleHotelIds.length
    ? await supabase
      .from('m_hotel_image')
      .select('hotel_id, image_url, is_thumbnail, sort_order')
      .in('hotel_id', visibleHotelIds)
      .order('sort_order', { ascending: true })
    : { data: [], error: null };
  if (imageError) throw imageError;

  const thumbnailByHotel = new Map();
  (images || []).forEach((image) => {
    if (!thumbnailByHotel.has(image.hotel_id) || image.is_thumbnail) {
      thumbnailByHotel.set(image.hotel_id, image.image_url);
    }
  });

  return visibleReviews.map((review) => {
    const hotelId = bookingById.get(review.booking_id).hotel_id;
    const hotel = hotelById.get(hotelId);
    return {
      review_id: review.review_id,
      hotel_id: hotel.hotel_id,
      hotel_name: hotel.name,
      hotel_address: hotel.address,
      hotel_thumbnail: thumbnailByHotel.get(hotelId) || null,
      rating_score: Number(review.rating_score),
      comment: review.comment || '',
      created_at: review.created_at,
    };
  });
};

const getAdminReviews = async () => {
  const reviews = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from('t_review')
      .select('review_id, booking_id, rating_score, comment, is_deleted, created_at, updated_at')
      .order('created_at', { ascending: false })
      .order('review_id', { ascending: true })
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    reviews.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }
  if (!reviews.length) return [];

  const reviewIds = reviews.map((review) => review.review_id);
  const auditRows = [];
  for (let offset = 0; offset < reviewIds.length; offset += 500) {
    const { data, error } = await supabase
      .from('h_system_audit_log')
      .select('entity_id, new_data, created_at')
      .eq('entity_name', 't_review')
      .eq('action_cd', '3')
      .in('entity_id', reviewIds.slice(offset, offset + 500))
      .order('created_at', { ascending: false });
    if (error) throw error;
    auditRows.push(...(data || []));
  }
  const deletionAuditByReview = new Map();
  auditRows.forEach((audit) => {
    if (!deletionAuditByReview.has(audit.entity_id)) deletionAuditByReview.set(audit.entity_id, audit);
  });

  const bookingIds = [...new Set(reviews.map((review) => review.booking_id).filter(Boolean))];
  const bookings = await selectRowsByIds('t_booking', 'booking_id, hotel_id, user_id, guest_name', 'booking_id', bookingIds);

  const bookingById = new Map(bookings.map((booking) => [booking.booking_id, booking]));
  const hotelIds = [...new Set(bookings.map((booking) => booking.hotel_id).filter(Boolean))];
  const userIds = [...new Set(bookings.map((booking) => booking.user_id).filter(Boolean))];
  const [hotels, users] = await Promise.all([
    selectRowsByIds('m_hotel', 'hotel_id, name, hotel_status, is_deleted', 'hotel_id', hotelIds),
    selectRowsByIds('m_user', 'user_id, full_name', 'user_id', userIds),
  ]);

  const hotelById = new Map(hotels.map((hotel) => [hotel.hotel_id, hotel]));
  const userById = new Map(users.map((user) => [user.user_id, user]));
  return reviews.map((review) => {
    const booking = bookingById.get(review.booking_id);
    const hotel = hotelById.get(booking?.hotel_id);
    const author = userById.get(booking?.user_id);
    const deletionAudit = deletionAuditByReview.get(review.review_id);
    return {
      review_id: review.review_id,
      hotel_id: hotel?.hotel_id || booking?.hotel_id || null,
      hotel_name: hotel?.name || 'Khách sạn không còn tồn tại',
      hotel_status: hotel?.hotel_status || 'UNKNOWN',
      hotel_is_deleted: Boolean(hotel?.is_deleted),
      author_name: author?.full_name || booking?.guest_name || 'Khách không xác định',
      rating_score: Number(review.rating_score),
      comment: review.comment || '',
      is_deleted: Boolean(review.is_deleted),
      deletion_reason: deletionAudit?.new_data?.deletion_reason || null,
      deletion_reason_code: deletionAudit?.new_data?.deletion_reason_code || null,
      created_at: review.created_at,
      updated_at: review.updated_at,
    };
  });
};

const getMyReviewRemovalNotifications = async (userId) => {
  const { data: auditRows, error } = await supabase
    .from('h_system_audit_log')
    .select('log_id, entity_id, old_data, new_data, created_at')
    .eq('entity_name', 't_review')
    .eq('action_cd', '3')
    .contains('new_data', { author_user_id: userId })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  return (auditRows || []).map((audit) => ({
    notification_id: audit.log_id,
    type: 'REVIEW_REMOVED',
    review_id: audit.entity_id,
    hotel_id: audit.new_data?.hotel_id || null,
    hotel_name: audit.new_data?.hotel_name || 'Khách sạn',
    rating_score: audit.old_data?.rating_score ?? null,
    comment: audit.old_data?.comment || '',
    reason: audit.new_data?.deletion_reason || 'Đánh giá không còn hiển thị.',
    created_at: audit.new_data?.deleted_at || audit.created_at,
  }));
};

const refreshHotelRating = async (hotelId) => {
  const { bookings, reviews } = await getHotelReviewRows(hotelId);
  const average = reviews.length
    ? Number((reviews.reduce((total, review) => total + Number(review.rating_score), 0) / reviews.length).toFixed(1))
    : null;
  const storedAverage = average === null ? null : Math.min(average, 9.9);

  const { error } = await supabase
    .from('m_hotel')
    .update({ star_rating: storedAverage, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId);
  if (error) throw error;

  return { star_rating: average, reviews_count: reviews.length };
};

const createReview = async (userId, bookingId, payload) => {
  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id, booking_status_cd')
    .eq('booking_id', bookingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đặt phòng thuộc tài khoản của bạn.');
  if (!isConfirmedBooking(booking.booking_status_cd)) {
    throw httpError(403, 'Chỉ có thể đánh giá đặt phòng đã xác nhận.');
  }

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

const getBookingReview = async (userId, bookingId) => {
  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id, booking_status_cd')
    .eq('booking_id', bookingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đặt phòng thuộc tài khoản của bạn.');

  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_status, is_deleted')
    .eq('hotel_id', booking.hotel_id)
    .maybeSingle();
  if (hotelError) throw hotelError;
  if (!hotel || hotel.hotel_status !== 'ACTIVE' || hotel.is_deleted === true) {
    return { review: null, can_create: false, unavailable: true };
  }
  if (!isConfirmedBooking(booking.booking_status_cd)) {
    return { review: null, can_create: false, unavailable: false };
  }

  const { data: review, error: reviewError } = await supabase
    .from('t_review')
    .select('review_id, rating_score, comment, created_at')
    .eq('booking_id', bookingId)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reviewError) throw reviewError;

  if (!review) return { review: null, can_create: true, unavailable: false };
  return {
    review: {
      review_id: review.review_id,
      rating_score: Number(review.rating_score),
      comment: review.comment || '',
      created_at: review.created_at,
      can_edit: isWithinEditWindow(review.created_at),
    },
    can_create: false,
    unavailable: false,
  };
};

const getOwnedReview = async (userId, reviewId) => {
  const { data: review, error: reviewError } = await supabase
    .from('t_review')
    .select('review_id, booking_id, rating_score, comment, created_at, updated_at, is_deleted')
    .eq('review_id', reviewId)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (!review || review.is_deleted === true) throw httpError(404, 'Không tìm thấy đánh giá.');

  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id, user_id, booking_status_cd')
    .eq('booking_id', review.booking_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đánh giá thuộc tài khoản của bạn.');
  if (!isConfirmedBooking(booking.booking_status_cd)) {
    throw httpError(403, 'Chỉ có thể quản lý đánh giá cho đặt phòng đã xác nhận.');
  }
  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_status, is_deleted')
    .eq('hotel_id', booking.hotel_id)
    .maybeSingle();
  if (hotelError) throw hotelError;
  if (!hotel || hotel.hotel_status !== 'ACTIVE' || hotel.is_deleted === true) {
    throw httpError(403, 'Không thể quản lý đánh giá khi khách sạn không hoạt động.');
  }
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

const deleteReview = async (userId, reviewId, reason, ipAddress) => {
  const { review, booking } = await getOwnedReview(userId, reviewId);
  return softDeleteReview({ review, booking, actorUserId: userId, reason, ipAddress });
};

const normalizeDeletionReason = (reason) => {
  const reasonCode = reason?.reason_code;
  if (reasonCode === 'OTHER') {
    const reasonText = String(reason?.reason_text || '').trim();
    if (!reasonText) throw httpError(400, 'Vui lòng nhập lý do cụ thể.');
    return { reasonCode, reasonText, reasonLabel: `Lý do khác: ${reasonText}` };
  }
  const reasonLabel = REVIEW_DELETION_REASONS[reasonCode];
  if (!reasonLabel) throw httpError(400, 'Lý do xóa đánh giá không hợp lệ.');
  return { reasonCode, reasonText: null, reasonLabel };
};

const softDeleteReview = async ({ review, booking, actorUserId, reason, ipAddress }) => {
  const normalizedReason = normalizeDeletionReason(reason);
  const deletedAt = new Date().toISOString();
  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('name')
    .eq('hotel_id', booking.hotel_id)
    .maybeSingle();
  if (hotelError) throw hotelError;

  const { error: updateError } = await supabase
    .from('t_review')
    .update({ is_deleted: true, updated_at: deletedAt })
    .eq('review_id', review.review_id)
    .or('is_deleted.is.null,is_deleted.eq.false');
  if (updateError) throw updateError;

  const auditPayload = {
    actor_user_id: actorUserId,
    action_cd: '3',
    entity_name: 't_review',
    entity_id: review.review_id,
    old_data: {
      review_id: review.review_id,
      booking_id: review.booking_id,
      rating_score: review.rating_score,
      comment: review.comment,
      is_deleted: Boolean(review.is_deleted),
      created_at: review.created_at,
    },
    new_data: {
      is_deleted: true,
      deletion_reason_code: normalizedReason.reasonCode,
      deletion_reason: normalizedReason.reasonLabel,
      deletion_reason_text: normalizedReason.reasonText,
      author_user_id: booking.user_id,
      hotel_id: booking.hotel_id,
      hotel_name: hotel?.name || 'Khách sạn',
      deleted_at: deletedAt,
    },
    ip_address: String(ipAddress || '').slice(0, 50) || null,
  };
  const { error: auditError } = await supabase.from('h_system_audit_log').insert(auditPayload);
  if (auditError) {
    const { error: rollbackError } = await supabase
      .from('t_review')
      .update({ is_deleted: Boolean(review.is_deleted), updated_at: review.updated_at || deletedAt })
      .eq('review_id', review.review_id);
    if (rollbackError) console.error(`[REVIEW DELETE] Rollback failed: ${rollbackError.message}`);
    throw auditError;
  }

  try {
    await refreshHotelRating(booking.hotel_id);
  } catch (ratingError) {
    console.error(`[REVIEW DELETE] Hotel rating refresh failed: ${ratingError.message}`);
  }

  const { data: author, error: authorError } = booking.user_id
    ? await supabase.from('m_user').select('email, full_name').eq('user_id', booking.user_id).maybeSingle()
    : { data: null, error: null };
  if (authorError) {
    console.error(`[REVIEW DELETE] Could not load author for notification: ${authorError.message}`);
  } else if (author?.email) {
    await sendMail({
      to: author.email,
      subject: 'Thông báo: Đánh giá của bạn đã được gỡ - Avora',
      templateName: 'reviewRemoved',
      templateData: {
        fullName: author.full_name || 'Quý khách',
        hotelName: hotel?.name || 'khách sạn',
        deletionReason: normalizedReason.reasonLabel,
        ratingScore: review.rating_score,
        comment: review.comment || 'Không có nhận xét.',
        deletedAt: new Date(deletedAt).toLocaleString('vi-VN'),
      },
    });
  }

  return {
    review_id: review.review_id,
    is_deleted: true,
    deletion_reason_code: normalizedReason.reasonCode,
    deletion_reason: normalizedReason.reasonLabel,
    deleted_at: deletedAt,
  };
};

const adminSoftDeleteReview = async (reviewId, actorUserId, reason, ipAddress) => {
  const { data: review, error: reviewError } = await supabase
    .from('t_review')
    .select('review_id, booking_id, rating_score, comment, created_at, updated_at, is_deleted')
    .eq('review_id', reviewId)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (!review) throw httpError(404, 'Không tìm thấy đánh giá.');
  if (review.is_deleted) throw httpError(409, 'Đánh giá này đã bị gỡ và không thể xóa lại.');

  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, hotel_id, user_id')
    .eq('booking_id', review.booking_id)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw httpError(404, 'Không tìm thấy đặt phòng của đánh giá.');
  return softDeleteReview({ review, booking, actorUserId, reason, ipAddress });
};

module.exports = {
  getHotelReviews,
  getMyReviews,
  getMyReviewRemovalNotifications,
  getAdminReviews,
  adminSoftDeleteReview,
  getBookingReview,
  createReview,
  updateReview,
  deleteReview,
};