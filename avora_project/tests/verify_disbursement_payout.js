'use strict';

/**
 * AVORA - Disbursement VietQR + SePay payout: automated verification harness.
 *
 * Chạy:  node tests/verify_disbursement_payout.js
 *
 * - Thay Supabase bằng bộ nhớ trong (không cần mạng / DB thật).
 * - Hàm RPC `fn_process_sepay_withdrawal` được MÔ PHỎNG lại theo đúng logic của
 *   backend/sql/sepay_disbursement_setup.sql (SQL thật cần được chạy thử trên Supabase staging).
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
const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';
const HOTEL_ID = '44444444-4444-4444-8444-444444444444';
const WALLET_ID = '55555555-5555-4555-8555-555555555555';
const BANK_ID = '66666666-6666-4666-8666-666666666666';
const W_APR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const W_PND = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const W_CMP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const W_RACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const W_MANUAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
const W_NOBIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';

// ─── In-memory Supabase fake ────────────────────────────────────────────────
const db = {};
const state = { rpcCalls: [], beforeUpdate: null };

const resetDb = () => {
  state.rpcCalls = [];
  state.beforeUpdate = null;
  const ts = '2026-11-05T01:00:00.000Z';
  db.m_user = [
    { user_id: BM_ID, role_cd: '3', is_deleted: false, full_name: 'BM Admin', email: 'bm@avora.com' },
    { user_id: VENDOR_ID, role_cd: '4', is_deleted: false, full_name: 'Vendor One', email: 'v@avora.com' },
    { user_id: CUSTOMER_ID, role_cd: '2', is_deleted: false, full_name: 'Cus', email: 'c@avora.com' },
  ];
  db.m_system_code = [
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS' },
    { business_cd: 'USER_ROLE', code_cd: '3', code_name: 'BMR' },
    { business_cd: 'USER_ROLE', code_cd: '4', code_name: 'VEN' },
    { business_cd: 'BANK_CD', code_cd: '1', code_name: 'VCB' },
    { business_cd: 'BANK_CD', code_cd: '99', code_name: 'ZZZ' },
    { business_cd: 'WITHDRAWAL_STS', code_cd: '2', code_name: 'APR' },
    { business_cd: 'WITHDRAWAL_STS', code_cd: '4', code_name: 'CMP' },
  ];
  db.m_hotel = [{ hotel_id: HOTEL_ID, name: 'Avora Beach Hotel', owner_id: VENDOR_ID, is_deleted: false }];
  db.t_hotel_wallet = [{ wallet_id: WALLET_ID, hotel_id: HOTEL_ID, available_balance: 0, pending_balance: 0 }];
  db.m_bank_account = [
    { bank_account_id: BANK_ID, hotel_id: HOTEL_ID, bank_cd: '1', bin_code: null, account_number: '0123456789', account_holder: 'NGUYEN VAN A', bank_branch: 'HCM', is_verify: true },
    { bank_account_id: 'bank-nobin', hotel_id: HOTEL_ID, bank_cd: '99', bin_code: null, account_number: '999999', account_holder: 'X', bank_branch: '', is_verify: false },
  ];
  const base = { wallet_id: WALLET_ID, bank_account_id: BANK_ID, amount: 500000, created_at: ts, updated_at: ts, gateway_transaction_ref: null, payment_code: null, paid_at: null, settlement_source: null, sepay_transaction_id: null, settled_by: null };
  db.t_withdrawal_request = [
    { ...base, withdrawal_id: W_APR, status_cd: '2' },
    { ...base, withdrawal_id: W_PND, status_cd: '1', payment_code: 'AVRWD11111111' },
    { ...base, withdrawal_id: W_CMP, status_cd: '4', gateway_transaction_ref: 'FT-OLD', paid_at: ts, settlement_source: 'SEPAY' },
    { ...base, withdrawal_id: W_RACE, status_cd: '2' },
    { ...base, withdrawal_id: W_MANUAL, status_cd: '2', payment_code: 'AVRWD22222222' },
    { ...base, withdrawal_id: W_NOBIN, status_cd: '2', bank_account_id: 'bank-nobin' },
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
  like() { return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  single() { this.mode = 'single'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }

  exec() {
    const table = (db[this.table] = db[this.table] || []);
    let data;
    if (this.op === 'insert') {
      this.rows.forEach((r) => table.push({ ...r }));
      data = this.rows.map((r) => ({ ...r }));
    } else {
      const matched = table.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === 'update') {
        if (state.beforeUpdate) { const fn = state.beforeUpdate; state.beforeUpdate = null; fn(); }
        const fresh = table.filter((r) => this.filters.every((f) => f(r)));
        if (this.patchData.payment_code) {
          const clash = table.some((r) => r.payment_code === this.patchData.payment_code);
          if (clash) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        fresh.forEach((r) => Object.assign(r, this.patchData));
        data = this.returning ? fresh.map((r) => ({ ...r })) : null;
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
    if (fn === 'fn_process_sepay_payment') return { data: { result: 'BOOKING_RPC_CALLED' }, error: null };
    if (fn !== 'fn_process_sepay_withdrawal') return { data: null, error: { message: `unknown rpc ${fn}` } };

    // Mô phỏng avora.fn_process_sepay_withdrawal (xem sepay_disbursement_setup.sql)
    const req = db.t_withdrawal_request.find((r) => r.payment_code === String(args.p_payment_code).toUpperCase());
    if (!req) return { data: { result: 'NOT_FOUND' }, error: null };
    if (req.status_cd === '4') {
      if (args.p_sepay_tx_id == null || req.sepay_transaction_id == null || req.sepay_transaction_id === args.p_sepay_tx_id) {
        return { data: { result: 'ALREADY_SETTLED', withdrawal_id: req.withdrawal_id }, error: null };
      }
      return { data: { result: 'DUPLICATE_PAYOUT', withdrawal_id: req.withdrawal_id, received: args.p_transfer_amount }, error: null };
    }
    if (req.status_cd !== '2') return { data: { result: 'INVALID_STATUS', withdrawal_id: req.withdrawal_id, status_cd: req.status_cd }, error: null };
    if (Number(args.p_transfer_amount) !== Number(req.amount)) {
      return { data: { result: 'AMOUNT_MISMATCH', withdrawal_id: req.withdrawal_id, expected: req.amount, received: args.p_transfer_amount }, error: null };
    }
    const ref = (args.p_gateway_ref || '').trim() || `SEPAY-${args.p_sepay_tx_id ?? String(args.p_payment_code).toUpperCase()}`;
    Object.assign(req, { status_cd: '4', gateway_transaction_ref: ref, paid_at: 'now', settlement_source: 'SEPAY', sepay_transaction_id: args.p_sepay_tx_id });
    return { data: { result: 'SETTLED', withdrawal_id: req.withdrawal_id, gateway_transaction_ref: ref }, error: null };
  },
};

// Inject fake BEFORE loading any backend module.
const supabasePath = require.resolve(path.join(backendRoot, 'src/config/supabaseClient.js'));
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase };

const env = require(path.join(backendRoot, 'src/config/env.js'));
const vietqr = require(path.join(backendRoot, 'src/features/disbursements/vietqr.helper.js'));
const disbursementService = require(path.join(backendRoot, 'src/features/disbursements/disbursement.service.js'));
const disbursementRoute = require(path.join(backendRoot, 'src/features/disbursements/disbursement.route.js'));
const paymentRoute = require(path.join(backendRoot, 'src/features/payments/payment.route.js'));
const errorHandler = require(path.join(backendRoot, 'src/common/middlewares/errorHandler.js'));

// ─── HTTP harness ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.use('/api', disbursementRoute);
app.use('/api', paymentRoute);
app.use(errorHandler);

const token = (userId) => jwt.sign({ user_id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
// Server lắng nghe trên named pipe / unix socket (không cần cổng TCP, chạy được trong sandbox không có mạng).
const SOCKET_PATH = process.platform === 'win32'
  ? `\\\\.\\pipe\\avora-disb-test-${process.pid}`
  : path.join(os.tmpdir(), `avora-disb-test-${process.pid}.sock`);

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
          try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* empty body */ }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const webhook = (payload, key = 'test-sepay-key') =>
  call('POST', '/api/payment/webhook', { body: payload, headers: key ? { Authorization: `Apikey ${key}` } : {} });

