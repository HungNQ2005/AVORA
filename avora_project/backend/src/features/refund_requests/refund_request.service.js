'use strict';

const crypto = require('crypto');
const supabase = require('../../config/supabaseClient');
const env = require('../../config/env');
const { codeNameParser } = require('../../utils/codeNameParser');
const { recordAuditLog } = require('../../utils/auditLogger');
const vietqr = require('../disbursements/vietqr.helper');

const REFUND_CODE_PREFIX = 'AVRRF';
const REFUND_CODE_REGEX = /AVRRF\d{7,9}/i;
const MAX_CODE_ATTEMPTS = 5;
const ACCOUNT_NUMBER_REGEX = /^[0-9A-Za-z]{4,30}$/;

const createError = (statusCode, message, code = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const ensureClient = () => {
  if (!supabase) {
    throw createError(503, 'Hệ thống cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.');
  }
};

const generateRefundPayoutCode = () =>
  `${REFUND_CODE_PREFIX}${crypto.randomInt(10000000, 100000000)}`;

const extractRefundPayoutCode = (text) => {
  const match = String(text || '').match(REFUND_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
};

const buildRefundQrUrl = ({ bin, accountNumber, accountHolder, amount, paymentCode }) => {
  if (!/^\d{6}$/.test(String(bin || ''))) {
    throw new Error('Mã BIN ngân hàng không hợp lệ.');
  }
  const account = String(accountNumber || '').trim();
  if (!ACCOUNT_NUMBER_REGEX.test(account)) {
    throw new Error('Số tài khoản thụ hưởng không hợp lệ.');
  }
  const numAmount = Math.round(Number(amount));
  if (!Number.isInteger(numAmount) || numAmount <= 0) {
    throw new Error('Số tiền hoàn phải là số nguyên VND lớn hơn 0.');
  }
  if (!REFUND_CODE_REGEX.test(String(paymentCode || ''))) {
    throw new Error('Mã thanh toán hoàn tiền (AVRRF) không hợp lệ.');
  }

  const params = new URLSearchParams({
    amount: String(numAmount),
    addInfo: String(paymentCode),
  });
  if (accountHolder) {
    params.set('accountName', String(accountHolder).trim());
  }
  return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?${params.toString()}`;
};

const loadSystemCodeMaps = async () => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('business_cd, code_cd, code_name');
  if (error) {
    throw createError(500, `Không thể tải bảng mã hệ thống: ${error.message}`);
  }

  const byBiz = new Map();
  (data || []).forEach((row) => {
    const biz = String(row.business_cd || '').trim().toUpperCase();
    const cd = String(row.code_cd || '').trim();
    const name = String(row.code_name || '').trim().toUpperCase();
    if (!byBiz.has(biz)) {
      byBiz.set(biz, { cdToName: new Map(), nameToCd: new Map(), rawName: new Map() });
    }
    const group = byBiz.get(biz);
    group.cdToName.set(cd, name);
    group.nameToCd.set(name, cd);
    group.rawName.set(cd, row.code_name);
  });

  return {
    nameOf: (biz, cd) =>
      byBiz.get(biz)?.cdToName.get(String(cd || '').trim()) ||
      String(cd || '').trim().toUpperCase(),
    cdOf: (biz, name) =>
      byBiz.get(biz)?.nameToCd.get(String(name || '').trim().toUpperCase()) || null,
    bankLabelOf: (cd) => {
      const raw = byBiz.get('BANK_CD')?.rawName.get(String(cd || '').trim());
      if (!raw) return cd ? `Ngân hàng (${cd})` : '';
      return codeNameParser(raw) || raw;
    },
    bankShortOf: (cd) =>
      byBiz.get('BANK_CD')?.cdToName.get(String(cd || '').trim()) ||
      String(cd || '').trim().toUpperCase(),
    hasBankCd: (cdOrName) => {
      const bankGroup = byBiz.get('BANK_CD');
      if (!bankGroup) return null;
      const key = String(cdOrName || '').trim();
      if (bankGroup.cdToName.has(key)) return key;
      if (bankGroup.nameToCd.has(key.toUpperCase())) return bankGroup.nameToCd.get(key.toUpperCase());
      return null;
    },
  };
};

/**
 * Fallback parser cho các bản ghi t_refund_request cũ chỉ lưu thông tin STK trong cột text `reason`.
 */
const parseBankFromReasonText = (reasonText) => {
  const text = String(reasonText || '');
  const bankCdMatch = text.match(/Mã ngân hàng \(System Code\):\s*([^•\n]+)/i);
  const accMatch = text.match(/Số TK:\s*([0-9A-Za-z]+)/i);
  const holderMatch = text.match(/Chủ TK:\s*([^•\n]+)/i);
  return {
    bank_cd: bankCdMatch ? bankCdMatch[1].trim() : null,
    account_number: accMatch ? accMatch[1].trim() : null,
    account_holder: holderMatch ? holderMatch[1].trim().toUpperCase() : null,
  };
};

const formatBookingCodeShort = (bookingId, createdAt) => {
  if (!bookingId) return '';
  const shortId = String(bookingId).replace(/-/g, '').substring(0, 6).toUpperCase();
  const d = createdAt ? new Date(createdAt) : null;
  const yy = d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()).slice(-2) : '26';
  return `AVR-${yy}${shortId}`;
};

/**
 * Tính số tiền gợi ý hoàn cho 1 đơn đặt phòng dựa trên số tiền thực tế đã đóng và chính sách hủy phòng (nếu có).
 */
const calculateSuggestedRefundForBooking = (booking, policiesMap) => {
  if (!booking) {
    return {
      paid_amount: 0,
      suggested_refund_amount: 0,
      penalty_rate: 0,
      penalty_amount: 0,
      is_free_cancel: true,
      calculation_note: 'Ticket không gắn đơn đặt phòng cụ thể. Vui lòng nhập số tiền cần hoàn theo chứng từ.',
    };
  }

  const txns = Array.isArray(booking.t_payment_transaction) ? booking.t_payment_transaction : [];
  const totalPaid = txns.reduce((sum, tx) => sum + (Number(tx.amount_paid) || 0), 0);
  const basePaid = totalPaid > 0 ? Math.round(totalPaid) : Math.round(Number(booking.total_amount || 0));

  const policy =
    booking.m_cancellation_policy ||
    policiesMap.get(String(booking.cancellation_policy_id)) ||
    policiesMap.get(`hotel:${booking.hotel_id}`) ||
    null;

  const freeCancelHours =
    policy?.free_cancel_before_hours != null ? Number(policy.free_cancel_before_hours) : null;
  const rawPenaltyRate =
    booking.applied_penalty_rate != null
      ? Number(booking.applied_penalty_rate)
      : policy?.penalty_rate != null
        ? Number(policy.penalty_rate)
        : 0;

  const details = Array.isArray(booking.t_booking_detail) ? booking.t_booking_detail : [];
  const checkInDateStr = details[0]?.check_in_date || null;

  let isWithinFreeWindow = true;
  if (checkInDateStr && freeCancelHours != null) {
    const checkInDate = new Date(checkInDateStr);
    const deadline = new Date(checkInDate.getTime() - freeCancelHours * 60 * 60 * 1000);
    const compareTime = booking.updated_at ? new Date(booking.updated_at) : new Date();
    isWithinFreeWindow = compareTime <= deadline;
  }

  // Nếu booking đã lưu applied_penalty_rate > 0 thì ưu tiên dùng tỷ lệ đó, ngược lại xét theo hạn hủy miễn phí
  const effectivePenaltyRate =
    booking.applied_penalty_rate != null && Number(booking.applied_penalty_rate) > 0
      ? Number(booking.applied_penalty_rate)
      : isWithinFreeWindow
        ? 0
        : Math.max(0, rawPenaltyRate);

  const refundPercent = Math.max(0, 100 - effectivePenaltyRate);
  const suggestedAmount = Math.round((basePaid * refundPercent) / 100);
  const penaltyAmount = Math.max(0, basePaid - suggestedAmount);

  const note =
    effectivePenaltyRate > 0
      ? `Khách đã thanh toán ${basePaid.toLocaleString('vi-VN')} đ • Áp dụng phí hủy ${effectivePenaltyRate}% (-${penaltyAmount.toLocaleString('vi-VN')} đ) → Gợi ý hoàn ${suggestedAmount.toLocaleString('vi-VN')} đ.`
      : `Khách đã thanh toán ${basePaid.toLocaleString('vi-VN')} đ • Trong hạn hủy miễn phí (0% phí hủy) → Gợi ý hoàn 100% (${suggestedAmount.toLocaleString('vi-VN')} đ).`;

  return {
    paid_amount: basePaid,
    suggested_refund_amount: suggestedAmount,
    penalty_rate: effectivePenaltyRate,
    penalty_amount: penaltyAmount,
    is_free_cancel: effectivePenaltyRate === 0,
    calculation_note: note,
  };
};

/**
 * Lấy toàn bộ dữ liệu cho màn hình Quản lý Hoàn tiền của Business Manager:
 *  1) Danh sách Support Ticket loại RFD đã duyệt (RSV) chưa tạo refund request
 *  2) Danh sách Refund Request đang chờ thanh toán (PND / PRO)
 *  3) Danh sách Refund Request đã trả tiền thành công (SUC)
 */
const getBusinessRefundOverview = async () => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const rfdCatCd = sysCodes.cdOf('SUPPORT_CAT', 'RFD');
  const rsvStsCd = sysCodes.cdOf('SUPPORT_STS', 'RSV');
  const refundPndCd = sysCodes.cdOf('REFUND_STS', 'PND') || '1';
  const refundProCd = sysCodes.cdOf('REFUND_STS', 'PRO') || '2';
  const refundSucCd = sysCodes.cdOf('REFUND_STS', 'SUC') || '3';

  const rfdTypeVariants = [...new Set(['RFD', rfdCatCd].filter(Boolean))];
  const rsvStatusVariants = [...new Set(['RSV', rsvStsCd].filter(Boolean))];

  const [ticketsRes, refundsRes] = await Promise.all([
    supabase
      .from('t_support_ticket')
      .select('*')
      .eq('is_deleted', false)
      .in('ticket_type_cd', rfdTypeVariants)
      .in('ticket_status_cd', rsvStatusVariants)
      .order('updated_at', { ascending: false }),
    supabase
      .from('t_refund_request')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  if (ticketsRes.error) {
    throw createError(500, `Lỗi tải danh sách Support Ticket hoàn tiền: ${ticketsRes.error.message}`);
  }
  if (refundsRes.error) {
    throw createError(500, `Lỗi tải danh sách yêu cầu hoàn tiền: ${refundsRes.error.message}`);
  }

  const rawTickets = ticketsRes.data || [];
  const rawRefunds = refundsRes.data || [];

  // Lấy thêm liên kết booking từ bảng t_support_ticket_booking (nếu có)
  const ticketIds = rawTickets.map((t) => t.ticket_id);
  const ticketBookingMap = new Map();
  if (ticketIds.length > 0) {
    try {
      const { data: linkRows } = await supabase
        .from('t_support_ticket_booking')
        .select('ticket_id, booking_id')
        .in('ticket_id', ticketIds);
      (linkRows || []).forEach((row) => {
        if (row.ticket_id && row.booking_id && !ticketBookingMap.has(String(row.ticket_id))) {
          ticketBookingMap.set(String(row.ticket_id), row.booking_id);
        }
      });
    } catch {
      // Bỏ qua nếu bảng phụ không tồn tại
    }
  }

  // Tập hợp toàn bộ booking_id và user_id cần enrich
  const bookingIds = [
    ...new Set(
      [
        ...rawTickets.map((t) => t.booking_id || ticketBookingMap.get(String(t.ticket_id))),
        ...rawRefunds.map((r) => r.booking_id),
      ].filter(Boolean)
    ),
  ];

  const bookingsById = new Map();
  if (bookingIds.length > 0) {
    const { data: bookingsData } = await supabase
      .from('t_booking')
      .select(
        `
        booking_id,
        user_id,
        hotel_id,
        total_amount,
        discount_amount,
        guest_name,
        guest_phone,
        booking_status_cd,
        cancellation_policy_id,
        applied_penalty_rate,
        created_at,
        updated_at,
        m_hotel (hotel_id, name),
        t_booking_detail (check_in_date, check_out_date, quantity, unit_price),
        t_payment_transaction (transaction_id, amount_paid, paid_at, gateway_ref_id)
      `
      )
      .in('booking_id', bookingIds);

    (bookingsData || []).forEach((b) => {
      bookingsById.set(String(b.booking_id), b);
    });
  }

  const hotelIds = [
    ...new Set(
      [...bookingsById.values()].map((b) => b.hotel_id).filter(Boolean)
    ),
  ];
  const policiesMap = new Map();
  if (hotelIds.length > 0) {
    const { data: policies } = await supabase
      .from('m_cancellation_policy')
      .select('*')
      .in('hotel_id', hotelIds);
    (policies || []).forEach((p) => {
      policiesMap.set(String(p.cancellation_policy_id), p);
      if (p.hotel_id && !policiesMap.has(`hotel:${p.hotel_id}`)) {
        policiesMap.set(`hotel:${p.hotel_id}`, p);
      }
    });
  }

  const userIds = [
    ...new Set(
      [
        ...rawTickets.map((t) => t.requester_id),
        ...rawRefunds.map((r) => r.requester_id),
        ...[...bookingsById.values()].map((b) => b.user_id),
      ].filter(Boolean)
    ),
  ];

  const usersById = new Map();
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('m_user')
      .select(
        'user_id, full_name, email, phone, refund_bank_cd, refund_account_number, refund_account_holder'
      )
      .in('user_id', userIds);
    (usersData || []).forEach((u) => {
      usersById.set(String(u.user_id), u);
    });
  }

  const ticketsMap = new Map();
  rawTickets.forEach((t) => ticketsMap.set(String(t.ticket_id), t));

  // Tập các ticket_id đã có refund_request
  const ticketIdsWithRefund = new Set(
    rawRefunds.map((r) => (r.ticket_id ? String(r.ticket_id) : null)).filter(Boolean)
  );

  // Map các refund_request đang PND theo booking_id (để phát hiện đơn hủy đã có sẵn lệnh chờ)
  const pendingRefundByBookingId = new Map();
  rawRefunds.forEach((r) => {
    const stName = sysCodes.nameOf('REFUND_STS', r.refund_status_cd);
    if (
      (stName === 'PND' || String(r.refund_status_cd) === String(refundPndCd)) &&
      r.booking_id &&
      !r.ticket_id
    ) {
      pendingRefundByBookingId.set(String(r.booking_id), r);
    }
  });

  // 1) Danh sách Support Ticket RFD đã duyệt (RSV) và chưa tạo refund request
  const approvedTickets = rawTickets
    .filter((t) => !ticketIdsWithRefund.has(String(t.ticket_id)))
    .map((t) => {
      const resolvedBookingId = t.booking_id || ticketBookingMap.get(String(t.ticket_id)) || null;
      const booking = resolvedBookingId ? bookingsById.get(String(resolvedBookingId)) || null : null;
      const customer =
        usersById.get(String(t.requester_id)) ||
        (booking ? usersById.get(String(booking.user_id)) : null) ||
        null;

      const suggestion = calculateSuggestedRefundForBooking(booking, policiesMap);
      const existingPending = resolvedBookingId
        ? pendingRefundByBookingId.get(String(resolvedBookingId)) || null
        : null;

      const bankCd = customer?.refund_bank_cd || existingPending?.bank_cd || '';
      const accountNumber =
        customer?.refund_account_number || existingPending?.account_number || '';
      const accountHolder =
        customer?.refund_account_holder ||
        existingPending?.account_holder ||
        customer?.full_name ||
        booking?.guest_name ||
        '';

      return {
        ticket_id: t.ticket_id,
        ticket_code: `TK-${String(t.ticket_id).slice(0, 8).toUpperCase()}`,
        title: t.title,
        description: t.description,
        resolution_note: t.resolution_note || '',
        resolved_at: t.resolved_at || t.updated_at,
        created_at: t.created_at,
        requester_id: t.requester_id,
        customer: {
          user_id: customer?.user_id || t.requester_id,
          full_name: customer?.full_name || booking?.guest_name || 'Khách hàng',
          email: customer?.email || '',
          phone: customer?.phone || booking?.guest_phone || '',
          refund_bank_cd: bankCd || null,
          refund_bank_name: bankCd ? sysCodes.bankLabelOf(bankCd) : null,
          refund_bank_short: bankCd ? sysCodes.bankShortOf(bankCd) : null,
          refund_account_number: accountNumber || null,
          refund_account_holder: accountHolder || null,
          has_refund_bank: Boolean(bankCd && accountNumber && accountHolder),
        },
        booking: booking
          ? {
              booking_id: booking.booking_id,
              booking_code: formatBookingCodeShort(booking.booking_id, booking.created_at),
              hotel_name: booking.m_hotel?.name || 'Khách sạn Avora',
              total_amount: Math.round(Number(booking.total_amount || 0)),
              paid_amount: suggestion.paid_amount,
              booking_status_name: sysCodes.nameOf('BOOKING_STS', booking.booking_status_cd),
            }
          : null,
        suggestion,
        existing_pending_refund: existingPending
          ? {
              refund_id: existingPending.refund_id,
              refund_amount: Math.round(Number(existingPending.refund_amount || 0)),
              reason: existingPending.reason || '',
              created_at: existingPending.created_at,
            }
          : null,
      };
    });

  // 2) Enrich toàn bộ danh sách t_refund_request
  const enrichedRefunds = rawRefunds.map((r) => {
    const statusName = sysCodes.nameOf('REFUND_STS', r.refund_status_cd);
    const booking = r.booking_id ? bookingsById.get(String(r.booking_id)) || null : null;
    const customerId = r.requester_id || booking?.user_id || null;
    const customer = customerId ? usersById.get(String(customerId)) || null : null;
    const parsedFromReason = parseBankFromReasonText(r.reason);

    const rawBankCd =
      r.bank_cd || customer?.refund_bank_cd || parsedFromReason.bank_cd || null;
    const resolvedBankCd = rawBankCd ? sysCodes.hasBankCd(rawBankCd) || rawBankCd : null;
    const resolvedAccNum =
      r.account_number ||
      customer?.refund_account_number ||
      parsedFromReason.account_number ||
      null;
    const resolvedHolder =
      r.account_holder ||
      customer?.refund_account_holder ||
      parsedFromReason.account_holder ||
      null;

    const isSettled =
      statusName === 'SUC' ||
      statusName === 'CMP' ||
      String(r.refund_status_cd) === String(refundSucCd);
    const isPending =
      !isSettled &&
      (statusName === 'PND' ||
        statusName === 'PRO' ||
        String(r.refund_status_cd) === String(refundPndCd) ||
        String(r.refund_status_cd) === String(refundProCd));

    const linkedTicket = r.ticket_id ? ticketsMap.get(String(r.ticket_id)) || null : null;

    return {
      refund_id: r.refund_id,
      refund_code: `RF-${String(r.refund_id).slice(0, 8).toUpperCase()}`,
      ticket_id: r.ticket_id || null,
      ticket_code: r.ticket_id ? `TK-${String(r.ticket_id).slice(0, 8).toUpperCase()}` : null,
      ticket_title: linkedTicket?.title || null,
      booking_id: r.booking_id || null,
      booking_code: r.booking_id
        ? formatBookingCodeShort(r.booking_id, booking?.created_at || r.created_at)
        : null,
      hotel_name: booking?.m_hotel?.name || (r.ticket_id ? 'Hoàn tiền qua Support Ticket' : 'Khách sạn Avora'),
      source_type: r.ticket_id ? 'TICKET' : 'BOOKING_CANCEL',
      source_label: r.ticket_id ? 'Từ Support Ticket (RFD)' : 'Từ đơn đặt phòng bị hủy',
      requester_id: customerId,
      customer_name: customer?.full_name || booking?.guest_name || 'Khách hàng',
      customer_email: customer?.email || '',
      customer_phone: customer?.phone || booking?.guest_phone || '',
      refund_amount: Math.round(Number(r.refund_amount || 0)),
      refund_status_cd: String(r.refund_status_cd),
      status_code: isSettled ? 'SUC' : isPending ? 'PND' : statusName,
      status_label: isSettled
        ? 'Đã hoàn tiền'
        : isPending
          ? 'Chờ hoàn tiền'
          : ' Đã đóng / Hủy',
      is_settled: isSettled,
      is_pending: isPending,
      bank_cd: resolvedBankCd,
      bank_short_code: resolvedBankCd ? sysCodes.bankShortOf(resolvedBankCd) : null,
      bank_name: resolvedBankCd ? sysCodes.bankLabelOf(resolvedBankCd) : 'Chưa có ngân hàng',
      account_number: resolvedAccNum,
      account_holder: resolvedHolder,
      has_bank_info: Boolean(resolvedBankCd && resolvedAccNum && resolvedHolder),
      payment_code: r.payment_code || null,
      gateway_refund_ref: r.gateway_refund_ref || null,
      settlement_source: r.settlement_source || null,
      paid_at: r.paid_at || null,
      reason: r.reason || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  const pendingRequests = enrichedRefunds.filter((r) => r.is_pending);
  const completedRequests = enrichedRefunds.filter((r) => r.is_settled);

  return {
    summary: {
      approved_tickets_count: approvedTickets.length,
      pending_refunds_count: pendingRequests.length,
      pending_refunds_amount: pendingRequests.reduce((s, r) => s + r.refund_amount, 0),
      completed_refunds_count: completedRequests.length,
      completed_refunds_amount: completedRequests.reduce((s, r) => s + r.refund_amount, 0),
    },
    approved_tickets: approvedTickets,
    pending_requests: pendingRequests,
    completed_requests: completedRequests,
  };
};

/**
 * Tạo (hoặc gộp vào lệnh PND có sẵn của đơn) 1 Refund Request từ Support Ticket RFD đã duyệt (RSV).
 */
const createRefundRequestFromTicket = async (ticketId, payload, currentUser) => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const { data: ticket, error: tErr } = await supabase
    .from('t_support_ticket')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (tErr) throw createError(500, `Lỗi truy vấn Support Ticket: ${tErr.message}`);
  if (!ticket) throw createError(404, 'Không tìm thấy phiếu hỗ trợ (Support Ticket).');

  const ticketTypeName = sysCodes.nameOf('SUPPORT_CAT', ticket.ticket_type_cd);
  const ticketStatusName = sysCodes.nameOf('SUPPORT_STS', ticket.ticket_status_cd);
  if (ticketTypeName !== 'RFD') {
    throw createError(400, 'Chỉ được tạo lệnh hoàn tiền từ các phiếu hỗ trợ thuộc danh mục Yêu cầu hoàn tiền (RFD).');
  }
  if (ticketStatusName !== 'RSV') {
    throw createError(400, 'Chỉ được tạo lệnh hoàn tiền khi phiếu hỗ trợ đã ở trạng thái Đã giải quyết (RSV).');
  }

  // Kiểm tra ticket này đã được tạo lệnh hoàn tiền chưa
  const { data: existingByTicket } = await supabase
    .from('t_refund_request')
    .select('refund_id')
    .eq('ticket_id', ticketId)
    .maybeSingle();
  if (existingByTicket) {
    throw createError(409, 'Phiếu hỗ trợ này đã được tạo lệnh hoàn tiền trước đó.', 'TICKET_ALREADY_HAS_REFUND');
  }

  const amount = Math.round(Number(payload?.refund_amount));
  if (!Number.isInteger(amount) || amount <= 0) {
    throw createError(400, 'Số tiền hoàn phải là số nguyên VND lớn hơn 0.');
  }

  // Lấy thông tin khách hàng để fallback STK mặc định nếu payload không truyền
  const { data: customer } = await supabase
    .from('m_user')
    .select('user_id, full_name, refund_bank_cd, refund_account_number, refund_account_holder')
    .eq('user_id', ticket.requester_id)
    .maybeSingle();

  const rawBankInput = String(payload?.bank_cd ?? customer?.refund_bank_cd ?? '').trim();
  const rawAccInput = String(payload?.account_number ?? customer?.refund_account_number ?? '').trim();
  const rawHolderInput = String(payload?.account_holder ?? customer?.refund_account_holder ?? '')
    .trim()
    .toUpperCase();

  const resolvedBankCd = sysCodes.hasBankCd(rawBankInput);
  if (!resolvedBankCd) {
    throw createError(400, 'Vui lòng chọn ngân hàng nhận hoàn tiền hợp lệ.');
  }
  if (!ACCOUNT_NUMBER_REGEX.test(rawAccInput)) {
    throw createError(400, 'Số tài khoản nhận hoàn tiền không hợp lệ (4–30 ký tự chữ/số).');
  }
  if (rawHolderInput.length < 2 || rawHolderInput.length > 120) {
    throw createError(400, 'Tên chủ tài khoản không hợp lệ (2–120 ký tự).');
  }

  // Nếu BMR tích chọn lưu cập nhật luôn vào m_user giúp khách
  if (payload?.save_to_user_profile && ticket.requester_id) {
    await supabase
      .from('m_user')
      .update({
        refund_bank_cd: resolvedBankCd,
        refund_account_number: rawAccInput,
        refund_account_holder: rawHolderInput,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', ticket.requester_id);
  }

  const bankLabel = sysCodes.bankLabelOf(resolvedBankCd);
  const customNote = String(payload?.note || '').trim();
  const reasonParts = [
    `Tạo từ Support Ticket #${String(ticketId).slice(0, 8).toUpperCase()} (${ticket.title})`,
    `Hoàn tiền về: ${bankLabel}`,
    `Mã ngân hàng (System Code): ${resolvedBankCd}`,
    `Số TK: ${rawAccInput}`,
    `Chủ TK: ${rawHolderInput}`,
    customNote ? `Ghi chú BMR: ${customNote}` : null,
  ].filter(Boolean);

  const refundPndCd = sysCodes.cdOf('REFUND_STS', 'PND') || '1';
  const nowIso = new Date().toISOString();

  // Kiểm tra xem có gộp vào lệnh PND đang chờ sẵn của booking_id hay không
  let targetBookingId = ticket.booking_id || payload?.booking_id || null;
  if (!targetBookingId) {
    try {
      const { data: linkRow } = await supabase
        .from('t_support_ticket_booking')
        .select('booking_id')
        .eq('ticket_id', ticketId)
        .limit(1)
        .maybeSingle();
      if (linkRow?.booking_id) targetBookingId = linkRow.booking_id;
    } catch {
      // Ignore
    }
  }

  const mergeRefundId = payload?.merge_existing_refund_id || null;
  if (mergeRefundId) {
    const { data: updatedRefund, error: mergeErr } = await supabase
      .from('t_refund_request')
      .update({
        ticket_id: ticketId,
        requester_id: ticket.requester_id,
        refund_amount: amount,
        bank_cd: resolvedBankCd,
        account_number: rawAccInput,
        account_holder: rawHolderInput,
        reason: reasonParts.join(' • '),
        updated_at: nowIso,
      })
      .eq('refund_id', mergeRefundId)
      .eq('refund_status_cd', refundPndCd)
      .select('*')
      .maybeSingle();

    if (mergeErr) throw createError(500, `Không thể cập nhật lệnh hoàn tiền hiện có: ${mergeErr.message}`);
    if (updatedRefund) {
      recordAuditLog({
        actor_user_id: currentUser?.user_id || null,
        action_cd: '2',
        entity_name: 't_refund_request',
        entity_id: updatedRefund.refund_id,
        old_data: { ticket_id: null },
        new_data: {
          ticket_id: ticketId,
          refund_amount: amount,
          bank_cd: resolvedBankCd,
          account_number: rawAccInput,
        },
      });
      return updatedRefund;
    }
  }

  // Tìm giao dịch gốc của booking (nếu có)
  let transactionId = null;
  if (targetBookingId) {
    const { data: txRow } = await supabase
      .from('t_payment_transaction')
      .select('transaction_id')
      .eq('booking_id', targetBookingId)
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    transactionId = txRow?.transaction_id || null;
  }

  const { data: createdRefund, error: insErr } = await supabase
    .from('t_refund_request')
    .insert({
      ticket_id: ticketId,
      requester_id: ticket.requester_id,
      booking_id: targetBookingId,
      transaction_id: transactionId,
      refund_amount: amount,
      refund_status_cd: refundPndCd,
      bank_cd: resolvedBankCd,
      account_number: rawAccInput,
      account_holder: rawHolderInput,
      gateway_refund_ref: `REF-TK-${String(ticketId).slice(0, 8).toUpperCase()}`,
      reason: reasonParts.join(' • '),
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      throw createError(409, 'Phiếu hỗ trợ này đã được tạo lệnh hoàn tiền.', 'TICKET_ALREADY_HAS_REFUND');
    }
    throw createError(500, `Không thể tạo yêu cầu hoàn tiền: ${insErr.message}`);
  }

  recordAuditLog({
    actor_user_id: currentUser?.user_id || null,
    action_cd: '1',
    entity_name: 't_refund_request',
    entity_id: createdRefund.refund_id,
    old_data: null,
    new_data: {
      ticket_id: ticketId,
      booking_id: targetBookingId,
      refund_amount: amount,
      bank_cd: resolvedBankCd,
      account_number: rawAccInput,
    },
  });

  return createdRefund;
};

/**
 * Cập nhật thông tin ngân hàng thụ hưởng (và tùy chọn số tiền hoàn) cho 1 Refund Request đang PND.
 */
const updateRefundRequestInfo = async (refundId, payload, currentUser) => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const { data: refund, error: rErr } = await supabase
    .from('t_refund_request')
    .select('*')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (rErr) throw createError(500, `Lỗi truy vấn yêu cầu hoàn tiền: ${rErr.message}`);
  if (!refund) throw createError(404, 'Không tìm thấy yêu cầu hoàn tiền.');

  const statusName = sysCodes.nameOf('REFUND_STS', refund.refund_status_cd);
  if (statusName === 'SUC' || statusName === 'CMP') {
    throw createError(409, 'Yêu cầu hoàn tiền này đã được thanh toán hoàn tất, không thể chỉnh sửa.');
  }

  const rawBank = String(payload?.bank_cd || '').trim();
  const rawAcc = String(payload?.account_number || '').trim();
  const rawHolder = String(payload?.account_holder || '').trim().toUpperCase();

  const resolvedBankCd = sysCodes.hasBankCd(rawBank);
  if (!resolvedBankCd) {
    throw createError(400, 'Vui lòng chọn ngân hàng nhận hoàn tiền hợp lệ.');
  }
  if (!ACCOUNT_NUMBER_REGEX.test(rawAcc)) {
    throw createError(400, 'Số tài khoản nhận hoàn tiền không hợp lệ (4–30 ký tự chữ/số).');
  }
  if (rawHolder.length < 2 || rawHolder.length > 120) {
    throw createError(400, 'Tên chủ tài khoản không hợp lệ (2–120 ký tự).');
  }

  const updates = {
    bank_cd: resolvedBankCd,
    account_number: rawAcc,
    account_holder: rawHolder,
    updated_at: new Date().toISOString(),
  };

  if (payload?.refund_amount !== undefined) {
    const newAmount = Math.round(Number(payload.refund_amount));
    if (!Number.isInteger(newAmount) || newAmount <= 0) {
      throw createError(400, 'Số tiền hoàn phải là số nguyên VND lớn hơn 0.');
    }
    updates.refund_amount = newAmount;
  }

  const { data: updated, error: uErr } = await supabase
    .from('t_refund_request')
    .update(updates)
    .eq('refund_id', refundId)
    .select('*')
    .single();

  if (uErr) throw createError(500, `Không thể cập nhật thông tin hoàn tiền: ${uErr.message}`);

  // Tùy chọn lưu luôn vào m_user giúp khách
  let targetUserId = refund.requester_id || null;
  if (!targetUserId && refund.booking_id) {
    const { data: bRow } = await supabase
      .from('t_booking')
      .select('user_id')
      .eq('booking_id', refund.booking_id)
      .maybeSingle();
    targetUserId = bRow?.user_id || null;
  }
  if (payload?.save_to_user_profile && targetUserId) {
    await supabase
      .from('m_user')
      .update({
        refund_bank_cd: resolvedBankCd,
        refund_account_number: rawAcc,
        refund_account_holder: rawHolder,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId);
  }

  recordAuditLog({
    actor_user_id: currentUser?.user_id || null,
    action_cd: '2',
    entity_name: 't_refund_request',
    entity_id: refundId,
    old_data: {
      bank_cd: refund.bank_cd,
      account_number: refund.account_number,
      refund_amount: refund.refund_amount,
    },
    new_data: updates,
  });

  return updated;
};

/**
 * Gán idempotent mã AVRRFxxxxxxxx cho yêu cầu hoàn tiền đang chờ.
 */
const ensureRefundPaymentCode = async (refund) => {
  if (refund.payment_code) return refund.payment_code;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateRefundPayoutCode();
    const { data, error } = await supabase
      .from('t_refund_request')
      .update({ payment_code: candidate, updated_at: new Date().toISOString() })
      .eq('refund_id', refund.refund_id)
      .is('payment_code', null)
      .select('payment_code')
      .maybeSingle();

    if (!error) {
      if (data?.payment_code) return data.payment_code;
      const { data: reread } = await supabase
        .from('t_refund_request')
        .select('payment_code')
        .eq('refund_id', refund.refund_id)
        .maybeSingle();
      if (reread?.payment_code) return reread.payment_code;
    } else if (error.code === '23505') {
      continue;
    } else {
      throw createError(500, `Không thể sinh mã hoàn tiền AVRRF: ${error.message}`);
    }
  }

  throw createError(500, 'Không thể sinh mã thanh toán hoàn tiền AVRRF. Vui lòng thử lại.');
};

