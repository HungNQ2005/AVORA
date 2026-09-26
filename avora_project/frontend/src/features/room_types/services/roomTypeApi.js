import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

/**
 * Fetch list of room types with optional filtering.
 * @param {{ hotel_id?: string, search?: string, include_deleted?: boolean }} params
 */
export const fetchRoomTypes = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.hotel_id && params.hotel_id !== 'ALL') {
    query.append('hotel_id', params.hotel_id);
  }
  if (params.search) {
    query.append('search', params.search);
  }
  if (params.include_deleted) {
    query.append('include_deleted', 'true');
  }

  const url = `${API_ENDPOINTS.ROOM_TYPES}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách hạng phòng.');
  }

  return json.data;
};

/**
 * Fetch single room type detail by ID.
 * @param {string} id
 */
export const fetchRoomTypeById = async (id) => {
  const response = await fetch(`${API_ENDPOINTS.ROOM_TYPES}/${encodeURIComponent(id)}`);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải thông tin chi tiết hạng phòng.');
  }

  return json.data;
};

const sendRoomTypeRequest = async (url, options, fallbackMessage) => {
  const response = await fetch(url, options);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || fallbackMessage);
  }

  return json.data;
};

export const createRoomType = async (roomType) => {
  return sendRoomTypeRequest(
    API_ENDPOINTS.ROOM_TYPES,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomType),
    },
    'Không thể tạo hạng phòng.'
  );
};

export const updateRoomType = async (id, updates) => {
  return sendRoomTypeRequest(
    `${API_ENDPOINTS.ROOM_TYPES}/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
    'Không thể cập nhật hạng phòng.'
  );
};

export const softDeleteRoomType = async (id) => {
  return sendRoomTypeRequest(
    `${API_ENDPOINTS.ROOM_TYPES}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Không thể xóa hạng phòng.'
  );
};

/**
 * Fetch list of hotels for facility selector dropdown.
 */
export const fetchHotels = async () => {
  const response = await fetch(API_ENDPOINTS.HOTELS);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách khách sạn.');
  }

  return json.data;
};

/**
 * Fetch list of facilities
 */
export const fetchFacilities = async () => {
  const response = await fetch(API_ENDPOINTS.FACILITIES);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách tiện ích.');
  }

  return json.data;
};
