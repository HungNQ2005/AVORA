'use strict';

/**
 * AVORA - Business Manager Customer Refund Management (AVRRF VietQR + SePay Outgoing Webhook):
 * Automated verification harness.
 *
 * Chạy:  node avora_web/avora_project/tests/verify_refund_request_payout.js
 */

const assert = require('assert');
const http = require('http');
const os = require('os');
const path = require('path');

const backendRoot = path.resolve(__dirname, '../backend');
const backendNodeModules = path.join(backendRoot, 'node_modules');
if (!module.paths.includes(backendNodeModules)) module.paths.push(backendNodeModules);

process.env.JWT_SECRET = 'test_jwt_secret';
process.env.SEPAY_API_KEY = 'test-sepay-key';
process.env.SEPAY_HMAC_SECRET = '';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';

const jwt = require('jsonwebtoken');
const express = require('express');

// ─── IDs ────────────────────────────────────────────────────────────────────
const BM_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_ID = '22222222-2222-4222-8222-222222222222';
const CUS_1_ID = '33333333-3333-4333-8333-333333333331';
const CUS_2_ID = '33333333-3333-4333-8333-333333333332';
const HOTEL_ID = '44444444-4444-4444-8444-444444444444';
const POLICY_ID = '55555555-5555-4555-8555-555555555555';

const BOOKING_1 = '66666666-6666-4666-8666-666666666661'; // Đã hủy có phí 20%
const BOOKING_2 = '66666666-6666-4666-8666-666666666662'; // Đơn hủy đã có sẵn 1 lệnh PND chờ gộp
const TX_1 = '77777777-7777-4777-8777-777777777771';
const TX_2 = '77777777-7777-4777-8777-777777777772';

const TICKET_RFD_RSV_1 = '88888888-8888-4888-8888-888888888881'; // RFD + RSV (hợp lệ)
const TICKET_RFD_RSV_2 = '88888888-8888-4888-8888-888888888882'; // RFD + RSV gắn BOOKING_2 đang có lệnh PND
const TICKET_RFD_OPN = '88888888-8888-4888-8888-888888888883'; // RFD nhưng OPN (chưa duyệt)
const TICKET_PAY_RSV = '88888888-8888-4888-8888-888888888884'; // RSV nhưng loại PAY (không phải RFD)

const REFUND_PND_EXISTING = '99999999-9999-4999-8999-999999999991'; // Lệnh PND từ đơn BOOKING_2 hủy (chưa có STK)
const REFUND_PND_NO_BANK = '99999999-9999-4999-8999-999999999992'; // Lệnh PND thiếu STK hoàn toàn
const REFUND_SUC_OLD = '99999999-9999-4999-8999-999999999993'; // Lệnh đã hoàn tiền thành công

// ─── In-memory Supabase fake ────────────────────────────────────────────────
const db = {};
const state = { rpcCalls: [], nextIdCounter: 1 };

