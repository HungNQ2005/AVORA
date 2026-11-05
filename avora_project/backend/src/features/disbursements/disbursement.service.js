'use strict';

const supabase = require('../../config/supabaseClient');
const { codeNameParser } = require('../../utils/codeNameParser');
const env = require('../../config/env');
const { recordAuditLog } = require('../../utils/auditLogger');
const vietqr = require('./vietqr.helper');

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureClient = () => {
  if (!supabase) {
    throw createError(503, 'Hệ thống cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.');
  }
};

const STATUS_MAP = {
  '1': { code: 'PND', label: 'Chờ phê duyệt', color: 'warning' },
  '2': { code: 'APR', label: 'Chờ thanh toán', color: 'info' },
  '3': { code: 'PRO', label: 'Đang xử lý', color: 'info' },
  '4': { code: 'CMP', label: 'Đã giải ngân', color: 'success' },
  '5': { code: 'REJ', label: 'Bị từ chối', color: 'error' },
  '6': { code: 'FLD', label: 'Thất bại', color: 'error' },
  '7': { code: 'CAN', label: 'Đã hủy', color: 'default' },
};

const getBankNameMap = async () => {
  try {
    const { data: bankCodes } = await supabase
      .from('m_system_code')
      .select('code_cd, code_name')
      .eq('business_cd', 'BANK_CD');

    const map = {};
    (bankCodes || []).forEach((b) => {
      map[b.code_cd] = codeNameParser(b.code_name);
    });
    return map;
  } catch {
    return {};
  }
};

/**
 * Lấy tổng quan số dư ví và thông tin khách sạn, tài khoản ngân hàng của Vendor
 */
const getVendorOverview = async (userId, requestedHotelId = null) => {
  ensureClient();

  // 1. Tìm các khách sạn của Vendor
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, star_quality, hotel_status')
    .eq('owner_id', userId)
    .eq('is_deleted', false);

  const { data: hotels, error: hotelErr } = await hotelQuery;
  if (hotelErr) throw createError(500, `Lỗi khi tải thông tin khách sạn: ${hotelErr.message}`);

  if (!hotels || hotels.length === 0) {
    return {
      hotel: null,
      hotels: [],
      wallet: null,
      bank_accounts: [],
    };
  }

  // Chọn khách sạn hiện tại
  const currentHotel = requestedHotelId
    ? hotels.find((h) => h.hotel_id === requestedHotelId) || hotels[0]
    : hotels[0];

  const hotelId = currentHotel.hotel_id;

  // 2. Lấy ví của khách sạn (tạo mới nếu chưa có)
  let { data: wallet, error: walletErr } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (walletErr) throw createError(500, `Lỗi khi tải thông tin ví: ${walletErr.message}`);

  if (!wallet) {
    const { data: newWallet, error: createWalletErr } = await supabase
      .from('t_hotel_wallet')
      .insert({
        hotel_id: hotelId,
        available_balance: 0,
        pending_balance: 0,
      })
      .select()
      .single();

    if (createWalletErr) throw createError(500, `Lỗi khi khởi tạo ví: ${createWalletErr.message}`);
    wallet = newWallet;
  }

  // 3. Lấy thông tin tài khoản ngân hàng
  const { data: bankAccounts, error: bankErr } = await supabase
    .from('m_bank_account')
    .select('*')
    .eq('hotel_id', hotelId);

  if (bankErr) throw createError(500, `Lỗi khi tải tài khoản ngân hàng: ${bankErr.message}`);

  const bankNameMap = await getBankNameMap();
  const mappedBankAccounts = (bankAccounts || []).map((b) => ({
    bank_account_id: b.bank_account_id,
    hotel_id: b.hotel_id,
    bank_cd: b.bank_cd,
    bank_name: bankNameMap[b.bank_cd] || `Ngân hàng (${b.bank_cd})`,
    bank_branch: b.bank_branch,
    account_number: b.account_number,
    account_holder: b.account_holder,
    is_verify: Boolean(b.is_verify),
  }));

  return {
    hotel: currentHotel,
    hotels,
    wallet: {
      wallet_id: wallet.wallet_id,
      hotel_id: wallet.hotel_id,
      available_balance: Number(wallet.available_balance || 0),
      pending_balance: Number(wallet.pending_balance || 0),
      updated_at: wallet.updated_at,
    },
    bank_accounts: mappedBankAccounts,
  };
};

/**
 * Lấy lịch sử yêu cầu giải ngân của Vendor
 */
