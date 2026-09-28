import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (response) => response.data.data;

export const getHotels = async (params) => {
  const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return unwrap(await api.get('/hotels', { params: query }));
};
export const getHotel = async (hotelId) => unwrap(await api.get(`/hotels/${encodeURIComponent(hotelId)}`));
export const getVendors = async () => unwrap(await api.get('/users/vendors'));
export const createHotel = async (payload) => unwrap(await api.post('/hotels', payload));
export const updateHotel = async (hotelId, payload) => unwrap(await api.put(`/hotels/${encodeURIComponent(hotelId)}`, payload));
export const approveHotel = async (hotelId) => unwrap(await api.post(`/hotels/${encodeURIComponent(hotelId)}/approve`));
export const requestHotelDeleteOtp = async (hotelId) => unwrap(await api.post(`/hotels/${encodeURIComponent(hotelId)}/delete/request-otp`));
export const deleteHotel = async (hotelId, otp) => unwrap(await api.delete(`/hotels/${encodeURIComponent(hotelId)}`, { data: otp ? { otp } : {} }));
