'use strict';

const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const supabase = require('../../config/supabaseClient');

const BUCKET = 'avoramoments';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const ADMIN_REMOVAL_ENTITY = 'MOMENT_ADMIN_REMOVAL';

const createError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getAdminRemovedMomentIds = async (momentIds = null) => {
  const buildQuery = () => supabase
    .from('h_system_audit_log')
    .select('entity_id')
    .eq('entity_name', ADMIN_REMOVAL_ENTITY);
  if (momentIds) {
    if (!momentIds.length) return new Set();
    const { data, error } = await buildQuery().in('entity_id', momentIds.map(String));
    if (error) throw error;
    return new Set((data || []).map((row) => String(row.entity_id)));
  }

  const removedIds = new Set();
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await buildQuery()
      .order('created_at', { ascending: true })
      .order('log_id', { ascending: true })
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    (data || []).forEach((row) => removedIds.add(String(row.entity_id)));
    if (!data || data.length < batchSize) break;
  }
  return removedIds;
};

const excludeAdminRemovedMoments = (query, removedIds) => {
  if (!removedIds.size) return query;
  return query.not('feed_id', 'in', `(${[...removedIds].join(',')})`);
};

const isConfirmedBookingStatus = (status, confirmedCode) => {
  const normalizedStatus = String(status ?? '').trim().toUpperCase();
  return normalizedStatus === String(confirmedCode).trim().toUpperCase()
    || normalizedStatus === 'CFM';
};

const loadConfirmedBookingCode = async () => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd')
    .eq('business_cd', 'BOOKING_STS')
    .eq('code_name', 'CFM')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw createError(500, 'Không tìm thấy mã trạng thái đặt phòng đã xác nhận.');
  return String(data.code_cd);
};

const getLikedMomentIds = async (momentIds, userId) => {
  if (!userId || !momentIds.length) return new Set();
  const { data, error } = await supabase
    .from('t_travel_feed_like')
    .select('feed_id')
    .eq('user_id', userId)
    .in('feed_id', momentIds);
  if (error) throw error;
  return new Set((data || []).map((like) => String(like.feed_id)));
};

const shapeMoment = (moment, likedMomentIds = new Set()) => ({
  moment_id: moment.feed_id,
  user_id: moment.user_id,
  creator_name: moment.m_user?.full_name || 'Khách hàng Avora',
  creator_avatar_url: moment.m_user?.avatar_url || null,
  booking_id: moment.booking_id,
  hotel_name: moment.t_booking?.m_hotel?.name || null,
  message: moment.message,
  image_url: moment.image_url,
  likes_count: Number(moment.likes_count || 0),
  is_hidden: Boolean(moment.is_deleted),
  liked_by_me: likedMomentIds.has(String(moment.feed_id)),
  created_at: moment.created_at,
});