/**
 * Lấy thông tin VietQR (AVRRFxxxxxxxx) để Business Manager quét chuyển tiền hoàn cho khách.
 */
const getRefundPaymentQr = async (refundId) => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const { data: refund, error } = await supabase
    .from('t_refund_request')
    .select('*')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (error) throw createError(500, `Lỗi tải yêu cầu hoàn tiền: ${error.message}`);
  if (!refund) throw createError(404, 'Không tìm thấy yêu cầu hoàn tiền.');

  const statusName = sysCodes.nameOf('REFUND_STS', refund.refund_status_cd);
  if (statusName === 'SUC' || statusName === 'CMP') {
    return {
      refund_id: refund.refund_id,
      refund_status_cd: String(refund.refund_status_cd),
      status_code: 'SUC',
      is_settled: true,
      gateway_refund_ref: refund.gateway_refund_ref || null,
      paid_at: refund.paid_at || null,
      settlement_source: refund.settlement_source || null,
    };
  }

  // Tìm booking & customer để bổ sung thông tin hiển thị và fallback STK
  const { data: booking } = refund.booking_id
    ? await supabase
        .from('t_booking')
        .select('booking_id, user_id, guest_name, guest_phone, created_at, m_hotel(name)')
        .eq('booking_id', refund.booking_id)
        .maybeSingle()
    : { data: null };

  const customerId = refund.requester_id || booking?.user_id || null;
  const { data: customer } = customerId
    ? await supabase
        .from('m_user')
        .select('user_id, full_name, email, phone, refund_bank_cd, refund_account_number, refund_account_holder')
        .eq('user_id', customerId)
        .maybeSingle()
    : { data: null };

  const parsedReason = parseBankFromReasonText(refund.reason);
  const rawBankCd = refund.bank_cd || customer?.refund_bank_cd || parsedReason.bank_cd || null;
  const resolvedBankCd = rawBankCd ? sysCodes.hasBankCd(rawBankCd) || rawBankCd : null;
  const accountNumber =
    refund.account_number || customer?.refund_account_number || parsedReason.account_number || null;
  const accountHolder =
    refund.account_holder || customer?.refund_account_holder || parsedReason.account_holder || null;

  if (!resolvedBankCd || !accountNumber || !accountHolder) {
    throw createError(
      422,
      'Yêu cầu hoàn tiền này chưa có đầy đủ Ngân hàng, Số tài khoản hoặc Chủ tài khoản thụ hưởng. Vui lòng cập nhật STK trước khi tạo mã QR.',
      'MISSING_BANK_INFO'
    );
  }

  // Lưu ngược lại bank_cd / account_number / account_holder vào dòng t_refund_request nếu trước đó chỉ nằm ở m_user/reason
  if (!refund.bank_cd || !refund.account_number || !refund.account_holder) {
    await supabase
      .from('t_refund_request')
      .update({
        bank_cd: resolvedBankCd,
        account_number: accountNumber,
        account_holder: accountHolder,
        requester_id: customerId,
      })
      .eq('refund_id', refund.refund_id);
  }

  const bankShortCode = sysCodes.bankShortOf(resolvedBankCd);
  const bin = vietqr.resolveBin({ binCode: null, bankShortCode });
  if (!bin) {
    throw createError(
      422,
      `Không xác định được mã BIN NAPAS cho ngân hàng "${bankShortCode}". Vui lòng kiểm tra lại ngân hàng thụ hưởng.`,
      'INVALID_BANK_BIN'
    );
  }

  const amount = Math.round(Number(refund.refund_amount || 0));
  const paymentCode = await ensureRefundPaymentCode(refund);

  let qrUrl;
  try {
    qrUrl = buildRefundQrUrl({
      bin,
      accountNumber,
      accountHolder,
      amount,
      paymentCode,
    });
  } catch (err) {
    throw createError(422, err.message);
  }

  return {
    refund_id: refund.refund_id,
    refund_status_cd: String(refund.refund_status_cd),
    status_code: 'PND',
    is_settled: false,
    booking_id: refund.booking_id || null,
    booking_code: refund.booking_id
      ? formatBookingCodeShort(refund.booking_id, booking?.created_at)
      : null,
    ticket_id: refund.ticket_id || null,
    hotel_name: booking?.m_hotel?.name || 'Hoàn tiền khách hàng Avora',
    customer_name: customer?.full_name || booking?.guest_name || accountHolder,
    customer_email: customer?.email || '',
    customer_phone: customer?.phone || booking?.guest_phone || '',
    amount,
    payment_code: paymentCode,
    transfer_content: paymentCode,
    qr_url: qrUrl,
    bank: {
      bank_cd: resolvedBankCd,
      bank_code: bankShortCode,
      bank_name: sysCodes.bankLabelOf(resolvedBankCd),
      bin,
      account_number: accountNumber,
      account_holder: accountHolder,
    },
  };
};

