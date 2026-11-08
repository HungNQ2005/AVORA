'use strict';

/**
 * AVORA - Group Payment (Payment Sharing) + Customer Refund Bank Account
 * Automated verification test suite.
 *
 * Run: node tests/verify_group_payment_and_refund.js
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const backendRoot = path.resolve(__dirname, '../backend');
const backendNodeModules = path.join(backendRoot, 'node_modules');
if (!module.paths.includes(backendNodeModules)) module.paths.push(backendNodeModules);

process.env.JWT_SECRET = 'test_jwt_secret';
process.env.SEPAY_API_KEY = 'test-sepay-key';
process.env.SEPAY_HMAC_SECRET = '';
process.env.BANK_CODE = 'MB';
process.env.ACCOUNT_NUMBER = '070138212457';
process.env.ACCOUNT_HOLDER_NAME = 'CONG TY CP AVORA';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';

const HOST_ID = '11111111-1111-4111-8111-111111111111';
const HOST_NO_BANK_ID = '22222222-2222-4222-8222-222222222222';
const FRIEND_ID = '33333333-3333-4333-8333-333333333333';
const VENDOR_ID = '44444444-4444-4444-8444-444444444444';
const HOTEL_ID = '55555555-5555-4555-8555-555555555555';
const ROOM_TYPE_ID = '66666666-6666-4666-8666-666666666666';
const BOOKING_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const BOOKING_2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const BOOKING_3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const BOOKING_4 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

const db = {};

const resetDb = () => {
  const nowIso = new Date().toISOString();
  db.m_system_code = [
    { business_cd: 'USER_ROLE', code_cd: '2', code_name: 'CUS' },
    { business_cd: 'BANK_CD', code_cd: '301', code_name: 'VCB' },
    { business_cd: 'BANK_CD', code_cd: '303', code_name: 'MB' },
    { business_cd: 'BOOKING_STS', code_cd: '201', code_name: 'PND' },
    { business_cd: 'BOOKING_STS', code_cd: '202', code_name: 'CFM' },
    { business_cd: 'BOOKING_STS', code_cd: '203', code_name: 'CAN' },
    { business_cd: 'SHARE_STS', code_cd: '1', code_name: 'PND' },
    { business_cd: 'SHARE_STS', code_cd: '2', code_name: 'CMP' },
    { business_cd: 'SHARE_STS', code_cd: '3', code_name: 'EXP' },
    { business_cd: 'SHARE_STS', code_cd: '4', code_name: 'CAN' },
    { business_cd: 'REFUND_STS', code_cd: '1', code_name: 'PND' },
    { business_cd: 'PAYMENT_METHOD', code_cd: '1', code_name: 'BTR' },
    { business_cd: 'LEDGER_TXN_TYPE', code_cd: '1', code_name: 'REV' },
    { business_cd: 'SETTLEMENT_STS', code_cd: '1', code_name: 'PND' },
  ];

  db.m_user = [
    {
      user_id: HOST_ID,
      email: 'host@avora.com',
      full_name: 'Nguyen Van Host',
      phone: '0901234567',
      role_cd: '2',
      is_verified: true,
      is_deleted: false,
      refund_bank_cd: null,
      refund_account_number: null,
      refund_account_holder: null,
      created_at: nowIso,
    },
    {
      user_id: HOST_NO_BANK_ID,
      email: 'nobank@avora.com',
      full_name: 'Tran Thi Skip',
      phone: '0909998887',
      role_cd: '2',
      is_verified: true,
      is_deleted: false,
      refund_bank_cd: null,
      refund_account_number: null,
      refund_account_holder: null,
      created_at: nowIso,
    },
    {
      user_id: FRIEND_ID,
      email: 'friend@avora.com',
      full_name: 'Le Van Ban',
      phone: '0912345678',
      role_cd: '2',
      is_verified: true,
      is_deleted: false,
      refund_bank_cd: null,
      refund_account_number: null,
      refund_account_holder: null,
      created_at: nowIso,
    },
  ];

  db.m_hotel = [
    {
      hotel_id: HOTEL_ID,
      owner_id: VENDOR_ID,
      name: 'Avora Grand Resort',
      address: '123 Võ Nguyên Giáp, Đà Nẵng',
      star_rating: 5,
      star_quality: 5,
      is_deleted: false,
      m_hotel_image: [{ image_url: 'https://example.com/hotel.jpg', is_thumbnail: true, sort_order: 1 }],
    },
  ];

  db.m_room_type = [
    {
      room_type_id: ROOM_TYPE_ID,
      hotel_id: HOTEL_ID,
      type_name: 'Ocean Suite',
    },
  ];

  db.t_inventory = [
    {
      inventory_id: 'inv-1',
      room_type_id: ROOM_TYPE_ID,
      stay_date: '2026-12-20',
      total_rooms: 5,
      booked_rooms: 4,
    },
  ];

  db.t_booking = [
    {
      booking_id: BOOKING_1,
      user_id: HOST_ID,
      hotel_id: HOTEL_ID,
      total_amount: 1000000,
      guest_name: 'Nguyen Van Host',
      guest_phone: '0901234567',
      booking_status_cd: '201',
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      booking_id: BOOKING_2,
      user_id: HOST_ID,
      hotel_id: HOTEL_ID,
      total_amount: 900000,
      guest_name: 'Nguyen Van Host',
      guest_phone: '0901234567',
      booking_status_cd: '201',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago (>10m single TTL, <2h group TTL)
      updated_at: nowIso,
    },
    {
      booking_id: BOOKING_3,
      user_id: HOST_ID,
      hotel_id: HOTEL_ID,
      total_amount: 600000,
      guest_name: 'Nguyen Van Host',
      guest_phone: '0901234567',
      booking_status_cd: '201',
      created_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(), // 130 mins ago (>2h group TTL)
      updated_at: nowIso,
    },
    {
      booking_id: BOOKING_4,
      user_id: HOST_NO_BANK_ID,
      hotel_id: HOTEL_ID,
      total_amount: 400000,
      guest_name: 'Tran Thi Skip',
      guest_phone: '0909998887',
      booking_status_cd: '201',
      created_at: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
      updated_at: nowIso,
    },
  ];

  db.t_booking_detail = [
    { booking_detail_id: 'bd-1', booking_id: BOOKING_1, room_type_id: ROOM_TYPE_ID, check_in_date: '2026-12-20', check_out_date: '2026-12-21', quantity: 1, unit_price: 1000000 },
    { booking_detail_id: 'bd-2', booking_id: BOOKING_2, room_type_id: ROOM_TYPE_ID, check_in_date: '2026-12-20', check_out_date: '2026-12-21', quantity: 1, unit_price: 900000 },
    { booking_detail_id: 'bd-3', booking_id: BOOKING_3, room_type_id: ROOM_TYPE_ID, check_in_date: '2026-12-20', check_out_date: '2026-12-21', quantity: 1, unit_price: 600000 },
    { booking_detail_id: 'bd-4', booking_id: BOOKING_4, room_type_id: ROOM_TYPE_ID, check_in_date: '2026-12-20', check_out_date: '2026-12-21', quantity: 1, unit_price: 400000 },
  ];

  db.t_payment_sharing_group = [];
  db.t_payment_sharing_member = [];
  db.t_payment_transaction = [];
  db.t_refund_request = [];
  db.t_hotel_wallet = [];
  db.t_settlement = [];
  db.t_wallet_ledger = [];
};

class Query {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.filters = [];
    this.patchData = null;
    this.rows = null;
    this.mode = null;
  }
  select() { return this; }
  update(p) { this.op = 'update'; this.patchData = p; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.filters.push((r) => String(r[c]) !== String(v)); return this; }
  in(c, vs) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
  lt(c, v) { this.filters.push((r) => String(r[c]) < String(v)); return this; }
  gt(c, v) { this.filters.push((r) => String(r[c]) > String(v)); return this; }
  gte(c, v) { this.filters.push((r) => String(r[c]) >= String(v)); return this; }
  lte(c, v) { this.filters.push((r) => String(r[c]) <= String(v)); return this; }
  like(c, pat) {
    const prefix = String(pat).replace(/%$/, '');
    this.filters.push((r) => String(r[c] || '').startsWith(prefix));
    return this;
  }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  single() { this.mode = 'single'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }

  enrichRow(row) {
    if (!row) return row;
    const copy = { ...row };
    if (this.table === 't_booking') {
      copy.m_hotel = (db.m_hotel || []).find((h) => h.hotel_id === copy.hotel_id) || null;
      copy.t_booking_detail = (db.t_booking_detail || [])
        .filter((d) => d.booking_id === copy.booking_id)
        .map((d) => ({
          ...d,
          m_room_type: (db.m_room_type || []).find((rt) => rt.room_type_id === d.room_type_id) || null,
        }));
      copy.t_payment_transaction = (db.t_payment_transaction || []).filter(
        (t) => t.booking_id === copy.booking_id
      );
      copy.t_payment_sharing_group = (db.t_payment_sharing_group || []).filter(
        (g) => g.booking_id === copy.booking_id
      );
    }
    return copy;
  }

  exec() {
    const table = (db[this.table] = db[this.table] || []);
    let data;
    if (this.op === 'insert') {
      const inserted = this.rows.map((r) => {
        const item = { ...r };
        if (this.table === 't_payment_sharing_group' && !item.group_id) item.group_id = crypto.randomUUID();
        if (this.table === 't_payment_sharing_member' && !item.member_id) item.member_id = crypto.randomUUID();
        if (this.table === 't_payment_transaction' && !item.transaction_id) item.transaction_id = crypto.randomUUID();
        if (this.table === 't_refund_request' && !item.refund_id) item.refund_id = crypto.randomUUID();
        table.push(item);
        return { ...item };
      });
      data = inserted;
    } else if (this.op === 'update') {
      const matched = table.filter((r) => this.filters.every((f) => f(r)));
      matched.forEach((r) => Object.assign(r, this.patchData));
      data = matched.map((r) => this.enrichRow(r));
    } else if (this.op === 'delete') {
      const keep = [];
      const removed = [];
      table.forEach((r) => {
        if (this.filters.every((f) => f(r))) removed.push(r);
        else keep.push(r);
      });
      db[this.table] = keep;
      data = removed;
    } else {
      data = table.filter((r) => this.filters.every((f) => f(r))).map((r) => this.enrichRow(r));
    }

    if (this.mode === 'maybe') return { data: data[0] || null, error: null };
    if (this.mode === 'single') {
      if (!data[0]) return { data: null, error: { message: 'Row not found' } };
      return { data: data[0], error: null };
    }
    return { data, error: null };
  }
}

/**
 * In-memory simulation of PostgreSQL RPC `fn_process_sepay_group_payment`
 * matching `backend/sql/group_payment_setup.sql`.
 */