const row = (id) => db.t_withdrawal_request.find((r) => r.withdrawal_id === id);

// ─── Tests ──────────────────────────────────────────────────────────────────
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('vietqr: generatePayoutCode có dạng AVRWD + 8 số và không trùng tiền tố AVORA', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = vietqr.generatePayoutCode();
    assert.match(code, /^AVRWD\d{8}$/);
    assert.ok(!/AVORA/i.test(code));
  }
});

test('vietqr: extractPayoutCode bắt mã trong memo ngân hàng, không phân biệt hoa thường', () => {
  assert.strictEqual(vietqr.extractPayoutCode('MBVCB.123.avrwd12345678.CT tu 0011 toi 0123'), 'AVRWD12345678');
  assert.strictEqual(vietqr.extractPayoutCode('AVRWD1234567'), 'AVRWD1234567');
  assert.strictEqual(vietqr.extractPayoutCode('AVRWD123456'), null); // 6 số: quá ngắn
  assert.strictEqual(vietqr.extractPayoutCode('AVORA12345678'), null); // mã booking không bị nhầm
  assert.strictEqual(vietqr.extractPayoutCode(null), null);
});

test('vietqr: resolveBin ưu tiên bin_code hợp lệ, fallback theo mã ngân hàng', () => {
  assert.strictEqual(vietqr.resolveBin({ binCode: '970422', bankShortCode: 'VCB' }), '970422');
  assert.strictEqual(vietqr.resolveBin({ binCode: 'abc', bankShortCode: 'vcb' }), '970436');
  assert.strictEqual(vietqr.resolveBin({ binCode: null, bankShortCode: 'XXX' }), null);
  Object.entries(vietqr.BANK_BIN_BY_CODE).forEach(([, bin]) => assert.match(bin, /^\d{6}$/));
});

