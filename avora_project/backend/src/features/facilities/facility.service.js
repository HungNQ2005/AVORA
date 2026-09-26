'use strict';

const supabase = require('../../config/supabaseClient');

const getDatabaseError = (message, databaseError) => {
  const error = new Error(
    `${message} do lỗi cơ sở dữ liệu (${databaseError?.code || databaseError?.message || 'không xác định'}).`
  );
  error.statusCode = 500;
  return error;
};

const ensureClient = () => {
  if (!supabase) {
    throw new Error('Database client is not initialized.');
  }
};

const parseFacilityNames = (rawName) => {
  if (!rawName) return { vi: '', en: '' };

  if (rawName.includes(' / ')) {
    const parts = rawName.split(' / ');
    return { vi: parts[0].trim(), en: parts.slice(1).join(' / ').trim() };
  }
  if (rawName.includes(' | ')) {
    const parts = rawName.split(' | ');
    return { vi: parts[0].trim(), en: parts.slice(1).join(' | ').trim() };
  }

  return { vi: rawName, en: '' };
};

const inferCategory = (facility) => {
  const text = `${facility.facility_name || ''} ${facility.icon || ''} ${facility.type || ''}`.toLowerCase();

  if (text.includes('bơi') || text.includes('pool') || text.includes('bể bơi') || text.includes('giải trí')) {
    return 'Giải trí & Bể bơi';
  }
  if (text.includes('spa') || text.includes('tắm') || text.includes('bath') || text.includes('massage') || text.includes('sức khỏe')) {
    return 'Sức khỏe & Spa';
  }
  if (text.includes('ăn') || text.includes('ẩm thực') || text.includes('restaurant') || text.includes('bar') || text.includes('uống') || text.includes('coffee') || text.includes('food')) {
    return 'Ẩm thực & Đồ uống';
  }
  if (text.includes('wifi') || text.includes('mạng') || text.includes('internet') || text.includes('tv') || text.includes('điện thoại') || text.includes('công nghệ')) {
    return 'Công nghệ & Kết nối';
  }
  if (text.includes('xe') || text.includes('shuttle') || text.includes('đưa đón') || text.includes('đậu xe') || text.includes('parking')) {
    return 'Di chuyển & Vận chuyển';
  }
  if (text.includes('phòng') || text.includes('room') || text.includes('giường') || text.includes('bed') || text.includes('tủ') || text.includes('balcony')) {
    return 'Dịch vụ buồng phòng';
  }

  return 'Tiện ích chung';
};

const resolveScope = (facility) => {
  const rawType = String(facility.type || '').toUpperCase();
  const isHotelScope =
    rawType === 'HOTEL' ||
    rawType === 'RESORT' ||
    rawType.includes('KHÁCH SẠN') ||
    rawType.includes('RESORT');

  return {
    isHotelScope,
    scope_type: isHotelScope ? 'HOTEL' : 'ROOM',
    scope_label: isHotelScope ? 'Khách sạn / Resort' : 'Trong buồng phòng',
    applied_unit: isHotelScope ? 'Cơ sở lưu trú' : 'Hạng phòng',
  };
};

