import { API_ENDPOINTS } from '../../../constants/apiEndpoints';

const FACILITIES_URL = API_ENDPOINTS.AMENITIES || `${API_ENDPOINTS.FACILITIES}`;

/**
 * Fetch list of amenities / facilities with search, filter, and stats.
 */
export const fetchAmenities = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.category && params.category !== 'ALL') query.append('category', params.category);
  if (params.scope && params.scope !== 'ALL') query.append('scope', params.scope);
  if (params.highlight_only) query.append('highlight_only', 'true');
  if (params.pricing && params.pricing !== 'ALL') query.append('pricing', params.pricing);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.sort) query.append('sort', params.sort);

  const url = `${FACILITIES_URL}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách tiện ích.');
  }

  return json.data;
};

/**
 * Fetch a single amenity / facility by ID.
 */
export const fetchAmenityById = async (id) => {
  const response = await fetch(`${FACILITIES_URL}/${encodeURIComponent(id)}`);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải chi tiết tiện ích.');
  }

  return json.data;
};

/**
 * Create a new amenity / facility.
 */
export const createAmenity = async (amenityData) => {
  const response = await fetch(FACILITIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(amenityData),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tạo tiện ích mới.');
  }

  return json.data;
};

/**
 * Update an existing amenity / facility.
 */
export const updateAmenity = async (id, updates) => {
  const response = await fetch(`${FACILITIES_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể cập nhật tiện ích.');
  }

  return json.data;
};

/**
 * Delete an amenity / facility.
 */
export const deleteAmenity = async (id) => {
  const response = await fetch(`${FACILITIES_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể xóa tiện ích.');
  }

  return json.data;
};
