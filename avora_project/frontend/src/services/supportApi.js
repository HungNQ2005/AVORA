import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('avora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (response) => response.data.data;
const ticketPath = (ticketId) => `/support/tickets/${encodeURIComponent(ticketId)}`;

export const getSupportCategories = async () => unwrap(await api.get('/support/categories'));
export const getSupportCounts = async () => unwrap(await api.get('/support/counts'));
export const listSupportTickets = async (params = {}) => unwrap(await api.get('/support/tickets', { params }));
export const getSupportTicket = async (ticketId) => unwrap(await api.get(ticketPath(ticketId)));

const withAttachments = (data, files = []) => {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.append(key, value);
  });
  files.forEach((file) => body.append('attachments', file));
  return body;
};

export const createSupportTicket = async (data, files) => unwrap(await api.post(
  '/support/tickets',
  withAttachments(data, files),
  { headers: { 'Content-Type': 'multipart/form-data' } },
));

export const replyToSupportTicket = async (ticketId, data, files) => unwrap(await api.post(
  `${ticketPath(ticketId)}/replies`,
  withAttachments(data, files),
  { headers: { 'Content-Type': 'multipart/form-data' } },
));

export const updateSupportTicketStatus = async (ticketId, data) => unwrap(await api.patch(`${ticketPath(ticketId)}/status`, data));
export const claimSupportTicket = async (ticketId) => unwrap(await api.post(`${ticketPath(ticketId)}/claim`));
export const deleteSupportTicket = async (ticketId) => unwrap(await api.delete(ticketPath(ticketId)));
export const deleteSupportAttachment = async (ticketId, key) => unwrap(await api.delete(`${ticketPath(ticketId)}/attachments/${encodeURIComponent(key)}`));
export const chatWithSupportAI = async (ticketId, data) => unwrap(await api.post(`${ticketPath(ticketId)}/ai-chat`, data));

export const loadSupportImage = async (attachmentUrl, signal) => {
  const apiPath = attachmentUrl.replace(/^\/api(?=\/)/, '');
  const response = await api.get(apiPath, { responseType: 'blob', signal });
  return URL.createObjectURL(response.data);
};

export const subscribeToSupportTicket = async (ticketId, signal, onUpdate) => {
  const token = localStorage.getItem('avora_token');
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const response = await fetch(`${API_BASE}/api${ticketPath(ticketId)}/events`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error('Không thể kết nối cập nhật phiếu hỗ trợ theo thời gian thực.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    if (events.some((event) => event.startsWith('event: update'))) onUpdate();
  }
};
