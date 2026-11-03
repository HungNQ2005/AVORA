'use strict';

const supabase = require('../../config/supabaseClient');

const PAGE_SIZE = 1000;
const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;
const VN_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const CANCELLED_CODES = ['CAN', 'CANCELLED', 'CANCELED', 'DA_HUY'];

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureClient = () => {
  if (!supabase) {
    throw createError(503, 'Database client is not initialized.');
  }
};

const throwDatabaseError = (message, error) => {
  console.error(`[Statistics] ${message}:`, error.message);
  throw createError(500, message);
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Ensure database timestamps without timezone offsets are treated as UTC ISO strings with trailing Z */
const ensureUtcIsoString = (val) => {
  if (!val) return val;
  const s = String(val).trim().replace(' ', 'T');
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    return `${s}Z`;
  }
  return s;
};

/** Format a Date as YYYY-MM-DD using Vietnam time (UTC+7). */
const toVnDateKey = (value) => {
  if (!value) return null;
  const utcVal = typeof value === 'string' ? ensureUtcIsoString(value) : value;
  const d = new Date(utcVal);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/**
 * Calculate the previous period dates and comparison label based on periodType or date range.
 * - 'month': Previous calendar month (e.g. 2026-10-01 to 2026-10-31 -> 2026-09-01 to 2026-09-30)
 * - 'year': Previous calendar year (e.g. 2026-01-01 to 2026-12-31 -> 2025-01-01 to 2025-12-31)
 * - 'custom': Exact length shift backward
 */
const getPreviousPeriod = (fromKey, toKey, periodType) => {
  const normType = String(periodType || '').trim().toLowerCase();

  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  const lastDayOfCurMonth = new Date(Date.UTC(y1, m1, 0)).getUTCDate();
  const isFullMonth = (y1 === y2 && m1 === m2 && d1 === 1 && d2 === lastDayOfCurMonth);
  const isFullYear = (y1 === y2 && m1 === 1 && d1 === 1 && m2 === 12 && d2 === 31);

  if (normType === 'month' || isFullMonth) {
    const prevYear = m1 === 1 ? y1 - 1 : y1;
    const prevMonth = m1 === 1 ? 12 : m1 - 1;
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const prevFrom = `${prevYear}-${prevMonthStr}-01`;
    const lastDayOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    const prevTo = `${prevYear}-${prevMonthStr}-${String(lastDayOfPrevMonth).padStart(2, '0')}`;
    return {
      from: prevFrom,
      to: prevTo,
      days: lastDayOfPrevMonth,
      label: `Tháng ${prevMonthStr}/${prevYear}`,
      periodType: 'month',
      comparisonLabel: 'so với tháng trước',
    };
  }

  if (normType === 'year' || isFullYear) {
    const prevYear = y1 - 1;
    const prevFrom = `${prevYear}-01-01`;
    const prevTo = `${prevYear}-12-31`;
    const isLeap = (prevYear % 4 === 0 && prevYear % 100 !== 0) || prevYear % 400 === 0;
    return {
      from: prevFrom,
      to: prevTo,
      days: isLeap ? 366 : 365,
      label: `Năm ${prevYear}`,
      periodType: 'year',
      comparisonLabel: 'so với năm trước',
    };
  }

  // Custom range fallback: shift backwards by exact same number of days
  const fromTime = new Date(`${fromKey}T00:00:00Z`).getTime();
  const days = Math.round((new Date(`${toKey}T00:00:00Z`) - fromTime) / DAY_MS) + 1;
  const prevToTime = fromTime - DAY_MS;
  const prevFromTime = prevToTime - (days - 1) * DAY_MS;
  const prevFrom = toVnDateKey(prevFromTime);
  const prevTo = toVnDateKey(prevToTime);

  return {
    from: prevFrom,
    to: prevTo,
    days,
    label: `${prevFrom} - ${prevTo}`,
    periodType: 'custom',
    comparisonLabel: 'so với kỳ trước',
  };
};

/**
 * Normalise and validate the date range. Defaults to the last 30 days (VN time).
 * @returns {{ from: string, to: string, days: number }}
 */
const resolveDateRange = (from, to) => {
  const today = toVnDateKey(Date.now());
  let toKey = to || today;
  let fromKey = from;

  if (to && !isValidDateKey(to)) throw createError(400, 'Ngày kết thúc không hợp lệ (YYYY-MM-DD).');
  if (from && !isValidDateKey(from)) throw createError(400, 'Ngày bắt đầu không hợp lệ (YYYY-MM-DD).');

  if (!fromKey) {
    fromKey = toVnDateKey(new Date(`${toKey}T00:00:00Z`).getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);
  }

  if (fromKey > toKey) throw createError(400, 'Ngày bắt đầu không được sau ngày kết thúc.');

  const days = Math.round((new Date(`${toKey}T00:00:00Z`) - new Date(`${fromKey}T00:00:00Z`)) / DAY_MS) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw createError(400, `Khoảng thời gian thống kê tối đa ${MAX_RANGE_DAYS} ngày.`);
  }

  return { from: fromKey, to: toKey, days };
};

