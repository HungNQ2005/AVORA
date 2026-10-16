'use strict';

const supabase = require('../../config/supabaseClient');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const VALID_ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'BOOKED', 'MAINTENANCE', 'LOCKED'];

const normalizeRoomNumber = (value) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const escapeLikePattern = (value) => value.replace(/[\\%_]/g, '\\$&');

const findDuplicateRoom = (hotelId, roomNumber, roomId) => {
  let query = supabase
    .from('m_room')
    .select('room_id')
    .eq('hotel_id', hotelId)
    .ilike('room_number', escapeLikePattern(roomNumber))
    .eq('is_deleted', false);

  if (roomId) {
    query = query.neq('room_id', roomId);
  }

  return query.maybeSingle();
};

/**
 * Fetch hotels accessible to the authenticated user.
 * - Hotel Manager (VEN): Only hotels where owner_id === userId
 * - System Admin (ADM): All non-deleted hotels
 */
const getAccessibleHotels = async (access) => {
  if (!supabase) throw createError('Database client is not initialized.', 503);

  let query = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, star_rating, star_quality, hotel_status, owner_id')
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (access.isVendor) {
    query = query.eq('owner_id', access.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw createError(`Không thể lấy danh sách khách sạn: ${error.message}`);
  }
  return data || [];
};

/**
 * Fetch room types for a specific hotel.
 */
const getRoomTypesForHotel = async (hotelId, access) => {
  if (!supabase) throw createError('Database client is not initialized.', 503);

  if (hotelId && hotelId !== 'ALL') {
    const hotels = await getAccessibleHotels(access);
    const isAccessible = hotels.some((h) => h.hotel_id === hotelId);
    if (!isAccessible && access.isVendor) {
      throw createError('Bạn không có quyền truy cập khách sạn này.', 403);
    }
  }

  const { data, error } = await supabase
    .from('m_room_type')
    .select('room_type_id, hotel_id, type_name, max_adults, max_children, bed_type, room_size, default_price')
    .eq('is_deleted', false)
    .order('type_name', { ascending: true });

  if (error) {
    throw createError(`Không thể tải danh sách loại phòng: ${error.message}`);
  }

  const roomTypes = data || [];
  if (hotelId && hotelId !== 'ALL') {
    roomTypes.sort((a, b) => {
      const aMatch = a.hotel_id === hotelId ? 0 : 1;
      const bMatch = b.hotel_id === hotelId ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.type_name || '').localeCompare(b.type_name || '', 'vi');
    });
  }

  return roomTypes;
};

/**
 * Fetch rooms with filter, pagination, stats, and relations.
 */
