import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

const readResponse = async (response, fallback) => {
  const json = await response.json();
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || fallback);
  }
  return json.data;
};

export const listMoments = async ({ page = 1, limit = 10 } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return readResponse(await authenticatedFetch(`${API_ENDPOINTS.MOMENTS}?${query}`), 'Không thể tải danh sách moment.');
};

export const getBannerMoments = async () => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENTS_BANNER), 'Không thể tải moment mới nhất.')
);

export const listAdminMoments = async ({
  page = 1,
  limit = 12,
  published_from,
  published_to,
  hotel,
  author,
} = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (published_from) query.set('published_from', published_from);
  if (published_to) query.set('published_to', published_to);
  if (hotel) query.set('hotel', hotel);
  if (author) query.set('author', author);
  return readResponse(
    await authenticatedFetch(`${API_ENDPOINTS.MOMENTS_ADMIN}?${query}`),
    'Không thể tải danh sách Moment quản trị.'
  );
};

export const adminRemoveMoment = async (id, reason = '') => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENT_ADMIN_REMOVE(id), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }), 'Không thể gỡ Moment.')
);

export const getMoment = async (id) => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENT(id)), 'Không thể tải moment.')
);

export const getEligibleMomentBookings = async () => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENTS_ELIGIBLE_BOOKINGS), 'Không thể tải danh sách đặt phòng đủ điều kiện.')
);

export const createMoment = async ({ bookingId, message, image }) => {
  const body = new FormData();
  body.set('booking_id', bookingId);
  body.set('message', message);
  body.set('image', image);
  return readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENTS, {
    method: 'POST',
    body,
  }), 'Không thể tạo moment.');
};

export const updateMoment = async ({ id, message, image }) => {
  const body = new FormData();
  body.set('message', message);
  if (image) body.set('image', image);
  return readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENT(id), {
    method: 'PUT',
    body,
  }), 'Không thể cập nhật moment.');
};

export const setMomentVisibility = async (id, isHidden) => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENT_VISIBILITY(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_deleted: isHidden }),
  }), 'Không thể thay đổi trạng thái moment.')
);

export const toggleMomentLike = async (id) => (
  readResponse(await authenticatedFetch(API_ENDPOINTS.MOMENT_LIKE(id), {
    method: 'POST',
  }), 'Không thể cập nhật lượt thích.')
);
