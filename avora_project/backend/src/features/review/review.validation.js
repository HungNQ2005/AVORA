'use strict';

const { z } = require('zod');

const uuid = z.string().uuid({ message: 'Mã dữ liệu không hợp lệ.' });
const reviewParamsSchema = z.object({ reviewId: uuid });
const hotelParamsSchema = z.object({ hotelId: uuid });
const bookingParamsSchema = z.object({ bookingId: uuid });
const reviewDeletionReasonSchema = z.object({
  reason_code: z.enum(['VIOLENCE', 'DEFAMATION', 'SEXUAL_CONTENT', 'POLITICAL_CONTENT', 'OTHER']),
  reason_text: z.string().trim().max(1000).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.reason_code === 'OTHER' && !data.reason_text?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['reason_text'], message: 'Vui lòng nhập lý do cụ thể.' });
  }
  if (data.reason_code !== 'OTHER' && data.reason_text?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['reason_text'], message: 'Chỉ nhập lý do cụ thể khi chọn "Lý do khác".' });
  }
});

const reviewFields = {
  rating_score: z.coerce.number().int().min(1).max(10),
  comment: z.string().trim().max(2000).nullable().optional(),
};

const createReviewSchema = z.object({
  rating_score: reviewFields.rating_score,
  comment: reviewFields.comment,
}).strict();

const updateReviewSchema = z.object({
  rating_score: reviewFields.rating_score.optional(),
  comment: reviewFields.comment,
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Vui lòng cung cấp thông tin cần cập nhật.',
});

module.exports = {
  reviewParamsSchema,
  hotelParamsSchema,
  bookingParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  reviewDeletionReasonSchema,
};