const resolveCode = (facility) => {
  if (facility.code) return String(facility.code);
  if (facility.icon) return String(facility.icon);
  return String(facility.facility_id || '');
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const mapFacility = (facility, mappingCount = 0) => {
  const names = parseFacilityNames(facility.facility_name);
  const scope = resolveScope(facility);
  const code = resolveCode(facility);
  const isPaid = hasOwn(facility, 'is_paid')
    ? Boolean(facility.is_paid)
    : hasOwn(facility, 'price')
      ? Number(facility.price) > 0
      : false;
  const isHighlight = hasOwn(facility, 'is_highlight') ? Boolean(facility.is_highlight) : false;
  const isActive = hasOwn(facility, 'is_deleted')
    ? facility.is_deleted !== true
    : hasOwn(facility, 'status')
      ? String(facility.status).toUpperCase() !== 'INACTIVE'
      : true;

  return {
    facility_id: facility.facility_id,
    facility_name: facility.facility_name,
    icon: facility.icon || '',
    type: facility.type || '',
    code,
    svgTag: facility.icon || code,
    name_vi: names.vi || facility.facility_name || '',
    name_en: names.en,
    scope_type: scope.scope_type,
    scope_label: scope.scope_label,
    category: inferCategory(facility),
    applied_count: mappingCount,
    applied_unit: scope.applied_unit,
    is_highlight: isHighlight,
    is_active: isActive,
    is_paid: isPaid,
    pricing_label: isPaid ? 'Có phụ phí' : 'Miễn phí',
    icon_key: facility.icon || '',
    created_at: facility.created_at || null,
    updated_at: facility.updated_at || null,
  };
};

const getMappingCounts = async () => {
  const { data: facMaps, error: mapError } = await supabase
    .from('m_room_facility_map')
    .select('facility_id');

  if (mapError) {
    throw getDatabaseError('Không thể đọc liên kết tiện ích hạng phòng', mapError);
  }

  const mappingCounts = {};
  (facMaps || []).forEach((map) => {
    if (!map.facility_id) return;
    mappingCounts[map.facility_id] = (mappingCounts[map.facility_id] || 0) + 1;
  });

  return mappingCounts;
};

const getFacilities = async (filters = {}) => {
  ensureClient();

  const { data: rawFacilities, error: facError } = await supabase
    .from('m_facility')
    .select('*')
    .order('facility_name', { ascending: true });

  if (facError) {
    throw getDatabaseError('Không thể đọc danh mục tiện ích', facError);
  }

  const facilities = rawFacilities || [];
  const mappingCounts = await getMappingCounts();

  let totalRoomTypes = 0;
  const { count: roomTypeCount, error: roomTypeCountError } = await supabase
    .from('m_room_type')
    .select('room_type_id', { count: 'exact', head: true });

  if (!roomTypeCountError) {
    totalRoomTypes = roomTypeCount || 0;
  }

  const enrichedFacilities = facilities.map((facility) =>
    mapFacility(facility, mappingCounts[facility.facility_id] || 0)
  );

  const total = enrichedFacilities.length;
  const roomCount = enrichedFacilities.filter((f) => f.scope_type === 'ROOM').length;
  const hotelCount = enrichedFacilities.filter((f) => f.scope_type === 'HOTEL').length;
  const highlightCount = enrichedFacilities.filter((f) => f.is_highlight).length;
  const activeCount = enrichedFacilities.filter((f) => f.is_active).length;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newFacilitiesCount = enrichedFacilities.filter((f) => {
    if (!f.created_at) return false;
    const created = new Date(f.created_at).getTime();
    return Number.isFinite(created) && created >= thirtyDaysAgo;
  }).length;

  const categorySet = new Set(enrichedFacilities.map((f) => f.category));
  const categories = Array.from(categorySet);
  const sortedByPopularity = [...enrichedFacilities].sort((a, b) => b.applied_count - a.applied_count);
  const mostPopular = sortedByPopularity[0] || null;
  const maxApplied = mostPopular ? mostPopular.applied_count : 0;
  const mostPopularRate = totalRoomTypes > 0
    ? `${Math.round((maxApplied / totalRoomTypes) * 1000) / 10}%`
    : '0%';

  const stats = {
    totalFacilities: total,
    newFacilitiesCount,
    roomFacilitiesCount: roomCount,
    hotelFacilitiesCount: hotelCount,
    highlightCount,
    categoryCount: categories.length,
    categories,
    activeCount,
    inactiveCount: total - activeCount,
    mostPopularFacility: mostPopular
      ? {
        name: mostPopular.name_vi,
        rate: mostPopularRate,
      }
      : {
        name: '',
        rate: '0%',
      },
  };

  let filtered = [...enrichedFacilities];

  if (filters.search) {
    const s = filters.search.toLowerCase().trim();
    filtered = filtered.filter((f) =>
      f.name_vi?.toLowerCase().includes(s) ||
      f.name_en?.toLowerCase().includes(s) ||
      f.code?.toLowerCase().includes(s) ||
      f.category?.toLowerCase().includes(s) ||
      f.type?.toLowerCase().includes(s)
    );
  }

  if (filters.category && filters.category !== 'ALL') {
    filtered = filtered.filter((f) => f.category === filters.category);
  }

  if (filters.scope && filters.scope !== 'ALL') {
    filtered = filtered.filter((f) => f.scope_type === filters.scope);
  }

  if (filters.highlight_only) {
    filtered = filtered.filter((f) => f.is_highlight);
  }

  if (filters.pricing && filters.pricing !== 'ALL') {
    if (filters.pricing === 'PAID') {
      filtered = filtered.filter((f) => f.is_paid);
    } else if (filters.pricing === 'FREE') {
      filtered = filtered.filter((f) => !f.is_paid);
    }
  }

  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'ACTIVE') {
      filtered = filtered.filter((f) => f.is_active);
    } else if (filters.status === 'INACTIVE') {
      filtered = filtered.filter((f) => !f.is_active);
    }
  }

  if (filters.sort === 'NAME_ASC') {
    filtered.sort((a, b) => a.name_vi.localeCompare(b.name_vi, 'vi'));
  } else if (filters.sort === 'NAME_DESC') {
    filtered.sort((a, b) => b.name_vi.localeCompare(a.name_vi, 'vi'));
  } else if (filters.sort === 'CODE_ASC') {
    filtered.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  } else {
    filtered.sort((a, b) => b.applied_count - a.applied_count);
  }

  return {
    facilities: filtered,
    total: filtered.length,
    stats,
  };
};