test('vietqr: buildPayoutQrUrl encode đúng & từ chối dữ liệu xấu', () => {
  const url = vietqr.buildPayoutQrUrl({ bin: '970436', accountNumber: '0123456789', accountHolder: 'NGUYEN VAN A', amount: 500000, paymentCode: 'AVRWD12345678' });
  assert.strictEqual(url, 'https://img.vietqr.io/image/970436-0123456789-compact2.png?amount=500000&addInfo=AVRWD12345678&accountName=NGUYEN+VAN+A');
  const bad = (o) => assert.throws(() => vietqr.buildPayoutQrUrl({ bin: '970436', accountNumber: '0123456789', amount: 1000, paymentCode: 'AVRWD12345678', ...o }));
  bad({ bin: 'x' });
  bad({ accountNumber: '123/../evil' });
  bad({ accountNumber: '12 34' });
  bad({ amount: 1000.5 });
  bad({ amount: 0 });
  bad({ paymentCode: 'HACK&x=1' });
});

test('QR: bắt buộc đăng nhập và role BMR', async () => {
  assert.strictEqual((await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`)).status, 401);
  assert.strictEqual((await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`, { auth: VENDOR_ID })).status, 403);
  assert.strictEqual((await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`, { auth: CUSTOMER_ID })).status, 403);
  assert.strictEqual((await call('GET', `/api/business/disbursements/${W_APR}/payment-status`, { auth: VENDOR_ID })).status, 403);
});

test('QR: id không hợp lệ -> 400, không tồn tại -> 404', async () => {
  assert.strictEqual((await call('GET', '/api/business/disbursements/not-a-uuid/payment-qr', { auth: BM_ID })).status, 400);
  assert.strictEqual((await call('GET', '/api/business/disbursements/not-a-uuid/payment-status', { auth: BM_ID })).status, 400);
  assert.strictEqual((await call('GET', '/api/business/disbursements/99999999-9999-4999-8999-999999999999/payment-qr', { auth: BM_ID })).status, 404);
});

test('QR: yêu cầu chưa duyệt (PND) -> 409', async () => {
  const r = await call('GET', `/api/business/disbursements/${W_PND}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r.status, 409);
});

