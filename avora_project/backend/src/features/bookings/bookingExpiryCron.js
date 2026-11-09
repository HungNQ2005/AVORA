"use strict";

const supabase = require("../../config/supabaseClient");
const bookingService = require("./booking.service");
const { codeNameParser } = require("../../utils/codeNameParser");

const EXPIRY_MINUTES = 10;
const GROUP_EXPIRY_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 10 * 1000;
const EXPIRY_REASON =
  "Đơn bị hệ thống tự động hủy do quá hạn thanh toán 10 phút.";
const GROUP_EXPIRY_REASON =
  "Đơn thanh toán nhóm bị hệ thống tự động hủy do quá thời hạn gom tiền 2 giờ.";

let timer = null;
let isRunning = false;

const parseDbTimestamp = (val) => {
  if (!val) return null;
  let s = String(val).trim();
  if (s.includes("T") && !s.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(s)) s += "Z";
  else if (!s.includes("T") && /^\d{4}-\d{2}-\d{2} /.test(s)) s = `${s.replace(" ", "T")}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Tạo (hoặc cập nhật) 1 yêu cầu hoàn tiền duy nhất về tài khoản ngân hàng của Trưởng nhóm (booking.user_id).
 */
const ensureHostGroupRefund = async ({ booking, refundAmount, refundPndCd }) => {
  const cleanAmount = Math.round(Number(refundAmount || 0));
  if (cleanAmount <= 0) return;

  const { data: hostUser } = await supabase
    .from("m_user")
    .select("user_id, full_name, refund_bank_cd, refund_account_number, refund_account_holder")
    .eq("user_id", booking.user_id)
    .maybeSingle();

  let reasonText =
    "Hoàn tiền thanh toán nhóm quá hạn về Trưởng nhóm • Chưa cung cấp STK hoàn tiền (Cần xác minh qua Support Ticket)";

  if (hostUser?.refund_account_number && String(hostUser.refund_account_number).trim()) {
    let bankLabel = hostUser.refund_bank_cd || "N/A";
    if (hostUser.refund_bank_cd) {
      const { data: bankCode } = await supabase
        .from("m_system_code")
        .select("code_name")
        .eq("business_cd", "BANK_CD")
        .eq("code_cd", String(hostUser.refund_bank_cd))
        .maybeSingle();
      if (bankCode?.code_name) {
        bankLabel = codeNameParser(bankCode.code_name) || bankCode.code_name;
      }
    }
    reasonText = [
      "Hoàn tiền thanh toán nhóm quá hạn về Trưởng nhóm",
      `Ngân hàng: ${bankLabel}`,
      `Số TK: ${String(hostUser.refund_account_number).trim()}`,
      `Chủ TK: ${String(hostUser.refund_account_holder || hostUser.full_name || "N/A").trim().toUpperCase()}`,
    ].join(" • ");
  }

  const nowIso = new Date().toISOString();
  const { data: existingRefund } = await supabase
    .from("t_refund_request")
    .select("refund_id")
    .eq("booking_id", booking.booking_id)
    .eq("refund_status_cd", refundPndCd)
    .maybeSingle();

  if (existingRefund?.refund_id) {
    await supabase
      .from("t_refund_request")
      .update({
        refund_amount: cleanAmount,
        reason: reasonText,
        updated_at: nowIso,
      })
      .eq("refund_id", existingRefund.refund_id);
    return;
  }

  const paidTx = (booking.t_payment_transaction || []).find(
    (t) => Number(t.amount_paid) > 0 || t.paid_at
  );

  await supabase.from("t_refund_request").insert({
    transaction_id: paidTx?.transaction_id || null,
    booking_id: booking.booking_id,
    requester_id: booking.user_id || null,
    bank_cd: hostUser?.refund_bank_cd ? String(hostUser.refund_bank_cd).trim() : null,
    account_number: hostUser?.refund_account_number ? String(hostUser.refund_account_number).trim() : null,
    account_holder: hostUser?.refund_account_holder
      ? String(hostUser.refund_account_holder).trim().toUpperCase()
      : null,
    refund_amount: cleanAmount,
    refund_status_cd: refundPndCd,
    gateway_refund_ref: `REF-GRP-${String(booking.booking_id).slice(0, 8).toUpperCase()}`,
    reason: reasonText,
    created_at: nowIso,
    updated_at: nowIso,
  });
};

/**
 * Tự động tìm và hủy các đơn đặt phòng ở trạng thái 'PND' (Chờ thanh toán):
 *  - Đơn lẻ thông thường: quá 10 phút mà chưa thanh toán.
 *  - Đơn thanh toán nhóm: chỉ hủy khi quá hạn 2 giờ (expires_at) mà chưa gom đủ 100%,
 *    đồng thời tạo 1 yêu cầu hoàn tiền duy nhất về cho Trưởng nhóm nếu đã có thành viên đóng tiền.
 */
const cancelExpiredPendingBookings = async () => {
  if (!supabase || isRunning) {
    return;
  }

  isRunning = true;
  try {
    const cutoffTime = new Date(
      Date.now() - EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { data: statusCodes, error: codeErr } = await supabase
      .from("m_system_code")
      .select("business_cd, code_cd, code_name")
      .in("business_cd", ["BOOKING_STS", "SHARE_STS", "REFUND_STS"]);

    if (codeErr) {
      throw new Error(`Không thể đọc m_system_code: ${codeErr.message}`);
    }

    const findCd = (biz, name) =>
      statusCodes?.find(
        (c) =>
          String(c.business_cd).toUpperCase() === biz &&
          String(c.code_name).toUpperCase() === name
      )?.code_cd;

    const pndCd = findCd("BOOKING_STS", "PND");
    const canCd = findCd("BOOKING_STS", "CAN");
    const shareExpCd = findCd("SHARE_STS", "EXP") || "3";
    const shareCmpCd = findCd("SHARE_STS", "CMP") || "2";
    const refundPndCd = findCd("REFUND_STS", "PND") || "1";

    if (!pndCd || !canCd) {
      throw new Error("Không tìm thấy mã trạng thái PND hoặc CAN.");
    }

    const { data: expiredBookings, error: bookingErr } = await supabase
      .from("t_booking")
      .select(
        `
        booking_id,
        user_id,
        total_amount,
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
        ),
        t_payment_sharing_group (
          group_id,
          total_required,
          total_collected,
          share_status_cd,
          expires_at,
          created_at
        )
      `
      )
      .eq("booking_status_cd", pndCd)
      .lte("created_at", cutoffTime);

    if (bookingErr) {
      throw new Error(`Lỗi truy vấn đơn hết hạn: ${bookingErr.message}`);
    }

    if (!expiredBookings || expiredBookings.length === 0) return;

    for (const booking of expiredBookings) {
      const rawGroup = booking.t_payment_sharing_group;
      const sharingGroup = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;

      if (sharingGroup) {
        if (String(sharingGroup.share_status_cd) === String(shareCmpCd)) {
          continue;
        }
        const collected = Number(sharingGroup.total_collected || 0);
        const required = Number(sharingGroup.total_required || booking.total_amount || 0);
        if (required > 0 && collected >= required) {
          continue;
        }

        const expDate =
          parseDbTimestamp(sharingGroup.expires_at) ||
          (parseDbTimestamp(sharingGroup.created_at)
            ? new Date(parseDbTimestamp(sharingGroup.created_at).getTime() + GROUP_EXPIRY_MS)
            : null);

        // Chưa tới mốc 2 tiếng của nhóm -> KHÔNG hủy!
        if (expDate && Date.now() < expDate.getTime()) {
          continue;
        }
      } else {
        const txns = booking.t_payment_transaction || [];
        const hasSuccessfulPayment = txns.some(
          (t) => Number(t.amount_paid) > 0 || t.paid_at
        );
        if (hasSuccessfulPayment) {
          continue;
        }
      }

      const reasonToAppend = sharingGroup ? GROUP_EXPIRY_REASON : EXPIRY_REASON;
      const nowIso = new Date().toISOString();

      const { data: cancelledBooking, error: updateErr } = await supabase
        .from("t_booking")
        .update({
          booking_status_cd: canCd,
          special_request: [booking.special_request, reasonToAppend]
            .filter(Boolean)
            .join("\n"),
          updated_at: nowIso,
        })
        .eq("booking_id", booking.booking_id)
        .eq("booking_status_cd", pndCd)
        .select("booking_id")
        .maybeSingle();

      if (updateErr) {
        console.error(
          `[BookingExpiryCron] Không thể hủy đơn ${booking.booking_id}:`,
          updateErr.message
        );
        continue;
      }
      if (!cancelledBooking) {
        continue;
      }

      if (sharingGroup) {
        await supabase
          .from("t_payment_sharing_group")
          .update({
            share_status_cd: shareExpCd,
            updated_at: nowIso,
          })
          .eq("group_id", sharingGroup.group_id);

        const collectedAmount = Number(sharingGroup.total_collected || 0);
        if (collectedAmount > 0) {
          try {
            await ensureHostGroupRefund({
              booking,
              refundAmount: collectedAmount,
              refundPndCd,
            });
          } catch (refundErr) {
            console.error(
              `[BookingExpiryCron] Lỗi tạo yêu cầu hoàn tiền nhóm cho đơn ${booking.booking_id}:`,
              refundErr.message
            );
          }
        }
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
            .from("t_booking")
            .update({
              booking_status_cd: pndCd,
              special_request: booking.special_request,
              updated_at: new Date().toISOString(),
            })
            .eq("booking_id", booking.booking_id)
            .eq("booking_status_cd", canCd);

          console.error(
            `[BookingExpiryCron] Không thể hoàn tồn kho cho đơn ${booking.booking_id}; trạng thái đã được ${
              rollbackError ? "giữ nguyên" : "hoàn tác về chờ thanh toán"
            }.`,
            rollbackError
              ? `${inventoryError.message}; lỗi hoàn tác trạng thái: ${rollbackError.message}`
              : inventoryError
          );
        }
      }
    }
  } catch (error) {
    console.error("[BookingExpiryCron] Lỗi khi xử lý đơn hết hạn:", error);
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