const resetDb = () => {
  state.rpcCalls = [];
  state.nextIdCounter = 1;
  const ts = '2026-11-05T01:00:00.000Z';

  db.m_user = [
    { user_id: BM_ID, role_cd: '3', is_deleted: false, full_name: 'BM Admin', email: 'bm@avora.com' },
    { user_id: VENDOR_ID, role_cd: '4', is_deleted: false, full_name: 'Vendor One', email: 'v@avora.com' },
    {
      user_id: CUS_1_ID,
      role_cd: '2',
      is_deleted: false,
      full_name: 'Nguyen Van A',
      email: 'cus1@avora.com',
      phone: '0901111111',
      refund_bank_cd: '1',
      refund_account_number: '0123456789',
      refund_account_holder: 'NGUYEN VAN A',
    },
    {
      user_id: CUS_2_ID,
      role_cd: '2',
      is_deleted: false,
      full_name: 'Tran Thi B',
      email: 'cus2@avora.com',
      phone: '0902222222',
      refund_bank_cd: null,
      refund_account_number: null,
      refund_account_holder: null,
    },
  ];

  db.m_system_code = [
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS' },
    { business_cd: 'USER_ROLE', code_cd: '3', code_name: 'BMR' },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN' },
    { business_cd: 'BANK_CD', code_cd: '1', code_name: 'VCB' },
    { business_cd: 'BANK_CD', code_cd: '2', code_name: 'MB' },
    { business_cd: 'SUPPORT_CAT', code_cd: '4', code_name: 'RFD' },
    { business_cd: 'SUPPORT_CAT', code_cd: '2', code_name: 'PAY' },
    { business_cd: 'SUPPORT_STS', code_cd: '1', code_name: 'OPN' },
    { business_cd: 'SUPPORT_STS', code_cd: '4', code_name: 'RSV' },
    { business_cd: 'REFUND_STS', code_cd: '1', code_name: 'PND' },
    { business_cd: 'REFUND_STS', code_cd: '2', code_name: 'PRO' },
    { business_cd: 'REFUND_STS', code_cd: '3', code_name: 'SUC' },
    { business_cd: 'BOOKING_STS', code_cd: '4', code_name: 'CAN' },
  ];

  db.m_hotel = [{ hotel_id: HOTEL_ID, name: 'Avora Luxury Resort', owner_id: VENDOR_ID, is_deleted: false }];
  db.m_cancellation_policy = [
    {
      cancellation_policy_id: POLICY_ID,
      hotel_id: HOTEL_ID,
      free_cancel_before_hours: 48,
      penalty_rate: 20,
    },
  ];

  db.t_booking = [
    {
      booking_id: BOOKING_1,
      user_id: CUS_1_ID,
      hotel_id: HOTEL_ID,
      total_amount: 1000000,
      discount_amount: 0,
      guest_name: 'Nguyen Van A',
      guest_phone: '0901111111',
      booking_status_cd: '4',
      cancellation_policy_id: POLICY_ID,
      applied_penalty_rate: 20, // Phí hủy 20% -> gợi ý hoàn 800,000 VND
      created_at: ts,
      updated_at: ts,
      m_hotel: { hotel_id: HOTEL_ID, name: 'Avora Luxury Resort' },
      t_booking_detail: [{ check_in_date: '2026-12-01', check_out_date: '2026-12-03', quantity: 1, unit_price: 1000000 }],
      t_payment_transaction: [{ transaction_id: TX_1, amount_paid: 1000000, paid_at: ts, gateway_ref_id: 'FT-IN-1' }],
    },
    {
      booking_id: BOOKING_2,
      user_id: CUS_2_ID,
      hotel_id: HOTEL_ID,
      total_amount: 600000,
      discount_amount: 0,
      guest_name: 'Tran Thi B',
      guest_phone: '0902222222',
      booking_status_cd: '4',
      cancellation_policy_id: POLICY_ID,
      applied_penalty_rate: 0,
      created_at: ts,
      updated_at: ts,
      m_hotel: { hotel_id: HOTEL_ID, name: 'Avora Luxury Resort' },
      t_booking_detail: [{ check_in_date: '2026-12-10', check_out_date: '2026-12-12', quantity: 1, unit_price: 600000 }],
      t_payment_transaction: [{ transaction_id: TX_2, amount_paid: 600000, paid_at: ts, gateway_ref_id: 'FT-IN-2' }],
    },
  ];

  db.t_payment_transaction = [
    { transaction_id: TX_1, booking_id: BOOKING_1, amount_paid: 1000000, paid_at: ts, is_refunded: false },
    { transaction_id: TX_2, booking_id: BOOKING_2, amount_paid: 600000, paid_at: ts, is_refunded: false },
  ];

  db.t_support_ticket = [
    {
      ticket_id: TICKET_RFD_RSV_1,
      requester_id: CUS_1_ID,
      booking_id: BOOKING_1,
      ticket_type_cd: 'RFD',
      ticket_status_cd: 'RSV',
      title: 'Xin hoàn tiền đơn hủy phòng BK-1',
      description: 'Tôi đã hủy phòng và muốn nhận hoàn tiền',
      resolution_note: 'Đã duyệt hoàn 80% theo chính sách (800k)',
      is_deleted: false,
      created_at: ts,
      updated_at: ts,
    },
    {
      ticket_id: TICKET_RFD_RSV_2,
      requester_id: CUS_2_ID,
      booking_id: BOOKING_2,
      ticket_type_cd: '4', // code_cd cho RFD
      ticket_status_cd: '4', // code_cd cho RSV
      title: 'Bổ sung STK nhận hoàn tiền cho đơn BK-2',
      description: 'Em gửi STK MB Bank 9876543210 TRAN THI B',
      resolution_note: 'Chuyển BMR cập nhật STK và hoàn 600k',
      is_deleted: false,
      created_at: ts,
      updated_at: ts,
    },
    {
      ticket_id: TICKET_RFD_OPN,
      requester_id: CUS_1_ID,
      booking_id: null,
      ticket_type_cd: 'RFD',
      ticket_status_cd: 'OPN', // Chưa RSV -> không được hiện
      title: 'Phiếu RFD đang mở chưa duyệt',
      description: 'Test',
      is_deleted: false,
      created_at: ts,
      updated_at: ts,
    },
    {
      ticket_id: TICKET_PAY_RSV,
      requester_id: CUS_1_ID,
      booking_id: null,
      ticket_type_cd: 'PAY', // Không phải RFD -> không được hiện
      ticket_status_cd: 'RSV',
      title: 'Phiếu hỏi về thanh toán đã duyệt',
      description: 'Test',
      is_deleted: false,
      created_at: ts,
      updated_at: ts,
    },
  ];

  db.t_support_ticket_booking = [];

  db.t_refund_request = [
    {
      refund_id: REFUND_PND_EXISTING,
      ticket_id: null,
      requester_id: CUS_2_ID,
      booking_id: BOOKING_2,
      transaction_id: TX_2,
      refund_amount: 600000,
      refund_status_cd: '1', // PND
      bank_cd: null,
      account_number: null,
      account_holder: null,
      payment_code: null,
      gateway_refund_ref: 'REF-BOOKING2',
      reason: 'Lý do: Khách hủy đơn • Chưa cung cấp STK hoàn tiền',
      created_at: ts,
      updated_at: ts,
    },
    {
      refund_id: REFUND_PND_NO_BANK,
      ticket_id: null,
      requester_id: CUS_2_ID,
      booking_id: null,
      transaction_id: null,
      refund_amount: 350000,
      refund_status_cd: '1', // PND
      bank_cd: null,
      account_number: null,
      account_holder: null,
      payment_code: null,
      gateway_refund_ref: 'REF-NOBANK',
      reason: 'Chưa có STK',
      created_at: ts,
      updated_at: ts,
    },
    {
      refund_id: REFUND_SUC_OLD,
      ticket_id: null,
      requester_id: CUS_1_ID,
      booking_id: null,
      transaction_id: null,
      refund_amount: 450000,
      refund_status_cd: '3', // SUC
      bank_cd: '1',
      account_number: '0123456789',
      account_holder: 'NGUYEN VAN A',
      payment_code: 'AVRRF99999999',
      gateway_refund_ref: 'FT-REF-OLD',
      settlement_source: 'SEPAY',
      paid_at: ts,
      reason: 'Đã hoàn tiền cũ',
      created_at: ts,
      updated_at: ts,
    },
  ];

  db.t_audit_log = [];
};

