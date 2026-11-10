'use strict';

const { z } = require('zod');

const uuid = z.string().uuid({ message: 'Mã moment không hợp lệ.' });

const momentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

const momentParamsSchema = z.object({ id: uuid }).strict();

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
  momentParamsSchema,
  createMomentBodySchema,
  updateMomentBodySchema,
  momentVisibilityBodySchema,
};