test('QR: APR -> trả đủ thông tin chuyển khoản + QR, mã giữ nguyên khi gọi lại', async () => {
  const r1 = await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r1.status, 200);
  const d = r1.json.data;
  assert.strictEqual(d.is_settled, false);
  assert.match(d.payment_code, /^AVRWD\d{8}$/);
  assert.strictEqual(d.transfer_content, d.payment_code);
  assert.strictEqual(d.amount, 500000);
  assert.strictEqual(d.bank.bank_code, 'VCB');
  assert.strictEqual(d.bank.bin, '970436');
  assert.strictEqual(d.bank.account_number, '0123456789');
  assert.strictEqual(d.bank.account_holder, 'NGUYEN VAN A');
  assert.strictEqual(d.bank.is_verified, true);
  assert.ok(d.qr_url.startsWith('https://img.vietqr.io/image/970436-0123456789-compact2.png?'));
  assert.ok(d.qr_url.includes('amount=500000'));
  assert.ok(d.qr_url.includes(`addInfo=${d.payment_code}`));
  assert.strictEqual(row(W_APR).payment_code, d.payment_code);

  const r2 = await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r2.json.data.payment_code, d.payment_code);
});

test('QR: nhiều request đồng thời chỉ sinh ĐÚNG 1 mã', async () => {
  // Gọi trực tiếp service (named pipe Windows không chịu nổi nhiều kết nối đồng thời).
  const results = await Promise.all(Array.from({ length: 8 }, () => disbursementService.getPaymentQr(W_RACE)));
  const codes = new Set(results.map((r) => r.payment_code));
  assert.strictEqual(codes.size, 1);
  assert.strictEqual(row(W_RACE).payment_code, [...codes][0]);
});

test('QR: đã giải ngân -> is_settled=true, không lộ QR', async () => {
  const r = await call('GET', `/api/business/disbursements/${W_CMP}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.data.is_settled, true);
  assert.strictEqual(r.json.data.qr_url, undefined);
  assert.strictEqual(r.json.data.gateway_transaction_ref, 'FT-OLD');
});

test('QR: ngân hàng không xác định được BIN -> 422 và KHÔNG sinh mã', async () => {
  const r = await call('GET', `/api/business/disbursements/${W_NOBIN}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r.status, 422);
  assert.strictEqual(row(W_NOBIN).payment_code, null);
});

test('QR: số tiền thập phân bị từ chối (422)', async () => {
  row(W_APR).amount = 500000.5;
  row(W_APR).payment_code = null;
  const r = await call('GET', `/api/business/disbursements/${W_APR}/payment-qr`, { auth: BM_ID });
  assert.strictEqual(r.status, 422);
});

test('Status polling phản ánh đúng trạng thái', async () => {
  const a = await call('GET', `/api/business/disbursements/${W_APR}/payment-status`, { auth: BM_ID });
  assert.strictEqual(a.json.data.is_settled, false);
  assert.strictEqual(a.json.data.status_code, 'APR');
  const c = await call('GET', `/api/business/disbursements/${W_CMP}/payment-status`, { auth: BM_ID });
  assert.strictEqual(c.json.data.is_settled, true);
  assert.strictEqual(c.json.data.status_code, 'CMP');
});

test('Webhook: thiếu/sai API key -> 401', async () => {
  assert.strictEqual((await webhook({ transferType: 'out' }, null)).status, 401);
  assert.strictEqual((await webhook({ transferType: 'out' }, 'wrong')).status, 401);
});

const payoutPayload = (code, over = {}) => ({
  id: 9001,
  gateway: 'Vietcombank',
  accountNumber: '0011000000000',
  transferType: 'out',
  transferAmount: 500000,
  content: `CT DI ${code}`,
  referenceCode: 'FT26309123456',
  ...over,
});

const getCode = async (id) => (await call('GET', `/api/business/disbursements/${id}/payment-qr`, { auth: BM_ID })).json.data.payment_code;

