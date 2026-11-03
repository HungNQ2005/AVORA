'use strict';

const { z } = require('zod');

const id = z.string().uuid({ message: 'Mã dữ liệu không hợp lệ.' });
const bookingsQuerySchema = z.object({
  status: z.enum(['all', 'in_use', 'completed', 'cancelled']).default('all'),
  check_in_date: z.string().date().optional(),
  check_out_date: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

const bookingParamsSchema = z.object({ id, bookingId: id });
const reason = z.string().trim().min(3, 'Vui lòng nhập lý do cụ thể.').max(500);
const cancelBookingBodySchema = z.object({ reason }).strict();
const changeDatesBodySchema = z.object({
  check_in_date: z.string().date(),
  check_out_date: z.string().date(),
  reason,
}).strict().refine((value) => value.check_in_date < value.check_out_date, {
  path: ['check_out_date'],
  message: 'Ngày trả phòng phải sau ngày nhận phòng.',
});
const changeRoomTypeBodySchema = z.object({
  booking_detail_id: id,
  room_type_id: id,
  reason,
}).strict();

module.exports = {
  bookingsQuerySchema,
  bookingParamsSchema,
  cancelBookingBodySchema,
  changeDatesBodySchema,
  changeRoomTypeBodySchema,
};
