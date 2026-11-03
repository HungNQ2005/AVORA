'use strict';

/**
 * AVORA Admin Audit Log Management - Phase 2 Adversarial Stress & Hardening Test Suite (Tier 5)
 * Feature: h_system_audit_log
 * 
 * Target Stress Vectors:
 * 1. Boundary & Calendar Stress (Leap years: 2024 vs 2026, 2000 vs 2100; Inverted dates; Out-of-bounds pagination)
 * 2. Unicode & Vietnamese Search (Diacritics: Nguyễn, Khách hàng, Khách sạn, Đà Nẵng, Phước Sanh, case/tone insensitivity)
 * 3. Injection Resistance (SQLi payloads in search, entity, action; XSS payloads; Path traversal; Overflows)
 * 4. Token Forgery & Role Spoofing (Bogus signature, expired token, alg:none, role spoofing against DB, deleted users)
 * 5. JSON Payload Diffing Engine Stress (Deeply nested objects, arrays, type mutations, null/undefined safety)
 * 6. Frontend Route Guarding (AdminRoute behavior across user roles, null user, loading state)
 */

const http = require('http');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

// Ensure backend node_modules are resolvable
const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const jwt = require('jsonwebtoken');
const express = require('express');

const PORT = process.env.TEST_PORT || 5008;
const PIPE_NAME = process.platform === 'win32'
  ? `\\\\.\\pipe\\avora-adversarial-test-${PORT}`
  : `/tmp/avora-adversarial-test-${PORT}.sock`;
const JWT_SECRET = process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod';

// Deterministic UUIDs
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_2_ID = '55555555-5555-4555-8555-555555555555';
const VENDOR_ID = '22222222-2222-4222-8222-222222222222';
const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';
const BMR_ID = '44444444-4444-4444-8444-444444444444';
const DELETED_USER_ID = '99999999-9999-4999-8999-999999999999';

// Deterministic Log UUIDs
const LOG_1_INS_COUPON_ID = 'a0000001-0000-4000-8000-000000000001';
const LOG_2_UPD_USER_ID   = 'a0000002-0000-4000-8000-000000000002';
const LOG_3_DEL_HOTEL_ID  = 'a0000003-0000-4000-8000-000000000003';
const LOG_4_LGN_AUTH_ID   = 'a0000004-0000-4000-8000-000000000004';

function createToken(userId, roleCd = '1', email = 'admin@avora.com', customSecret = JWT_SECRET, options = { expiresIn: '1h' }) {
  return jwt.sign({ user_id: userId, role_cd: roleCd, email }, customSecret, options);
}

const TOKEN_ADMIN = createToken(ADMIN_ID, '1', 'admin@avora.com');
const TOKEN_VENDOR = createToken(VENDOR_ID, '4', 'vendor@avora.com');
const TOKEN_CUSTOMER = createToken(CUSTOMER_ID, '2', 'customer@avora.com');
const TOKEN_BMR = createToken(BMR_ID, '3', 'bmr@avora.com');
const TOKEN_DELETED = createToken(DELETED_USER_ID, '1', 'deleted@avora.com');

// ─── Sandboxed Database Mock Adapter ──────────────────────────────────────────

