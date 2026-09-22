'use strict';

/**
 * Maps a system code string to its human-readable name.
 * Used across the AVORA platform for displaying code labels.
 *
 * @param {string} code - The system code (e.g. 'INS', 'VCB')
 * @returns {string} Human-readable name, or the original code if not found
 */

const CODE_NAME_MAP = {
  // ─── CRUD Operations ─────────────────────────────────────
  INS: 'Insert',
  UPD: 'Update',
  DEL: 'Delete',
  LGN: 'Login',

  // ─── Banks ───────────────────────────────────────────────
  VCB: 'Vietcombank',
  HDB: 'HDBank',
  SHB: 'SHB',
  VIB: 'VIB',
  TPB: 'TPBank',
  LPB: 'LPBank',
  EIB: 'Eximbank',
  MSB: 'MSB',
  OCB: 'OCB',
  SSB: 'SeABank',
  NAB: 'Nam A Bank',
  BID: 'BIDV',
  KLB: 'KienlongBank',
  CTG: 'VietinBank',
  VBA: 'Agribank',
  TCB: 'Techcombank',
  MBB: 'MB Bank',
  VPB: 'VPBank',
  ACB: 'ACB',
  STB: 'Sacombank',

  // ─── Booking / Order Status ───────────────────────────────
  PND: 'Pending',
  CFM: 'Confirmed',
  CAN: 'Cancelled',
  APR: 'Approved',
  REJ: 'Rejected',

  // ─── Financial Transactions ───────────────────────────────
  REV: 'Revenue',
  WDR: 'Withdrawal',
  REF: 'Refund',
  ADJ: 'Adjustment',
  DEP: 'Deposit',
  BTR: 'Bank Transfer',

  // ─── Processing Status ────────────────────────────────────
  PRO: 'Processing',
  SUC: 'Success',
  FLD: 'Failed',
  CMP: 'Completed',
  HLD: 'Held',
  EXP: 'Expired',

  // ─── User Actions ─────────────────────────────────────────
  SRC: 'Search',
  VIW: 'View',
  ATC: 'Add to Cart',
  BOK: 'Booking',

  // ─── Roles ───────────────────────────────────────────────
  ADM: 'Administrator',
  CUS: 'Customer',
  BMR: 'Business Manager',
  VEN: 'Vendor',
};

const codeNameParser = (code) => {
  if (!code || typeof code !== 'string') return code ?? '';
  return CODE_NAME_MAP[code.trim().toUpperCase()] ?? code;
};

module.exports = { codeNameParser, CODE_NAME_MAP };
