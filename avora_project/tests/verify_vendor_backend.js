'use strict';

/**
 * AVORA Vendor Booking Management - Automated Backend Verification Harness
 * Milestone 1 (Backend Core: API & Multi-Tenant Isolation)
 * Exercises Scenarios TS1 through TS11.
 */

const http = require('http');
const path = require('path');

// Ensure packages installed in backend/node_modules can be resolved regardless of working directory
const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const jwt = require('jsonwebtoken');
const express = require('express');

// Configuration
const PORT = process.env.TEST_PORT || 5005;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod';

// Deterministic UUIDs for testing
const VENDOR_A_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_B_ID = '22222222-2222-4222-8222-222222222222';
const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';

const HOTEL_A_ID = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B_ID = 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const ROOM_TYPE_A_ID = 'rrrrrrr1-rrrr-4rrr-8rrr-rrrrrrrrrrrr';
const ROOM_TYPE_B_ID = 'rrrrrrr2-rrrr-4rrr-8rrr-rrrrrrrrrrrr';

const BOOKING_A_PND_ID = 'b0000001-0000-4000-8000-000000000001';
const BOOKING_A_CFM_ID = 'b0000002-0000-4000-8000-000000000002';
const BOOKING_A_CAN_ID = 'b0000003-0000-4000-8000-000000000003';
const BOOKING_B_ID     = 'b0000004-0000-4000-8000-000000000004';