const getVendorHistory = async (userId, hotelId = null) => {
  ensureClient();

  // 1. Tìm các khách sạn của Vendor
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name')
    .eq('owner_id', userId)
    .eq('is_deleted', false);

  if (hotelId) {
    hotelQuery = hotelQuery.eq('hotel_id', hotelId);
  }

  const { data: hotels, error: hotelErr } = await hotelQuery;
  if (hotelErr) throw createError(500, `Lỗi khi tìm khách sạn: ${hotelErr.message}`);

  if (!hotels || hotels.length === 0) {
    return [];
  }

  const hotelIds = hotels.map((h) => h.hotel_id);
  const hotelNameMap = {};
  hotels.forEach((h) => {
    hotelNameMap[h.hotel_id] = h.name;
  });

  // 2. Tìm danh sách ví
  const { data: wallets, error: walErr } = await supabase
    .from('t_hotel_wallet')
    .select('wallet_id, hotel_id')
    .in('hotel_id', hotelIds);

  if (walErr) throw createError(500, `Lỗi khi tải danh sách ví: ${walErr.message}`);
  if (!wallets || wallets.length === 0) return [];

  const walletIds = wallets.map((w) => w.wallet_id);
  const walletToHotelMap = {};
  wallets.forEach((w) => {
    walletToHotelMap[w.wallet_id] = w.hotel_id;
  });

  // 3. Tìm các yêu cầu giải ngân
  const { data: requests, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .in('wallet_id', walletIds)
    .order('created_at', { ascending: false });

  if (reqErr) throw createError(500, `Lỗi khi tải lịch sử giải ngân: ${reqErr.message}`);
  if (!requests || requests.length === 0) return [];

  // 4. Lấy thông tin tài khoản ngân hàng liên quan
  const bankAccountIds = [...new Set(requests.map((r) => r.bank_account_id).filter(Boolean))];
  const { data: bankRows } = await supabase
    .from('m_bank_account')
    .select('*')
    .in('bank_account_id', bankAccountIds);

  const bankNameMap = await getBankNameMap();
  const bankMap = {};
  (bankRows || []).forEach((b) => {
    bankMap[b.bank_account_id] = {
      bank_account_id: b.bank_account_id,
      bank_name: bankNameMap[b.bank_cd] || `Ngân hàng (${b.bank_cd})`,
      account_number: b.account_number,
      account_holder: b.account_holder,
      bank_branch: b.bank_branch,
    };
  });

  // 5. Kết hợp dữ liệu
  return requests.map((r) => {
    const currentHotelId = walletToHotelMap[r.wallet_id];
    const statusMeta = STATUS_MAP[String(r.status_cd)] || {
      code: 'UNKNOWN',
      label: 'Không xác định',
      color: 'default',
    };

    return {
      withdrawal_id: r.withdrawal_id,
      wallet_id: r.wallet_id,
      hotel_id: currentHotelId,
      hotel_name: hotelNameMap[currentHotelId] || 'Khách sạn',
      bank_account_id: r.bank_account_id,
      bank_info: bankMap[r.bank_account_id] || null,
      amount: Number(r.amount),
      status_cd: String(r.status_cd),
      status_code: statusMeta.code,
      status_label: statusMeta.label,
      status_color: statusMeta.color,
      gateway_transaction_ref: r.gateway_transaction_ref,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
};

/**
 * Vendor tạo yêu cầu giải ngân mới
 */
const createVendorDisbursementRequest = async (userId, payload) => {
  ensureClient();

  const { hotel_id, amount, bank_account_id } = payload;
  const numAmount = Number(amount);

  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    throw createError(400, 'Số tiền giải ngân không hợp lệ. Vui lòng nhập số tiền lớn hơn 0.');
  }

  if (!Number.isInteger(numAmount)) {
    throw createError(400, 'Số tiền giải ngân phải là số nguyên (VND).');
  }

  if (numAmount < 50000) {
    throw createError(400, 'Số tiền giải ngân tối thiểu là 50,000 VND.');
  }

  // 1. Kiểm tra quyền sở hữu khách sạn
  const { data: hotel, error: hotelErr } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id')
    .eq('hotel_id', hotel_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (hotelErr || !hotel) {
    throw createError(404, 'Không tìm thấy thông tin khách sạn hoặc khách sạn đã bị xóa.');
  }

  if (hotel.owner_id !== userId) {
    throw createError(403, 'Bạn không có quyền tạo yêu cầu giải ngân cho khách sạn này.');
  }

  // 2. Kiểm tra tài khoản ngân hàng
  const { data: bankAccount, error: bankErr } = await supabase
    .from('m_bank_account')
    .select('*')
    .eq('bank_account_id', bank_account_id)
    .eq('hotel_id', hotel_id)
    .maybeSingle();

  if (bankErr || !bankAccount) {
    throw createError(400, 'Tài khoản ngân hàng thụ hưởng không hợp lệ hoặc không thuộc khách sạn này.');
  }

  // 3. Kiểm tra số dư ví khả dụng
  const { data: wallet, error: walletErr } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('hotel_id', hotel_id)
    .maybeSingle();

  if (walletErr || !wallet) {
    throw createError(404, 'Không tìm thấy ví thanh toán của khách sạn.');
  }

  const currentAvailable = Number(wallet.available_balance || 0);
  if (currentAvailable < numAmount) {
    throw createError(
      400,
      `Số dư khả dụng hiện tại (${currentAvailable.toLocaleString('vi-VN')} VND) không đủ để yêu cầu giải ngân ${numAmount.toLocaleString('vi-VN')} VND.`
    );
  }

  const newAvailable = currentAvailable - numAmount;
  const now = new Date().toISOString();

  // 4. Tạo yêu cầu giải ngân (status_cd = '1' cho PND - Chờ duyệt)
  const { data: newRequest, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .insert({
      wallet_id: wallet.wallet_id,
      bank_account_id: bankAccount.bank_account_id,
      amount: numAmount,
      status_cd: '1',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (reqErr) {
    throw createError(500, `Không thể tạo yêu cầu giải ngân: ${reqErr.message}`);
  }

  // 5. Khấu trừ số dư ví khả dụng
  const { error: updateWalletErr } = await supabase
    .from('t_hotel_wallet')
    .update({
      available_balance: newAvailable,
      updated_at: now,
    })
    .eq('wallet_id', wallet.wallet_id);

  if (updateWalletErr) {
    // Lưu ý: nếu lỗi xảy ra, ghi log để xử lý
    console.error('[DISBURSEMENT] Lỗi cập nhật số dư ví:', updateWalletErr);
  }

  // 6. Ghi nhật ký biến động ví (t_wallet_ledger)
  // transaction_type_cd = '2' cho WDR (Withdrawal)
  const { error: ledgerErr } = await supabase
    .from('t_wallet_ledger')
    .insert({
      wallet_id: wallet.wallet_id,
      transaction_type_cd: '2',
      amount_change: -numAmount,
      current_balance: newAvailable,
      reference_id: newRequest.withdrawal_id,
      created_at: now,
      updated_at: now,
    });

  if (ledgerErr) {
    console.error('[DISBURSEMENT] Lỗi ghi sổ cái ví:', ledgerErr);
  }

  const bankNameMap = await getBankNameMap();
  const statusMeta = STATUS_MAP['1'];

  return {
    withdrawal_id: newRequest.withdrawal_id,
    wallet_id: wallet.wallet_id,
    hotel_id,
    hotel_name: hotel.name,
    amount: numAmount,
    status_cd: '1',
    status_code: statusMeta.code,
    status_label: statusMeta.label,
    bank_info: {
      bank_name: bankNameMap[bankAccount.bank_cd] || `Ngân hàng (${bankAccount.bank_cd})`,
      account_number: bankAccount.account_number,
      account_holder: bankAccount.account_holder,
      bank_branch: bankAccount.bank_branch,
    },
    available_balance: newAvailable,
    created_at: newRequest.created_at,
  };
};

/**
 * Business Manager: Lấy danh sách toàn bộ yêu cầu giải ngân với các tab lọc
 */
const getBusinessDisbursements = async ({ status, search, page = 1, pageSize = 10 }) => {
  ensureClient();

  const numPage = Math.max(1, Number(page) || 1);
  const numPageSize = Math.max(1, Number(pageSize) || 10);

  // 1. Lấy tất cả yêu cầu giải ngân kèm thông tin ví
  const { data: allRequests, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .order('created_at', { ascending: false });

  if (reqErr) throw createError(500, `Lỗi khi tải danh sách yêu cầu giải ngân: ${reqErr.message}`);
  const requests = allRequests || [];

  // 2. Lấy thông tin ví và khách sạn
  const walletIds = [...new Set(requests.map((r) => r.wallet_id).filter(Boolean))];
  const { data: wallets } = await supabase
    .from('t_hotel_wallet')
    .select('wallet_id, hotel_id, available_balance, pending_balance')
    .in('wallet_id', walletIds);

  const walletMap = {};
  const hotelIds = [];
  (wallets || []).forEach((w) => {
    walletMap[w.wallet_id] = w;
    if (w.hotel_id) hotelIds.push(w.hotel_id);
  });

  const { data: hotels } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, address, owner_id')
    .in('hotel_id', [...new Set(hotelIds)]);

  const hotelMap = {};
  const ownerIds = [];
  (hotels || []).forEach((h) => {
    hotelMap[h.hotel_id] = h;
    if (h.owner_id) ownerIds.push(h.owner_id);
  });

  const { data: users } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, phone')
    .in('user_id', [...new Set(ownerIds)]);

  const userMap = {};
  (users || []).forEach((u) => {
    userMap[u.user_id] = u;
  });

  // 3. Lấy thông tin ngân hàng
  const bankIds = [...new Set(requests.map((r) => r.bank_account_id).filter(Boolean))];
  const { data: banks } = await supabase
    .from('m_bank_account')
    .select('*')
    .in('bank_account_id', bankIds);

  const bankNameMap = await getBankNameMap();
  const bankMap = {};
  (banks || []).forEach((b) => {
    bankMap[b.bank_account_id] = {
      bank_account_id: b.bank_account_id,
      bank_cd: b.bank_cd,
      bank_name: bankNameMap[b.bank_cd] || `Ngân hàng (${b.bank_cd})`,
      account_number: b.account_number,
      account_holder: b.account_holder,
      bank_branch: b.bank_branch,
    };
  });

  // 4. Ghép toàn bộ dữ liệu thành danh sách đầy đủ
  const fullItems = requests.map((r) => {
    const wal = walletMap[r.wallet_id] || {};
    const hot = hotelMap[wal.hotel_id] || {};
    const usr = userMap[hot.owner_id] || {};
    const bnk = bankMap[r.bank_account_id] || {};
    const statusMeta = STATUS_MAP[String(r.status_cd)] || {
      code: 'UNKNOWN',
      label: 'Không xác định',
      color: 'default',
    };

    return {
      withdrawal_id: r.withdrawal_id,
      wallet_id: r.wallet_id,
      hotel_id: wal.hotel_id,
      hotel_name: hot.name || 'Không xác định',
      hotel_address: hot.address || '',
      owner_name: usr.full_name || 'Không xác định',
      owner_email: usr.email || '',
      owner_phone: usr.phone || '',
      bank_info: bnk,
      amount: Number(r.amount),
      status_cd: String(r.status_cd),
      status_code: statusMeta.code,
      status_label: statusMeta.label,
      status_color: statusMeta.color,
      gateway_transaction_ref: r.gateway_transaction_ref,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  // 5. Tính toán các thống kê metrics cho Business Manager
  const stats = {
    pending_approval_count: fullItems.filter((i) => i.status_cd === '1').length,
    pending_approval_amount: fullItems
      .filter((i) => i.status_cd === '1')
      .reduce((acc, cur) => acc + cur.amount, 0),
    pending_payment_count: fullItems.filter((i) => i.status_cd === '2').length,
    pending_payment_amount: fullItems
      .filter((i) => i.status_cd === '2')
      .reduce((acc, cur) => acc + cur.amount, 0),
    settlement_count: fullItems.filter((i) => i.status_cd === '4').length,
    settlement_amount: fullItems
      .filter((i) => i.status_cd === '4')
      .reduce((acc, cur) => acc + cur.amount, 0),
    rejected_count: fullItems.filter((i) => i.status_cd === '5').length,
    total_count: fullItems.length,
    total_amount: fullItems.reduce((acc, cur) => acc + cur.amount, 0),
  };

  // 6. Lọc theo tab trạng thái
  let filtered = fullItems;
  if (status && status !== 'ALL') {
    const statusKey = String(status).toUpperCase();
    if (statusKey === 'PENDING_APPROVAL' || statusKey === 'PND' || statusKey === '1') {
      filtered = filtered.filter((i) => i.status_cd === '1');
    } else if (statusKey === 'PENDING_PAYMENT' || statusKey === 'APR' || statusKey === '2') {
      filtered = filtered.filter((i) => i.status_cd === '2');
    } else if (statusKey === 'SETTLEMENT' || statusKey === 'CMP' || statusKey === '4') {
      filtered = filtered.filter((i) => i.status_cd === '4');
    } else if (statusKey === 'REJECTED' || statusKey === 'REJ' || statusKey === '5') {
      filtered = filtered.filter((i) => i.status_cd === '5');
    }
  }

  // 7. Lọc theo từ khóa tìm kiếm
  if (search && String(search).trim()) {
    const term = String(search).trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.hotel_name.toLowerCase().includes(term) ||
        i.owner_name.toLowerCase().includes(term) ||
        i.owner_email.toLowerCase().includes(term) ||
        (i.bank_info?.account_number && i.bank_info.account_number.includes(term)) ||
        (i.bank_info?.account_holder && i.bank_info.account_holder.toLowerCase().includes(term)) ||
        (i.gateway_transaction_ref && i.gateway_transaction_ref.toLowerCase().includes(term)) ||
        i.withdrawal_id.toLowerCase().includes(term)
    );
  }

  // 8. Phân trang
  const total = filtered.length;
  const start = (numPage - 1) * numPageSize;
  const paginated = filtered.slice(start, start + numPageSize);

  return {
    items: paginated,
    stats,
    pagination: {
      page: numPage,
      page_size: numPageSize,
      total_items: total,
      total_pages: Math.max(1, Math.ceil(total / numPageSize)),
    },
  };
};

/**
 * Business Manager: Phê duyệt yêu cầu giải ngân (PND -> APR / Pending Payment)
 */
const approveDisbursement = async (requestId, adminUserId) => {
  ensureClient();

  const { data: request, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .eq('withdrawal_id', requestId)
    .maybeSingle();

  if (reqErr || !request) {
    throw createError(404, 'Không tìm thấy yêu cầu giải ngân.');
  }

  if (String(request.status_cd) !== '1') {
    if (String(request.status_cd) === '2') {
      throw createError(400, 'Yêu cầu này đã được phê duyệt trước đó và đang chờ thanh toán.');
    }
    if (String(request.status_cd) === '4') {
      throw createError(400, 'Yêu cầu này đã hoàn tất giải ngân.');
    }
    throw createError(400, 'Chỉ có thể phê duyệt yêu cầu ở trạng thái Chờ phê duyệt.');
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from('t_withdrawal_request')
    .update({
      status_cd: '2', // APR
      updated_at: now,
    })
    .eq('withdrawal_id', requestId)
    .select()
    .single();

  if (updateErr) {
    throw createError(500, `Không thể phê duyệt yêu cầu: ${updateErr.message}`);
  }

  return {
    withdrawal_id: updated.withdrawal_id,
    status_cd: '2',
    status_code: 'APR',
    status_label: 'Chờ thanh toán',
    updated_at: updated.updated_at,
  };
};

/**
 * Chuyển lỗi DB thiếu cột (chưa chạy migration sepay_disbursement_setup.sql) thành thông báo rõ ràng.
 */
const mapDbError = (err, prefix) => {
  const msg = String(err?.message || '');
  if (err?.code === '42703' || /payment_code|paid_at|settlement_source|sepay_transaction_id|settled_by/.test(msg)) {
    return createError(
      503,
      'Cơ sở dữ liệu chưa được cập nhật cho tính năng giải ngân tự động. Vui lòng chạy backend/sql/sepay_disbursement_setup.sql.'
    );
  }
  return createError(500, `${prefix}: ${msg}`);
};

/**
 * Business Manager / Kế toán: Xác nhận THỦ CÔNG đã chi trả (APR -> CMP / Settled).
 * Đây là phương án dự phòng khi webhook SePay không tự xác nhận được.
 */
const settleDisbursement = async (requestId, adminUserId, payload = {}) => {
  ensureClient();

  const refCode = String(payload.gateway_transaction_ref || '').trim();
  const note = String(payload.note || '').trim();

  if (!refCode) {
    throw createError(400, 'Vui lòng nhập mã tham chiếu / biên nhận chuyển khoản ngân hàng để xác nhận thủ công.');
  }
  if (refCode.length > 100) {
    throw createError(400, 'Mã tham chiếu ngân hàng quá dài (tối đa 100 ký tự).');
  }
  if (note.length > 500) {
    throw createError(400, 'Ghi chú quá dài (tối đa 500 ký tự).');
  }

  const { data: request, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .eq('withdrawal_id', requestId)
    .maybeSingle();

  if (reqErr || !request) {
    throw createError(404, 'Không tìm thấy yêu cầu giải ngân.');
  }

  if (String(request.status_cd) !== '2') {
    if (String(request.status_cd) === '4') {
      throw createError(400, 'Yêu cầu này đã được quyết toán chi trả thành công trước đó.');
    }
    if (String(request.status_cd) === '1') {
      throw createError(400, 'Yêu cầu này cần được Business Manager phê duyệt trước khi chi trả.');
    }
    throw createError(400, 'Chỉ có thể thực hiện thanh toán cho yêu cầu ở trạng thái Chờ thanh toán.');
  }

  const now = new Date().toISOString();

  // Cập nhật có điều kiện: chỉ thành công nếu yêu cầu VẪN đang ở APR (chống race với webhook SePay).
  const { data: updated, error: updateErr } = await supabase
    .from('t_withdrawal_request')
    .update({
      status_cd: '4', // CMP (Completed / Paid / Settled)
      gateway_transaction_ref: refCode,
      paid_at: now,
      settlement_source: 'MANUAL',
      settled_by: adminUserId || null,
      updated_at: now,
    })
    .eq('withdrawal_id', requestId)
    .eq('status_cd', '2')
    .select()
    .maybeSingle();

  if (updateErr) {
    throw mapDbError(updateErr, 'Không thể cập nhật trạng thái quyết toán');
  }
  if (!updated) {
    throw createError(
      409,
      'Yêu cầu vừa được xử lý bởi một tiến trình khác (có thể SePay vừa tự động xác nhận). Vui lòng tải lại danh sách.'
    );
  }

  recordAuditLog({
    actor_user_id: adminUserId || null,
    action_cd: '2',
    entity_name: 't_withdrawal_request',
    entity_id: requestId,
    old_data: { status_cd: '2' },
    new_data: { status_cd: '4', settlement_source: 'MANUAL', gateway_transaction_ref: refCode, note: note || null },
  });

  return {
    withdrawal_id: updated.withdrawal_id,
    status_cd: '4',
    status_code: 'CMP',
    status_label: 'Đã giải ngân',
    gateway_transaction_ref: updated.gateway_transaction_ref,
    updated_at: updated.updated_at,
  };
};

// ─── SePay VietQR payout (giải ngân tự động) ───────────────────────────────

const MAX_CODE_ATTEMPTS = 5;

/** code_cd -> code_name (mã ngân hàng viết tắt, vd '1' -> 'VCB'). */
const getBankShortCodeMap = async () => {
  try {
    const { data } = await supabase
      .from('m_system_code')
      .select('code_cd, code_name')
      .eq('business_cd', 'BANK_CD');
    const map = {};
    (data || []).forEach((b) => {
      map[String(b.code_cd)] = String(b.code_name || '').trim().toUpperCase();
    });
    return map;
  } catch {
    return {};
  }
};

const loadWithdrawalOrThrow = async (requestId) => {
  const { data: request, error } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .eq('withdrawal_id', requestId)
    .maybeSingle();

  if (error) throw createError(500, `Lỗi khi tải yêu cầu giải ngân: ${error.message}`);
  if (!request) throw createError(404, 'Không tìm thấy yêu cầu giải ngân.');
  return request;
};

const statusMetaOf = (statusCd) =>
  STATUS_MAP[String(statusCd)] || { code: 'UNKNOWN', label: 'Không xác định', color: 'default' };

/**
 * Gán (idempotent) mã giải ngân AVRWDxxxxxxxx cho yêu cầu đang ở trạng thái APR.
 * Mã đã gán sẽ không bao giờ đổi, để QR mở lại luôn khớp với giao dịch ngân hàng đã quét.
 */
const ensurePaymentCode = async (request) => {
  if (request.payment_code) return request.payment_code;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = vietqr.generatePayoutCode();
    const { data, error } = await supabase
      .from('t_withdrawal_request')
      .update({ payment_code: candidate, updated_at: new Date().toISOString() })
      .eq('withdrawal_id', request.withdrawal_id)
      .eq('status_cd', '2')
      .is('payment_code', null)
      .select('payment_code')
      .maybeSingle();

    if (!error) {
      if (data?.payment_code) return data.payment_code;
      // Không cập nhật được dòng nào: request song song đã gán mã, hoặc trạng thái vừa đổi.
      const { data: current, error: rereadErr } = await supabase
        .from('t_withdrawal_request')
        .select('payment_code, status_cd')
        .eq('withdrawal_id', request.withdrawal_id)
        .maybeSingle();
      if (rereadErr) throw mapDbError(rereadErr, 'Không thể đọc lại mã giải ngân');
      if (current?.payment_code) return current.payment_code;
      throw createError(409, 'Trạng thái yêu cầu vừa thay đổi. Vui lòng tải lại danh sách.');
    }

    if (error.code === '23505') continue; // trùng mã ngẫu nhiên -> thử mã khác
    throw mapDbError(error, 'Không thể tạo mã giải ngân');
  }

  throw createError(500, 'Không thể sinh mã giải ngân. Vui lòng thử lại.');
};

/**
 * Business Manager: lấy thông tin chuyển khoản + mã VietQR để chi trả cho Vendor.
 */
const getPaymentQr = async (requestId) => {
  ensureClient();

  const request = await loadWithdrawalOrThrow(requestId);
  const statusCd = String(request.status_cd);
  const meta = statusMetaOf(statusCd);

  if (statusCd === '4') {
    return {
      withdrawal_id: request.withdrawal_id,
      status_cd: statusCd,
      status_code: meta.code,
      is_settled: true,
      gateway_transaction_ref: request.gateway_transaction_ref || null,
      paid_at: request.paid_at || null,
    };
  }
  if (statusCd === '1') {
    throw createError(409, 'Yêu cầu này cần được phê duyệt trước khi chi trả.');
  }
  if (statusCd !== '2') {
    throw createError(409, 'Chỉ có thể chi trả cho yêu cầu ở trạng thái Chờ thanh toán.');
  }

  // Thông tin ví -> khách sạn -> chủ sở hữu
  const { data: wallet } = await supabase
    .from('t_hotel_wallet')
    .select('wallet_id, hotel_id')
    .eq('wallet_id', request.wallet_id)
    .maybeSingle();
  const { data: hotel } = wallet
    ? await supabase.from('m_hotel').select('hotel_id, name, owner_id').eq('hotel_id', wallet.hotel_id).maybeSingle()
    : { data: null };
  const { data: owner } = hotel?.owner_id
    ? await supabase.from('m_user').select('user_id, full_name, email').eq('user_id', hotel.owner_id).maybeSingle()
    : { data: null };

  // Tài khoản ngân hàng thụ hưởng
  const { data: bank } = request.bank_account_id
    ? await supabase.from('m_bank_account').select('*').eq('bank_account_id', request.bank_account_id).maybeSingle()
    : { data: null };
  if (!bank) {
    throw createError(422, 'Không tìm thấy tài khoản ngân hàng thụ hưởng của yêu cầu này.');
  }

  const [bankNameMap, bankShortMap] = await Promise.all([getBankNameMap(), getBankShortCodeMap()]);
  const bankShortCode = bankShortMap[String(bank.bank_cd)] || String(bank.bank_cd || '').toUpperCase();
  const bin = vietqr.resolveBin({ binCode: bank.bin_code, bankShortCode });
  if (!bin) {
    throw createError(422, 'Không xác định được mã ngân hàng (BIN) để tạo mã QR. Vui lòng kiểm tra tài khoản ngân hàng của khách sạn.');
  }

  const amount = Number(request.amount);
  const paymentCode = await ensurePaymentCode(request);

  let qrUrl;
  try {
    qrUrl = vietqr.buildPayoutQrUrl({
      bin,
      accountNumber: bank.account_number,
      accountHolder: bank.account_holder,
      amount,
      paymentCode,
    });
  } catch (err) {
    throw createError(422, err.message);
  }

  return {
    withdrawal_id: request.withdrawal_id,
    status_cd: statusCd,
    status_code: meta.code,
    is_settled: false,
    hotel_name: hotel?.name || 'Khách sạn',
    owner_name: owner?.full_name || '',
    owner_email: owner?.email || '',
    amount,
    payment_code: paymentCode,
    transfer_content: paymentCode,
    qr_url: qrUrl,
    bank: {
      bank_code: bankShortCode,
      bank_name: bankNameMap[bank.bank_cd] || `Ngân hàng (${bank.bank_cd})`,
      bin,
      bank_branch: bank.bank_branch || '',
      account_number: bank.account_number,
      account_holder: bank.account_holder,
      is_verified: Boolean(bank.is_verify),
    },
  };
};

/**
 * Business Manager: trạng thái hiện tại của yêu cầu (frontend polling chờ SePay xác nhận).
 */
const getPaymentStatus = async (requestId) => {
  ensureClient();

  const request = await loadWithdrawalOrThrow(requestId);
  const meta = statusMetaOf(request.status_cd);

  return {
    withdrawal_id: request.withdrawal_id,
    status_cd: String(request.status_cd),
    status_code: meta.code,
    status_label: meta.label,
    is_settled: String(request.status_cd) === '4',
    gateway_transaction_ref: request.gateway_transaction_ref || null,
    paid_at: request.paid_at || null,
    settlement_source: request.settlement_source || null,
  };
};

/**
 * Xử lý webhook SePay cho giao dịch TIỀN RA (transferType = 'out') mang mã AVRWDxxxxxxxx.
 * Phần ghi DB chạy atomically trong hàm Postgres avora.fn_process_sepay_withdrawal.
 */
const processSepayPayout = async (payload) => {
  ensureClient();

  if (String(payload?.transferType || '').toLowerCase() !== 'out') {
    return { result: 'IGNORED_NOT_OUTGOING' };
  }

  const paymentCode = vietqr.extractPayoutCode(payload?.content || payload?.description);
  if (!paymentCode) return { result: 'NO_PAYOUT_CODE' };

  // Chỉ chấp nhận tiền chi ra từ đúng tài khoản chi của công ty (nếu đã cấu hình).
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

  const { data, error } = await supabase.rpc('fn_process_sepay_withdrawal', {
    p_payment_code: paymentCode,
    p_transfer_amount: transferAmount,
    p_gateway_ref: gatewayRef,
    p_sepay_tx_id: sepayTxId,
  });
  if (error) throw mapDbError(error, 'Lỗi xử lý giải ngân');

  const result = { ...(data || {}), payment_code: paymentCode };

  if (result.result === 'SETTLED') {
    recordAuditLog({
      actor_user_id: null,
      action_cd: '2',
      entity_name: 't_withdrawal_request',
      entity_id: result.withdrawal_id,
      old_data: { status_cd: '2' },
      new_data: {
        status_cd: '4',
        settlement_source: 'SEPAY',
        gateway_transaction_ref: result.gateway_transaction_ref,
        sepay_transaction_id: sepayTxId,
      },
    });
  }

  return result;
};

/**
 * Business Manager: Từ chối yêu cầu giải ngân (PND -> REJ, hoàn lại tiền ví)
 */
const rejectDisbursement = async (requestId, adminUserId, payload = {}) => {
  ensureClient();

  const { reason } = payload;

  const { data: request, error: reqErr } = await supabase
    .from('t_withdrawal_request')
    .select('*')
    .eq('withdrawal_id', requestId)
    .maybeSingle();

  if (reqErr || !request) {
    throw createError(404, 'Không tìm thấy yêu cầu giải ngân.');
  }

  if (String(request.status_cd) !== '1') {
    throw createError(400, 'Chỉ có thể từ chối yêu cầu đang ở trạng thái Chờ phê duyệt.');
  }

  const now = new Date().toISOString();
  const refundAmount = Number(request.amount);

  // 1. Cập nhật trạng thái yêu cầu thành REJ (5)
  const { data: updated, error: updateErr } = await supabase
    .from('t_withdrawal_request')
    .update({
      status_cd: '5', // REJ
      gateway_transaction_ref: reason ? `REJECTED: ${reason}` : 'REJECTED',
      updated_at: now,
    })
    .eq('withdrawal_id', requestId)
    .select()
    .single();

  if (updateErr) {
    throw createError(500, `Không thể từ chối yêu cầu: ${updateErr.message}`);
  }

  // 2. Hoàn lại số dư ví cho khách sạn
  const { data: wallet } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('wallet_id', request.wallet_id)
    .maybeSingle();

  if (wallet) {
    const newAvailable = Number(wallet.available_balance || 0) + refundAmount;
    await supabase
      .from('t_hotel_wallet')
      .update({
        available_balance: newAvailable,
        updated_at: now,
      })
      .eq('wallet_id', wallet.wallet_id);

    // Ghi nhật ký điều chỉnh hoàn tiền (ADJ - 4)
    await supabase.from('t_wallet_ledger').insert({
      wallet_id: wallet.wallet_id,
      transaction_type_cd: '4', // ADJ
      amount_change: refundAmount,
      current_balance: newAvailable,
      reference_id: requestId,
      created_at: now,
      updated_at: now,
    });
  }

  return {
    withdrawal_id: updated.withdrawal_id,
    status_cd: '5',
    status_code: 'REJ',
    status_label: 'Bị từ chối',
    reason: reason || null,
    updated_at: updated.updated_at,
  };
};

module.exports = {
  getVendorOverview,
  getVendorHistory,
  createVendorDisbursementRequest,
  getBusinessDisbursements,
  approveDisbursement,
  settleDisbursement,
  rejectDisbursement,
  getPaymentQr,
  getPaymentStatus,
  processSepayPayout,
};
