'use strict';

const { z } = require('zod');
const { sendError } = require('../../utils/responseHelper');

// UUID regex matching PostgreSQL standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowed status query filters (names and system code numbers)
const ALLOWED_QUERY_STATUSES = new Set(['1', '2', '3', 'PND', 'CFM', 'CAN', 'ALL']);

// Allowed target status values for vendor update (Pending -> Confirmed/Cancelled; Confirmed -> Cancelled)
const ALLOWED_TARGET_STATUSES = new Set(['2', '3', 'CFM', 'CAN']);

/**
 * Validates whether a string is a valid Gregorian calendar date in YYYY-MM-DD format.
 * @param {string} dateStr 
 * @returns {boolean}
 */
const isValidCalendarDate = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Route parameter schema for endpoints with :id (booking_id).
 * Used in:
 * - GET /api/vendor/bookings/:id
 * - PATCH /api/vendor/bookings/:id/status
 */
const vendorBookingParamsSchema = z.object({
  id: z
    .string({ error: 'Mã đơn đặt phòng phải là chuỗi ký tự.' })
    .trim()
    .min(1, { error: 'Mã đơn đặt phòng không được để trống.' })
    .regex(UUID_REGEX, { error: 'Mã đơn đặt phòng phải là định dạng UUID hợp lệ.' }),
});

/**
 * Query parameters schema for GET /api/vendor/bookings.
 * Supports:
 * - hotel_id: optional UUID
 * - status: optional 'PND' | 'CFM' | 'CAN' | '1' | '2' | '3' | 'ALL'
 * - search: optional string (booking code, guest name, guest phone)
 * - from_date: optional YYYY-MM-DD (check-in filter >= from_date)
 * - to_date: optional YYYY-MM-DD (check-out filter <= to_date)
 * - page: integer >= 1 (default 1)
 * - limit: integer 1..100 (default 10)
 */
const vendorBookingListQuerySchema = z
  .object({
    hotel_id: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' || val?.toUpperCase() === 'ALL' ? undefined : val))
      .refine((val) => val === undefined || UUID_REGEX.test(val), {
        message: 'Mã khách sạn phải là UUID hợp lệ.',
      }),

    status: z
      .string()
      .trim()
      .optional()
      .transform((val) => {
        if (!val || val.toUpperCase() === 'ALL') return undefined;
        return val.toUpperCase();
      })
      .refine((val) => val === undefined || ALLOWED_QUERY_STATUSES.has(val), {
        message: 'Trạng thái đơn không hợp lệ (hỗ trợ ALL, PND, CFM, CAN).',
      }),

    search: z
      .string({ error: 'Từ khóa tìm kiếm phải là chuỗi ký tự.' })
      .trim()
      .max(200, { error: 'Từ khóa tìm kiếm không được vượt quá 200 ký tự.' })
      .optional()
      .transform((val) => (val === '' ? undefined : val)),

    from_date: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || isValidCalendarDate(val), {
        message: 'Ngày nhận phòng từ phải có định dạng YYYY-MM-DD.',
      }),

    to_date: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || isValidCalendarDate(val), {
        message: 'Ngày nhận phòng đến phải có định dạng YYYY-MM-DD.',
      }),

    page: z.coerce
      .number({ error: 'Số trang phải từ 1 trở lên.' })
      .int({ error: 'Số trang phải từ 1 trở lên.' })
      .min(1, { error: 'Số trang phải từ 1 trở lên.' })
      .default(1),

    limit: z.coerce
      .number({ error: 'Số dòng phải từ 1 đến 100.' })
      .int({ error: 'Số dòng phải từ 1 đến 100.' })
      .min(1, { error: 'Số dòng phải từ 1 đến 100.' })
      .max(100, { error: 'Số dòng phải từ 1 đến 100.' })
      .default(10),
  })
  .superRefine((data, ctx) => {
    if (data.from_date && data.to_date && data.to_date < data.from_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['to_date'],
        message: 'Ngày nhận phòng đến không được nhỏ hơn ngày nhận phòng từ.',
      });
    }
  });

/**
 * Body schema for PATCH /api/vendor/bookings/:id/status.
 * Accepts:
 * - status_cd: '2' | '3' | 2 | 3 | 'CFM' | 'CAN'
 * - status: 'CFM' | 'CAN' | '2' | '3'
 * - target_status: 'CFM' | 'CAN' | '2' | '3'
 * - reason: string (required for CAN with min 5 chars, max 500 chars)
 * - note: alias for reason
 */
const vendorBookingStatusUpdateSchema = z
  .object({
    status_cd: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim().toUpperCase())
      .optional(),
    status: z
      .string()
      .trim()
      .toUpperCase()
      .optional(),
    target_status: z
      .string()
      .trim()
      .toUpperCase()
      .optional(),
    reason: z
      .string({ error: 'Lý do hủy đặt phòng phải là chuỗi ký tự.' })
      .trim()
      .max(500, { error: 'Lý do hủy đặt phòng không được vượt quá 500 ký tự.' })
      .optional(),
    note: z
      .string({ error: 'Ghi chú cập nhật phải là chuỗi ký tự.' })
      .trim()
      .max(500, { error: 'Ghi chú cập nhật không được vượt quá 500 ký tự.' })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const rawTarget = data.status_cd || data.target_status || data.status;
    if (!rawTarget) {
      ctx.addIssue({
        code: 'custom',
        path: ['status_cd'],
        message: 'Vui lòng cung cấp trạng thái cần chuyển đổi.',
      });
      return;
    }
    if (!ALLOWED_TARGET_STATUSES.has(rawTarget)) {
      ctx.addIssue({
        code: 'custom',
        path: ['status_cd'],
        message: 'Trạng thái chuyển đổi chỉ chấp nhận CFM (Xác nhận) hoặc CAN (Hủy).',
      });
      return;
    }

    const isCancel = rawTarget === '3' || rawTarget === 'CAN';
    const reasonText = (data.reason || data.note || '').trim();
    if (isCancel && (!reasonText || reasonText.length < 5)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Vui lòng nhập lý do hủy đặt phòng (tối thiểu 5 ký tự).',
      });
    }
  })
  .transform((data) => {
    const rawTarget = data.status_cd || data.target_status || data.status;
    const isConfirm = rawTarget === '2' || rawTarget === 'CFM';
    const normalizedCode = isConfirm ? '2' : '3';
    const normalizedName = isConfirm ? 'CFM' : 'CAN';
    const reasonText = (data.reason || data.note || '').trim();

    return {
      status_cd: normalizedCode,
      target_status: normalizedName,
      status_name: normalizedName,
      reason: reasonText,
    };
  });

/**
 * Validation middleware tailored for vendor booking requests.
 * Extracts the first issue message to user-facing error response.
 */
const validateVendorRequest = (schemas) => (req, res, next) => {
  for (const [key, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      const issues = result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      }));
      const firstMessage = issues[0]?.message || 'Dữ liệu gửi lên không hợp lệ.';
      return sendError(res, 400, firstMessage, { issues });
    }
    req.validated = req.validated || {};
    req.validated[key] = result.data;
  }
  return next();
};

module.exports = {
  UUID_REGEX,
  isValidCalendarDate,
  vendorBookingParamsSchema,
  vendorBookingListQuerySchema,
  vendorBookingStatusUpdateSchema,
  validateVendorRequest,
};