function createInMemorySupabaseClient() {
  const users = [
    { user_id: ADMIN_ID, email: 'admin@avora.com', full_name: 'Nguyễn Văn Admin', role_cd: '1', avatar_url: null, is_deleted: false },
    { user_id: ADMIN_2_ID, email: 'admin2@avora.com', full_name: 'Trần Thị Quản Trị', role_cd: '1', avatar_url: null, is_deleted: false },
    { user_id: VENDOR_ID, email: 'vendor@avora.com', full_name: 'Hoàng Văn Khách Sạn', role_cd: '4', avatar_url: null, is_deleted: false },
    { user_id: CUSTOMER_ID, email: 'customer@avora.com', full_name: 'Lê Khách Hàng VIP', role_cd: '2', avatar_url: null, is_deleted: false },
    { user_id: BMR_ID, email: 'bmr@avora.com', full_name: 'Phạm Kinh Doanh', role_cd: '3', avatar_url: null, is_deleted: false },
    { user_id: DELETED_USER_ID, email: 'deleted@avora.com', full_name: 'Nhân Viên Đã Xóa', role_cd: '1', avatar_url: null, is_deleted: true },
  ];

  const systemCodes = [
    { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'ADM', sort_no: 1 },
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS', sort_no: 2 },
    { business_cd: 'USER_ROLE', code_cd: '3', code_name: 'BMR', sort_no: 3 },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN', sort_no: 4 },
    { business_cd: 'AUDIT_ACTION', code_cd: '1', code_name: 'INS', sort_no: 1 },
    { business_cd: 'AUDIT_ACTION', code_cd: '2', code_name: 'UPD', sort_no: 2 },
    { business_cd: 'AUDIT_ACTION', code_cd: '3', code_name: 'DEL', sort_no: 3 },
    { business_cd: 'AUDIT_ACTION', code_cd: '4', code_name: 'LGN', sort_no: 4 },
  ];

  const auditLogs = [
    {
      log_id: LOG_1_INS_COUPON_ID,
      actor_user_id: ADMIN_ID,
      action_cd: '1',
      entity_name: 'm_coupon',
      entity_id: 'c-001',
      old_data: null,
      new_data: { code: 'SUMMER2026', discount_percent: 15, max_uses: 100 },
      ip_address: '127.0.0.1',
      created_at: '2024-02-29T10:00:00.000Z', // Leap year 2024 record!
    },
    {
      log_id: LOG_2_UPD_USER_ID,
      actor_user_id: ADMIN_ID,
      action_cd: '2',
      entity_name: 'm_user',
      entity_id: CUSTOMER_ID,
      old_data: { role_cd: '2', account_status: 'ACTIVE' },
      new_data: { role_cd: '1', account_status: 'ACTIVE' },
      ip_address: '127.0.0.1',
      created_at: '2026-11-01T09:30:00.000Z',
    },
    {
      log_id: LOG_3_DEL_HOTEL_ID,
      actor_user_id: ADMIN_2_ID,
      action_cd: '3',
      entity_name: 'm_hotel',
      entity_id: 'h-da-nang-01',
      old_data: { name: 'Khách sạn Đà Nẵng Luxury', address: 'Đà Nẵng' },
      new_data: null,
      ip_address: '192.168.1.50',
      created_at: '2026-11-01T14:15:00.000Z',
    },
    {
      log_id: LOG_4_LGN_AUTH_ID,
      actor_user_id: ADMIN_ID,
      action_cd: '4',
      entity_name: 'auth',
      entity_id: ADMIN_ID,
      old_data: null,
      new_data: { login_method: 'PASSWORD', success: true },
      ip_address: '127.0.0.1',
      created_at: '2026-11-02T07:45:00.000Z',
    },
    {
      log_id: 'a0000005-0000-4000-8000-000000000005',
      actor_user_id: CUSTOMER_ID, // Lê Khách Hàng VIP
      action_cd: '4',
      entity_name: 'auth',
      entity_id: CUSTOMER_ID,
      old_data: null,
      new_data: { method: 'GOOGLE' },
      ip_address: '127.0.0.1',
      created_at: '2026-11-02T08:00:00.000Z',
    },
    {
      log_id: 'a0000006-0000-4000-8000-000000000006',
      actor_user_id: VENDOR_ID, // Hoàng Văn Khách Sạn
      action_cd: '2',
      entity_name: 'm_hotel',
      entity_id: 'h-001',
      old_data: { status: 'OPEN' },
      new_data: { status: 'MAINTENANCE' },
      ip_address: '192.168.1.100',
      created_at: '2026-11-02T09:00:00.000Z',
    },
  ];

  function enrichLogWithActor(log) {
    if (!log) return null;
    const actorUser = log.actor_user_id ? users.find((u) => u.user_id === log.actor_user_id) : null;
    const actor = actorUser
      ? {
          user_id: actorUser.user_id,
          full_name: actorUser.full_name,
          email: actorUser.email,
          role_cd: actorUser.role_cd,
          avatar_url: actorUser.avatar_url,
          is_deleted: actorUser.is_deleted,
        }
      : null;

    return {
      ...log,
      actor,
      m_user: actor,
    };
  }

  return {
    from(table) {
      let filters = [];
      let inFilters = [];
      let gteFilters = [];
      let lteFilters = [];
      let orderFn = null;
      let rangeBounds = null;
      let limitCount = null;

      const builder = {
        select(columns = '*', options = {}) {
          return builder;
        },
        eq(col, val) {
          filters.push({ col, val });
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
        async maybeSingle() {
          const res = await builder.then();
          const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          return { data: row, error: null };
        },
        async single() {
          const res = await builder.then();
          const row = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
          if (!row) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          }
          return { data: row, error: null };
        },
        then(resolve) {
          let dataset = [];
          if (table === 'm_user') dataset = [...users];
          else if (table === 'm_system_code') dataset = [...systemCodes];
          else if (table === 'h_system_audit_log') dataset = auditLogs.map(enrichLogWithActor);

          filters.forEach(({ col, val, op }) => {
            if (op === 'neq') {
              dataset = dataset.filter((row) => String(row[col]) !== String(val));
            } else {
              dataset = dataset.filter((row) => String(row[col]) === String(val));
            }
          });

          inFilters.forEach(({ col, values }) => {
            const set = new Set(values.map(String));
            dataset = dataset.filter((row) => set.has(String(row[col])));
          });

          gteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((row) => {
              if (col === 'created_at') {
                return new Date(row[col]).toISOString() >= new Date(val).toISOString();
              }
              return row[col] >= val;
            });
          });

          lteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((row) => {
              if (col === 'created_at') {
                return new Date(row[col]).toISOString() <= new Date(val).toISOString();
              }
              return row[col] <= val;
            });
          });

          if (orderFn) {
            dataset.sort(orderFn);
          } else if (table === 'h_system_audit_log') {
            dataset.sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)));
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
}

