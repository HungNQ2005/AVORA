'use strict';

const supabase = require('../../../config/supabaseClient');

const HOTEL_SELECT = `
  hotel_id, owner_id, name, description, address,
  city_id, district_id, ward_id, star_rating, star_quality,
  lat, lng, is_deleted, created_at, updated_at,
  city:m_city(city_id, city_name),
  district:m_district(district_id, district_name),
  ward:m_ward(ward_id, ward_name),
  rooms:m_room(count)
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

const addStatusNames = async (hotels) => {
  return hotels.map((hotel) => ({ ...hotel, status_cd: null, status_name: 'Not configured' }));
};

const listHotels = async ({ page, pageSize, keyword, search, city_id, district_id, star_rating, status_cd, ownerId }) => {
  ensureClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from('m_hotel')
    .select(HOTEL_SELECT, { count: 'exact' })
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .range(from, to);

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
  if (ownerId) query = query.eq('owner_id', ownerId);
  query = query.eq('rooms.is_deleted', false);

  const { data, count, error } = await query;
  checkQuery(error);
  return { items: await addStatusNames(data || []), total: count || 0 };
};

const getHotelById = async (hotelId, ownerId) => {
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .select(`${HOTEL_SELECT}, room_types:m_room_type(room_type_id, type_name, max_adults, max_children, bed_type, room_size, default_price, rooms:m_room(count))`)
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);
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
    .select('*')
    .single();
  checkQuery(error);
  return (await addStatusNames([data]))[0];
};

const updateHotel = async (hotelId, updates, ownerId) => {
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);
  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query.select('*').maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

const publishHotel = async (hotelId, ownerId) => {
  const err = new Error('Hotel publication is unavailable because the deployed M_HOTEL schema has no publication-status column.');
  err.statusCode = 409;
  throw err;
};

const softDeleteHotel = async ({ hotelId, actorUserId, isSystemAdmin }) => {
  ensureClient();
  const { data: hotel, error: hotelError } = await supabase
    .from('m_hotel')
    .select('hotel_id, owner_id')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .maybeSingle();
  checkQuery(hotelError);
  if (!hotel) return { status: 'not_found' };
  if (!isSystemAdmin && String(hotel.owner_id) !== String(actorUserId)) return { status: 'forbidden' };

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
  if (!isSystemAdmin) updateQuery = updateQuery.eq('owner_id', actorUserId);
  const { data, error } = await updateQuery.select('hotel_id').maybeSingle();
  checkQuery(error);
  return data ? { status: 'deleted' } : { status: 'not_found' };
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
  star_rating: hotel.star_quality ?? hotel.star_rating,
  lat: hotel.lat,
  lng: hotel.lng,
  status_cd: hotel.status_cd,
  status_name: hotel.status_name || 'Not configured',
  room_count: hotel.rooms?.[0]?.count ?? 0,
  room_types: hotel.room_types || undefined,
  created_at: hotel.created_at,
  updated_at: hotel.updated_at,
});

module.exports = { listHotels, getHotelById, createHotel, updateHotel, publishHotel, softDeleteHotel, toHotelDto };
