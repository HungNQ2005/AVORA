'use strict';

const supabase = require('../../config/supabaseClient');
const { fetchVietQrBanks, matchVietQrBank } = require('../wallet/wallet.service');
const { recordAuditLog } = require('../../utils/auditLogger');
const { codeNameParser } = require('../../utils/codeNameParser');

const createError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const assertAdminUser = (user) => {
  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  if (!['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) && roleCd !== '1') {
    throw createError(403, 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền truy cập và thực hiện chức năng này.');
  }
};

/**
 * Lấy danh sách các yêu cầu đổi tài khoản ngân hàng của khách sạn (Ticket loại VBU)
 */
const listApprovedRequests = async (user, { page = 1, limit = 20, q = '', status = 'RSV' } = {}) => {
  assertAdminUser(user);
  let ticketQuery = supabase
    .from('t_support_ticket')
    .select(`
      ticket_id,
      title,
      description,
      ticket_type_cd,
      ticket_status_cd,
      priority_cd,
      hotel_id,
      requester_id,
      assigned_to,
      resolution_note,
      resolved_at,
      created_at,
      updated_at
    `)
    .eq('ticket_type_cd', 'VBU')
    .eq('is_deleted', false);

  if (status === 'RSV') {
    ticketQuery = ticketQuery.eq('ticket_status_cd', 'RSV');
  } else if (status === 'CLS') {
    ticketQuery = ticketQuery.eq('ticket_status_cd', 'CLS');
  } else {
    ticketQuery = ticketQuery.in('ticket_status_cd', ['RSV', 'CLS']);
  }

  ticketQuery = ticketQuery.order('resolved_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const { data: tickets, error: ticketError } = await ticketQuery;
  if (ticketError) throw ticketError;
  if (!tickets || tickets.length === 0) {
    return {
      items: [],
      pagination: { page, limit, total: 0, total_pages: 0 },
    };
  }

  const hotelIds = [...new Set(tickets.map((t) => t.hotel_id).filter(Boolean))];
  const requesterIds = [...new Set(tickets.map((t) => t.requester_id).filter(Boolean))];
  const assignedIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))];

  const [hotelsRes, requestersRes, assignedRes, currentBanksRes, sysBanksRes] = await Promise.all([
    hotelIds.length ? supabase.from('m_hotel').select('hotel_id, name, address, owner_id').in('hotel_id', hotelIds) : { data: [] },
    requesterIds.length ? supabase.from('m_user').select('user_id, full_name, email, phone').in('user_id', requesterIds) : { data: [] },
    assignedIds.length ? supabase.from('m_user').select('user_id, full_name, email').in('user_id', assignedIds) : { data: [] },
    hotelIds.length ? supabase.from('m_bank_account').select('*').in('hotel_id', hotelIds).eq('is_verify', true) : { data: [] },
    supabase.from('m_system_code').select('code_cd, code_name, sort_no').eq('business_cd', 'BANK_CD').order('sort_no', { ascending: true }),
  ]);

  if (hotelsRes.error) throw hotelsRes.error;
  if (requestersRes.error) throw requestersRes.error;

  const hotelMap = new Map((hotelsRes.data || []).map((h) => [h.hotel_id, h]));
  const requesterMap = new Map((requestersRes.data || []).map((u) => [u.user_id, u]));
  const assignedMap = new Map((assignedRes.data || []).map((u) => [u.user_id, u]));
  const currentBankMap = new Map((currentBanksRes.data || []).map((b) => [b.hotel_id, b]));
  const bankCodeMap = new Map((sysBanksRes.data || []).map((b) => [String(b.code_cd), b.code_name]));

  let enriched = tickets.map((t) => {
    const hotel = hotelMap.get(t.hotel_id) || null;
    const requester = requesterMap.get(t.requester_id) || null;
    const assigned = assignedMap.get(t.assigned_to) || null;
    const currentBank = currentBankMap.get(t.hotel_id) || null;

    let currentBankFormatted = null;
    if (currentBank) {
      const codeName = bankCodeMap.get(String(currentBank.bank_cd)) || currentBank.bank_cd;
      currentBankFormatted = {
        bank_account_id: currentBank.bank_account_id,
        bank_cd: currentBank.bank_cd,
        bank_code_name: codeName,
        bank_name: codeNameParser(codeName),
        account_number: currentBank.account_number,
        account_holder: currentBank.account_holder,
        bin_code: currentBank.bin_code,
        is_verify: currentBank.is_verify,
      };
    }

    return {
      ticket_id: t.ticket_id,
      title: t.title,
      description: t.description,
      ticket_type_cd: t.ticket_type_cd,
      ticket_status_cd: t.ticket_status_cd,
      priority_cd: t.priority_cd,
      resolution_note: t.resolution_note,
      resolved_at: t.resolved_at,
      created_at: t.created_at,
      hotel: hotel ? {
        hotel_id: hotel.hotel_id,
        hotel_name: hotel.name,
        address: hotel.address,
        owner_id: hotel.owner_id,
        current_bank: currentBankFormatted,
      } : null,
      requester: requester ? {
        user_id: requester.user_id,
        full_name: requester.full_name || requester.email || 'Người yêu cầu',
        email: requester.email,
        phone: requester.phone,
      } : null,
      assigned_admin: assigned ? {
        user_id: assigned.user_id,
        full_name: assigned.full_name || assigned.email,
      } : null,
    };
  });

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    enriched = enriched.filter((item) => {
      const hotelName = (item.hotel?.hotel_name || '').toLowerCase();
      const requesterName = (item.requester?.full_name || '').toLowerCase();
      const requesterEmail = (item.requester?.email || '').toLowerCase();
      const requesterPhone = (item.requester?.phone || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const ticketId = (item.ticket_id || '').toLowerCase();
      return (
        hotelName.includes(term) ||
        requesterName.includes(term) ||
        requesterEmail.includes(term) ||
        requesterPhone.includes(term) ||
        title.includes(term) ||
        ticketId.includes(term)
      );
    });
  }

  const total = enriched.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const items = enriched.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
};