class Query {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.filters = [];
    this.patchData = null;
    this.rows = null;
    this.mode = null;
    this.returning = false;
  }
  select() { this.returning = true; return this; }
  update(p) { this.op = 'update'; this.patchData = p; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  eq(c, v) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
  in(c, vs) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
  is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  single() { this.mode = 'single'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }

  exec() {
    const table = (db[this.table] = db[this.table] || []);
    let data;
    if (this.op === 'insert') {
      const inserted = [];
      for (const r of this.rows) {
        if (this.table === 't_refund_request' && r.ticket_id) {
          const dup = table.some((x) => x.ticket_id && String(x.ticket_id) === String(r.ticket_id));
          if (dup) return { data: null, error: { code: '23505', message: 'duplicate ticket_id' } };
        }
        const newRow = {
          ...(this.table === 't_refund_request' && !r.refund_id
            ? { refund_id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(state.nextIdCounter++).padStart(12, '0')}` }
            : {}),
          ...r,
        };
        table.push(newRow);
        inserted.push({ ...newRow });
      }
      data = inserted;
    } else {
      const matched = table.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === 'update') {
        if (this.patchData.payment_code) {
          const clash = table.some((r) => r.payment_code === this.patchData.payment_code);
          if (clash) return { data: null, error: { code: '23505', message: 'duplicate payment_code' } };
        }
        matched.forEach((r) => Object.assign(r, this.patchData));
        data = this.returning ? matched.map((r) => ({ ...r })) : null;
      } else {
        data = matched.map((r) => ({ ...r }));
      }
    }
    if (this.mode === 'maybe') data = data ? data[0] || null : null;
    if (this.mode === 'single') {
      if (!data || data.length !== 1) return { data: null, error: { message: 'single() expected 1 row' } };
      data = data[0];
    }
    return { data, error: null };
  }
}

const fakeSupabase = {
  from: (table) => new Query(table),
  rpc: async (fn, args) => {
    state.rpcCalls.push({ fn, args });
    if (fn !== 'fn_process_sepay_refund_payout') {
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    }

    // Mô phỏng avora.fn_process_sepay_refund_payout (xem sepay_refund_payout_setup.sql)
    const req = db.t_refund_request.find(
      (r) => String(r.payment_code || '').toUpperCase() === String(args.p_payment_code || '').toUpperCase()
    );
    if (!req) return { data: { result: 'NOT_FOUND' }, error: null };

    if (String(req.refund_status_cd) === '3') {
      if (
        args.p_sepay_tx_id == null ||
        req.sepay_transaction_id == null ||
        req.sepay_transaction_id === args.p_sepay_tx_id
      ) {
        return { data: { result: 'ALREADY_SETTLED', refund_id: req.refund_id }, error: null };
      }
      return {
        data: { result: 'DUPLICATE_PAYOUT', refund_id: req.refund_id, received: args.p_transfer_amount },
        error: null,
      };
    }

    if (!['1', '2'].includes(String(req.refund_status_cd))) {
      return {
        data: { result: 'INVALID_STATUS', refund_id: req.refund_id, status_cd: req.refund_status_cd },
        error: null,
      };
    }

    if (Number(args.p_transfer_amount) !== Number(req.refund_amount)) {
      return {
        data: {
          result: 'AMOUNT_MISMATCH',
          refund_id: req.refund_id,
          expected: req.refund_amount,
          received: args.p_transfer_amount,
        },
        error: null,
      };
    }

    const ref =
      (args.p_gateway_ref || '').trim() ||
      `SEPAY-RF-${args.p_sepay_tx_id ?? String(args.p_payment_code).toUpperCase()}`;

    Object.assign(req, {
      refund_status_cd: '3',
      gateway_refund_ref: ref,
      paid_at: '2026-11-09T10:00:00.000Z',
      settlement_source: 'SEPAY',
      sepay_transaction_id: args.p_sepay_tx_id,
    });

    if (req.transaction_id) {
      const tx = db.t_payment_transaction.find((t) => t.transaction_id === req.transaction_id);
      if (tx) tx.is_refunded = true;
    }

    return {
      data: { result: 'SETTLED', refund_id: req.refund_id, gateway_refund_ref: ref },
      error: null,
    };
  },
};

// Inject fake BEFORE loading backend modules
const supabasePath = require.resolve(path.join(backendRoot, 'src/config/supabaseClient.js'));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase };

const refundRequestService = require(path.join(
  backendRoot,
  'src/features/refund_requests/refund_request.service.js'
));
const refundRequestRoute = require(path.join(
  backendRoot,
  'src/features/refund_requests/refund_request.route.js'
));
const paymentRoute = require(path.join(backendRoot, 'src/features/payments/payment.route.js'));
const errorHandler = require(path.join(backendRoot, 'src/common/middlewares/errorHandler.js'));

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.use('/api', refundRequestRoute);
app.use('/api', paymentRoute);
app.use(errorHandler);

const token = (userId) => jwt.sign({ user_id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
const SOCKET_PATH =
  process.platform === 'win32'
    ? `\\\\.\\pipe\\avora-refund-test-${process.pid}`
    : path.join(os.tmpdir(), `avora-refund-test-${process.pid}.sock`);

const call = (method, url, { auth, body, headers = {} } = {}) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(auth ? { Authorization: `Bearer ${token(auth)}` } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            // empty
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const webhook = (payload, key = 'test-sepay-key') =>
  call('POST', '/api/payment/webhook', {
    body: payload,
    headers: key ? { Authorization: `Apikey ${key}` } : {},
  });

// ─── Tests ──────────────────────────────────────────────────────────────────
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('1. Mã AVRRF: generateRefundPayoutCode & extractRefundPayoutCode chuẩn xác', () => {
  for (let i = 0; i < 100; i += 1) {
    const code = refundRequestService.generateRefundPayoutCode();
    assert.match(code, /^AVRRF\d{8}$/);
  }
  assert.strictEqual(
    refundRequestService.extractRefundPayoutCode('MBVCB.999.avrrf12345678.Hoan tien khach'),
    'AVRRF12345678'
  );
  assert.strictEqual(refundRequestService.extractRefundPayoutCode('AVRWD12345678'), null);
  assert.strictEqual(refundRequestService.extractRefundPayoutCode('AVORA12345678'), null);
});

test('2. Phân quyền: chỉ Business Manager (BMR) mới truy cập được API Quản lý hoàn tiền', async () => {
  assert.strictEqual((await call('GET', '/api/business/refund-requests')).status, 401);
  assert.strictEqual((await call('GET', '/api/business/refund-requests', { auth: VENDOR_ID })).status, 403);
  assert.strictEqual((await call('GET', '/api/business/refund-requests', { auth: CUS_1_ID })).status, 403);
  assert.strictEqual((await call('GET', '/api/business/refund-requests', { auth: BM_ID })).status, 200);
});

test('3. Overview: chỉ lọc đúng Support Ticket loại RFD và trạng thái RSV, tính đúng gợi ý hoàn tiền có trừ phí hủy', async () => {
  const res = await call('GET', '/api/business/refund-requests', { auth: BM_ID });
  assert.strictEqual(res.status, 200);
  const data = res.json.data;

  // Chỉ có 2 ticket RFD + RSV (TICKET_RFD_OPN và TICKET_PAY_RSV bị loại)
  assert.strictEqual(data.approved_tickets.length, 2);
  const t1 = data.approved_tickets.find((t) => t.ticket_id === TICKET_RFD_RSV_1);
  assert.ok(t1);
  assert.strictEqual(t1.suggestion.paid_amount, 1000000);
  assert.strictEqual(t1.suggestion.penalty_rate, 20);
  assert.strictEqual(t1.suggestion.suggested_refund_amount, 800000);
  assert.strictEqual(t1.customer.has_refund_bank, true);
  assert.strictEqual(t1.customer.refund_account_number, '0123456789');

  // Ticket 2 phát hiện đơn BOOKING_2 đã có sẵn lệnh PND chờ gộp
  const t2 = data.approved_tickets.find((t) => t.ticket_id === TICKET_RFD_RSV_2);
  assert.ok(t2);
  assert.ok(t2.existing_pending_refund);
  assert.strictEqual(t2.existing_pending_refund.refund_id, REFUND_PND_EXISTING);

  // Tab Pending có 2 lệnh PND, Tab Completed có 1 lệnh SUC
  assert.strictEqual(data.pending_requests.length, 2);
  assert.strictEqual(data.completed_requests.length, 1);
});

test('4. Tạo Refund Request từ Ticket 1 (tự động lấy STK từ m_user và chặn tạo trùng lần 2)', async () => {
  const r1 = await call('POST', `/api/business/refund-requests/from-ticket/${TICKET_RFD_RSV_1}`, {
    auth: BM_ID,
    body: {
      refund_amount: 800000,
      bank_cd: '1',
      account_number: '0123456789',
      account_holder: 'NGUYEN VAN A',
      save_to_user_profile: true,
    },
  });
  assert.strictEqual(r1.status, 201);
  assert.strictEqual(r1.json.data.ticket_id, TICKET_RFD_RSV_1);
  assert.strictEqual(r1.json.data.refund_amount, 800000);

  // Gọi lần 2 cho cùng Ticket 1 -> bị chặn 409 TICKET_ALREADY_HAS_REFUND
  const r2 = await call('POST', `/api/business/refund-requests/from-ticket/${TICKET_RFD_RSV_1}`, {
    auth: BM_ID,
    body: { refund_amount: 800000 },
  });
  assert.strictEqual(r2.status, 409);

  // Không cho phép tạo từ Ticket chưa RSV (TICKET_RFD_OPN)
  const r3 = await call('POST', `/api/business/refund-requests/from-ticket/${TICKET_RFD_OPN}`, {
    auth: BM_ID,
    body: { refund_amount: 500000, bank_cd: '1', account_number: '0123456789', account_holder: 'NGUYEN VAN A' },
  });
  assert.strictEqual(r3.status, 400);
});

test('5. Gộp Ticket 2 vào lệnh PND có sẵn của đơn hủy + lưu cập nhật STK vào m_user cho khách', async () => {
  const r = await call('POST', `/api/business/refund-requests/from-ticket/${TICKET_RFD_RSV_2}`, {
    auth: BM_ID,
    body: {
      refund_amount: 600000,
      bank_cd: '2', // MB Bank
      account_number: '9876543210',
      account_holder: 'TRAN THI B',
      save_to_user_profile: true,
      merge_existing_refund_id: REFUND_PND_EXISTING,
    },
  });
  assert.ok([200, 201].includes(r.status));

  // Kiểm tra lệnh REFUND_PND_EXISTING đã được gán ticket_id và STK mới
  const merged = db.t_refund_request.find((x) => x.refund_id === REFUND_PND_EXISTING);
  assert.strictEqual(merged.ticket_id, TICKET_RFD_RSV_2);
  assert.strictEqual(merged.bank_cd, '2');
  assert.strictEqual(merged.account_number, '9876543210');

  // Kiểm tra m_user của CUS_2_ID đã được lưu STK mới
  const cus2 = db.m_user.find((u) => u.user_id === CUS_2_ID);
  assert.strictEqual(cus2.refund_bank_cd, '2');
  assert.strictEqual(cus2.refund_account_number, '9876543210');
  assert.strictEqual(cus2.refund_account_holder, 'TRAN THI B');
});

test('6. VietQR (AVRRF): chặn 422 khi thiếu STK, sinh mã AVRRFxxxxxxxx idempotent khi đủ STK', async () => {
  // Lệnh chưa có STK (và m_user của khách được xóa tạm để test thiếu STK)
  const cus2 = db.m_user.find((u) => u.user_id === CUS_2_ID);
  cus2.refund_bank_cd = null;
  cus2.refund_account_number = null;
  cus2.refund_account_holder = null;

  const rMissing = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_NO_BANK}/payment-qr`,
    { auth: BM_ID }
  );
  assert.strictEqual(rMissing.status, 422);

  // Lệnh REFUND_PND_EXISTING đã có STK MB Bank (BIN 970422) -> sinh VietQR AVRRFxxxxxxxx
  const rQr1 = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_EXISTING}/payment-qr`,
    { auth: BM_ID }
  );
  assert.strictEqual(rQr1.status, 200);
  const qrData = rQr1.json.data;
  assert.match(qrData.payment_code, /^AVRRF\d{8}$/);
  assert.strictEqual(qrData.amount, 600000);
  assert.strictEqual(qrData.bank.bin, '970422');
  assert.ok(qrData.qr_url.includes(`addInfo=${qrData.payment_code}`));
  assert.ok(qrData.qr_url.includes('amount=600000'));

  // Gọi lần 2 trả về đúng cùng mã AVRRFxxxxxxxx
  const rQr2 = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_EXISTING}/payment-qr`,
    { auth: BM_ID }
  );
  assert.strictEqual(rQr2.json.data.payment_code, qrData.payment_code);
});

test('7. SePay Webhook chiều tiền ra (transferType = out) với mã AVRRFxxxxxxxx tự động chuyển sang Đã hoàn tiền (SUC)', async () => {
  const rQr = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_EXISTING}/payment-qr`,
    { auth: BM_ID }
  );
  const paymentCode = rQr.json.data.payment_code;

  // Sai số tiền -> AMOUNT_MISMATCH, chưa chuyển trạng thái
  const wBadAmt = await webhook({
    id: 90001,
    transferType: 'out',
    transferAmount: 500000, // Lệch với 600,000
    content: `Chuyen khoan hoan tien ${paymentCode}`,
    referenceCode: 'FT263100001',
  });
  assert.strictEqual(wBadAmt.status, 200);
  assert.strictEqual(wBadAmt.json.success, true);

  // Kiểm tra trạng thái vẫn đang PND (chưa hoàn tiền)
  const stBefore = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_EXISTING}/payment-status`,
    { auth: BM_ID }
  );
  assert.strictEqual(stBefore.json.data.is_settled, false);

  // Đúng số tiền 600,000 + khớp mã AVRRF -> SETTLED
  const wOk = await webhook({
    id: 90002,
    transferType: 'out',
    transferAmount: 600000,
    content: `MBVCB.90002.${paymentCode}.Hoan tien khach hang`,
    referenceCode: 'FT263100002',
  });
  assert.strictEqual(wOk.status, 200);
  assert.strictEqual(wOk.json.success, true);

  // Polling status trả về is_settled = true, status_code = SUC
  const stRes = await call(
    'GET',
    `/api/business/refund-requests/${REFUND_PND_EXISTING}/payment-status`,
    { auth: BM_ID }
  );
  assert.strictEqual(stRes.status, 200);
  assert.strictEqual(stRes.json.data.is_settled, true);
  assert.strictEqual(stRes.json.data.status_code, 'SUC');
  assert.strictEqual(stRes.json.data.settlement_source, 'SEPAY');
  assert.strictEqual(stRes.json.data.gateway_refund_ref, 'FT263100002');

  // Giao dịch gốc TX_2 được đánh dấu is_refunded = true
  const tx2 = db.t_payment_transaction.find((t) => t.transaction_id === TX_2);
  assert.strictEqual(tx2.is_refunded, true);

  // SePay gửi lại cùng id=90002 -> idempotent ALREADY_SETTLED
  const resRetry = await refundRequestService.processSepayRefundPayout({
    id: 90002,
    transferType: 'out',
    transferAmount: 600000,
    content: paymentCode,
    referenceCode: 'FT263100002',
  });
  assert.strictEqual(resRetry.result, 'ALREADY_SETTLED');
});