const listMoments = async ({ page, limit }, viewerId = null) => {
  const start = (page - 1) * limit;
  const adminRemovedIds = await getAdminRemovedMomentIds();
  let query = excludeAdminRemovedMoments(supabase
    .from('t_travel_feed')
    .select(`
      feed_id,
      user_id,
      booking_id,
      message,
      image_url,
      likes_count,
      is_deleted,
      created_at,
      m_user!t_travel_feed_user_id_fkey(user_id, full_name, avatar_url),
      t_booking!t_travel_feed_booking_id_fkey(m_hotel(name))
    `, { count: 'exact' })
    .order('likes_count', { ascending: false })
    .order('created_at', { ascending: false })
    .order('feed_id', { ascending: true }), adminRemovedIds);
  query = viewerId
    ? query.or(`is_deleted.eq.false,user_id.eq.${viewerId}`)
    : query.eq('is_deleted', false);
  const { data, error, count } = await query.range(start, start + limit - 1);
  if (error) throw error;

  const rows = data || [];
  const likedIds = await getLikedMomentIds(
    rows.filter((moment) => !moment.is_deleted).map((moment) => moment.feed_id),
    viewerId
  );
  const total = Number(count || 0);
  return {
    items: rows.map((moment) => shapeMoment(moment, likedIds)),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const listBannerMoments = async () => {
  const removedIds = await getAdminRemovedMomentIds();
  const { data, error } = await excludeAdminRemovedMoments(supabase
    .from('t_travel_feed')
    .select('feed_id, user_id, booking_id, message, image_url, likes_count, created_at, m_user!t_travel_feed_user_id_fkey(user_id, full_name, avatar_url), t_booking!t_travel_feed_booking_id_fkey(m_hotel(name))')
    .eq('is_deleted', false)
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .order('created_at', { ascending: false })
    .order('feed_id', { ascending: true })
    .limit(5), removedIds);
  if (error) throw error;
  return (data || []).map((moment) => shapeMoment(moment));
};

const getMoment = async (momentId, viewerId = null) => {
  const { data, error } = await supabase
    .from('t_travel_feed')
    .select('feed_id, user_id, booking_id, message, image_url, likes_count, is_deleted, created_at, m_user!t_travel_feed_user_id_fkey(user_id, full_name, avatar_url), t_booking!t_travel_feed_booking_id_fkey(m_hotel(name))')
    .eq('feed_id', momentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw createError(404, 'Không tìm thấy moment.');
  if ((await getAdminRemovedMomentIds([data.feed_id])).has(String(data.feed_id))) {
    throw createError(404, 'Không tìm thấy moment.');
  }
  if (data.is_deleted && String(data.user_id) !== String(viewerId || '')) {
    throw createError(404, 'Không tìm thấy moment.');
  }
  const likedIds = await getLikedMomentIds([data.feed_id], viewerId);
  return shapeMoment(data, likedIds);
};

const listEligibleBookings = async (userId) => {
  const confirmedCode = await loadConfirmedBookingCode();
  const { data: bookings, error: bookingError } = await supabase
    .from('t_booking')
    .select(`
      booking_id,
      created_at,
      hotel_id,
      booking_status_cd,
      m_hotel(hotel_id, name, m_hotel_image(image_url, is_thumbnail, sort_order)),
      t_booking_detail(check_in_date, check_out_date)
    `)
    .eq('user_id', userId)
    .in('booking_status_cd', [...new Set([confirmedCode, 'CFM'])])
    .order('created_at', { ascending: false });
  if (bookingError) throw bookingError;
  if (!bookings?.length) return [];

  const { data: linkedMoments, error: momentError } = await supabase
    .from('t_travel_feed')
    .select('booking_id')
    .in('booking_id', bookings.map((booking) => booking.booking_id));
  if (momentError) throw momentError;
  const linkedBookingIds = new Set((linkedMoments || []).map((moment) => String(moment.booking_id)));

  return bookings
    .filter((booking) => !linkedBookingIds.has(String(booking.booking_id)))
    .map((booking) => {
      const images = [...(booking.m_hotel?.m_hotel_image || [])]
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      const thumbnail = images.find((image) => image.is_thumbnail) || images[0];
      const stay = [...(booking.t_booking_detail || [])]
        .sort((a, b) => String(a.check_in_date).localeCompare(String(b.check_in_date)));
      return {
        booking_id: booking.booking_id,
        created_at: booking.created_at,
        hotel: {
          hotel_id: booking.m_hotel?.hotel_id || booking.hotel_id,
          name: booking.m_hotel?.name || 'Khách sạn',
          thumbnail_url: thumbnail?.image_url || null,
        },
        stay: {
          check_in_date: stay[0]?.check_in_date || null,
          check_out_date: stay.reduce((latest, item) => (
            !latest || String(item.check_out_date) > String(latest) ? item.check_out_date : latest
          ), null),
        },
      };
    });
};

const validateImage = async (file) => {
  if (!file) throw createError(400, 'Vui lòng chọn ảnh cho moment.');
  if (file.size > MAX_IMAGE_BYTES) throw createError(413, 'Ảnh moment không được vượt quá 2 MB.');
  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw createError(400, 'Ảnh moment phải có định dạng PNG hoặc JPEG.');
  }
  let metadata;
  try {
    metadata = await sharp(file.buffer, { failOn: 'error' }).metadata();
  } catch {
    throw createError(400, 'Tệp tải lên không phải ảnh hợp lệ.');
  }
  if (!['png', 'jpeg'].includes(metadata.format)) {
    throw createError(400, 'Ảnh moment phải có định dạng PNG hoặc JPEG.');
  }
};

const uploadMomentImage = async (userId, file) => {
  const objectPath = `${userId}/${randomUUID()}.webp`;
  const imageBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, imageBuffer, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (cleanupError) console.error(`[MOMENT] Image cleanup failed: ${cleanupError.message}`);
    throw createError(500, 'Không thể tạo đường dẫn ảnh moment.');
  }
  return { objectPath, imageUrl: data.publicUrl };
};

const getOwnedImagePath = (imageUrl, userId) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const markerIndex = String(imageUrl || '').indexOf(marker);
  if (markerIndex < 0) throw createError(500, 'Không thể xác thực ảnh moment hiện tại.');
  const objectPath = decodeURIComponent(String(imageUrl).slice(markerIndex + marker.length));
  if (!objectPath.startsWith(`${userId}/`)) throw createError(500, 'Ảnh moment hiện tại không thuộc người tạo.');
  return objectPath;
};