const getFacilityById = async (id) => {
  ensureClient();

  const { data, error } = await supabase
    .from('m_facility')
    .select('*')
    .eq('facility_id', id)
    .maybeSingle();

  if (error) {
    throw getDatabaseError('Không thể đọc tiện ích', error);
  }

  if (!data) {
    const notFound = new Error('Không tìm thấy tiện ích.');
    notFound.statusCode = 404;
    throw notFound;
  }

  const mappingCounts = await getMappingCounts();
  return mapFacility(data, mappingCounts[data.facility_id] || 0);
};

const createFacility = async ({ facility_name, type, icon }) => {
  ensureClient();

  if (!facility_name || !String(facility_name).trim()) {
    const error = new Error('Tên tiện ích không được để trống.');
    error.statusCode = 400;
    throw error;
  }

  const newRecord = {
    facility_name: String(facility_name).trim(),
    type: type ? String(type).trim().toUpperCase() : 'SERVICE',
    icon: icon ? String(icon).trim() : 'service-icon',
  };

  const { data, error } = await supabase
    .from('m_facility')
    .insert([newRecord])
    .select('*')
    .single();

  if (error) {
    throw getDatabaseError('Không thể tạo tiện ích mới', error);
  }

  return mapFacility(data, 0);
};

const updateFacility = async (id, { facility_name, type, icon }) => {
  ensureClient();

  const updates = {};
  if (facility_name !== undefined) updates.facility_name = String(facility_name).trim();
  if (type !== undefined) updates.type = String(type).trim().toUpperCase();
  if (icon !== undefined) updates.icon = String(icon).trim();
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('m_facility')
    .update(updates)
    .eq('facility_id', id)
    .select('*')
    .single();

  if (error) {
    throw getDatabaseError('Không thể cập nhật tiện ích', error);
  }

  const mappingCounts = await getMappingCounts();
  return mapFacility(data, mappingCounts[data.facility_id] || 0);
};

const deleteFacility = async (id) => {
  ensureClient();

  const { error } = await supabase
    .from('m_facility')
    .delete()
    .eq('facility_id', id);

  if (error) {
    throw getDatabaseError('Không thể xóa tiện ích', error);
  }

  return { success: true };
};

module.exports = {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
};
