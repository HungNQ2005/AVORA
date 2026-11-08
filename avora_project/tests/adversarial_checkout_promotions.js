'use strict';

/**
 * AVORA Milestone 2 Adversarial Challenge Suite: Checkout Flow & Real-time Price Sync
 * Archetype: Empirical Challenger (Critic & Specialist)
 *
 * Verifies:
 * 1. Manual coupon apply/remove cycles: enter code -> replace flash sale -> "Bỏ mã" -> flash sale restores cleanly
 * 2. Conflict resolution banners: verify all 4 banner variations render with accurate messaging & classes
 * 3. Booking submission payload: verify coupon_code is passed accurately across all scenarios
 * 4. Tamper & edge-case resiliency (untrimmed/lowercase codes, state switches, cross-hotel isolation)
 */

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

// ─── 1. In-Memory Database Harness ──────────────────────────────────────────

const createMockDatabase = () => {
  const store = {
    m_hotel: [
      {
        hotel_id: 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0',
        name: 'Avora Ocean Resort Da Nang',
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
    ],
    t_inventory: [
      {
        room_type_id: 'rt-deluxe-01',
        target_date: '2026-11-10',
        available_rooms: 5,
        locked_rooms: 0,
        current_price: 1000000,
      },
    ],
    m_coupon: [
      {
        coupon_id: 'cpn-flash-hotel-a',
        code: 'FS_E8B1D9C2_FLASH20',
        discount_type: 'FLASH_PERCENT',
        discount_value: 20, // 20% on 1,000,000 = 200,000
        max_discount_amount: 500000,
        min_order_amount: 0,
        usage_limit: 100,
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_to: '2026-11-30T23:59:59.000Z',
        is_deleted: false,
      },
      {
        coupon_id: 'cpn-platform-higher',
        code: 'AVORA100K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 300000, // 300,000 > 200,000 (replaces Flash Sale)
        max_discount_amount: null,
        min_order_amount: 500000,
        usage_limit: 100,
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_to: '2026-11-30T23:59:59.000Z',
        is_deleted: false,
      },
      {
        coupon_id: 'cpn-platform-lower',
        code: 'AVORA50K',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 50000, // 50,000 < 200,000 (Flash Sale kept)
        max_discount_amount: null,
        min_order_amount: 200000,
        usage_limit: 100,
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_to: '2026-11-30T23:59:59.000Z',
        is_deleted: false,
      },
      {
        coupon_id: 'cpn-flash-hotel-b',
        code: 'FS_11111111_OTHERHOTEL',
        discount_type: 'FLASH_PERCENT',
        discount_value: 50,
        max_discount_amount: 1000000,
        min_order_amount: 0,
        usage_limit: 10,
        valid_from: '2026-11-01T00:00:00.000Z',
        valid_to: '2026-11-30T23:59:59.000Z',
        is_deleted: false,
      },
    ],
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
        const rawItems = Array.isArray(record) ? record : [record];
        const items = [];
        rawItems.forEach((item) => {
          const cloned = { ...item };
          if (tableName === 't_booking' && !cloned.booking_id) {
            cloned.booking_id = `bk-${Math.random().toString(36).substring(2, 10)}`;
            cloned.created_at = cloned.created_at || new Date().toISOString();
          }
          if (tableName === 't_booking_detail' && !cloned.booking_detail_id) {
            cloned.booking_detail_id = `bkd-${Math.random().toString(36).substring(2, 10)}`;
          }
          items.push(cloned);
          if (!store[tableName]) store[tableName] = [];
          store[tableName].push(cloned);
        });
        rows = items;
        return builder;
      },
      update: (patch) => {
        rows.forEach((r) => {
          Object.assign(r, patch);
          const found = store[tableName].find((orig) => orig === r);
          if (found) Object.assign(found, patch);
        });
        return builder;
      },
      delete: () => {
        rows.forEach((r) => {
          const idx = store[tableName].indexOf(r);
          if (idx >= 0) store[tableName].splice(idx, 1);
        });
        return builder;
      },
      then: (resolve, reject) => {
        if (headOnly) {
          return resolve({ count: rows.length, data: null, error: null });
        }
        if (singleMode) {
          if (rows.length === 0) return resolve({ data: null, error: new Error('Row not found') });
          return resolve({ data: rows[0], error: null });
        }
        if (maybeSingleMode) {
          return resolve({ data: rows.length > 0 ? rows[0] : null, error: null });
        }
        return resolve({ count: countExact ? rows.length : null, data: rows, error: null });
      },
    };

    return builder;
  };

  return {
    from: (tableName) => createQuery(tableName),
    _store: store,
  };
};

