'use strict';

/**
 * AVORA Milestone 1 Adversarial Stress Test Suite
 * Archetype: Empirical Challenger
 * Verifies Conflict Resolution Matrix, Booking Creation, Hotel Scoping,
 * and reproduces edge-case bugs.
 */

const assert = require('assert');
const path = require('path');

// Setup mock database store
const createMockDatabase = () => {
  const store = {
    m_hotel: [
      {
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        name: 'Avora Ocean Resort Đà Nẵng',
        description: 'Khách sạn ven biển',
        address: '123 Võ Nguyên Giáp, Đà Nẵng',
        city_id: 'city-1',
        district_id: 'dist-1',
        ward_id: 'ward-1',
        star_rating: 5,
        star_quality: 5,
        hotel_status: 'ACTIVE',
        is_deleted: false,
        owner_id: 'vendor-user-1',
      },
      {
        hotel_id: '11111111-2222-3333-4444-555555555555',
        name: 'Avora Mountain Retreat Sapa',
        description: 'Khu nghỉ dưỡng núi',
        address: '456 Fansipan, Sa Pa',
        city_id: 'city-2',
        district_id: 'dist-2',
        ward_id: 'ward-2',
        star_rating: 4,
        star_quality: 4,
        hotel_status: 'ACTIVE',
        is_deleted: false,
        owner_id: 'vendor-user-2',
      },
    ],
    m_room_type: [
      {
        room_type_id: 'rt-deluxe-01',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        type_name: 'Phòng Deluxe Hướng Biển',
        default_price: 1000000,
        bed_type: 'King Bed',
        room_size: '35m2',
        max_adults: 2,
        max_children: 1,
        is_deleted: false,
      },
      {
        room_type_id: 'rt-suite-02',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        type_name: 'Phòng Suite Tổng Thống',
        default_price: 3000000,
        bed_type: 'King Bed',
        room_size: '70m2',
        max_adults: 4,
        max_children: 2,
        is_deleted: false,
      },
    ],
    m_room: [
      {
        room_id: 'rm-101',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-deluxe-01',
        room_number: '101',
        floor: '1',
        status_cd: '1',
        is_deleted: false,
      },
      {
        room_id: 'rm-102',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-deluxe-01',
        room_number: '102',
        floor: '1',
        status_cd: '1',
        is_deleted: false,
      },
      {
        room_id: 'rm-201',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-suite-02',
        room_number: '201',
        floor: '2',
        status_cd: '1',
        is_deleted: false,
      },
    ],
    t_inventory: [
      {
        room_type_id: 'rt-deluxe-01',
        target_date: '2026-11-10',
        available_rooms: 10,
        locked_rooms: 0,
        current_price: 1000000,
        version: 1,
      },
      {
        room_type_id: 'rt-suite-02',
        target_date: '2026-11-10',
        available_rooms: 5,
        locked_rooms: 0,
        current_price: 3000000,
        version: 1,
      },
    ],
    m_coupon: [],
    t_booking: [],
    t_booking_detail: [],
    m_room_facility_map: [],
    m_hotel_image: [],
    m_cancellation_policy: [
      {
        cancellation_policy_id: 'policy-01',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        penalty_rate: 0,
      },
    ],
    m_system_code: [
      { business_cd: 'BOOKING_STS', code_cd: '1', code_name: 'PND', sort_no: 1 },
      { business_cd: 'BOOKING_STS', code_cd: '2', code_name: 'CFM', sort_no: 2 },
      { business_cd: 'BOOKING_STS', code_cd: '3', code_name: 'CAN', sort_no: 3 },
      { business_cd: 'USER_ACTION', code_cd: '10', code_name: 'BOK', sort_no: 1 },
      { business_cd: 'ROOM_STS', code_cd: '1', code_name: 'AVL', sort_no: 1 },
      { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'CUS', sort_no: 1 },
    ],
    h_user_behavior: [],
  };

  const createQuery = (tableName) => {
    let rows = store[tableName] ? [...store[tableName]] : [];
    let singleMode = false;
    let maybeSingleMode = false;
    let countExact = false;
    let headOnly = false;

    const builder = {
      select: (fields, options = {}) => {
        if (options.count === 'exact') countExact = true;
        if (options.head) headOnly = true;
        return builder;
      },
      eq: (field, val) => {
        rows = rows.filter((r) => String(r[field]) === String(val));
        return builder;
      },
      neq: (field, val) => {
        rows = rows.filter((r) => String(r[field]) !== String(val));
        return builder;
      },
      in: (field, vals) => {
        const set = new Set(vals.map(String));
        rows = rows.filter((r) => set.has(String(r[field])));
        return builder;
      },
      ilike: (field, pattern) => {
        const regexStr = pattern.replace(/%/g, '.*');
        const re = new RegExp(`^${regexStr}$`, 'i');
        rows = rows.filter((r) => re.test(String(r[field] || '')));
        return builder;
      },
      gte: (field, val) => {
        rows = rows.filter((r) => r[field] && r[field] >= val);
        return builder;
      },
      gt: (field, val) => {
        rows = rows.filter((r) => r[field] && r[field] > val);
        return builder;
      },
      lt: (field, val) => {
        rows = rows.filter((r) => r[field] && r[field] < val);
        return builder;
      },
      lte: (field, val) => {
        rows = rows.filter((r) => r[field] && r[field] <= val);
        return builder;
      },
      or: (conditionStr) => {
        if (conditionStr.includes('is_deleted')) {
          rows = rows.filter((r) => r.is_deleted === false || r.is_deleted === null || r.is_deleted === undefined);
        }
        return builder;
      },
      order: (field, { ascending = true } = {}) => {
        rows.sort((a, b) => {
          if (a[field] < b[field]) return ascending ? -1 : 1;
          if (a[field] > b[field]) return ascending ? 1 : -1;
          return 0;
        });
        return builder;
      },
      limit: (n) => {
        rows = rows.slice(0, n);
        return builder;
      },
      single: () => {
        singleMode = true;
        return builder;
      },
      maybeSingle: () => {
        maybeSingleMode = true;
        return builder;
      },
      insert: (record) => {
        const rawItems = Array.isArray(record) ? record : [record]; const items = [];
        rawItems.forEach((item) => {
          const cloned = { ...item };
          if (tableName === 't_booking' && !cloned.booking_id) {
            cloned.booking_id = `bk-${Math.random().toString(36).substring(2, 10)}`;
            cloned.created_at = cloned.created_at || new Date().toISOString();
          }
          if (tableName === 't_booking_detail' && !cloned.booking_detail_id) {
            cloned.booking_detail_id = `bkd-${Math.random().toString(36).substring(2, 10)}`;
          }
          if (tableName === 'm_coupon' && !cloned.coupon_id) {
            cloned.coupon_id = `cpn-${Math.random().toString(36).substring(2, 10)}`;
          }
          store[tableName].push(cloned); items.push(cloned);
        });
        rows = items;
        return builder;
      },
      update: (updates) => {
        rows.forEach((r) => Object.assign(r, updates));
        return builder;
      },
      delete: () => {
        return builder;
      },
      then: (resolve) => {
        if (headOnly) {
          resolve({ count: rows.length, data: null, error: null });
        } else if (singleMode) {
          if (rows.length === 0) resolve({ data: null, error: new Error('Record not found') });
          else resolve({ data: rows[0], error: null });
        } else if (maybeSingleMode) {
          resolve({ data: rows[0] || null, error: null });
        } else {
          resolve({ data: rows, count: countExact ? rows.length : undefined, error: null });
        }
      },
    };

    return builder;
  };

  return {
    from: (table) => createQuery(table),
    _store: store,
  };
};

