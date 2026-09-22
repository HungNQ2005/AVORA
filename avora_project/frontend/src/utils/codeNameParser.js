/**
 * Maps AVORA system codes to human-readable names.
 * Mirrors backend/src/utils/codeNameParser.js
 */

export const CODE_NAME_MAP = {
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

/**
 * Category groups — used for color-coding badges.
 * Returns the semantic color variant for a given code.
 */
const CATEGORY_MAP = {
  // Operations → violet
  INS: 'violet', UPD: 'violet', DEL: 'violet', LGN: 'violet',

  // Banks → cyan
  VCB: 'cyan', HDB: 'cyan', SHB: 'cyan', VIB: 'cyan', TPB: 'cyan',
  LPB: 'cyan', EIB: 'cyan', MSB: 'cyan', OCB: 'cyan', SSB: 'cyan',
  NAB: 'cyan', BID: 'cyan', KLB: 'cyan', CTG: 'cyan', VBA: 'cyan',
  TCB: 'cyan', MBB: 'cyan', VPB: 'cyan', ACB: 'cyan', STB: 'cyan',

  // Booking/Order Status → semantic
  PND: 'amber',  CFM: 'green', CAN: 'red',
  APR: 'green',  REJ: 'red',

  // Financial → teal
  REV: 'teal', WDR: 'teal', REF: 'teal',
  ADJ: 'teal', DEP: 'teal', BTR: 'teal',

  // Processing Status → semantic
  PRO: 'amber', SUC: 'green', FLD: 'red',
  CMP: 'green', HLD: 'amber', EXP: 'red',

  // User Actions → indigo
  SRC: 'indigo', VIW: 'indigo', ATC: 'indigo', BOK: 'indigo',

  // Roles → orange
  ADM: 'orange', CUS: 'orange', BMR: 'orange', VEN: 'orange',
};

/**
 * @param {string} code
 * @returns {string} Human-readable name or original code as fallback
 */
export const codeNameParser = (code) => {
  if (!code || typeof code !== 'string') return code ?? '';
  return CODE_NAME_MAP[code.trim().toUpperCase()] ?? code;
};

/**
 * @param {string} code
 * @returns {'violet'|'cyan'|'green'|'red'|'amber'|'teal'|'indigo'|'orange'|'default'}
 */
export const getCodeVariant = (code) => {
  if (!code || typeof code !== 'string') return 'default';
  return CATEGORY_MAP[code.trim().toUpperCase()] ?? 'default';
};