/** Read every page of a Supabase query. `buildQuery(rangeFrom, rangeTo)` must return a query. */
const fetchAllPages = async (buildQuery, errorMessage) => {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);
    if (error) throwDatabaseError(errorMessage, error);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
};

/**
 * Accessible hotels for statistics (hotels owned by vendor, or all non-deleted hotels).
 * READ-ONLY.
 */
const getStatisticsHotels = async (vendorId) => {
  ensureClient();

  let query = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, star_rating, hotel_status, owner_id')
    .eq('is_deleted', false);

  if (vendorId) {
    query = query.eq('owner_id', vendorId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) throwDatabaseError('Không thể tải danh sách khách sạn', error);
  return data || [];
};

/** Resolve booking status code -> display code name via m_system_code. Preloads BOOKING_STS codes. */
const getStatusNames = async () => {
  const names = {};
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BOOKING_STS');

  if (error) {
    console.warn('[Statistics] Không thể tải mã trạng thái từ m_system_code:', error.message);
    return names;
  }

  (data || []).forEach((row) => {
    const cd = String(row.code_cd || '').trim();
    const nm = String(row.code_name || '').trim().toUpperCase();
    if (cd) names[cd] = nm;
    if (nm) names[nm] = nm;
  });
  return names;
};

/**
 * Aggregate booking / review statistics for one hotel in a date range.
 * READ-ONLY: only SELECT queries are issued.
 *
 * Revenue rule: sum of t_booking.total_amount for bookings whose status is not CANCELLED.
 * Includes prior period comparison of exact same duration.
 *
 * @param {{ hotelId: string, from?: string, to?: string, vendorId?: string }} params
 */
const getHotelOverview = async ({ hotelId, from, to, periodType, vendorId }) => {
  ensureClient();
  const range = resolveDateRange(from, to);
  const prevInfo = getPreviousPeriod(range.from, range.to, periodType);

  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, star_rating, hotel_status, owner_id')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);

  if (vendorId) {
    hotelQuery = hotelQuery.eq('owner_id', vendorId);
  }

  const { data: hotel, error: hotelError } = await hotelQuery.maybeSingle();

  if (hotelError) throwDatabaseError('Không thể tải thông tin khách sạn', hotelError);
  if (!hotel) {
    throw createError(403, 'Bạn không có quyền xem thống kê của khách sạn này hoặc khách sạn không tồn tại.');
  }

  const startIso = `${range.from}T00:00:00.000${VN_OFFSET}`;
  const endIso = `${range.to}T23:59:59.999${VN_OFFSET}`;

  // Prior period calculated from calendar logic
  const prevFrom = prevInfo.from;
  const prevTo = prevInfo.to;
  const prevStartIso = `${prevFrom}T00:00:00.000${VN_OFFSET}`;
  const prevEndIso = `${prevTo}T23:59:59.999${VN_OFFSET}`;

  const [bookings, prevBookings, reviews] = await Promise.all([
    fetchAllPages(
      (rf, rt) => supabase
        .from('t_booking')
        .select(
          'booking_id, total_amount, booking_status_cd, created_at, '
          + 't_booking_detail(quantity, m_room_type(type_name))'
        )
        .eq('hotel_id', hotelId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .order('booking_id', { ascending: true })
        .range(rf, rt),
      'Không thể tải dữ liệu đặt phòng'
    ),
    fetchAllPages(
      (rf, rt) => supabase
        .from('t_booking')
        .select(
          'booking_id, total_amount, booking_status_cd, created_at, '
          + 't_booking_detail(quantity)'
        )
        .eq('hotel_id', hotelId)
        .gte('created_at', prevStartIso)
        .lte('created_at', prevEndIso)
        .order('created_at', { ascending: true })
        .order('booking_id', { ascending: true })
        .range(rf, rt),
      'Không thể tải dữ liệu đặt phòng kỳ trước'
    ),
    // Rating box is all-time for the hotel (not limited by the date filter).
    fetchAllPages(
      (rf, rt) => supabase
        .from('t_review')
        .select('review_id, rating_score, t_booking!inner(hotel_id)')
        .eq('t_booking.hotel_id', hotelId)
        .order('review_id', { ascending: true })
        .range(rf, rt),
      'Không thể tải dữ liệu đánh giá'
    ).catch((err) => {
      console.warn('[Statistics] Không thể tải đánh giá khách sạn, bỏ qua điểm đánh giá:', err.message);
      return [];
    }),
  ]);

  const statusNames = await getStatusNames();

  const isCancelled = (code) => {
    if (!code) return false;
    const str = String(code).trim().toUpperCase();
    const mapped = String(statusNames[code] || statusNames[str] || str).trim().toUpperCase();
    return CANCELLED_CODES.includes(str) || CANCELLED_CODES.includes(mapped);
  };

  const statusMap = new Map();
  const roomTypeMap = new Map();
  const dayMap = new Map();
  let revenue = 0;
  let cancelledCount = 0;
  let roomsBooked = 0;

  bookings.forEach((booking) => {
    const rawCode = booking.booking_status_cd || 'UNKNOWN';
    const key = statusNames[rawCode] || statusNames[String(rawCode).trim().toUpperCase()] || String(rawCode).trim().toUpperCase();
    const cancelled = isCancelled(booking.booking_status_cd);
    const amount = toNumber(booking.total_amount);

    const status = statusMap.get(key) || { code: key, count: 0, amount: 0 };
    status.count += 1;
    status.amount += amount;
    statusMap.set(key, status);

    const dayKey = toVnDateKey(booking.created_at);
    const day = dayMap.get(dayKey) || { date: dayKey, bookings: 0, revenue: 0 };
    day.bookings += 1;

    if (cancelled) {
      cancelledCount += 1;
    } else {
      revenue += amount;
      day.revenue += amount;
      (booking.t_booking_detail || []).forEach((detail) => {
        const quantity = toNumber(detail.quantity);
        const name = (Array.isArray(detail.m_room_type) ? detail.m_room_type[0]?.type_name : detail.m_room_type?.type_name) || 'Không xác định';
        roomTypeMap.set(name, (roomTypeMap.get(name) || 0) + quantity);
        roomsBooked += quantity;
      });
    }
    dayMap.set(dayKey, day);
  });

  // Calculate prior period metrics
  let prevRevenue = 0;
  let prevCancelledCount = 0;
  let prevRoomsBooked = 0;

  prevBookings.forEach((booking) => {
    const cancelled = isCancelled(booking.booking_status_cd);
    const amount = toNumber(booking.total_amount);

    if (cancelled) {
      prevCancelledCount += 1;
    } else {
      prevRevenue += amount;
      (booking.t_booking_detail || []).forEach((detail) => {
        prevRoomsBooked += toNumber(detail.quantity);
      });
    }
  });

  const prevTotalBookings = prevBookings.length;
  const totalBookings = bookings.length;

  const calculateChange = (current, previous) => {
    if (previous === 0) {
      if (current === 0) return 0;
      return 100;
    }
    const pct = ((current - previous) / previous) * 100;
    return Number(pct.toFixed(1));
  };

  const scores = reviews.map((r) => Number(r.rating_score)).filter((n) => Number.isFinite(n));
  const averageScore = scores.length
    ? Number((scores.reduce((sum, n) => sum + n, 0) / scores.length).toFixed(1))
    : null;

  return {
    hotel: {
      hotel_id: hotel.hotel_id,
      name: hotel.name,
      address: hotel.address,
      star_rating: hotel.star_rating,
    },
    period_type: prevInfo.periodType,
    comparison_label: prevInfo.comparisonLabel,
    range: { from: range.from, to: range.to, days: range.days },
    previous_period: { from: prevFrom, to: prevTo, days: prevInfo.days, label: prevInfo.label },
    rating: { average: averageScore, count: scores.length },
    summary: {
      total_bookings: totalBookings,
      cancelled_bookings: cancelledCount,
      valid_bookings: totalBookings - cancelledCount,
      rooms_booked: roomsBooked,
      revenue,
    },
    comparison: {
      total_bookings: {
        current: totalBookings,
        previous: prevTotalBookings,
        change_pct: calculateChange(totalBookings, prevTotalBookings),
      },
      valid_bookings: {
        current: totalBookings - cancelledCount,
        previous: prevTotalBookings - prevCancelledCount,
        change_pct: calculateChange(totalBookings - cancelledCount, prevTotalBookings - prevCancelledCount),
      },
      cancelled_bookings: {
        current: cancelledCount,
        previous: prevCancelledCount,
        change_pct: calculateChange(cancelledCount, prevCancelledCount),
      },
      rooms_booked: {
        current: roomsBooked,
        previous: prevRoomsBooked,
        change_pct: calculateChange(roomsBooked, prevRoomsBooked),
      },
      revenue: {
        current: revenue,
        previous: prevRevenue,
        change_pct: calculateChange(revenue, prevRevenue),
      },
    },
    by_status: [...statusMap.values()].sort((a, b) => b.count - a.count),
    by_room_type: [...roomTypeMap.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    by_day: [...dayMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
};

module.exports = { getStatisticsHotels, getHotelOverview };