const simulateGroupPaymentRpc = ({ p_payment_code, p_transfer_amount }) => {
  const code = String(p_payment_code || '').toUpperCase();
  const amount = Number(p_transfer_amount || 0);
  const nowIso = new Date().toISOString();

  const member = db.t_payment_sharing_member.find((m) => String(m.payment_code).toUpperCase() === code);
  if (!member) return { result: 'NOT_FOUND' };
  if (member.is_paid) {
    return { result: 'ALREADY_PAID', group_id: member.group_id, member_id: member.member_id };
  }

  const group = db.t_payment_sharing_group.find((g) => g.group_id === member.group_id);
  if (!group) return { result: 'GROUP_NOT_FOUND' };

  const booking = db.t_booking.find((b) => b.booking_id === group.booking_id);
  if (!booking) return { result: 'BOOKING_NOT_FOUND' };

  if (amount < Number(member.amount_allocated)) {
    return {
      result: 'INSUFFICIENT_AMOUNT',
      booking_id: booking.booking_id,
      group_id: group.group_id,
      member_id: member.member_id,
      expected: Number(member.amount_allocated),
      received: amount,
    };
  }

  const txId = crypto.randomUUID();
  db.t_payment_transaction.push({
    transaction_id: txId,
    booking_id: booking.booking_id,
    payer_user_id: member.user_id || booking.user_id,
    amount_paid: amount,
    payment_method_cd: '1',
    gateway_ref_id: code,
    paid_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  });

  member.is_paid = true;
  member.amount_paid = amount;
  member.paid_at = nowIso;
  member.transaction_id = txId;
  member.updated_at = nowIso;

  const newCollected = Number(group.total_collected || 0) + amount;
  group.total_collected = newCollected;
  group.updated_at = nowIso;

  if (newCollected >= Number(group.total_required)) {
    group.share_status_cd = '2'; // CMP
    booking.booking_status_cd = '202'; // CFM
    booking.updated_at = nowIso;

    db.t_settlement.push({
      settlement_id: crypto.randomUUID(),
      booking_id: booking.booking_id,
      hotel_id: booking.hotel_id,
      total_amount_paid: booking.total_amount,
      settlement_status_cd: '1',
    });
    db.t_wallet_ledger.push({
      ledger_id: crypto.randomUUID(),
      amount_change: booking.total_amount,
      reference_id: booking.booking_id,
    });

    return {
      result: 'GROUP_COMPLETED',
      booking_id: booking.booking_id,
      group_id: group.group_id,
      member_id: member.member_id,
      total_collected: newCollected,
      total_required: group.total_required,
    };
  }

  return {
    result: 'MEMBER_PAID',
    booking_id: booking.booking_id,
    group_id: group.group_id,
    member_id: member.member_id,
    total_collected: newCollected,
    total_required: group.total_required,
  };
};