// Mock require.cache for supabaseClient so booking.service gets mockDb
const mockDb = createMockDatabase();
const clientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: mockDb,
};

const bookingService = require('../backend/src/features/bookings/booking.service');

let testResults = [];

const recordTest = (suite, name, passed, details = '') => {
  testResults.push({ suite, name, passed, details });
  const tag = passed ? '[PASS]' : '[FAIL]';
  console.log(`${tag} [${suite}] ${name}${details ? ' - ' + details : ''}`);
};

const HOTEL1_ID = 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0';
const CHECK_IN = '2026-11-10';
const CHECK_OUT = '2026-11-11';

const resetCoupons = (coupons) => {
  mockDb._store.m_coupon = coupons.map((c, i) => ({
    coupon_id: c.coupon_id || `cpn-${i + 1}`,
    code: c.code,
    discount_type: c.discount_type,
    discount_value: c.discount_value,
    max_discount_amount: c.max_discount_amount !== undefined ? c.max_discount_amount : null,
    min_order_amount: c.min_order_amount !== undefined ? c.min_order_amount : null,
    usage_limit: c.usage_limit !== undefined ? c.usage_limit : null,
    valid_from: c.valid_from || '2026-11-01T00:00:00.000Z',
    valid_to: c.valid_to || '2026-11-30T23:59:59.000Z',
    is_deleted: c.is_deleted || false,
    created_at: c.created_at || new Date().toISOString(),
  }));
};

