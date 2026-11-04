'use strict';

const { z } = require('zod');

const uuid = z.string().uuid({ message: 'Mã dữ liệu không hợp lệ.' });
const MAX_TITLE_WORDS = 50;
const MAX_DESCRIPTION_WORDS = 500;
const MAX_MESSAGE_WORDS = 500;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?/i;

const wordCount = (value) => (String(value).match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || []).length;
const noLinks = (value) => !URL_PATTERN.test(value);

const ticketIdParamsSchema = z.object({ ticketId: uuid });
const attachmentParamsSchema = z.object({
  ticketId: uuid,
  key: uuid,
});

const ticketListQuerySchema = z.object({
  group: z.enum(['customer', 'vendor', 'all']).default('all'),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(50).optional(),
  status: z.enum(['OPN', 'INP', 'WAT', 'RSV', 'CLS', 'DELETED']).optional(),
  assigned: z.enum(['mine', 'unassigned', 'all']).default('all'),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createTicketBodySchema = z.object({
  ticket_type_cd: z.string().trim().min(2).max(50),
  title: z.string().trim().min(1).max(255).refine((value) => wordCount(value) <= MAX_TITLE_WORDS, {
    message: `Tiêu đề không được vượt quá ${MAX_TITLE_WORDS} từ.`,
  }).refine(noLinks, { message: 'Tiêu đề không được chứa đường dẫn.' }),
  description: z.string().trim().min(1).refine((value) => wordCount(value) <= MAX_DESCRIPTION_WORDS, {
    message: `Mô tả không được vượt quá ${MAX_DESCRIPTION_WORDS} từ.`,
  }).refine(noLinks, { message: 'Mô tả không được chứa đường dẫn.' }),
  hotel_id: uuid.optional().nullable(),
  booking_id: uuid.optional().nullable(),
  priority_cd: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
}).strict();

const createReplyBodySchema = z.object({
  message: z.string().trim().max(100000).optional().default(''),
  is_internal_note: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean().optional().default(false)
  ),
}).strict().refine((data) => wordCount(data.message) <= MAX_MESSAGE_WORDS, {
  message: `Mỗi tin nhắn không được vượt quá ${MAX_MESSAGE_WORDS} từ.`,
}).refine((data) => !data.message || noLinks(data.message), {
  message: 'Tin nhắn không được chứa đường dẫn.',
});

const ticketStatusBodySchema = z.object({
  action: z.enum(['claim', 'request_resolution', 'confirm_resolution', 'reject_resolution', 'close']),
  resolution_note: z.string().trim().min(1).max(5000).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.action === 'request_resolution' && !data.resolution_note) {
    ctx.addIssue({ code: 'custom', path: ['resolution_note'], message: 'Vui lòng nhập nội dung giải quyết.' });
  }
});

const aiChatBodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  }).strict()).max(20).default([]),
}).strict();

module.exports = {
  MAX_TITLE_WORDS,
  MAX_DESCRIPTION_WORDS,
  MAX_MESSAGE_WORDS,
  wordCount,
  ticketIdParamsSchema,
  attachmentParamsSchema,
  ticketListQuerySchema,
  createTicketBodySchema,
  createReplyBodySchema,
  ticketStatusBodySchema,
  aiChatBodySchema,
};
