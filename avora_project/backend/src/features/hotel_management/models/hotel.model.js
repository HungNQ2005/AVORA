'use strict';

const supabase = require('../../../config/supabaseClient');

const HOTEL_SELECT = `
  hotel_id, owner_id, name, description, address,
  city_id, district_id, ward_id, star_rating, star_quality,
  lat, lng, is_deleted, hotel_status, created_at, updated_at,
  city:m_city(city_id, city_name),
  district:m_district(district_id, district_name),
  ward:m_ward(ward_id, ward_name),
  owner:m_user(user_id, full_name, phone, email),
  rooms:m_room(count),
  room_type_summary:m_room_type(count),
  images:m_hotel_image(image_id, image_url, is_thumbnail, sort_order)
`;

const ensureClient = () => {
  if (!supabase) {
    const err = new Error('Database client is not initialized.');
    err.statusCode = 503;
    throw err;
  }
};

const checkQuery = (error) => {
  if (error) {
    console.error(`[HOTEL MODEL] ${error.code || 'DB_ERROR'}: ${error.message}`);
    const err = new Error('Hotel data operation failed.');
    err.statusCode = 500;
    throw err;
  }
};

const getVendorRoleCode = async () => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd')
    .eq('business_cd', 'USER_ROLE')
    .in('code_name', ['VEN', 'VENDOR']);
  checkQuery(error);
  return (data || []).map((row) => String(row.code_cd));
};

const STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đang hoạt động',
};

