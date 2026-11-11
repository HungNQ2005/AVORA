'use strict';

const { z } = require('zod');

const uuid = z.string().uuid({ message: 'Mã moment không hợp lệ.' });

const momentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

const adminMomentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  published_from: z.iso.date().optional(),
  published_to: z.iso.date().optional(),
  hotel: z.string().trim().max(255).optional(),
  author: z.string().trim().max(255).optional(),
}).strict().refine(
  (query) => !query.published_from || !query.published_to || query.published_from <= query.published_to,
  { message: 'Ngày bắt đầu không được sau ngày kết thúc.', path: ['published_to'] }
);

const momentParamsSchema = z.object({ id: uuid }).strict();

const adminMomentRemovalBodySchema = z.object({
  reason: z.string().trim().max(500, 'Lý do gỡ không được vượt quá 500 ký tự.').optional().default(''),
}).strict();

const createMomentBodySchema = z.object({
  booking_id: uuid,
  message: z.string().trim().min(1, 'Vui lòng nhập nội dung moment.').max(5000, 'Nội dung moment không được vượt quá 5000 ký tự.'),
}).strict();

const updateMomentBodySchema = z.object({
  message: z.string().trim().min(1, 'Vui lòng nhập nội dung moment.').max(5000, 'Nội dung moment không được vượt quá 5000 ký tự.'),
}).strict();

const momentVisibilityBodySchema = z.object({
  is_deleted: z.boolean(),
}).strict();

module.exports = {
  momentListQuerySchema,
  adminMomentListQuerySchema,
  momentParamsSchema,
  adminMomentRemovalBodySchema,
  createMomentBodySchema,
  updateMomentBodySchema,
  momentVisibilityBodySchema,
};
