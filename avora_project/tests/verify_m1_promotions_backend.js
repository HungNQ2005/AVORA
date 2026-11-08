'use strict';

/**
 * AVORA Milestone 1 Backend Verification Suite
 * Tests:
 * 1. Coupon Validation & Types (FLASH_PERCENT, FIXED_AMOUNT, PERCENT, FIXED)
 * 2. Vendor Flash Sale Validation & Normalization
 * 3. Vendor Flash Sale Service CRUD & Multi-Tenant Scoping/Isolation
 * 4. Booking Pricing Engine: Flash Sale Auto-Detection & Conflict Resolution Matrix
 * 5. Hotel Service: Active Flash Sale Discovery & Enrichment
 */

const assert = require('assert');
const { validateCouponPayload } = require('../backend/src/features/coupons/coupon.validation');
const {
  validateCreateFlashSale,
  validateUpdateFlashSale,
} = require('../backend/src/features/vendor_flash_sales/vendor_flash_sale.validation');
const vendorFlashSaleService = require('../backend/src/features/vendor_flash_sales/vendor_flash_sale.service');
const {
  calculateCouponDiscount,
  verifyCouponEligibility,
  calculatePricing,
  setCustomClient: setBookingCustomClient,
} = require('../backend/src/features/bookings/booking.service');
const hotelService = require('../backend/src/features/hotels/hotel.service');

let passedTests = 0;
let totalTests = 0;

const runTest = async (name, fn) => {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
};

