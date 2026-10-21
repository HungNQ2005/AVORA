export const MAX_RANGE_DAYS = 366;

const STATUS_LABELS = {
  CONFIRMED: 'Đã xác nhận',
  PENDING: 'Chờ xử lý',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn thành',
  CHECKED_IN: 'Đã nhận phòng',
  CHECKED_OUT: 'Đã trả phòng',
};

export const getStatusLabel = (code) => STATUS_LABELS[code] || code || '—';

export const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

export const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

/** YYYY-MM-DD from a local Date. */
export const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** DD/MM/YYYY from YYYY-MM-DD. */
export const formatDisplayDate = (key) => {
  if (!key) return '';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

export const countDays = (from, to) => {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
};

/** Validate range; returns an error message or ''. */
export const validateRange = (from, to) => {
  if (!from || !to) return 'Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.';
  if (from > to) return 'Ngày bắt đầu không được sau ngày kết thúc.';
  if (countDays(from, to) > MAX_RANGE_DAYS) {
    return `Khoảng thời gian thống kê tối đa ${MAX_RANGE_DAYS} ngày.`;
  }
  return '';
};

/** Revenue/bookings per day, or per month when the range is long (> 62 days). */
export const buildTimeSeries = (byDay = [], days = 0) => {
  if (days <= 62) {
    return byDay.map((row) => ({
      key: row.date,
      label: row.date.slice(8, 10) + '/' + row.date.slice(5, 7),
      bookings: row.bookings,
      revenue: row.revenue,
    }));
  }
  const months = new Map();
  byDay.forEach((row) => {
    const key = row.date.slice(0, 7);
    const item = months.get(key) || { key, label: `${key.slice(5, 7)}/${key.slice(0, 4)}`, bookings: 0, revenue: 0 };
    item.bookings += row.bookings;
    item.revenue += row.revenue;
    months.set(key, item);
  });
  return [...months.values()];
};
