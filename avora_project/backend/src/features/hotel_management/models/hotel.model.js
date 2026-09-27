'use strict';

const supabase = require('../../../config/supabaseClient');

const HOTEL_SELECT = `
  hotel_id, owner_id, name, description, address,
  city_id, district_id, ward_id, star_rating, star_quality,
  lat, lng, status_cd, is_deleted, created_at, updated_at,
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
  if (!hotels.length) return hotels;
  const statusCodes = [...new Set(hotels.map((hotel) => hotel.status_cd).filter(Boolean))];
  const { data: statuses, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'HOTEL_STATUS')
    .in('code_cd', statusCodes);
  checkQuery(error);

  const names = new Map((statuses || []).map((status) => [String(status.code_cd), status.code_name]));
  return hotels.map((hotel) => ({
    ...hotel,
    status_name: names.get(String(hotel.status_cd)) || hotel.status_cd,
  }));
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
  if (status_cd) query = query.eq('status_cd', status_cd);
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
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .update({ status_cd: 'ACTIVE', updated_at: new Date().toISOString() })
    .eq('hotel_id', hotelId)
    .eq('status_cd', 'DRAFT')
    .eq('is_deleted', false);
  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query.select('*').maybeSingle();
  checkQuery(error);
  if (!data) return null;
  return (await addStatusNames([data]))[0];
};

const softDeleteHotel = async ({ hotelId, actorUserId, isSystemAdmin }) => {
  ensureClient();
  const { data, error } = await supabase.rpc('hotel_soft_delete', {
    p_hotel_id: String(hotelId),
    p_actor_user_id: String(actorUserId),
    p_is_system_admin: isSystemAdmin,
  });
  checkQuery(error);
  return data;
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
  status_name: hotel.status_name || hotel.status_cd,
  room_count: hotel.rooms?.[0]?.count ?? 0,
  room_types: hotel.room_types || undefined,
  created_at: hotel.created_at,
  updated_at: hotel.updated_at,
});

module.exports = { listHotels, getHotelById, createHotel, updateHotel, publishHotel, softDeleteHotel, toHotelDto };