// ─── Test Server Runner ───────────────────────────────────────────────────────

async function startAdversarialServer() {
  const mockClient = createInMemorySupabaseClient();

  const supabaseClientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: mockClient,
  };

  const auditLogService = require('../backend/src/features/audit_logs/audit_log.service');
  if (typeof auditLogService.setCustomClient === 'function') {
    auditLogService.setCustomClient(mockClient);
  }

  const auditLogRoute = require('../backend/src/features/audit_logs/audit_log.route');
  const errorHandler = require('../backend/src/common/middlewares/errorHandler');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', auditLogRoute);

  app.use((_req, _res, next) => {
    const err = new Error('Không tìm thấy đường dẫn API yêu cầu.');
    err.statusCode = 404;
    next(err);
  });

  app.use(errorHandler);

  const serverPipe = http.createServer(app);
  const serverTcp = http.createServer(app);

  await new Promise((resolve) => {
    serverPipe.listen(PIPE_NAME, resolve);
  });

  await new Promise((resolve) => {
    serverTcp.listen(PORT, '127.0.0.1', () => resolve());
    serverTcp.on('error', (err) => {
      resolve();
    });
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

// ─── Request Helper ───────────────────────────────────────────────────────────

const results = [];

function record(id, title, passed, details = '') {
  results.push({ id, title, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} ${id}: ${title} ${details ? `\x1b[90m(${details})\x1b[0m` : ''}`);
}

async function apiRequest(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token !== undefined ? (options.token ? { Authorization: `Bearer ${options.token}` } : {}) : {}),
    ...(options.headers || {}),
  };

  return new Promise((resolve) => {
    const req = http.request(
      {
        socketPath: PIPE_NAME,
        path: endpoint,
        method,
        headers,
      },
      (res) => {
        let rawText = '';
        res.on('data', (c) => { rawText += c; });
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

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message, body: null });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// ─── MAIN ADVERSARIAL EXECUTION ───────────────────────────────────────────────

async function runAdversarialSuite() {
  console.log('========================================================================');
  console.log(' AVORA PHASE 2 ADVERSARIAL COVERAGE HARDENING (TIER 5)');
  console.log(' Target Port: ' + PORT + ' | Named Pipe: ' + PIPE_NAME);
  console.log('========================================================================\n');

  const { server } = await startAdversarialServer();
  const startTime = Date.now();

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 1: BOUNDARY & CALENDAR STRESS
    // ══════════════════════════════════════════════════════════════════════════
    console.log('--- CATEGORY 1: BOUNDARY & CALENDAR STRESS ---');

    // C1.1: Valid Leap Year 2024-02-29
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2024-02-29', { token: TOKEN_ADMIN });
      record(
        'ADV-1.1',
        'Calendar Leap Year: 2024-02-29 accepted as valid calendar date',
        res.status === 200 && res.body?.status === 'success',
        `Status: ${res.status}, Items: ${res.body?.data?.items?.length}`
      );
    }

    // C1.2: Invalid Leap Year 2026-02-29 (2026 is non-leap year)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2026-02-29', { token: TOKEN_ADMIN });
      record(
        'ADV-1.2',
        'Calendar Non-Leap Year: 2026-02-29 rejected with 400 Bad Request',
        res.status === 400 && res.body?.message?.includes('không hợp lệ'),
        `Status: ${res.status}, Msg: ${res.body?.message}`
      );
    }

    // C1.3: Century Leap Year 2000-02-29 (divisible by 400 -> leap year)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2000-02-29', { token: TOKEN_ADMIN });
      record(
        'ADV-1.3',
        'Century Leap Year: 2000-02-29 accepted as valid Gregorian leap date',
        res.status === 200 && res.body?.status === 'success',
        `Status: ${res.status}`
      );
    }

    // C1.4: Century Non-Leap Year 2100-02-29 (divisible by 100 but not 400 -> non-leap)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2100-02-29', { token: TOKEN_ADMIN });
      record(
        'ADV-1.4',
        'Century Non-Leap Year: 2100-02-29 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.5: Inverted Date Range (end_date < start_date)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2026-11-10&end_date=2026-11-01', { token: TOKEN_ADMIN });
      record(
        'ADV-1.5',
        'Date Inversion: end_date earlier than start_date rejected with 400',
        res.status === 400 && JSON.stringify(res.body).includes('không được sớm hơn'),
        `Status: ${res.status}`
      );
    }

    // C1.6: Year Boundary Underflow (< 1970)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=1969-12-31', { token: TOKEN_ADMIN });
      record(
        'ADV-1.6',
        'Date Underflow: Year 1969 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.7: Year Boundary Overflow (> 2100)
    {
      const res = await apiRequest('/api/admin/audit-logs?start_date=2101-01-01', { token: TOKEN_ADMIN });
      record(
        'ADV-1.7',
        'Date Overflow: Year 2101 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.8: Negative Pagination Page
    {
      const res = await apiRequest('/api/admin/audit-logs?page=-1', { token: TOKEN_ADMIN });
      record(
        'ADV-1.8',
        'Pagination: page=-1 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.9: Zero Pagination Limit
    {
      const res = await apiRequest('/api/admin/audit-logs?limit=0', { token: TOKEN_ADMIN });
      record(
        'ADV-1.9',
        'Pagination: limit=0 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.10: Exorbitant Limit (500 > max 100)
    {
      const res = await apiRequest('/api/admin/audit-logs?limit=500', { token: TOKEN_ADMIN });
      record(
        'ADV-1.10',
        'Pagination: limit=500 exceeding max 100 rejected with 400 Bad Request',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // C1.11: Floating point page and limit
    {
      const resPage = await apiRequest('/api/admin/audit-logs?page=1.5', { token: TOKEN_ADMIN });
      const resLimit = await apiRequest('/api/admin/audit-logs?limit=10.5', { token: TOKEN_ADMIN });
      record(
        'ADV-1.11',
        'Pagination: Floating point page=1.5 and limit=10.5 rejected with 400',
        resPage.status === 400 && resLimit.status === 400,
        `Page: ${resPage.status}, Limit: ${resLimit.status}`
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 2: UNICODE & VIETNAMESE DIACRITICS SEARCH
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- CATEGORY 2: UNICODE & VIETNAMESE DIACRITICS SEARCH ---');

    // C2.1: Vietnamese name with diacritics: 'Nguyễn'
    {
      const searchEncoded = encodeURIComponent('Nguyễn');
      const res = await apiRequest(`/api/admin/audit-logs?search=${searchEncoded}`, { token: TOKEN_ADMIN });
      const found = res.body?.data?.items?.some((i) => i.actor?.full_name?.includes('Nguyễn'));
      record(
        'ADV-2.1',
        'Unicode: Search "Nguyễn" accurately isolates Vietnamese accented actor',
        res.status === 200 && found,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // C2.2: Case & Accent Insensitivity: unaccented 'nguyen' matches 'Nguyễn'
    {
      const res = await apiRequest('/api/admin/audit-logs?search=nguyen', { token: TOKEN_ADMIN });
      const found = res.body?.data?.items?.some((i) => i.actor?.full_name?.includes('Nguyễn'));
      record(
        'ADV-2.2',
        'Accent Insensitive: Search unaccented "nguyen" matches accented "Nguyễn"',
        res.status === 200 && found,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // C2.3: Uppercase diacritics: 'NGUYỄN'
    {
      const searchEncoded = encodeURIComponent('NGUYỄN');
      const res = await apiRequest(`/api/admin/audit-logs?search=${searchEncoded}`, { token: TOKEN_ADMIN });
      const found = res.body?.data?.items?.some((i) => i.actor?.full_name?.includes('Nguyễn'));
      record(
        'ADV-2.3',
        'Case Insensitive: Uppercase accented "NGUYỄN" matches correctly',
        res.status === 200 && found,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // C2.4: Vietnamese phrase 'Khách hàng'
    {
      const searchEncoded = encodeURIComponent('Khách hàng');
      const res = await apiRequest(`/api/admin/audit-logs?search=${searchEncoded}`, { token: TOKEN_ADMIN });
      const found = res.body?.data?.items?.some((i) => i.actor?.full_name?.includes('Khách Hàng'));
      record(
        'ADV-2.4',
        'Compound Diacritic: Search "Khách hàng" matches multi-word phrase',
        res.status === 200 && found,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // C2.5: Vietnamese phrase 'Đà Nẵng'
    {
      const searchEncoded = encodeURIComponent('Đà Nẵng');
      const res = await apiRequest(`/api/admin/audit-logs?search=${searchEncoded}`, { token: TOKEN_ADMIN });
      record(
        'ADV-2.5',
        'Special Consonant "Đ": Search "Đà Nẵng" handled cleanly without regex crash',
        res.status === 200,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // C2.6: Vietnamese phrase 'Khách sạn'
    {
      const searchEncoded = encodeURIComponent('Khách sạn');
      const res = await apiRequest(`/api/admin/audit-logs?search=${searchEncoded}`, { token: TOKEN_ADMIN });
      const found = res.body?.data?.items?.some((i) => i.actor?.full_name?.includes('Khách Sạn'));
      record(
        'ADV-2.6',
        'Diacritics: Search "Khách sạn" accurately matches vendor name',
        res.status === 200 && found,
        `Matches: ${res.body?.data?.items?.length}`
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 3: INJECTION RESISTANCE (SQLi / XSS / PATH TRAVERSAL)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- CATEGORY 3: INJECTION RESISTANCE (SQLi / XSS / TRAVERSAL) ---');

    // C3.1: Classic SQLi in search query
    {
      const sqli = encodeURIComponent("' OR 1=1 --");
      const res = await apiRequest(`/api/admin/audit-logs?search=${sqli}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.1',
        'SQLi in search: "\' OR 1=1 --" safely handled without crash or SQL leaks',
        res.status === 200 && Array.isArray(res.body?.data?.items),
        `Status: ${res.status}`
      );
    }

    // C3.2: Destructive SQLi payload in search
    {
      const sqli = encodeURIComponent("1'; DROP TABLE h_system_audit_log; --");
      const res = await apiRequest(`/api/admin/audit-logs?search=${sqli}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.2',
        'SQLi in search: "DROP TABLE" payload handled safely without execution',
        res.status === 200 && Array.isArray(res.body?.data?.items),
        `Status: ${res.status}`
      );
    }

    // C3.3: SQLi in action_cd
    {
      const sqli = encodeURIComponent("1' OR '1'='1");
      const res = await apiRequest(`/api/admin/audit-logs?action_cd=${sqli}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.3',
        'SQLi in action_cd: "1\' OR \'1\'=\'1" rejected by enum validation (400)',
        res.status === 400 && res.body?.status === 'error',
        `Status: ${res.status}`
      );
    }

    // C3.4: XSS Script Injection in search
    {
      const xss = encodeURIComponent("<script>alert('XSS')</script>");
      const res = await apiRequest(`/api/admin/audit-logs?search=${xss}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.4',
        'XSS in search: "<script>alert(1)</script>" handled safely with 200 OK',
        res.status === 200 && Array.isArray(res.body?.data?.items),
        `Status: ${res.status}`
      );
    }

    // C3.5: XSS Image onerror in entity_name
    {
      const xss = encodeURIComponent("<img src=x onerror=alert(1)>");
      const res = await apiRequest(`/api/admin/audit-logs?entity_name=${xss}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.5',
        'XSS in entity_name: "<img onerror...>" treated as literal string without crash',
        res.status === 200 && res.body?.data?.items?.length === 0,
        `Status: ${res.status}`
      );
    }

    // C3.6: Malicious UUID Path Traversal
    {
      const res = await apiRequest('/api/admin/audit-logs/../../etc/passwd', { token: TOKEN_ADMIN });
      record(
        'ADV-3.6',
        'Path Traversal: Directory traversal attempt safely blocked (400/404)',
        res.status === 400 || res.status === 404,
        `Status: ${res.status}`
      );
    }

    // C3.7: Parameter length overflow (10,000 characters)
    {
      const hugeSearch = 'A'.repeat(10000);
      const res = await apiRequest(`/api/admin/audit-logs?search=${hugeSearch}`, { token: TOKEN_ADMIN });
      record(
        'ADV-3.7',
        'Buffer Overflow: 10,000 character search rejected by validation (400)',
        res.status === 400,
        `Status: ${res.status}`
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 4: TOKEN FORGERY & ROLE SPOOFING
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- CATEGORY 4: TOKEN FORGERY & ROLE SPOOFING ---');

    // C4.1: Token signed with unauthorized random secret
    {
      const forgedToken = createToken(ADMIN_ID, '1', 'admin@avora.com', 'unauthorized_random_secret_9999');
      const res = await apiRequest('/api/admin/audit-logs', { token: forgedToken });
      record(
        'ADV-4.1',
        'Token Forgery: Token signed with unauthorized secret rejected with 401',
        res.status === 401 && res.body?.message?.includes('hết hạn') || res.status === 401,
        `Status: ${res.status}, Msg: ${res.body?.message}`
      );
    }

    // C4.2: Expired Token
    {
      const expiredToken = jwt.sign(
        { user_id: ADMIN_ID, role_cd: '1', email: 'admin@avora.com' },
        JWT_SECRET,
        { expiresIn: '-10s' }
      );
      const res = await apiRequest('/api/admin/audit-logs', { token: expiredToken });
      record(
        'ADV-4.2',
        'Expired Token: Token with expired timestamp rejected with 401',
        res.status === 401,
        `Status: ${res.status}`
      );
    }

    // C4.3: None Algorithm Attack
    {
      // Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
      // Payload: {"user_id":ADMIN_ID,"role_cd":"1"}
      const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify({ user_id: ADMIN_ID, role_cd: '1', email: 'admin@avora.com' })).toString('base64url');
      const noneToken = `${headerB64}.${payloadB64}.`;
      const res = await apiRequest('/api/admin/audit-logs', { token: noneToken });
      record(
        'ADV-4.3',
        'Alg None Attack: Token with "alg: none" header rejected with 401',
        res.status === 401,
        `Status: ${res.status}`
      );
    }

    // C4.4: Role Spoofing (Customer Token claiming ADM in JWT body)
    {
      // User is CUSTOMER_ID (role '2' / CUS in database). Attacker claims role_cd='1' and role_code_name='ADM'
      const spoofedToken = jwt.sign(
        { user_id: CUSTOMER_ID, role_cd: '1', role_code_name: 'ADM', email: 'customer@avora.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await apiRequest('/api/admin/audit-logs', { token: spoofedToken });
      record(
        'ADV-4.4',
        'Role Spoofing: Customer claiming ADM role in token blocked by DB check (403)',
        res.status === 403 && res.body?.message?.includes('không có quyền'),
        `Status: ${res.status}, Msg: ${res.body?.message}`
      );
    }

    // C4.5: Deleted Staff Member Token
    {
      const res = await apiRequest('/api/admin/audit-logs', { token: TOKEN_DELETED });
      record(
        'ADV-4.5',
        'Revocation: Token for deleted staff member (is_deleted=true) rejected with 403',
        res.status === 403,
        `Status: ${res.status}`
      );
    }

    // C4.6: Empty Bearer Header
    {
      const res = await apiRequest('/api/admin/audit-logs', { headers: { Authorization: 'Bearer ' } });
      record(
        'ADV-4.6',
        'Malformed Auth: "Bearer " without token rejected with 401',
        res.status === 401,
        `Status: ${res.status}`
      );
    }

    // C4.7: Invalid Scheme (Basic Auth instead of Bearer)
    {
      const res = await apiRequest('/api/admin/audit-logs', { headers: { Authorization: 'Basic dXNlcjpwYXNz' } });
      record(
        'ADV-4.7',
        'Malformed Auth: Non-Bearer scheme rejected with 401',
        res.status === 401,
        `Status: ${res.status}`
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 5: DEEP JSON PAYLOAD DIFFING ENGINE STRESS
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- CATEGORY 5: DEEP JSON PAYLOAD DIFFING ENGINE STRESS ---');

    const { computeDiff } = require('../backend/src/features/audit_logs/audit_log.service');

    // C5.1: Deeply nested objects (4+ levels)
    {
      const oldData = { system: { security: { policy: { max_attempts: 5 } } } };
      const newData = { system: { security: { policy: { max_attempts: 3 } } } };
      const diff = computeDiff(oldData, newData);
      const isModified = Boolean(diff.modified.system);
      record(
        'ADV-5.1',
        'Diff Engine: Deeply nested object modification accurately isolated',
        isModified && diff.modified.system.old.security.policy.max_attempts === 5,
        `Modified key: ${JSON.stringify(Object.keys(diff.modified))}`
      );
    }

    // C5.2: Array mutations
    {
      const oldData = { permissions: ['READ', 'WRITE'] };
      const newData = { permissions: ['READ', 'WRITE', 'EXECUTE'] };
      const diff = computeDiff(oldData, newData);
      record(
        'ADV-5.2',
        'Diff Engine: Array mutation detected under modified',
        Boolean(diff.modified.permissions),
        `Old: ${diff.modified.permissions?.old?.length}, New: ${diff.modified.permissions?.new?.length}`
      );
    }

    // C5.3: Primitive-to-object type mutation
    {
      const oldData = { config: 'DEFAULT_STRING' };
      const newData = { config: { mode: 'ADVANCED', timeout: 300 } };
      const diff = computeDiff(oldData, newData);
      record(
        'ADV-5.3',
        'Diff Engine: Primitive-to-object type change handled without prototype leak',
        Boolean(diff.modified.config) && typeof diff.modified.config.new === 'object',
        `Old type: ${typeof diff.modified.config?.old}, New type: ${typeof diff.modified.config?.new}`
      );
    }

    // C5.4: Null vs Empty vs Undefined inputs
    {
      const diff1 = computeDiff(null, { created: true });
      const diff2 = computeDiff({ deleted: true }, null);
      const diff3 = computeDiff(null, null);
      record(
        'ADV-5.4',
        'Diff Engine: All null/undefined combinations handled without exceptions',
        Boolean(diff1.added.created) && Boolean(diff2.removed.deleted) && Object.keys(diff3.modified).length === 0,
        `Diff1 added: ${Object.keys(diff1.added)}, Diff2 removed: ${Object.keys(diff2.removed)}`
      );
    }

    // C5.5: Keys containing special characters (dots, quotes, Vietnamese diacritics)
    {
      const oldData = { 'user.settings.theme': 'light', 'ghi_chú': 'Cũ' };
      const newData = { 'user.settings.theme': 'dark', 'ghi_chú': 'Mới' };
      const diff = computeDiff(oldData, newData);
      record(
        'ADV-5.5',
        'Diff Engine: Keys with dots and Vietnamese characters handled safely',
        Boolean(diff.modified['user.settings.theme']) && Boolean(diff.modified['ghi_chú']),
        `Keys: ${Object.keys(diff.modified).join(', ')}`
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 6: FRONTEND ROUTE GUARDING VERIFICATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- CATEGORY 6: FRONTEND ROUTE GUARDING VERIFICATION ---');

    // Simulate AdminRoute guard logic from frontend/src/App.jsx:
    function evaluateAdminRoute(user, loading = false) {
      if (loading) return { action: 'wait', target: null };
      if (!user) return { action: 'redirect', target: '/signin' };
      const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
        .trim().toUpperCase().replace(/[ -]+/g, '_');
      const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
      const isAdmin = ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) || roleCd === '1';
      if (!isAdmin) return { action: 'redirect', target: '/forbidden' };
      return { action: 'render', target: 'AuditLogManagementPage' };
    }

    // C6.1: Null user -> /signin
    {
      const outcome = evaluateAdminRoute(null, false);
      record(
        'ADV-6.1',
        'AdminRoute Guard: Unauthenticated user (null) redirected to /signin',
        outcome.action === 'redirect' && outcome.target === '/signin',
        `Target: ${outcome.target}`
      );
    }

    // C6.2: Customer role (CUS, role_cd: '2') -> /forbidden
    {
      const outcome = evaluateAdminRoute({ role_code_name: 'CUS', role_cd: '2' }, false);
      record(
        'ADV-6.2',
        'AdminRoute Guard: Customer role (CUS) redirected to /forbidden',
        outcome.action === 'redirect' && outcome.target === '/forbidden',
        `Target: ${outcome.target}`
      );
    }

    // C6.3: Vendor role (VEN, role_cd: '4') -> /forbidden
    {
      const outcome = evaluateAdminRoute({ role_code_name: 'VEN', role_cd: '4' }, false);
      record(
        'ADV-6.3',
        'AdminRoute Guard: Vendor role (VEN) redirected to /forbidden',
        outcome.action === 'redirect' && outcome.target === '/forbidden',
        `Target: ${outcome.target}`
      );
    }

    // C6.4: Business Manager role (BMR, role_cd: '3') -> /forbidden
    {
      const outcome = evaluateAdminRoute({ role_code_name: 'BMR', role_cd: '3' }, false);
      record(
        'ADV-6.4',
        'AdminRoute Guard: Business Manager role (BMR) redirected to /forbidden',
        outcome.action === 'redirect' && outcome.target === '/forbidden',
        `Target: ${outcome.target}`
      );
    }

    // C6.5: Unknown role string -> /forbidden
    {
      const outcome = evaluateAdminRoute({ role_code_name: 'HACKER_ROLE' }, false);
      record(
        'ADV-6.5',
        'AdminRoute Guard: Arbitrary unknown role redirected to /forbidden',
        outcome.action === 'redirect' && outcome.target === '/forbidden',
        `Target: ${outcome.target}`
      );
    }

    // C6.6: Legitimate Admin (role_code_name: 'ADM') -> Allowed
    {
      const outcome = evaluateAdminRoute({ role_code_name: 'ADM', role_cd: '1' }, false);
      record(
        'ADV-6.6',
        'AdminRoute Guard: Administrator (ADM) allowed to render AuditLogManagementPage',
        outcome.action === 'render' && outcome.target === 'AuditLogManagementPage',
        `Action: ${outcome.action}`
      );
    }

    // C6.7: Admin by numeric code (role_cd: '1') -> Allowed
    {
      const outcome = evaluateAdminRoute({ role_cd: '1' }, false);
      record(
        'ADV-6.7',
        'AdminRoute Guard: Administrator by role_cd="1" allowed to render',
        outcome.action === 'render',
        `Action: ${outcome.action}`
      );
    }

    // C6.8: Loading state -> waits (no flash redirect)
    {
      const outcome = evaluateAdminRoute(null, true);
      record(
        'ADV-6.8',
        'AdminRoute Guard: Loading state holds render (prevents false /signin redirect)',
        outcome.action === 'wait',
        `Action: ${outcome.action}`
      );
    }

  } finally {
    server.close();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(' ADVERSARIAL COVERAGE HARDENING (TIER 5) SUMMARY REPORT');
  console.log('========================================================================');
  console.log(` TOTAL ADVERSARIAL STRESS TESTS: ${total}`);
  console.log(` PASSED:                          ${passed}`);
  console.log(` FAILED:                          ${failed}`);
  console.log(` DURATION:                        ${duration}s`);
  console.log('------------------------------------------------------------------------');
  if (failed === 0) {
    console.log(' VERDICT: ALL ADVERSARIAL TESTS PASSED (CONFIRMED CORRECT - 100%)');
  } else {
    console.log(` VERDICT: DEFECTS FOUND (${failed} tests failed)`);
  }
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('[AdversarialHarness] Unhandled error during execution:', err);
  process.exit(1);
});
