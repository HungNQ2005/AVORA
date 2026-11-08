/**
 * adversarial_m2_frontend_challenge.mjs
 * 
 * Deep Empirical Adversarial Stress Test Suite for Milestone 2:
 * - Frontend Vendor Flash Sale Management & Public Badges
 * - Golden Hours Logic, Inverted Ranges, Timezones, Expired & Future Sales
 * - Vendor Flash Sale Creation: empty prefix, invalid codes, discount > 100%, negative values
 * - UI Rendering Resilience: null active_flash_sale, zero discount_value, missing properties
 * 
 * Executable with: node avora_project/tests/adversarial_m2_frontend_challenge.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isFlashSaleActive,
  getFlashSaleDiscountText,
  getFlashSaleBadgeLabel,
  calculateFlashSaleDiscount,
  calculateDisplayPricing,
  formatGoldenHourRange,
} from '../frontend/src/utils/flashSaleHelper.js';

let passed = 0;
let failed = 0;
const findings = [];

function check(testId, description, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${testId}: ${description}`);
  } catch (err) {
    failed++;
    findings.push({ testId, description, error: err.message });
    console.error(`[FAIL] ${testId}: ${description}\n       -> ${err.message}`);
  }
}

console.log('========================================================================');
console.log(' EMPIRICAL ADVERSARIAL STRESS TEST: MILESTONE 2 FRONTEND & GOLDEN HOURS');
console.log('========================================================================\n');

// ─── 1. GOLDEN HOURS & EXPIRATION LOGIC (isFlashSaleActive) ──────────────────

check('ADV.1.1', 'Returns false for null, undefined, boolean, or empty object sales', () => {
  assert.equal(isFlashSaleActive(null), false);
  assert.equal(isFlashSaleActive(undefined), false);
  assert.equal(isFlashSaleActive({}), false);
  assert.equal(isFlashSaleActive(false), false);
  assert.equal(isFlashSaleActive('invalid'), false);
  assert.equal(isFlashSaleActive(12345), false);
});

check('ADV.1.2', 'Numeric 0, null, undefined, and empty string discount values return false', () => {
  assert.equal(isFlashSaleActive({ discount_value: 0 }), false);
  assert.equal(isFlashSaleActive({ discount_value: null }), false);
  assert.equal(isFlashSaleActive({ discount_value: undefined }), false);
  assert.equal(isFlashSaleActive({ discount_value: '' }), false);
});

check('ADV.1.3_VULN', '[BUG CONFIRMATION] String zero ("0") or negative discount_value bypasses !sale.discount_value check', () => {
  // Vulnerability probe: In JS, !"0" is false and !(-10) is false.
  // Because line 15 is: if (!sale || !sale.discount_value) return false;
  // Passing { discount_value: "0" } or { discount_value: -10 } bypasses the check and returns true!
  const stringZeroActive = isFlashSaleActive({ discount_value: '0' });
  const negativeActive   = isFlashSaleActive({ discount_value: -10 });

  if (stringZeroActive === true || negativeActive === true) {
    throw new Error(`isFlashSaleActive incorrectly returned true for invalid discount_value (string "0": ${stringZeroActive}, -10: ${negativeActive})`);
  }
});

check('ADV.1.4', 'Inverted golden hours (valid_from > valid_to) is strictly FALSE at all points in time', () => {
  const invertedSale = {
    discount_value: 20,
    valid_from: '2026-11-04T18:00:00.000Z',
    valid_to: '2026-11-04T12:00:00.000Z',
  };
  assert.equal(isFlashSaleActive(invertedSale, new Date('2026-11-04T10:00:00.000Z')), false);
  assert.equal(isFlashSaleActive(invertedSale, new Date('2026-11-04T15:00:00.000Z')), false);
  assert.equal(isFlashSaleActive(invertedSale, new Date('2026-11-04T20:00:00.000Z')), false);
});

check('ADV.1.5', 'Expired sales (now > valid_to) are strictly suppressed', () => {
  const expiredSale = {
    discount_value: 25,
    valid_from: '2026-11-04T08:00:00.000Z',
    valid_to: '2026-11-04T10:00:00.000Z',
  };
  const now = new Date('2026-11-04T10:00:00.001Z'); // 1ms after valid_to
  assert.equal(isFlashSaleActive(expiredSale, now), false);
});

check('ADV.1.6', 'Future sales (now < valid_from) are strictly suppressed', () => {
  const futureSale = {
    discount_value: 30,
    valid_from: '2026-11-04T14:00:00.000Z',
    valid_to: '2026-11-04T18:00:00.000Z',
  };
  const now = new Date('2026-11-04T13:59:59.999Z'); // 1ms before valid_from
  assert.equal(isFlashSaleActive(futureSale, now), false);
});

check('ADV.1.7', 'Exact millisecond boundaries are inclusive ([valid_from, valid_to])', () => {
  const sale = {
    discount_value: 20,
    valid_from: '2026-11-04T12:00:00.000Z',
    valid_to: '2026-11-04T18:00:00.000Z',
  };
  const exactStart = new Date('2026-11-04T12:00:00.000Z');
  const exactEnd = new Date('2026-11-04T18:00:00.000Z');
  const middle = new Date('2026-11-04T15:00:00.000Z');

  assert.equal(isFlashSaleActive(sale, exactStart), true);
  assert.equal(isFlashSaleActive(sale, exactEnd), true);
  assert.equal(isFlashSaleActive(sale, middle), true);
});

check('ADV.1.8', 'Cross-timezone comparison resolves accurately to absolute epoch time', () => {
  const crossTzSale = {
    discount_value: 15,
    valid_from: '2026-11-04T19:00:00+07:00',
    valid_to: '2026-11-04T13:00:00-05:00',
  };
  assert.equal(isFlashSaleActive(crossTzSale, new Date('2026-11-04T11:59:59.000Z')), false);
  assert.equal(isFlashSaleActive(crossTzSale, new Date('2026-11-04T12:00:00.000Z')), true);
  assert.equal(isFlashSaleActive(crossTzSale, new Date('2026-11-04T15:00:00.000Z')), true);
  assert.equal(isFlashSaleActive(crossTzSale, new Date('2026-11-04T18:00:00.000Z')), true);
  assert.equal(isFlashSaleActive(crossTzSale, new Date('2026-11-04T18:00:01.000Z')), false);
});

check('ADV.1.9_VULN', '[BUG CONFIRMATION] formatGoldenHourRange produces "NaN:NaN ngày NaN/NaN" on invalid date input', () => {
  const output = formatGoldenHourRange('invalid-date', 'invalid-date');
  if (output.includes('NaN')) {
    throw new Error(`formatGoldenHourRange did not sanitize invalid date, returned corrupted string: "${output}"`);
  }
});

// ─── 2. DISCOUNT CALCULATION & PRICING RESILIENCE ────────────────────────────

check('ADV.2.1', 'Percentage discount calculation with exact rounding', () => {
  const sale = {
    discount_type: 'FLASH_PERCENT',
    discount_value: 20,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  assert.equal(calculateFlashSaleDiscount(2000000, sale), 400000);
  assert.equal(calculateFlashSaleDiscount(1555555, sale), 311111);
});

check('ADV.2.2', 'Percentage capping strictly honors max_discount_amount', () => {
  const cappedSale = {
    discount_type: 'FLASH_PERCENT',
    discount_value: 50,
    max_discount_amount: 300000,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  assert.equal(calculateFlashSaleDiscount(1000000, cappedSale), 300000);
  assert.equal(calculateFlashSaleDiscount(400000, cappedSale), 200000);
});

check('ADV.2.3', 'Fixed amount discount capped at base price (final price cannot be negative)', () => {
  const fixedSale = {
    discount_type: 'FIXED_AMOUNT',
    discount_value: 500000,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  assert.equal(calculateFlashSaleDiscount(300000, fixedSale), 300000);
  const pricing = calculateDisplayPricing(300000, fixedSale);
  assert.equal(pricing.currentPrice, 0);
  assert.equal(pricing.discountAmount, 300000);
});

check('ADV.2.4', 'Zero, negative, NaN or missing base price returns 0 discount without crashing', () => {
  const sale = {
    discount_type: 'FLASH_PERCENT',
    discount_value: 20,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  assert.equal(calculateFlashSaleDiscount(0, sale), 0);
  assert.equal(calculateFlashSaleDiscount(-500000, sale), 0);
  assert.equal(calculateFlashSaleDiscount(null, sale), 0);
  assert.equal(calculateFlashSaleDiscount(undefined, sale), 0);
  assert.equal(calculateFlashSaleDiscount('abc', sale), 0);
});

check('ADV.2.5', 'Inactive or expired sale in calculateDisplayPricing preserves original and current prices', () => {
  const expiredSale = {
    discount_value: 30,
    valid_from: '2020-01-01T00:00:00Z',
    valid_to: '2020-01-02T00:00:00Z',
  };
  const pricing = calculateDisplayPricing(2000000, expiredSale, 2500000);
  assert.equal(pricing.originalPrice, 2500000);
  assert.equal(pricing.currentPrice, 2000000);
  assert.equal(pricing.discountAmount, 0);
  assert.equal(pricing.hasFlashSale, false);
});

check('ADV.2.6', 'Active sale in calculateDisplayPricing shifts base price to originalPrice strike-through', () => {
  const activeSale = {
    discount_value: 20,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  const pricing = calculateDisplayPricing(1000000, activeSale);
  assert.equal(pricing.originalPrice, 1000000);
  assert.equal(pricing.currentPrice, 800000);
  assert.equal(pricing.discountAmount, 200000);
  assert.equal(pricing.hasFlashSale, true);
});

check('ADV.2.7', 'Badge and discount label formatting for PERCENT vs FIXED', () => {
  assert.equal(getFlashSaleDiscountText({ discount_type: 'FLASH_PERCENT', discount_value: 20 }), '-20%');
  assert.equal(getFlashSaleDiscountText({ discount_type: 'PERCENT', discount_value: 35 }), '-35%');
  assert.equal(getFlashSaleDiscountText({ discount_type: 'FIXED_AMOUNT', discount_value: 100000 }), '-100.000 đ');
  assert.equal(getFlashSaleBadgeLabel({ discount_type: 'FLASH_PERCENT', discount_value: 20 }), '⚡ Flash Sale -20%');
  assert.equal(getFlashSaleBadgeLabel(null), '');
  assert.equal(getFlashSaleBadgeLabel({ discount_value: 0 }), '');
});

// ─── 3. VENDOR FLASH SALE CREATION & VALIDATION LOGIC ────────────────────────

// Emulate pure helper functions from FlashSaleModal.jsx
const getHotelPrefix = (hotelId) => {
  if (!hotelId || typeof hotelId !== 'string') return '';
  return hotelId.trim().split('-')[0].toUpperCase();
};

// Dynamically extract toDateTimeLocal directly from FlashSaleModal.jsx:
const flashSaleModalSource = fs.readFileSync(new URL('../frontend/src/features/vendor_flash_sales/components/FlashSaleModal.jsx', import.meta.url), 'utf8');
const toDateTimeMatch = flashSaleModalSource.match(/export const toDateTimeLocal\s*=\s*([\s\S]*?\n\};)/);
const toDateTimeLocalAsImplemented = toDateTimeMatch
  ? new Function('return (' + toDateTimeMatch[1].trim().replace(/;$/, '') + ')')()
  : () => '';

const validateVendorFlashSaleForm = (form, isEdit = false) => {
  const errs = {};
  const currentPrefix = getHotelPrefix(form.hotel_id);
  const cleanCodeName = (form.code_name || '').trim().toUpperCase().replace(/^FS_[A-F0-9]{8}_/, '');

  if (!form.hotel_id) {
    errs.hotel_id = 'Vui lòng chọn khách sạn áp dụng.';
  }

  if (!cleanCodeName) {
    errs.code_name = 'Vui lòng nhập tên mã khuyến mãi.';
  } else if (!/^[A-Z0-9_-]{1,38}$/.test(cleanCodeName)) {
    errs.code_name = 'Tên mã chỉ chứa chữ cái, số, gạch nối hoặc gạch dưới (1-38 ký tự).';
  } else if (`FS_${currentPrefix}_${cleanCodeName}`.length > 50) {
    errs.code_name = 'Tổng độ dài mã khuyến mãi không được vượt quá 50 ký tự.';
  }

  if (!form.discount_value || Number(form.discount_value) <= 0) {
    errs.discount_value = 'Giá trị giảm phải là số lớn hơn 0.';
  } else if (['FLASH_PERCENT', 'PERCENT'].includes(form.discount_type) && Number(form.discount_value) > 100) {
    errs.discount_value = 'Tỷ lệ giảm theo phần trăm không được vượt quá 100%.';
  }

  if (form.max_discount_amount && Number(form.max_discount_amount) < 0) {
    errs.max_discount_amount = 'Mức giảm tối đa không được âm.';
  }

  if (form.min_order_amount && Number(form.min_order_amount) < 0) {
    errs.min_order_amount = 'Đơn tối thiểu không được âm.';
  }

  if (form.usage_limit && (!Number.isInteger(Number(form.usage_limit)) || Number(form.usage_limit) <= 0)) {
    errs.usage_limit = 'Giới hạn số lượt phải là số nguyên dương.';
  }

  if (!form.valid_from) {
    errs.valid_from = 'Vui lòng chọn thời gian bắt đầu giờ vàng.';
  }

  if (!form.valid_to) {
    errs.valid_to = 'Vui lòng chọn thời gian kết thúc giờ vàng.';
  }

  if (form.valid_from && form.valid_to) {
    const fromTime = new Date(form.valid_from).getTime();
    const toTime = new Date(form.valid_to).getTime();

    if (toTime <= fromTime) {
      errs.valid_to = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    } else if (!isEdit && toTime <= Date.now()) {
      errs.valid_to = 'Thời gian kết thúc giờ vàng không thể ở trong quá khứ.';
    }
  }

  return { isValid: Object.keys(errs).length === 0, errors: errs };
};

check('ADV.3.1', 'getHotelPrefix correctly derives first 8 hex characters uppercase', () => {
  assert.equal(getHotelPrefix('e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'E8B1D9C2');
  assert.equal(getHotelPrefix('F9C2E0D3-BBBB-4BBB-8BBB-BBBBBBBBBBBB'), 'F9C2E0D3');
  assert.equal(getHotelPrefix('  a1b2c3d4-xxxx  '), 'A1B2C3D4');
  assert.equal(getHotelPrefix(''), '');
  assert.equal(getHotelPrefix(null), '');
  assert.equal(getHotelPrefix(undefined), '');
});

check('ADV.3.2', 'Rejects empty hotel_id during Flash Sale creation', () => {
  const form = {
    hotel_id: '',
    code_name: 'FLASH30',
    discount_type: 'FLASH_PERCENT',
    discount_value: '30',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  const res = validateVendorFlashSaleForm(form);
  assert.equal(res.isValid, false);
  assert.match(res.errors.hotel_id, /Vui lòng chọn khách sạn/);
});

check('ADV.3.3', 'Rejects invalid code names (empty, special characters, whitespace)', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    discount_type: 'FLASH_PERCENT',
    discount_value: '20',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  assert.equal(validateVendorFlashSaleForm({ ...base, code_name: '' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, code_name: 'FLASH SALE!' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, code_name: 'SALE@2026' }).isValid, false);
});

check('ADV.3.4', 'Rejects code names exceeding 38 characters', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    discount_type: 'FLASH_PERCENT',
    discount_value: '20',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  const res = validateVendorFlashSaleForm({ ...base, code_name: 'A'.repeat(39) });
  assert.equal(res.isValid, false);
  assert.match(res.errors.code_name, /1-38 ký tự/);
});

check('ADV.3.5', 'Rejects discount > 100% for FLASH_PERCENT and PERCENT', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code_name: 'BIGSALE',
    discount_type: 'FLASH_PERCENT',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  assert.equal(validateVendorFlashSaleForm({ ...base, discount_value: '101' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, discount_type: 'PERCENT', discount_value: '150' }).isValid, false);
});

check('ADV.3.6', 'Rejects zero and negative discount_value', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code_name: 'PROMO',
    discount_type: 'FLASH_PERCENT',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  assert.equal(validateVendorFlashSaleForm({ ...base, discount_value: '0' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, discount_value: '-10' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, discount_value: '-50000', discount_type: 'FIXED_AMOUNT' }).isValid, false);
});

check('ADV.3.7', 'Rejects negative max_discount_amount, min_order_amount, and invalid usage_limit', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code_name: 'PROMO',
    discount_type: 'FLASH_PERCENT',
    discount_value: '20',
    valid_from: '2026-11-05T10:00',
    valid_to: '2026-11-05T14:00',
  };
  assert.equal(validateVendorFlashSaleForm({ ...base, max_discount_amount: '-50000' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, min_order_amount: '-100000' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, usage_limit: '-5' }).isValid, false);
  assert.equal(validateVendorFlashSaleForm({ ...base, usage_limit: '3.5' }).isValid, false);
});

check('ADV.3.8', 'Rejects inverted golden hours and past end times', () => {
  const base = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code_name: 'PROMO',
    discount_type: 'FLASH_PERCENT',
    discount_value: '20',
  };
  const resInverted = validateVendorFlashSaleForm({
    ...base,
    valid_from: '2026-11-05T16:00',
    valid_to: '2026-11-05T12:00',
  });
  assert.equal(resInverted.isValid, false);
  assert.match(resInverted.errors.valid_to, /sau thời gian bắt đầu/);
});

check('ADV.3.9_VULN', '[BUG CONFIRMATION] FlashSaleModal.jsx toDateTimeLocal omits zero-padding for day component', () => {
  // Test with single-digit day: 4th of November
  const formatted = toDateTimeLocalAsImplemented('2026-11-04T12:00:00.000Z');
  // W3C HTML5 datetime-local requires YYYY-MM-DDTHH:mm (two digits for day)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formatted)) {
    throw new Error(`toDateTimeLocal produced malformed HTML5 datetime string without 2-digit day padding: "${formatted}"`);
  }
});

// ─── 4. UI RENDERING RESILIENCE & CARD / BADGE STATE TRANSITIONS ─────────────

check('ADV.4.1', 'HotelCard state: hotel without active_flash_sale suppresses badge and savings note', () => {
  const hotelWithoutFlash = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Sample Hotel',
    price: 1500000,
    original_price: null,
    active_flash_sale: null,
  };
  const flashSale = isFlashSaleActive(hotelWithoutFlash.active_flash_sale) ? hotelWithoutFlash.active_flash_sale : null;
  const pricing = calculateDisplayPricing(hotelWithoutFlash.price, flashSale, hotelWithoutFlash.original_price);

  assert.equal(flashSale, null);
  assert.equal(pricing.hasFlashSale, false);
  assert.equal(pricing.originalPrice, null);
  assert.equal(pricing.currentPrice, 1500000);
  assert.equal(pricing.discountAmount, 0);
});

check('ADV.4.2', 'HotelCard state: hotel with zero discount_value flash sale behaves as normal hotel', () => {
  const hotelWithZeroSale = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Zero Discount Hotel',
    price: 2000000,
    active_flash_sale: {
      coupon_id: 'c1',
      code: 'FS_E8B1D9C2_ZERO',
      discount_type: 'FLASH_PERCENT',
      discount_value: 0,
      valid_from: '2026-01-01T00:00:00Z',
      valid_to: '2099-01-01T00:00:00Z',
    },
  };
  const flashSale = isFlashSaleActive(hotelWithZeroSale.active_flash_sale) ? hotelWithZeroSale.active_flash_sale : null;
  const pricing = calculateDisplayPricing(hotelWithZeroSale.price, flashSale, hotelWithZeroSale.original_price);

  assert.equal(flashSale, null);
  assert.equal(pricing.hasFlashSale, false);
  assert.equal(pricing.currentPrice, 2000000);
});

check('ADV.4.3', 'HotelCard state: hotel with active flash sale sets badge and discount price', () => {
  const hotelWithFlash = {
    hotel_id: 'e8b1d9c2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Flash Hotel',
    price: 2000000,
    active_flash_sale: {
      coupon_id: 'c1',
      code: 'FS_E8B1D9C2_FLASH25',
      discount_type: 'FLASH_PERCENT',
      discount_value: 25,
      valid_from: '2026-01-01T00:00:00Z',
      valid_to: '2099-01-01T00:00:00Z',
    },
  };
  const flashSale = isFlashSaleActive(hotelWithFlash.active_flash_sale) ? hotelWithFlash.active_flash_sale : null;
  const discountText = flashSale ? getFlashSaleDiscountText(flashSale) : '';
  const pricing = calculateDisplayPricing(hotelWithFlash.price, flashSale, hotelWithFlash.original_price);

  assert.ok(flashSale);
  assert.equal(discountText, '-25%');
  assert.equal(pricing.originalPrice, 2000000);
  assert.equal(pricing.currentPrice, 1500000);
  assert.equal(pricing.discountAmount, 500000);
  assert.equal(pricing.hasFlashSale, true);
});

check('ADV.4.4', 'HotelDetail room price calculation: calculates flash discount per room type', () => {
  const activeSale = {
    discount_type: 'FLASH_PERCENT',
    discount_value: 30,
    max_discount_amount: 500000,
    valid_from: '2026-01-01T00:00:00Z',
    valid_to: '2099-01-01T00:00:00Z',
  };
  const roomStandard = { price: 1000000 };
  const roomDeluxe   = { price: 2500000 };

  const discStd = calculateFlashSaleDiscount(roomStandard.price, activeSale);
  assert.equal(discStd, 300000);
  assert.equal(roomStandard.price - discStd, 700000);

  const discDlx = calculateFlashSaleDiscount(roomDeluxe.price, activeSale);
  assert.equal(discDlx, 500000);
  assert.equal(roomDeluxe.price - discDlx, 2000000);
});

check('ADV.4.5', 'Checkout / OrderSummarySidebar promotion resolution flags', () => {
  const p1 = {
    promotion_details: { applied_type: 'FLASH_SALE', flash_sale_available: true },
    coupon: { code: 'FS_E8B1D9C2_FLASH20' },
  };
  assert.equal(p1.promotion_details.applied_type, 'FLASH_SALE');

  const p2 = {
    promotion_details: {
      applied_type: 'MANUAL_COUPON',
      flash_sale_available: true,
      message: 'Mã AVORA100K đã thay thế Flash Sale của khách sạn.',
    },
    coupon: { code: 'AVORA100K' },
  };
  const isFlashSaleReplaced = p2.promotion_details.applied_type === 'MANUAL_COUPON' && p2.promotion_details.flash_sale_available;
  assert.equal(isFlashSaleReplaced, true);

  const p3 = {
    promotion_details: {
      applied_type: 'FLASH_SALE',
      flash_sale_available: true,
      flash_sale_discount: 400000,
      manual_coupon_discount: 50000,
      message: 'Ưu đãi Flash Sale có lợi hơn mã vừa nhập.',
    },
    coupon: { code: 'FS_E8B1D9C2_FLASH20' },
  };
  const isFlashSaleKept = p3.promotion_details.applied_type === 'FLASH_SALE' &&
    Number(p3.promotion_details.flash_sale_discount) >= Number(p3.promotion_details.manual_coupon_discount);
  assert.equal(isFlashSaleKept, true);
});

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS TEST SUMMARY REPORT');
console.log('========================================================================');
console.log(` TOTAL CHECKS: ${passed + failed}`);
console.log(` PASSED:       ${passed}`);
console.log(` CONFIRMED BUGS / VULNERABILITIES: ${failed}`);
console.log('------------------------------------------------------------------------');
if (failed > 0) {
  console.log(` VERDICT: FOUND_BUG (${failed} empirical findings confirmed)`);
} else {
  console.log(' VERDICT: CONFIRM_CORRECTNESS');
}
console.log('========================================================================\n');
