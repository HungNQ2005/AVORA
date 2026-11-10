'use strict';

const http = require('http');
const path = require('path');

const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const jwt = require('jsonwebtoken');
const express = require('express');

const PORT = 5022;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'avora_jwt_secret_dev_key_change_in_prod';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_ID = '22222222-2222-4222-8222-222222222222';
const VENDOR_OTHER_ID = '66666666-6666-4666-8666-666666666666';
const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';
const HOTEL_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_HOTEL_ID = '77777777-7777-4777-8777-777777777777';
const TICKET_RSV_ID = '88888888-8888-4888-8888-888888888888';
const TICKET_CLS_ID = '99999999-9999-4999-8999-999999999999';

const generateToken = (userId, roleCd) => {
  return jwt.sign({ user_id: userId, role_cd: roleCd }, JWT_SECRET, { expiresIn: '1h' });
};

const adminToken = generateToken(ADMIN_ID, '1');
const vendorToken = generateToken(VENDOR_ID, '4');
const customerToken = generateToken(CUSTOMER_ID, '2');

// Mock data store
let mockDb = {
  m_user: [
    { user_id: ADMIN_ID, email: 'admin@avora.vn', full_name: 'Admin Tổng', role_cd: '1', is_deleted: false },
    { user_id: VENDOR_ID, email: 'vendor@hotel.vn', full_name: 'Chủ Khách Sạn A', phone: '0901234567', role_cd: '4', is_deleted: false },
    { user_id: VENDOR_OTHER_ID, email: 'other@hotel.vn', full_name: 'Chủ Khách Sạn B', phone: '0909999999', role_cd: '4', is_deleted: false },
    { user_id: CUSTOMER_ID, email: 'cus@gmail.com', full_name: 'Khách Đặt Phòng', role_cd: '2', is_deleted: false },
  ],
  m_system_code: [
    { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'ADM' },
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS' },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN' },
    { business_cd: 'BANK_CD', code_cd: '1', code_name: 'VCB', sort_no: 1 },
    { business_cd: 'BANK_CD', code_cd: '5', code_name: 'TCB', sort_no: 5 },
    { business_cd: 'BANK_CD', code_cd: '6', code_name: 'MBB', sort_no: 6 },
  ],
  m_hotel: [
    { hotel_id: HOTEL_ID, name: 'Khách Sạn Avora Luxury', address: '123 Bạch Đằng, Đà Nẵng', owner_id: VENDOR_ID, is_deleted: false },
    { hotel_id: OTHER_HOTEL_ID, name: 'Khách Sạn Khác', address: '456 Trần Phú, Đà Nẵng', owner_id: VENDOR_OTHER_ID, is_deleted: false },
  ],
  m_bank_account: [
    {
      bank_account_id: 'ba111111-1111-4111-8111-111111111111',
      hotel_id: HOTEL_ID,
      bank_cd: '1',
      account_number: '007100111222',
      account_holder: 'CHU KHACH SAN A',
      bin_code: '970436',
      is_verify: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      bank_account_id: 'ba222222-2222-4222-8222-222222222222',
      hotel_id: OTHER_HOTEL_ID,
      bank_cd: '6',
      account_number: '0987654321',
      account_holder: 'CHU KHACH SAN B',
      bin_code: '970422',
      is_verify: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  t_support_ticket: [
    {
      ticket_id: TICKET_RSV_ID,
      hotel_id: HOTEL_ID,
      requester_id: VENDOR_ID,
      ticket_type_cd: 'VBU',
      ticket_status_cd: 'RSV',
      title: 'Xin đổi sang tài khoản Techcombank mới',
      description: 'Ngân hàng muốn thay đổi: Techcombank\nSố tài khoản ngân hàng muốn thay đổi: 1903888999',
      assigned_to: ADMIN_ID,
      resolved_at: new Date().toISOString(),
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      ticket_id: TICKET_CLS_ID,
      hotel_id: HOTEL_ID,
      requester_id: VENDOR_ID,
      ticket_type_cd: 'VBU',
      ticket_status_cd: 'CLS',
      title: 'Yêu cầu cũ đã đóng',
      description: 'Yêu cầu đổi STK trước đây',
      resolved_at: new Date().toISOString(),
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  t_hotel_wallet: [
    { wallet_id: 'w1111111-1111-4111-8111-111111111111', hotel_id: HOTEL_ID },
  ],
  t_withdrawal_request: [],
  h_system_audit_log: [],
};

// Create in-memory mock client matching Supabase query patterns
const createMockSupabase = () => ({
  from: (tableName) => {
    let rows = mockDb[tableName] ? [...mockDb[tableName]] : [];
    let isSingle = false;
    let isMaybeSingle = false;

    const builder = {
      select: () => builder,
      eq: (col, val) => {
        rows = rows.filter((r) => String(r[col]) === String(val));
        return builder;
      },
      neq: (col, val) => {
        rows = rows.filter((r) => String(r[col]) !== String(val));
        return builder;
      },
      in: (col, arr) => {
        const set = new Set(arr.map(String));
        rows = rows.filter((r) => set.has(String(r[col])));
        return builder;
      },
      order: () => builder,
      limit: (n) => {
        rows = rows.slice(0, n);
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      maybeSingle: () => {
        isMaybeSingle = true;
        return builder;
      },
      insert: (data) => {
        const toInsert = Array.isArray(data) ? data : [data];
        rows = [];
        toInsert.forEach((item) => {
          const rec = { ...item };
          if (tableName === 'm_bank_account' && !rec.bank_account_id) {
            rec.bank_account_id = `ba-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          }
          if (tableName === 'h_system_audit_log' && !rec.log_id) {
            rec.log_id = `log-${Date.now()}`;
          }
          if (!mockDb[tableName]) mockDb[tableName] = [];
          mockDb[tableName].push(rec);
          rows.push(rec);
        });
        return builder;
      },
      update: (updates) => {
        return {
          eq: (col, val) => {
            const matched = (mockDb[tableName] || []).filter((r) => String(r[col]) === String(val));
            matched.forEach((r) => Object.assign(r, updates));
            return Promise.resolve({ data: matched, error: null });
          },
        };
      },
      then: (resolve) => {
        let resultData = rows;
        if (isSingle) {
          resultData = rows[0] || null;
        } else if (isMaybeSingle) {
          resultData = rows.length > 0 ? rows[0] : null;
        }
        resolve({ data: resultData, error: null });
      },
    };
    return builder;
  },
});

// Patch require cache for supabaseClient before importing routes/services
const supabasePath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
const mockClient = createMockSupabase();
require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: mockClient,
};
const app = express();
app.use(express.json());

const hotelBankRequestRoute = require('../backend/src/features/hotel_bank_requests/hotel_bank_requests.route');
const errorHandler = require('../backend/src/common/middlewares/errorHandler');

app.use('/api', hotelBankRequestRoute);
app.use(errorHandler);

const request = (method, urlPath, token, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runVerification = async () => {
  const server = app.listen(PORT);
  console.log(`[TEST] Verification harness running on ${BASE_URL}`);

  let passed = 0;
  let failed = 0;

  const assert = (name, cond, details = '') => {
    if (cond) {
      console.log(`  PASS: ${name}`);
      passed += 1;
    } else {
      console.error(`  FAIL: ${name} -> ${details}`);
      failed += 1;
    }
  };

  try {
    console.log('\n--- Test Suite 1: RBAC & Auth Security ---');
    // 1.1 Without token -> 401
    const resNoAuth = await request('GET', '/api/admin/hotel-bank-requests', null);
    assert('1.1 GET /admin/hotel-bank-requests without token -> 401', resNoAuth.status === 401);

    // 1.2 Customer role -> 403
    const resCus = await request('GET', '/api/admin/hotel-bank-requests', customerToken);
    assert('1.2 Customer role -> 403', resCus.status === 403);

    // 1.3 Vendor role -> 403
    const resVen = await request('GET', '/api/admin/hotel-bank-requests', vendorToken);
    assert('1.3 Vendor role -> 403', resVen.status === 403);

    // 1.4 Admin role -> 200
    const resAdmin = await request('GET', '/api/admin/hotel-bank-requests', adminToken);
    assert('1.4 Admin role -> 200', resAdmin.status === 200);
    assert('1.4b Returns items array', Array.isArray(resAdmin.body?.data?.items));
    // 1.5 Admin get system banks from m_system_code -> 200
    const resBanks = await request('GET', '/api/admin/hotel-bank-requests/banks', adminToken);
    assert('1.5 GET /admin/hotel-bank-requests/banks -> 200', resBanks.status === 200);
    assert('1.5b Returns banks array from m_system_code', Array.isArray(resBanks.body?.data) && resBanks.body.data.length > 0);
    assert('1.5c Bank items include code_name and human-readable name', resBanks.body?.data?.some((b) => b.code_name === 'VCB' && b.name === 'Vietcombank'));

    console.log('\n--- Test Suite 2: List & Filter Features ---');
    const items = resAdmin.body?.data?.items || [];
    assert('2.1 Default status=RSV returns approved ticket', items.some((i) => i.ticket_id === TICKET_RSV_ID));
    assert('2.2 Default status=RSV excludes CLS ticket', !items.some((i) => i.ticket_id === TICKET_CLS_ID));

    // Check hotel & bank data inclusion
    const rsvItem = items.find((i) => i.ticket_id === TICKET_RSV_ID);
    assert('2.3 Item includes hotel info', rsvItem?.hotel?.hotel_name === 'Khách Sạn Avora Luxury');
    assert('2.4 Item includes requester info', rsvItem?.requester?.full_name === 'Chủ Khách Sạn A');
    assert('2.5 Item includes current active bank', rsvItem?.hotel?.current_bank?.account_number === '007100111222');

    // 2.6 Filter CLS
    const resCls = await request('GET', '/api/admin/hotel-bank-requests?status=CLS', adminToken);
    assert('2.6 Filter status=CLS returns closed ticket', resCls.body?.data?.items?.some((i) => i.ticket_id === TICKET_CLS_ID));

    console.log('\n--- Test Suite 3: Validation & Business Rules on Apply ---');
    // 3.1 Missing confirmed_with_hotel -> 400
    const resNoConfirm = await request('POST', `/api/admin/hotel-bank-requests/${TICKET_RSV_ID}/apply`, adminToken, {
      bank_cd: '5',
      account_number: '1903888999',
      account_holder: 'CHU KHACH SAN A',
      confirmed_with_hotel: false,
    });
    assert('3.1 confirmed_with_hotel = false -> 400', resNoConfirm.status === 400);

    // 3.2 Invalid bank_cd -> 400
    const resBadBank = await request('POST', `/api/admin/hotel-bank-requests/${TICKET_RSV_ID}/apply`, adminToken, {
      bank_cd: '99999',
      account_number: '1903888999',
      account_holder: 'CHU KHACH SAN A',
      confirmed_with_hotel: true,
    });
    assert('3.2 Invalid bank_cd -> 400', resBadBank.status === 400);

    // 3.3 Apply to CLS ticket -> 409
    const resApplyCls = await request('POST', `/api/admin/hotel-bank-requests/${TICKET_CLS_ID}/apply`, adminToken, {
      bank_cd: '5',
      account_number: '1903888999',
      account_holder: 'CHU KHACH SAN A',
      confirmed_with_hotel: true,
    });
    assert('3.3 Apply to CLS ticket -> 409 already closed', resApplyCls.status === 409);

    // 3.4 Duplicate bank account with other vendor -> 409
    const resDup = await request('POST', `/api/admin/hotel-bank-requests/${TICKET_RSV_ID}/apply`, adminToken, {
      bank_cd: '6',
      account_number: '0987654321', // Belongs to OTHER_HOTEL_ID owned by VENDOR_OTHER_ID
      account_holder: 'CHU KHACH SAN B',
      confirmed_with_hotel: true,
    });
    assert('3.4 Duplicate STK linked to another vendor -> 409 conflict', resDup.status === 409);

    console.log('\n--- Test Suite 4: Successful Application Execution ---');
    // 4.1 Valid apply
    const resSuccess = await request('POST', `/api/admin/hotel-bank-requests/${TICKET_RSV_ID}/apply`, adminToken, {
      bank_cd: '5',
      account_number: '1903888999',
      account_holder: 'chu khach san a',
      confirmed_with_hotel: true,
    });
    assert('4.1 Valid apply -> 200 Success', resSuccess.status === 200);

    // 4.2 Check that new bank account is uppercase
    assert('4.2 Account holder uppercase in result', resSuccess.body?.data?.new_bank_account?.account_holder === 'CHU KHACH SAN A');
    assert('4.2b New account is verified', resSuccess.body?.data?.new_bank_account?.is_verify === true);

    // 4.3 Check that ticket is now CLS
    const updatedTicket = mockDb.t_support_ticket.find((t) => t.ticket_id === TICKET_RSV_ID);
    assert('4.3 Ticket status updated to CLS', updatedTicket?.ticket_status_cd === 'CLS');
    assert('4.4 Resolution note contains admin action', updatedTicket?.resolution_note?.includes('1903888999'));

    // 4.5 Check old bank account is now is_verify = false
    const oldAcc = mockDb.m_bank_account.find((b) => b.bank_account_id === 'ba111111-1111-4111-8111-111111111111');
    assert('4.5 Old bank account set to is_verify = false', oldAcc?.is_verify === false);

    // 4.6 Check audit log recorded
    assert('4.6 Audit log recorded in h_system_audit_log', mockDb.h_system_audit_log?.length > 0);
  } finally {
    server.close();
  }

  console.log(`\n================================`);
  console.log(`RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runVerification().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
