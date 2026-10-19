'use strict';

const supabase = require('../../config/supabaseClient');
const bookingService = require('./booking.service');

const EXPIRY_MINUTES = 10;
const CHECK_INTERVAL_MS = 60 * 1000; // Quét mỗi 1 phút

/**
 * Tự động tìm và hủy các đơn đặt phòng ở trạng thái 'PND' (Chờ thanh toán)
 * đã quá thời hạn 10 phút mà chưa thanh toán.
 * KHÔNG can thiệp/sửa đổi schema của cơ sở dữ liệu.
 */
const cancelExpiredPendingBookings = async () => {
  if (!supabase) {
    return;
  }
  try {
    const cutoffTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();
    const { data: statusCodes, error: codeErr } = await supabase
      .from('m_system_code')
      .select('code_cd, code_name')
      .eq('business_cd', 'BOOKING_STS');

    if (codeErr) {
      console.warn('[BookingExpiryCron] Không thể đọc m_system_code:', codeErr.message);
      return;
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
        t_booking_detail (
          booking_detail_id,
          room_type_id,
          quantity,
          check_in_date,
          check_out_date
        ),
        t_payment_transaction (
          transaction_id,
          amount_paid
        )
      `)
      .eq('booking_status_cd', pndCd)
      .lte('created_at', cutoffTime);

    if (bookingErr) {
      console.warn('[BookingExpiryCron] Lỗi truy vấn đơn hết hạn:', bookingErr.message);
      return;
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return;
    }

    console.log(`[BookingExpiryCron] Phát hiện ${expiredBookings.length} đơn quá hạn 10 phút chưa thanh toán. Đang xử lý hủy tự động...`);

    for (const booking of expiredBookings) {
      // Nếu đã có giao dịch thanh toán thành công (amount_paid > 0) thì bỏ qua
      const txns = booking.t_payment_transaction || [];
      const hasSuccessfulPayment = txns.some((t) => Number(t.amount_paid) > 0);
      if (hasSuccessfulPayment) {
        continue;
      }

      // 3. Cập nhật trạng thái đơn thành CAN ('3')
      const { error: updateErr } = await supabase
        .from('t_booking')
        .update({
          booking_status_cd: canCd,
          special_request: 'Đơn bị hệ thống tự động hủy do quá hạn thanh toán 10 phút.',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', booking.booking_id);

      if (updateErr) {
        console.error(`[BookingExpiryCron] Lỗi khi cập nhật hủy booking ${booking.booking_id}:`, updateErr.message);
        continue;
      }

      // 4. Hoàn trả lại phòng trong t_inventory nếu có thông tin đặt
      const details = booking.t_booking_detail || [];
      if (details.length > 0 && typeof bookingService.adjustInventoryForStay === 'function') {
        const firstDetail = details[0];
        if (firstDetail.check_in_date && firstDetail.check_out_date) {
          await bookingService.adjustInventoryForStay(
            details,
            firstDetail.check_in_date,
            firstDetail.check_out_date,
            -1 // -1: tăng available_rooms, giảm locked_rooms
          );
        }
      }

      console.log(`[BookingExpiryCron] ✅ Đã tự động hủy đơn ${booking.booking_id} thành công (quá hạn 10 phút).`);
    }
  } catch (error) {
    console.error('[BookingExpiryCron] Ngoại lệ không mong muốn trong worker hủy đơn:', error.message);
  }
};

let timer = null;

const startBookingExpiryCron = () => {
  if (timer) return;
  console.log('[BookingExpiryCron] ⏱️ Dịch vụ tự động hủy phòng quá hạn 10 phút đã kích hoạt (chu kỳ 60s).');
  // Chạy ngay 1 lần kiểm tra khi khởi động
  cancelExpiredPendingBookings();
  // Lặp lại sau mỗi 60s
  timer = setInterval(cancelExpiredPendingBookings, CHECK_INTERVAL_MS);
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