const createMoment = async (userId, { booking_id: bookingId, message }, file) => {
  await validateImage(file);
  const confirmedCode = await loadConfirmedBookingCode();
  const { data: booking, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, user_id, booking_status_cd')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking || String(booking.user_id) !== String(userId)) {
    throw createError(404, 'Không tìm thấy đơn đặt phòng của bạn.');
  }
  if (!isConfirmedBookingStatus(booking.booking_status_cd, confirmedCode)) {
    throw createError(409, 'Chỉ có thể tạo moment từ đơn đặt phòng đã xác nhận.');
  }

  const { data: existingMoment, error: existingError } = await supabase
    .from('t_travel_feed')
    .select('feed_id')
    .eq('booking_id', bookingId)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingMoment) throw createError(409, 'Đơn đặt phòng này đã được sử dụng để tạo moment.');

  let uploadedPath = null;
  let uploaded = false;
  try {
    const uploadedImage = await uploadMomentImage(userId, file);
    uploadedPath = uploadedImage.objectPath;
    uploaded = true;

    const { data: moment, error: insertError } = await supabase
      .from('t_travel_feed')
      .insert({
        user_id: userId,
        booking_id: bookingId,
        message: message.trim(),
        image_url: uploadedImage.imageUrl,
      })
      .select('feed_id, user_id, booking_id, message, image_url, likes_count, created_at')
      .single();
    if (insertError) {
      if (insertError.code === '23505') {
        throw createError(409, 'Đơn đặt phòng này đã được sử dụng để tạo moment.');
      }
      throw insertError;
    }
    return shapeMoment(moment);
  } catch (error) {
    if (uploaded) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedPath]);
      if (cleanupError) console.error(`[MOMENT] Image cleanup failed: ${cleanupError.message}`);
    }
    throw error;
  }
};

const getMomentForOwner = async (momentId, userId) => {
  const { data, error } = await supabase
    .from('t_travel_feed')
    .select('feed_id, user_id, message, image_url, is_deleted')
    .eq('feed_id', momentId)
    .maybeSingle();
  if (error) throw error;
  if (!data || String(data.user_id) !== String(userId)) {
    throw createError(404, 'Không tìm thấy moment của bạn.');
  }
  if ((await getAdminRemovedMomentIds([data.feed_id])).has(String(data.feed_id))) {
    throw createError(404, 'Không tìm thấy moment của bạn.');
  }
  return data;
};

const listAdminMoments = async ({ page, limit, published_from, published_to, hotel, author }) => {
  let authorIds = null;
  if (author) {
    const authorPattern = `%${author}%`;
    const [{ data: nameMatches, error: nameError }, { data: emailMatches, error: emailError }] = await Promise.all([
      supabase.from('m_user').select('user_id').ilike('full_name', authorPattern),
      supabase.from('m_user').select('user_id').ilike('email', authorPattern),
    ]);
    if (nameError) throw nameError;
    if (emailError) throw emailError;
    authorIds = [...new Set([...(nameMatches || []), ...(emailMatches || [])].map((user) => String(user.user_id)))];
    if (!authorIds.length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, total_pages: 0 },
      };
    }
  }

  let bookingIds = null;
  if (hotel) {
    const { data: hotels, error: hotelError } = await supabase
      .from('m_hotel')
      .select('hotel_id')
      .ilike('name', `%${hotel}%`);
    if (hotelError) throw hotelError;
    const hotelIds = (hotels || []).map((item) => item.hotel_id);
    if (!hotelIds.length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, total_pages: 0 },
      };
    }

    const { data: bookings, error: bookingError } = await supabase
      .from('t_booking')
      .select('booking_id')
      .in('hotel_id', hotelIds);
    if (bookingError) throw bookingError;
    bookingIds = (bookings || []).map((item) => item.booking_id);
    if (!bookingIds.length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, total_pages: 0 },
      };
    }
  }

  const start = (page - 1) * limit;
  let query = supabase
    .from('t_travel_feed')
    .select(`
      feed_id,
      user_id,
      booking_id,
      message,
      image_url,
      likes_count,
      is_deleted,
      created_at,
      m_user!t_travel_feed_user_id_fkey(user_id, full_name, email, avatar_url),
      t_booking!t_travel_feed_booking_id_fkey(hotel_id, m_hotel(hotel_id, name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('feed_id', { ascending: true });
  if (authorIds) query = query.in('user_id', authorIds);
  if (bookingIds) query = query.in('booking_id', bookingIds);
  if (published_from) query = query.gte('created_at', `${published_from}T00:00:00.000Z`);
  if (published_to) {
    const exclusiveEnd = new Date(`${published_to}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    query = query.lt('created_at', exclusiveEnd.toISOString());
  }
  const { data, error, count } = await query.range(start, start + limit - 1);
  if (error) throw error;

  const rows = data || [];
  const removedIds = await getAdminRemovedMomentIds(rows.map((moment) => moment.feed_id));
  const { data: removalLogs, error: removalError } = rows.length
    ? await supabase
      .from('h_system_audit_log')
      .select('entity_id, actor_user_id, new_data, created_at')
      .eq('entity_name', ADMIN_REMOVAL_ENTITY)
      .in('entity_id', rows.map((moment) => String(moment.feed_id)))
      .order('created_at', { ascending: false })
    : { data: [], error: null };
  if (removalError) throw removalError;

  const removalByMomentId = new Map();
  (removalLogs || []).forEach((log) => {
    const key = String(log.entity_id);
    if (!removalByMomentId.has(key)) removalByMomentId.set(key, log);
  });

  return {
    items: rows.map((moment) => {
      const log = removalByMomentId.get(String(moment.feed_id));
      return {
        ...shapeMoment(moment),
        creator_email: moment.m_user?.email || null,
        hotel_id: moment.t_booking?.m_hotel?.hotel_id || moment.t_booking?.hotel_id || null,
        is_admin_removed: removedIds.has(String(moment.feed_id)),
        removal_reason: log?.new_data?.reason || null,
        removed_at: log?.created_at || null,
        removed_by: log?.actor_user_id || null,
      };
    }),
    pagination: {
      page,
      limit,
      total: Number(count || 0),
      total_pages: Math.ceil(Number(count || 0) / limit),
    },
  };
};

