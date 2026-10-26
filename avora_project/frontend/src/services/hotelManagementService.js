import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (response) => response.data.data;

export const HOTEL_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const HOTEL_IMAGE_MAX_COUNT = 5;
export const HOTEL_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const validateHotelImageFile = (file) => {
  if (!file) return 'Vui lòng chọn tệp hình ảnh.';
  if (!HOTEL_IMAGE_ACCEPTED_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.';
  if (file.size > HOTEL_IMAGE_MAX_SIZE_BYTES) return 'Ảnh vượt quá dung lượng tối đa 2 MB.';
  return null;
};

export const getHotels = async (params) => {
  const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return unwrap(await api.get('/hotels', { params: query }));
};
export const getHotel = async (hotelId) => unwrap(await api.get(`/hotels/${encodeURIComponent(hotelId)}`));
export const createHotel = async (payload) => unwrap(await api.post('/hotels', payload));
export const updateHotel = async (hotelId, payload) => unwrap(await api.put(`/hotels/${encodeURIComponent(hotelId)}`, payload));
export const approveHotel = async (hotelId) => unwrap(await api.post(`/hotels/${encodeURIComponent(hotelId)}/approve`));
export const deleteHotel = async (hotelId) => unwrap(await api.delete(`/hotels/${encodeURIComponent(hotelId)}`));

export const uploadHotelImage = async (hotelId, file, currentImageCount) => {
  if (currentImageCount >= HOTEL_IMAGE_MAX_COUNT) {
    throw new Error(`Mỗi khách sạn chỉ được tải lên tối đa ${HOTEL_IMAGE_MAX_COUNT} hình ảnh.`);
  }
  const validationError = validateHotelImageFile(file);
  if (validationError) throw new Error(validationError);
  const body = new FormData();
  body.append('image', file);
  return unwrap(await api.post(`/hotels/${encodeURIComponent(hotelId)}/images`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));
};
export const deleteHotelImage = async (hotelId, imageId) => unwrap(await api.delete(`/hotels/${encodeURIComponent(hotelId)}/images/${encodeURIComponent(imageId)}`));
export const setHotelImageThumbnail = async (hotelId, imageId) => unwrap(await api.post(`/hotels/${encodeURIComponent(hotelId)}/images/${encodeURIComponent(imageId)}/thumbnail`));

export const getCities = async () => unwrap(await api.get('/locations/cities'));
export const getDistricts = async (cityId) => unwrap(await api.get('/locations/districts', { params: { city_id: cityId } }));
export const getWards = async (districtId) => unwrap(await api.get('/locations/wards', { params: { district_id: districtId } }));
