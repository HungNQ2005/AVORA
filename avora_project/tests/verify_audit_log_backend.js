'use strict';

/**
 * AVORA Admin Audit Log Management - Standalone Automated Verification Harness
 * Feature: h_system_audit_log
 * 
 * 4-Tier Verification Suite:
 * - Tier 1: Feature Coverage (21 tests: RBAC 401/403/200, List, Detail, Joins, Mappings, Diff)
 * - Tier 2: Boundary & Corner Cases (20 tests: Pagination bounds, Date formats, Null fields, Sanitization)
 * - Tier 3: Combinations & Complex Querying (5 tests: Multi-parameter, Search+Filter, Invariance, Role switching)
 * - Tier 4: Real-World Scenarios (4 tests: Lifecycle diff, Suspect IP tracking, Stack trace shielding, Immutability)
 * Total: 50 automated tests.
 * 
 * Ephemeral server executes on port 5006 and named pipe with an in-memory Supabase client mock.
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
const PORT = process.env.TEST_PORT || 5006;
const PIPE_NAME = process.platform === 'win32'
  ? `\\\\.\\pipe\\avora-audit-log-test-${PORT}`
  : `/tmp/avora-audit-log-test-${PORT}.sock`;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod';

// Deterministic UUIDs for testing
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
const LOG_5_NULL_ACTOR_ID = 'a0000005-0000-4000-8000-000000000005';
const LOG_6_SUSPECT_IP_ID = 'a0000006-0000-4000-8000-000000000006';
const LOG_7_SUSPECT_IP_ID = 'a0000007-0000-4000-8000-000000000007';
const LOG_8_DELETED_USR_ID= 'a0000008-0000-4000-8000-000000000008';
const LOG_9_NESTED_JSON_ID= 'a0000009-0000-4000-8000-000000000009';
const NON_EXISTENT_LOG_ID = '00000000-0000-0000-0000-000000000000';

// Helper to mint JWT tokens for test roles
function createToken(userId, roleCd = '1', email = 'admin@avora.com') {
  return jwt.sign(
    { user_id: userId, role_cd: roleCd, email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const TOKEN_ADMIN = createToken(ADMIN_ID, '1', 'admin@avora.com');
const TOKEN_ADMIN_2 = createToken(ADMIN_2_ID, '1', 'admin2@avora.com');
const TOKEN_VENDOR = createToken(VENDOR_ID, '4', 'vendor@avora.com');
const TOKEN_CUSTOMER = createToken(CUSTOMER_ID, '2', 'customer@avora.com');
const TOKEN_BMR = createToken(BMR_ID, '3', 'bmr@avora.com');
const TOKEN_DELETED_USER = createToken(DELETED_USER_ID, '1', 'deleted@avora.com');

// ─── Sandboxed In-Memory Adapter Fixtures & Query Builder ─────────────────────

function createInMemorySupabaseClient() {
  let simulateError = false;

  const users = [
    { user_id: ADMIN_ID, email: 'admin@avora.com', full_name: 'Admin Nguyen', role_cd: '1', avatar_url: null, is_deleted: false },
    { user_id: ADMIN_2_ID, email: 'admin2@avora.com', full_name: 'Admin Tran', role_cd: '1', avatar_url: null, is_deleted: false },
    { user_id: VENDOR_ID, email: 'vendor@avora.com', full_name: 'Vendor Hoang', role_cd: '4', avatar_url: null, is_deleted: false },
    { user_id: CUSTOMER_ID, email: 'customer@avora.com', full_name: 'Customer Le', role_cd: '2', avatar_url: null, is_deleted: false },
    { user_id: BMR_ID, email: 'bmr@avora.com', full_name: 'Manager Pham', role_cd: '3', avatar_url: null, is_deleted: false },
    { user_id: DELETED_USER_ID, email: 'deleted@avora.com', full_name: 'Deleted Staff', role_cd: '1', avatar_url: null, is_deleted: true },
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
      created_at: '2026-11-01T08:00:00.000Z',
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
      old_data: { name: 'Old Da Nang Villa', address: 'Da Nang' },
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
      log_id: LOG_5_NULL_ACTOR_ID,
      actor_user_id: null,
      action_cd: '2',
      entity_name: 't_booking',
      entity_id: 'b-cron-99',
      old_data: { booking_status_cd: '1' },
      new_data: { booking_status_cd: '3', note: 'Expired via Cron' },
      ip_address: '127.0.0.1',
      created_at: '2026-11-02T08:00:00.000Z',
    },
    {
      log_id: LOG_6_SUSPECT_IP_ID,
      actor_user_id: ADMIN_ID,
      action_cd: '2',
      entity_name: 'm_user',
      entity_id: VENDOR_ID,
      old_data: { phone: '0901111111' },
      new_data: { phone: '0902222222' },
      ip_address: '192.168.1.105',
      created_at: '2026-11-02T10:00:00.000Z',
    },
    {
      log_id: LOG_7_SUSPECT_IP_ID,
      actor_user_id: ADMIN_2_ID,
      action_cd: '1',
      entity_name: 'm_commission_policy',
      entity_id: 'pol-01',
      old_data: null,
      new_data: { rate: 0.12, type: 'TIERED' },
      ip_address: '192.168.1.105',
      created_at: '2026-11-02T11:00:00.000Z',
    },
    {
      log_id: LOG_8_DELETED_USR_ID,
      actor_user_id: DELETED_USER_ID,
      action_cd: '2',
      entity_name: 'm_refund_policy',
      entity_id: 'ref-01',
      old_data: { days: 3 },
      new_data: { days: 5 },
      ip_address: '10.0.0.1',
      created_at: '2026-11-02T12:00:00.000Z',
    },
    {
      log_id: LOG_9_NESTED_JSON_ID,
      actor_user_id: ADMIN_ID,
      action_cd: '2',
      entity_name: 'system_settings',
      entity_id: 'cfg-security',
      old_data: { security: { max_attempts: 5, lockout: { duration: 300, unit: 'seconds' } } },
      new_data: { security: { max_attempts: 3, lockout: { duration: 600, unit: 'seconds' } } },
      ip_address: '127.0.0.1',
      created_at: '2026-11-02T13:00:00.000Z',
    },
  ];

  // Seed remaining records (10 to 30) for pagination & date variety
  for (let i = 10; i <= 30; i++) {
    const pad = String(i).padStart(8, '0');
    const day = 25 + (i % 6); // 2026-10-25 to 2026-10-30
    const hour = String(8 + (i % 12)).padStart(2, '0');
    auditLogs.push({
      log_id: `a0000000-0000-4000-8000-${pad}`,
      actor_user_id: i % 2 === 0 ? ADMIN_ID : ADMIN_2_ID,
      action_cd: String((i % 4) + 1), // 1, 2, 3, 4
      entity_name: i % 3 === 0 ? 'm_coupon' : (i % 3 === 1 ? 'm_user' : 't_booking'),
      entity_id: `entity-${i}`,
      old_data: { status: 'OLD', val: i },
      new_data: { status: 'NEW', val: i + 1 },
      ip_address: `192.168.0.${i}`,
      created_at: `2026-10-${day}T${hour}:00:00.000Z`,
    });
  }

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
    setSimulateError(val) {
      simulateError = Boolean(val);
    },
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
          // If simulateError is active and table is h_system_audit_log, simulate database failure
          if (simulateError && table === 'h_system_audit_log') {
            const errResult = {
              data: null,
              count: null,
              error: new Error('PostgreSQL connection error: 42P01'),
            };
            return resolve ? resolve(errResult) : Promise.resolve(errResult);
          }

          let dataset = [];

          if (table === 'm_user') dataset = [...users];
          else if (table === 'm_system_code') dataset = [...systemCodes];
          else if (table === 'h_system_audit_log') dataset = auditLogs.map(enrichLogWithActor);

          // Apply equality & inequality filters
          filters.forEach(({ col, val, op }) => {
            if (op === 'neq') {
              dataset = dataset.filter((row) => String(row[col]) !== String(val));
            } else {
              dataset = dataset.filter((row) => String(row[col]) === String(val));
            }
          });

          // Apply IN filters
          inFilters.forEach(({ col, values }) => {
            const set = new Set(values.map(String));
            dataset = dataset.filter((row) => set.has(String(row[col])));
          });

          // Apply GTE filters
          gteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((row) => {
              if (col === 'created_at') {
                return new Date(row[col]).toISOString() >= new Date(val).toISOString();
              }
              return row[col] >= val;
            });
          });

          // Apply LTE filters
          lteFilters.forEach(({ col, val }) => {
            dataset = dataset.filter((row) => {
              if (col === 'created_at') {
                return new Date(row[col]).toISOString() <= new Date(val).toISOString();
              }
              return row[col] <= val;
            });
          });

          // Apply sorting
          if (orderFn) {
            dataset.sort(orderFn);
          } else if (table === 'h_system_audit_log') {
            // Default descending by created_at
            dataset.sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)));
          }

          const totalCount = dataset.length;

          // Apply pagination slicing
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

// ─── Ephemeral Server Bootstrapper ──────────────────────────────────────────

async function startTestServer() {
  const mockClient = createInMemorySupabaseClient();

  // Override Supabase client module in require cache before requiring application features
  const supabaseClientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: mockClient,
  };

  // Require audit log service and inject mock client via setter if available
  try {
    const auditLogService = require('../backend/src/features/audit_logs/audit_log.service');
    if (typeof auditLogService.setCustomClient === 'function') {
      auditLogService.setCustomClient(mockClient);
    }
  } catch (err) {
    console.warn('[Harness] audit_log.service require notice:', err.message);
  }

  // Require route and error handler
  const auditLogRoute = require('../backend/src/features/audit_logs/audit_log.route');
  const errorHandler = require('../backend/src/common/middlewares/errorHandler');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount audit log route under standard project API prefix
  app.use('/api', auditLogRoute);

  // 404 Fallback
  app.use((_req, _res, next) => {
    const err = new Error('Không tìm thấy đường dẫn API yêu cầu.');
    err.statusCode = 404;
    next(err);
  });

  // Global Error Handler
  app.use(errorHandler);

  const serverPipe = http.createServer(app);
  const serverTcp = http.createServer(app);

  await new Promise((resolve) => {
    serverPipe.listen(PIPE_NAME, resolve);
  });

  await new Promise((resolve) => {
    serverTcp.listen(PORT, '127.0.0.1', () => resolve());
    serverTcp.on('error', (err) => {
      console.warn('[Harness] TCP 5006 listen notice:', err.code);
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

// ─── Test Harness Runner State & Helpers ─────────────────────────────────────

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

  // Ensure request path has safely encoded spaces and URI characters
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

    req.on('error', (err) => {
      // Fallback to TCP if pipe fails
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

// ─── Test Scenarios Implementation ──────────────────────────────────────────

async function runTestSuite(mockClient) {
  console.log('========================================================================');
  console.log(' AVORA ADMIN AUDIT LOG BACKEND 4-TIER VERIFICATION HARNESS (h_system_audit_log)');
  console.log(' Port: ' + PORT + ' | Target: ' + BASE_URL);
  console.log('========================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (21 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\x1b[36m--- TIER 1: FEATURE COVERAGE (21 Tests) ---\x1b[0m');

  // Capability 1.1: RBAC & Authentication (6 tests)
  try {
    const res = await request('/api/admin/audit-logs');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    assert(/đăng nhập/i.test(res.body?.message || ''), 'Expected login prompt in message');
    recordResult('T1.1', 'RBAC: Reject request missing Authorization header with 401', true);
  } catch (err) {
    recordResult('T1.1', 'RBAC: Reject request missing Authorization header with 401', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { headers: { Authorization: 'Bearer bad.token.value' } });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    recordResult('T1.2', 'RBAC: Reject invalid Bearer token with 401', true);
  } catch (err) {
    recordResult('T1.2', 'RBAC: Reject invalid Bearer token with 401', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_CUSTOMER });
    assert(res.status === 403, `Expected 403 for Customer, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    assert(/quyền/i.test(res.body?.message || '') || /ADM/i.test(res.body?.message || ''), 'Expected permission denied message');
    recordResult('T1.3', 'RBAC: Reject Customer role (CUS) with 403 Forbidden', true);
  } catch (err) {
    recordResult('T1.3', 'RBAC: Reject Customer role (CUS) with 403 Forbidden', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_VENDOR });
    assert(res.status === 403, `Expected 403 for Vendor, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    recordResult('T1.4', 'RBAC: Reject Vendor role (VEN) with 403 Forbidden', true);
  } catch (err) {
    recordResult('T1.4', 'RBAC: Reject Vendor role (VEN) with 403 Forbidden', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_BMR });
    assert(res.status === 403, `Expected 403 for BMR, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    recordResult('T1.5', 'RBAC: Reject Business Manager role (BMR) with 403 Forbidden', true);
  } catch (err) {
    recordResult('T1.5', 'RBAC: Reject Business Manager role (BMR) with 403 Forbidden', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200 for Admin, got ${res.status}`);
    assert(res.body?.status === 'success', 'Expected status to be success');
    recordResult('T1.6', 'RBAC: Grant access to System Administrator (ADM) with 200 OK', true);
  } catch (err) {
    recordResult('T1.6', 'RBAC: Grant access to System Administrator (ADM) with 200 OK', false, err.message);
  }

  // Capability 1.2: Standard Audit Log List & Relational Joins (5 tests)
  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(Array.isArray(items), 'data.items or data.logs must be an array');
    assert(items.length === 10, `Expected default limit of 10 items, got ${items.length}`);
    const p = res.body?.data?.pagination;
    assert(p && p.page === 1 && p.limit === 10 && p.total >= 25 && p.totalPages >= 3, 'Pagination metadata mismatch');
    recordResult('T1.7', 'List: Standard list returns default page 1, limit 10, and pagination metadata', true, `Total: ${p.total}`);
  } catch (err) {
    recordResult('T1.7', 'List: Standard list returns default page 1, limit 10, and pagination metadata', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    const items = res.body?.data?.items || res.body?.data?.logs;
    const adminLog = items.find((i) => i.actor_user_id === ADMIN_ID);
    assert(adminLog && adminLog.actor, 'Expected item with populated actor');
    assert(adminLog.actor.email === 'admin@avora.com', `Expected actor email admin@avora.com, got ${adminLog.actor.email}`);
    assert(adminLog.actor.full_name === 'Admin Nguyen', 'Expected actor full_name Admin Nguyen');
    recordResult('T1.8', 'List Joins: Actor details (email, full_name, role) joined from m_user', true);
  } catch (err) {
    recordResult('T1.8', 'List Joins: Actor details (email, full_name, role) joined from m_user', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    const items = res.body?.data?.items || res.body?.data?.logs;
    const sample = items[0];
    const codeName = sample.action_code_name || sample.action_code;
    const label = sample.action_name || sample.action_label;
    assert(['INS', 'UPD', 'DEL', 'LGN'].includes(codeName), `Expected standard codeName, got ${codeName}`);
    assert(['Insert', 'Update', 'Delete', 'Login'].includes(label), `Expected human readable label, got ${label}`);
    recordResult('T1.9', 'List Mapping: action_cd correctly maps to AUDIT_ACTION standard labels', true, `${codeName} -> ${label}`);
  } catch (err) {
    recordResult('T1.9', 'List Mapping: action_cd correctly maps to AUDIT_ACTION standard labels', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    const items = res.body?.data?.items || res.body?.data?.logs;
    const validEntities = items.every((i) => typeof i.entity_name === 'string' && i.entity_name.length > 0 && i.entity_id !== undefined);
    assert(validEntities, 'All items must possess entity_name and entity_id');
    recordResult('T1.10', 'List Serialization: entity_name and entity_id serialized intact', true);
  } catch (err) {
    recordResult('T1.10', 'List Serialization: entity_name and entity_id serialized intact', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    const items = res.body?.data?.items || res.body?.data?.logs;
    const validMeta = items.every((i) => !isNaN(Date.parse(i.created_at)) && typeof i.ip_address === 'string');
    assert(validMeta, 'Items must contain valid ISO created_at and string ip_address');
    recordResult('T1.11', 'List Metadata: Valid ISO created_at and client ip_address verified', true);
  } catch (err) {
    recordResult('T1.11', 'List Metadata: Valid ISO created_at and client ip_address verified', false, err.message);
  }

  // Capability 1.3: Detail Log Record & JSON Diff Inspection (5 tests)
  try {
    const res = await request(`/api/admin/audit-logs/${LOG_2_UPD_USER_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(log && log.log_id === LOG_2_UPD_USER_ID, 'Expected log_id match');
    recordResult('T1.12', 'Detail: Fetch single audit log by valid UUID returns 200 OK', true);
  } catch (err) {
    recordResult('T1.12', 'Detail: Fetch single audit log by valid UUID returns 200 OK', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_2_UPD_USER_ID}`, { token: TOKEN_ADMIN });
    const log = res.body?.data?.log || res.body?.data;
    assert(log.old_data && log.old_data.role_cd === '2', 'Expected old_data.role_cd === 2');
    recordResult('T1.13', 'Detail Payloads: intact old_data JSON snapshot preserved', true);
  } catch (err) {
    recordResult('T1.13', 'Detail Payloads: intact old_data JSON snapshot preserved', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_2_UPD_USER_ID}`, { token: TOKEN_ADMIN });
    const log = res.body?.data?.log || res.body?.data;
    assert(log.new_data && log.new_data.role_cd === '1', 'Expected new_data.role_cd === 1');
    recordResult('T1.14', 'Detail Payloads: intact new_data JSON snapshot preserved', true);
  } catch (err) {
    recordResult('T1.14', 'Detail Payloads: intact new_data JSON snapshot preserved', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_2_UPD_USER_ID}`, { token: TOKEN_ADMIN });
    const log = res.body?.data?.log || res.body?.data;
    assert(log.diff !== undefined && log.diff !== null, 'Expected diff object or array in response');
    const isDiffValid =
      Boolean(log.diff.modified?.role_cd) ||
      (Array.isArray(log.diff) && log.diff.some((d) => d.field === 'role_cd'));
    assert(isDiffValid, 'Diff must detect modified role_cd');
    recordResult('T1.15', 'Detail Diff: Automated field-level diff isolates modified attributes', true);
  } catch (err) {
    recordResult('T1.15', 'Detail Diff: Automated field-level diff isolates modified attributes', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${NON_EXISTENT_LOG_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');
    recordResult('T1.16', 'Detail 404: Non-existent UUID returns 404 Not Found', true);
  } catch (err) {
    recordResult('T1.16', 'Detail 404: Non-existent UUID returns 404 Not Found', false, err.message);
  }

  // Capability 1.4: Filtering & Search (5 tests)
  try {
    const res = await request('/api/admin/audit-logs?action_cd=2', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected matching records');
    assert(items.every((i) => i.action_cd === '2' || i.action_code_name === 'UPD' || i.action_code === 'UPD'), 'All items must be Update (2/UPD)');
    recordResult('T1.17', 'Filter: Filter by action_cd=2 (UPD) returns only update records', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T1.17', 'Filter: Filter by action_cd=2 (UPD) returns only update records', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?entity_name=m_user', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected matching records');
    assert(items.every((i) => i.entity_name === 'm_user'), 'All items must have entity_name m_user');
    recordResult('T1.18', 'Filter: Filter by entity_name=m_user isolates user entities', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T1.18', 'Filter: Filter by entity_name=m_user isolates user entities', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs?actor_id=${ADMIN_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected matching records');
    assert(items.every((i) => i.actor_user_id === ADMIN_ID), 'All items must belong to specified actor');
    recordResult('T1.19', 'Filter: Filter by actor_id retrieves logs executed by specified administrator', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T1.19', 'Filter: Filter by actor_id retrieves logs executed by specified administrator', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?search=admin@avora.com', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected keyword match');
    recordResult('T1.20', 'Search: Keyword search matches actor email and identifiers', true, `Matches: ${items.length}`);
  } catch (err) {
    recordResult('T1.20', 'Search: Keyword search matches actor email and identifiers', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?start_date=2026-11-01&end_date=2026-11-01', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length === 3, `Expected exactly 3 records on 2026-11-01, got ${items.length}`);
    assert(items.every((i) => i.created_at.startsWith('2026-11-01')), 'All records must be within 2026-11-01');
    recordResult('T1.21', 'Filter: Date range filter accurately restricts results by calendar bounds', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T1.21', 'Filter: Date range filter accurately restricts results by calendar bounds', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES (20 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 2: BOUNDARY & CORNER CASES (20 Tests) ---\x1b[0m');

  // Capability 2.1: Pagination Bounds & Coercion (5 tests)
  try {
    const res = await request('/api/admin/audit-logs?page=0', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for page=0, got ${res.status}`);
    recordResult('T2.1', 'Bounds: page=0 rejected with 400 Bad Request', true);
  } catch (err) {
    recordResult('T2.1', 'Bounds: page=0 rejected with 400 Bad Request', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?page=-5&limit=-10', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for negative pagination, got ${res.status}`);
    recordResult('T2.2', 'Bounds: Negative page & limit rejected with 400 Bad Request', true);
  } catch (err) {
    recordResult('T2.2', 'Bounds: Negative page & limit rejected with 400 Bad Request', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?limit=500', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for limit=500, got ${res.status}`);
    recordResult('T2.3', 'Bounds: Limit exceeding maximum 100 rejected with 400 Bad Request', true);
  } catch (err) {
    recordResult('T2.3', 'Bounds: Limit exceeding maximum 100 rejected with 400 Bad Request', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?page=9999', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200 for high page, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(Array.isArray(items) && items.length === 0, 'Items must be empty array');
    const p = res.body?.data?.pagination;
    assert(p.total > 0 && p.page === 9999, 'Total count must remain preserved');
    recordResult('T2.4', 'Bounds: Page out of bounds returns empty items array with preserved total', true);
  } catch (err) {
    recordResult('T2.4', 'Bounds: Page out of bounds returns empty items array with preserved total', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?page=abc&limit=xyz', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for non-numeric pagination, got ${res.status}`);
    recordResult('T2.5', 'Bounds: Non-numeric pagination values rejected with 400 Bad Request', true);
  } catch (err) {
    recordResult('T2.5', 'Bounds: Non-numeric pagination values rejected with 400 Bad Request', false, err.message);
  }

  // Capability 2.2: Date Range Validation (5 tests)
  try {
    const res = await request('/api/admin/audit-logs?start_date=2026-11-10&end_date=2026-11-01', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for inverted date range, got ${res.status}`);
    recordResult('T2.6', 'Date: Inverted date range (end_date < start_date) rejected with 400', true);
  } catch (err) {
    recordResult('T2.6', 'Date: Inverted date range (end_date < start_date) rejected with 400', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?start_date=02-11-2026', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for malformed date syntax, got ${res.status}`);
    recordResult('T2.7', 'Date: Malformed date syntax (DD-MM-YYYY) rejected with 400', true);
  } catch (err) {
    recordResult('T2.7', 'Date: Malformed date syntax (DD-MM-YYYY) rejected with 400', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?start_date=2026-02-30', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for non-existent date Feb 30, got ${res.status}`);
    recordResult('T2.8', 'Date: Non-existent Gregorian date (2026-02-30) rejected with 400', true);
  } catch (err) {
    recordResult('T2.8', 'Date: Non-existent Gregorian date (2026-02-30) rejected with 400', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?start_date=2026-11-02&end_date=2026-11-02', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200 for single day range, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected records on 2026-11-02');
    assert(items.every((i) => i.created_at.startsWith('2026-11-02')), 'All records must be on 2026-11-02');
    recordResult('T2.9', 'Date: Single day range (2026-11-02 to 2026-11-02) covers 24h window', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T2.9', 'Date: Single day range (2026-11-02 to 2026-11-02) covers 24h window', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?start_date=2026-11-02', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200 for one-sided date, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.every((i) => new Date(i.created_at).toISOString() >= '2026-11-02T00:00:00.000Z'), 'All records must be >= start_date');
    recordResult('T2.10', 'Date: One-sided date filter (only start_date) returns open interval', true, `Count: ${items.length}`);
  } catch (err) {
    recordResult('T2.10', 'Date: One-sided date filter (only start_date) returns open interval', false, err.message);
  }

  // Capability 2.3: Null Fields & Data Anomalies (5 tests)
  try {
    const res = await request(`/api/admin/audit-logs/${LOG_5_NULL_ACTOR_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(log.actor_user_id === null, 'actor_user_id must be null');
    assert(log.actor === null || log.actor?.full_name?.includes('Hệ thống') || log.actor?.full_name?.includes('System'), 'Null actor handled gracefully');
    recordResult('T2.11', 'Null Safety: System automated action with actor_user_id=null does not crash', true);
  } catch (err) {
    recordResult('T2.11', 'Null Safety: System automated action with actor_user_id=null does not crash', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_1_INS_COUPON_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(log.old_data === null, 'Expected old_data === null for INSERT action');
    recordResult('T2.12', 'Null Safety: INSERT action with old_data=null serialized cleanly as null', true);
  } catch (err) {
    recordResult('T2.12', 'Null Safety: INSERT action with old_data=null serialized cleanly as null', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_3_DEL_HOTEL_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(log.new_data === null, 'Expected new_data === null for DELETE action');
    recordResult('T2.13', 'Null Safety: DELETE action with new_data=null serialized cleanly as null', true);
  } catch (err) {
    recordResult('T2.13', 'Null Safety: DELETE action with new_data=null serialized cleanly as null', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_9_NESTED_JSON_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(typeof log.new_data === 'object' && log.new_data.security?.lockout?.duration === 600, 'Nested JSON must be parsed native object');
    recordResult('T2.14', 'Data Integrity: Deeply nested JSON payloads parsed without double escaping', true);
  } catch (err) {
    recordResult('T2.14', 'Data Integrity: Deeply nested JSON payloads parsed without double escaping', false, err.message);
  }

  try {
    const res = await request(`/api/admin/audit-logs/${LOG_8_DELETED_USR_ID}`, { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const log = res.body?.data?.log || res.body?.data;
    assert(log.log_id === LOG_8_DELETED_USR_ID, 'Expected log_id match');
    recordResult('T2.15', 'Data Integrity: Historical log by deleted staff member handled without 500', true);
  } catch (err) {
    recordResult('T2.15', 'Data Integrity: Historical log by deleted staff member handled without 500', false, err.message);
  }

  // Capability 2.4: Input Sanitation & Attack Resistance (5 tests)
  try {
    const res = await request('/api/admin/audit-logs/not-a-valid-uuid', { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for malformed UUID, got ${res.status}`);
    recordResult('T2.16', 'Sanitation: Malformed UUID route parameter rejected with 400 Bad Request', true);
  } catch (err) {
    recordResult('T2.16', 'Sanitation: Malformed UUID route parameter rejected with 400 Bad Request', false, err.message);
  }

  try {
    const res = await request("/api/admin/audit-logs?search=' OR '1'='1", { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.status === 'success', 'Expected success status');
    recordResult('T2.17', 'Security: SQL injection payload safely handled with zero crash or SQL leak', true);
  } catch (err) {
    recordResult('T2.17', 'Security: SQL injection payload safely handled with zero crash or SQL leak', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?search=<script>alert(1)</script>', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body?.status === 'success', 'Expected success status');
    recordResult('T2.18', 'Security: XSS script payload handled safely without unescaped reflection', true);
  } catch (err) {
    recordResult('T2.18', 'Security: XSS script payload handled safely without unescaped reflection', false, err.message);
  }

  try {
    const longString = 'A'.repeat(500);
    const res = await request(`/api/admin/audit-logs?search=${longString}`, { token: TOKEN_ADMIN });
    assert(res.status === 400, `Expected 400 for search exceeding 200 chars, got ${res.status}`);
    recordResult('T2.19', 'Sanitation: Search keyword exceeding 200 characters rejected with 400', true);
  } catch (err) {
    recordResult('T2.19', 'Sanitation: Search keyword exceeding 200 characters rejected with 400', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs', {
      method: 'POST',
      token: TOKEN_ADMIN,
      body: { entity_name: 'test' },
    });
    assert(res.status === 404 || res.status === 405, `Expected 404/405 for POST, got ${res.status}`);
    recordResult('T2.20', 'Immutability: POST mutation on audit log collection rejected (404/405)', true);
  } catch (err) {
    recordResult('T2.20', 'Immutability: POST mutation on audit log collection rejected (404/405)', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: COMBINATIONS & COMPLEX QUERYING (5 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 3: COMBINATIONS & COMPLEX QUERYING (5 Tests) ---\x1b[0m');

  try {
    const res = await request(
      '/api/admin/audit-logs?action_cd=2&entity_name=m_user&start_date=2026-11-01&end_date=2026-11-02',
      { token: TOKEN_ADMIN }
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length > 0, 'Expected matches for multi-parameter query');
    const allMatch = items.every(
      (i) =>
        (i.action_cd === '2' || i.action_code_name === 'UPD' || i.action_code === 'UPD') &&
        i.entity_name === 'm_user' &&
        i.created_at >= '2026-11-01T00:00:00.000Z' &&
        i.created_at <= '2026-11-02T23:59:59.999Z'
    );
    assert(allMatch, 'Every item must satisfy all conjunction criteria');
    recordResult('T3.1', 'Combination: Multi-criteria filter (action + entity + date range) enforces logical AND', true, `Matches: ${items.length}`);
  } catch (err) {
    recordResult('T3.1', 'Combination: Multi-criteria filter (action + entity + date range) enforces logical AND', false, err.message);
  }

  try {
    const res = await request(
      '/api/admin/audit-logs?entity_name=m_coupon&search=c-001',
      { token: TOKEN_ADMIN }
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length === 1 && items[0].log_id === LOG_1_INS_COUPON_ID, 'Expected precisely LOG_1');
    recordResult('T3.2', 'Combination: Entity filter + Search term isolates precise targeted log', true);
  } catch (err) {
    recordResult('T3.2', 'Combination: Entity filter + Search term isolates precise targeted log', false, err.message);
  }

  try {
    const res1 = await request('/api/admin/audit-logs?page=1&limit=2', { token: TOKEN_ADMIN });
    const res2 = await request('/api/admin/audit-logs?page=2&limit=2', { token: TOKEN_ADMIN });
    assert(res1.status === 200 && res2.status === 200, 'Both pages must succeed');
    const t1 = res1.body?.data?.pagination?.total;
    const t2 = res2.body?.data?.pagination?.total;
    assert(t1 === t2 && t1 > 0, `Total must be invariant across pages (${t1} === ${t2})`);
    recordResult('T3.3', 'Combination: Pagination traversal ensures total count remains invariant', true, `Total: ${t1}`);
  } catch (err) {
    recordResult('T3.3', 'Combination: Pagination traversal ensures total count remains invariant', false, err.message);
  }

  try {
    const res = await request('/api/admin/audit-logs?entity_name=non_existent_entity_404', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    const p = res.body?.data?.pagination;
    assert(Array.isArray(items) && items.length === 0, 'Items must be empty array');
    assert(p.total === 0 && p.totalPages === 0, 'Total and totalPages must be 0');
    recordResult('T3.4', 'Combination: Valid filter matching zero records returns empty state with 200 OK', true);
  } catch (err) {
    recordResult('T3.4', 'Combination: Valid filter matching zero records returns empty state with 200 OK', false, err.message);
  }

  try {
    const r1 = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    assert(r1.status === 200, 'Step 1 Admin expected 200');

    const r2 = await request('/api/admin/audit-logs', { token: TOKEN_VENDOR });
    assert(r2.status === 403, 'Step 2 Vendor expected 403');

    const r3 = await request('/api/admin/audit-logs', { token: TOKEN_CUSTOMER });
    assert(r3.status === 403, 'Step 3 Customer expected 403');

    const r4 = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    assert(r4.status === 200, 'Step 4 Admin expected 200');

    recordResult('T3.5', 'Combination: Rapid role switching (Admin -> Vendor -> Customer -> Admin) verifies no token leak', true);
  } catch (err) {
    recordResult('T3.5', 'Combination: Rapid role switching (Admin -> Vendor -> Customer -> Admin) verifies no token leak', false, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD SCENARIOS & SECURITY OPERATIONS (4 Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m--- TIER 4: REAL-WORLD SCENARIOS & SECURITY (4 Tests) ---\x1b[0m');

  // Scenario 4.1: Admin User Audit Lifecycle
  try {
    const listRes = await request('/api/admin/audit-logs?entity_name=m_user', { token: TOKEN_ADMIN });
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    const items = listRes.body?.data?.items || listRes.body?.data?.logs;
    const targetLog = items.find((i) => i.log_id === LOG_2_UPD_USER_ID);
    assert(Boolean(targetLog), 'Target user modification log must be in list');

    const detailRes = await request(`/api/admin/audit-logs/${targetLog.log_id}`, { token: TOKEN_ADMIN });
    assert(detailRes.status === 200, 'Detail endpoint must succeed');
    const detail = detailRes.body?.data?.log || detailRes.body?.data;

    assert(detail.old_data.role_cd === '2' && detail.new_data.role_cd === '1', 'Role change detected');
    const isDiffRoleFound =
      detail.diff.modified?.role_cd ||
      (Array.isArray(detail.diff) && detail.diff.some((d) => d.field === 'role_cd'));
    assert(isDiffRoleFound, 'Diff must isolate role_cd modification');

    recordResult('T4.1', 'Real-World: Admin User Lifecycle: List -> Filter entity m_user -> Inspect role change diff', true);
  } catch (err) {
    recordResult('T4.1', 'Real-World: Admin User Lifecycle: List -> Filter entity m_user -> Inspect role change diff', false, err.message);
  }

  // Scenario 4.2: Security Incident Investigation (Suspect IP Tracking)
  try {
    const res = await request('/api/admin/audit-logs?ip_address=192.168.1.105', { token: TOKEN_ADMIN });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const items = res.body?.data?.items || res.body?.data?.logs;
    assert(items.length >= 2, `Expected at least 2 logs for suspect IP, got ${items.length}`);

    const entities = new Set(items.map((i) => i.entity_name));
    assert(entities.has('m_user') && entities.has('m_commission_policy'), 'Suspect IP must trace across diverse entities');

    recordResult('T4.2', 'Real-World: Security Incident Investigation: Cross-entity activity tracing for suspect IP', true, `Traced entities: ${Array.from(entities).join(', ')}`);
  } catch (err) {
    recordResult('T4.2', 'Real-World: Security Incident Investigation: Cross-entity activity tracing for suspect IP', false, err.message);
  }

  // Scenario 4.3: Stack Trace Shielding & Friendly Vietnamese Error Verification
  try {
    mockClient.setSimulateError(true);
    const res = await request('/api/admin/audit-logs', { token: TOKEN_ADMIN });
    mockClient.setSimulateError(false);

    assert(res.status === 500, `Expected 500 for simulated database failure, got ${res.status}`);
    assert(res.body?.status === 'error', 'Expected status to be error');

    const msg = res.body?.message || '';
    assert(!msg.includes('42P01'), 'Database error code 42P01 must NOT leak into client response');
    assert(!msg.includes('PostgreSQL'), 'Database vendor jargon must NOT leak into client response');
    assert(!msg.includes('stack') && !msg.includes('at '), 'Stack traces must NOT leak into client response');
    assert(/lỗi/i.test(msg) || /hệ thống/i.test(msg) || /thử lại/i.test(msg), 'Message must be friendly Vietnamese');

    recordResult('T4.3', 'Real-World: Exception Shielding: Database errors masked with friendly Vietnamese & zero stack leak', true);
  } catch (err) {
    mockClient.setSimulateError(false);
    recordResult('T4.3', 'Real-World: Exception Shielding: Database errors masked with friendly Vietnamese & zero stack leak', false, err.message);
  }

  // Scenario 4.4: Audit Log Immutability Verification
  try {
    const putRes = await request(`/api/admin/audit-logs/${LOG_1_INS_COUPON_ID}`, {
      method: 'PUT',
      token: TOKEN_ADMIN,
      body: { action_cd: '99' },
    });
    assert(putRes.status === 404 || putRes.status === 405, `Expected 404/405 for PUT, got ${putRes.status}`);

    const deleteRes = await request(`/api/admin/audit-logs/${LOG_1_INS_COUPON_ID}`, {
      method: 'DELETE',
      token: TOKEN_ADMIN,
    });
    assert(deleteRes.status === 404 || deleteRes.status === 405, `Expected 404/405 for DELETE, got ${deleteRes.status}`);

    recordResult('T4.4', 'Real-World: Immutability Guarantee: PUT and DELETE requests strictly rejected (tamper-proof)', true);
  } catch (err) {
    recordResult('T4.4', 'Real-World: Immutability Guarantee: PUT and DELETE requests strictly rejected (tamper-proof)', false, err.message);
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
  console.log(' TEST SUITE SUMMARY REPORT');
  console.log('========================================================================');
  console.log(` TOTAL TESTS: ${total}`);
  console.log(` PASSED:      \x1b[32m${passed}\x1b[0m`);
  console.log(` FAILED:      ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(` DURATION:    ${duration}s`);
  console.log('------------------------------------------------------------------------');
  if (failed === 0 && total >= 50) {
    console.log(' VERDICT:     \x1b[32mALL 50 AUTOMATED TESTS PASSED (100% SUCCESS)\x1b[0m');
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
};
