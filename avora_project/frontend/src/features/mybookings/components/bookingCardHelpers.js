/**
 * Safely parse ISO 8601 timestamps without timezone suffix as UTC Date
 */
export const parseIsoToDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr).trim();
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Format currency in VND
 */
export const formatVnd = (amount) => {
  return `${Number(amount || 0).toLocaleString('vi-VN')} đ`;
};

/**
 * Format Vietnamese date e.g. "12/07/2024 (Thứ Sáu)"
 */
export const formatVnStayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy} (${dayName})`;
};

export const PAYMENT_HOLD_MS = 10 * 60 * 1000;

export const getBookingPaymentDeadline = (booking) => {
  if (!booking?.created_at) return null;
  const createdAt = parseIsoToDate(booking.created_at);
  if (!createdAt) return null;
  return new Date(createdAt.getTime() + PAYMENT_HOLD_MS);
};

export const getBookingCountdown = (booking, currentTime) => {
  const deadline = getBookingPaymentDeadline(booking);
  if (!deadline) return null;

  const remainingMs = Math.max(0, deadline.getTime() - currentTime);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    deadline,
    remainingMs,
    totalSeconds,
    minutes,
    seconds,
    expired: remainingMs <= 0,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
};