const createMockSupabase = (initialData = {}) => {
  const store = {
    m_hotel: initialData.m_hotel ? JSON.parse(JSON.stringify(initialData.m_hotel)) : [],
    m_room_type: initialData.m_room_type ? JSON.parse(JSON.stringify(initialData.m_room_type)) : [],
    m_room: initialData.m_room ? JSON.parse(JSON.stringify(initialData.m_room)) : [],
    t_inventory: initialData.t_inventory ? JSON.parse(JSON.stringify(initialData.t_inventory)) : [],
    m_coupon: initialData.m_coupon ? JSON.parse(JSON.stringify(initialData.m_coupon)) : [],
    t_booking: initialData.t_booking ? JSON.parse(JSON.stringify(initialData.t_booking)) : [],
    t_booking_detail: initialData.t_booking_detail ? JSON.parse(JSON.stringify(initialData.t_booking_detail)) : [],
    m_room_facility_map: initialData.m_room_facility_map ? JSON.parse(JSON.stringify(initialData.m_room_facility_map)) : [],
    m_hotel_image: initialData.m_hotel_image ? JSON.parse(JSON.stringify(initialData.m_hotel_image)) : [],
    m_cancellation_policy: initialData.m_cancellation_policy ? JSON.parse(JSON.stringify(initialData.m_cancellation_policy)) : [],
    m_system_code: initialData.m_system_code ? JSON.parse(JSON.stringify(initialData.m_system_code)) : [
      { business_cd: 'BOOKING_STS', code_cd: '1', code_name: 'PND', sort_no: 1 },
      { business_cd: 'BOOKING_STS', code_cd: '2', code_name: 'CFM', sort_no: 2 },
      { business_cd: 'BOOKING_STS', code_cd: '3', code_name: 'CAN', sort_no: 3 },
      { business_cd: 'ROOM_STS', code_cd: '1', code_name: 'AVL', sort_no: 1 },
      { business_cd: 'USER_ROLE', code_cd: '1', code_name: 'CUS', sort_no: 1 },
      { business_cd: 'USER_ACTION', code_cd: '10', code_name: 'BOK', sort_no: 1 },
    ],
  };

  const createQueryBuilder = (tableName) => {
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
      ilike: (field, pattern) => {
        const regexStr = pattern.replace(/%/g, '.*');
        const re = new RegExp(`^${regexStr}$`, 'i');
        rows = rows.filter((r) => re.test(String(r[field] || '')));
        return builder;
      },
      in: (field, vals) => {
        const set = new Set(vals.map(String));
        rows = rows.filter((r) => set.has(String(r[field])));
        return builder;
      },
      lte: (field, val) => {
        rows = rows.filter((r) => r[field] && r[field] <= val);
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
      or: (conditionStr) => {
        // Simple condition handler for is_deleted.is.null,is_deleted.eq.false
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
      range: (from, to) => {
        rows = rows.slice(from, to + 1);
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
        const inserted = Array.isArray(record) ? record : [record];
        inserted.forEach((item) => {
          if (!item.coupon_id) {
            item.coupon_id = `cpn-${Math.random().toString(36).substring(2, 9)}`;
          }
          store[tableName].push(item);
        });
        rows = inserted;
        return builder;
      },
      update: (updates) => {
        rows.forEach((r) => {
          Object.assign(r, updates);
        });
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
    from: (table) => createQueryBuilder(table),
    _store: store,
  };
};

const runAllTests = async () => {
  console.log('========================================================================');
  console.log(' AVORA MILESTONE 1 VERIFICATION TEST HARNESS (PROMOTIONS ENGINE)');
  console.log('========================================================================\n');

  // --- PART 1: COUPON VALIDATION ---
  console.log('--- PART 1: COUPON VALIDATION & TYPES ---');

  await runTest('1.1: Validation allows FLASH_PERCENT type', () => {
    const res = validateCouponPayload({
      code: 'FLASH20',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      valid_from: '2026-11-04T00:00:00.000Z',
      valid_to: '2026-11-04T23:59:59.000Z',
    });
    assert.strictEqual(res.error, undefined);
    assert.strictEqual(res.payload.discount_type, 'FLASH_PERCENT');
  });

  await runTest('1.2: Validation allows FIXED_AMOUNT type', () => {
    const res = validateCouponPayload({
      code: 'FIXED50K',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 50000,
      valid_from: '2026-11-04T00:00:00.000Z',
      valid_to: '2026-11-04T23:59:59.000Z',
    });
    assert.strictEqual(res.error, undefined);
    assert.strictEqual(res.payload.discount_type, 'FIXED_AMOUNT');
  });

  await runTest('1.3: Validation rejects FLASH_PERCENT with discount_value > 100', () => {
    const res = validateCouponPayload({
      code: 'FLASH150',
      discount_type: 'FLASH_PERCENT',
      discount_value: 150,
      valid_from: '2026-11-04T00:00:00.000Z',
      valid_to: '2026-11-04T23:59:59.000Z',
    });
    assert.ok(res.error && res.error.includes('100%'));
  });

  await runTest('1.4: Validation rejects invalid discount type', () => {
    const res = validateCouponPayload({
      code: 'INVALID',
      discount_type: 'BUY_1_GET_1',
      discount_value: 50,
      valid_from: '2026-11-04T00:00:00.000Z',
      valid_to: '2026-11-04T23:59:59.000Z',
    });
    assert.ok(res.error && res.error.includes('Loại giảm giá chỉ được là'));
  });

  // --- PART 2: VENDOR FLASH SALE VALIDATION ---
  console.log('\n--- PART 2: VENDOR FLASH SALE VALIDATION & NORMALIZATION ---');

  await runTest('2.1: Validates and cleans code_name (strips redundant prefix)', () => {
    const res = validateCreateFlashSale({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      code_name: 'FS_E8B1D9C2_GOLDEN30',
      discount_type: 'FLASH_PERCENT',
      discount_value: 30,
      valid_from: '2026-11-04T12:00:00.000Z',
      valid_to: '2026-11-04T18:00:00.000Z',
    });
    assert.strictEqual(res.error, undefined);
    assert.strictEqual(res.payload.code_name, 'GOLDEN30');
  });

  await runTest('2.2: Rejects code_name with invalid special characters', () => {
    const res = validateCreateFlashSale({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      code_name: 'BAD*CODE@NAME!',
      discount_type: 'FLASH_PERCENT',
      discount_value: 30,
      valid_from: '2026-11-04T12:00:00.000Z',
      valid_to: '2026-11-04T18:00:00.000Z',
    });
    assert.ok(res.error && res.error.includes('Tên mã Flash Sale chỉ gồm'));
  });

  await runTest('2.3: Rejects valid_to earlier than or equal to valid_from', () => {
    const res = validateCreateFlashSale({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      code_name: 'FLASH30',
      discount_type: 'FLASH_PERCENT',
      discount_value: 30,
      valid_from: '2026-11-04T18:00:00.000Z',
      valid_to: '2026-11-04T12:00:00.000Z',
    });
    assert.ok(res.error && res.error.includes('Thời gian kết thúc phải diễn ra sau'));
  });

  await runTest('2.4: Update validation enforces positive usage_limit', () => {
    const res = validateUpdateFlashSale({
      usage_limit: -5,
    });
    assert.ok(res.error && res.error.includes('Giới hạn sử dụng'));
  });

  // --- PART 3: VENDOR FLASH SALE SERVICE & MULTI-TENANT ISOLATION ---
  console.log('\n--- PART 3: VENDOR FLASH SALE CRUD & MULTI-TENANT ISOLATION ---');

  const vendor1Id = 'user-vendor-001';
  const vendor2Id = 'user-vendor-002';
  const hotel1Id = 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0';
  const hotel2Id = 'a1b2c3d4-1111-2222-3333-444455556666';

  const mockDb = createMockSupabase({
    m_hotel: [
      { hotel_id: hotel1Id, owner_id: vendor1Id, name: 'Khách sạn Biển Vàng', is_deleted: false },
      { hotel_id: hotel2Id, owner_id: vendor2Id, name: 'Khách sạn Núi Xanh', is_deleted: false },
    ],
    m_coupon: [
      {
        coupon_id: 'cpn-001',
        code: 'FS_E8B1D9C2_FLASH20',
        discount_type: 'FLASH_PERCENT',
        discount_value: 20,
        max_discount_amount: 300000,
        min_order_amount: 500000,
        usage_limit: 50,
        valid_from: '2026-11-04T00:00:00.000Z',
        valid_to: '2026-11-04T23:59:59.000Z',
        is_deleted: false,
      },
    ],
  });

  vendorFlashSaleService.setCustomClient(mockDb);

  await runTest('3.1: Vendor 1 creates Flash Sale with deterministic code FS_E8B1D9C2_SUMMER', async () => {
    const created = await vendorFlashSaleService.createVendorFlashSale({
      userId: vendor1Id,
      payload: {
        hotel_id: hotel1Id,
        code_name: 'SUMMER',
        discount_type: 'FLASH_PERCENT',
        discount_value: 25,
        max_discount_amount: 500000,
        min_order_amount: 1000000,
        usage_limit: 100,
        valid_from: '2026-11-04T10:00:00.000Z',
        valid_to: '2026-11-04T22:00:00.000Z',
      },
    });
    assert.strictEqual(created.code, 'FS_E8B1D9C2_SUMMER');
    assert.strictEqual(created.hotel_prefix, 'E8B1D9C2');
    assert.strictEqual(created.hotel_name, 'Khách sạn Biển Vàng');
  });

  await runTest('3.2: Multi-Tenant: Vendor 1 cannot create Flash Sale for Hotel 2 (owned by Vendor 2)', async () => {
    let err = null;
    try {
      await vendorFlashSaleService.createVendorFlashSale({
        userId: vendor1Id,
        payload: {
          hotel_id: hotel2Id,
          code_name: 'HACK',
          discount_type: 'FLASH_PERCENT',
          discount_value: 50,
          valid_from: '2026-11-04T10:00:00.000Z',
          valid_to: '2026-11-04T22:00:00.000Z',
        },
      });
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.strictEqual(err.statusCode, 403);
  });

  await runTest('3.3: Multi-Tenant: Vendor 2 cannot access Flash Sale of Hotel 1', async () => {
    let err = null;
    try {
      await vendorFlashSaleService.getVendorFlashSaleById({
        userId: vendor2Id,
        couponId: 'cpn-001',
      });
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.strictEqual(err.statusCode, 403);
  });

  await runTest('3.4: Duplicate code prevention returns 409 Conflict', async () => {
    let err = null;
    try {
      await vendorFlashSaleService.createVendorFlashSale({
        userId: vendor1Id,
        payload: {
          hotel_id: hotel1Id,
          code_name: 'FLASH20', // Already exists as FS_E8B1D9C2_FLASH20
          discount_type: 'FLASH_PERCENT',
          discount_value: 20,
          valid_from: '2026-11-04T10:00:00.000Z',
          valid_to: '2026-11-04T22:00:00.000Z',
        },
      });
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.strictEqual(err.statusCode, 409);
  });

  await runTest('3.5: Soft delete sets is_deleted = true', async () => {
    await vendorFlashSaleService.deleteVendorFlashSale({
      userId: vendor1Id,
      couponId: 'cpn-001',
    });
    const found = mockDb._store.m_coupon.find((c) => c.coupon_id === 'cpn-001');
    assert.strictEqual(found.is_deleted, true);
  });

  // --- PART 4: PRICING ENGINE & CONFLICT RESOLUTION MATRIX ---
  console.log('\n--- PART 4: PRICING ENGINE & CONFLICT RESOLUTION MATRIX ---');

  await runTest('4.1: calculateCouponDiscount caps percentage discount by max_discount_amount', () => {
    const coupon = {
      discount_type: 'FLASH_PERCENT',
      discount_value: 50,
      max_discount_amount: 300000,
    };
    const discount = calculateCouponDiscount(coupon, 2000000);
    // 50% of 2M = 1M, but max is 300k
    assert.strictEqual(discount, 300000);
  });

  await runTest('4.2: calculateCouponDiscount calculates fixed amount discount', () => {
    const coupon = {
      discount_type: 'FIXED_AMOUNT',
      discount_value: 150000,
      max_discount_amount: null,
    };
    const discount = calculateCouponDiscount(coupon, 1000000);
    assert.strictEqual(discount, 150000);
  });

  await runTest('4.3: verifyCouponEligibility enforces min_order_amount', async () => {
    const coupon = {
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-10T00:00:00.000Z',
      min_order_amount: 1000000,
    };
    const res = await verifyCouponEligibility(coupon, 800000, new Date('2026-11-04T12:00:00.000Z'));
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('1.000.000'));
  });

  await runTest('4.4: verifyCouponEligibility enforces golden hour validity', async () => {
    const coupon = {
      valid_from: '2026-11-04T14:00:00.000Z',
      valid_to: '2026-11-04T18:00:00.000Z',
    };
    // Current time is 12:00 (before start)
    const resBefore = await verifyCouponEligibility(coupon, 1000000, new Date('2026-11-04T12:00:00.000Z'));
    assert.strictEqual(resBefore.valid, false);
    assert.ok(resBefore.message.includes('chưa đến'));

    // Current time is 15:00 (in golden hour)
    const resInside = await verifyCouponEligibility(coupon, 1000000, new Date('2026-11-04T15:00:00.000Z'));
    assert.strictEqual(resInside.valid, true);
  });

  await runTest('4.5: Conflict Matrix TH4: Manual coupon higher than Flash Sale replaces Flash Sale', async () => {
    const pricingMockDb = createMockSupabase({
      m_hotel: [{
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        name: 'Avora Resort',
        hotel_status: 'ACTIVE',
        is_deleted: false,
      }],
      m_room_type: [{
        room_type_id: 'rt-deluxe-01',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        type_name: 'Deluxe Room',
        default_price: 1000000,
        is_deleted: false,
      }],
      m_room: [{
        room_id: 'rm-101',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-deluxe-01',
        room_number: '101',
        status_cd: '1',
        is_deleted: false,
      }],
      t_inventory: [
        {
          room_type_id: 'rt-deluxe-01',
          target_date: '2026-11-10',
          available_rooms: 10,
          current_price: 1000000,
        },
        {
          room_type_id: 'rt-deluxe-01',
          target_date: '2026-11-11',
          available_rooms: 10,
          current_price: 1000000,
        },
      ],
      m_coupon: [
        {
          coupon_id: 'cpn-fs-20',
          code: 'FS_E8B1D9C2_FLASH20',
          discount_type: 'FLASH_PERCENT',
          discount_value: 20,
          max_discount_amount: 200000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
        {
          coupon_id: 'cpn-manual-300',
          code: 'AVORA300K',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 300000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
      ],
    });
    setBookingCustomClient(pricingMockDb);

    const pricing = await calculatePricing({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 2 }],
      check_in_date: '2026-11-10',
      check_out_date: '2026-11-11',
      coupon_code: 'AVORA300K',
    });

    assert.strictEqual(pricing.subtotal, 2000000);
    assert.strictEqual(pricing.discount_amount, 300000, 'Manual coupon must replace Flash Sale when higher');
    assert.strictEqual(pricing.total_amount, 1700000);
    assert.strictEqual(pricing.promotion_details.applied_type, 'MANUAL_COUPON');
    assert.strictEqual(pricing.promotion_details.flash_sale_discount, 200000);
    assert.strictEqual(pricing.promotion_details.manual_coupon_discount, 300000);
    assert.ok(pricing.promotion_details.message.includes('thay thế Flash Sale'));
  });

  await runTest('4.6: Conflict Matrix TH5: Best value protection keeps Flash Sale when higher than manual coupon', async () => {
    const pricingMockDb = createMockSupabase({
      m_hotel: [{
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        name: 'Avora Resort',
        hotel_status: 'ACTIVE',
        is_deleted: false,
      }],
      m_room_type: [{
        room_type_id: 'rt-deluxe-01',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        type_name: 'Deluxe Room',
        default_price: 1000000,
        is_deleted: false,
      }],
      m_room: [{
        room_id: 'rm-101',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-deluxe-01',
        room_number: '101',
        status_cd: '1',
        is_deleted: false,
      }],
      t_inventory: [
        {
          room_type_id: 'rt-deluxe-01',
          target_date: '2026-11-10',
          available_rooms: 10,
          current_price: 1000000,
        },
      ],
      m_coupon: [
        {
          coupon_id: 'cpn-fs-50',
          code: 'FS_E8B1D9C2_FLASH50',
          discount_type: 'FLASH_PERCENT',
          discount_value: 50,
          max_discount_amount: 500000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
        {
          coupon_id: 'cpn-manual-50',
          code: 'WELCOME50K',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 50000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
      ],
    });
    setBookingCustomClient(pricingMockDb);

    const pricing = await calculatePricing({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: '2026-11-10',
      check_out_date: '2026-11-11',
      coupon_code: 'WELCOME50K',
    });

    assert.strictEqual(pricing.subtotal, 1000000);
    assert.strictEqual(pricing.discount_amount, 500000, 'Flash sale discount must be kept');
    assert.strictEqual(pricing.total_amount, 500000);
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    assert.strictEqual(pricing.promotion_details.flash_sale_discount, 500000);
    assert.strictEqual(pricing.promotion_details.manual_coupon_discount, 50000);
    assert.ok(pricing.promotion_details.message.includes('có lợi hơn'));
  });

  await runTest('4.7: Hotel Scoping: Flash sale prefix isolation rule', () => {
    const targetHotelId = 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0';
    const hotelPrefix = targetHotelId.split('-')[0].toUpperCase();
    const validFlashCode = `FS_${hotelPrefix}_SALE20`;
    const foreignFlashCode = 'FS_OTHER123_SALE20';

    assert.ok(validFlashCode.startsWith(`FS_${hotelPrefix}_`));
    assert.strictEqual(foreignFlashCode.startsWith(`FS_${hotelPrefix}_`), false);
  });

  await runTest('4.8: Conflict Matrix Equal Discount: Deterministic tie-break keeps Flash Sale with clear message', async () => {
    const pricingMockDb = createMockSupabase({
      m_hotel: [{
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        name: 'Avora Resort',
        hotel_status: 'ACTIVE',
        is_deleted: false,
      }],
      m_room_type: [{
        room_type_id: 'rt-deluxe-01',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        type_name: 'Deluxe Room',
        default_price: 1000000,
        is_deleted: false,
      }],
      m_room: [{
        room_id: 'rm-101',
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        room_type_id: 'rt-deluxe-01',
        room_number: '101',
        status_cd: '1',
        is_deleted: false,
      }],
      t_inventory: [
        {
          room_type_id: 'rt-deluxe-01',
          target_date: '2026-11-10',
          available_rooms: 10,
          current_price: 1000000,
        },
      ],
      m_coupon: [
        {
          coupon_id: 'cpn-fs-tie',
          code: 'FS_E8B1D9C2_FLASHTIE',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 200000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
        {
          coupon_id: 'cpn-manual-tie',
          code: 'COUPONTIE200K',
          discount_type: 'FIXED_AMOUNT',
          discount_value: 200000,
          valid_from: new Date(Date.now() - 3600000).toISOString(),
          valid_to: new Date(Date.now() + 30 * 86400000).toISOString(),
          is_deleted: false,
        },
      ],
    });
    setBookingCustomClient(pricingMockDb);

    const pricing = await calculatePricing({
      hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
      rooms: [{ room_type_id: 'rt-deluxe-01', quantity: 1 }],
      check_in_date: '2026-11-10',
      check_out_date: '2026-11-11',
      coupon_code: 'COUPONTIE200K',
    });

    assert.strictEqual(pricing.subtotal, 1000000);
    assert.strictEqual(pricing.discount_amount, 200000);
    assert.strictEqual(pricing.promotion_details.applied_type, 'FLASH_SALE');
    assert.strictEqual(pricing.promotion_details.flash_sale_discount, 200000);
    assert.strictEqual(pricing.promotion_details.manual_coupon_discount, 200000);
    assert.ok(pricing.promotion_details.message.includes('tương đương'));
  });

  // --- PART 5: HOTEL SERVICE ACTIVE FLASH SALE DISCOVERY ---
  console.log('\n--- PART 5: HOTEL DISCOVERY API ENRICHMENT ---');

  const discoveryMockDb = createMockSupabase({
    m_hotel: [
      {
        hotel_id: hotel1Id,
        name: 'Avora Luxury Resort',
        address: '123 Võ Nguyên Giáp, Biển Mỹ Khê',
        star_quality: 5,
        is_deleted: false,
        hotel_status: 'ACTIVE',
      },
    ],
    m_coupon: [
      {
        coupon_id: 'cpn-flash-30',
        code: 'FS_E8B1D9C2_FLASH30',
        discount_type: 'FLASH_PERCENT',
        discount_value: 30,
        max_discount_amount: 500000,
        valid_from: new Date(Date.now() - 3600000).toISOString(),
        valid_to: new Date(Date.now() + 86400000).toISOString(),
        is_deleted: false,
      },
      {
        coupon_id: 'cpn-flash-10',
        code: 'FS_E8B1D9C2_FLASH10',
        discount_type: 'FLASH_PERCENT',
        discount_value: 10,
        valid_from: new Date(Date.now() - 3600000).toISOString(),
        valid_to: new Date(Date.now() + 86400000).toISOString(),
        is_deleted: false,
      },
    ],
  });

  hotelService.setCustomClient(discoveryMockDb);

  await runTest('5.1: getHotelById attaches active_flash_sale picking the highest discount (30% > 10%)', async () => {
    const detail = await hotelService.getHotelById(hotel1Id);
    assert.ok(detail);
    assert.ok(detail.active_flash_sale);
    assert.strictEqual(detail.active_flash_sale.code, 'FS_E8B1D9C2_FLASH30');
    assert.strictEqual(detail.active_flash_sale.discount_value, 30);
  });

  await runTest('5.2: getHotelById returns null active_flash_sale when no coupon active in golden hours', async () => {
    const noCouponDb = createMockSupabase({
      m_hotel: [
        {
          hotel_id: hotel2Id,
          name: 'Avora Mountain Retreat',
          is_deleted: false,
          hotel_status: 'ACTIVE',
        },
      ],
      m_coupon: [],
    });
    hotelService.setCustomClient(noCouponDb);
    const detail = await hotelService.getHotelById(hotel2Id);
    assert.ok(detail);
    assert.strictEqual(detail.active_flash_sale, null);
  });

  console.log('\n========================================================================');
  console.log(` SUMMARY REPORT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runAllTests().catch((err) => {
  console.error('Test harness execution failed:', err);
  process.exit(1);
});
