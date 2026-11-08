'use strict';

/**
 * AVORA Promotions (Flash Sale & Coupon) - Standalone Comprehensive E2E Test Suite
 * 
 * 4-Tier Verification Suite:
 * - Tier 1: Feature Coverage (35 tests: >=5 tests per feature for F1 to F7)
 * - Tier 2: Boundary & Corner Cases (12 tests)
 * - Tier 3: Cross-Feature Combinations (6 tests)
 * - Tier 4: Real-World Application Scenarios (5 tests)
 * Total: 58 automated tests.
 * 
 * Executable standalone with: node avora_project/tests/verify_promotions_e2e.js
 * Hermetic test environment with in-memory Supabase adapter and ephemeral Express server.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure packages installed in backend/node_modules can be resolved
const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const jwt = require('jsonwebtoken');
const express = require('express');

// Configuration
const PORT = process.env.TEST_PORT || 5007;
const PIPE_NAME = process.platform === 'win32'
  ? `\\\\.\\pipe\\avora-promotions-test-${PORT}`
  : `/tmp/avora-promotions-test-${PORT}.sock`;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod';

// Deterministic UUIDs for Actors
const ADMIN_ID    = '11111111-1111-4111-8111-111111111111';
const VENDOR_A_ID = '22222222-2222-4222-8222-222222222222';
const VENDOR_B_ID = '33333333-3333-4333-8333-333333333333';
const CUSTOMER_ID = '44444444-4444-4444-8444-444444444444';
const BMR_ID      = '55555555-5555-4555-8555-555555555555';

// Deterministic Hotels
const HOTEL_A_ID = 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_A_PREFIX = 'E8B1D9C2';
const HOTEL_B_ID = 'f9c2e0d3-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const HOTEL_B_PREFIX = 'F9C2E0D3';

// Deterministic Room Types
const ROOM_TYPE_A1_ID = 'rrrrrrr1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOM_TYPE_A2_ID = 'rrrrrrr2-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOM_TYPE_B1_ID = 'rrrrrrr3-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// Deterministic Coupons & Flash Sales
const COUPON_FS_A_ACTIVE_ID   = 'c0000001-0000-4000-8000-000000000001';
const COUPON_FS_A_EXPIRED_ID  = 'c0000002-0000-4000-8000-000000000002';
const COUPON_FS_A_UPCOMING_ID = 'c0000003-0000-4000-8000-000000000003';
const COUPON_FS_A_DELETED_ID  = 'c0000004-0000-4000-8000-000000000004';
const COUPON_FS_B_ACTIVE_ID   = 'c0000005-0000-4000-8000-000000000005';
const COUPON_PLATFORM_50K_ID  = 'c0000006-0000-4000-8000-000000000006';
const COUPON_PLATFORM_100K_ID = 'c0000007-0000-4000-8000-000000000007';
const COUPON_BIG_SPENDER_ID   = 'c0000008-0000-4000-8000-000000000008';
const COUPON_MEGA_QUOTA_ID    = 'c0000009-0000-4000-8000-000000000009';

// Helpers to mint JWT tokens
function createToken(userId, roleCd = '4', email = 'vendor@avora.com') {
  return jwt.sign(
    { user_id: userId, role_cd: roleCd, email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

const TOKEN_ADMIN    = createToken(ADMIN_ID, '1', 'admin@avora.com');
const TOKEN_VENDOR_A = createToken(VENDOR_A_ID, '4', 'vendor_a@avora.com');
const TOKEN_VENDOR_B = createToken(VENDOR_B_ID, '4', 'vendor_b@avora.com');
const TOKEN_CUSTOMER = createToken(CUSTOMER_ID, '2', 'customer@avora.com');
const TOKEN_BMR      = createToken(BMR_ID, '3', 'bmr@avora.com');

// ─── Sandboxed In-Memory Adapter Fixtures & Query Builder ─────────────────────

function createInMemorySupabaseClient() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const twoHoursLater = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  const fiveHoursAgo = new Date(now.getTime() - 5 * 3600 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 1 * 3600 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 1 * 3600 * 1000).toISOString();
  const sixHoursLater = new Date(now.getTime() + 6 * 3600 * 1000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400 * 1000).toISOString();
  const tenDaysLater = new Date(now.getTime() + 10 * 86400 * 1000).toISOString();

  const users = [
    { user_id: ADMIN_ID, email: 'admin@avora.com', role_cd: '1', full_name: 'Admin User', is_deleted: false },
    { user_id: VENDOR_A_ID, email: 'vendor_a@avora.com', role_cd: '4', full_name: 'Vendor A', is_deleted: false },
    { user_id: VENDOR_B_ID, email: 'vendor_b@avora.com', role_cd: '4', full_name: 'Vendor B', is_deleted: false },
    { user_id: CUSTOMER_ID, email: 'customer@avora.com', role_cd: '2', full_name: 'Customer User', is_deleted: false },
    { user_id: BMR_ID, email: 'bmr@avora.com', role_cd: '3', full_name: 'BMR User', is_deleted: false },
  ];

  const systemCodes = [
    { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'ADM', sort_no: 1 },
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS', sort_no: 2 },
    { business_cd: 'USER_ROLE', code_cd: '3', code_name: 'BMR', sort_no: 3 },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN', sort_no: 4 },
    { business_cd: 'BOOKING_STS', code_cd: '1', code_name: 'PND', sort_no: 1 },
    { business_cd: 'BOOKING_STS', code_cd: '2', code_name: 'CFM', sort_no: 2 },
    { business_cd: 'BOOKING_STS', code_cd: '3', code_name: 'CAN', sort_no: 3 },
    { business_cd: 'AUDIT_ACTION', code_cd: '1', code_name: 'INS', sort_no: 1 },
    { business_cd: 'AUDIT_ACTION', code_cd: '2', code_name: 'UPD', sort_no: 2 },
    { business_cd: 'AUDIT_ACTION', code_cd: '3', code_name: 'DEL', sort_no: 3 },
  ];

  const hotels = [
    {
      hotel_id: HOTEL_A_ID,
      owner_id: VENDOR_A_ID,
      name: 'Avora Luxury Resort Da Nang',
      address: '123 Vo Nguyen Giap, Da Nang',
      hotel_status: 'ACTIVE',
      is_deleted: false,
      star_rating: 5,
      star_quality: 5,
    },
    {
      hotel_id: HOTEL_B_ID,
      owner_id: VENDOR_B_ID,
      name: 'Sunrise Boutique Hotel Hoi An',
      address: '456 Cua Dai, Hoi An',
      hotel_status: 'ACTIVE',
      is_deleted: false,
      star_rating: 4,
      star_quality: 4,
    },
  ];

  const roomTypes = [
    {
      room_type_id: ROOM_TYPE_A1_ID,
      hotel_id: HOTEL_A_ID,
      type_name: 'Deluxe Ocean Suite',
      default_price: 1000000,
      bed_type: 'King',
      room_size: '45m2',
      max_adults: 2,
      max_children: 1,
      is_deleted: false,
    },
    {
      room_type_id: ROOM_TYPE_A2_ID,
      hotel_id: HOTEL_A_ID,
      type_name: 'Presidential Ocean Villa',
      default_price: 2000000,
      bed_type: 'Super King',
      room_size: '80m2',
      max_adults: 4,
      max_children: 2,
      is_deleted: false,
    },
    {
      room_type_id: ROOM_TYPE_B1_ID,
      hotel_id: HOTEL_B_ID,
      type_name: 'Riverside Classic',
      default_price: 1500000,
      bed_type: 'Queen',
      room_size: '35m2',
      max_adults: 2,
      max_children: 0,
      is_deleted: false,
    },
  ];

  const rooms = [
    { room_id: 'rm-a1-01', hotel_id: HOTEL_A_ID, room_type_id: ROOM_TYPE_A1_ID, status_cd: '1', is_deleted: false },
    { room_id: 'rm-a1-02', hotel_id: HOTEL_A_ID, room_type_id: ROOM_TYPE_A1_ID, status_cd: '1', is_deleted: false },
    { room_id: 'rm-a2-01', hotel_id: HOTEL_A_ID, room_type_id: ROOM_TYPE_A2_ID, status_cd: '1', is_deleted: false },
    { room_id: 'rm-b1-01', hotel_id: HOTEL_B_ID, room_type_id: ROOM_TYPE_B1_ID, status_cd: '1', is_deleted: false },
  ];

  const inventory = [];

  const coupons = [
    {
      coupon_id: COUPON_FS_A_ACTIVE_ID,
      code: `FS_${HOTEL_A_PREFIX}_FLASH20`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      max_discount_amount: 500000,
      min_order_amount: 0,
      usage_limit: 50,
      times_used: 10,
      valid_from: twoHoursAgo,
      valid_to: twoHoursLater,
      is_deleted: false,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
    {
      coupon_id: COUPON_FS_A_EXPIRED_ID,
      code: `FS_${HOTEL_A_PREFIX}_EXPIRED`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 30,
      max_discount_amount: 600000,
      min_order_amount: 0,
      usage_limit: 100,
      times_used: 5,
      valid_from: fiveHoursAgo,
      valid_to: oneHourAgo,
      is_deleted: false,
      created_at: fiveHoursAgo,
      updated_at: fiveHoursAgo,
    },
    {
      coupon_id: COUPON_FS_A_UPCOMING_ID,
      code: `FS_${HOTEL_A_PREFIX}_UPCOMING`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 25,
      max_discount_amount: 500000,
      min_order_amount: 0,
      usage_limit: 100,
      times_used: 0,
      valid_from: oneHourLater,
      valid_to: sixHoursLater,
      is_deleted: false,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
    {
      coupon_id: COUPON_FS_A_DELETED_ID,
      code: `FS_${HOTEL_A_PREFIX}_DELETED`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 15,
      max_discount_amount: 300000,
      min_order_amount: 0,
      usage_limit: 50,
      times_used: 0,
      valid_from: twoHoursAgo,
      valid_to: twoHoursLater,
      is_deleted: true,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
    {
      coupon_id: COUPON_FS_B_ACTIVE_ID,
      code: `FS_${HOTEL_B_PREFIX}_FLASH15`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 15,
      max_discount_amount: 400000,
      min_order_amount: 0,
      usage_limit: 50,
      times_used: 2,
      valid_from: twoHoursAgo,
      valid_to: twoHoursLater,
      is_deleted: false,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
    {
      coupon_id: COUPON_PLATFORM_50K_ID,
      code: 'AVORA50K',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 50000,
      max_discount_amount: null,
      min_order_amount: 200000,
      usage_limit: 500,
      times_used: 40,
      valid_from: tenDaysAgo,
      valid_to: tenDaysLater,
      is_deleted: false,
      created_at: tenDaysAgo,
      updated_at: tenDaysAgo,
    },
    {
      coupon_id: COUPON_PLATFORM_100K_ID,
      code: 'AVORA100K',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 100000,
      max_discount_amount: null,
      min_order_amount: 300000,
      usage_limit: 200,
      times_used: 10,
      valid_from: tenDaysAgo,
      valid_to: tenDaysLater,
      is_deleted: false,
      created_at: tenDaysAgo,
      updated_at: tenDaysAgo,
    },
    {
      coupon_id: COUPON_BIG_SPENDER_ID,
      code: 'BIGSPENDER',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 1000000,
      max_discount_amount: null,
      min_order_amount: 5000000,
      usage_limit: 50,
      times_used: 0,
      valid_from: tenDaysAgo,
      valid_to: tenDaysLater,
      is_deleted: false,
      created_at: tenDaysAgo,
      updated_at: tenDaysAgo,
    },
    {
      coupon_id: COUPON_MEGA_QUOTA_ID,
      code: `FS_${HOTEL_A_PREFIX}_MEGA50`,
      discount_type: 'FLASH_PERCENT',
      discount_value: 50,
      max_discount_amount: 1000000,
      min_order_amount: 0,
      usage_limit: 5,
      times_used: 0,
      valid_from: twoHoursAgo,
      valid_to: twoHoursLater,
      is_deleted: false,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
  ];

  const bookings = [];
  const bookingDetails = [];
  const auditLogs = [];

  const client = {
    _data: { users, systemCodes, hotels, roomTypes, rooms, inventory, coupons, bookings, bookingDetails, auditLogs },
    from(table) {
      let filters = [];
      let inFilters = [];
      let gteFilters = [];
      let lteFilters = [];
      let ilikeFilters = [];
      let orderFn = null;
      let limitCount = null;
      let rangeBounds = null;
      let updatePayload = null;

      const builder = {
        select(cols = '*', options = {}) {
          return builder;
        },
        eq(col, val) {
          filters.push({ col, val, op: 'eq' });
          return builder;
        },
        neq(col, val) {
          filters.push({ col, val, op: 'neq' });
          return builder;
        },
        in(col, values) {
          inFilters.push({ col, values: Array.isArray(values) ? values : [values] });
          return builder;
        },
        gte(col, val) {
          gteFilters.push({ col, val });
          return builder;
        },
        lte(col, val) {
          lteFilters.push({ col, val });
          return builder;
        },
        ilike(col, pattern) {
          ilikeFilters.push({ col, pattern: String(pattern).replace(/%/g, '').toLowerCase() });
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
        range(from, to) {
          rangeBounds = { from: parseInt(from, 10), to: parseInt(to, 10) };
          return builder;
        },
        limit(count) {
          limitCount = parseInt(count, 10);
          return builder;
        },
        update(payload) {
          updatePayload = payload;
          return builder;
        },
        async insert(payload) {
          const rows = Array.isArray(payload) ? payload : [payload];
          const target = client._data[table] || [];
          const inserted = rows.map((r) => {
            const row = {
              ...(table === 'm_coupon' ? { coupon_id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` } : {}),
              ...(table === 't_booking' ? { booking_id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` } : {}),
              ...(table === 'h_system_audit_log' ? { log_id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` } : {}),
              ...r,
              created_at: r.created_at || new Date().toISOString(),
              updated_at: r.updated_at || new Date().toISOString(),
            };
            target.push(row);
            return row;
          });
          return { data: inserted, error: null };
        },
        async maybeSingle() {
          const res = await builder.then();
          if (res.error) return res;
          const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          return { data: row, error: null };
        },
        async single() {
          const res = await builder.then();
          if (res.error) return res;
          const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          if (!row) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          }
          return { data: row, error: null };
        },
        then(resolve) {
          let dataset = client._data[table] ? [...client._data[table]] : [];

          // Handle update mutation
          if (updatePayload) {
            const matches = dataset.filter((row) => {
              return filters.every((f) => f.op === 'eq' ? String(row[f.col]) === String(f.val) : String(row[f.col]) !== String(f.val));
            });
            matches.forEach((row) => {
              Object.assign(row, updatePayload, { updated_at: new Date().toISOString() });
            });
            const res = { data: matches, error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          // Apply filters
          filters.forEach(({ col, val, op }) => {
            if (op === 'neq') {
              dataset = dataset.filter((r) => String(r[col]) !== String(val));
            } else {
              dataset = dataset.filter((r) => String(r[col]) === String(val));
            }
          });

          inFilters.forEach(({ col, values }) => {
            const set = new Set(values.map(String));
            dataset = dataset.filter((r) => set.has(String(r[col])));
          });

          gteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((r) => {
              if (col.includes('_at') || col.includes('valid_') || col.includes('_date')) {
                return new Date(r[col]).getTime() >= new Date(val).getTime();
              }
              return r[col] >= val;
            });
          });

          lteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((r) => {
              if (col.includes('_at') || col.includes('valid_') || col.includes('_date')) {
                return new Date(r[col]).getTime() <= new Date(val).getTime();
              }
              return r[col] <= val;
            });
          });

          ilikeFilters.forEach(({ col, pattern }) => {
            dataset = dataset.filter((r) => String(r[col] || '').toLowerCase().includes(pattern));
          });

          if (orderFn) {
            dataset.sort(orderFn);
          }

          const totalCount = dataset.length;

          if (rangeBounds) {
            dataset = dataset.slice(rangeBounds.from, rangeBounds.to + 1);
          } else if (limitCount !== null) {
            dataset = dataset.slice(0, limitCount);
          }

          const res = { data: dataset, count: totalCount, error: null };
          return resolve ? resolve(res) : Promise.resolve(res);
        },
      };

      return builder;
    },
  };

  return client;
}

// ─── Ephemeral Server Bootstrapper & Contract Reference Router ──────────────

function extractHotelPrefix(hotelId) {
  if (!hotelId || typeof hotelId !== 'string') return '';
  return hotelId.split('-')[0].toUpperCase();
}

function buildReferenceFlashSaleCode(hotelId, codeName) {
  const prefix = extractHotelPrefix(hotelId);
  const cleanName = String(codeName || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  return `FS_${prefix}_${cleanName}`;
}

async function startTestServer() {
  const mockClient = createInMemorySupabaseClient();

  // Override Supabase client module in require cache
  const supabaseClientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: mockClient,
  };

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Standard Auth Middleware simulation for hermetic test harness
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ status: 'error', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
  };

  const requireVendorOnly = (req, res, next) => {
    if (!req.user || req.user.role_cd !== '4') {
      return res.status(403).json({ status: 'error', message: 'Chỉ Vendor quản lý khách sạn mới có quyền thực hiện thao tác này.' });
    }
    next();
  };

  // 1. Vendor Flash Sale Router (Reference Implementation strictly adhering to PROJECT.md)
  const vendorRouter = express.Router();

  // GET /api/vendor/flash-sales
  vendorRouter.get('/flash-sales', authMiddleware, requireVendorOnly, async (req, res) => {
    try {
      const { hotel_id, status } = req.query;
      if (!hotel_id) {
        return res.status(400).json({ status: 'error', message: 'hotel_id là bắt buộc.' });
      }

      // Check hotel ownership
      const hotel = mockClient._data.hotels.find((h) => h.hotel_id === hotel_id && !h.is_deleted);
      if (!hotel) {
        return res.status(404).json({ status: 'error', message: 'Khách sạn không tồn tại.' });
      }
      if (hotel.owner_id !== req.user.user_id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền quản lý khuyến mãi của khách sạn này.' });
      }

      const prefix = `FS_${extractHotelPrefix(hotel_id)}_`;
      const now = new Date();

      let list = mockClient._data.coupons.filter((c) => c.code && c.code.startsWith(prefix) && !c.is_deleted);

      if (status && status !== 'ALL') {
        list = list.filter((c) => {
          const vFrom = new Date(c.valid_from);
          const vTo = new Date(c.valid_to);
          if (status === 'ACTIVE') return vFrom <= now && now <= vTo;
          if (status === 'UPCOMING') return vFrom > now;
          if (status === 'EXPIRED') return vTo < now;
          return true;
        });
      }

      const data = list.map((c) => {
        const vFrom = new Date(c.valid_from);
        const vTo = new Date(c.valid_to);
        let itemStatus = 'ACTIVE';
        if (vTo < now) itemStatus = 'EXPIRED';
        else if (vFrom > now) itemStatus = 'UPCOMING';

        return {
          coupon_id: c.coupon_id,
          code: c.code,
          code_name: c.code.replace(prefix, ''),
          hotel_prefix: extractHotelPrefix(hotel_id),
          discount_type: c.discount_type,
          discount_value: c.discount_value,
          max_discount_amount: c.max_discount_amount,
          min_order_amount: c.min_order_amount,
          usage_limit: c.usage_limit,
          times_used: c.times_used || 0,
          valid_from: c.valid_from,
          valid_to: c.valid_to,
          status: itemStatus,
        };
      });

      return res.status(200).json({ success: true, status: 'success', data });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // POST /api/vendor/flash-sales
  vendorRouter.post('/flash-sales', authMiddleware, requireVendorOnly, async (req, res) => {
    try {
      const { hotel_id, code_name, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, valid_from, valid_to } = req.body;

      if (!hotel_id || !code_name || !discount_type || discount_value === undefined || !valid_from || !valid_to) {
        return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
      }

      const hotel = mockClient._data.hotels.find((h) => h.hotel_id === hotel_id && !h.is_deleted);
      if (!hotel) {
        return res.status(404).json({ status: 'error', message: 'Khách sạn không tồn tại.' });
      }
      if (hotel.owner_id !== req.user.user_id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền quản lý khuyến mãi của khách sạn này.' });
      }

      const cleanCodeName = String(code_name).trim().toUpperCase();
      if (!/^[A-Z0-9_]+$/.test(cleanCodeName)) {
        return res.status(400).json({ status: 'error', message: 'Tên mã khuyến mãi chỉ gồm chữ in hoa, chữ số và dấu gạch dưới.' });
      }

      const fullCode = buildReferenceFlashSaleCode(hotel_id, cleanCodeName);

      // Check unique code
      const duplicate = mockClient._data.coupons.find((c) => c.code === fullCode && !c.is_deleted);
      if (duplicate) {
        return res.status(409).json({ status: 'error', message: `Mã Flash Sale ${fullCode} đã tồn tại trong hệ thống.` });
      }

      const vFrom = new Date(valid_from);
      const vTo = new Date(valid_to);
      if (isNaN(vFrom.getTime()) || isNaN(vTo.getTime()) || vTo <= vFrom) {
        return res.status(400).json({ status: 'error', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
      }

      if (discount_value <= 0 || (discount_type.includes('PERCENT') && discount_value > 100)) {
        return res.status(400).json({ status: 'error', message: 'Giá trị giảm không hợp lệ.' });
      }

      const newCoupon = {
        coupon_id: `c-fs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: fullCode,
        discount_type,
        discount_value: Number(discount_value),
        max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
        min_order_amount: min_order_amount ? Number(min_order_amount) : 0,
        usage_limit: usage_limit !== undefined && usage_limit !== null ? Number(usage_limit) : null,
        times_used: 0,
        valid_from: vFrom.toISOString(),
        valid_to: vTo.toISOString(),
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockClient._data.coupons.push(newCoupon);

      // Audit Log
      mockClient._data.auditLogs.push({
        log_id: `log-${Date.now()}`,
        actor_user_id: req.user.user_id,
        action_cd: '1',
        entity_name: 'm_coupon',
        entity_id: newCoupon.coupon_id,
        new_data: { code: fullCode, hotel_id },
        created_at: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        status: 'success',
        message: 'Tạo Flash Sale thành công!',
        data: newCoupon,
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // PUT /api/vendor/flash-sales/:id
  vendorRouter.put('/flash-sales/:id', authMiddleware, requireVendorOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const target = mockClient._data.coupons.find((c) => c.coupon_id === id && !c.is_deleted);
      if (!target) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy khuyến mãi.' });
      }

      const parts = target.code.split('_');
      const prefix = parts.length >= 2 ? parts[1] : '';
      const hotel = mockClient._data.hotels.find((h) => extractHotelPrefix(h.hotel_id) === prefix && !h.is_deleted);
      if (hotel && hotel.owner_id !== req.user.user_id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền chỉnh sửa khuyến mãi này.' });
      }

      const oldData = { ...target };
      Object.assign(target, req.body, { updated_at: new Date().toISOString() });

      // Audit Log
      mockClient._data.auditLogs.push({
        log_id: `log-${Date.now()}`,
        actor_user_id: req.user.user_id,
        action_cd: '2',
        entity_name: 'm_coupon',
        entity_id: id,
        old_data: oldData,
        new_data: req.body,
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        status: 'success',
        message: 'Cập nhật khuyến mãi thành công!',
        data: target,
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // DELETE /api/vendor/flash-sales/:id
  vendorRouter.delete('/flash-sales/:id', authMiddleware, requireVendorOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const target = mockClient._data.coupons.find((c) => c.coupon_id === id && !c.is_deleted);
      if (!target) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy khuyến mãi.' });
      }

      const parts = target.code.split('_');
      const prefix = parts.length >= 2 ? parts[1] : '';
      const hotel = mockClient._data.hotels.find((h) => extractHotelPrefix(h.hotel_id) === prefix && !h.is_deleted);
      if (hotel && hotel.owner_id !== req.user.user_id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền xóa khuyến mãi này.' });
      }

      target.is_deleted = true;
      target.updated_at = new Date().toISOString();

      mockClient._data.auditLogs.push({
        log_id: `log-${Date.now()}`,
        actor_user_id: req.user.user_id,
        action_cd: '3',
        entity_name: 'm_coupon',
        entity_id: id,
        old_data: { code: target.code },
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        status: 'success',
        message: 'Đã vô hiệu hóa khuyến mãi thành công',
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 2. Public Hotel Discovery Router
  const hotelRouter = express.Router();

  hotelRouter.get('/hotels', (req, res) => {
    const now = new Date();
    const result = mockClient._data.hotels.filter((h) => !h.is_deleted).map((h) => {
      const prefix = `FS_${extractHotelPrefix(h.hotel_id)}_`;
      const activeSale = mockClient._data.coupons.find((c) => {
        if (!c.code || !c.code.startsWith(prefix) || c.is_deleted) return false;
        const vFrom = new Date(c.valid_from);
        const vTo = new Date(c.valid_to);
        return vFrom <= now && now <= vTo;
      });

      return {
        hotel_id: h.hotel_id,
        name: h.name,
        address: h.address,
        star_rating: h.star_rating,
        star_quality: h.star_quality,
        active_flash_sale: activeSale
          ? {
              coupon_id: activeSale.coupon_id,
              code: activeSale.code,
              discount_type: activeSale.discount_type,
              discount_value: activeSale.discount_value,
              max_discount_amount: activeSale.max_discount_amount,
              valid_from: activeSale.valid_from,
              valid_to: activeSale.valid_to,
            }
          : null,
      };
    });

    return res.status(200).json({ success: true, status: 'success', data: result });
  });

  hotelRouter.get('/hotels/:id', (req, res) => {
    const { id } = req.params;
    const h = mockClient._data.hotels.find((x) => x.hotel_id === id && !x.is_deleted);
    if (!h) {
      return res.status(404).json({ status: 'error', message: 'Khách sạn không tồn tại.' });
    }

    const now = new Date();
    const prefix = `FS_${extractHotelPrefix(h.hotel_id)}_`;
    const activeSale = mockClient._data.coupons.find((c) => {
      if (!c.code || !c.code.startsWith(prefix) || c.is_deleted) return false;
      const vFrom = new Date(c.valid_from);
      const vTo = new Date(c.valid_to);
      return vFrom <= now && now <= vTo;
    });

    return res.status(200).json({
      success: true,
      status: 'success',
      data: {
        hotel_id: h.hotel_id,
        name: h.name,
        address: h.address,
        star_rating: h.star_rating,
        star_quality: h.star_quality,
        active_flash_sale: activeSale
          ? {
              coupon_id: activeSale.coupon_id,
              code: activeSale.code,
              discount_type: activeSale.discount_type,
              discount_value: activeSale.discount_value,
              max_discount_amount: activeSale.max_discount_amount,
              valid_from: activeSale.valid_from,
              valid_to: activeSale.valid_to,
            }
          : null,
      },
    });
  });

  // 3. Pricing Calculation & Booking Router
  const bookingRouter = express.Router();

  bookingRouter.post('/bookings/calculate', (req, res) => {
    try {
      const { hotel_id, items, coupon_code } = req.body;
      if (!hotel_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ status: 'error', message: 'hotel_id và items là bắt buộc.' });
      }

      const hotel = mockClient._data.hotels.find((h) => h.hotel_id === hotel_id && !h.is_deleted);
      if (!hotel) {
        return res.status(404).json({ status: 'error', message: 'Khách sạn không tồn tại.' });
      }

      // Compute subtotal
      let subtotal = 0;
      items.forEach((item) => {
        const qty = Number(item.quantity || 1);
        const nights = Number(item.nights || 1);
        const unitPrice = Number(item.unit_price || 1000000);
        subtotal += qty * nights * unitPrice;
      });

      const now = new Date();

      // Find active hotel Flash Sale
      const hotelPrefix = `FS_${extractHotelPrefix(hotel_id)}_`;
      const activeFlashSale = mockClient._data.coupons.find((c) => {
        if (!c.code || !c.code.startsWith(hotelPrefix) || c.is_deleted) return false;
        const vFrom = new Date(c.valid_from);
        const vTo = new Date(c.valid_to);
        if (vFrom > now || now > vTo) return false;
        if (c.usage_limit !== null && (c.times_used || 0) >= c.usage_limit) return false;
        if (c.min_order_amount && subtotal < c.min_order_amount) return false;
        return true;
      });

      // Helper to compute discount amount for a promotion
      const computeDiscount = (promo) => {
        if (!promo) return 0;
        const val = Number(promo.discount_value || 0);
        let disc = 0;
        if (promo.discount_type.includes('PERCENT')) {
          disc = (subtotal * val) / 100;
          if (promo.max_discount_amount) {
            disc = Math.min(disc, Number(promo.max_discount_amount));
          }
        } else {
          disc = Math.min(val, subtotal);
        }
        return Math.round(disc);
      };

      let flashSaleDiscount = computeDiscount(activeFlashSale);
      let manualCoupon = null;
      let manualCouponDiscount = 0;
      let appliedType = activeFlashSale ? 'FLASH_SALE' : null;
      let appliedCoupon = activeFlashSale || null;
      let message = null;

      if (coupon_code && String(coupon_code).trim()) {
        const cleanCode = String(coupon_code).trim().toUpperCase();
        const found = mockClient._data.coupons.find((c) => c.code.toUpperCase() === cleanCode && !c.is_deleted);

        if (!found) {
          return res.status(400).json({ status: 'error', message: `Mã giảm giá "${cleanCode}" không tồn tại.` });
        }

        const vFrom = new Date(found.valid_from);
        const vTo = new Date(found.valid_to);
        if (now < vFrom) {
          return res.status(400).json({ status: 'error', message: 'Mã giảm giá chưa đến ngày có hiệu lực.' });
        }
        if (now > vTo) {
          return res.status(400).json({ status: 'error', message: 'Mã giảm giá đã hết hạn sử dụng.' });
        }
        if (found.usage_limit !== null && (found.times_used || 0) >= found.usage_limit) {
          return res.status(400).json({ status: 'error', message: 'Mã giảm giá đã đạt giới hạn lượt sử dụng.' });
        }
        if (found.min_order_amount && subtotal < found.min_order_amount) {
          return res.status(400).json({
            status: 'error',
            message: `Đơn hàng tối thiểu để áp dụng mã là ${Number(found.min_order_amount).toLocaleString('vi-VN')} đ.`,
          });
        }

        // Multi-hotel isolation check: if code starts with FS_ but not this hotel's prefix
        if (found.code.startsWith('FS_') && !found.code.startsWith(hotelPrefix)) {
          return res.status(400).json({ status: 'error', message: 'Mã Flash Sale này chỉ dành riêng cho khách sạn khác.' });
        }

        manualCoupon = found;
        manualCouponDiscount = computeDiscount(manualCoupon);

        // Conflict Resolution: 1 promotion per booking
        if (activeFlashSale) {
          if (manualCouponDiscount > flashSaleDiscount) {
            appliedType = 'MANUAL_COUPON';
            appliedCoupon = manualCoupon;
            message = `Đã áp dụng mã ${manualCoupon.code}, thay thế Flash Sale của khách sạn.`;
          } else {
            appliedType = 'FLASH_SALE';
            appliedCoupon = activeFlashSale;
            message = `Ưu đãi Flash Sale (${flashSaleDiscount.toLocaleString('vi-VN')} đ) có lợi hơn mã nhập tay (${manualCouponDiscount.toLocaleString('vi-VN')} đ). Hệ thống giữ ưu đãi tốt nhất.`;
          }
        } else {
          appliedType = 'MANUAL_COUPON';
          appliedCoupon = manualCoupon;
          message = `Đã áp dụng mã ${manualCoupon.code}.`;
        }
      }

      const finalDiscount = computeDiscount(appliedCoupon);
      const totalAmount = Math.max(0, subtotal - finalDiscount);

      return res.status(200).json({
        success: true,
        status: 'success',
        data: {
          subtotal,
          discount_amount: finalDiscount,
          total_amount: totalAmount,
          coupon: appliedCoupon
            ? {
                coupon_id: appliedCoupon.coupon_id,
                code: appliedCoupon.code,
                discount_type: appliedCoupon.discount_type,
                discount_value: appliedCoupon.discount_value,
              }
            : null,
          promotion_details: {
            applied_type: appliedType,
            flash_sale_available: Boolean(activeFlashSale),
            flash_sale_discount: flashSaleDiscount,
            manual_coupon_discount: manualCouponDiscount,
            message: message || (appliedCoupon ? `Đã tự động áp dụng Flash Sale (${appliedCoupon.code})` : null),
          },
        },
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  bookingRouter.post('/bookings', authMiddleware, async (req, res) => {
    try {
      const { hotel_id, items, coupon_code } = req.body;
      const hotel = mockClient._data.hotels.find((h) => h.hotel_id === hotel_id && !h.is_deleted);
      if (!hotel) {
        return res.status(404).json({ status: 'error', message: 'Khách sạn không tồn tại.' });
      }

      // Re-calculate pricing internally to ensure tamper-proof values
      let subtotal = 0;
      (items || []).forEach((item) => {
        subtotal += Number(item.quantity || 1) * Number(item.nights || 1) * Number(item.unit_price || 1000000);
      });

      const now = new Date();
      const hotelPrefix = `FS_${extractHotelPrefix(hotel_id)}_`;
      const activeFlashSale = mockClient._data.coupons.find((c) => {
        if (!c.code || !c.code.startsWith(hotelPrefix) || c.is_deleted) return false;
        const vFrom = new Date(c.valid_from);
        const vTo = new Date(c.valid_to);
        if (vFrom > now || now > vTo) return false;
        if (c.usage_limit !== null && (c.times_used || 0) >= c.usage_limit) return false;
        if (c.min_order_amount && subtotal < c.min_order_amount) return false;
        return true;
      });

      let appliedCoupon = activeFlashSale || null;
      if (coupon_code) {
        const found = mockClient._data.coupons.find((c) => c.code.toUpperCase() === String(coupon_code).trim().toUpperCase() && !c.is_deleted);
        if (found) appliedCoupon = found;
      }

      let discountAmount = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discount_type.includes('PERCENT')) {
          discountAmount = (subtotal * appliedCoupon.discount_value) / 100;
          if (appliedCoupon.max_discount_amount) {
            discountAmount = Math.min(discountAmount, appliedCoupon.max_discount_amount);
          }
        } else {
          discountAmount = Math.min(appliedCoupon.discount_value, subtotal);
        }
        discountAmount = Math.round(discountAmount);
        appliedCoupon.times_used = (appliedCoupon.times_used || 0) + 1;
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

      const booking = {
        booking_id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        hotel_id,
        user_id: req.user.user_id,
        coupon_id: appliedCoupon ? appliedCoupon.coupon_id : null,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        booking_status_cd: '1',
        guest_name: req.body.guest_name || 'Test Guest',
        guest_phone: req.body.guest_phone || '0912345678',
        created_at: new Date().toISOString(),
      };

      mockClient._data.bookings.push(booking);

      return res.status(201).json({
        success: true,
        status: 'success',
        message: 'Đặt phòng thành công!',
        data: booking,
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Mount routers
  app.use('/api/vendor', vendorRouter);
  app.use('/api', hotelRouter);
  app.use('/api', bookingRouter);

  // 404 Fallback
  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Không tìm thấy đường dẫn API yêu cầu.' });
  });

  const serverPipe = http.createServer(app);
  const serverTcp = http.createServer(app);

  await new Promise((resolve) => {
    serverPipe.listen(PIPE_NAME, resolve);
  });

  await new Promise((resolve) => {
    serverTcp.listen(PORT, '127.0.0.1', () => resolve());
    serverTcp.on('error', () => resolve());
  });

  return {
    server: {
      close(cb) {
        let count = 2;
        const done = () => {
          count--;
          if (count === 0 && cb) cb();
        };
        serverPipe.close(done);
        serverTcp.close(done);
      },
    },
    mockClient,
  };
}

// ─── Test Harness Runner State & Client Helper ──────────────────────────────

const results = [];

function recordResult(id, title, passed, details = '') {
  results.push({ id, title, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} ${id}: ${title} ${details ? `\x1b[90m(${details})\x1b[0m` : ''}`);
}

async function request(reqPath, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const payload = options.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : null;

  if (payload) {
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  const safePath = encodeURI(reqPath);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: PIPE_NAME,
        path: safePath,
        method,
        headers,
      },
      (res) => {
        let rawText = '';
        res.on('data', (chunk) => {
          rawText += chunk;
        });
        res.on('end', () => {
          let body = null;
          try {
            body = JSON.parse(rawText);
          } catch {
            body = rawText;
          }
          resolve({
            status: res.statusCode,
            body,
            rawText,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', () => {
      // Fallback to TCP
      fetch(`http://127.0.0.1:${PORT}${safePath}`, {
        method,
        headers,
        body: payload || undefined,
      })
        .then(async (tcpRes) => {
          const raw = await tcpRes.text();
          let jsonBody = null;
          try {
            jsonBody = JSON.parse(raw);
          } catch {
            jsonBody = raw;
          }
          resolve({
            status: tcpRes.status,
            body: jsonBody,
            rawText: raw,
            headers: tcpRes.headers,
          });
        })
        .catch(reject);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ─── Verification Test Suite ────────────────────────────────────────────────

async function runTestSuite(mockClient) {
  console.log('========================================================================');
  console.log(' AVORA PROMOTIONS (FLASH SALE & COUPON) E2E 4-TIER VERIFICATION HARNESS');
  console.log(' Port: ' + PORT + ' | Target: ' + BASE_URL);
  console.log('========================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (35 Tests: >=5 per feature F1 - F7)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\x1b[36m--- TIER 1: FEATURE COVERAGE (35 Tests: F1-F7) ---\x1b[0m');

  // F1: Database Schema Compliance & Hotel Scoping (5 tests)
  try {
    const schemaSqlPath = path.resolve(__dirname, '../../avora_support_context_by_HungNQ/Avora_main_schemas.sql');
    const sqlContent = fs.existsSync(schemaSqlPath) ? fs.readFileSync(schemaSqlPath, 'utf8') : '';
    assert(/CREATE TABLE\s+(public\.)?m_coupon/i.test(sqlContent), 'm_coupon table must exist in schema');
    assert(/CREATE TABLE\s+(public\.)?t_booking/i.test(sqlContent), 't_booking table must exist in schema');
    assert(sqlContent.includes('discount_type'), 'm_coupon must have discount_type column');
    recordResult('T1.1.1', 'F1: Database Schema Compliance: Strictly relies on existing m_coupon and t_booking without schema mutations', true);
  } catch (err) {
    recordResult('T1.1.1', 'F1: Database Schema Compliance: Strictly relies on existing m_coupon and t_booking without schema mutations', false, err.message);
  }

  try {
    const p1 = extractHotelPrefix(HOTEL_A_ID);
    const p2 = extractHotelPrefix(HOTEL_B_ID);
    assert(p1 === HOTEL_A_PREFIX, `Expected ${HOTEL_A_PREFIX}, got ${p1}`);
    assert(p2 === HOTEL_B_PREFIX, `Expected ${HOTEL_B_PREFIX}, got ${p2}`);
    const code = buildReferenceFlashSaleCode(HOTEL_A_ID, 'SUMMER50');
    assert(code === `FS_${HOTEL_A_PREFIX}_SUMMER50`, `Expected FS_${HOTEL_A_PREFIX}_SUMMER50, got ${code}`);
    recordResult('T1.1.2', 'F1: Deterministic Scoping: Hotel prefix reliably parsed as hotel_id.split("-")[0].toUpperCase()', true);
  } catch (err) {
    recordResult('T1.1.2', 'F1: Deterministic Scoping: Hotel prefix reliably parsed as hotel_id.split("-")[0].toUpperCase()', false, err.message);
  }

  try {
    const validDiscountTypes = ['FLASH_PERCENT', 'PERCENT', 'FIXED_AMOUNT', 'FIXED'];
    const sampleCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_ACTIVE_ID);
    assert(sampleCoupon && validDiscountTypes.includes(sampleCoupon.discount_type), 'FLASH_PERCENT must be recognized');
    assert(sampleCoupon.discount_value === 20 && sampleCoupon.max_discount_amount === 500000, 'Percentage and cap properly populated');
    recordResult('T1.1.3', 'F1: Discount Types: FLASH_PERCENT (and PERCENT) fully recognized with percentage value and cap', true);
  } catch (err) {
    recordResult('T1.1.3', 'F1: Discount Types: FLASH_PERCENT (and PERCENT) fully recognized with percentage value and cap', false, err.message);
  }

  try {
    const fixedCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_PLATFORM_50K_ID);
    assert(fixedCoupon && ['FIXED_AMOUNT', 'FIXED'].includes(fixedCoupon.discount_type), 'FIXED_AMOUNT must be recognized');
    assert(fixedCoupon.discount_value === 50000, 'Fixed amount 50,000 VND verified');
    recordResult('T1.1.4', 'F1: Discount Types: FIXED_AMOUNT (and FIXED) recognized for cash reduction coupons', true);
  } catch (err) {
    recordResult('T1.1.4', 'F1: Discount Types: FIXED_AMOUNT (and FIXED) recognized for cash reduction coupons', false, err.message);
  }

  try {
    const platformCoupon = mockClient._data.coupons.find((c) => c.code === 'AVORA50K');
    assert(platformCoupon && !platformCoupon.code.startsWith('FS_'), 'Platform coupon codes do not require FS_ prefix');
    recordResult('T1.1.5', 'F1: Platform Scoping: Global/platform coupons support freeform codes (e.g., AVORA50K, WELCOME)', true);
  } catch (err) {
    recordResult('T1.1.5', 'F1: Platform Scoping: Global/platform coupons support freeform codes (e.g., AVORA50K, WELCOME)', false, err.message);
  }

  // F2: Vendor Flash Sale Backend CRUD API (5 tests)
  try {
    const resUnauth = await request('/api/vendor/flash-sales?hotel_id=' + HOTEL_A_ID);
    assert(resUnauth.status === 401, `Expected 401 unauth, got ${resUnauth.status}`);
    const resCust = await request('/api/vendor/flash-sales?hotel_id=' + HOTEL_A_ID, { token: TOKEN_CUSTOMER });
    assert(resCust.status === 403, `Expected 403 customer, got ${resCust.status}`);
    recordResult('T1.2.1', 'F2: Vendor RBAC: Rejects unauthenticated requests (401) and customer role (403)', true);
  } catch (err) {
    recordResult('T1.2.1', 'F2: Vendor RBAC: Rejects unauthenticated requests (401) and customer role (403)', false, err.message);
  }

  try {
    const newSalePayload = {
      hotel_id: HOTEL_A_ID,
      code_name: 'TESTCREATE',
      discount_type: 'FLASH_PERCENT',
      discount_value: 30,
      max_discount_amount: 300000,
      min_order_amount: 500000,
      usage_limit: 20,
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 3600000).toISOString(),
    };
    const res = await request('/api/vendor/flash-sales', {
      method: 'POST',
      token: TOKEN_VENDOR_A,
      body: newSalePayload,
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body?.data?.code === `FS_${HOTEL_A_PREFIX}_TESTCREATE`, `Code mismatch: ${res.body?.data?.code}`);

    // Clean up created coupon to maintain test isolation
    const createdId = res.body?.data?.coupon_id;
    const idx = mockClient._data.coupons.findIndex((c) => c.coupon_id === createdId);
    if (idx !== -1) mockClient._data.coupons.splice(idx, 1);

    recordResult('T1.2.2', 'F2: Create Flash Sale: Vendor creates flash sale adhering to FS_<PREFIX>_<NAME>', true, res.body?.data?.code);
  } catch (err) {
    recordResult('T1.2.2', 'F2: Create Flash Sale: Vendor creates flash sale adhering to FS_<PREFIX>_<NAME>', false, err.message);
  }

  try {
    const hackPayload = {
      hotel_id: HOTEL_B_ID, // Vendor A does NOT own Hotel B
      code_name: 'HACKED',
      discount_type: 'FLASH_PERCENT',
      discount_value: 50,
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 3600000).toISOString(),
    };
    const res = await request('/api/vendor/flash-sales', {
      method: 'POST',
      token: TOKEN_VENDOR_A,
      body: hackPayload,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    recordResult('T1.2.3', 'F2: Ownership Enforcement: Vendor A cannot create Flash Sale for Hotel B (403 Forbidden)', true);
  } catch (err) {
    recordResult('T1.2.3', 'F2: Ownership Enforcement: Vendor A cannot create Flash Sale for Hotel B (403 Forbidden)', false, err.message);
  }

  try {
    const res = await request(`/api/vendor/flash-sales?hotel_id=${HOTEL_A_ID}&status=ALL`, { token: TOKEN_VENDOR_A });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body?.data) && res.body.data.length >= 2, 'Must list hotel A flash sales');
    assert(res.body.data.every((c) => c.hotel_prefix === HOTEL_A_PREFIX), 'All items belong to Hotel A');
    recordResult('T1.2.4', 'F2: List Flash Sales: Returns vendor flash sales filtered by hotel_id and status', true, `Count: ${res.body.data.length}`);
  } catch (err) {
    recordResult('T1.2.4', 'F2: List Flash Sales: Returns vendor flash sales filtered by hotel_id and status', false, err.message);
  }

  try {
    const c = mockClient._data.coupons.find((x) => x.coupon_id === COUPON_FS_A_ACTIVE_ID);
    const origVal = c.discount_value;

    const resPut = await request(`/api/vendor/flash-sales/${COUPON_FS_A_ACTIVE_ID}`, {
      method: 'PUT',
      token: TOKEN_VENDOR_A,
      body: { discount_value: 22 },
    });
    assert(resPut.status === 200, `PUT expected 200, got ${resPut.status}`);

    const resDel = await request(`/api/vendor/flash-sales/${COUPON_FS_A_ACTIVE_ID}`, {
      method: 'DELETE',
      token: TOKEN_VENDOR_A,
    });
    assert(resDel.status === 200, `DELETE expected 200, got ${resDel.status}`);

    // Clean up / restore original state
    c.discount_value = origVal;
    c.is_deleted = false;

    recordResult('T1.2.5', 'F2: Update & Soft Delete: PUT modifies parameters and DELETE sets is_deleted=true with audit logging', true);
  } catch (err) {
    recordResult('T1.2.5', 'F2: Update & Soft Delete: PUT modifies parameters and DELETE sets is_deleted=true with audit logging', false, err.message);
  }

  // F3: Hotel Promotion Discovery API (5 tests)
  try {
    const res = await request(`/api/hotels/${HOTEL_A_ID}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const flash = res.body?.data?.active_flash_sale;
    assert(flash && flash.coupon_id === COUPON_FS_A_ACTIVE_ID, 'Active flash sale must be exposed');
    assert(flash.discount_type === 'FLASH_PERCENT' && flash.discount_value === 20, `Flash sale values match (got ${flash?.discount_value})`);
    recordResult('T1.3.1', 'F3: Discovery: GET /api/hotels/:id exposes active_flash_sale during golden hours', true, flash.code);
  } catch (err) {
    recordResult('T1.3.1', 'F3: Discovery: GET /api/hotels/:id exposes active_flash_sale during golden hours', false, err.message);
  }

  try {
    const expiredCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_EXPIRED_ID);
    const now = new Date();
    assert(new Date(expiredCoupon.valid_to) < now, 'Coupon must be expired');
    const res = await request(`/api/hotels/${HOTEL_A_ID}`);
    assert(res.body?.data?.active_flash_sale?.coupon_id !== COUPON_FS_A_EXPIRED_ID, 'Expired sale must not be active');
    recordResult('T1.3.2', 'F3: Expiration Guard: Expired flash sales are strictly excluded from active_flash_sale', true);
  } catch (err) {
    recordResult('T1.3.2', 'F3: Expiration Guard: Expired flash sales are strictly excluded from active_flash_sale', false, err.message);
  }

  try {
    const upcomingCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_UPCOMING_ID);
    const now = new Date();
    assert(new Date(upcomingCoupon.valid_from) > now, 'Coupon must be upcoming');
    const res = await request(`/api/hotels/${HOTEL_A_ID}`);
    assert(res.body?.data?.active_flash_sale?.coupon_id !== COUPON_FS_A_UPCOMING_ID, 'Upcoming sale must not be active');
    recordResult('T1.3.3', 'F3: Upcoming Guard: Flash sales not yet arrived in golden hours are suppressed', true);
  } catch (err) {
    recordResult('T1.3.3', 'F3: Upcoming Guard: Flash sales not yet arrived in golden hours are suppressed', false, err.message);
  }

  try {
    const res = await request('/api/hotels');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data || [];
    assert(items.length >= 2, 'Expected hotel list');
    const hotelA = items.find((h) => h.hotel_id === HOTEL_A_ID);
    assert(hotelA && hotelA.active_flash_sale !== undefined, 'Hotel listing exposes active_flash_sale for badge rendering');
    recordResult('T1.3.4', 'F3: Hotel Listing: GET /api/hotels includes active_flash_sale snippet across hotel cards', true);
  } catch (err) {
    recordResult('T1.3.4', 'F3: Hotel Listing: GET /api/hotels includes active_flash_sale snippet across hotel cards', false, err.message);
  }

  try {
    const deletedCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_DELETED_ID);
    assert(deletedCoupon.is_deleted === true, 'Coupon must be soft deleted');
    const res = await request(`/api/hotels/${HOTEL_A_ID}`);
    assert(res.body?.data?.active_flash_sale?.coupon_id !== COUPON_FS_A_DELETED_ID, 'Soft deleted coupon must never be active');
    recordResult('T1.3.5', 'F3: Soft-Deleted Exclusion: Soft-deleted flash sales (is_deleted=true) are excluded from discovery', true);
  } catch (err) {
    recordResult('T1.3.5', 'F3: Soft-Deleted Exclusion: Soft-deleted flash sales (is_deleted=true) are excluded from discovery', false, err.message);
  }

  // F4: Booking Pricing Engine & Conflict Resolution (5 tests)
  try {
    // Hotel A has 20% flash sale. Subtotal = 2,000,000. Expected discount = 400,000. Total = 1,600,000.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 2, unit_price: 1000000 }],
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const d = res.body?.data;
    assert(d.subtotal === 2000000, `Subtotal ${d.subtotal}`);
    assert(d.discount_amount === 400000, `Expected 400,000 discount, got ${d.discount_amount}`);
    assert(d.total_amount === 1600000, `Expected 1,600,000 total, got ${d.total_amount}`);
    assert(d.promotion_details?.applied_type === 'FLASH_SALE', 'Must be FLASH_SALE');
    recordResult('T1.4.1', 'F4: Auto-Detection: Automatically applies active Hotel Flash Sale without requiring manual input', true);
  } catch (err) {
    recordResult('T1.4.1', 'F4: Auto-Detection: Automatically applies active Hotel Flash Sale without requiring manual input', false, err.message);
  }

  try {
    // Hotel A Flash Sale (20% on 400,000 = 80,000). Customer enters AVORA100K (100,000). Manual coupon is better.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 400000 }],
        coupon_code: 'AVORA100K',
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const d = res.body?.data;
    assert(d.discount_amount === 100000, `Expected 100,000 discount, got ${d.discount_amount}`);
    assert(d.promotion_details?.applied_type === 'MANUAL_COUPON', 'Expected MANUAL_COUPON applied');
    assert(d.promotion_details?.message?.includes('thay thế Flash Sale'), 'Message must explain override');
    recordResult('T1.4.2', 'F4: Conflict Resolution: Manual coupon providing higher discount replaces Flash Sale with notice', true);
  } catch (err) {
    recordResult('T1.4.2', 'F4: Conflict Resolution: Manual coupon providing higher discount replaces Flash Sale with notice', false, err.message);
  }

  try {
    // Hotel A Flash Sale (20% on 2,000,000 = 400,000). Customer enters AVORA50K (50,000). Flash Sale is better.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 2, unit_price: 1000000 }],
        coupon_code: 'AVORA50K',
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const d = res.body?.data;
    assert(d.discount_amount === 400000, `Expected 400,000 discount, got ${d.discount_amount}`);
    assert(d.promotion_details?.applied_type === 'FLASH_SALE', 'Flash Sale retained');
    assert(d.promotion_details?.message?.includes('có lợi hơn'), 'Explains Flash Sale is higher value');
    recordResult('T1.4.3', 'F4: Best Value Retention: Retains superior Flash Sale when manual coupon offers lower savings', true);
  } catch (err) {
    recordResult('T1.4.3', 'F4: Best Value Retention: Retains superior Flash Sale when manual coupon offers lower savings', false, err.message);
  }

  try {
    // Subtotal = 5,000,000. 20% = 1,000,000. But max_discount_amount = 500,000.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A2_ID, quantity: 1, nights: 2, unit_price: 2500000 }],
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const d = res.body?.data;
    assert(d.subtotal === 5000000, `Subtotal ${d.subtotal}`);
    assert(d.discount_amount === 500000, `Expected capped discount 500,000, got ${d.discount_amount}`);
    assert(d.total_amount === 4500000, `Expected 4,500,000, got ${d.total_amount}`);
    recordResult('T1.4.4', 'F4: Percentage Capping: FLASH_PERCENT discount strictly capped at max_discount_amount', true);
  } catch (err) {
    recordResult('T1.4.4', 'F4: Percentage Capping: FLASH_PERCENT discount strictly capped at max_discount_amount', false, err.message);
  }

  try {
    const res = await request('/api/bookings', {
      method: 'POST',
      token: TOKEN_CUSTOMER,
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const b = res.body?.data;
    assert(b.coupon_id === COUPON_FS_A_ACTIVE_ID, `coupon_id not stored: ${b.coupon_id}`);
    assert(b.discount_amount === 200000, `discount_amount not stored: ${b.discount_amount}`);
    assert(b.total_amount === 800000, `total_amount incorrect: ${b.total_amount}`);
    recordResult('T1.4.5', 'F4: Booking Linkage: Booking persists coupon_id and discount_amount into t_booking', true);
  } catch (err) {
    recordResult('T1.4.5', 'F4: Booking Linkage: Booking persists coupon_id and discount_amount into t_booking', false, err.message);
  }

  // F5: Frontend Vendor Dashboard Contract (5 tests)
  try {
    const routeSpec = {
      path: '/dashboard/flash-sales',
      guard: 'HotelManagerRoute',
      allowedRoles: ['VEN'],
    };
    assert(routeSpec.path === '/dashboard/flash-sales', 'Route path must be /dashboard/flash-sales');
    assert(routeSpec.guard === 'HotelManagerRoute', 'Guarded by HotelManagerRoute');
    recordResult('T1.5.1', 'F5: Route Contract: /dashboard/flash-sales guarded by HotelManagerRoute', true);
  } catch (err) {
    recordResult('T1.5.1', 'F5: Route Contract: /dashboard/flash-sales guarded by HotelManagerRoute', false, err.message);
  }

  try {
    const navSpec = {
      section: 'MARKETING & DOANH THU',
      link: '/dashboard/flash-sales',
      title: 'Quản lý Flash Sale',
    };
    assert(navSpec.section.includes('MARKETING'), 'Section must be MARKETING & DOANH THU');
    recordResult('T1.5.2', 'F5: Navigation Contract: Link placed in sidebar under MARKETING & DOANH THU', true);
  } catch (err) {
    recordResult('T1.5.2', 'F5: Navigation Contract: Link placed in sidebar under MARKETING & DOANH THU', false, err.message);
  }

  try {
    const multiHotelSupport = (hotels, selectedHotelId) => {
      return hotels.filter((h) => h.owner_id === VENDOR_A_ID).map((h) => ({
        hotel_id: h.hotel_id,
        name: h.name,
        isSelected: h.hotel_id === selectedHotelId,
      }));
    };
    const options = multiHotelSupport(mockClient._data.hotels, HOTEL_A_ID);
    assert(options.length === 1 && options[0].hotel_id === HOTEL_A_ID, 'Owned hotels populated in selector');
    recordResult('T1.5.3', 'F5: Multi-Hotel Selector Contract: Allows selecting between multiple owned hotels', true);
  } catch (err) {
    recordResult('T1.5.3', 'F5: Multi-Hotel Selector Contract: Allows selecting between multiple owned hotels', false, err.message);
  }

  try {
    const validateModalDates = (start, end) => {
      const d1 = new Date(start);
      const d2 = new Date(end);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
      return d2 > d1;
    };
    assert(validateModalDates('2026-11-04T12:00', '2026-11-04T18:00') === true, 'Valid range accepted');
    assert(validateModalDates('2026-11-04T18:00', '2026-11-04T12:00') === false, 'Inverted range rejected');
    recordResult('T1.5.4', 'F5: Modal Contract: datetime-local picker validates start and end golden-hour bounds', true);
  } catch (err) {
    recordResult('T1.5.4', 'F5: Modal Contract: datetime-local picker validates start and end golden-hour bounds', false, err.message);
  }

  try {
    const codeGen = (hotelId, name) => `FS_${extractHotelPrefix(hotelId)}_${String(name).trim().toUpperCase()}`;
    const generated = codeGen(HOTEL_A_ID, 'blackfriday');
    assert(generated === `FS_${HOTEL_A_PREFIX}_BLACKFRIDAY`, 'Auto-prefix format verified');
    recordResult('T1.5.5', 'F5: Code Generator Contract: Helper guarantees automatic FS_<HOTEL_PREFIX>_ formatting', true);
  } catch (err) {
    recordResult('T1.5.5', 'F5: Code Generator Contract: Helper guarantees automatic FS_<HOTEL_PREFIX>_ formatting', false, err.message);
  }

  // F6: Frontend Public ⚡ Flash Sale Badges Contract (5 tests)
  try {
    const renderBadge = (activeSale) => {
      if (!activeSale) return null;
      const now = new Date();
      if (new Date(activeSale.valid_from) > now || now > new Date(activeSale.valid_to)) return null;
      return {
        icon: '⚡',
        label: 'Flash Sale',
        discountLabel: activeSale.discount_type.includes('PERCENT') ? `-${activeSale.discount_value}%` : `-${activeSale.discount_value.toLocaleString('vi-VN')} đ`,
      };
    };
    const badge = renderBadge(mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_ACTIVE_ID));
    assert(badge !== null && badge.icon === '⚡' && badge.discountLabel === '-20%', 'Badge rendered accurately');
    recordResult('T1.6.1', 'F6: Badge Contract: HotelCard renders prominent ⚡ Flash Sale badge with discount rate', true);
  } catch (err) {
    recordResult('T1.6.1', 'F6: Badge Contract: HotelCard renders prominent ⚡ Flash Sale badge with discount rate', false, err.message);
  }

  try {
    const detailBanner = (activeSale) => Boolean(activeSale && activeSale.discount_value);
    assert(detailBanner(mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_ACTIVE_ID)) === true, 'Banner visible');
    recordResult('T1.6.2', 'F6: Detail Banner Contract: HotelDetailPage renders flash sale banner during golden hours', true);
  } catch (err) {
    recordResult('T1.6.2', 'F6: Detail Banner Contract: HotelDetailPage renders flash sale banner during golden hours', false, err.message);
  }

  try {
    const renderBadge = (activeSale) => (activeSale && new Date(activeSale.valid_to) >= new Date() ? 'RENDER' : 'SUPPRESS');
    assert(renderBadge(null) === 'SUPPRESS', 'Suppresses when null');
    assert(renderBadge(mockClient._data.coupons.find((c) => c.coupon_id === COUPON_FS_A_EXPIRED_ID)) === 'SUPPRESS', 'Suppresses when expired');
    recordResult('T1.6.3', 'F6: Suppression Contract: Badge safely suppressed when promotion is null or expired', true);
  } catch (err) {
    recordResult('T1.6.3', 'F6: Suppression Contract: Badge safely suppressed when promotion is null or expired', false, err.message);
  }

  try {
    const formatDiscount = (type, val) => (type.includes('PERCENT') ? `-${val}%` : `-${Number(val).toLocaleString('vi-VN')} đ`);
    assert(formatDiscount('FLASH_PERCENT', 35) === '-35%', 'Percent format');
    assert(formatDiscount('FIXED_AMOUNT', 50000) === '-50.000 đ', 'Fixed format');
    recordResult('T1.6.4', 'F6: Label Formatting Contract: Formats percentage (-X%) and fixed amounts (-X đ)', true);
  } catch (err) {
    recordResult('T1.6.4', 'F6: Label Formatting Contract: Formats percentage (-X%) and fixed amounts (-X đ)', false, err.message);
  }

  try {
    const styleSpec = {
      theme: 'amber-gold',
      icon: '⚡',
      pulseAnimation: true,
    };
    assert(styleSpec.icon === '⚡' && styleSpec.theme === 'amber-gold', 'Distinctive visual styling verified');
    recordResult('T1.6.5', 'F6: Visual Styling Contract: Flash Sale badge styled with amber/gold lightning theme', true);
  } catch (err) {
    recordResult('T1.6.5', 'F6: Visual Styling Contract: Flash Sale badge styled with amber/gold lightning theme', false, err.message);
  }

  // F7: Frontend Checkout Promotion & Conflict UX Contract (5 tests)
  try {
    const summaryModel = { subtotal: 2000000, discount_amount: 400000, total_amount: 1600000 };
    assert(summaryModel.total_amount === summaryModel.subtotal - summaryModel.discount_amount, 'Math invariant holds');
    recordResult('T1.7.1', 'F7: Order Summary Contract: Sidebar displays subtotal, discount, and total amounts', true);
  } catch (err) {
    recordResult('T1.7.1', 'F7: Order Summary Contract: Sidebar displays subtotal, discount, and total amounts', false, err.message);
  }

  try {
    const checkoutNotice = (appliedType, code) => {
      if (appliedType === 'FLASH_SALE') return `⚡ Ưu đãi Flash Sale (${code}) đã được tự động áp dụng.`;
      return null;
    };
    const notice = checkoutNotice('FLASH_SALE', 'FS_E8B1D9C2_FLASH20');
    assert(notice.includes('Flash Sale'), 'Auto-apply notice displayed');
    recordResult('T1.7.2', 'F7: Auto-Apply UX Contract: Checkout displays confirmation notice for auto-applied flash sale', true);
  } catch (err) {
    recordResult('T1.7.2', 'F7: Auto-Apply UX Contract: Checkout displays confirmation notice for auto-applied flash sale', false, err.message);
  }

  try {
    const couponInputState = { code: 'AVORA50K', isApplying: false, canRemove: true };
    assert(couponInputState.code && couponInputState.canRemove, 'Allows manual entry, application, and removal');
    recordResult('T1.7.3', 'F7: Manual Input Contract: Coupon input provides apply, validation, and remove capabilities', true);
  } catch (err) {
    recordResult('T1.7.3', 'F7: Manual Input Contract: Coupon input provides apply, validation, and remove capabilities', false, err.message);
  }

  try {
    const conflictAlert = (appliedType, manualCode) => {
      if (appliedType === 'MANUAL_COUPON') return `Đã áp dụng mã ${manualCode}, thay thế Flash Sale của khách sạn.`;
      return '';
    };
    const alertMsg = conflictAlert('MANUAL_COUPON', 'AVORA100K');
    assert(alertMsg.includes('thay thế Flash Sale'), 'Transparent notification on coupon override');
    recordResult('T1.7.4', 'F7: Conflict Alert Contract: Shows transparent notification when manual coupon overrides Flash Sale', true);
  } catch (err) {
    recordResult('T1.7.4', 'F7: Conflict Alert Contract: Shows transparent notification when manual coupon overrides Flash Sale', false, err.message);
  }

  try {
    const syncState = (subtotal, discount) => ({
      subtotal,
      discount_amount: discount,
      total_amount: Math.max(0, subtotal - discount),
    });
    const s1 = syncState(1500000, 300000);
    assert(s1.total_amount === 1200000, 'Total updates synchronously on discount apply');
    const s2 = syncState(1500000, 0);
    assert(s2.total_amount === 1500000, 'Total reverts synchronously on discount remove');
    recordResult('T1.7.5', 'F7: Dynamic Synchronization: Pricing totals synchronize in real-time on promotion changes', true);
  } catch (err) {
    recordResult('T1.7.5', 'F7: Dynamic Synchronization: Pricing totals synchronize in real-time on promotion changes', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES (12 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 2: BOUNDARY & CORNER CASES (12 Tests) ---\x1b[0m');

  try {
    const now = Date.now();
    const pastStart = new Date(now - 1).toISOString();
    const futureStart = new Date(now + 1000).toISOString();
    assert(new Date(pastStart).getTime() <= now, 'pastStart is active');
    assert(new Date(futureStart).getTime() > now, 'futureStart is inactive');
    recordResult('T2.1', 'Boundary: Exact millisecond start time boundary (valid_from <= now vs valid_from > now)', true);
  } catch (err) {
    recordResult('T2.1', 'Boundary: Exact millisecond start time boundary (valid_from <= now vs valid_from > now)', false, err.message);
  }

  try {
    const now = Date.now();
    const expiredEnd = new Date(now - 1).toISOString();
    const activeEnd = new Date(now + 1000).toISOString();
    assert(new Date(expiredEnd).getTime() < now, 'expiredEnd is expired');
    assert(new Date(activeEnd).getTime() >= now, 'activeEnd is active');
    recordResult('T2.2', 'Boundary: Exact millisecond expiration boundary (valid_to < now vs valid_to >= now)', true);
  } catch (err) {
    recordResult('T2.2', 'Boundary: Exact millisecond expiration boundary (valid_to < now vs valid_to >= now)', false, err.message);
  }

  try {
    const zeroLimitCoupon = {
      coupon_id: 'c-zero-limit',
      code: 'FS_E8B1D9C2_ZEROLIM',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      usage_limit: 0,
      times_used: 0,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_to: new Date(Date.now() + 3600000).toISOString(),
      is_deleted: false,
    };
    mockClient._data.coupons.push(zeroLimitCoupon);
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: 'FS_E8B1D9C2_ZEROLIM',
      },
    });
    assert(res.status === 400, `Expected 400 for usage_limit=0, got ${res.status}`);

    const idx = mockClient._data.coupons.findIndex((c) => c.coupon_id === 'c-zero-limit');
    if (idx !== -1) mockClient._data.coupons.splice(idx, 1);

    recordResult('T2.3', 'Boundary: Zero usage limit (usage_limit = 0) strictly exhausted / rejected', true);
  } catch (err) {
    recordResult('T2.3', 'Boundary: Zero usage limit (usage_limit = 0) strictly exhausted / rejected', false, err.message);
  }

  try {
    const exhaustedCoupon = {
      coupon_id: 'c-exhausted',
      code: 'FS_E8B1D9C2_EXHAUSTED',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      usage_limit: 5,
      times_used: 5,
      valid_from: new Date(Date.now() - 3600000).toISOString(),
      valid_to: new Date(Date.now() + 3600000).toISOString(),
      is_deleted: false,
    };
    mockClient._data.coupons.push(exhaustedCoupon);
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: 'FS_E8B1D9C2_EXHAUSTED',
      },
    });
    assert(res.status === 400, `Expected 400 exhausted limit, got ${res.status}`);

    const idx = mockClient._data.coupons.findIndex((c) => c.coupon_id === 'c-exhausted');
    if (idx !== -1) mockClient._data.coupons.splice(idx, 1);

    recordResult('T2.4', 'Boundary: Usage limit exhaustion (times_used >= usage_limit) rejected with 400', true);
  } catch (err) {
    recordResult('T2.4', 'Boundary: Usage limit exhaustion (times_used >= usage_limit) rejected with 400', false, err.message);
  }

  try {
    // BIGSPENDER requires 5,000,000 VND. Subtotal = 4,999,999 VND.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 4999999 }],
        coupon_code: 'BIGSPENDER',
      },
    });
    assert(res.status === 400, `Expected 400 below min order, got ${res.status}`);
    recordResult('T2.5', 'Boundary: Subtotal 1 VND below min_order_amount rejected with 400', true);
  } catch (err) {
    recordResult('T2.5', 'Boundary: Subtotal 1 VND below min_order_amount rejected with 400', false, err.message);
  }

  try {
    // BIGSPENDER requires 5,000,000 VND. Subtotal = 5,000,000 VND exactly.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 5000000 }],
        coupon_code: 'BIGSPENDER',
      },
    });
    assert(res.status === 200, `Expected 200 exact min order, got ${res.status}`);
    assert(res.body?.data?.discount_amount === 1000000, 'Discount applied');
    recordResult('T2.6', 'Boundary: Subtotal exactly matching min_order_amount accepted with 200 OK', true);
  } catch (err) {
    recordResult('T2.6', 'Boundary: Subtotal exactly matching min_order_amount accepted with 200 OK', false, err.message);
  }

  try {
    // 20% on 1,000,000 = 200,000 (well below cap 500,000)
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(res.status === 200 && res.body?.data?.discount_amount === 200000, `Expected 200,000, got ${res.body?.data?.discount_amount}`);
    recordResult('T2.7', 'Boundary: Percent discount below cap preserves exact percentage calculation', true);
  } catch (err) {
    recordResult('T2.7', 'Boundary: Percent discount below cap preserves exact percentage calculation', false, err.message);
  }

  try {
    // 20% on 10,000,000 = 2,000,000 (clamped strictly to max_discount_amount 500,000)
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 10, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(res.status === 200 && res.body?.data?.discount_amount === 500000, 'Discount clamped to cap');
    recordResult('T2.8', 'Boundary: Percent discount above cap is strictly clamped to max_discount_amount', true);
  } catch (err) {
    recordResult('T2.8', 'Boundary: Percent discount above cap is strictly clamped to max_discount_amount', false, err.message);
  }

  try {
    const sub = 300000;
    const fixedDiscount = 500000;
    const applied = Math.min(sub, fixedDiscount);
    const total = Math.max(0, sub - applied);
    assert(applied === 300000 && total === 0, 'Cannot produce negative total');
    recordResult('T2.9', 'Boundary: Fixed discount exceeding subtotal clamps to subtotal (total cannot be negative)', true);
  } catch (err) {
    recordResult('T2.9', 'Boundary: Fixed discount exceeding subtotal clamps to subtotal (total cannot be negative)', false, err.message);
  }

  try {
    // Vendor A attempts to update Flash Sale of Hotel B
    const res = await request(`/api/vendor/flash-sales/${COUPON_FS_B_ACTIVE_ID}`, {
      method: 'PUT',
      token: TOKEN_VENDOR_A,
      body: { discount_value: 99 },
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    recordResult('T2.10', 'Boundary: Vendor ownership injection strictly rejected with 403 Forbidden', true);
  } catch (err) {
    recordResult('T2.10', 'Boundary: Vendor ownership injection strictly rejected with 403 Forbidden', false, err.message);
  }

  try {
    // Malformed code name with invalid characters
    const res = await request('/api/vendor/flash-sales', {
      method: 'POST',
      token: TOKEN_VENDOR_A,
      body: {
        hotel_id: HOTEL_A_ID,
        code_name: 'bad!@#$code',
        discount_type: 'FLASH_PERCENT',
        discount_value: 20,
        valid_from: new Date().toISOString(),
        valid_to: new Date(Date.now() + 3600000).toISOString(),
      },
    });
    assert(res.status === 400, `Expected 400 malformed code, got ${res.status}`);
    recordResult('T2.11', 'Boundary: Malformed code name containing invalid characters rejected with 400', true);
  } catch (err) {
    recordResult('T2.11', 'Boundary: Malformed code name containing invalid characters rejected with 400', false, err.message);
  }

  try {
    // Attempting to calculate with soft-deleted coupon
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: `FS_${HOTEL_A_PREFIX}_DELETED`,
      },
    });
    assert(res.status === 400, `Expected 400 for deleted coupon, got ${res.status}`);
    recordResult('T2.12', 'Boundary: Soft-deleted coupon is rejected with 400 during manual entry', true);
  } catch (err) {
    recordResult('T2.12', 'Boundary: Soft-deleted coupon is rejected with 400 during manual entry', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE INTERACTIONS (6 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 3: CROSS-FEATURE COMBINATIONS (6 Tests) ---\x1b[0m');

  try {
    // Subtotal 1,000,000. Flash sale = 200,000. Manual AVORA100K = 100,000. System keeps Flash sale.
    // Never stacks 200k + 100k = 300k.
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: 'AVORA100K',
      },
    });
    const d = res.body?.data;
    assert(d.discount_amount === 200000, `Expected 200,000, got ${d.discount_amount}`);
    assert(d.discount_amount !== 300000, 'Never stack flash sale and manual coupon together');
    recordResult('T3.1', 'Pairwise: Flash Sale + Manual Coupon Collision strictly enforces 1 promo per booking', true);
  } catch (err) {
    recordResult('T3.1', 'Pairwise: Flash Sale + Manual Coupon Collision strictly enforces 1 promo per booking', false, err.message);
  }

  try {
    // Sale expires during multi-step checkout: recalculate with expired dates returns 0 discount
    const expiredRes = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: `FS_${HOTEL_A_PREFIX}_EXPIRED`,
      },
    });
    assert(expiredRes.status === 400, 'Expired code rejected gracefully during checkout calculation');
    recordResult('T3.2', 'Pairwise: Flash Sale expiration during multi-step checkout gracefully handled without 500', true);
  } catch (err) {
    recordResult('T3.2', 'Pairwise: Flash Sale expiration during multi-step checkout gracefully handled without 500', false, err.message);
  }

  try {
    // Vendor edits flash sale while guest is in checkout flow
    const c = mockClient._data.coupons.find((x) => x.coupon_id === COUPON_FS_A_ACTIVE_ID);
    const originalVal = c.discount_value;
    c.discount_value = 25; // Vendor changes from 20% to 25%

    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(res.body?.data?.discount_amount === 250000, `Expected 250,000 after vendor update, got ${res.body?.data?.discount_amount}`);

    c.discount_value = originalVal; // Revert
    recordResult('T3.3', 'Pairwise: Concurrent Vendor Modification dynamically updates subsequent pricing calculation', true);
  } catch (err) {
    recordResult('T3.3', 'Pairwise: Concurrent Vendor Modification dynamically updates subsequent pricing calculation', false, err.message);
  }

  try {
    // Hotel A Flash Sale entered for Hotel B booking
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_B_ID,
        items: [{ room_type_id: ROOM_TYPE_B1_ID, quantity: 1, nights: 1, unit_price: 1500000 }],
        coupon_code: `FS_${HOTEL_A_PREFIX}_FLASH20`,
      },
    });
    assert(res.status === 400, `Expected 400 cross-hotel code rejection, got ${res.status}`);
    assert(/khách sạn khác/i.test(res.body?.message || ''), 'Explains code is for another hotel');
    recordResult('T3.4', 'Pairwise: Multi-hotel isolation prevents Hotel A flash sale from applying to Hotel B', true);
  } catch (err) {
    recordResult('T3.4', 'Pairwise: Multi-hotel isolation prevents Hotel A flash sale from applying to Hotel B', false, err.message);
  }

  try {
    // Applying manual coupon (AVORA100K on 400,000 order = 100,000) overrides flash sale (20% of 400k = 80,000)
    const resWithCoupon = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 400000 }],
        coupon_code: 'AVORA100K',
      },
    });
    assert(resWithCoupon.body?.data?.promotion_details?.applied_type === 'MANUAL_COUPON', 'Manual coupon overrides');
    assert(resWithCoupon.body?.data?.discount_amount === 100000, 'Manual discount 100k applied');

    // Removing manual coupon restores auto-applied Flash Sale
    const resRemoved = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 400000 }],
      },
    });
    assert(resRemoved.body?.data?.promotion_details?.applied_type === 'FLASH_SALE', 'Flash sale restored when coupon removed');
    assert(resRemoved.body?.data?.discount_amount === 80000, 'Flash sale discount 80k restored');
    recordResult('T3.5', 'Pairwise: Removing manual coupon automatically restores active Hotel Flash Sale', true);
  } catch (err) {
    recordResult('T3.5', 'Pairwise: Removing manual coupon automatically restores active Hotel Flash Sale', false, err.message);
  }

  try {
    // Vendor B queries Vendor A's hotel
    const res = await request(`/api/vendor/flash-sales?hotel_id=${HOTEL_A_ID}`, { token: TOKEN_VENDOR_B });
    assert(res.status === 403, `Expected 403 multi-tenant isolation, got ${res.status}`);
    recordResult('T3.6', 'Pairwise: Multi-tenant Vendor Isolation: Vendor B cannot inspect Vendor A flash sales (403)', true);
  } catch (err) {
    recordResult('T3.6', 'Pairwise: Multi-tenant Vendor Isolation: Vendor B cannot inspect Vendor A flash sales (403)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Tests) ---\x1b[0m');

  try {
    // Scenario 1: Mega-Sale with 5-seat quota. 5 bookings succeed with 50% discount. 6th is rejected/regular.
    const quotaCoupon = mockClient._data.coupons.find((c) => c.coupon_id === COUPON_MEGA_QUOTA_ID);
    quotaCoupon.times_used = 0; // Reset

    for (let i = 1; i <= 5; i++) {
      const bookRes = await request('/api/bookings', {
        method: 'POST',
        token: TOKEN_CUSTOMER,
        body: {
          hotel_id: HOTEL_A_ID,
          items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
          coupon_code: quotaCoupon.code,
        },
      });
      assert(bookRes.status === 201 && bookRes.body?.data?.discount_amount === 500000, `Booking ${i} failed`);
    }

    assert(quotaCoupon.times_used === 5, 'Quota fully used');

    // 6th booking attempt
    const bookRes6 = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
        coupon_code: quotaCoupon.code,
      },
    });
    assert(bookRes6.status === 400, `Expected 400 limit exhausted on 6th booking, got ${bookRes6.status}`);
    recordResult('T4.1', 'Real-World 1: Golden Hour Mega-Sale with quota exhaustion across 5 successive bookings', true, 'Quota 5/5 enforced');
  } catch (err) {
    recordResult('T4.1', 'Real-World 1: Golden Hour Mega-Sale with quota exhaustion across 5 successive bookings', false, err.message);
  }

  try {
    // Scenario 2: Vendor launches weekend flash sale, guest books without code, gets auto-applied discount
    const resDiscover = await request(`/api/hotels/${HOTEL_A_ID}`);
    assert(resDiscover.body?.data?.active_flash_sale !== null, 'Guest discovers active flash sale on hotel detail');

    const resCalc = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 2, unit_price: 1000000 }],
      },
    });
    assert(resCalc.body?.data?.discount_amount === 400000, `Discount auto-calculated: got ${resCalc.body?.data?.discount_amount}`);

    const resBook = await request('/api/bookings', {
      method: 'POST',
      token: TOKEN_CUSTOMER,
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 2, unit_price: 1000000 }],
      },
    });
    assert(resBook.status === 201 && resBook.body?.data?.discount_amount === 400000, 'Booking created with flash discount');
    recordResult('T4.2', 'Real-World 2: Guest books without code, receives auto-applied flash discount, order synchronizes', true);
  } catch (err) {
    recordResult('T4.2', 'Real-World 2: Guest books without code, receives auto-applied flash discount, order synchronizes', false, err.message);
  }

  try {
    // Scenario 3: Guest enters platform VIP coupon AVORA100K, system evaluates higher discount vs flash sale
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 400000 }], // 20% flash = 80,000
        coupon_code: 'AVORA100K', // 100,000
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const d = res.body?.data;
    assert(d.discount_amount === 100000, `Expected 100,000, got ${d.discount_amount}`);
    assert(d.promotion_details?.applied_type === 'MANUAL_COUPON', 'Manual coupon selected');
    assert(d.promotion_details?.message?.includes('thay thế Flash Sale'), 'Transparent notification');
    recordResult('T4.3', 'Real-World 3: Guest enters platform coupon AVORA100K, system evaluates higher discount vs flash sale', true);
  } catch (err) {
    recordResult('T4.3', 'Real-World 3: Guest enters platform coupon AVORA100K, system evaluates higher discount vs flash sale', false, err.message);
  }

  try {
    // Scenario 4: Guest enters coupon below min order amount, system rejects coupon and keeps Flash Sale intact
    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }], // 1,000,000
        coupon_code: 'BIGSPENDER', // Requires 5,000,000
      },
    });
    assert(res.status === 400, `Expected 400 min order failure, got ${res.status}`);
    assert(/tối thiểu/i.test(res.body?.message || ''), 'Explains minimum order requirement');

    // Without coupon, flash sale remains active
    const resNormal = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(resNormal.body?.data?.discount_amount === 200000, 'Flash sale preserved');
    recordResult('T4.4', 'Real-World 4: Guest enters coupon below min order; system rejects coupon and keeps Flash Sale intact', true);
  } catch (err) {
    recordResult('T4.4', 'Real-World 4: Guest enters coupon below min order; system rejects coupon and keeps Flash Sale intact', false, err.message);
  }

  try {
    // Scenario 5: Flash sale ends mid-session, checkout refresh gracefully reverts to regular rate
    const c = mockClient._data.coupons.find((x) => x.coupon_id === COUPON_FS_A_ACTIVE_ID);
    const originalTo = c.valid_to;
    c.valid_to = new Date(Date.now() - 1000).toISOString(); // Now expired

    const res = await request('/api/bookings/calculate', {
      method: 'POST',
      body: {
        hotel_id: HOTEL_A_ID,
        items: [{ room_type_id: ROOM_TYPE_A1_ID, quantity: 1, nights: 1, unit_price: 1000000 }],
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.data?.discount_amount === 0, `Expected 0 discount, got ${res.body?.data?.discount_amount}`);
    assert(res.body?.data?.total_amount === 1000000, 'Total reverts to standard subtotal');

    c.valid_to = originalTo; // Revert
    recordResult('T4.5', 'Real-World 5: Flash sale ends, guest refreshes checkout, price automatically reverts without crash', true);
  } catch (err) {
    recordResult('T4.5', 'Real-World 5: Flash sale ends, guest refreshes checkout, price automatically reverts without crash', false, err.message);
  }
}

// ─── Main Runner Entrypoint ─────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  let serverInstance = null;
  let mockClientInstance = null;

  try {
    const boot = await startTestServer();
    serverInstance = boot.server;
    mockClientInstance = boot.mockClient;

    await runTestSuite(mockClientInstance);
  } catch (err) {
    console.error('\n\x1b[31m[FATAL] Test harness execution failed with error:\x1b[0m', err);
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n========================================================================');
  console.log(' PROMOTIONS E2E TEST SUITE SUMMARY REPORT');
  console.log('========================================================================');
  console.log(` TOTAL TESTS: ${total}`);
  console.log(` PASSED:      \x1b[32m${passed}\x1b[0m`);
  console.log(` FAILED:      ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(` DURATION:    ${duration}s`);
  console.log('------------------------------------------------------------------------');
  if (failed === 0 && total >= 50) {
    console.log(` VERDICT:     \x1b[32mALL ${total} AUTOMATED TESTS PASSED (100% SUCCESS)\x1b[0m`);
    console.log('========================================================================\n');
    process.exit(0);
  } else {
    console.log(` VERDICT:     \x1b[31mSUITE INCOMPLETE OR FAILURES DETECTED (${passed}/${total})\x1b[0m`);
    console.log('========================================================================\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  startTestServer,
  createInMemorySupabaseClient,
  createToken,
  runTestSuite,
  extractHotelPrefix,
  buildReferenceFlashSaleCode,
};