/**
 * Lấy chi tiết một yêu cầu đổi tài khoản ngân hàng
 */
const getApprovedRequestDetail = async (ticketId, user) => {
  assertAdminUser(user);
  const { data: ticket, error: ticketError } = await supabase
    .from('t_support_ticket')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (ticketError) throw ticketError;
  if (!ticket) throw createError(404, 'Không tìm thấy phiếu yêu cầu.');
  if (ticket.ticket_type_cd !== 'VBU') {
    throw createError(400, 'Phiếu này không phải là yêu cầu thay đổi tài khoản ngân hàng.');
  }

  const [hotelRes, requesterRes, currentBankRes, sysBanksRes] = await Promise.all([
    ticket.hotel_id ? supabase.from('m_hotel').select('hotel_id, name, address, owner_id').eq('hotel_id', ticket.hotel_id).maybeSingle() : { data: null },
    ticket.requester_id ? supabase.from('m_user').select('user_id, full_name, email, phone').eq('user_id', ticket.requester_id).maybeSingle() : { data: null },
    ticket.hotel_id ? supabase.from('m_bank_account').select('*').eq('hotel_id', ticket.hotel_id).eq('is_verify', true).maybeSingle() : { data: null },
    supabase.from('m_system_code').select('code_cd, code_name').eq('business_cd', 'BANK_CD'),
  ]);

  const bankCodeMap = new Map((sysBanksRes.data || []).map((b) => [String(b.code_cd), b.code_name]));
  const currentBank = currentBankRes.data || null;

  let currentBankFormatted = null;
  if (currentBank) {
    const codeName = bankCodeMap.get(String(currentBank.bank_cd)) || currentBank.bank_cd;
    currentBankFormatted = {
      bank_account_id: currentBank.bank_account_id,
      bank_cd: currentBank.bank_cd,
      bank_code_name: codeName,
      bank_name: codeNameParser(codeName),
      account_number: currentBank.account_number,
      account_holder: currentBank.account_holder,
      bin_code: currentBank.bin_code,
      is_verify: currentBank.is_verify,
    };
  }

  return {
    ticket_id: ticket.ticket_id,
    title: ticket.title,
    description: ticket.description,
    ticket_type_cd: ticket.ticket_type_cd,
    ticket_status_cd: ticket.ticket_status_cd,
    priority_cd: ticket.priority_cd,
    attachment_urls: ticket.attachment_urls || [],
    resolution_note: ticket.resolution_note,
    resolved_at: ticket.resolved_at,
    created_at: ticket.created_at,
    hotel: hotelRes.data ? {
      hotel_id: hotelRes.data.hotel_id,
      hotel_name: hotelRes.data.name,
      address: hotelRes.data.address,
      owner_id: hotelRes.data.owner_id,
      current_bank: currentBankFormatted,
    } : null,
    requester: requesterRes.data ? {
      user_id: requesterRes.data.user_id,
      full_name: requesterRes.data.full_name || requesterRes.data.email,
      email: requesterRes.data.email,
      phone: requesterRes.data.phone,
    } : null,
  };
};