const adminRemoveMoment = async (momentId, adminUserId, reason = '') => {
  const { data: moment, error: momentError } = await supabase
    .from('t_travel_feed')
    .select('feed_id, user_id, booking_id, message, image_url, is_deleted')
    .eq('feed_id', momentId)
    .maybeSingle();
  if (momentError) throw momentError;
  if (!moment) throw createError(404, 'Không tìm thấy moment.');

  if ((await getAdminRemovedMomentIds([moment.feed_id])).has(String(moment.feed_id))) {
    throw createError(409, 'Moment này đã bị gỡ bởi Admin.');
  }

  const { data: auditRecord, error: auditError } = await supabase
    .from('h_system_audit_log')
    .insert({
      actor_user_id: adminUserId,
      action_cd: '3',
      entity_name: ADMIN_REMOVAL_ENTITY,
      entity_id: String(moment.feed_id),
      old_data: moment,
      new_data: {
        admin_removed: true,
        is_deleted: true,
        reason: String(reason || '').trim() || null,
      },
    })
    .select('log_id')
    .single();
  if (auditError) throw auditError;

  const { data: updated, error: updateError } = await supabase
    .from('t_travel_feed')
    .update({ is_deleted: true })
    .eq('feed_id', momentId)
    .select('feed_id')
    .maybeSingle();
  if (updateError) {
    console.error(`[MOMENT] Admin removal status update failed: ${updateError.message}`);
    throw updateError;
  }
  if (!updated) {
    const { error: rollbackError } = await supabase
      .from('h_system_audit_log')
      .delete()
      .eq('log_id', auditRecord.log_id);
    if (rollbackError) {
      console.error(`[MOMENT] Admin removal audit rollback failed: ${rollbackError.message}`);
    }
    throw createError(404, 'Không tìm thấy moment.');
  }

  return { moment_id: updated.feed_id, is_admin_removed: true };
};

const rollbackMomentUpdate = async (momentId, userId, current, uploadedImage) => {
  const { error: rollbackError } = await supabase.from('t_travel_feed')
    .update({ message: current.message, image_url: current.image_url })
    .eq('feed_id', momentId)
    .eq('user_id', userId);
  if (rollbackError) {
    console.error(`[MOMENT] Moment update rollback failed: ${rollbackError.message}`);
    return false;
  }
  const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedImage.objectPath]);
  if (cleanupError) console.error(`[MOMENT] Replacement image cleanup failed: ${cleanupError.message}`);
  return true;
};

