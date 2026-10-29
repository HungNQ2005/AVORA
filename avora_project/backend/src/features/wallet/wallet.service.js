'use strict';

const supabase = require('../../config/supabaseClient');

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
  console.error(`[Wallet] ${message}:`, error?.message || error);
  throw createError(500, message);
};

// BIN lookup by bank code name
const BANK_BIN_MAP = {
  VCB: '970436',
  BID: '970418',
  CTG: '970415',
  VBA: '970405',
  TCB: '970407',
  MBB: '970422',
  VPB: '970432',
  ACB: '970416',
  STB: '970403',
  HDB: '970437',
  SHB: '970443',
  VIB: '970441',
  TPB: '970423',
  LPB: '970449',
  EIB: '970431',
  MSB: '970426',
  OCB: '970448',
  SSB: '970440',
  NAB: '970428',
  KLB: '970452',
};

/**
 * Get active banks list from m_system_code (business_cd = 'BANK_CD')
 */
const getSupportedBanks = async () => {
  ensureClient();
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name, sort_no')
    .eq('business_cd', 'BANK_CD')
    .order('sort_no', { ascending: true });

  if (error) throwDatabaseError('Không thể tải danh sách ngân hàng.', error);

  return (data || []).map((b) => ({
    bank_cd: b.code_cd,
    code_name: b.code_name,
    bin_code: BANK_BIN_MAP[b.code_name] || null,
  }));
};

/**
 * Get vendor's hotels list
 */
const getVendorHotels = async (vendorId) => {
  ensureClient();
  let query = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, hotel_status')
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (vendorId) {
    query = query.eq('owner_id', vendorId);
  }

  const { data, error } = await query;
  if (error) throwDatabaseError('Không thể tải danh sách khách sạn.', error);
  return data || [];
};

/**
 * Get wallet & linked bank account of a single hotel
 */
const getHotelWalletAndBank = async (hotelId, vendorId) => {
  ensureClient();

  // 1. Verify hotel ownership
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);

  if (vendorId) {
    hotelQuery = hotelQuery.eq('owner_id', vendorId);
  }

  const { data: hotel, error: hotelErr } = await hotelQuery.maybeSingle();
  if (hotelErr) throwDatabaseError('Không thể kiểm tra thông tin khách sạn.', hotelErr);
  if (!hotel) {
    throw createError(404, 'Không tìm thấy khách sạn hoặc bạn không có quyền truy cập.');
  }

  // 2. Get or initialize t_hotel_wallet
  let { data: wallet, error: walletErr } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (walletErr) throwDatabaseError('Không thể lấy thông tin ví khách sạn.', walletErr);

  if (!wallet) {
    const { data: newWallet, error: insertWalletErr } = await supabase
      .from('t_hotel_wallet')
      .insert({
        hotel_id: hotelId,
        pending_balance: 0,
        available_balance: 0,
      })
      .select('*')
      .single();

    if (insertWalletErr) {
      throwDatabaseError('Không thể khởi tạo ví khách sạn.', insertWalletErr);
    }
    wallet = newWallet;
  }

  // 3. Get linked bank account from m_bank_account
  const { data: bankAccount, error: bankErr } = await supabase
    .from('m_bank_account')
    .select('*')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (bankErr) throwDatabaseError('Không thể lấy thông tin tài khoản ngân hàng.', bankErr);

  return {
    hotel: {
      hotel_id: hotel.hotel_id,
      name: hotel.name,
    },
    wallet: {
      wallet_id: wallet.wallet_id,
      hotel_id: wallet.hotel_id,
      pending_balance: Number(wallet.pending_balance) || 0,
      available_balance: Number(wallet.available_balance) || 0,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    },
    bank_account: bankAccount || null,
  };
};

/**
 * Link single bank account to hotel's wallet (Strictly 1 account per hotel, permanent)
 */
const linkBankAccount = async ({
  hotelId,
  vendorId,
  bankCd,
  binCode,
  accountNumber,
  accountHolder,
  bankBranch,
}) => {
  ensureClient();

  // 1. Verify hotel ownership
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false);

  if (vendorId) {
    hotelQuery = hotelQuery.eq('owner_id', vendorId);
  }

  const { data: hotel, error: hotelErr } = await hotelQuery.maybeSingle();
  if (hotelErr) throwDatabaseError('Không thể kiểm tra khách sạn.', hotelErr);
  if (!hotel) {
    throw createError(404, 'Không tìm thấy khách sạn hoặc bạn không có quyền truy cập.');
  }

  // 2. Ensure wallet exists
  let { data: wallet } = await supabase
    .from('t_hotel_wallet')
    .select('wallet_id')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet, error: createWalletErr } = await supabase
      .from('t_hotel_wallet')
      .insert({
        hotel_id: hotelId,
        pending_balance: 0,
        available_balance: 0,
      })
      .select('wallet_id')
      .single();

    if (createWalletErr) {
      throwDatabaseError('Không thể khởi tạo ví khách sạn.', createWalletErr);
    }
    wallet = newWallet;
  }

  // 3. Check if hotel already has a linked bank account
  const { data: existingAccount, error: checkBankErr } = await supabase
    .from('m_bank_account')
    .select('bank_account_id')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (checkBankErr) throwDatabaseError('Không thể kiểm tra tài khoản ngân hàng.', checkBankErr);

  if (existingAccount) {
    throw createError(
      409,
      'Khách sạn này đã liên kết tài khoản ngân hàng cố định với ví. Mỗi khách sạn chỉ được liên kết 1 tài khoản duy nhất.'
    );
  }

  // 4. Validate bank_cd in m_system_code (business_cd = 'BANK_CD')
  const { data: validBank, error: bankCodeErr } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'BANK_CD')
    .eq('code_cd', String(bankCd))
    .maybeSingle();

  if (bankCodeErr || !validBank) {
    throw createError(400, 'Ngân hàng được chọn không hợp lệ.');
  }

  const resolvedBin = binCode || BANK_BIN_MAP[validBank.code_name] || null;

  // 5. Insert single bank account record
  const { data: createdAccount, error: insertBankErr } = await supabase
    .from('m_bank_account')
    .insert({
      hotel_id: hotelId,
      bank_cd: String(validBank.code_cd),
      bin_code: resolvedBin,
      bank_branch: bankBranch?.trim() || null,
      account_number: accountNumber.trim(),
      account_holder: accountHolder.trim().toUpperCase(),
      is_verify: true,
    })
    .select('*')
    .single();

  if (insertBankErr) {
    throwDatabaseError('Không thể lưu thông tin tài khoản ngân hàng.', insertBankErr);
  }

  return createdAccount;
};

module.exports = {
  getSupportedBanks,
  getVendorHotels,
  getHotelWalletAndBank,
  linkBankAccount,
};