/**
 * Thực thi đổi tài khoản ngân hàng của khách sạn thông qua ticket đã duyệt
 */
const applyBankChange = async (ticketId, adminUser, input) => {
  assertAdminUser(adminUser);
  const { bank_cd, account_number, account_holder, confirmed_with_hotel } = input;

  if (!confirmed_with_hotel) {
    throw createError(400, 'Bạn phải xác nhận đã trao đổi với khách sạn trước khi đổi thông tin.');
  }

  // 1. Kiểm tra Ticket
  const { data: ticket, error: ticketErr } = await supabase
    .from('t_support_ticket')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (ticketErr) throw ticketErr;
  if (!ticket) throw createError(404, 'Không tìm thấy phiếu yêu cầu.');

  if (ticket.ticket_type_cd !== 'VBU') {
    throw createError(400, 'Phiếu này không phải là yêu cầu thay đổi tài khoản ngân hàng.');
  }

  if (ticket.ticket_status_cd === 'CLS') {
    throw createError(409, 'Yêu cầu này đã được thực hiện đổi tài khoản và đóng trước đó.');
  }

  if (ticket.ticket_status_cd !== 'RSV') {
    throw createError(400, 'Chỉ có thể đổi tài khoản khi ticket đã được duyệt giải quyết (RSV).');
  }

  if (!ticket.hotel_id) {
    throw createError(400, 'Phiếu yêu cầu không gắn liền với khách sạn nào.');
  }

  // 2. Kiểm tra Ngân hàng mới từ m_system_code
  const { data: validBank, error: bankCodeErr } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BANK_CD')
    .eq('code_cd', String(bank_cd))
    .maybeSingle();

  if (bankCodeErr) throw bankCodeErr;
  if (!validBank) {
    throw createError(400, 'Ngân hàng được chọn không hợp lệ trong hệ thống.');
  }

  const cleanAccountNumber = String(account_number).trim();
  const cleanAccountHolder = String(account_holder).trim().toUpperCase();

  // 3. Khóa an toàn giao dịch giải ngân (Kiểm tra t_withdrawal_request)
  const { data: wallet } = await supabase
    .from('t_hotel_wallet')
    .select('wallet_id')
    .eq('hotel_id', ticket.hotel_id)
    .maybeSingle();

  if (wallet) {
    const { data: activeWithdrawals, error: wdErr } = await supabase
      .from('t_withdrawal_request')
      .select('withdrawal_id, status_cd')
      .eq('wallet_id', wallet.wallet_id)
      .in('status_cd', ['1', '2', '3']); // PND, APR, PRO

    if (wdErr) throw wdErr;
    if (activeWithdrawals && activeWithdrawals.length > 0) {
      throw createError(
        409,
        'Khách sạn này đang có lệnh rút tiền/giải ngân chưa hoàn tất. Vui lòng hoàn tất hoặc hủy lệnh rút tiền trước khi đổi tài khoản ngân hàng.'
      );
    }
  }

  // 4. Kiểm tra chống xung đột: Không cho phép liên kết tài khoản ngân hàng đã được xác minh bởi Vendor khác
  const { data: existingSameAccounts, error: dupErr } = await supabase
    .from('m_bank_account')
    .select('bank_account_id, hotel_id')
    .eq('bank_cd', String(validBank.code_cd))
    .eq('account_number', cleanAccountNumber)
    .eq('is_verify', true);

  if (dupErr) throw dupErr;

  if (existingSameAccounts && existingSameAccounts.length > 0) {
    const otherHotelIds = existingSameAccounts
      .map((acc) => acc.hotel_id)
      .filter((id) => id && id !== ticket.hotel_id);

    if (otherHotelIds.length > 0) {
      const { data: conflictHotels, error: conflictErr } = await supabase
        .from('m_hotel')
        .select('hotel_id, owner_id')
        .in('hotel_id', otherHotelIds)
        .neq('owner_id', ticket.requester_id)
        .limit(1);

      if (conflictErr) throw conflictErr;
      if (conflictHotels && conflictHotels.length > 0) {
        throw createError(
          409,
          'Số tài khoản ngân hàng này đã được liên kết bởi một chủ khách sạn (Vendor) khác trên hệ thống.'
        );
      }
    }
  }

  // 5. Phân giải BIN code tự động từ VietQR
  const vietQrBanks = await fetchVietQrBanks();
  const matched = matchVietQrBank(validBank.code_name, vietQrBanks);
  const resolvedBin = matched?.bin || null;

  // 6. Lấy tài khoản cũ đang active để lưu vết old_data cho Audit Log
  const { data: oldActiveAccount } = await supabase
    .from('m_bank_account')
    .select('*')
    .eq('hotel_id', ticket.hotel_id)
    .eq('is_verify', true)
    .maybeSingle();

  const now = new Date().toISOString();

  // 7. Vô hiệu hóa tài khoản cũ (is_verify = false, không xóa vật lý để giữ lịch sử giao dịch)
  if (oldActiveAccount) {
    const { error: deactivateErr } = await supabase
      .from('m_bank_account')
      .update({ is_verify: false, updated_at: now })
      .eq('bank_account_id', oldActiveAccount.bank_account_id);

    if (deactivateErr) throw deactivateErr;
  }

  // 8. Chèn tài khoản ngân hàng mới (is_verify = true)
  const { data: createdAccount, error: insertErr } = await supabase
    .from('m_bank_account')
    .insert({
      hotel_id: ticket.hotel_id,
      bank_cd: String(validBank.code_cd),
      bin_code: resolvedBin,
      bank_branch: null,
      account_number: cleanAccountNumber,
      account_holder: cleanAccountHolder,
      is_verify: true,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertErr) throw insertErr;

  // 9. Cập nhật Ticket sang trạng thái CLS (Closed)
  const bankDisplayName = codeNameParser(validBank.code_name);
  const resolutionNote = `Admin ${adminUser.full_name || adminUser.email} đã trao đổi xác nhận với khách sạn và thực hiện cập nhật tài khoản ngân hàng thụ hưởng thành công: ${bankDisplayName} - STK: ${cleanAccountNumber} (${cleanAccountHolder}).`;

  const { error: ticketUpdateErr } = await supabase
    .from('t_support_ticket')
    .update({
      ticket_status_cd: 'CLS',
      resolution_note: resolutionNote,
      resolved_at: now,
      updated_at: now,
    })
    .eq('ticket_id', ticket.ticket_id);

  if (ticketUpdateErr) throw ticketUpdateErr;

  // 10. Ghi vết kiểm toán vào h_system_audit_log
  await recordAuditLog({
    actor_user_id: adminUser.user_id,
    action_cd: '2', // UPD
    entity_name: 'm_bank_account',
    entity_id: createdAccount.bank_account_id,
    old_data: oldActiveAccount || null,
    new_data: {
      ...createdAccount,
      ticket_id: ticket.ticket_id,
      confirmed_by_admin: true,
    },
  });

  return {
    ticket_id: ticket.ticket_id,
    hotel_id: ticket.hotel_id,
    new_bank_account: {
      ...createdAccount,
      bank_name: bankDisplayName,
      bank_code_name: validBank.code_name,
    },
    resolution_note: resolutionNote,
  };
};

/**
 * Lấy danh sách ngân hàng hệ thống từ m_system_code (business_cd = 'BANK_CD')
 */
const getSystemBanks = async (user) => {
  assertAdminUser(user);
  const { data: banks, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name, sort_no')
    .eq('business_cd', 'BANK_CD')
    .order('sort_no', { ascending: true });

  if (error) throw error;

  return (banks || []).map((b) => ({
    code_cd: String(b.code_cd),
    bank_cd: String(b.code_cd),
    code_name: b.code_name,
    name: codeNameParser(b.code_name),
    short_name: b.code_name,
    sort_no: b.sort_no,
  }));
};


module.exports = {
  listApprovedRequests,
  getApprovedRequestDetail,
  applyBankChange,
  getSystemBanks,
};