test('8. Cập nhật bổ sung STK & Xác nhận hoàn tiền thủ công bằng mã FT dự phòng', async () => {
  // Cập nhật STK cho lệnh REFUND_PND_NO_BANK
  const rUpd = await call('PATCH', `/api/business/refund-requests/${REFUND_PND_NO_BANK}`, {
    auth: BM_ID,
    body: {
      bank_cd: '1',
      account_number: '0123456789',
      account_holder: 'TRAN THI B',
      refund_amount: 350000,
      save_to_user_profile: true,
    },
  });
  assert.strictEqual(rUpd.status, 200);

  // Xác nhận thủ công thiếu mã FT -> 400
  const rSettleBad = await call(
    'PATCH',
    `/api/business/refund-requests/${REFUND_PND_NO_BANK}/settle`,
    {
      auth: BM_ID,
      body: { gateway_refund_ref: '' },
    }
  );
  assert.strictEqual(rSettleBad.status, 400);

  // Xác nhận thủ công có mã FT -> 200, chuyển sang SUC (MANUAL)
  const rSettleOk = await call(
    'PATCH',
    `/api/business/refund-requests/${REFUND_PND_NO_BANK}/settle`,
    {
      auth: BM_ID,
      body: { gateway_refund_ref: 'FT-MANUAL-999', note: 'Đã chuyển khoản qua TK dự phòng' },
    }
  );
  assert.strictEqual(rSettleOk.status, 200);
  assert.strictEqual(rSettleOk.json.data.is_settled, true);
  assert.strictEqual(rSettleOk.json.data.settlement_source, 'MANUAL');
  assert.strictEqual(rSettleOk.json.data.gateway_refund_ref, 'FT-MANUAL-999');
});

// ─── Runner ─────────────────────────────────────────────────────────────────
(async () => {
  resetDb();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(SOCKET_PATH, resolve));

  let passed = 0;
  try {
    for (const t of tests) {
      await t.fn();
      passed += 1;
      console.log(`  ✓ ${t.name}`);
    }
    console.log(`\n🎉 ALL ${passed}/${tests.length} REFUND REQUEST PAYOUT TESTS PASSED!`);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
})();