test('Webhook: tiền VÀO mang mã AVRWD bị bỏ qua (không thể giả mạo bằng cách tự chuyển tiền vào)', async () => {
  const code = await getCode(W_RACE);
  const r = await webhook(payoutPayload(code, { transferType: 'in' }));
  assert.strictEqual(r.status, 200);
  assert.strictEqual(row(W_RACE).status_cd, '2');
  assert.strictEqual(state.rpcCalls.filter((c) => c.fn === 'fn_process_sepay_withdrawal').length, 0);
});

test('Webhook: tiền ra không có mã AVRWD / mã không tồn tại không làm gì', async () => {
  assert.strictEqual((await webhook(payoutPayload('khong co ma'))).status, 200);
  assert.strictEqual(state.rpcCalls.length, 0);
  assert.strictEqual((await webhook(payoutPayload('AVRWD00000000'))).status, 200);
  db.t_withdrawal_request.forEach((r) => assert.notStrictEqual(r.sepay_transaction_id, '9001'));
});

test('Webhook: sai số tiền (thiếu/dư) -> KHÔNG quyết toán', async () => {
  const code = await getCode(W_RACE);
  await webhook(payoutPayload(code, { transferAmount: 499999 }));
  assert.strictEqual(row(W_RACE).status_cd, '2');
  await webhook(payoutPayload(code, { transferAmount: 500001 }));
  assert.strictEqual(row(W_RACE).status_cd, '2');
});

test('Webhook: yêu cầu chưa duyệt (PND) có mã -> KHÔNG quyết toán', async () => {
  await webhook(payoutPayload('AVRWD11111111'));
  assert.strictEqual(row(W_PND).status_cd, '1');
});

test('Webhook: tiền ra từ tài khoản lạ bị bỏ qua khi đã cấu hình SEPAY_PAYOUT_ACCOUNT_NUMBER', async () => {
  const code = await getCode(W_RACE);
  env.SEPAY_PAYOUT_ACCOUNT_NUMBER = '0011000000000';
  try {
    await webhook(payoutPayload(code, { accountNumber: '9999999999' }));
    assert.strictEqual(row(W_RACE).status_cd, '2');
    await webhook(payoutPayload(code, { accountNumber: '0011000000000' }));
    assert.strictEqual(row(W_RACE).status_cd, '4');
  } finally {
    env.SEPAY_PAYOUT_ACCOUNT_NUMBER = '';
  }
});

test('Webhook: khớp tiền -> SETTLED, lưu mã GD ngân hàng; replay idempotent; giao dịch khác = DUPLICATE_PAYOUT', async () => {
  const code = await getCode(W_RACE);
  const ok = await webhook(payoutPayload(code));
  assert.strictEqual(ok.status, 200);
  const r = row(W_RACE);
  assert.strictEqual(r.status_cd, '4');
  assert.strictEqual(r.gateway_transaction_ref, 'FT26309123456');
  assert.strictEqual(r.settlement_source, 'SEPAY');
  assert.strictEqual(r.sepay_transaction_id, '9001');

  // SePay retry cùng id -> không đổi
  const replay = await webhook(payoutPayload(code));
  assert.strictEqual(replay.status, 200);
  assert.strictEqual(row(W_RACE).gateway_transaction_ref, 'FT26309123456');

  // Chi lần 2 bằng giao dịch khác (id khác, ref khác) -> không ghi đè, chỉ cảnh báo
  await webhook(payoutPayload(code, { id: 9002, referenceCode: 'FT-SECOND' }));
  assert.strictEqual(row(W_RACE).gateway_transaction_ref, 'FT26309123456');
  assert.strictEqual(row(W_RACE).sepay_transaction_id, '9001');
});

