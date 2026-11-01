'use strict';

const supabase = require('../../config/supabaseClient');
const { codeNameParser } = require('../../utils/codeNameParser');

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureClient = () => {
  if (!supabase) {
    throw createError(503, 'Database client is not initialized.');
  }
};

const throwDatabaseError = (message, error) => {
  console.error(`[VenueWallet] ${message}:`, error?.message || error);
  throw createError(500, message);
};

const formatVndText = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return `${num.toLocaleString('vi-VN')} ₫`;
};

const formatShortBookingCode = (bookingId, createdAt) => {
  const d = createdAt ? new Date(createdAt) : new Date();
  const yr = Number.isNaN(d.getTime()) ? 26 : d.getFullYear() % 100;
  const mo = Number.isNaN(d.getTime()) ? '10' : String(d.getMonth() + 1).padStart(2, '0');
  const suffix = String(bookingId || '').replace(/-/g, '').substring(0, 6).toUpperCase();
  return `AV-${mo}${yr}-${suffix}`;
};

/**
 * Load system code map for dynamic code_cd -> code_name resolution
 */
const loadSystemCodeMap = async () => {
  const { data: rows } = await supabase
    .from('m_system_code')
    .select('business_cd, code_cd, code_name');

  const byBusiness = new Map();
  (rows || []).forEach((r) => {
    const bCd = String(r.business_cd || '').trim().toUpperCase();
    if (!byBusiness.has(bCd)) {
      byBusiness.set(bCd, new Map());
    }
    const map = byBusiness.get(bCd);
    const cd = String(r.code_cd || '').trim();
    const name = String(r.code_name || '').trim().toUpperCase();
    map.set(cd, name);
    map.set(name, name);
  });

  const getCodeName = (businessCd, rawVal, fallback = '') => {
    if (rawVal === undefined || rawVal === null || rawVal === '') return fallback;
    const map = byBusiness.get(String(businessCd).toUpperCase());
    const key = String(rawVal).trim();
    return map?.get(key) || map?.get(key.toUpperCase()) || key.toUpperCase() || fallback;
  };

  return { getCodeName };
};

/**
 * Core business function for Venue Wallet:
 * 1. Checks vendor ownership & active hotel status
 * 2. Inflow Tab (Tiền Vào):
 *    - Reads confirmed payments from t_payment_transaction (T_trans).
 *    - Calculates host earnings by deducting platform commission from m_commission_policy.
 *    - Generates detailed explanatory note.
 * 3. Outflow Tab (Tiền Ra):
 *    - Reads approved refunds from t_refund_request and withdrawal requests.
 *    - Auto-deducts refund portion based on hotel cancellation policy (m_cancellation_policy).
 *    - Generates detailed explanatory note with cancellation reason & penalty breakdown.
 * 4. Running Balance:
 *    - Tracks chronological wallet balance movements.
 */
