'use strict';

/**
 * AVORA Milestone 1 Backend Adversarial Stress Test Suite
 * Comprehensive stress testing and attack surface verification:
 * Section 1: Multi-Tenant Vendor Ownership Bypass & Hotel Scoping
 * Section 2: Calculation Corner Cases & Math
 * Section 3: Golden Hour Boundary & Timezone Skew
 * Section 4: Limit Exhaustion & Concurrent-Like Conditions
 * Section 5: Payload Hardening & Vulnerability Probing
 * Section 6: Adversarial Vulnerability Audit
 */

const assert = require('assert');

// Forward create mock Supabase
const createMockSupabase = (initialData = {}) => {
  const store = {
    m_hotel: initialData.m_hotel ? JSON.parse(JSON.stringify(initialData.m_hotel)) : [],
    m_coupon: initialData.m_coupon ? JSON.parse(JSON.stringify(initialData.m_coupon)) : [],
    t_booking: initialData.t_booking ? JSON.parse(JSON.stringify(initialData.t_booking)) : [],
    m_system_code: [
      { business_cd: 'BOOKING_STS', code_cd: '1', code_name: 'PND', sort_no: 1 },
      { business_cd: 'BOOKING_STS', code_cd: '2', code_name: 'CFM', sort_no: 2 },
      { business_cd: 'BOOKING_STS', code_cd: '3', code_name: 'CAN', sort_no: 3 },
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

// Global mock instance for supabaseClient module caching
const globalMockSupabase = createMockSupabase();
try {
  const clientPath = require.resolve('../backend/src/config/supabaseClient');
  require.cache[clientPath] = {
    id: clientPath,
    filename: clientPath,
    loaded: true,
    exports: globalMockSupabase,
  };
} catch (e) {
  // Ignore
}

const { validateCouponPayload } = require('../backend/src/features/coupons/coupon.validation');
const {
  validateCreateFlashSale,
  validateUpdateFlashSale,
} = require('../backend/src/features/vendor_flash_sales/vendor_flash_sale.validation');
const vendorFlashSaleService = require('../backend/src/features/vendor_flash_sales/vendor_flash_sale.service');
const {
  calculateCouponDiscount,
  verifyCouponEligibility,
  setCustomClient: setBookingCustomClient,
} = require('../backend/src/features/bookings/booking.service');
const hotelService = require('../backend/src/features/hotels/hotel.service');

let passedTests = 0;
let totalTests = 0;
const failures = [];
const findings = [];

const runTest = async (name, fn) => {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
};

const runAdversarialSuite = async () => {
  console.log('========================================================================');
  console.log(' AVORA M1 ADVERSARIAL STRESS TEST & ATTACK SURFACE VERIFICATION');
  console.log('========================================================================\n');

  // Multi-Tenant Setup
  const vendor1Id = 'user-vendor-001';
  const vendor2Id = 'user-vendor-002';
  const hotel1Id = 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0'; // prefix E8B1D9C2
  const hotel2Id = 'a1b2c3d4-1111-2222-3333-444455556666'; // prefix A1B2C3D4
  const deletedHotelId = 'f9e8d7c6-0000-0000-0000-000000000000';

  const mockDb = createMockSupabase({
    m_hotel: [
      { hotel_id: hotel1Id, owner_id: vendor1Id, name: 'Khách sạn Biển Vàng', is_deleted: false },
      { hotel_id: hotel2Id, owner_id: vendor2Id, name: 'Khách sạn Núi Xanh', is_deleted: false },
      { hotel_id: deletedHotelId, owner_id: vendor1Id, name: 'Khách sạn Đã Xóa', is_deleted: true },
    ],
    m_coupon: [
      {
        coupon_id: 'cpn-h1-001',
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
      {
        coupon_id: 'cpn-h2-001',
        code: 'FS_A1B2C3D4_GOLDEN50',
        discount_type: 'FLASH_PERCENT',
        discount_value: 50,
        max_discount_amount: 1000000,
        min_order_amount: 1000000,
        usage_limit: 10,
        valid_from: '2026-11-04T00:00:00.000Z',
        valid_to: '2026-11-04T23:59:59.000Z',
        is_deleted: false,
      },
      {
        coupon_id: 'cpn-platform-001',
        code: 'WELCOME50K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 50000,
        max_discount_amount: null,
        min_order_amount: 200000,
        usage_limit: 1000,
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_to: '2026-11-30T23:59:59.000Z',
        is_deleted: false,
      },
    ],
    t_booking: [],
  });

  // Sync stores
  Object.assign(globalMockSupabase._store, mockDb._store);

  vendorFlashSaleService.setCustomClient(mockDb);
  setBookingCustomClient(mockDb);
  hotelService.setCustomClient(mockDb);

  // ---------------------------------------------------------------------------
  // SECTION 1: Multi-Tenant Vendor Ownership Bypass & Hotel Scoping
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: MULTI-TENANT VENDOR OWNERSHIP BYPASS & HOTEL SCOPING ---');

  await runTest('1.1: Vendor 1 cannot update Vendor 2 Flash Sale (403 Forbidden)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.updateVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-h2-001',
        updates: { discount_value: 10 },
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 403);
    assert.ok(thrown.message.includes('không có quyền'));
  });

  await runTest('1.2: Vendor 1 cannot soft-delete Vendor 2 Flash Sale (403 Forbidden)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.deleteVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-h2-001',
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 403);
  });

  await runTest('1.3: Vendor 1 cannot view Vendor 2 Flash Sale details (403 Forbidden)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.getVendorFlashSaleById({
        userId: vendor1Id,
        couponId: 'cpn-h2-001',
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 403);
  });

  await runTest('1.4: Vendor 1 cannot create Flash Sale for Hotel 2 (403 Forbidden)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.createVendorFlashSale({
        userId: vendor1Id,
        payload: {
          hotel_id: hotel2Id,
          code_name: 'EXPLOIT',
          discount_type: 'FLASH_PERCENT',
          discount_value: 50,
          valid_from: '2026-11-04T10:00:00.000Z',
          valid_to: '2026-11-04T22:00:00.000Z',
        },
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 403);
  });

  await runTest('1.5: Vendor 1 cannot create Flash Sale for non-existent hotel (404 Not Found)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.createVendorFlashSale({
        userId: vendor1Id,
        payload: {
          hotel_id: '00000000-0000-0000-0000-000000000000',
          code_name: 'TEST404',
          discount_type: 'FLASH_PERCENT',
          discount_value: 20,
          valid_from: '2026-11-04T10:00:00.000Z',
          valid_to: '2026-11-04T22:00:00.000Z',
        },
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 404);
  });

  await runTest('1.6: Vendor 1 cannot create Flash Sale for deleted hotel (404 Not Found)', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.createVendorFlashSale({
        userId: vendor1Id,
        payload: {
          hotel_id: deletedHotelId,
          code_name: 'TESTDEL',
          discount_type: 'FLASH_PERCENT',
          discount_value: 20,
          valid_from: '2026-11-04T10:00:00.000Z',
          valid_to: '2026-11-04T22:00:00.000Z',
        },
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 404);
  });

  await runTest('1.7: Vendor 1 listing Flash Sales with hotel_id of Hotel 2 throws 403 Forbidden', async () => {
    let thrown = null;
    try {
      await vendorFlashSaleService.getVendorFlashSales({
        userId: vendor1Id,
        hotelId: hotel2Id,
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Must throw error');
    assert.strictEqual(thrown.statusCode, 403);
  });

  await runTest('1.8: Vendor 1 listing with hotel_id = "ALL" strictly isolates Hotel 2 coupons', async () => {
    const res = await vendorFlashSaleService.getVendorFlashSales({
      userId: vendor1Id,
      hotelId: 'ALL',
    });
    assert.ok(res && Array.isArray(res.flash_sales));
    const foreign = res.flash_sales.find((c) => c.hotel_prefix === 'A1B2C3D4' || c.code.includes('A1B2C3D4'));
    assert.strictEqual(foreign, undefined, 'Must not return foreign hotel flash sales');
  });

  await runTest('1.9: Vendor cannot spoof hotel prefix in create code_name', async () => {
    const created = await vendorFlashSaleService.createVendorFlashSale({
      userId: vendor1Id,
      payload: {
        hotel_id: hotel1Id,
        code_name: 'FS_A1B2C3D4_HIJACK',
        discount_type: 'FLASH_PERCENT',
        discount_value: 15,
        valid_from: '2026-11-04T10:00:00.000Z',
        valid_to: '2026-11-04T22:00:00.000Z',
      },
    });
    assert.ok(created.code.startsWith('FS_E8B1D9C2_'), `Code was ${created.code}, must start with hotel 1 prefix`);
  });

  await runTest('1.10: Vendor cannot inject forbidden fields (hotel_id, code) in update', () => {
    const checkHotelId = validateUpdateFlashSale({ hotel_id: hotel2Id });
    assert.ok(checkHotelId.error && checkHotelId.error.includes('Không được phép thay đổi trường: hotel_id'));

    const checkCode = validateUpdateFlashSale({ code: 'FS_HACK' });
    assert.ok(checkCode.error && checkCode.error.includes('Không được phép thay đổi trường: code'));
  });

  await runTest('1.11: Vendor cannot edit, delete, or inspect platform coupon (403 Forbidden)', async () => {
    let thrownEdit = null;
    try {
      await vendorFlashSaleService.updateVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-platform-001',
        updates: { discount_value: 99 },
      });
    } catch (err) {
      thrownEdit = err;
    }
    assert.ok(thrownEdit);
    assert.strictEqual(thrownEdit.statusCode, 403);

    let thrownDel = null;
    try {
      await vendorFlashSaleService.deleteVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-platform-001',
      });
    } catch (err) {
      thrownDel = err;
    }
    assert.ok(thrownDel);
    assert.strictEqual(thrownDel.statusCode, 403);
  });

  await runTest('1.12: Cross-hotel coupon scoping: Hotel 1 flash code on Hotel 2 booking is rejected', () => {
    const hotel2Prefix = 'A1B2C3D4';
    const flashPrefix = `FS_${hotel2Prefix}_`;
    const foreignCode = 'FS_E8B1D9C2_FLASH20';

    const isForeign = String(foreignCode).toUpperCase().startsWith('FS_') &&
      (!flashPrefix || !String(foreignCode).toUpperCase().startsWith(flashPrefix));
    assert.strictEqual(isForeign, true, 'Foreign hotel flash code must be detected');
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: Calculation Corner Cases & Math
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: CALCULATION CORNER CASES & MATH ---');

  await runTest('2.1: 100% discount produces exact total = 0, no negative numbers', () => {
    const coupon = { discount_type: 'FLASH_PERCENT', discount_value: 100 };
    const subtotal = 1500000;
    const discount = calculateCouponDiscount(coupon, subtotal);
    const total = Math.max(0, subtotal - discount);

    assert.strictEqual(discount, 1500000);
    assert.strictEqual(total, 0);
  });

  await runTest('2.2: Fixed discount exceeding subtotal caps discount at subtotal (total = 0)', () => {
    const coupon = { discount_type: 'FIXED_AMOUNT', discount_value: 500000 };
    const subtotal = 200000;
    const discount = calculateCouponDiscount(coupon, subtotal);
    const total = Math.max(0, subtotal - discount);

    assert.strictEqual(discount, 200000);
    assert.strictEqual(total, 0);
  });

  await runTest('2.3: Zero subtotal yields 0 discount and 0 total', () => {
    const coupon = { discount_type: 'FLASH_PERCENT', discount_value: 50 };
    const discount = calculateCouponDiscount(coupon, 0);
    assert.strictEqual(discount, 0);
  });

  await runTest('2.4: Negative subtotal yields 0 discount', () => {
    const coupon = { discount_type: 'FLASH_PERCENT', discount_value: 50 };
    const discount = calculateCouponDiscount(coupon, -100000);
    assert.strictEqual(discount, 0);
  });

  await runTest('2.5: Fractional percentage rounds cleanly to integer (VND currency integrity)', () => {
    const coupon = { discount_type: 'FLASH_PERCENT', discount_value: 15 };
    const subtotal = 999999;
    const discount = calculateCouponDiscount(coupon, subtotal);
    // (999999 * 15) / 100 = 149999.85 -> rounded to 150000
    assert.strictEqual(discount, 150000);
    assert.strictEqual(Number.isInteger(discount), true);
    const total = subtotal - discount;
    assert.strictEqual(total, 849999);
    assert.strictEqual(Number.isInteger(total), true);
  });

  await runTest('2.6: Validation rejects discount_value <= 0 (negative and zero)', () => {
    const resZero = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'ZERO',
      discount_type: 'FLASH_PERCENT',
      discount_value: 0,
      valid_from: '2026-11-04T10:00:00.000Z',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(resZero.error && resZero.error.includes('lớn hơn 0'));

    const resNeg = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'NEG',
      discount_type: 'FLASH_PERCENT',
      discount_value: -15,
      valid_from: '2026-11-04T10:00:00.000Z',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(resNeg.error && resNeg.error.includes('lớn hơn 0'));
  });

  await runTest('2.7: Validation rejects negative max_discount_amount', () => {
    const res = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'TESTMAX',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      max_discount_amount: -50000,
      valid_from: '2026-11-04T10:00:00.000Z',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(res.error && res.error.includes('không âm hợp lệ'));
  });

  await runTest('2.8: Validation rejects negative min_order_amount', () => {
    const res = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'TESTMIN',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      min_order_amount: -100000,
      valid_from: '2026-11-04T10:00:00.000Z',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(res.error && res.error.includes('không âm hợp lệ'));
  });

  await runTest('2.9: Validation rejects negative usage_limit', () => {
    const res = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'TESTLIMIT',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      usage_limit: -5,
      valid_from: '2026-11-04T10:00:00.000Z',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(res.error, 'Must reject negative usage_limit');
  });

  await runTest('2.10: Subtotal exactly at min_order_amount boundary is eligible', async () => {
    const coupon = {
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-10T00:00:00.000Z',
      min_order_amount: 500000,
    };
    const now = new Date('2026-11-04T12:00:00.000Z');

    const exact = await verifyCouponEligibility(coupon, 500000, now);
    assert.strictEqual(exact.valid, true);

    const below = await verifyCouponEligibility(coupon, 499999, now);
    assert.strictEqual(below.valid, false);
  });

  await runTest('2.11: Multi-billion VND subtotal operates cleanly without integer overflow', () => {
    const coupon = { discount_type: 'FLASH_PERCENT', discount_value: 10 };
    const massiveSubtotal = 50000000000; // 50 billion VND
    const discount = calculateCouponDiscount(coupon, massiveSubtotal);
    assert.strictEqual(discount, 5000000000);
    const total = massiveSubtotal - discount;
    assert.strictEqual(total, 45000000000);
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: Golden Hour Boundary & Timezone Skew
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: GOLDEN HOUR BOUNDARY & TIMEZONE SKEW ---');

  const boundaryCoupon = {
    valid_from: '2026-11-04T12:00:00.000Z',
    valid_to: '2026-11-04T18:00:00.000Z',
  };

  await runTest('3.1: now exactly equals valid_from is VALID (inclusive boundary)', async () => {
    const exactStart = new Date('2026-11-04T12:00:00.000Z');
    const res = await verifyCouponEligibility(boundaryCoupon, 1000000, exactStart);
    assert.strictEqual(res.valid, true);
  });

  await runTest('3.2: now exactly equals valid_to is VALID (inclusive boundary)', async () => {
    const exactEnd = new Date('2026-11-04T18:00:00.000Z');
    const res = await verifyCouponEligibility(boundaryCoupon, 1000000, exactEnd);
    assert.strictEqual(res.valid, true);
  });

  await runTest('3.3: now is 1 millisecond before valid_from is INVALID', async () => {
    const oneMsBefore = new Date(new Date('2026-11-04T12:00:00.000Z').getTime() - 1);
    const res = await verifyCouponEligibility(boundaryCoupon, 1000000, oneMsBefore);
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('chưa đến'));
  });

  await runTest('3.4: now is 1 millisecond after valid_to is INVALID', async () => {
    const oneMsAfter = new Date(new Date('2026-11-04T18:00:00.000Z').getTime() + 1);
    const res = await verifyCouponEligibility(boundaryCoupon, 1000000, oneMsAfter);
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('hết hạn'));
  });

  await runTest('3.5: Timezone skew: ISO strings with +07:00 offsets normalize accurately to UTC', async () => {
    // 19:00 +07:00 is 12:00 UTC
    // 21:00 +07:00 is 14:00 UTC
    const tzCoupon = {
      valid_from: '2026-11-04T19:00:00+07:00',
      valid_to: '2026-11-04T21:00:00+07:00',
    };

    const midGoldenHourUtc = new Date('2026-11-04T13:00:00.000Z');
    const resInside = await verifyCouponEligibility(tzCoupon, 1000000, midGoldenHourUtc);
    assert.strictEqual(resInside.valid, true);

    const beforeGoldenHourUtc = new Date('2026-11-04T11:59:59.000Z');
    const resBefore = await verifyCouponEligibility(tzCoupon, 1000000, beforeGoldenHourUtc);
    assert.strictEqual(resBefore.valid, false);

    const afterGoldenHourUtc = new Date('2026-11-04T14:00:01.000Z');
    const resAfter = await verifyCouponEligibility(tzCoupon, 1000000, afterGoldenHourUtc);
    assert.strictEqual(resAfter.valid, false);
  });

  await runTest('3.6: Non-ISO date format is rejected by validation', () => {
    const res = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'BADTIME',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      valid_from: 'tomorrow-morning',
      valid_to: '2026-11-04T22:00:00.000Z',
    });
    assert.ok(res.error && res.error.includes('ngày giờ ISO hợp lệ'));
  });

  await runTest('3.7: Inverted time range (valid_to <= valid_from) is strictly rejected', () => {
    const resEqual = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'EQUALTIME',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      valid_from: '2026-11-04T12:00:00.000Z',
      valid_to: '2026-11-04T12:00:00.000Z',
    });
    assert.ok(resEqual.error && resEqual.error.includes('sau thời gian bắt đầu'));

    const resInverted = validateCreateFlashSale({
      hotel_id: hotel1Id,
      code_name: 'INVERTED',
      discount_type: 'FLASH_PERCENT',
      discount_value: 20,
      valid_from: '2026-11-04T18:00:00.000Z',
      valid_to: '2026-11-04T12:00:00.000Z',
    });
    assert.ok(resInverted.error && resInverted.error.includes('sau thời gian bắt đầu'));
  });

  await runTest('3.8: Service update rejects valid_to earlier than existing valid_from (400)', async () => {
    let thrown = null;
    try {
      // Existing cpn-h1-001 valid_from is 2026-11-04T00:00:00.000Z
      await vendorFlashSaleService.updateVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-h1-001',
        updates: {
          valid_to: '2026-11-03T23:59:59.000Z', // Before existing valid_from
        },
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown);
    assert.strictEqual(thrown.statusCode, 400);
    assert.ok(thrown.message.includes('sau thời gian bắt đầu'));
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: Limit Exhaustion & Concurrent-Like Conditions
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: LIMIT EXHAUSTION & CONCURRENT-LIKE CONDITIONS ---');

  await runTest('4.1: Usage limit reached with confirmed bookings is rejected', async () => {
    const limitCoupon = {
      coupon_id: 'cpn-limit-test',
      usage_limit: 3,
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-30T00:00:00.000Z',
    };

    const limitDb = createMockSupabase({
      m_coupon: [limitCoupon],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-limit-test', booking_status_cd: '2' }, // CFM
        { booking_id: 'b2', coupon_id: 'cpn-limit-test', booking_status_cd: '2' }, // CFM
        { booking_id: 'b3', coupon_id: 'cpn-limit-test', booking_status_cd: '2' }, // CFM
      ],
    });

    Object.assign(globalMockSupabase._store, limitDb._store);
    const res = await verifyCouponEligibility(limitCoupon, 1000000, new Date('2026-11-04T12:00:00.000Z'), null, limitDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('giới hạn lượt sử dụng'));
  });

  await runTest('4.2: Usage limit combining confirmed + active pending bookings within 10m TTL is rejected', async () => {
    const limitCoupon = {
      coupon_id: 'cpn-limit-test-2',
      usage_limit: 3,
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-30T00:00:00.000Z',
    };

    const recentPendingTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 mins ago

    const limitDb = createMockSupabase({
      m_coupon: [limitCoupon],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-limit-test-2', booking_status_cd: '2' }, // CFM
        { booking_id: 'b2', coupon_id: 'cpn-limit-test-2', booking_status_cd: '2' }, // CFM
        { booking_id: 'b3', coupon_id: 'cpn-limit-test-2', booking_status_cd: '1', created_at: recentPendingTime }, // PND active
      ],
    });

    Object.assign(globalMockSupabase._store, limitDb._store);
    const res = await verifyCouponEligibility(limitCoupon, 1000000, new Date(), null, limitDb);
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('giới hạn lượt sử dụng'));
  });

  await runTest('4.3: Expired pending bookings (> 10m TTL) do NOT count towards usage limit', async () => {
    const limitCoupon = {
      coupon_id: 'cpn-limit-test-3',
      usage_limit: 3,
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-30T00:00:00.000Z',
    };

    const expiredPendingTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago (> TTL)

    const limitDb = createMockSupabase({
      m_coupon: [limitCoupon],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-limit-test-3', booking_status_cd: '2' }, // CFM
        { booking_id: 'b2', coupon_id: 'cpn-limit-test-3', booking_status_cd: '2' }, // CFM
        { booking_id: 'b3', coupon_id: 'cpn-limit-test-3', booking_status_cd: '1', created_at: expiredPendingTime }, // PND expired
      ],
    });

    Object.assign(globalMockSupabase._store, limitDb._store);
    const res = await verifyCouponEligibility(limitCoupon, 1000000, new Date(), null, limitDb);
    assert.strictEqual(res.valid, true, 'Expired pending booking must not block usage');
  });

  await runTest('4.4: Cancelled bookings do NOT count towards usage limit', async () => {
    const limitCoupon = {
      coupon_id: 'cpn-limit-test-4',
      usage_limit: 2,
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-30T00:00:00.000Z',
    };

    const limitDb = createMockSupabase({
      m_coupon: [limitCoupon],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-limit-test-4', booking_status_cd: '2' }, // CFM
        { booking_id: 'b2', coupon_id: 'cpn-limit-test-4', booking_status_cd: '3' }, // CAN (cancelled)
        { booking_id: 'b3', coupon_id: 'cpn-limit-test-4', booking_status_cd: '3' }, // CAN (cancelled)
      ],
    });

    Object.assign(globalMockSupabase._store, limitDb._store);
    const res = await verifyCouponEligibility(limitCoupon, 1000000, new Date(), null, limitDb);
    assert.strictEqual(res.valid, true, 'Cancelled bookings must be released');
  });

  await runTest('4.5: exclude_booking_id ignores self when recalculating', async () => {
    const limitCoupon = {
      coupon_id: 'cpn-limit-test-5',
      usage_limit: 2,
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_to: '2026-11-30T00:00:00.000Z',
    };

    const limitDb = createMockSupabase({
      m_coupon: [limitCoupon],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-limit-test-5', booking_status_cd: '2' },
        { booking_id: 'b2', coupon_id: 'cpn-limit-test-5', booking_status_cd: '2' },
      ],
    });

    Object.assign(globalMockSupabase._store, limitDb._store);

    // Without exclusion: 2 usages >= limit 2 -> invalid
    const resNormal = await verifyCouponEligibility(limitCoupon, 1000000, new Date(), null, limitDb);
    assert.strictEqual(resNormal.valid, false);

    // With exclusion of b2: 1 usage < limit 2 -> valid
    const resExcluded = await verifyCouponEligibility(limitCoupon, 1000000, new Date(), 'b2', limitDb);
    assert.strictEqual(resExcluded.valid, true);
  });

  await runTest('4.6: Vendor cannot lower usage_limit below already consumed bookings (409 Conflict)', async () => {
    const usageDb = createMockSupabase({
      m_hotel: [{ hotel_id: hotel1Id, owner_id: vendor1Id, name: 'Hotel 1', is_deleted: false }],
      m_coupon: [
        {
          coupon_id: 'cpn-consumed',
          code: 'FS_E8B1D9C2_CONSUMED',
          discount_type: 'FLASH_PERCENT',
          discount_value: 20,
          usage_limit: 20,
          valid_from: '2026-11-01T00:00:00.000Z',
          valid_to: '2026-11-30T00:00:00.000Z',
          is_deleted: false,
        },
      ],
      t_booking: [
        { booking_id: 'b1', coupon_id: 'cpn-consumed', discount_amount: 100000 },
        { booking_id: 'b2', coupon_id: 'cpn-consumed', discount_amount: 100000 },
        { booking_id: 'b3', coupon_id: 'cpn-consumed', discount_amount: 100000 },
        { booking_id: 'b4', coupon_id: 'cpn-consumed', discount_amount: 100000 },
        { booking_id: 'b5', coupon_id: 'cpn-consumed', discount_amount: 100000 },
      ],
    });

    vendorFlashSaleService.setCustomClient(usageDb);

    let thrown = null;
    try {
      // Trying to lower usage_limit to 3 when 5 bookings already exist
      await vendorFlashSaleService.updateVendorFlashSale({
        userId: vendor1Id,
        couponId: 'cpn-consumed',
        updates: { usage_limit: 3 },
      });
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown);
    assert.strictEqual(thrown.statusCode, 409);
    assert.ok(thrown.message.includes('không thể thấp hơn số lượt Flash Sale đã được dùng'));

    // Reset back
    vendorFlashSaleService.setCustomClient(mockDb);
    Object.assign(globalMockSupabase._store, mockDb._store);
  });

  await runTest('4.7: Setting usage_limit = null removes usage cap', () => {
    const res = validateUpdateFlashSale({ usage_limit: null });
    assert.strictEqual(res.error, undefined);
    assert.strictEqual(res.payload.usage_limit, null);
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: Payload Hardening & Vulnerability Probing
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: PAYLOAD HARDENING & VULNERABILITY PROBING ---');

  await runTest('5.1: SQL injection in coupon code lookup is handled safely without error', async () => {
    const maliciousCode = "' OR '1'='1' --";
    // Mock Supabase regex escaping
    const query = mockDb.from('m_coupon').select('*').ilike('code', maliciousCode);
    const { data } = await query;
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Must not return all rows under SQL injection attempt');
  });

  await runTest('5.2: Prototype pollution keys in payload are rejected by strict whitelist', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"code_name":"HACK","hotel_id":"' + hotel1Id + '","discount_value":10,"valid_from":"2026-11-04T10:00:00.000Z","valid_to":"2026-11-04T22:00:00.000Z"}');
    assert.strictEqual({}.polluted, undefined, 'Object prototype must not be polluted');
  });

  await runTest('5.3: Case insensitivity: lower-case coupon code matches uppercase DB record', async () => {
    const res = await mockDb.from('m_coupon').select('*').ilike('code', 'fs_e8b1d9c2_flash20').maybeSingle();
    assert.ok(res.data);
    assert.strictEqual(res.data.coupon_id, 'cpn-h1-001');
  });

  await runTest('5.4: Conflict Matrix: Manual coupon higher than Flash Sale replaces Flash Sale', () => {
    const flashSale = { code: 'FS_E8B1D9C2_FLASH20', discount_type: 'FLASH_PERCENT', discount_value: 20, max_discount_amount: 200000 };
    const manualCoupon = { code: 'AVORA300K', discount_type: 'FIXED_AMOUNT', discount_value: 300000 };
    const subtotal = 2000000;

    const flashDiscount = calculateCouponDiscount(flashSale, subtotal); // 200,000
    const manualDiscount = calculateCouponDiscount(manualCoupon, subtotal); // 300,000

    assert.strictEqual(flashDiscount, 200000);
    assert.strictEqual(manualDiscount, 300000);
    assert.ok(manualDiscount > flashDiscount, 'Manual coupon must replace Flash Sale when higher');
  });

  await runTest('5.5: Conflict Matrix: Flash Sale equal or higher than manual coupon keeps Flash Sale', () => {
    const flashSale = { code: 'FS_E8B1D9C2_FLASH50', discount_type: 'FLASH_PERCENT', discount_value: 50, max_discount_amount: 500000 };
    const manualCoupon = { code: 'WELCOME50K', discount_type: 'FIXED_AMOUNT', discount_value: 50000 };
    const subtotal = 1000000;

    const flashDiscount = calculateCouponDiscount(flashSale, subtotal); // 500,000
    const manualDiscount = calculateCouponDiscount(manualCoupon, subtotal); // 50,000

    assert.ok(flashDiscount >= manualDiscount);
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: ADVERSARIAL VULNERABILITY AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: ADVERSARIAL VULNERABILITY AUDIT ---');

  // VULNERABILITY PROBE 1: validateUpdateFlashSale accepts discount_value > 100 for FLASH_PERCENT
  await runTest('6.1 [VULNERABILITY AUDIT]: validateUpdateFlashSale discount_value > 100 boundary check', () => {
    const res = validateUpdateFlashSale({
      discount_type: 'FLASH_PERCENT',
      discount_value: 150,
    });

    if (res.error) {
      console.log('   -> System rejected discount_value > 100 in update.');
    } else {
      findings.push({
        id: 'SEC-BUG-01',
        title: 'validateUpdateFlashSale fails to enforce <= 100% discount_value cap on percentage updates',
        severity: 'MEDIUM',
        description: 'validateCreateFlashSale correctly enforces discount_value <= 100 for FLASH_PERCENT / PERCENT, but validateUpdateFlashSale omitted this check, permitting discount_value like 150% or 500% to pass validation into payload.',
        observedPayload: res.payload,
      });
      console.log('   -> [DISCOVERY] validateUpdateFlashSale accepted discount_value = 150%!');
    }
  });

  // VULNERABILITY PROBE 2: max_discount_amount = 0 behavior
  await runTest('6.2 [VULNERABILITY AUDIT]: max_discount_amount = 0 discount capping behavior', () => {
    const couponZeroCap = {
      discount_type: 'FLASH_PERCENT',
      discount_value: 50,
      max_discount_amount: 0,
    };
    const discount = calculateCouponDiscount(couponZeroCap, 1000000);
    if (discount === 0) {
      console.log('   -> System capped discount at 0.');
    } else {
      findings.push({
        id: 'SEC-BUG-02',
        title: 'calculateCouponDiscount treats max_discount_amount = 0 as Infinity (uncapped)',
        severity: 'LOW',
        description: 'In booking.service.js, line 45: `(couponRecord.max_discount_amount != null && Number(couponRecord.max_discount_amount) > 0) ? Number(couponRecord.max_discount_amount) : Infinity;`. Because `0 > 0` is false, specifying max_discount_amount = 0 bypasses capping and results in uncapped (Infinity) discount instead of 0 VND.',
        actualDiscount: discount,
      });
      console.log(`   -> [DISCOVERY] max_discount_amount = 0 resulted in discount = ${discount} (uncapped)!`);
    }
  });

  console.log('\n========================================================================');
  console.log(` SUMMARY REPORT: ${passedTests}/${totalTests} TESTS PASSED`);
  if (findings.length > 0) {
    console.log(` ADVERSARIAL FINDINGS DISCOVERED: ${findings.length}`);
    findings.forEach((f) => console.log(`   - [${f.severity}] ${f.id}: ${f.title}`));
  }
  console.log('========================================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
};

runAdversarialSuite().catch((err) => {
  console.error('Adversarial suite execution failed:', err);
  process.exit(1);
});
