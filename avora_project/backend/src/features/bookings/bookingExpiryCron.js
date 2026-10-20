'use strict';

const supabase = require('../../config/supabaseClient');
const bookingService = require('./booking.service');

const EXPIRY_MINUTES = 10;
const CHECK_INTERVAL_MS = 10 * 1000;
const EXPIRY_REASON = 'Đơn bị hệ thống tự động hủy do quá hạn thanh toán 10 phút.';

let timer = null;
let isRunning = false;

/**
 * Tự động tìm và hủy các đơn đặt phòng ở trạng thái 'PND' (Chờ thanh toán)
 * đã quá thời hạn 10 phút mà chưa thanh toán.
 * KHÔNG can thiệp/sửa đổi schema của cơ sở dữ liệu.
 */
const cancelExpiredPendingBookings = async () => {
  if (!supabase || isRunning) {
    return;
  }

  isRunning = true;
  try {
    const cutoffTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();
    const { data: statusCodes, error: codeErr } = await supabase
      .from('m_system_code')
      .select('code_cd, code_name')
      .eq('business_cd', 'BOOKING_STS');

    if (codeErr) {
      throw new Error(`Không thể đọc m_system_code: ${codeErr.message}`);
    }

    const pndCd = statusCodes?.find((c) => String(c.code_name).toUpperCase() === 'PND')?.code_cd || '1';
    const canCd = statusCodes?.find((c) => String(c.code_name).toUpperCase() === 'CAN')?.code_cd || '3';

    // 2. Lấy các đơn PND được tạo trước mốc 10 phút
    const { data: expiredBookings, error: bookingErr } = await supabase
      .from('t_booking')
      .select(`
        booking_id,
        created_at,
        booking_status_cd,
        special_request,
        t_booking_detail (
          booking_detail_id,
          room_type_id,
          quantity,
          check_in_date,
          check_out_date
        ),
        t_payment_transaction (
          transaction_id,
          amount_paid,
          paid_at
        )
      `)
      .eq('booking_status_cd', pndCd)
      .lte('created_at', cutoffTime);

    if (bookingErr) {
      throw new Error(`Lỗi truy vấn đơn hết hạn: ${bookingErr.message}`);
    }

    if (!expiredBookings || expiredBookings.length === 0) return;

    for (const booking of expiredBookings) {
      const txns = booking.t_payment_transaction || [];
      const hasSuccessfulPayment = txns.some((t) => Number(t.amount_paid) > 0 || t.paid_at);
      if (hasSuccessfulPayment) {
        continue;
      }

      const { data: cancelledBooking, error: updateErr } = await supabase
        .from('t_booking')
        .update({
          booking_status_cd: canCd,
          special_request: [booking.special_request, EXPIRY_REASON].filter(Boolean).join('\n'),
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', booking.booking_id)
        .eq('booking_status_cd', pndCd)
        .select('booking_id')
        .maybeSingle();

      if (updateErr) {
        console.error(`[BookingExpiryCron] Không thể hủy đơn ${booking.booking_id}:`, updateErr.message);
        continue;
      }
      if (!cancelledBooking) {
        continue;
      }

      const details = booking.t_booking_detail || [];
      if (details.length > 0) {
        const firstDetail = details[0];
        try {
          await bookingService.adjustInventoryForStay(
            details,
            firstDetail.check_in_date,
            firstDetail.check_out_date,
            -1
          );
        } catch (inventoryError) {
          const { error: rollbackError } = await supabase
            .from('t_booking')
            .update({
              booking_status_cd: pndCd,
              special_request: booking.special_request,
              updated_at: new Date().toISOString(),
            })
            .eq('booking_id', booking.booking_id)
            .eq('booking_status_cd', canCd);

          console.error(
            `[BookingExpiryCron] Không thể hoàn tồn kho cho đơn ${booking.booking_id}; trạng thái đã được ${
              rollbackError ? 'giữ nguyên' : 'hoàn tác về chờ thanh toán'
            }.`,
            rollbackError ? `${inventoryError.message}; lỗi hoàn tác trạng thái: ${rollbackError.message}` : inventoryError
          );
        }
      }
    }
  } catch (error) {
    console.error('[BookingExpiryCron] Lỗi khi xử lý đơn hết hạn:', error);
  } finally {
    isRunning = false;
  }
};

const startBookingExpiryCron = () => {
  if (timer) return;

  void cancelExpiredPendingBookings();
  timer = setInterval(() => {
    void cancelExpiredPendingBookings();
  }, CHECK_INTERVAL_MS);
};

const stopBookingExpiryCron = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

module.exports = {
  startBookingExpiryCron,
  stopBookingExpiryCron,
  cancelExpiredPendingBookings,
};
