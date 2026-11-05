'use strict';

const { z } = require('zod');
const { sendError } = require('../../utils/responseHelper');

// UUID regex matching PostgreSQL standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Standard audit action codes supported by m_system_code (business_cd = 'AUDIT_ACTION')
const ALLOWED_ACTION_CODES = new Set(['1', '2', '3', '4', 'INS', 'UPD', 'DEL', 'LGN', 'ALL']);

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
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Route parameter schema for endpoints with :id (log_id).
 * Used in:
 * - GET /api/admin/audit-logs/:id
 */
const auditLogParamsSchema = z.object({
  id: z
    .string({ error: 'Mã nhật ký kiểm toán phải là chuỗi ký tự.' })
    .trim()
    .min(1, { error: 'Mã nhật ký kiểm toán không được để trống.' })
    .regex(UUID_REGEX, { error: 'Mã nhật ký kiểm toán phải là định dạng UUID hợp lệ.' }),
});

/**
 * Query parameters schema for GET /api/admin/audit-logs.
 * Supports:
 * - page: integer >= 1 (default 1)
 * - limit: integer 1..100 (default 10)
 * - action_cd: optional '1' | '2' | '3' | '4' | 'INS' | 'UPD' | 'DEL' | 'LGN' | 'ALL'
 * - entity_name: optional string (max 100 chars)
 * - actor_id: optional UUID
 * - ip_address: optional string (max 50 chars)
 * - start_date: optional YYYY-MM-DD
 * - end_date: optional YYYY-MM-DD (must be >= start_date)
 * - search: optional string (actor name, email, entity name, entity ID, IP)
 * - sort_order: optional 'DESC' | 'ASC' (default 'DESC')
 */
const auditLogListQuerySchema = z
  .object({
    page: z.coerce
      .number({ error: 'Số trang phải là số nguyên dương lớn hơn hoặc bằng 1.' })
      .int({ error: 'Số trang phải là số nguyên dương lớn hơn hoặc bằng 1.' })
      .min(1, { error: 'Số trang phải là số nguyên dương lớn hơn hoặc bằng 1.' })
      .default(1),

    limit: z.coerce
      .number({ error: 'Số bản ghi trên mỗi trang phải từ 1 đến 100.' })
      .int({ error: 'Số bản ghi trên mỗi trang phải từ 1 đến 100.' })
      .min(1, { error: 'Số bản ghi trên mỗi trang phải từ 1 đến 100.' })
      .max(100, { error: 'Số bản ghi trên mỗi trang phải từ 1 đến 100.' })
      .default(10),

    action_cd: z
      .string()
      .trim()
      .optional()
      .transform((val) => {
        if (!val || val.toUpperCase() === 'ALL') return undefined;
        return val.toUpperCase();
      })
      .refine((val) => val === undefined || ALLOWED_ACTION_CODES.has(val), {
        message: 'Mã hành động không hợp lệ (hỗ trợ ALL, INS, UPD, DEL, LGN hoặc 1, 2, 3, 4).',
      }),

    entity_name: z
      .string()
      .trim()
      .max(100, { error: 'Tên thực thể không được vượt quá 100 ký tự.' })
      .optional()
      .transform((val) => (val === '' || val?.toUpperCase() === 'ALL' ? undefined : val)),

    actor_id: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || UUID_REGEX.test(val), {
        message: 'Mã người thực hiện phải là định dạng UUID hợp lệ.',
      }),

    ip_address: z
      .string()
      .trim()
      .max(50, { error: 'Địa chỉ IP không được vượt quá 50 ký tự.' })
      .optional()
      .transform((val) => (val === '' ? undefined : val)),

    start_date: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || isValidCalendarDate(val), {
        message: 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD hoặc không hợp lệ.',
      }),

    end_date: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || isValidCalendarDate(val), {
        message: 'Ngày kết thúc không đúng định dạng YYYY-MM-DD hoặc không hợp lệ.',
      }),

    search: z
      .string({ error: 'Từ khóa tìm kiếm phải là chuỗi ký tự.' })
      .trim()
      .max(200, { error: 'Từ khóa tìm kiếm không được vượt quá 200 ký tự.' })
      .optional()
      .transform((val) => (val === '' ? undefined : val)),

    sort_order: z
      .enum(['DESC', 'ASC', 'desc', 'asc'])
      .optional()
      .transform((val) => (val ? val.toUpperCase() : 'DESC'))
      .default('DESC'),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'Ngày kết thúc không được sớm hơn ngày bắt đầu.',
      });
    }
  });

/**
 * Validation middleware tailored for audit log requests.
 * Conforms to PROJECT.md § Interface Contracts.
 */
const validateAuditLogRequest = (schemas) => (req, res, next) => {
  for (const [key, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      const issues = result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      }));
      const firstMessage = issues[0]?.message || 'Dữ liệu gửi lên không hợp lệ.';
      if (key === 'params') {
        return sendError(res, 400, firstMessage, null);
      }
      return sendError(res, 400, 'Dữ liệu gửi lên không hợp lệ.', { issues });
    }
    req.validated = req.validated || {};
    req.validated[key] = result.data;
  }
  return next();
};

module.exports = {
  UUID_REGEX,
  ALLOWED_ACTION_CODES,
  isValidCalendarDate,
  auditLogParamsSchema,
  auditLogListQuerySchema,
  validateAuditLogRequest,
};