/**
 * Polling trạng thái thanh toán của 1 Refund Request.
 */
const getRefundPaymentStatus = async (refundId) => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const { data: refund, error } = await supabase
    .from('t_refund_request')
    .select('*')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (error) throw createError(500, `Lỗi kiểm tra trạng thái hoàn tiền: ${error.message}`);
  if (!refund) throw createError(404, 'Không tìm thấy yêu cầu hoàn tiền.');

  const statusName = sysCodes.nameOf('REFUND_STS', refund.refund_status_cd);
  const isSettled = statusName === 'SUC' || statusName === 'CMP';

  return {
    refund_id: refund.refund_id,
    refund_status_cd: String(refund.refund_status_cd),
    status_code: isSettled ? 'SUC' : 'PND',
    status_label: isSettled ? 'Đã hoàn tiền' : 'Chờ hoàn tiền',
    is_settled: isSettled,
    gateway_refund_ref: refund.gateway_refund_ref || null,
    paid_at: refund.paid_at || null,
    settlement_source: refund.settlement_source || null,
  };
};

/**
 * Xác nhận hoàn tiền thủ công bằng mã tham chiếu ngân hàng (dự phòng khi không đợi webhook SePay).
 */
const settleRefundManually = async (refundId, bmrUserId, payload = {}) => {
  ensureClient();
  const sysCodes = await loadSystemCodeMaps();

  const refCode = String(
    payload.gateway_refund_ref || payload.gateway_transaction_ref || payload.gateway_ref || ''
  ).trim();
  const note = String(payload.note || '').trim();

  if (!refCode) {
    throw createError(400, 'Vui lòng nhập mã giao dịch / tham chiếu ngân hàng (FT...) để xác nhận hoàn tiền thủ công.');
  }
  if (refCode.length > 100) {
    throw createError(400, 'Mã tham chiếu ngân hàng quá dài (tối đa 100 ký tự).');
  }

  const { data: refund, error: rErr } = await supabase
    .from('t_refund_request')
    .select('*')
    .eq('refund_id', refundId)
    .maybeSingle();

  if (rErr || !refund) {
    throw createError(404, 'Không tìm thấy yêu cầu hoàn tiền.');
  }

  const statusName = sysCodes.nameOf('REFUND_STS', refund.refund_status_cd);
  if (statusName === 'SUC' || statusName === 'CMP') {
    throw createError(400, 'Yêu cầu hoàn tiền này đã được chi trả thành công trước đó.');
  }

  const refundSucCd = sysCodes.cdOf('REFUND_STS', 'SUC') || '3';
  const nowIso = new Date().toISOString();
  const updatedReason = note ? `${refund.reason || ''} • Ghi chú đối soát: ${note}` : refund.reason;

  const { data: updated, error: uErr } = await supabase
    .from('t_refund_request')
    .update({
      refund_status_cd: refundSucCd,
      gateway_refund_ref: refCode,
      paid_at: nowIso,
      settlement_source: 'MANUAL',
      settled_by: bmrUserId || null,
      reason: updatedReason,
      updated_at: nowIso,
    })
    .eq('refund_id', refundId)
    .eq('refund_status_cd', refund.refund_status_cd)
    .select('*')
    .maybeSingle();

  if (uErr) throw createError(500, `Không thể cập nhật trạng thái hoàn tiền: ${uErr.message}`);
  if (!updated) {
    throw createError(
      409,
      'Yêu cầu hoàn tiền vừa được xử lý bởi tiến trình khác (có thể SePay vừa tự động xác nhận). Vui lòng tải lại.'
    );
  }

  if (refund.transaction_id) {
    await supabase
      .from('t_payment_transaction')
      .update({ is_refunded: true, updated_at: nowIso })
      .eq('transaction_id', refund.transaction_id);
  } else if (refund.booking_id) {
    await supabase
      .from('t_payment_transaction')
      .update({ is_refunded: true, updated_at: nowIso })
      .eq('booking_id', refund.booking_id);
  }

  recordAuditLog({
    actor_user_id: bmrUserId || null,
    action_cd: '2',
    entity_name: 't_refund_request',
    entity_id: refundId,
    old_data: { refund_status_cd: refund.refund_status_cd },
    new_data: {
      refund_status_cd: refundSucCd,
      settlement_source: 'MANUAL',
      gateway_refund_ref: refCode,
      note: note || null,
    },
  });

  return {
    refund_id: updated.refund_id,
    refund_status_cd: String(updated.refund_status_cd),
    status_code: 'SUC',
    status_label: 'Đã hoàn tiền',
    is_settled: true,
    gateway_refund_ref: updated.gateway_refund_ref,
    paid_at: updated.paid_at,
    settlement_source: 'MANUAL',
  };
};

