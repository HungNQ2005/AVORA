export const MAX_RANGE_DAYS = 366;

const STATUS_LABELS = {
  CFM: 'Đã xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PND: 'Chờ thanh toán',
  PENDING: 'Chờ thanh toán',
  CAN: 'Đã hủy',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',
  DA_HUY: 'Đã hủy',
  COM: 'Đã hoàn thành',
  COMPLETED: 'Đã hoàn thành',
  CHK: 'Đã nhận phòng',
  CHECKED_IN: 'Đã nhận phòng',
  CIN: 'Đã nhận phòng',
  COUT: 'Đã trả phòng',
  CHECKED_OUT: 'Đã trả phòng',
  UNKNOWN: 'Chưa xác định',
};

export const getStatusLabel = (code) => {
  if (!code) return '—';
  const key = String(code).trim().toUpperCase();
  return STATUS_LABELS[key] || code;
};

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

export const getMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month); // 1-12
  const mStr = String(m).padStart(2, '0');
  const from = `${y}-${mStr}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

export const getYearRange = (year) => {
  const y = Number(year);
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`,
  };
};

/** Revenue/bookings per day (continuous series when range given), or per month when the range is long (> 62 days). */
export const buildTimeSeries = (byDay = [], days = 0, rangeFrom = null, rangeTo = null) => {
  if (days <= 62 && rangeFrom && rangeTo) {
    const dayMap = new Map();
    (byDay || []).forEach((row) => {
      if (row?.date) dayMap.set(row.date, row);
    });

    const result = [];
    const cur = new Date(`${rangeFrom}T00:00:00Z`);
    const end = new Date(`${rangeTo}T00:00:00Z`);

    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const existing = dayMap.get(key);
      result.push({
        key,
        label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
        bookings: existing ? existing.bookings : 0,
        revenue: existing ? existing.revenue : 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return result;
  }

  if (days <= 62) {
    return (byDay || []).map((row) => ({
      key: row.date,
      label: row.date.slice(8, 10) + '/' + row.date.slice(5, 7),
      bookings: row.bookings,
      revenue: row.revenue,
    }));
  }

  // Range > 62 days (e.g. Year view): Group by month and generate full timeline of months
  if (rangeFrom && rangeTo) {
    const monthMap = new Map();
    (byDay || []).forEach((row) => {
      if (!row?.date) return;
      const mKey = row.date.slice(0, 7);
      const current = monthMap.get(mKey) || { bookings: 0, revenue: 0 };
      current.bookings += row.bookings;
      current.revenue += row.revenue;
      monthMap.set(mKey, current);
    });

    const result = [];
    const cur = new Date(`${rangeFrom.slice(0, 7)}-01T00:00:00Z`);
    const end = new Date(`${rangeTo.slice(0, 7)}-01T00:00:00Z`);

    while (cur <= end) {
      const mKey = cur.toISOString().slice(0, 7);
      const existing = monthMap.get(mKey);
      result.push({
        key: mKey,
        label: `T${cur.getUTCMonth() + 1}/${cur.getUTCFullYear()}`,
        bookings: existing ? existing.bookings : 0,
        revenue: existing ? existing.revenue : 0,
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return result;
  }

  const months = new Map();
  (byDay || []).forEach((row) => {
    const key = row.date.slice(0, 7);
    const item = months.get(key) || { key, label: `${key.slice(5, 7)}/${key.slice(0, 4)}`, bookings: 0, revenue: 0 };
    item.bookings += row.bookings;
    item.revenue += row.revenue;
    months.set(key, item);
  });
  return [...months.values()];
};