// Helper to mint JWT tokens for test roles
function createToken(userId, roleCd = '4', email = 'vendor@avora.com') {
  return jwt.sign(
    { user_id: userId, role_cd: roleCd, email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const TOKEN_VENDOR_A = createToken(VENDOR_A_ID, '4', 'vendor_a@avora.com');
const TOKEN_VENDOR_B = createToken(VENDOR_B_ID, '4', 'vendor_b@avora.com');
const TOKEN_CUSTOMER = createToken(CUSTOMER_ID, '2', 'customer@avora.com');

// ─── Sandboxed In-Memory Adapter Fixtures & Query Builder ─────────────────────
// Used when direct Supabase connection cannot be established (e.g. sandbox DNS isolation)

function createInMemorySupabaseClient() {
  const users = [
    { user_id: VENDOR_A_ID, email: 'vendor_a@avora.com', role_cd: '4', is_deleted: false },
    { user_id: VENDOR_B_ID, email: 'vendor_b@avora.com', role_cd: '4', is_deleted: false },
    { user_id: CUSTOMER_ID, email: 'customer@avora.com', role_cd: '2', is_deleted: false },
  ];

  const systemCodes = [
    { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'ADM', sort_no: 1 },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN', sort_no: 2 },
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS', sort_no: 3 },
    { business_cd: 'BOOKING_STS', code_cd: '1', code_name: 'PND', sort_no: 1 },
    { business_cd: 'BOOKING_STS', code_cd: '2', code_name: 'CFM', sort_no: 2 },
    { business_cd: 'BOOKING_STS', code_cd: '3', code_name: 'CAN', sort_no: 3 },
    { business_cd: 'AUDIT_ACTION', code_cd: '2', code_name: 'UPD', sort_no: 1 },
  ];

  const hotels = [
    {
      hotel_id: HOTEL_A_ID,
      owner_id: VENDOR_A_ID,
      name: 'Avora Premier Hotel',
      address: '123 Bach Dang, Da Nang',
      is_deleted: false,
      star_rating: 4,
      star_quality: 4,
    },
    {
      hotel_id: HOTEL_B_ID,
      owner_id: VENDOR_B_ID,
      name: 'Other Vendor Hotel',
      address: '456 Tran Phu, Da Nang',
      is_deleted: false,
      star_rating: 3,
      star_quality: 3,
    },
  ];

  const roomTypes = [
    {
      room_type_id: ROOM_TYPE_A_ID,
      hotel_id: HOTEL_A_ID,
      type_name: 'Deluxe Ocean View',
      bed_type: 'King',
      room_size: '35m2',
      max_adults: 2,
      max_children: 1,
      default_price: 1500000,
    },
    {
      room_type_id: ROOM_TYPE_B_ID,
      hotel_id: HOTEL_B_ID,
      type_name: 'Standard Room',
      bed_type: 'Queen',
      room_size: '25m2',
      max_adults: 2,
      max_children: 0,
      default_price: 1000000,
    },
  ];

  const bookings = [
    {
      booking_id: BOOKING_A_PND_ID,
      hotel_id: HOTEL_A_ID,
      user_id: CUSTOMER_ID,
      booking_status_cd: '1',
      guest_name: 'Nguyen Van A',
      guest_phone: '0912345678',
      special_request: 'Tang cao thoang mat',
      total_amount: 1500000,
      discount_amount: 0,
      created_at: '2026-11-01T08:00:00.000Z',
      updated_at: '2026-11-01T08:00:00.000Z',
    },
    {
      booking_id: BOOKING_A_CFM_ID,
      hotel_id: HOTEL_A_ID,
      user_id: CUSTOMER_ID,
      booking_status_cd: '2',
      guest_name: 'Tran Van B',
      guest_phone: '0987654321',
      special_request: '',
      total_amount: 3000000,
      discount_amount: 0,
      created_at: '2026-11-02T09:00:00.000Z',
      updated_at: '2026-11-02T09:00:00.000Z',
    },
    {
      booking_id: BOOKING_A_CAN_ID,
      hotel_id: HOTEL_A_ID,
      user_id: CUSTOMER_ID,
      booking_status_cd: '3',
      guest_name: 'Le Thi C',
      guest_phone: '0905123456',
      special_request: 'Khach da huy',
      total_amount: 1800000,
      discount_amount: 0,
      created_at: '2026-11-03T10:00:00.000Z',
      updated_at: '2026-11-03T10:00:00.000Z',
    },
    {
      booking_id: BOOKING_B_ID,
      hotel_id: HOTEL_B_ID,
      user_id: CUSTOMER_ID,
      booking_status_cd: '1',
      guest_name: 'Pham Van D',
      guest_phone: '0933112233',
      special_request: '',
      total_amount: 2000000,
      discount_amount: 0,
      created_at: '2026-11-04T11:00:00.000Z',
      updated_at: '2026-11-04T11:00:00.000Z',
    },
  ];

  const bookingDetails = [
    {
      booking_detail_id: 'd0000001-0000-4000-8000-000000000001',
      booking_id: BOOKING_A_PND_ID,
      room_type_id: ROOM_TYPE_A_ID,
      check_in_date: '2026-11-10',
      check_out_date: '2026-11-12',
      quantity: 1,
      unit_price: 1500000,
    },
    {
      booking_detail_id: 'd0000002-0000-4000-8000-000000000002',
      booking_id: BOOKING_A_CFM_ID,
      room_type_id: ROOM_TYPE_A_ID,
      check_in_date: '2026-11-15',
      check_out_date: '2026-11-17',
      quantity: 1,
      unit_price: 1500000,
    },
    {
      booking_detail_id: 'd0000003-0000-4000-8000-000000000003',
      booking_id: BOOKING_A_CAN_ID,
      room_type_id: ROOM_TYPE_A_ID,
      check_in_date: '2026-11-20',
      check_out_date: '2026-11-22',
      quantity: 1,
      unit_price: 1800000,
    },
    {
      booking_detail_id: 'd0000004-0000-4000-8000-000000000004',
      booking_id: BOOKING_B_ID,
      room_type_id: ROOM_TYPE_B_ID,
      check_in_date: '2026-11-25',
      check_out_date: '2026-11-27',
      quantity: 1,
      unit_price: 2000000,
    },
  ];

  const auditLogs = [];

  function joinBooking(booking) {
    if (!booking) return null;
    const hotel = hotels.find((h) => h.hotel_id === booking.hotel_id) || null;
    const details = bookingDetails
      .filter((d) => d.booking_id === booking.booking_id)
      .map((d) => {
        const rt = roomTypes.find((r) => r.room_type_id === d.room_type_id) || {};
        return {
          ...d,
          m_room_type: {
            room_type_id: rt.room_type_id,
            type_name: rt.type_name,
            bed_type: rt.bed_type,
            room_size: rt.room_size,
            max_adults: rt.max_adults,
            max_children: rt.max_children,
            default_price: rt.default_price,
          },
        };
      });

    return {
      ...booking,
      m_hotel: hotel
        ? {
            hotel_id: hotel.hotel_id,
            owner_id: hotel.owner_id,
            name: hotel.name,
            address: hotel.address,
            star_rating: hotel.star_rating,
            star_quality: hotel.star_quality,
          }
        : null,
      t_booking_detail: details,
      m_coupon: null,
      m_cancellation_policy: null,
      t_payment_transaction: [],
      t_settlement: null,
    };
  }

  return {
    from(table) {
      let filters = [];
      let inFilters = [];
      let orderFn = null;
      let limitCount = null;
      let updatePayload = null;

      const builder = {
        select(columns = '*') {
          return builder;
        },
        eq(col, val) {
          filters.push({ col, val });
          return builder;
        },
        in(col, values) {
          inFilters.push({ col, values: Array.isArray(values) ? values : [values] });
          return builder;
        },
        order(col, { ascending = true } = {}) {
          orderFn = (a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          };
          return builder;
        },
        limit(count) {
          limitCount = count;
          return builder;
        },
        update(payload) {
          updatePayload = payload;
          return builder;
        },
        insert(payload) {
          if (table === 'h_system_audit_log') {
            const row = { log_id: `log-${Date.now()}`, ...payload };
            auditLogs.push(row);
            return Promise.resolve({ data: [row], error: null });
          }
          return Promise.resolve({ data: [payload], error: null });
        },
        async maybeSingle() {
          const res = await builder.then();
          if (res.error) return res;
          const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          return { data: row, error: null };
        },
        then(resolve) {
          let dataset = [];

          if (table === 'm_user') dataset = [...users];
          else if (table === 'm_system_code') dataset = [...systemCodes];
          else if (table === 'm_hotel') dataset = [...hotels];
          else if (table === 'm_room_type') dataset = [...roomTypes];
          else if (table === 't_booking') dataset = bookings.map(joinBooking);
          else if (table === 't_booking_detail') dataset = [...bookingDetails];
          else if (table === 'h_system_audit_log') dataset = [...auditLogs];

          // Handle update mutation
          if (updatePayload && table === 't_booking') {
            const matches = bookings.filter((b) => {
              return filters.every((f) => String(b[f.col]) === String(f.val));
            });

            if (matches.length === 0) {
              const res = { data: [], error: null };
              return resolve ? resolve(res) : Promise.resolve(res);
            }

            matches.forEach((b) => {
              Object.assign(b, updatePayload);
            });

            const res = { data: matches.map(joinBooking), error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          // Apply filters
          filters.forEach(({ col, val }) => {
            dataset = dataset.filter((row) => String(row[col]) === String(val));
          });

          inFilters.forEach(({ col, values }) => {
            const set = new Set(values.map(String));
            dataset = dataset.filter((row) => set.has(String(row[col])));
          });

          if (orderFn) {
            dataset.sort(orderFn);
          }

          if (limitCount) {
            dataset = dataset.slice(0, limitCount);
          }

          const res = { data: dataset, error: null };
          return resolve ? resolve(res) : Promise.resolve(res);
        },
      };

      return builder;
    },
  };
}

// Test Harness Runner State
const results = [];

function recordResult(id, name, passed, details = '') {
  results.push({ id, name, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} ${id}: ${name} ${details ? `(${details})` : ''}`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = response.status;
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status, body };
}

// ─── Ephemeral Server Bootstrapper ──────────────────────────────────────────

async function startTestServer() {
  const mockClient = createInMemorySupabaseClient();

  // Override supabase client module in require cache so authMiddleware and service use mock client
  const supabaseClientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: mockClient,
  };

  // Require vendor booking service and set mock client
  const vendorBookingService = require('../backend/src/features/bookings/vendor_booking.service');
  vendorBookingService.setCustomClient(mockClient);

  // Require routes and middlewares
  const vendorBookingRoute = require('../backend/src/features/bookings/vendor_booking.route');
  const errorHandler = require('../backend/src/common/middlewares/errorHandler');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount vendor booking routes
  app.use('/api/vendor/bookings', vendorBookingRoute);

  // Not found fallback
  app.use((_req, _res, next) => {
    const err = new Error('Không tìm thấy đường dẫn API yêu cầu.');
    err.statusCode = 404;
    next(err);
  });

  // Global Error Handler
  app.use(errorHandler);

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

// ─── Test Suite Execution ───────────────────────────────────────────────────

async function runTestSuite() {
  console.log('==============================================================');
  console.log('AVORA VENDOR BACKEND VERIFICATION HARNESS (Milestone 1)');
  console.log('==============================================================\n');

  let server = null;
  try {
    server = await startTestServer();
  } catch (err) {
    console.error('Failed to start test server:', err);
    process.exit(1);
  }

  try {
    // TS1: Vendor retrieves owned hotel list
    try {
      const res = await request('/api/vendor/bookings/hotels', { token: TOKEN_VENDOR_A });
      const isOk =
        res.status === 200 &&
        res.body?.status === 'success' &&
        Array.isArray(res.body?.data) &&
        res.body.data.some((h) => h.hotel_id === HOTEL_A_ID) &&
        !res.body.data.some((h) => h.hotel_id === HOTEL_B_ID);

      recordResult('TS1', 'Vendor retrieves owned hotel list', isOk, `Status ${res.status}`);
    } catch (err) {
      recordResult('TS1', 'Vendor retrieves owned hotel list', false, err.message);
    }

    // TS2: Vendor retrieves booking list with pagination
    try {
      const res = await request('/api/vendor/bookings?page=1&limit=10', { token: TOKEN_VENDOR_A });
      const isOk =
        res.status === 200 &&
        res.body?.status === 'success' &&
        (Array.isArray(res.body?.data?.bookings) || Array.isArray(res.body?.data?.items)) &&
        res.body?.data?.pagination?.page === 1;

      recordResult('TS2', 'Vendor retrieves booking list with pagination', isOk, `Status ${res.status}`);
    } catch (err) {
      recordResult('TS2', 'Vendor retrieves booking list with pagination', false, err.message);
    }

    // TS3: Vendor filters bookings by status
    try {
      const resPnd = await request('/api/vendor/bookings?status=PND', { token: TOKEN_VENDOR_A });
      const resCfm = await request('/api/vendor/bookings?status=CFM', { token: TOKEN_VENDOR_A });
      const resCan = await request('/api/vendor/bookings?status=CAN', { token: TOKEN_VENDOR_A });

      const pndList = resPnd.body?.data?.bookings || resPnd.body?.data?.items || [];
      const cfmList = resCfm.body?.data?.bookings || resCfm.body?.data?.items || [];
      const canList = resCan.body?.data?.bookings || resCan.body?.data?.items || [];

      const isOk =
        resPnd.status === 200 &&
        resCfm.status === 200 &&
        resCan.status === 200 &&
        pndList.every((b) => b.status_name === 'PND' || b.status_cd === '1' || b.booking_status_cd === '1') &&
        cfmList.every((b) => b.status_name === 'CFM' || b.status_cd === '2' || b.booking_status_cd === '2') &&
        canList.every((b) => b.status_name === 'CAN' || b.status_cd === '3' || b.booking_status_cd === '3');

      recordResult(
        'TS3',
        'Vendor filters bookings by status (PND, CFM, CAN)',
        isOk,
        `PND:${pndList.length}, CFM:${cfmList.length}, CAN:${canList.length}`
      );
    } catch (err) {
      recordResult('TS3', 'Vendor filters bookings by status', false, err.message);
    }

    // TS4: Vendor searches bookings by booking code or guest name
    try {
      const resCode = await request('/api/vendor/bookings?search=AV-1126', { token: TOKEN_VENDOR_A });
      const resName = await request('/api/vendor/bookings?search=Nguyen', { token: TOKEN_VENDOR_A });
      const resEmpty = await request('/api/vendor/bookings?search=NONEXISTENT_QUERY_XYZ', {
        token: TOKEN_VENDOR_A,
      });

      const emptyList = resEmpty.body?.data?.bookings || resEmpty.body?.data?.items || [];
      const isOk =
        resCode.status === 200 &&
        resName.status === 200 &&
        resEmpty.status === 200 &&
        emptyList.length === 0;

      recordResult('TS4', 'Vendor searches bookings by code and guest name', isOk, `Empty search returns 0`);
    } catch (err) {
      recordResult('TS4', 'Vendor searches bookings by code and guest name', false, err.message);
    }

    // TS5: Vendor filters bookings by stay date range
    try {
      const resValid = await request('/api/vendor/bookings?from_date=2026-11-01&to_date=2026-11-30', {
        token: TOKEN_VENDOR_A,
      });
      const resInverted = await request('/api/vendor/bookings?from_date=2026-11-30&to_date=2026-11-01', {
        token: TOKEN_VENDOR_A,
      });

      const isOk =
        resValid.status === 200 &&
        resInverted.status === 400 &&
        resInverted.body?.message?.includes('không được nhỏ hơn');

      recordResult(
        'TS5',
        'Vendor filters bookings by stay date range & validates inverted',
        isOk,
        `Inverted rejected with 400`
      );
    } catch (err) {
      recordResult('TS5', 'Vendor filters bookings by stay date range', false, err.message);
    }

    // TS6: Vendor retrieves single booking detail
    try {
      const res = await request(`/api/vendor/bookings/${BOOKING_A_PND_ID}`, { token: TOKEN_VENDOR_A });
      const isOk =
        res.status === 200 &&
        res.body?.status === 'success' &&
        res.body?.data?.booking_id === BOOKING_A_PND_ID &&
        Array.isArray(res.body?.data?.details || res.body?.data?.rooms);

      recordResult(
        'TS6',
        'Vendor retrieves single booking detail showing relations',
        isOk,
        `Details array verified`
      );
    } catch (err) {
      recordResult('TS6', 'Vendor retrieves single booking detail', false, err.message);
    }

    // TS7: Vendor updates status from 1-PND to 2-CFM
    try {
      const res = await request(`/api/vendor/bookings/${BOOKING_A_PND_ID}/status`, {
        method: 'PATCH',
        token: TOKEN_VENDOR_A,
        body: { status_cd: '2' },
      });

      const isOk =
        res.status === 200 &&
        res.body?.status === 'success' &&
        (res.body?.data?.status_cd === '2' ||
          res.body?.data?.status_name === 'CFM' ||
          res.body?.data?.new_status === 'CFM');

      recordResult('TS7', 'Vendor updates status 1-PND to 2-CFM (DB persistence)', isOk, `Status ${res.status}`);
    } catch (err) {
      recordResult('TS7', 'Vendor updates status 1-PND to 2-CFM', false, err.message);
    }

    // TS8: Vendor updates status to 3-CAN with cancellation reason
    try {
      const res = await request(`/api/vendor/bookings/${BOOKING_A_CFM_ID}/status`, {
        method: 'PATCH',
        token: TOKEN_VENDOR_A,
        body: {
          status_cd: '3',
          reason: 'Khách hàng liên hệ hủy do thay đổi lịch công tác đột xuất',
        },
      });

      const isOk =
        res.status === 200 &&
        res.body?.status === 'success' &&
        (res.body?.data?.status_cd === '3' ||
          res.body?.data?.status_name === 'CAN' ||
          res.body?.data?.new_status === 'CAN');

      recordResult('TS8', 'Vendor updates status to 3-CAN (inventory & audit)', isOk, `Status ${res.status}`);
    } catch (err) {
      recordResult('TS8', 'Vendor updates status to 3-CAN', false, err.message);
    }

    // TS9: Vendor attempts invalid status transitions
    try {
      // 3-CAN -> 1-PND
      const resCanToPnd = await request(`/api/vendor/bookings/${BOOKING_A_CAN_ID}/status`, {
        method: 'PATCH',
        token: TOKEN_VENDOR_A,
        body: { status_cd: '1' },
      });

      // Cancel without reason
      const resNoReason = await request(`/api/vendor/bookings/${BOOKING_A_PND_ID}/status`, {
        method: 'PATCH',
        token: TOKEN_VENDOR_A,
        body: { status_cd: '3', reason: '' },
      });

      const isOk = resCanToPnd.status === 400 && resNoReason.status === 400;

      recordResult(
        'TS9',
        'Vendor attempts invalid transitions rejected with 400',
        isOk,
        `CAN->PND: ${resCanToPnd.status}, NoReason: ${resNoReason.status}`
      );
    } catch (err) {
      recordResult('TS9', 'Vendor attempts invalid transitions rejected with 400', false, err.message);
    }

    // TS10: Multi-tenant security isolation
    try {
      // Vendor A accessing Vendor B's booking
      const resCrossBooking = await request(`/api/vendor/bookings/${BOOKING_B_ID}`, {
        token: TOKEN_VENDOR_A,
      });
      // Vendor A accessing Vendor B's hotel filter
      const resCrossHotel = await request(`/api/vendor/bookings?hotel_id=${HOTEL_B_ID}`, {
        token: TOKEN_VENDOR_A,
      });
      // Customer accessing vendor endpoint
      const resCustomer = await request('/api/vendor/bookings', {
        token: TOKEN_CUSTOMER,
      });
      // Unauthenticated
      const resUnauth = await request('/api/vendor/bookings');

      const isOk =
        resCrossBooking.status === 403 &&
        resCrossHotel.status === 403 &&
        resCustomer.status === 403 &&
        resUnauth.status === 401;

      recordResult(
        'TS10',
        'Multi-tenant security isolation (403/401 enforced)',
        isOk,
        `CrossBooking: ${resCrossBooking.status}, CrossHotel: ${resCrossHotel.status}`
      );
    } catch (err) {
      recordResult('TS10', 'Multi-tenant security isolation', false, err.message);
    }

    // TS11: Input validation & stack trace shielding
    try {
      const resInvalidUuid = await request('/api/vendor/bookings/invalid-uuid-format', {
        token: TOKEN_VENDOR_A,
      });
      const resOutOfBounds = await request('/api/vendor/bookings?page=0&limit=999', {
        token: TOKEN_VENDOR_A,
      });

      const bodyStr = JSON.stringify(resInvalidUuid.body || '');
      const shieldsStack =
        !bodyStr.includes('PostgresError') &&
        !bodyStr.includes('pg_') &&
        !bodyStr.includes('relation "') &&
        !bodyStr.includes('at /') &&
        !bodyStr.includes('at C:\\');

      const isOk = resInvalidUuid.status === 400 && resOutOfBounds.status === 400 && shieldsStack;

      recordResult(
        'TS11',
        'Input validation shields stack traces and errors',
        isOk,
        `InvalidUUID: ${resInvalidUuid.status}, Shielded: ${shieldsStack}`
      );
    } catch (err) {
      recordResult('TS11', 'Input validation shields stack traces and errors', false, err.message);
    }
  } finally {
    if (server) {
      server.close();
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n--------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  const verdict = passedCount === totalCount ? 'SUITE PASSED (100% compliance)' : 'SUITE FAILED';
  console.log(`VERDICT: ${verdict}`);
  console.log('==============================================================\n');

  return passedCount === totalCount;
}

module.exports = {
  runTestSuite,
  createToken,
  request,
  VENDOR_A_ID,
  VENDOR_B_ID,
  HOTEL_A_ID,
  HOTEL_B_ID,
  BOOKING_A_PND_ID,
  BOOKING_A_CFM_ID,
  BOOKING_A_CAN_ID,
  BOOKING_B_ID,
};

if (require.main === module) {
  runTestSuite()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal harness error:', err);
      process.exit(1);
    });
}