/**
 * Xử lý webhook SePay cho giao dịch TIỀN RA (transferType = 'out') mang mã AVRRFxxxxxxxx.
 */
const processSepayRefundPayout = async (payload) => {
  ensureClient();

  if (String(payload?.transferType || '').toLowerCase() !== 'out') {
    return { result: 'IGNORED_NOT_OUTGOING' };
  }

  const paymentCode = extractRefundPayoutCode(payload?.content || payload?.description);
  if (!paymentCode) return { result: 'NO_REFUND_CODE' };

  const expectedAccount = String(env.SEPAY_PAYOUT_ACCOUNT_NUMBER || '').trim();
  const sourceAccount = String(payload?.accountNumber || '').trim();
  if (expectedAccount && sourceAccount && expectedAccount !== sourceAccount) {
    return { result: 'IGNORED_ACCOUNT_MISMATCH', payment_code: paymentCode };
  }

  const transferAmount = Number(payload?.transferAmount);
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return { result: 'INVALID_AMOUNT', payment_code: paymentCode };
  }

  const sepayTxId = payload?.id != null ? String(payload.id) : null;
  const gatewayRef = String(payload?.referenceCode || payload?.code || '').trim() || null;

  const { data, error } = await supabase.rpc('fn_process_sepay_refund_payout', {
    p_payment_code: paymentCode,
    p_transfer_amount: transferAmount,
    p_gateway_ref: gatewayRef,
    p_sepay_tx_id: sepayTxId,
  });

  if (error) {
    throw createError(500, `Lỗi xử lý webhook hoàn tiền khách hàng: ${error.message}`);
  }

  const result = { ...(data || {}), payment_code: paymentCode };

  if (result.result === 'SETTLED') {
    recordAuditLog({
      actor_user_id: null,
      action_cd: '2',
      entity_name: 't_refund_request',
      entity_id: result.refund_id,
      old_data: { status_code: 'PND' },
      new_data: {
        status_code: 'SUC',
        settlement_source: 'SEPAY',
        gateway_refund_ref: result.gateway_refund_ref,
        sepay_transaction_id: sepayTxId,
      },
    });
  }

  return result;
};

module.exports = {
  REFUND_CODE_PREFIX,
  REFUND_CODE_REGEX,
  generateRefundPayoutCode,
  extractRefundPayoutCode,
  buildRefundQrUrl,
  getBusinessRefundOverview,
  createRefundRequestFromTicket,
  updateRefundRequestInfo,
  getRefundPaymentQr,
  getRefundPaymentStatus,
  settleRefundManually,
  processSepayRefundPayout,
};
