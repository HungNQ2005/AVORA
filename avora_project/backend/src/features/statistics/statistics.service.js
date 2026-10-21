'use strict';

const supabase = require('../../config/supabaseClient');

const PAGE_SIZE = 1000;
const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;
const VN_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const CANCELLED_CODES = ['CANCELLED', 'CANCELED'];

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

/** Format a Date as YYYY-MM-DD using Vietnam time (UTC+7). */
const toVnDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/**
 * Normalise and validate the date range. Defaults to the last 30 days (VN time).
 * @returns {{ from: string, to: string }}
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
/**
 * Active hotels the vendor can pick from (only hotels owned/created by this vendor).
 * READ-ONLY.
 */
const getStatisticsHotels = async (vendorId) => {
  ensureClient();

  let query = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, star_rating, hotel_status, owner_id')
    .eq('is_deleted', false)
    .eq('hotel_status', 'ACTIVE');

  if (vendorId) {
    query = query.eq('owner_id', vendorId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) throwDatabaseError('Không thể tải danh sách khách sạn', error);
  return data || [];
};

/** Resolve booking status code -> display code name via m_system_code (same lookup as chatbot). */
const getStatusNames = async (codes) => {
  const names = {};
  if (codes.length === 0) return names;

  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .in('code_cd', codes);
  if (error) throwDatabaseError('Không thể tải tên trạng thái đơn đặt phòng', error);

  (data || []).forEach((row) => {
    if (!names[row.code_cd]) names[row.code_cd] = row.code_name;
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
const getHotelOverview = async ({ hotelId, from, to, vendorId }) => {
  ensureClient();
  const range = resolveDateRange(from, to);

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

  // Prior period of exact same length
  const fromTime = new Date(`${range.from}T00:00:00Z`).getTime();
  const prevToTime = fromTime - DAY_MS;
  const prevFromTime = prevToTime - (range.days - 1) * DAY_MS;
  const prevFrom = toVnDateKey(prevFromTime);
  const prevTo = toVnDateKey(prevToTime);
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
    ),
  ]);

  const allBookings = [...bookings, ...prevBookings];
  const statusCodes = [...new Set(allBookings.map((b) => b.booking_status_cd).filter(Boolean))];
  const statusNames = await getStatusNames(statusCodes);

  const isCancelled = (code) => {
    const candidates = [code, statusNames[code]].filter(Boolean).map((v) => String(v).toUpperCase());
    return candidates.some((c) => CANCELLED_CODES.includes(c));
  };

  const statusMap = new Map();
  const roomTypeMap = new Map();
  const dayMap = new Map();
  let revenue = 0;
  let cancelledCount = 0;
  let roomsBooked = 0;

  bookings.forEach((booking) => {
    const code = booking.booking_status_cd || 'UNKNOWN';
    const key = String(statusNames[code] || code);
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
        const name = detail.m_room_type?.type_name || 'Không xác định';
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
    range: { from: range.from, to: range.to, days: range.days },
    previous_period: { from: prevFrom, to: prevTo, days: range.days },
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
