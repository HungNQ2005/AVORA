'use strict';

const { z } = require('zod');

const uuid = z.string().uuid({ message: 'Mã dữ liệu không hợp lệ.' });

const ticketIdParamSchema = z.object({
  ticketId: uuid,
});

const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['RSV', 'CLS', 'ALL']).default('RSV'),
});

const applyBankChangeBodySchema = z.object({
  bank_cd: z.string({ required_error: 'Vui lòng chọn ngân hàng mới.' })
    .trim()
    .min(1, 'Vui lòng chọn ngân hàng mới.')
    .max(50, 'Mã ngân hàng tối đa 50 ký tự.'),
  account_number: z.string({ required_error: 'Vui lòng nhập số tài khoản mới.' })
    .trim()
    .min(4, 'Số tài khoản tối thiểu 4 ký tự.')
    .max(50, 'Số tài khoản tối đa 50 ký tự.')
    .regex(/^[a-zA-Z0-9]+$/, 'Số tài khoản chỉ được chứa chữ cái và số.'),
  account_holder: z.string({ required_error: 'Vui lòng nhập tên chủ tài khoản mới.' })
    .trim()
    .min(2, 'Tên chủ tài khoản tối thiểu 2 ký tự.')
    .max(255, 'Tên chủ tài khoản tối đa 255 ký tự.'),
  confirmed_with_hotel: z.literal(true, {
    errorMap: () => ({ message: 'Bạn phải xác nhận đã trao đổi với khách sạn trước khi đổi thông tin.' }),
  }),
});

module.exports = {
  ticketIdParamSchema,
  listRequestsQuerySchema,
  applyBankChangeBodySchema,
};