// ─── 2. Inject Mock Database into Backend ───────────────────────────────────

const mockDb = createMockDatabase();
const clientPath = path.resolve(__dirname, '../backend/src/config/supabaseClient.js');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: mockDb,
};

const bookingService = require('../backend/src/features/bookings/booking.service');

// ─── 3. Global Test Harness State ───────────────────────────────────────────

const HOTEL_ID = 'e8b1d9c2-570a-4b7e-9764-7fb2a188f5d0';
const ROOM_TYPE_ID = 'rt-deluxe-01';
const CHECK_IN = '2026-11-10';
const CHECK_OUT = '2026-11-11';
const CUSTOMER_USER = {
  user_id: 'usr-customer-99',
  role_name: 'CUS',
  role_cd: '1',
  full_name: 'Nguyễn Văn Test',
  phone: '0901234567',
};

const testResults = [];
const recordTest = (suite, name, passed, details = '') => {
  testResults.push({ suite, name, passed, details });
  const tag = passed ? '  [PASS]' : '  [FAIL]';
  console.log(`${tag} [${suite}] ${name}${details ? ' -> ' + details : ''}`);
};

// ─── 4. Main Adversarial Verification Runner ────────────────────────────────

async function runAdversarialVerification() {
  console.log('========================================================================');
  console.log(' AVORA M2 CHANGER ADVERSARIAL VERIFICATION HARNESS');
  console.log(' Target: Checkout Flow, Real-time Price Sync & Promotion Engine');
  console.log('========================================================================\n');

  // Load Vite SSR to render actual OrderSummarySidebar.jsx
  const frontendPath = path.resolve(__dirname, '../frontend');
  const viteIndexUrl = pathToFileURL(path.resolve(frontendPath, 'node_modules/vite/dist/node/index.js')).href;
  const reactUrl = pathToFileURL(path.resolve(frontendPath, 'node_modules/react/index.js')).href;
  const reactDomServerUrl = pathToFileURL(path.resolve(frontendPath, 'node_modules/react-dom/server.node.js')).href;

  const { createServer } = await import(viteIndexUrl);
  const ReactModule = await import(reactUrl);
  const React = ReactModule.default || ReactModule;
  const { renderToStaticMarkup } = await import(reactDomServerUrl);

  const viteServer = await createServer({
    root: frontendPath,
    server: { middlewareMode: true },
    logLevel: 'silent',
  });

  const sidebarModule = await viteServer.ssrLoadModule('/src/features/bookings/components/OrderSummarySidebar.jsx');
  const OrderSummarySidebar = sidebarModule.default;

  const defaultHotelInfo = {
    hotel_id: HOTEL_ID,
    name: 'Avora Ocean Resort Da Nang',
    address: '123 Võ Nguyên Giáp, Đà Nẵng',
    star_quality: 5,
    rating_score: 9.2,
    review_count: 120,
    thumbnail_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
  };

  try {
    // ========================================================================
    // TRACK 1: Manual Coupon Apply/Remove Cycles & State Transitions
    // ========================================================================
    console.log('--- TRACK 1: MANUAL COUPON APPLY / REMOVE CYCLES & STATE TRANSITIONS ---');

    // Test 1.1: Initial State Auto-Detection (Flash Sale applied, input clean)
    const initialPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    const isAutoApplied =
      initialPricing.coupon?.code === 'FS_E8B1D9C2_FLASH20' &&
      initialPricing.discount_amount === 200000 &&
      initialPricing.promotion_details?.applied_type === 'FLASH_SALE';

    const initialHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: initialPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: '', // User hasn't typed anything
      })
    );

    const hasFlashBanner = initialHtml.includes('summary-promo-banner--flash');
    const hasApplyBtn = initialHtml.includes('Áp dụng');
    const noRemoveBtn = !initialHtml.includes('Bỏ mã');

    recordTest(
      'Track 1',
      'T1.1: Initial Auto-Detection: Flash Sale auto-applied, input clean, "Áp dụng" visible',
      isAutoApplied && hasFlashBanner && hasApplyBtn && noRemoveBtn,
      `Coupon: ${initialPricing.coupon?.code}, Discount: ${initialPricing.discount_amount}`
    );

    // Test 1.2: Enter higher manual coupon (AVORA100K replaces Flash Sale)
    const replacedPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA100K',
    });

    const isReplaced =
      replacedPricing.coupon?.code === 'AVORA100K' &&
      replacedPricing.discount_amount === 300000 &&
      replacedPricing.promotion_details?.applied_type === 'MANUAL_COUPON' &&
      replacedPricing.promotion_details?.flash_sale_available === true;

    const replacedHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: replacedPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'AVORA100K', // Synchronized input
      })
    );

    const hasReplacedBanner = replacedHtml.includes('summary-promo-banner--replaced');
    const hasOptimizationBadge = replacedHtml.includes('TỐI ƯU GIÁ');
    const hasRemoveBtn = replacedHtml.includes('Bỏ mã') && replacedHtml.includes('summary-coupon-btn--remove');

    recordTest(
      'Track 1',
      'T1.2: Manual Coupon Replacement: AVORA100K replaces Flash Sale, button toggles to "Bỏ mã"',
      isReplaced && hasReplacedBanner && hasOptimizationBadge && hasRemoveBtn,
      `New coupon: AVORA100K, New discount: ${replacedPricing.discount_amount}`
    );

    // Test 1.3: User clicks "Bỏ mã" (Remove coupon action without reload)
    // Simulating handleRemoveCoupon: calls calculatePricing with empty code
    const restoredPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: '', // Empty code passed on removal
    });

    const isRestored =
      restoredPricing.coupon?.code === 'FS_E8B1D9C2_FLASH20' &&
      restoredPricing.discount_amount === 200000 &&
      restoredPricing.promotion_details?.applied_type === 'FLASH_SALE';

    const restoredHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: restoredPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: '', // Input cleared
      })
    );

    const hasRestoredFlashBanner = restoredHtml.includes('summary-promo-banner--flash');
    const noReplacedBannerAfterRemove = !restoredHtml.includes('summary-promo-banner--replaced');
    const buttonSwitchedBack = restoredHtml.includes('Áp dụng') && !restoredHtml.includes('Bỏ mã');

    recordTest(
      'Track 1',
      'T1.3: Click "Bỏ mã": Flash Sale cleanly restored, banner reverts to Flash, button to "Áp dụng"',
      isRestored && hasRestoredFlashBanner && noReplacedBannerAfterRemove && buttonSwitchedBack,
      `Restored coupon: ${restoredPricing.coupon?.code}`
    );

    // Test 1.4: Multi-Cycle Repeated Stress (5x Apply/Remove Cycles)
    let multiCycleSuccess = true;
    for (let cycle = 1; cycle <= 5; cycle++) {
      const pApply = await bookingService.calculatePricing({
        hotel_id: HOTEL_ID,
        room_type_id: ROOM_TYPE_ID,
        quantity: 1,
        check_in_date: CHECK_IN,
        check_out_date: CHECK_OUT,
        coupon_code: 'AVORA100K',
      });
      if (pApply.coupon?.code !== 'AVORA100K' || pApply.discount_amount !== 300000) {
        multiCycleSuccess = false;
        break;
      }
      const pRemove = await bookingService.calculatePricing({
        hotel_id: HOTEL_ID,
        room_type_id: ROOM_TYPE_ID,
        quantity: 1,
        check_in_date: CHECK_IN,
        check_out_date: CHECK_OUT,
        coupon_code: '',
      });
      if (pRemove.coupon?.code !== 'FS_E8B1D9C2_FLASH20' || pRemove.discount_amount !== 200000) {
        multiCycleSuccess = false;
        break;
      }
    }

    recordTest(
      'Track 1',
      'T1.4: Multi-Cycle Stress Test: 5 consecutive Apply/Remove cycles with 0 drift or leakage',
      multiCycleSuccess,
      '5/5 cycles completed deterministically'
    );

    // Test 1.5: Input Text Modification Away From Applied Code
    // When AVORA100K is applied, but user types "AVORA10" in the box
    const modifiedInputHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: replacedPricing, // Applied coupon is AVORA100K
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'AVORA10', // User modified input
      })
    );

    // Button should switch from "Bỏ mã" to "Áp dụng" because input does not match applied coupon
    const showsApplyOnEdit = modifiedInputHtml.includes('Áp dụng') && !modifiedInputHtml.includes('Bỏ mã');

    recordTest(
      'Track 1',
      'T1.5: Smart Button Toggle: Editing input away from applied coupon switches "Bỏ mã" -> "Áp dụng"',
      showsApplyOnEdit,
      'Allows submitting newly typed coupon'
    );

    // Test 1.6: Case-Insensitivity & Whitespace Resiliency
    const whitespacePricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: '   avora100k   ',
    });

    const isWhitespaceNormalized =
      whitespacePricing.coupon?.code === 'AVORA100K' &&
      whitespacePricing.discount_amount === 300000;

    recordTest(
      'Track 1',
      'T1.6: Normalization Guard: Lowercase & padded code accepted and resolved as AVORA100K',
      isWhitespaceNormalized,
      `Resolved: ${whitespacePricing.coupon?.code}`
    );

    // ========================================================================
    // TRACK 2: Conflict Resolution Banners (All 4 Variations)
    // ========================================================================
    console.log('\n--- TRACK 2: CONFLICT RESOLUTION BANNERS (ALL 4 VARIATIONS) ---');

    // Variation 1: summary-promo-banner--flash
    const var1Html = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: initialPricing, // Flash Sale active
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: '',
      })
    );
    const var1Valid =
      var1Html.includes('summary-promo-banner--flash') &&
      var1Html.includes('⚡') &&
      var1Html.includes('Ưu đãi Flash Sale Khung Giờ Vàng') &&
      !var1Html.includes('summary-promo-banner--replaced') &&
      !var1Html.includes('summary-promo-banner--kept') &&
      !var1Html.includes('summary-promo-banner--coupon');

    recordTest(
      'Track 2',
      'T2.1: Banner Variation 1: summary-promo-banner--flash (Golden Hour Flash Sale)',
      var1Valid,
      'Amber theme, lightning icon ⚡, exclusive render'
    );

    // Variation 2: summary-promo-banner--replaced
    const var2Html = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: replacedPricing, // AVORA100K replaced Flash Sale
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'AVORA100K',
      })
    );
    const var2Valid =
      var2Html.includes('summary-promo-banner--replaced') &&
      var2Html.includes('TỐI ƯU GIÁ') &&
      var2Html.includes('Mã giảm giá đã thay thế Flash Sale') &&
      !var2Html.includes('summary-promo-banner--flash') &&
      !var2Html.includes('summary-promo-banner--kept') &&
      !var2Html.includes('summary-promo-banner--coupon');

    recordTest(
      'Track 2',
      'T2.2: Banner Variation 2: summary-promo-banner--replaced (Manual Coupon Overrode Flash Sale)',
      var2Valid,
      'Blue theme, badge "TỐI ƯU GIÁ", exclusive render'
    );

    // Variation 3: summary-promo-banner--kept (Flash Sale kept over inferior coupon)
    const inferiorPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA50K', // 50,000 < 200,000
    });

    const var3Html = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: inferiorPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'AVORA50K',
      })
    );

    const var3Valid =
      var3Html.includes('summary-promo-banner--kept') &&
      var3Html.includes('BẢO VỆ QUYỀN LỢI') &&
      var3Html.includes('Giữ ưu đãi Flash Sale có lợi nhất') &&
      !var3Html.includes('summary-promo-banner--replaced') &&
      !var3Html.includes('summary-promo-banner--flash') &&
      !var3Html.includes('summary-promo-banner--coupon');

    recordTest(
      'Track 2',
      'T2.3: Banner Variation 3: summary-promo-banner--kept (Flash Sale Protected Over Inferior Coupon)',
      var3Valid,
      'Emerald theme, badge "BẢO VỆ QUYỀN LỢI", exclusive render'
    );

    // Variation 4: summary-promo-banner--coupon (Manual Coupon with No Flash Sale)
    // Temporarily soft-delete hotel flash sale
    const hotelFlashCoupon = mockDb._store.m_coupon.find((c) => c.code === 'FS_E8B1D9C2_FLASH20');
    hotelFlashCoupon.is_deleted = true;

    const noFlashPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA50K',
    });

    const var4Html = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: noFlashPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'AVORA50K',
      })
    );

    const var4Valid =
      var4Html.includes('summary-promo-banner--coupon') &&
      var4Html.includes('🎟️') &&
      var4Html.includes('Mã giảm giá đã áp dụng') &&
      !var4Html.includes('summary-promo-banner--replaced') &&
      !var4Html.includes('summary-promo-banner--kept') &&
      !var4Html.includes('summary-promo-banner--flash');

    recordTest(
      'Track 2',
      'T2.4: Banner Variation 4: summary-promo-banner--coupon (Standard Coupon Without Flash Sale)',
      var4Valid,
      'Standard coupon theme, icon 🎟️, exclusive render'
    );

    // Variation 5: Zero Promotion State (No Flash Sale, No Coupon)
    const zeroPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    const zeroHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: zeroPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: '',
      })
    );

    const noBannersRendered = !zeroHtml.includes('summary-promo-banner');

    recordTest(
      'Track 2',
      'T2.5: Zero Promotion State: Clean suppression of all 4 banners when no promo active',
      noBannersRendered,
      'No banners in DOM'
    );

    // Variation 6: Direct Error Feedback Under Input (Invalid Coupon When No Flash Sale)
    const invalidPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'FAKE999',
    });

    const errorHtml = renderToStaticMarkup(
      React.createElement(OrderSummarySidebar, {
        hotel: defaultHotelInfo,
        pricing: invalidPricing,
        checkInDate: CHECK_IN,
        checkOutDate: CHECK_OUT,
        nights: 1,
        couponCode: 'FAKE999',
        couponMessage: invalidPricing.coupon_message,
      })
    );

    const hasErrorMessage =
      errorHtml.includes('summary-coupon-msg error') &&
      errorHtml.includes('FAKE999');

    recordTest(
      'Track 2',
      'T2.6: Direct Inline Error: Invalid coupon shows error feedback below input box',
      hasErrorMessage,
      `Message: "${invalidPricing.coupon_message}"`
    );

    // Restore hotel flash sale
    hotelFlashCoupon.is_deleted = false;

    // ========================================================================
    // TRACK 3: Booking Submission Payload Verification
    // ========================================================================
    console.log('\n--- TRACK 3: BOOKING SUBMISSION PAYLOAD VERIFICATION ---');

    // Helper to simulate BookingPage.jsx payload constructor
    const constructBookingPayload = (pricingState, guestInfo) => ({
      hotel_id: pricingState.hotel_id,
      room_type_id: pricingState.rooms[0].room_type_id,
      quantity: 1,
      rooms: (pricingState.rooms || []).map((r) => ({
        room_type_id: r.room_type_id,
        quantity: r.quantity || 1,
      })),
      check_in_date: pricingState.check_in_date,
      check_out_date: pricingState.check_out_date,
      guest_name: guestInfo.full_name,
      guest_phone: guestInfo.phone,
      special_request: null,
      coupon_code: pricingState.coupon?.code || null,
    });

    // Test 3.1: Flash Sale Auto-Applied Booking Payload
    const pricingForFS = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    const payloadFS = constructBookingPayload(pricingForFS, CUSTOMER_USER);
    assert.strictEqual(payloadFS.coupon_code, 'FS_E8B1D9C2_FLASH20');

    const bookingResultFS = await bookingService.createBooking(payloadFS, CUSTOMER_USER);
    const dbRecordFS = mockDb._store.t_booking.find((b) => b.booking_id === bookingResultFS.booking_id);

    const isFSBookingAccurate =
      dbRecordFS &&
      dbRecordFS.coupon_id === 'cpn-flash-hotel-a' &&
      Number(dbRecordFS.discount_amount) === 200000 &&
      Number(dbRecordFS.total_amount) === 800000;

    recordTest(
      'Track 3',
      'T3.1: Flash Sale Submission: Payload passes Flash Sale code, t_booking records coupon_id & 200k discount',
      isFSBookingAccurate,
      `Booking ID: ${dbRecordFS?.booking_id}, coupon_id: ${dbRecordFS?.coupon_id}`
    );

    // Test 3.2: Manual Coupon Replaced Flash Sale Booking Payload
    const pricingForManual = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA100K',
    });

    const payloadManual = constructBookingPayload(pricingForManual, {
      ...CUSTOMER_USER,
      full_name: 'Trần Thị Hạnh',
      phone: '0988776655',
    });
    assert.strictEqual(payloadManual.coupon_code, 'AVORA100K');

    const bookingResultManual = await bookingService.createBooking(payloadManual, {
      ...CUSTOMER_USER,
      user_id: 'usr-customer-98',
    });
    const dbRecordManual = mockDb._store.t_booking.find((b) => b.booking_id === bookingResultManual.booking_id);

    const isManualBookingAccurate =
      dbRecordManual &&
      dbRecordManual.coupon_id === 'cpn-platform-higher' &&
      Number(dbRecordManual.discount_amount) === 300000 &&
      Number(dbRecordManual.total_amount) === 700000;

    recordTest(
      'Track 3',
      'T3.2: Manual Coupon Submission: Payload passes AVORA100K, t_booking records manual coupon_id & 300k discount',
      isManualBookingAccurate,
      `Booking ID: ${dbRecordManual?.booking_id}, coupon_id: ${dbRecordManual?.coupon_id}`
    );

    // Test 3.3: Post-"Bỏ mã" Restored Flash Sale Booking Payload
    const pricingPostRemove = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: '', // Cleared
    });

    const payloadPostRemove = constructBookingPayload(pricingPostRemove, {
      ...CUSTOMER_USER,
      full_name: 'Lê Minh Tuấn',
      phone: '0911223344',
    });
    assert.strictEqual(payloadPostRemove.coupon_code, 'FS_E8B1D9C2_FLASH20');

    const bookingResultPostRemove = await bookingService.createBooking(payloadPostRemove, {
      ...CUSTOMER_USER,
      user_id: 'usr-customer-97',
    });
    const dbRecordPostRemove = mockDb._store.t_booking.find((b) => b.booking_id === bookingResultPostRemove.booking_id);

    const isPostRemoveAccurate =
      dbRecordPostRemove &&
      dbRecordPostRemove.coupon_id === 'cpn-flash-hotel-a' &&
      Number(dbRecordPostRemove.discount_amount) === 200000;

    recordTest(
      'Track 3',
      'T3.3: Post-"Bỏ mã" Submission: Restored Flash Sale correctly persisted in t_booking',
      isPostRemoveAccurate,
      `Booking ID: ${dbRecordPostRemove?.booking_id}, coupon_id: ${dbRecordPostRemove?.coupon_id}`
    );

    // Test 3.4: Inferior Coupon Submitted (Best Value Protection In Booking)
    // User typed AVORA50K, but system kept Flash Sale
    const pricingInferior = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'AVORA50K',
    });

    const payloadInferior = constructBookingPayload(pricingInferior, {
      ...CUSTOMER_USER,
      full_name: 'Phạm Đức Anh',
      phone: '0933445566',
    });
    // System passed bestFlashSale code
    assert.strictEqual(payloadInferior.coupon_code, 'FS_E8B1D9C2_FLASH20');

    const bookingResultInferior = await bookingService.createBooking(payloadInferior, {
      ...CUSTOMER_USER,
      user_id: 'usr-customer-96',
    });
    const dbRecordInferior = mockDb._store.t_booking.find((b) => b.booking_id === bookingResultInferior.booking_id);

    const isInferiorProtected =
      dbRecordInferior &&
      dbRecordInferior.coupon_id === 'cpn-flash-hotel-a' &&
      Number(dbRecordInferior.discount_amount) === 200000;

    recordTest(
      'Track 3',
      'T3.4: Customer Rights Protection: Inferior coupon submitted persists Flash Sale with 200k savings',
      isInferiorProtected,
      `Customer saved 200,000 VND instead of 50,000 VND`
    );

    // Test 3.5: No Promotion Booking Payload
    hotelFlashCoupon.is_deleted = true;
    const pricingNoPromo = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
    });

    const payloadNoPromo = constructBookingPayload(pricingNoPromo, {
      ...CUSTOMER_USER,
      full_name: 'Võ Thị Mai',
      phone: '0944556677',
    });
    assert.strictEqual(payloadNoPromo.coupon_code, null);

    const bookingResultNoPromo = await bookingService.createBooking(payloadNoPromo, {
      ...CUSTOMER_USER,
      user_id: 'usr-customer-95',
    });
    const dbRecordNoPromo = mockDb._store.t_booking.find((b) => b.booking_id === bookingResultNoPromo.booking_id);

    const isNoPromoAccurate =
      dbRecordNoPromo &&
      dbRecordNoPromo.coupon_id === null &&
      Number(dbRecordNoPromo.discount_amount) === 0 &&
      Number(dbRecordNoPromo.total_amount) === 1000000;

    recordTest(
      'Track 3',
      'T3.5: Zero Promotion Submission: Payload coupon_code is null, t_booking records coupon_id=null, discount=0',
      isNoPromoAccurate,
      `Total: ${dbRecordNoPromo?.total_amount} VND`
    );
    hotelFlashCoupon.is_deleted = false;

    // Test 3.6: Adversarial Spoofing Guard (Sending Another Hotel's Flash Sale)
    const spoofPricing = await bookingService.calculatePricing({
      hotel_id: HOTEL_ID,
      room_type_id: ROOM_TYPE_ID,
      quantity: 1,
      check_in_date: CHECK_IN,
      check_out_date: CHECK_OUT,
      coupon_code: 'FS_11111111_OTHERHOTEL', // Belongs to hotel 11111111
    });

    // Backend must reject other hotel's flash sale and keep Hotel A's active flash sale
    const isSpoofDefended =
      spoofPricing.coupon?.code === 'FS_E8B1D9C2_FLASH20' &&
      spoofPricing.coupon_message?.includes('thuộc về khách sạn khác');

    recordTest(
      'Track 3',
      'T3.6: Adversarial Spoofing Guard: Foreign hotel flash sale rejected with security notice',
      isSpoofDefended,
      `Message: "${spoofPricing.coupon_message}"`
    );

  } finally {
    await viteServer.close();
  }

  // ─── 5. Summary & Verdict ──────────────────────────────────────────────────
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(' ADVERSARIAL CHALLENGE SUMMARY REPORT');
  console.log('========================================================================');
  console.log(` TOTAL ADVERSARIAL TESTS: ${total}`);
  console.log(` PASSED:                 ${passed}`);
  console.log(` FAILED:                 ${failed}`);
  console.log('------------------------------------------------------------------------');

  if (failed === 0) {
    console.log(' VERDICT: CONFIRM_CORRECTNESS (100% EMPIRICAL SUCCESS)');
    console.log('========================================================================');
    process.exit(0);
  } else {
    console.error(` VERDICT: FOUND_BUG (${failed} TESTS FAILED)`);
    console.log('========================================================================');
    process.exit(1);
  }
}

runAdversarialVerification().catch((err) => {
  console.error('\n[FATAL ERROR IN HARNESS]:', err);
  process.exit(1);
});