const updateMoment = async (momentId, userId, { message }, file) => {
  const current = await getMomentForOwner(momentId, userId);
  let uploadedImage = null;
  if (file) {
    await validateImage(file);
    uploadedImage = await uploadMomentImage(userId, file);
  }

  const nextImageUrl = uploadedImage?.imageUrl || current.image_url;
  const { data: updated, error: updateError } = await supabase
    .from('t_travel_feed')
    .update({ message: message.trim(), image_url: nextImageUrl })
    .eq('feed_id', momentId)
    .eq('user_id', userId)
    .select('feed_id')
    .maybeSingle();
  if (updateError) {
    if (uploadedImage) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedImage.objectPath]);
      if (cleanupError) console.error(`[MOMENT] Replacement image cleanup failed: ${cleanupError.message}`);
    }
    throw updateError;
  }
  if (!updated) {
    if (uploadedImage && current.image_url) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedImage.objectPath]);
      if (cleanupError) console.error(`[MOMENT] Replacement image cleanup failed: ${cleanupError.message}`);
    }
    throw createError(404, 'Không tìm thấy moment của bạn.');
  }

  if (uploadedImage) {
    let oldImagePath;
    try {
      oldImagePath = getOwnedImagePath(current.image_url, userId);
    } catch (error) {
      const rolledBack = await rollbackMomentUpdate(momentId, userId, current, uploadedImage);
      if (!rolledBack) {
        throw createError(500, 'Không thể xác thực ảnh cũ hoặc khôi phục moment. Vui lòng tải lại trang để kiểm tra trạng thái.');
      }
      throw error;
    }

    const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldImagePath]);
    if (removeError) {
      const rolledBack = await rollbackMomentUpdate(momentId, userId, current, uploadedImage);
      throw createError(
        500,
        rolledBack
          ? 'Không thể thay thế ảnh moment. Nội dung cũ đã được giữ lại.'
          : 'Không thể thay thế ảnh moment hoặc khôi phục nội dung cũ. Vui lòng tải lại trang để kiểm tra trạng thái.'
      );
    }
  }
  return getMoment(momentId, userId);
};

const setMomentVisibility = async (momentId, userId, isHidden) => {
  await getMomentForOwner(momentId, userId);
  const { data, error } = await supabase
    .from('t_travel_feed')
    .update({ is_deleted: isHidden })
    .eq('feed_id', momentId)
    .eq('user_id', userId)
    .select('feed_id, is_deleted')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw createError(404, 'Không tìm thấy moment của bạn.');
  if ((await getAdminRemovedMomentIds([momentId])).has(String(momentId))) {
    const { error: enforceRemovalError } = await supabase
      .from('t_travel_feed')
      .update({ is_deleted: true })
      .eq('feed_id', momentId);
    if (enforceRemovalError) throw enforceRemovalError;
    throw createError(404, 'Không tìm thấy moment của bạn.');
  }
  return { moment_id: data.feed_id, is_hidden: Boolean(data.is_deleted) };
};

const toggleMomentLike = async (momentId, userId) => {
  if ((await getAdminRemovedMomentIds([momentId])).has(String(momentId))) {
    throw createError(404, 'Không tìm thấy moment.');
  }
  const { data: moment, error: momentError } = await supabase
    .from('t_travel_feed')
    .select('feed_id, likes_count')
    .eq('feed_id', momentId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (momentError) throw momentError;
  if (!moment) throw createError(404, 'Không tìm thấy moment.');

  const { data: existingLike, error: likeError } = await supabase
    .from('t_travel_feed_like')
    .select('user_id')
    .eq('feed_id', momentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (likeError) throw likeError;

  let action;
  if (existingLike) {
    const { error } = await supabase
      .from('t_travel_feed_like')
      .delete()
      .eq('feed_id', momentId)
      .eq('user_id', userId);
    if (error) throw error;
    action = 'unliked';
  } else {
    const { error } = await supabase
      .from('t_travel_feed_like')
      .insert({ feed_id: momentId, user_id: userId });
    if (error) {
      if (error.code === '23505') throw createError(409, 'Bạn đã thích moment này.');
      throw error;
    }
    action = 'liked';
  }

  const { count, error: countError } = await supabase
    .from('t_travel_feed_like')
    .select('user_id', { count: 'exact', head: true })
    .eq('feed_id', momentId);
  if (countError) throw countError;
  const likesCount = Number(count || 0);
  const { error: updateError } = await supabase
    .from('t_travel_feed')
    .update({ likes_count: likesCount })
    .eq('feed_id', momentId)
    .eq('is_deleted', false);
  if (updateError) throw updateError;

  return { liked: action === 'liked', likes_count: likesCount };
};

module.exports = {
  listMoments,
  listAdminMoments,
  adminRemoveMoment,
  listBannerMoments,
  getMoment,
  listEligibleBookings,
  createMoment,
  updateMoment,
  setMomentVisibility,
  toggleMomentLike,
};