const getVenueWalletDetails = async ({
  hotelId,
  vendorId,
  search = '',
  tab = 'all',
  from = null,
  to = null,
}) => {
  ensureClient();
  if (!vendorId) {
    throw createError(403, 'Không xác định được danh tính chủ chỗ nghỉ (Vendor).');
  }

  // 1. Verify vendor hotels and resolve target hotel
  const { data: vendorHotels, error: listErr } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id, hotel_status, star_quality')
    .eq('owner_id', vendorId)
    .eq('is_deleted', false)
    .eq('hotel_status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (listErr) {
    console.warn('[VenueWallet] list hotels error:', listErr.message);
  }

  const availableHotels = (vendorHotels || []).map((h) => ({
    hotel_id: h.hotel_id,
    hotel_name: h.name,
    star_rating: h.star_quality || null,
  }));

  // If vendor has no active hotels, return clean empty wallet structure instead of throwing 404
  if (availableHotels.length === 0) {
    return {
      hotel: null,
      availableHotels: [],
      balances: {
        available_balance: 0,
        pending_balance: 0,
        total_balance: 0,
      },
      bank_account: null,
      summary: {
        total_inflow_count: 0,
        total_gross_revenue: 0,
        total_commission_deducted: 0,
        total_inflow_net: 0,
        total_outflow_count: 0,
        total_outflow_all_count: 0,
        total_outflow_deducted: 0,
        pending_refund_amount: 0,
      },
      policies: {
        commission_policy: null,
        cancellation_policy: null,
      },
      transactions: {
        inflow: [],
        outflow: [],
      },
      tabs: {
        inflow: [],
        outflow: [],
      },
      allTransactions: [],
    };
  }

  // Resolve target hotel: if 'default', 'current', or not in vendor's hotels, fallback to first available hotel
  let hotel = (vendorHotels || []).find((h) => h.hotel_id === hotelId);
  if (!hotel) {
    hotel = vendorHotels[0];
    hotelId = hotel.hotel_id;
  }

  const hotelStar = Number(hotel.star_quality || hotel.star_rating || 0) || null;
  const todayDateStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 2. Load or initialize t_hotel_wallet
  let { data: wallet } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('hotel_id', hotelId)
    .limit(1)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet } = await supabase
      .from('t_hotel_wallet')
      .insert({
        hotel_id: hotelId,
        pending_balance: 0,
        available_balance: 0,
      })
      .select('*')
      .maybeSingle();
    wallet = newWallet;
  }

  // 3. Query all related transactional and policy data concurrently
  const [
    sysCodeHelper,
    { data: commissionPolicies },
    { data: cancellationPolicies },
    { data: bookings, error: bookingsErr },
    { data: withdrawals },
    { data: bankAccount },
  ] = await Promise.all([
    loadSystemCodeMap(),
    supabase
      .from('m_commission_policy')
      .select('policy_id, policy_name, star_quality, hotel_id, commission_rate, priority_level, valid_from, valid_to, created_at')
      .or(`hotel_id.eq.${hotelId},hotel_id.is.null`)
      .order('priority_level', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('m_cancellation_policy')
      .select('cancellation_policy_id, hotel_id, free_cancel_before_hours, penalty_rate, description, created_at')
      .or(`hotel_id.eq.${hotelId},hotel_id.is.null`)
      .order('created_at', { ascending: false }),
    supabase
      .from('t_booking')
      .select(`
        booking_id,
        user_id,
        hotel_id,
        total_amount,
        discount_amount,
        guest_name,
        guest_phone,
        special_request,
        booking_status_cd,
        cancellation_policy_id,
        applied_penalty_rate,
        created_at,
        updated_at,
        t_booking_detail (
          booking_detail_id,
          room_type_id,
          check_in_date,
          check_out_date,
          quantity,
          unit_price,
          m_room_type ( type_name )
        ),
        t_payment_transaction (
          transaction_id,
          booking_id,
          payer_user_id,
          amount_paid,
          payment_method_cd,
          gateway_ref_id,
          is_refunded,
          paid_at,
          created_at,
          updated_at
        ),
        t_refund_request (
          refund_id,
          transaction_id,
          booking_id,
          refund_amount,
          refund_status_cd,
          gateway_refund_ref,
          reason,
          created_at,
          updated_at
        ),
        t_settlement (
          settlement_id,
          booking_id,
          hotel_id,
          total_amount_paid,
          applied_commission_rate,
          commission_amount,
          host_earnings,
          settlement_status_cd,
          created_at,
          updated_at
        )
      `)
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false }),
    wallet?.wallet_id
      ? supabase
          .from('t_withdrawal_request')
          .select('withdrawal_id, wallet_id, bank_account_id, amount, status_cd, gateway_transaction_ref, created_at, updated_at')
          .eq('wallet_id', wallet.wallet_id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('m_bank_account')
      .select('bank_account_id, bank_cd, bin_code, account_number, account_holder, bank_branch, is_verify')
      .eq('hotel_id', hotelId)
      .eq('is_verify', true)
      .maybeSingle(),
  ]);

  if (bookingsErr) {
    throwDatabaseError('Không thể tải dữ liệu đơn đặt phòng của chỗ nghỉ.', bookingsErr);
  }

  const { getCodeName } = sysCodeHelper;
  const commList = commissionPolicies || [];
  const cancelList = cancellationPolicies || [];

  // Helper to resolve applicable commission policy
  const resolveCommissionPolicy = (bookingDateIso) => {
    const dateKey = bookingDateIso ? String(bookingDateIso).slice(0, 10) : todayDateStr;
    const valid = commList.filter((cp) => {
      const vFrom = cp.valid_from ? String(cp.valid_from).slice(0, 10) : null;
      const vTo = cp.valid_to ? String(cp.valid_to).slice(0, 10) : null;
      if (vFrom && vFrom > dateKey) return false;
      if (vTo && vTo < dateKey) return false;
      if (cp.hotel_id && String(cp.hotel_id) === String(hotelId)) return true;
      if (!cp.hotel_id && cp.star_quality != null && hotelStar != null && Number(cp.star_quality) === hotelStar) return true;
      if (!cp.hotel_id && cp.star_quality == null) return true;
      return false;
    });

    valid.sort((a, b) => {
      const pDiff = Number(b.priority_level ?? 0) - Number(a.priority_level ?? 0);
      if (pDiff !== 0) return pDiff;
      const aHotel = a.hotel_id ? 2 : a.star_quality != null ? 1 : 0;
      const bHotel = b.hotel_id ? 2 : b.star_quality != null ? 1 : 0;
      return bHotel - aHotel;
    });

    return valid[0] || commList.find((cp) => String(cp.hotel_id) === String(hotelId)) || commList[0] || null;
  };

  // Helper to resolve applicable cancellation policy
  const resolveCancelPolicy = (booking) => {
    if (booking.cancellation_policy_id) {
      const exact = cancelList.find(
        (p) => String(p.cancellation_policy_id) === String(booking.cancellation_policy_id)
      );
      if (exact) return exact;
    }
    return (
      cancelList.find((p) => String(p.hotel_id) === String(hotelId)) ||
      cancelList.find((p) => !p.hotel_id) ||
      null
    );
  };

  const activeHotelCommissionPolicy = resolveCommissionPolicy(todayDateStr);
  const activeHotelCancelPolicy =
    cancelList.find((p) => String(p.hotel_id) === String(hotelId)) ||
    cancelList.find((p) => !p.hotel_id) ||
    null;

  const inflowTransactions = [];
  const outflowTransactions = [];

  let computedAvailableCredits = 0;
  let computedPendingCredits = 0;
  let computedApprovedOutflows = 0;
  let pendingRefundAmount = 0;

  for (const booking of bookings || []) {
    const bookingStatusName = getCodeName('BOOKING_STS', booking.booking_status_cd, 'PND');
    const bookingCode = formatShortBookingCode(booking.booking_id, booking.created_at);
    const details = Array.isArray(booking.t_booking_detail) ? booking.t_booking_detail : [];
    const firstDetail = details[0] || {};
    const checkInDate = firstDetail.check_in_date ? String(firstDetail.check_in_date).slice(0, 10) : null;
    const checkOutDate = firstDetail.check_out_date ? String(firstDetail.check_out_date).slice(0, 10) : null;

    const roomSummary =
      details.length > 0
        ? details
            .map((d) => `${d.quantity || 1}x ${d.m_room_type?.type_name || 'Phòng nghỉ'}`)
            .join(', ')
        : 'Đặt phòng chỗ nghỉ';

    const paymentTxns = Array.isArray(booking.t_payment_transaction)
      ? booking.t_payment_transaction
      : booking.t_payment_transaction
        ? [booking.t_payment_transaction]
        : [];

    const settlements = Array.isArray(booking.t_settlement)
      ? booking.t_settlement
      : booking.t_settlement
        ? [booking.t_settlement]
        : [];
    const settlement = settlements[0] || null;

    const refundRequests = Array.isArray(booking.t_refund_request)
      ? booking.t_refund_request
      : booking.t_refund_request
        ? [booking.t_refund_request]
        : [];

    const paidTxns = paymentTxns.filter(
      (tx) => Number(tx.amount_paid) > 0 || Boolean(tx.paid_at)
    );

    // Rule: Booking has confirmed payment in t_payment_transaction or confirmed status
    const hasConfirmedPayment =
      paidTxns.length > 0 || (bookingStatusName === 'CFM' && Number(booking.total_amount) > 0);

    const matchedCommPolicy = resolveCommissionPolicy(booking.created_at);
    const commRate =
      settlement?.applied_commission_rate != null
        ? Number(settlement.applied_commission_rate)
        : Number(matchedCommPolicy?.commission_rate ?? 0);
    const commPolicyName =
      matchedCommPolicy?.policy_name || (commRate > 0 ? `Chiết khấu sàn ${commRate}%` : 'Miễn phí hoa hồng (0%)');

    const primaryPaidTx = paidTxns[0] || paymentTxns[0] || null;
    const grossPaidAmount =
      primaryPaidTx && Number(primaryPaidTx.amount_paid) > 0
        ? Number(primaryPaidTx.amount_paid)
        : settlement && Number(settlement.total_amount_paid) > 0
          ? Number(settlement.total_amount_paid)
          : Number(booking.total_amount || 0);

    const commissionAmount =
      settlement?.commission_amount != null
        ? Number(settlement.commission_amount)
        : Math.round((grossPaidAmount * commRate) / 100);

    const hostEarnings =
      settlement?.host_earnings != null
        ? Number(settlement.host_earnings)
        : Math.max(0, grossPaidAmount - commissionAmount);

    const settlementStatusName = settlement
      ? getCodeName('SETTLEMENT_STS', settlement.settlement_status_cd, 'PND')
      : checkOutDate && checkOutDate <= todayDateStr
        ? 'CMP'
        : 'PND';

    const isSettledAvailable =
      settlementStatusName === 'CMP' || Boolean(checkOutDate && checkOutDate <= todayDateStr);

    // TAB 1: TIỀN VÀO (Doanh thu booking thanh toán thành công)
    if (hasConfirmedPayment && grossPaidAmount > 0) {
      const paidTimestamp =
        primaryPaidTx?.paid_at ||
        primaryPaidTx?.updated_at ||
        settlement?.created_at ||
        booking.updated_at ||
        booking.created_at;

      const paymentMethodName = getCodeName(
        'PAYMENT_METHOD',
        primaryPaidTx?.payment_method_cd,
        'BTR'
      );

      if (isSettledAvailable) {
        computedAvailableCredits += hostEarnings;
      } else {
        computedPendingCredits += hostEarnings;
      }

      const noteParts = [
        `Nhận tiền thanh toán đơn đặt phòng #${bookingCode} (${roomSummary})`,
        booking.guest_name ? `Khách hàng: ${booking.guest_name}` : null,
        `Tổng khách thanh toán: ${formatVndText(grossPaidAmount)}`,
        `Phí hoa hồng sàn (${commRate}% - ${commPolicyName}): -${formatVndText(commissionAmount)}`,
        `Thực cộng vào ví: +${formatVndText(hostEarnings)}`,
        booking.special_request ? `Ghi chú khách: "${booking.special_request}"` : null,
      ].filter(Boolean);

      inflowTransactions.push({
        id: primaryPaidTx?.transaction_id || settlement?.settlement_id || `in-${booking.booking_id}`,
        direction: 'IN',
        type_code: 'REV',
        type_label: 'Doanh thu đặt phòng',
        transaction_id: primaryPaidTx?.transaction_id || null,
        gateway_ref: primaryPaidTx?.gateway_ref_id || bookingCode,
        booking_id: booking.booking_id,
        booking_code: bookingCode,
        guest_name: booking.guest_name || 'Khách đặt phòng',
        guest_phone: booking.guest_phone || '',
        room_summary: roomSummary,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        payment_method: paymentMethodName === 'BTR' ? 'Chuyển khoản VietQR' : paymentMethodName,
        gross_amount: grossPaidAmount,
        commission_rate: commRate,
        commission_amount: commissionAmount,
        net_amount: hostEarnings,
        policy_name: commPolicyName,
        balance_bucket: isSettledAvailable ? 'AVAILABLE' : 'PENDING',
        balance_bucket_label: isSettledAvailable ? 'Số dư khả dụng' : 'Số dư chờ đối soát',
        status_code: 'SUC',
        status_label: 'Đã cộng vào ví',
        occurred_at: paidTimestamp,
        note: noteParts.join(' • '),
      });
    }

    // TAB 2: TIỀN RA (Hoàn tiền refund được duyệt theo chính sách hủy)
    const matchedCancelPolicy = resolveCancelPolicy(booking);
    const freeCancelHours =
      matchedCancelPolicy?.free_cancel_before_hours != null
        ? Number(matchedCancelPolicy.free_cancel_before_hours)
        : 24;
    const rawPenaltyRate =
      booking.applied_penalty_rate != null
        ? Number(booking.applied_penalty_rate)
        : matchedCancelPolicy?.penalty_rate != null
          ? Number(matchedCancelPolicy.penalty_rate)
          : 0;

    for (const refund of refundRequests) {
      const refundStatusName = getCodeName('REFUND_STS', refund.refund_status_cd, 'PND');
      const isRefundApproved =
        refundStatusName === 'SUC' ||
        refundStatusName === 'APR' ||
        refundStatusName === 'CMP' ||
        Boolean(primaryPaidTx?.is_refunded);

      let isFreeCancelWindow = true;
      if (checkInDate && freeCancelHours > 0 && refund.created_at) {
        const checkInTime = new Date(`${checkInDate}T14:00:00+07:00`).getTime();
        const cancelTime = new Date(refund.created_at).getTime();
        if (!Number.isNaN(checkInTime) && !Number.isNaN(cancelTime)) {
          isFreeCancelWindow = cancelTime <= checkInTime - freeCancelHours * 60 * 60 * 1000;
        }
      }

      const appliedPenaltyRate =
        booking.applied_penalty_rate != null
          ? Number(booking.applied_penalty_rate)
          : isFreeCancelWindow
            ? 0
            : rawPenaltyRate;
      const refundRatePercent = Math.max(0, 100 - appliedPenaltyRate);

      const customerRefundAmount =
        Number(refund.refund_amount) > 0
          ? Number(refund.refund_amount)
          : Math.round((grossPaidAmount * refundRatePercent) / 100);

      const walletDeductionAmount =
        hostEarnings > 0
          ? Math.round((hostEarnings * refundRatePercent) / 100)
          : customerRefundAmount;

      const retainedByHotel = Math.max(0, hostEarnings - walletDeductionAmount);

      if (isRefundApproved) {
        computedApprovedOutflows += walletDeductionAmount;
      } else if (refundStatusName === 'PND' || refundStatusName === 'PRO') {
        pendingRefundAmount += walletDeductionAmount;
      }

      const policyExplain =
        appliedPenaltyRate > 0
          ? `Phí phạt hủy ${appliedPenaltyRate}% (hoàn khách ${refundRatePercent}% theo quy định hủy trước ${freeCancelHours}h)`
          : `Hủy miễn phí trước ${freeCancelHours}h (hoàn khách 100%)`;

      const refundNoteParts = [
        refund.reason ? `Lý do: ${refund.reason}` : `Hoàn tiền đơn đặt phòng #${bookingCode}`,
        `Chính sách: ${policyExplain}`,
        `Số tiền hoàn khách: ${formatVndText(customerRefundAmount)}`,
        `Trừ khỏi ví khách sạn: -${formatVndText(walletDeductionAmount)}`,
        retainedByHotel > 0 ? `Chỗ nghỉ giữ lại phí phạt hủy: +${formatVndText(retainedByHotel)}` : null,
      ].filter(Boolean);

      outflowTransactions.push({
        id: refund.refund_id || `out-ref-${booking.booking_id}`,
        direction: 'OUT',
        type_code: 'REF',
        type_label: 'Hoàn tiền hủy phòng (Refund)',
        refund_id: refund.refund_id,
        transaction_id: refund.transaction_id || primaryPaidTx?.transaction_id || null,
        gateway_ref: refund.gateway_refund_ref || `REF-${bookingCode}`,
        booking_id: booking.booking_id,
        booking_code: bookingCode,
        guest_name: booking.guest_name || 'Khách đặt phòng',
        room_summary: roomSummary,
        gross_amount: grossPaidAmount,
        free_cancel_before_hours: freeCancelHours,
        applied_penalty_rate: appliedPenaltyRate,
        refund_rate_percent: refundRatePercent,
        customer_refund_amount: customerRefundAmount,
        net_amount: walletDeductionAmount,
        retained_amount: retainedByHotel,
        policy_name: matchedCancelPolicy?.description || policyExplain,
        is_deducted: isRefundApproved,
        status_code: refundStatusName,
        status_label: isRefundApproved
          ? 'Đã duyệt • Đã trừ ví'
          : refundStatusName === 'FLD'
            ? 'Thất bại'
            : 'Chờ duyệt hoàn tiền',
        occurred_at: refund.updated_at || refund.created_at || booking.updated_at,
        reason: refund.reason || 'Khách yêu cầu hủy đặt phòng',
        note: refundNoteParts.join(' • '),
      });
    }
  }

  // Include withdrawal requests in Tab 2
  for (const wdr of withdrawals || []) {
    const wdrStatusName = getCodeName('WITHDRAWAL_STS', wdr.status_cd, 'PND');
    const isWdrDeducted = wdrStatusName === 'APR' || wdrStatusName === 'CMP' || wdrStatusName === 'PRO';
    const wdrAmount = Math.max(0, Number(wdr.amount || 0));

    if (isWdrDeducted) {
      computedApprovedOutflows += wdrAmount;
    }

    outflowTransactions.push({
      id: wdr.withdrawal_id,
      direction: 'OUT',
      type_code: 'WDR',
      type_label: 'Rút tiền về ngân hàng',
      withdrawal_id: wdr.withdrawal_id,
      gateway_ref: wdr.gateway_transaction_ref || null,
      booking_id: null,
      booking_code: '—',
      guest_name: 'Chủ chỗ nghỉ (Vendor)',
      room_summary: 'Rút doanh thu từ ví chỗ nghỉ',
      gross_amount: wdrAmount,
      applied_penalty_rate: 0,
      refund_rate_percent: 100,
      customer_refund_amount: wdrAmount,
      net_amount: wdrAmount,
      retained_amount: 0,
      policy_name: 'Chuyển khoản về ngân hàng liên kết',
      is_deducted: isWdrDeducted,
      status_code: wdrStatusName,
      status_label:
        wdrStatusName === 'CMP'
          ? 'Đã chuyển khoản • Đã trừ ví'
          : isWdrDeducted
            ? 'Đã duyệt • Đã trừ ví'
            : wdrStatusName === 'REJ' || wdrStatusName === 'CAN' || wdrStatusName === 'FLD'
              ? 'Đã hủy'
              : 'Chờ duyệt rút tiền',
      occurred_at: wdr.updated_at || wdr.created_at,
      reason: 'Yêu cầu rút tiền doanh thu về tài khoản ngân hàng thụ hưởng',
      note: `Rút tiền từ ví về ngân hàng liên kết • Số tiền: -${formatVndText(wdrAmount)}${wdr.gateway_transaction_ref ? ` • Mã GD: ${wdr.gateway_transaction_ref}` : ''}`,
    });
  }

  // Chronological balance tracking
  const allChronological = [
    ...inflowTransactions.map((item) => ({
      item,
      delta: Number(item.net_amount || 0),
      time: new Date(item.occurred_at || 0).getTime() || 0,
    })),
    ...outflowTransactions
      .filter((item) => item.is_deducted)
      .map((item) => ({
        item,
        delta: -Number(item.net_amount || 0),
        time: new Date(item.occurred_at || 0).getTime() || 0,
      })),
  ].sort((a, b) => a.time - b.time);

  let running = 0;
  for (const entry of allChronological) {
    running = Math.max(0, running + entry.delta);
    entry.item.balance_after = running;
  }

  inflowTransactions.sort(
    (a, b) => (new Date(b.occurred_at || 0).getTime() || 0) - (new Date(a.occurred_at || 0).getTime() || 0)
  );
  outflowTransactions.sort(
    (a, b) => (new Date(b.occurred_at || 0).getTime() || 0) - (new Date(a.occurred_at || 0).getTime() || 0)
  );

  const filterByDate = (list) => {
    return list.filter((item) => {
      if (!item.occurred_at) return true;
      const dStr = String(item.occurred_at).slice(0, 10);
      if (from && dStr < from) return false;
      if (to && dStr > to) return false;
      return true;
    });
  };

  const filterBySearch = (list) => {
    if (!search || !search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (item) =>
        item.booking_code?.toLowerCase().includes(q) ||
        item.gateway_ref?.toLowerCase().includes(q) ||
        item.guest_name?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.reason?.toLowerCase().includes(q) ||
        item.room_summary?.toLowerCase().includes(q)
    );
  };

  const finalInflow = filterBySearch(filterByDate(inflowTransactions));
  const finalOutflow = filterBySearch(filterByDate(outflowTransactions));
  const allTransactions = [...finalInflow, ...finalOutflow].sort(
    (a, b) => (new Date(b.occurred_at || 0).getTime() || 0) - (new Date(a.occurred_at || 0).getTime() || 0)
  );

  const totalGrossRevenue = inflowTransactions.reduce((acc, tx) => acc + Number(tx.gross_amount || 0), 0);
  const totalCommissionDeducted = inflowTransactions.reduce((acc, tx) => acc + Number(tx.commission_amount || 0), 0);
  const totalNetInflow = inflowTransactions.reduce((acc, tx) => acc + Number(tx.net_amount || 0), 0);
  const totalDeductedOutflow = outflowTransactions
    .filter((tx) => tx.is_deducted)
    .reduce((acc, tx) => acc + Number(tx.net_amount || 0), 0);

  let finalAvailable = computedAvailableCredits;
  let finalPending = computedPendingCredits;
  let remainingDeduction = computedApprovedOutflows;

  if (remainingDeduction > 0) {
    const deductFromAvailable = Math.min(finalAvailable, remainingDeduction);
    finalAvailable -= deductFromAvailable;
    remainingDeduction -= deductFromAvailable;
    if (remainingDeduction > 0) {
      finalPending = Math.max(0, finalPending - remainingDeduction);
    }
  }

  const dbAvailable = Math.max(0, Number(wallet?.available_balance) || 0);
  const dbPending = Math.max(0, Number(wallet?.pending_balance) || 0);
  const hasTxActivity = inflowTransactions.length > 0 || outflowTransactions.length > 0;

  const currentAvailableBalance = hasTxActivity ? finalAvailable : dbAvailable;
  const currentPendingBalance = hasTxActivity ? finalPending : dbPending;

  // Persist synced balances to t_hotel_wallet so that other subsystems read consistent data
  if (
    wallet?.wallet_id &&
    hasTxActivity &&
    (dbAvailable !== currentAvailableBalance || dbPending !== currentPendingBalance)
  ) {
    try {
      await supabase
        .from('t_hotel_wallet')
        .update({
          available_balance: currentAvailableBalance,
          pending_balance: currentPendingBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_id', wallet.wallet_id);
    } catch (syncErr) {
      console.warn('[VenueWallet] Syncing balance to t_hotel_wallet warning:', syncErr?.message || syncErr);
    }
  }

  return {
    hotel: {
      hotel_id: hotel.hotel_id,
      name: hotel.name,
      hotel_name: hotel.name,
      star_quality: hotelStar,
      star_rating: hotelStar,
    },
    availableHotels,
    balances: {
      available_balance: currentAvailableBalance,
      pending_balance: currentPendingBalance,
      total_balance: currentAvailableBalance + currentPendingBalance,
    },
    bank_account: bankAccount || null,
    summary: {
      total_inflow_count: inflowTransactions.length,
      total_gross_revenue: totalGrossRevenue,
      total_commission_deducted: totalCommissionDeducted,
      total_inflow_net: totalNetInflow,
      total_outflow_count: outflowTransactions.filter((tx) => tx.is_deducted).length,
      total_outflow_all_count: outflowTransactions.length,
      total_outflow_deducted: totalDeductedOutflow,
      pending_refund_amount: pendingRefundAmount,
    },
    policies: {
      commission_policy: activeHotelCommissionPolicy
        ? {
            policy_id: activeHotelCommissionPolicy.policy_id,
            policy_name: activeHotelCommissionPolicy.policy_name || 'Chính sách hoa hồng sàn',
            commission_rate: Number(activeHotelCommissionPolicy.commission_rate || 0),
            scope: activeHotelCommissionPolicy.hotel_id
              ? 'Riêng cho chỗ nghỉ'
              : activeHotelCommissionPolicy.star_quality != null
                ? `Phân khúc ${activeHotelCommissionPolicy.star_quality} sao`
                : 'Mặc định toàn sàn AVORA',
          }
        : null,
      cancellation_policy: activeHotelCancelPolicy
        ? {
            cancellation_policy_id: activeHotelCancelPolicy.cancellation_policy_id,
            free_cancel_before_hours: Number(activeHotelCancelPolicy.free_cancel_before_hours || 0),
            penalty_rate: Number(activeHotelCancelPolicy.penalty_rate || 0),
            description: activeHotelCancelPolicy.description || '',
          }
        : null,
    },
    transactions: {
      inflow: finalInflow,
      outflow: finalOutflow,
    },
    tabs: {
      inflow: finalInflow,
      outflow: finalOutflow,
    },
    allTransactions,
  };
};

module.exports = {
  getVenueWalletDetails,
  getVenueWalletData: getVenueWalletDetails,
};