const addStatusNames = async (hotels) => {
  return hotels.map((hotel) => {
    const statusCd = hotel.hotel_status || 'ACTIVE';
    const images = Array.isArray(hotel.images)
      ? [...hotel.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [];
    const thumbnail = images.find((img) => img.is_thumbnail) || images[0] || null;
    return {
      ...hotel,
      status_cd: statusCd,
      status_name: STATUS_LABELS[statusCd] || statusCd,
      images,
      thumbnail_url: thumbnail?.image_url || null,
    };
  });
};

const listHotels = async ({ page, pageSize, keyword, search, city_id, district_id, star_rating, status_cd, ownerId, includeDeleted = false, includeStatuses = null }) => {
  ensureClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('m_hotel')
    .select(HOTEL_SELECT, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (!includeDeleted) query = query.eq('is_deleted', false);

  const searchTerm = String(keyword || search || '').trim().replace(/[\\%_,()"']/g, ' ');
  if (searchTerm) {
    const pattern = `*${searchTerm}*`;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchTerm);
    const isNumericId = /^\d+$/.test(searchTerm);
    const idFilter = isUuid || isNumericId ? `,hotel_id.eq.${searchTerm}` : '';
    query = query.or(`name.ilike.${pattern},address.ilike.${pattern}${idFilter}`);
  }
  if (city_id) query = query.eq('city_id', city_id);
  if (district_id) query = query.eq('district_id', district_id);
  if (star_rating) query = query.eq('star_quality', star_rating);
  if (status_cd) query = query.eq('hotel_status', status_cd);
  else if (Array.isArray(includeStatuses) && includeStatuses.length) query = query.in('hotel_status', includeStatuses);
  if (ownerId) query = query.eq('owner_id', ownerId);
  query = query.eq('rooms.is_deleted', false);

  const { data, count, error } = await query;
  checkQuery(error);
  return { items: await addStatusNames(data || []), total: count || 0 };
};

const getHotelById = async (hotelId, { ownerId = null, includeDeleted = false } = {}) => {
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .select(`${HOTEL_SELECT}, room_types:m_room_type(room_type_id, type_name, max_adults, max_children, bed_type, room_size, default_price, rooms:m_room(count))`)
    .eq('hotel_id', hotelId);
  if (!includeDeleted) query = query.eq('is_deleted', false);
  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query.maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

const createHotel = async (input) => {
  ensureClient();
  const { data, error } = await supabase
    .from('m_hotel')
    .insert(input)
    .select(HOTEL_SELECT)
    .single();
  checkQuery(error);
  return (await addStatusNames([data]))[0];
};

const updateHotel = async (hotelId, updates, { ownerId = null, includeDeleted = false } = {}) => {
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId);
  if (!includeDeleted) query = query.eq('is_deleted', false);
  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query.select('*').maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

const listActiveVendors = async () => {
  ensureClient();
  const roleCodes = await getVendorRoleCode();
  if (!roleCodes.length) return [];

  const { data, error } = await supabase
    .from('m_user')
    .select('user_id, full_name, phone, email')
    .eq('account_status', 'ACTIVE')
    .eq('is_deleted', false)
    .in('role_cd', roleCodes)
    .order('full_name', { ascending: true });
  checkQuery(error);
  return data || [];
};

const isActiveVendor = async (userId) => {
  ensureClient();
  const roleCodes = await getVendorRoleCode();
  if (!roleCodes.length) return false;

  const { data, error } = await supabase
    .from('m_user')
    .select('user_id')
    .eq('user_id', userId)
    .eq('account_status', 'ACTIVE')
    .eq('is_deleted', false)
    .in('role_cd', roleCodes)
    .maybeSingle();
  checkQuery(error);
  return Boolean(data);
};

// PENDING -> ACTIVE only. An already-ACTIVE hotel can never revert to PENDING.
const approveHotel = async (hotelId) => {
  ensureClient();
  const { data, error } = await supabase
    .from('m_hotel')
    .update({ hotel_status: 'ACTIVE', updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId)
    .eq('hotel_status', 'PENDING')
    .select('*')
    .maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

// Admin/Business Manager only: un-delete a hotel without touching its approval status.
const restoreHotel = async (hotelId) => {
  ensureClient();
  const { data, error } = await supabase
    .from('m_hotel')
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId)
    .eq('is_deleted', true)
    .select('*')
    .maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

const softDeleteHotel = async ({ hotelId, access }) => {
  ensureClient();
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, owner_id, is_deleted, hotel_status')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    ;
  if (access.isVendor) hotelQuery = hotelQuery.eq('owner_id', access.userId);
  const { data: hotel, error: hotelError } = await hotelQuery.maybeSingle();
  checkQuery(hotelError);
  if (!hotel) return { status: 'not_found' };
  if (access.isVendor && hotel.hotel_status === 'ACTIVE') return { status: 'active_hotel_locked' };

  const { data: bookings, error: bookingError } = await supabase
    .from('t_booking')
    .select('booking_id, booking_status_cd, details:t_booking_detail(check_in_date)')
    .eq('hotel_id', hotelId);
  checkQuery(bookingError);

  const bookingCodes = [...new Set((bookings || []).map((booking) => String(booking.booking_status_cd)))];
  const { data: bookingStatuses, error: bookingStatusError } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BOOKING_STS')
    .in('code_cd', bookingCodes.length ? bookingCodes : ['__none__']);
  checkQuery(bookingStatusError);
  const bookingNames = new Map((bookingStatuses || []).map((status) => [String(status.code_cd), String(status.code_name).toUpperCase()]));
  const today = new Date().toISOString().slice(0, 10);
  const hasActiveBooking = (bookings || []).some((booking) => {
    const code = String(booking.booking_status_cd).toUpperCase();
    const status = bookingNames.get(code) || code;
    if (['PND', 'PENDING', 'UPCOMING'].includes(status)) return true;
    return ['CFM', 'CONFIRMED'].includes(status)
      && (booking.details || []).some((detail) => String(detail.check_in_date) >= today);
  });
  if (hasActiveBooking) return { status: 'active_bookings' };

  const { data: rooms, error: roomError } = await supabase
    .from('m_room')
    .select('status_cd')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);
  checkQuery(roomError);
  const roomCodes = [...new Set((rooms || []).map((room) => String(room.status_cd)))];
  const { data: roomStatuses, error: roomStatusError } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .in('business_cd', ['ROOM_STS', 'ROOM_STATUS'])
    .in('code_cd', roomCodes.length ? roomCodes : ['__none__']);
  checkQuery(roomStatusError);
  const roomNames = new Map((roomStatuses || []).map((status) => [String(status.code_cd), String(status.code_name).toUpperCase()]));
  const hasOccupiedRoom = (rooms || []).some((room) => {
    const code = String(room.status_cd).toUpperCase();
    const status = roomNames.get(code) || code;
    return ['OCCUPIED', 'RESERVED'].includes(status);
  });
  if (hasOccupiedRoom) return { status: 'active_bookings' };

  let updateQuery = supabase
    .from('m_hotel')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);
  if (access.isVendor) updateQuery = updateQuery.eq('owner_id', access.userId);
  const { data, error } = await updateQuery.select('hotel_id').maybeSingle();
  checkQuery(error);
  return data ? { status: 'deleted' } : { status: 'not_found' };
};

const HOTEL_IMAGE_BUCKET = 'hotel-images';

// Confirms the hotel exists and the caller is allowed to manage it (owner Vendor, or Admin/BM).
const assertHotelAccess = async (hotelId, access) => {
  let query = supabase.from('m_hotel').select('hotel_id, owner_id').eq('hotel_id', hotelId);
  if (access.isVendor) query = query.eq('owner_id', access.userId);
  const { data, error } = await query.maybeSingle();
  checkQuery(error);
  return Boolean(data);
};

const addHotelImage = async (hotelId, { buffer, mimeType, originalName, isThumbnail }, access) => {
  ensureClient();
  if (!(await assertHotelAccess(hotelId, access))) return null;

  const fileExt = (originalName?.split('.').pop() || 'jpg').toLowerCase();
  const objectPath = `${hotelId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(HOTEL_IMAGE_BUCKET)
    .upload(objectPath, buffer, { contentType: mimeType, upsert: false });
  checkQuery(uploadError);

  const { data: publicUrlData } = supabase.storage.from(HOTEL_IMAGE_BUCKET).getPublicUrl(objectPath);
  const imageUrl = publicUrlData?.publicUrl;

  if (isThumbnail) {
    const { error: resetError } = await supabase
      .from('m_hotel_image')
      .update({ is_thumbnail: false })
      .eq('hotel_id', hotelId);
    checkQuery(resetError);
  }

  const { count } = await supabase
    .from('m_hotel_image')
    .select('image_id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId);

  const { data, error } = await supabase
    .from('m_hotel_image')
    .insert({
      hotel_id: hotelId,
      image_url: imageUrl,
      is_thumbnail: Boolean(isThumbnail) || !count,
      sort_order: count || 0,
    })
    .select('image_id, image_url, is_thumbnail, sort_order')
    .single();
  checkQuery(error);
  return data;
};

const deleteHotelImage = async (hotelId, imageId, access) => {
  ensureClient();
  if (!(await assertHotelAccess(hotelId, access))) return { status: 'forbidden' };

  const { data: image, error: fetchError } = await supabase
    .from('m_hotel_image')
    .select('image_id, image_url, is_thumbnail')
    .eq('image_id', imageId)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  checkQuery(fetchError);
  if (!image) return { status: 'not_found' };

  const { error: deleteError } = await supabase
    .from('m_hotel_image')
    .delete()
    .eq('image_id', imageId);
  checkQuery(deleteError);

  // Storage cleanup is best-effort; the DB row is the source of truth for the UI.
  try {
    const marker = `/${HOTEL_IMAGE_BUCKET}/`;
    const idx = image.image_url?.indexOf(marker);
    if (idx !== -1 && idx !== undefined) {
      const objectPath = image.image_url.slice(idx + marker.length);
      await supabase.storage.from(HOTEL_IMAGE_BUCKET).remove([objectPath]);
    }
  } catch (storageErr) {
    console.error(`[HOTEL MODEL] Storage cleanup failed: ${storageErr.message}`);
  }

  if (image.is_thumbnail) {
    const { data: nextImage } = await supabase
      .from('m_hotel_image')
      .select('image_id')
      .eq('hotel_id', hotelId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextImage) {
      await supabase.from('m_hotel_image').update({ is_thumbnail: true }).eq('image_id', nextImage.image_id);
    }
  }

  return { status: 'deleted' };
};

const setHotelImageThumbnail = async (hotelId, imageId, access) => {
  ensureClient();
  if (!(await assertHotelAccess(hotelId, access))) return { status: 'forbidden' };

  const { data: image, error: fetchError } = await supabase
    .from('m_hotel_image')
    .select('image_id')
    .eq('image_id', imageId)
    .eq('hotel_id', hotelId)
    .maybeSingle();
  checkQuery(fetchError);
  if (!image) return { status: 'not_found' };

  const { error: resetError } = await supabase
    .from('m_hotel_image')
    .update({ is_thumbnail: false })
    .eq('hotel_id', hotelId);
  checkQuery(resetError);

  const { error: setError } = await supabase
    .from('m_hotel_image')
    .update({ is_thumbnail: true })
    .eq('image_id', imageId);
  checkQuery(setError);

  return { status: 'updated' };
};

const toHotelDto = (hotel) => ({
  hotel_id: hotel.hotel_id,
  owner_id: hotel.owner_id,
  name: hotel.name,
  description: hotel.description,
  address: hotel.address,
  city_id: hotel.city_id,
  city_name: hotel.city?.city_name || null,
  district_id: hotel.district_id,
  district_name: hotel.district?.district_name || null,
  ward_id: hotel.ward_id,
  ward_name: hotel.ward?.ward_name || null,
  owner: hotel.owner ? {
    user_id: hotel.owner.user_id,
    full_name: hotel.owner.full_name,
    phone: hotel.owner.phone,
    email: hotel.owner.email,
  } : null,
  owner_name: hotel.owner?.full_name || null,
  owner_phone: hotel.owner?.phone || null,
  owner_email: hotel.owner?.email || null,
  star_rating: hotel.star_quality ?? hotel.star_rating,
  lat: hotel.lat,
  lng: hotel.lng,
  hotel_status: hotel.hotel_status || 'ACTIVE',
  status_cd: hotel.status_cd,
  status_name: hotel.status_name,
  is_deleted: Boolean(hotel.is_deleted),
  images: (hotel.images || []).map((img) => ({
    image_id: img.image_id,
    image_url: img.image_url,
    is_thumbnail: Boolean(img.is_thumbnail),
    sort_order: img.sort_order ?? 0,
  })),
  thumbnail_url: hotel.thumbnail_url || null,
  total_rooms: hotel.rooms?.[0]?.count ?? 0,
  total_room_types: hotel.room_type_summary?.[0]?.count ?? hotel.room_types?.length ?? 0,
  room_count: hotel.rooms?.[0]?.count ?? 0,
  room_types: hotel.room_types || undefined,
  created_at: hotel.created_at,
  updated_at: hotel.updated_at,
});

module.exports = { listHotels, getHotelById, createHotel, updateHotel, listActiveVendors, isActiveVendor, approveHotel, restoreHotel, softDeleteHotel, addHotelImage, deleteHotelImage, setHotelImageThumbnail, toHotelDto };