const getRooms = async (filters = {}, access) => {  
  if (!supabase) throw createError('Database client is not initialized.', 503);

  const hotels = await getAccessibleHotels(access);
  if (hotels.length === 0) {
    const { data: availableRoomTypes } = await supabase
      .from('m_room_type')
      .select('room_type_id, hotel_id, type_name, max_adults, max_children, bed_type, room_size, default_price')
      .eq('is_deleted', false)
      .order('type_name', { ascending: true });

    return {
      rooms: [],
      hotels: [],
      floors: [],
      room_types: availableRoomTypes || [],
      stats: {
        total_rooms: 0,
        total_room_types: availableRoomTypes?.length || 0,
        available_rooms: 0,
        occupied_rooms: 0,
        maintenance_rooms: 0,
        occupancy_rate: 0,
        adr: 0,
        revpar: 0,
        hotel_name: 'Chưa có khách sạn được phân quyền',
      },
      total_count: 0,
    };
  }

  let selectedHotelId = filters.hotel_id;
  if (!selectedHotelId) {
    selectedHotelId = access.isAdmin
      ? 'ALL'
      : hotels.length === 1
        ? hotels[0].hotel_id
        : 'ALL';
  }

  let targetHotel = null;
  let targetHotelIds = [];

  if (selectedHotelId === 'ALL') {
    targetHotel = {
      name: `Tất cả cơ sở lưu trú (${hotels.length} khách sạn)`,
      hotel_id: 'ALL',
    };
    targetHotelIds = hotels.map((h) => h.hotel_id);
  } else {
    targetHotel = hotels.find((h) => h.hotel_id === selectedHotelId);
    if (!targetHotel && access.isVendor) {
      throw createError('Bạn không có quyền quản lý khách sạn này.', 403);
    }
    targetHotelIds = targetHotel ? [targetHotel.hotel_id] : [];
  }

  // 1. Fetch rooms
  let query = supabase
    .from('m_room')
    .select(`
      room_id,
      hotel_id,
      room_type_id,
      room_number,
      floor,
      status_cd,
      is_deleted,
      created_at,
      updated_at,
      m_hotel (
        hotel_id,
        name,
        address,
        star_rating,
        star_quality
      ),
      m_room_type (
        room_type_id,
        type_name,
        max_adults,
        max_children,
        bed_type,
        room_size,
        default_price,
        is_deleted
      )
    `)
    .in('hotel_id', targetHotelIds)
    .order('room_number', { ascending: true });

  if (!filters.include_deleted) {
    query = query.eq('is_deleted', false);
  }

  if (filters.room_type_id && filters.room_type_id !== 'ALL') {
    query = query.eq('room_type_id', filters.room_type_id);
  }

  if (filters.floor && filters.floor !== 'ALL') {
    query = query.eq('floor', filters.floor);
  }

  if (filters.status_cd && filters.status_cd !== 'ALL') {
    query = query.eq('status_cd', filters.status_cd);
  }

  const { data: rawRooms, error: roomError } = await query;
  if (roomError) {
    throw createError(`Lỗi tải danh sách buồng phòng: ${roomError.message}`);
  }

  const rooms = rawRooms || [];
  const roomTypeIds = [...new Set(rooms.map((r) => r.room_type_id).filter(Boolean))];

  // 2. Fetch facilities mapped to room types
  let facilitiesMap = {};
  if (roomTypeIds.length > 0) {
    const { data: facMaps } = await supabase
      .from('m_room_facility_map')
      .select(`
        room_type_id,
        m_facility (
          facility_id,
          facility_name,
          icon,
          type
        )
      `)
      .in('room_type_id', roomTypeIds);

    if (facMaps) {
      facMaps.forEach((fm) => {
        if (fm.m_facility) {
          if (!facilitiesMap[fm.room_type_id]) {
            facilitiesMap[fm.room_type_id] = [];
          }
          facilitiesMap[fm.room_type_id].push(fm.m_facility);
        }
      });
    }
  }

  // 3. Fetch hotel thumbnail images
  let hotelImagesMap = {};
  if (targetHotelIds.length > 0) {
    const { data: hotelImages } = await supabase
      .from('m_hotel_image')
      .select('hotel_id, image_url, is_thumbnail, sort_order')
      .in('hotel_id', targetHotelIds)
      .order('is_thumbnail', { ascending: false })
      .order('sort_order', { ascending: true });

    if (hotelImages) {
      hotelImages.forEach((img) => {
        if (!hotelImagesMap[img.hotel_id]) {
          hotelImagesMap[img.hotel_id] = img.image_url;
        }
      });
    }
  }

  // 4. Fetch existing room types for dropdown
  const { data: availableRoomTypes } = await supabase
    .from('m_room_type')
    .select('room_type_id, hotel_id, type_name, max_adults, max_children, bed_type, room_size, default_price')
    .eq('is_deleted', false)
    .order('type_name', { ascending: true });
  // 5. Distinct floors for dropdown
  const distinctFloors = [...new Set(rooms.map((r) => r.floor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

  // 6. Enrich room records
  const enrichedRooms = rooms.map((room) => {
    const rt = room.m_room_type || {};
    const facilities = facilitiesMap[room.room_type_id] || [];
    const prefix = rt.type_name?.includes('Villa') ? 'VIL' : rt.type_name?.includes('Suite') ? 'STE' : 'DLX';
    const shortCode = (room.room_id || '').substring(0, 4).toUpperCase();
    const sku = `SKU: ${prefix}-${room.room_number || shortCode}`;

    return {
      ...room,
      sku,
      facilities,
      hotel_image_url: hotelImagesMap[room.hotel_id] || null,
      is_active: !room.is_deleted && room.status_cd === 'AVAILABLE',
    };
  });

  let filteredRooms = enrichedRooms;
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    filteredRooms = enrichedRooms.filter((r) => {
      const matchRoom = r.room_number?.toLowerCase().includes(term);
      const matchType = r.m_room_type?.type_name?.toLowerCase().includes(term);
      const matchFloor = r.floor?.toLowerCase().includes(term);
      const matchHotel = r.m_hotel?.name?.toLowerCase().includes(term);
      const matchSku = r.sku?.toLowerCase().includes(term);
      const matchBed = r.m_room_type?.bed_type?.toLowerCase().includes(term);
      const matchFac = r.facilities?.some((f) => f.facility_name?.toLowerCase().includes(term));
      return matchRoom || matchType || matchFloor || matchHotel || matchSku || matchBed || matchFac;
    });
  }

  // Calculate Overview Stats
  const activeRooms = enrichedRooms.filter((r) => !r.is_deleted);
  const totalRooms = activeRooms.length;
  const availableRooms = activeRooms.filter((r) => r.status_cd === 'AVAILABLE').length;
  const occupiedRooms = activeRooms.filter((r) => ['OCCUPIED', 'BOOKED'].includes(r.status_cd)).length;
  const maintenanceRooms = Math.max(0, totalRooms - availableRooms - occupiedRooms);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // ADR (Average Daily Rate)
  const roomPrices = activeRooms
    .map((r) => Number(r.m_room_type?.default_price || 0))
    .filter((p) => p > 0);
  const adr = roomPrices.length > 0
    ? Math.round(roomPrices.reduce((a, b) => a + b, 0) / roomPrices.length)
    : 0;
  const revpar = Math.round(adr * (occupancyRate / 100));

  const stats = {
    total_rooms: totalRooms,
    total_room_types: availableRoomTypes?.length || 0,
    available_rooms: availableRooms,
    occupied_rooms: occupiedRooms,
    maintenance_rooms: maintenanceRooms,
    occupancy_rate: occupancyRate,
    adr,
    revpar,
    hotel_name: targetHotel?.name || 'Khách sạn được chỉ định',
    hotel_id: targetHotel?.hotel_id,
  };

  return {
    rooms: filteredRooms,
    stats,
    hotels,
    floors: distinctFloors,
    room_types: availableRoomTypes || [],
    total_count: filteredRooms.length,
  };
};

/**
 * Fetch a single room by ID with access verification.
 */
const getRoomById = async (roomId, access) => {
  if (!supabase) throw createError('Database client is not initialized.', 503);

  const { data: room, error } = await supabase
    .from('m_room')
    .select(`
      room_id,
      hotel_id,
      room_type_id,
      room_number,
      floor,
      status_cd,
      is_deleted,
      created_at,
      updated_at,
      m_hotel (
        hotel_id,
        name,
        address,
        star_rating,
        owner_id
      ),
      m_room_type (
        room_type_id,
        type_name,
        max_adults,
        max_children,
        bed_type,
        room_size,
        default_price
      )
    `)
    .eq('room_id', roomId)
    .single();

  if (error || !room) {
    throw createError('Không tìm thấy phòng.', 404);
  }

  if (access.isVendor && room.m_hotel?.owner_id !== access.userId) {
    throw createError('Bạn không có quyền truy cập buồng phòng này.', 403);
  }

  // Fetch facilities
  let facilities = [];
  if (room.room_type_id) {
    const { data: facMaps } = await supabase
      .from('m_room_facility_map')
      .select('m_facility (facility_id, facility_name, icon, type)')
      .eq('room_type_id', room.room_type_id);
    facilities = (facMaps || []).map((fm) => fm.m_facility).filter(Boolean);
  }

  // Fetch hotel thumbnail image
  let hotelImageUrl = null;
  if (room.hotel_id) {
    const { data: hotelImages } = await supabase
      .from('m_hotel_image')
      .select('image_url')
      .eq('hotel_id', room.hotel_id)
      .order('is_thumbnail', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(1);
    hotelImageUrl = hotelImages?.[0]?.image_url || null;
  }

  const rt = room.m_room_type || {};
  const prefix = rt.type_name?.includes('Villa') ? 'VIL' : rt.type_name?.includes('Suite') ? 'STE' : 'DLX';
  const shortCode = (room.room_id || '').substring(0, 4).toUpperCase();
  const sku = `SKU: ${prefix}-${room.room_number || shortCode}`;

  return {
    ...room,
    sku,
    facilities,
    hotel_image_url: hotelImageUrl,
    is_active: !room.is_deleted && room.status_cd === 'AVAILABLE',
  };
};

/**
 * Create a new room in a hotel.
 */
const createRoom = async (input, access) => {
  if (!supabase) throw createError('Database client is not initialized.', 503);

  const { hotel_id, room_type_id, room_number, floor, status_cd = 'AVAILABLE' } = input;
  const cleanRoomNumber = normalizeRoomNumber(room_number);
  const normalizedStatus = status_cd || 'AVAILABLE';
  if (!hotel_id || !room_type_id || !cleanRoomNumber) {
    throw createError('Vui lòng điền đầy đủ khách sạn, hạng phòng và số phòng.', 400);
  }
  if (!VALID_ROOM_STATUSES.includes(normalizedStatus)) {
    throw createError(
      `Mã trạng thái "${normalizedStatus}" không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_STATUSES.join(', ')}`,
      400
    );
  }

  // Check vendor hotel ownership
  const hotels = await getAccessibleHotels(access);
  const isAccessible = hotels.some((h) => h.hotel_id === hotel_id);
  if (!isAccessible && access.isVendor) {
    throw createError('Bạn không có quyền thêm phòng vào khách sạn này.', 403);
  }

  // Verify room_type exists and is active
  const { data: rt, error: rtError } = await supabase
    .from('m_room_type')
    .select('room_type_id')
    .eq('room_type_id', room_type_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (rtError) {
    throw createError(`Không thể kiểm tra hạng phòng: ${rtError.message}`);
  }

  if (!rt) {
    throw createError('Hạng phòng đã chọn không tồn tại hoặc đã bị xóa.', 400);
  }

  // Check for duplicate room_number in the same hotel
  const { data: existing, error: duplicateCheckError } = await findDuplicateRoom(
    hotel_id,
    cleanRoomNumber
  );

  if (duplicateCheckError) {
    throw createError(`Không thể kiểm tra số phòng: ${duplicateCheckError.message}`);
  }

  if (existing) {
    throw createError(`Số phòng "${cleanRoomNumber}" đã tồn tại trong khách sạn này.`, 409);
  }

  const newRoom = {
    hotel_id,
    room_type_id,
    room_number: cleanRoomNumber,
    floor: (floor == null ? '' : String(floor).trim()) || 'Tầng 1',
    status_cd: normalizedStatus,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('m_room')
    .insert(newRoom)
    .select('*')
    .single();

  if (error) {
    throw createError(`Không thể tạo buồng phòng: ${error.message}`);
  }

  return getRoomById(data.room_id, access);
};

/**
 * Update room details.
 */
const updateRoom = async (roomId, updates, access) => {
  if (!supabase) throw createError('Database client is not initialized.', 503);

  const existingRoom = await getRoomById(roomId, access);

  const updatePayload = {
    updated_at: new Date().toISOString(),
  };

  let targetHotelId = existingRoom.hotel_id;
  if (updates.hotel_id !== undefined && updates.hotel_id !== existingRoom.hotel_id) {
    if (!updates.hotel_id || updates.hotel_id === 'ALL') {
      throw createError('Cơ sở khách sạn không hợp lệ.', 400);
    }
    const hotels = await getAccessibleHotels(access);
    const isAccessible = hotels.some((h) => h.hotel_id === updates.hotel_id);
    if (!isAccessible && access.isVendor) {
      throw createError('Bạn không có quyền chuyển phòng sang khách sạn này.', 403);
    }
    targetHotelId = updates.hotel_id;
    updatePayload.hotel_id = updates.hotel_id;
  }

  let nextRoomNumber = existingRoom.room_number;
  if (updates.room_number !== undefined) {
    const cleanNumber = normalizeRoomNumber(updates.room_number);
    if (!cleanNumber) throw createError('Số phòng không được để trống.', 400);
    nextRoomNumber = cleanNumber;
    updatePayload.room_number = cleanNumber;
  }

  const isRestoring = existingRoom.is_deleted && updates.is_deleted === false;
  const isHotelChanged = targetHotelId !== existingRoom.hotel_id;
  if (updates.room_number !== undefined || isRestoring || isHotelChanged) {
    const { data: duplicate, error: duplicateCheckError } = await findDuplicateRoom(
      targetHotelId,
      nextRoomNumber,
      roomId
    );

    if (duplicateCheckError) {
      throw createError(`Không thể kiểm tra số phòng: ${duplicateCheckError.message}`);
    }

    if (duplicate) {
      throw createError(`Số phòng "${nextRoomNumber}" đã tồn tại trong khách sạn này.`, 409);
    }
  }

  if (updates.floor !== undefined) {
    updatePayload.floor = (updates.floor == null ? '' : String(updates.floor).trim()) || 'Tầng 1';
  }

  if (updates.status_cd !== undefined) {
    if (!VALID_ROOM_STATUSES.includes(updates.status_cd)) {
      throw createError(
        `Mã trạng thái "${updates.status_cd}" không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_STATUSES.join(', ')}`,
        400
      );
    }
    updatePayload.status_cd = updates.status_cd;
  }

  if (updates.room_type_id !== undefined) {
    if (!updates.room_type_id) {
      throw createError('Hạng phòng không được để trống.', 400);
    }

    if (updates.room_type_id !== existingRoom.room_type_id) {
      const { data: roomType, error: roomTypeError } = await supabase
        .from('m_room_type')
        .select('room_type_id')
        .eq('room_type_id', updates.room_type_id)
        .eq('is_deleted', false)
        .maybeSingle();

      if (roomTypeError) {
        throw createError(`Không thể kiểm tra hạng phòng: ${roomTypeError.message}`);
      }
      if (!roomType) {
        throw createError('Hạng phòng đã chọn không tồn tại hoặc đã bị xóa.', 400);
      }
    }
    updatePayload.room_type_id = updates.room_type_id;
  }

  if (updates.is_deleted !== undefined) {
    if (
      updates.is_deleted === true &&
      ['OCCUPIED', 'BOOKED'].includes(String(existingRoom.status_cd).toUpperCase())
    ) {
      throw createError(
        'Không thể xóa buồng phòng đang có khách lưu trú. Vui lòng hoàn tất thủ tục trả phòng trước.',
        400
      );
    }
    updatePayload.is_deleted = Boolean(updates.is_deleted);
  }

  const { error } = await supabase
    .from('m_room')
    .update(updatePayload)
    .eq('room_id', roomId);

  if (error) {
    throw createError(`Không thể cập nhật buồng phòng: ${error.message}`);
  }

  return getRoomById(roomId, access);
};

/**
 * Soft delete a room.
 */
const softDeleteRoom = async (roomId, access) => {
  return updateRoom(roomId, { is_deleted: true, status_cd: 'LOCKED' }, access);
};

module.exports = {
  getAccessibleHotels,
  getRoomTypesForHotel,
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  softDeleteRoom,
};