const fakeSupabase = {
  from: (table) => new Query(table),
  rpc: async (fnName, params) => {
    if (fnName === 'fn_process_sepay_group_payment') {
      return { data: simulateGroupPaymentRpc(params), error: null };
    }
    return { data: null, error: { message: `Unknown RPC ${fnName}` } };
  },
};

const supabaseModulePath = require.resolve(path.join(backendRoot, 'src/config/supabaseClient.js'));
require.cache[supabaseModulePath] = {
  id: supabaseModulePath,
  filename: supabaseModulePath,
  loaded: true,
  exports: fakeSupabase,
};

const authService = require(path.join(backendRoot, 'src/features/auth/auth.service.js'));
const paymentSharingService = require(path.join(backendRoot, 'src/features/payment_sharing/payment_sharing.service.js'));
const paymentService = require(path.join(backendRoot, 'src/features/payments/payment.service.js'));
const { cancelExpiredPendingBookings } = require(path.join(backendRoot, 'src/features/bookings/bookingExpiryCron.js'));

let passed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
};

(async () => {
  console.log('\n=== AVORA Group Payment & Refund Bank Verification ===\n');
  resetDb();

  // ─── 1. Customer Refund Bank Account (m_user) ─────────────────────────────
  await test('1.1 Initial profile has NULL refund bank fields', async () => {
    const profile = await authService.getUserProfile(HOST_ID);
    assert.strictEqual(profile.refund_bank_cd, null);
    assert.strictEqual(profile.refund_account_number, null);
    assert.strictEqual(profile.refund_account_holder, null);
  });

  await test('1.2 Rejects invalid refund bank code not in m_system_code (BANK_CD)', async () => {
    await assert.rejects(
      () =>
        authService.updateUserProfile(HOST_ID, {
          refundBankCd: '999',
          refundAccountNumber: '0123456789',
          refundAccountHolder: 'NGUYEN VAN HOST',
        }),
      (err) => err.statusCode === 400
    );
  });

  await test('1.3 Saves valid refund bank account in m_user and returns enriched bank info', async () => {
    const updated = await authService.updateUserProfile(HOST_ID, {
      refundBankCd: '301',
      refundAccountNumber: '0071001234567',
      refundAccountHolder: 'nguyen van host',
    });
    assert.strictEqual(updated.refund_bank_cd, '301');
    assert.strictEqual(updated.refund_account_number, '0071001234567');
    assert.strictEqual(updated.refund_account_holder, 'NGUYEN VAN HOST');
    assert.strictEqual(updated.refund_bank_code_name, 'VCB');
  });

  // ─── 2. Group Payment Setup & Validation ──────────────────────────────────
  const hostUser = { user_id: HOST_ID, full_name: 'Nguyen Van Host', phone: '0901234567' };

  await test('2.1 Rejects member count < 2 or > 10', async () => {
    await assert.rejects(
      () =>
        paymentSharingService.createOrUpdateSharingGroup(
          BOOKING_1,
          { member_count: 1 },
          hostUser
        ),
      (err) => err.statusCode === 400
    );
    await assert.rejects(
      () =>
        paymentSharingService.createOrUpdateSharingGroup(
          BOOKING_1,
          { member_count: 11 },
          hostUser
        ),
      (err) => err.statusCode === 400
    );
  });

  await test('2.2 Rejects custom split where sum !== total_amount or member < 10,000 VND', async () => {
    await assert.rejects(
      () =>
        paymentSharingService.createOrUpdateSharingGroup(
          BOOKING_1,
          {
            members: [
              { member_name: 'A', amount_assigned: 500000 },
              { member_name: 'B', amount_assigned: 400000 },
            ],
          },
          hostUser
        ),
      (err) => err.statusCode === 400 && err.code === 'TOTAL_MISMATCH'
    );

    await assert.rejects(
      () =>
        paymentSharingService.createOrUpdateSharingGroup(
          BOOKING_1,
          {
            members: [
              { member_name: 'A', amount_assigned: 995000 },
              { member_name: 'B', amount_assigned: 5000 },
            ],
          },
          hostUser
        ),
      (err) => err.statusCode === 400 && err.code === 'MIN_AMOUNT_VIOLATION'
    );
  });

  let createdGroup = null;
  await test('2.3 Creates Equal Split group (3 members for 1,000,000 VND -> 333,334 + 333,333 + 333,333) with 2-hour hold', async () => {
    createdGroup = await paymentSharingService.createOrUpdateSharingGroup(
      BOOKING_1,
      { member_count: 3 },
      hostUser
    );
    assert.ok(createdGroup.group_id);
    assert.ok(createdGroup.invite_link_hash);
    assert.strictEqual(createdGroup.total_required, 1000000);
    assert.strictEqual(createdGroup.total_collected, 0);
    assert.strictEqual(createdGroup.members.length, 3);
    assert.strictEqual(
      createdGroup.members.reduce((s, m) => s + m.amount_assigned, 0),
      1000000
    );
    assert.ok(createdGroup.members.every((m) => /^AVRGP\d{8}$/.test(m.payment_code)));
    assert.ok(createdGroup.remaining_seconds > 7000 && createdGroup.remaining_seconds <= 7200);
  });

  await test('2.4 Host can edit split to Custom Split (400k + 350k + 250k) while total_collected === 0', async () => {
    createdGroup = await paymentSharingService.createOrUpdateSharingGroup(
      BOOKING_1,
      {
        members: [
          { member_name: 'Host Nguyen', phone: '0901234567', amount_assigned: 400000 },
          { member_name: 'Ban Minh', phone: '0911111111', amount_assigned: 350000 },
          { member_name: 'Thành viên #3', phone: '', amount_assigned: 250000 },
        ],
      },
      hostUser
    );
    assert.strictEqual(createdGroup.members.length, 3);
    assert.deepStrictEqual(
      createdGroup.members.map((m) => m.amount_assigned),
      [400000, 350000, 250000]
    );
  });

  // ─── 3. Public Invite Link & Friend Claiming Slot ─────────────────────────
  await test('3.1 Unauthenticated friend can view group room by invite_link_hash and claim slot #3', async () => {
    const publicView = await paymentSharingService.getGroupByInviteHash(createdGroup.invite_link_hash);
    assert.strictEqual(publicView.group_id, createdGroup.group_id);
    const slot3 = publicView.members[2];

    const afterClaim = await paymentSharingService.claimMemberSlot(
      createdGroup.invite_link_hash,
      slot3.member_id,
      { member_name: 'Lê Hoàng Nam', phone: '0988776655' }
    );
    const updatedSlot3 = afterClaim.members.find((m) => m.member_id === slot3.member_id);
    assert.strictEqual(updatedSlot3.member_name, 'Lê Hoàng Nam');
    assert.strictEqual(updatedSlot3.phone, '0988776655');
  });

  // ─── 4. SePay Webhook for AVRGP Member Payments ───────────────────────────
  const authHeader = `Apikey ${process.env.SEPAY_API_KEY}`;

  await test('4.1 Webhook processes Member #1 payment (400,000 VND) -> MEMBER_PAID & locks split editing', async () => {
    const member1 = createdGroup.members[0];
    const res = await paymentService.processWebhook({
      id: 'sepay-gp-1',
      transferType: 'in',
      transferAmount: 400000,
      content: `Chuyen khoan ${member1.payment_code} thanh toan nhom`,
    });
    assert.strictEqual(res.result, 'MEMBER_PAID');
    assert.strictEqual(res.total_collected, 400000);

    // Duplicate webhook is idempotent
    const dupRes = await paymentService.processWebhook({
      id: 'sepay-gp-1',
      transferType: 'in',
      transferAmount: 400000,
      content: `Chuyen khoan ${member1.payment_code} thanh toan nhom`,
    });
    assert.strictEqual(dupRes.result, 'ALREADY_PAID');

    // Editing split is now locked because total_collected > 0
    await assert.rejects(
      () =>
        paymentSharingService.createOrUpdateSharingGroup(
          BOOKING_1,
          { member_count: 2 },
          hostUser
        ),
      (err) => err.statusCode === 409 && err.code === 'CANNOT_EDIT_AFTER_PAYMENT'
    );
  });

  await test('4.2 Host uses "Pay Remaining" (Đóng nốt phần còn thiếu) to consolidate unpaid slots #2 & #3 (600,000 VND) into 1 QR', async () => {
    const consolidated = await paymentSharingService.createHostPayRemaining(
      createdGroup.group_id,
      hostUser
    );
    assert.strictEqual(consolidated.remaining_slot.amount_assigned, 600000);
    assert.strictEqual(consolidated.group.members.length, 2); // 1 paid (400k) + 1 consolidated unpaid (600k)

    // Webhook pays the consolidated 600,000 VND slot -> GROUP_COMPLETED + Booking CFM + Wallet Settlement!
    const res = await paymentService.processWebhook({
      id: 'sepay-gp-2',
      transferType: 'in',
      transferAmount: 600000,
      content: `TT not ${consolidated.remaining_slot.payment_code}`,
    });
    assert.strictEqual(res.result, 'GROUP_COMPLETED');
    assert.strictEqual(res.total_collected, 1000000);

    const booking1 = db.t_booking.find((b) => b.booking_id === BOOKING_1);
    assert.strictEqual(booking1.booking_status_cd, '202'); // CFM
    assert.strictEqual(db.t_settlement.length, 1);
    assert.strictEqual(db.t_wallet_ledger.length, 1);
  });

  // ─── 5. 2-Hour Expiry Cron & Consolidated Refund to Host ──────────────────
  await test('5.1 Expiry Cron keeps active 2-hour group booking (30 mins old) alive, expires >2h group bookings, and creates 1 consolidated refund to Host', async () => {
    // Setup active group on BOOKING_2 (created 30 mins ago, expires in +90 mins)
    const activeFutureIso = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    db.t_payment_sharing_group.push({
      group_id: 'grp-active-2h',
      booking_id: BOOKING_2,
      host_user_id: HOST_ID,
      total_required: 900000,
      total_collected: 300000,
      share_status_cd: '1', // PND
      invite_link_hash: 'active-hash-2h',
      expires_at: activeFutureIso,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Setup expired group on BOOKING_3 (Host has VCB refund bank configured, 2 members paid 200k + 200k = 400k out of 600k)
    const expiredIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    db.t_payment_sharing_group.push({
      group_id: 'grp-expired-with-bank',
      booking_id: BOOKING_3,
      host_user_id: HOST_ID,
      total_required: 600000,
      total_collected: 400000,
      share_status_cd: '1', // PND
      invite_link_hash: 'exp-hash-1',
      expires_at: expiredIso,
      created_at: expiredIso,
      updated_at: expiredIso,
    });
    db.t_payment_transaction.push(
      { transaction_id: 'tx-exp-1', booking_id: BOOKING_3, payer_user_id: HOST_ID, amount_paid: 200000, gateway_ref_id: 'AVRGP90000001', paid_at: expiredIso },
      { transaction_id: 'tx-exp-2', booking_id: BOOKING_3, payer_user_id: null, amount_paid: 200000, gateway_ref_id: 'AVRGP90000002', paid_at: expiredIso }
    );

    // Setup expired group on BOOKING_4 (Host skipped refund bank modal -> NULL refund bank, paid 200k out of 400k)
    db.t_payment_sharing_group.push({
      group_id: 'grp-expired-no-bank',
      booking_id: BOOKING_4,
      host_user_id: HOST_NO_BANK_ID,
      total_required: 400000,
      total_collected: 200000,
      share_status_cd: '1', // PND
      invite_link_hash: 'exp-hash-2',
      expires_at: expiredIso,
      created_at: expiredIso,
      updated_at: expiredIso,
    });
    db.t_payment_transaction.push(
      { transaction_id: 'tx-exp-3', booking_id: BOOKING_4, payer_user_id: HOST_NO_BANK_ID, amount_paid: 200000, gateway_ref_id: 'AVRGP90000003', paid_at: expiredIso }
    );

    await cancelExpiredPendingBookings();

    // BOOKING_2 (30 mins old, active 2h group) MUST still be PND ('201')
    const b2 = db.t_booking.find((b) => b.booking_id === BOOKING_2);
    assert.strictEqual(b2.booking_status_cd, '201');
    const g2 = db.t_payment_sharing_group.find((g) => g.group_id === 'grp-active-2h');
    assert.strictEqual(g2.share_status_cd, '1');

    // BOOKING_3 & BOOKING_4 are now CAN ('203') and their groups are EXP ('3')
    const b3 = db.t_booking.find((b) => b.booking_id === BOOKING_3);
    const b4 = db.t_booking.find((b) => b.booking_id === BOOKING_4);
    assert.strictEqual(b3.booking_status_cd, '203');
    assert.strictEqual(b4.booking_status_cd, '203');

    // Verify 1 consolidated refund created for BOOKING_3 with Host's VCB bank account
    const refund3 = db.t_refund_request.find((r) => r.booking_id === BOOKING_3);
    assert.ok(refund3, 'Expected consolidated refund request for BOOKING_3');
    assert.strictEqual(refund3.refund_amount, 400000);
    assert.ok(refund3.reason.includes('0071001234567'), 'Expected Host account number in refund reason');
    assert.ok(refund3.reason.includes('NGUYEN VAN HOST'), 'Expected Host account holder in refund reason');

    // Verify 1 consolidated refund created for BOOKING_4 with Support Ticket notice when Host has no bank
    const refund4 = db.t_refund_request.find((r) => r.booking_id === BOOKING_4);
    assert.ok(refund4, 'Expected consolidated refund request for BOOKING_4');
    assert.strictEqual(refund4.refund_amount, 200000);
    assert.ok(
      refund4.reason.includes('Support Ticket'),
      'Expected Support Ticket verification note when Host skipped refund bank setup'
    );
  });

  console.log(`\nAll ${passed}/10 test suites passed!\n`);
})();