test('Webhook: tách bạch luồng booking (tiền vào AVORA vẫn gọi RPC booking)', async () => {
  const r = await webhook({ id: 1, transferType: 'in', transferAmount: 1000000, content: 'AVORA12345678' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(state.rpcCalls.length, 1);
  assert.strictEqual(state.rpcCalls[0].fn, 'fn_process_sepay_payment');
  assert.strictEqual(state.rpcCalls[0].args.p_payment_code, 'AVORA12345678');
});

test('Webhook: lỗi RPC -> 500 để SePay gửi lại', async () => {
  const original = fakeSupabase.rpc;
  fakeSupabase.rpc = async () => ({ data: null, error: { message: 'db down' } });
  try {
    const code = 'AVRWD33333333';
    const r = await webhook(payoutPayload(code));
    assert.strictEqual(r.status, 500);
  } finally {
    fakeSupabase.rpc = original;
  }
});

test('Xác nhận thủ công: bắt buộc mã tham chiếu', async () => {
  const r = await call('PATCH', `/api/business/disbursements/${W_MANUAL}/settle`, { auth: BM_ID, body: { gateway_transaction_ref: '   ', note: 'x' } });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(row(W_MANUAL).status_cd, '2');
  const vendor = await call('PATCH', `/api/business/disbursements/${W_MANUAL}/settle`, { auth: VENDOR_ID, body: { gateway_transaction_ref: 'FT1' } });
  assert.strictEqual(vendor.status, 403);
});

test('Xác nhận thủ công: thành công 1 lần, lần 2 bị từ chối, webhook về sau không ghi đè / không báo trùng giả', async () => {
  const ok = await call('PATCH', `/api/business/disbursements/${W_MANUAL}/settle`, { auth: BM_ID, body: { gateway_transaction_ref: 'FT-MANUAL-1', note: 'CK qua app' } });
  assert.strictEqual(ok.status, 200);
  const r = row(W_MANUAL);
  assert.strictEqual(r.status_cd, '4');
  assert.strictEqual(r.settlement_source, 'MANUAL');
  assert.strictEqual(r.settled_by, BM_ID);
  assert.strictEqual(r.gateway_transaction_ref, 'FT-MANUAL-1');

  const again = await call('PATCH', `/api/business/disbursements/${W_MANUAL}/settle`, { auth: BM_ID, body: { gateway_transaction_ref: 'FT-MANUAL-2' } });
  assert.strictEqual(again.status, 400);
  assert.strictEqual(row(W_MANUAL).gateway_transaction_ref, 'FT-MANUAL-1');

  await webhook(payoutPayload('AVRWD22222222', { id: 7777 }));
  assert.strictEqual(row(W_MANUAL).gateway_transaction_ref, 'FT-MANUAL-1');
  assert.strictEqual(row(W_MANUAL).settlement_source, 'MANUAL');
});

test('Xác nhận thủ công: race với webhook (đổi trạng thái giữa lúc đọc và ghi) -> 409, không ghi đè', async () => {
  state.beforeUpdate = () => Object.assign(row(W_APR), { status_cd: '4', gateway_transaction_ref: 'FT-WEBHOOK', settlement_source: 'SEPAY' });
  row(W_APR).amount = 500000;
  const r = await call('PATCH', `/api/business/disbursements/${W_APR}/settle`, { auth: BM_ID, body: { gateway_transaction_ref: 'FT-LATE' } });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(row(W_APR).gateway_transaction_ref, 'FT-WEBHOOK');
  assert.strictEqual(row(W_APR).settlement_source, 'SEPAY');
});

test('Vendor: số tiền thập phân bị từ chối trước khi chạm DB', async () => {
  await assert.rejects(
    () => disbursementService.createVendorDisbursementRequest(VENDOR_ID, { hotel_id: HOTEL_ID, amount: 50000.5, bank_account_id: BANK_ID }),
    (err) => err.statusCode === 400
  );
});

// ─── Runner ─────────────────────────────────────────────────────────────────
(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(SOCKET_PATH, resolve));

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  let passed = 0;
  const failures = [];

  for (const t of tests) {
    resetDb();
    // Giảm nhiễu log từ app trong lúc chạy test
    console.log = () => {}; console.warn = () => {}; console.error = () => {};
    try {
      await t.fn();
      console.log = origLog; console.warn = origWarn; console.error = origError;
      passed += 1;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      console.log = origLog; console.warn = origWarn; console.error = origError;
      failures.push({ name: t.name, err });
      console.log(`  ✗ ${t.name}\n      ${err.message.split('\n').join('\n      ')}`);
    }
  }

  server.close();
  console.log(`\n${passed}/${tests.length} passed`);
  process.exit(failures.length ? 1 : 0);
})();