const runAllAdversarialTests = async () => {
  console.log('========================================================================');
  console.log(' AVORA ADVERSARIAL STRESS TEST: CONFLICT MATRIX & BOOKING ENGINE');
  console.log('========================================================================\n');

  // ========================================================================
  // SUITE 1: Conflict Resolution Matrix in calculatePricing
  // ========================================================================
  console.log('--- SUITE 1: CONFLICT RESOLUTION MATRIX (calculatePricing) ---');

  // Test 1.1: Flash Sale higher than manual coupon -> Flash Sale applied
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-50',
        code: 'FS_E8B1D9C2_FLASH50',
        discount_type: 'FLASH_PERCENT',
        discount_value: 50,
        max_discount_amount: 500000, // 50% of 1M = 500,000
      },
      {
        coupon_id: 'cpn-manual-100k',
        code: 'WELCOME100K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100000, // 100,000
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'WELCOME100K',
    });

    assert.strictEqual(pricing.subtotal, 1000000);
    assert.strictEqual(pricing.discount_amount, 500000, 'Discount must match Flash Sale (500k)');
    assert.strictEqual(pricing.total_amount, 500000, 'Total must equal subtotal - 500k');
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-fs-50');
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    assert.strictEqual(pricing.promotion_details.flash_sale_discount, 500000);
    assert.strictEqual(pricing.promotion_details.manual_coupon_discount, 100000);
    assert.ok(pricing.promotion_details.message.includes('có lợi hơn'));
    recordTest('Suite 1', '1.1: Flash Sale higher than manual coupon -> Flash Sale applied', true);
  } catch (err) {
    recordTest('Suite 1', '1.1: Flash Sale higher than manual coupon -> Flash Sale applied', false, err.message);
  }

  // Test 1.2: Manual coupon higher than Flash Sale -> Manual coupon replaces Flash Sale
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-10',
        code: 'FS_E8B1D9C2_FLASH10',
        discount_type: 'FLASH_PERCENT',
        discount_value: 10, // 10% of 1M = 100,000
      },
      {
        coupon_id: 'cpn-manual-300k',
        code: 'AVORA300K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 300000, // 300,000
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA300K',
    });

    assert.strictEqual(pricing.discount_amount, 300000, 'Discount must match manual coupon (300k)');
    assert.strictEqual(pricing.total_amount, 700000, 'Total must be 700,000');
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-manual-300k');
    assert.strictEqual(pricing.promotion_details.applied_type, 'MANUAL_COUPON');
    assert.ok(pricing.promotion_details.message.includes('thay thế Flash Sale'));
    recordTest('Suite 1', '1.2: Manual coupon higher than Flash Sale -> replaces Flash Sale', true);
  } catch (err) {
    recordTest('Suite 1', '1.2: Manual coupon higher than Flash Sale -> replaces Flash Sale', false, err.message);
  }

  // Test 1.3: Equal discount value -> Tie-breaking behavior
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-20',
        code: 'FS_E8B1D9C2_FLASH20',
        discount_type: 'FLASH_PERCENT',
        discount_value: 20, // 20% of 1M = 200,000
      },
      {
        coupon_id: 'cpn-manual-200k',
        code: 'TIEMATCH200K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 200000, // 200,000
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'TIEMATCH200K',
    });

    assert.strictEqual(pricing.discount_amount, 200000);
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-fs-20');
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    // Note: Checking tie-breaker message logic
    const message = pricing.promotion_details.message;
    const hasMisleadingPhrase = message.includes('200.000 đ) có lợi hơn mã TIEMATCH200K (-200.000 đ)');
    recordTest('Suite 1', '1.3: Equal discount value -> Deterministic tie-break keeps Flash Sale', true,
      hasMisleadingPhrase ? 'NOTE: couponMessage says 200k "có lợi hơn" 200k (misleading phrasing)' : 'Clean message');
  } catch (err) {
    recordTest('Suite 1', '1.3: Equal discount value -> Deterministic tie-break keeps Flash Sale', false, err.message);
  }

  // Test 1.4: Manual coupon identical code to active Flash Sale
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-20',
        code: 'FS_E8B1D9C2_FLASH20',
        discount_type: 'FLASH_PERCENT',
        discount_value: 20,
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: '  FS_E8B1D9C2_FLASH20  ', // with whitespace
    });

    assert.strictEqual(pricing.discount_amount, 200000);
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-fs-20');
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    recordTest('Suite 1', '1.4: Manual coupon with same code as active Flash Sale -> single application', true);
  } catch (err) {
    recordTest('Suite 1', '1.4: Manual coupon with same code as active Flash Sale -> single application', false, err.message);
  }

  // Test 1.5: Automatic Flash Sale applied when no manual coupon provided
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-25',
        code: 'FS_E8B1D9C2_FLASH25',
        discount_type: 'FLASH_PERCENT',
        discount_value: 25, // 25% of 1M = 250,000
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    assert.strictEqual(pricing.discount_amount, 250000);
    assert.strictEqual(pricing.total_amount, 750000);
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-fs-25');
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    recordTest('Suite 1', '1.5: Auto-apply Flash Sale during golden hours when coupon_code omitted', true);
  } catch (err) {
    recordTest('Suite 1', '1.5: Auto-apply Flash Sale during golden hours when coupon_code omitted', false, err.message);
  }

  // Test 1.6: Subtotal < discount_amount -> discount clamped to subtotal, total_amount = 0
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-mega',
        code: 'MEGA5000K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 5000000, // 5M > 1M subtotal
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'MEGA5000K',
    });

    assert.strictEqual(pricing.subtotal, 1000000);
    assert.strictEqual(pricing.discount_amount, 1000000, 'Discount must be clamped to subtotal');
    assert.strictEqual(pricing.total_amount, 0, 'Total amount must be exactly 0, not negative');
    recordTest('Suite 1', '1.6: Oversized discount is clamped to subtotal (total_amount = 0)', true);
  } catch (err) {
    recordTest('Suite 1', '1.6: Oversized discount is clamped to subtotal (total_amount = 0)', false, err.message);
  }

  // Test 1.7: Multiple flash sales in golden hours -> Picks highest discount
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-low',
        code: 'FS_E8B1D9C2_LOW',
        discount_type: 'FLASH_PERCENT',
        discount_value: 10,
        created_at: '2026-11-04T12:00:00Z',
      },
      {
        coupon_id: 'cpn-fs-high',
        code: 'FS_E8B1D9C2_HIGH',
        discount_type: 'FLASH_PERCENT',
        discount_value: 40,
        created_at: '2026-11-04T11:00:00Z',
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    assert.strictEqual(pricing.discount_amount, 400000, 'Must pick the 40% discount over 10%');
    assert.strictEqual(pricing.coupon.coupon_id, 'cpn-fs-high');
    recordTest('Suite 1', '1.7: Multiple golden hour flash sales -> Selects highest discount', true);
  } catch (err) {
    recordTest('Suite 1', '1.7: Multiple golden hour flash sales -> Selects highest discount', false, err.message);
  }

  // ========================================================================
  // SUITE 2: Multi-Tenant Hotel Scoping & Soft-Delete Isolation
  // ========================================================================
  console.log('\n--- SUITE 2: MULTI-TENANT HOTEL SCOPING & STATUS SECURITY ---');

  // Test 2.1: Foreign hotel Flash Sale code is strictly blocked
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-hotel2',
        code: 'FS_11111111_SALE50', // Belongs to Hotel 2 (Sapa)
        discount_type: 'FLASH_PERCENT',
        discount_value: 50,
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID, // Booking Hotel 1 (Đà Nẵng)
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'FS_11111111_SALE50',
    });

    assert.strictEqual(pricing.discount_amount, 0, 'Foreign flash sale must give 0 discount');
    assert.strictEqual(pricing.coupon, null);
    assert.ok(pricing.coupon_message.includes('thuộc về khách sạn khác'));
    recordTest('Suite 2', '2.1: Foreign hotel Flash Sale code strictly blocked with error message', true);
  } catch (err) {
    recordTest('Suite 2', '2.1: Foreign hotel Flash Sale code strictly blocked with error message', false, err.message);
  }

  // Test 2.2: Soft-deleted Flash Sale is never auto-applied
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-deleted',
        code: 'FS_E8B1D9C2_DELETED',
        discount_type: 'FLASH_PERCENT',
        discount_value: 50,
        is_deleted: true,
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    assert.strictEqual(pricing.discount_amount, 0, 'Soft-deleted Flash Sale must not be applied');
    assert.strictEqual(pricing.coupon, null);
    recordTest('Suite 2', '2.2: Soft-deleted Flash Sale is never auto-applied', true);
  } catch (err) {
    recordTest('Suite 2', '2.2: Soft-deleted Flash Sale is never auto-applied', false, err.message);
  }

  // Test 2.3: Soft-deleted manual coupon is rejected
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-deleted-manual',
        code: 'DELCOUPON',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100000,
        is_deleted: true,
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'DELCOUPON',
    });

    assert.strictEqual(pricing.discount_amount, 0);
    assert.strictEqual(pricing.coupon, null);
    assert.ok(pricing.coupon_message.includes('không tồn tại'));
    recordTest('Suite 2', '2.3: Soft-deleted manual coupon rejected as non-existent', true);
  } catch (err) {
    recordTest('Suite 2', '2.3: Soft-deleted manual coupon rejected as non-existent', false, err.message);
  }

  // Test 2.4: Golden hour boundary (expired coupon)
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-expired',
        code: 'FS_E8B1D9C2_EXPIRED',
        discount_type: 'FLASH_PERCENT',
        discount_value: 30,
        valid_from: '2026-10-01T00:00:00Z',
        valid_to: '2026-10-15T00:00:00Z', // in the past
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    assert.strictEqual(pricing.discount_amount, 0, 'Expired flash sale must not apply');
    assert.strictEqual(pricing.coupon, null);
    recordTest('Suite 2', '2.4: Expired Flash Sale past valid_to is not applied', true);
  } catch (err) {
    recordTest('Suite 2', '2.4: Expired Flash Sale past valid_to is not applied', false, err.message);
  }

  // Test 2.5: Order below min_order_amount
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-manual-minorder',
        code: 'MINORDER2M',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 200000,
        min_order_amount: 2000000, // Requires 2M, but room is 1M
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'MINORDER2M',
    });

    assert.strictEqual(pricing.discount_amount, 0);
    assert.strictEqual(pricing.coupon, null);
    assert.ok(pricing.coupon_message.includes('Đơn hàng tối thiểu'));
    recordTest('Suite 2', '2.5: Subtotal below min_order_amount rejected with clear message', true);
  } catch (err) {
    recordTest('Suite 2', '2.5: Subtotal below min_order_amount rejected with clear message', false, err.message);
  }

  // ========================================================================
  // SUITE 3: Booking Persistence & Financial Integrity (createBooking)
  // ========================================================================
  console.log('\n--- SUITE 3: BOOKING CREATION & FINANCIAL INTEGRITY (createBooking) ---');

  // Test 3.1: createBooking with Flash Sale higher than manual coupon
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-booking',
        code: 'FS_E8B1D9C2_WINNER',
        discount_type: 'FLASH_PERCENT',
        discount_value: 30, // 30% of 1M = 300k
      },
      {
        coupon_id: 'cpn-manual-loser',
        code: 'LOSER100K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100000,
      },
    ]);

    const currentUser = { user_id: 'user-guest-01', role_cd: '1' };
    const booking = await bookingService.createBooking({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      guest_name: 'Nguyen Van A',
      guest_phone: '0901234567',
      coupon_code: 'LOSER100K',
    }, currentUser);

    assert.ok(booking.booking_id);
    assert.strictEqual(booking.total_amount, 700000);
    assert.strictEqual(booking.discount_amount, 300000);
    assert.strictEqual(booking.coupon_applied, 'FS_E8B1D9C2_WINNER');

    // Verify stored in t_booking
    const storedBooking = mockDb._store.t_booking.find((b) => b.booking_id === booking.booking_id);
    assert.ok(storedBooking, 'Booking record must exist in t_booking');
    assert.strictEqual(storedBooking.coupon_id, 'cpn-fs-booking', 't_booking.coupon_id must match winning Flash Sale');
    assert.strictEqual(storedBooking.discount_amount, 300000, 't_booking.discount_amount must be 300,000');
    assert.strictEqual(storedBooking.total_amount, 700000, 't_booking.total_amount must be 700,000');
    assert.strictEqual(storedBooking.total_amount, 1000000 - 300000, 'Total strictly matches subtotal - discount');
    recordTest('Suite 3', '3.1: createBooking persists Flash Sale winner into t_booking', true);
  } catch (err) {
    recordTest('Suite 3', '3.1: createBooking persists Flash Sale winner into t_booking', false, err.message);
  }

  // Test 3.2: createBooking with Manual Coupon higher than Flash Sale
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-loser',
        code: 'FS_E8B1D9C2_SMALL',
        discount_type: 'FLASH_PERCENT',
        discount_value: 10, // 100k
      },
      {
        coupon_id: 'cpn-manual-winner',
        code: 'SUPER400K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 400000, // 400k
      },
    ]);

    const currentUser = { user_id: 'user-guest-02', role_cd: '1' };
    const booking = await bookingService.createBooking({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      guest_name: 'Tran Thi B',
      guest_phone: '0912345678',
      coupon_code: 'SUPER400K',
    }, currentUser);

    assert.strictEqual(booking.total_amount, 600000);
    assert.strictEqual(booking.discount_amount, 400000);
    assert.strictEqual(booking.coupon_applied, 'SUPER400K');

    const stored = mockDb._store.t_booking.find((b) => b.booking_id === booking.booking_id);
    assert.strictEqual(stored.coupon_id, 'cpn-manual-winner');
    assert.strictEqual(stored.discount_amount, 400000);
    assert.strictEqual(stored.total_amount, 600000);
    recordTest('Suite 3', '3.2: createBooking persists manual coupon winner into t_booking', true);
  } catch (err) {
    recordTest('Suite 3', '3.2: createBooking persists manual coupon winner into t_booking', false, err.message);
  }

  // Test 3.3: createBooking with zero discount -> coupon_id = null, discount_amount = 0
  try {
    resetCoupons([]);

    const currentUser = { user_id: 'user-guest-03', role_cd: '1' };
    const booking = await bookingService.createBooking({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      guest_name: 'Le Van C',
      guest_phone: '0987654321',
    }, currentUser);

    assert.strictEqual(booking.total_amount, 1000000);
    assert.strictEqual(booking.discount_amount, 0);
    assert.strictEqual(booking.coupon_applied, null);

    const stored = mockDb._store.t_booking.find((b) => b.booking_id === booking.booking_id);
    assert.strictEqual(stored.coupon_id, null);
    assert.strictEqual(stored.discount_amount, 0);
    assert.strictEqual(stored.total_amount, 1000000);
    recordTest('Suite 3', '3.3: createBooking without coupon persists coupon_id=null, discount=0', true);
  } catch (err) {
    recordTest('Suite 3', '3.3: createBooking without coupon persists coupon_id=null, discount=0', false, err.message);
  }

  // ========================================================================
  // SUITE 4: Adversarial Edge Cases & Bug Reproduction
  // ========================================================================
  console.log('\n--- SUITE 4: ADVERSARIAL EDGE CASES & CONFIRMED BUGS ---');

  // Test 4.1: Bug Reproduction - Whitespace coupon_code wipes out active Flash Sale
  try {
    resetCoupons([
      {
        coupon_id: 'cpn-fs-active',
        code: 'FS_E8B1D9C2_GOLDEN',
        discount_type: 'FLASH_PERCENT',
        discount_value: 30, // 300,000
      },
    ]);

    const pricing = await bookingService.calculatePricing({
      hotel_id: HOTEL1_ID,
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: '   ', // user accidentally entered whitespace
    });

    if (pricing.discount_amount === 0 && pricing.coupon === null) {
      // Confirmed bug: Whitespace coupon_code drops Flash Sale
      recordTest('Suite 4', '4.1: [BUG CONFIRMED] Whitespace coupon_code drops Flash Sale to 0 discount', false,
        `Expected 300,000 discount from active Flash Sale, but got ${pricing.discount_amount} (coupon: ${pricing.coupon})`);
    } else {
      recordTest('Suite 4', '4.1: Whitespace coupon_code preserves active Flash Sale', true);
    }
  } catch (err) {
    recordTest('Suite 4', '4.1: Whitespace coupon_code edge test', false, err.message);
  }

  // Test 4.2: Bug Reproduction - setCustomClient isolation flaw
  try {
    // In booking.service.js, line 19 defines setCustomClient, but line 350 uses raw supabase
    // We test calling calculatePricing when customClient is set to an isolated object
    const isolatedDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: new Error('ISOLATED_CLIENT_CALLED') }),
              }),
            }),
          }),
        }),
      }),
    };
    bookingService.setCustomClient(isolatedDb);

    let errorThrown = null;
    try {
      await bookingService.calculatePricing({
        hotel_id: HOTEL1_ID,
        rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
        check_in_date: CHECK_IN,
        check_out_date: CHECK_OUT,
      });
    } catch (e) {
      errorThrown = e;
    }

    // Restore custom client to null
    bookingService.setCustomClient(null);

    if (errorThrown && errorThrown.message.includes('ISOLATED_CLIENT_CALLED')) {
      recordTest('Suite 4', '4.2: setCustomClient properly overrides DB queries', true);
    } else {
      recordTest('Suite 4', '4.2: [BUG CONFIRMED] setCustomClient is ignored by calculatePricing (raw supabase hardcoded)', false,
        'calculatePricing queried mockDb via require.cache instead of isolatedDb passed to setCustomClient');
    }
  } catch (err) {
    recordTest('Suite 4', '4.2: setCustomClient test error', false, err.message);
  }

  // Test 4.3: Bug Reproduction - verifyCouponEligibility usage_limit crashes when supabase is null
  try {
    // Test verifyCouponEligibility with usage_limit
    const couponWithLimit = {
      coupon_id: 'cpn-limit-5',
      code: 'LIMIT5',
      usage_limit: 5,
      valid_from: '2026-11-01T00:00:00Z',
      valid_to: '2026-11-30T23:59:59Z',
    };

    let checkResult = null;
    let limitError = null;
    try {
      checkResult = await bookingService.verifyCouponEligibility(couponWithLimit, 1000000, new Date(), null, mockDb);
    } catch (e) {
      limitError = e;
    }

    if (limitError) {
      recordTest('Suite 4', '4.3: [BUG CONFIRMED] verifyCouponEligibility with usage_limit crashes', false, limitError.message);
    } else {
      assert.strictEqual(checkResult.valid, true);
      recordTest('Suite 4', '4.3: verifyCouponEligibility enforces usage_limit without crash', true);
    }
  } catch (err) {
    recordTest('Suite 4', '4.3: verifyCouponEligibility usage limit test', false, err.message);
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.log('\n========================================================================');
  console.log(` ADVERSARIAL TEST SUMMARY: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  return { total, passed, failed, testResults };
};

runAllAdversarialTests()
  .then((res) => {
    if (res.failed > 0) {
      console.log(`Found ${res.failed} failure/bug modes.`);
    }
  })
  .catch((e) => {
    console.error('Fatal test runner error:', e);
  });
