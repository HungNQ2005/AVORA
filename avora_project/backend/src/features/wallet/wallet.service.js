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
  console.error(`[Wallet] ${message}:`, error?.message || error);
  throw createError(500, message);
};

// In-memory cache for VietQR official banks API and Base64 logos (24 hours TTL)
let cachedVietQrBanks = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const logoBase64Cache = new Map();

/**
 * Fetch logo as Base64 to bypass browser canvas CORS restrictions cleanly
 */
const fetchLogoBase64 = async (logoUrl) => {
  if (!logoUrl) return null;
  if (logoBase64Cache.has(logoUrl)) return logoBase64Cache.get(logoUrl);

  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = `data:image/png;base64,${buf.toString('base64')}`;
    logoBase64Cache.set(logoUrl, base64);
    return base64;
  } catch {
    return null;
  }
};

/**
 * Fetch dynamic banks list directly from VietQR official API
 * Endpoint: https://api.vietqr.io/v2/banks
 */
const fetchVietQrBanks = async () => {
  const now = Date.now();
  if (cachedVietQrBanks && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedVietQrBanks;
  }

  try {
    const response = await fetch('https://api.vietqr.io/v2/banks', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`VietQR API returned status ${response.status}`);
    }

    const json = await response.json();
    if (Array.isArray(json?.data) && json.data.length > 0) {
      cachedVietQrBanks = json.data;
      lastFetchTime = now;
      return cachedVietQrBanks;
    }
  } catch (err) {
    console.warn('[Wallet] VietQR live API fetch warning (using cache/fallback):', err.message);
  }

  return cachedVietQrBanks || [];
};

/**
 * Helper to match an Avora bank code (e.g. 'VCB', 'MBB', 'CTG') with a VietQR bank record
 */
const matchVietQrBank = (codeName, vietQrBanks = []) => {
  if (!codeName || !vietQrBanks.length) return null;

  const targetCode = String(codeName).trim().toUpperCase();
  const fullName = String(codeNameParser(targetCode) || '').trim().toLowerCase();
  const cleanFullName = fullName.replace(/\s+/g, '');

  return vietQrBanks.find((v) => {
    const vCode = String(v.code || '').trim().toUpperCase();
    const vShort = String(v.shortName || v.short_name || '').trim().toLowerCase();
    const vCleanShort = vShort.replace(/\s+/g, '');
    const vName = String(v.name || '').trim().toLowerCase();

    return (
      vCode === targetCode ||
      vShort === fullName ||
      vCleanShort === cleanFullName ||
      vName.includes(fullName)
    );
  }) || null;
};

/**
 * Get active banks list from m_system_code (business_cd = 'BANK_CD')
 * Dynamically enriched with live BIN & Logo from https://api.vietqr.io/v2/banks
 */
const getSupportedBanks = async () => {
  ensureClient();

  // Query DB and VietQR API concurrently
  const [dbResult, vietQrBanks] = await Promise.all([
    supabase
      .from('m_system_code')
      .select('code_cd, code_name, sort_no')
      .eq('business_cd', 'BANK_CD')
      .order('sort_no', { ascending: true }),
    fetchVietQrBanks(),
  ]);

  if (dbResult.error) {
    throwDatabaseError('Không thể tải danh sách ngân hàng.', dbResult.error);
  }

  return Promise.all(
    (dbResult.data || []).map(async (b) => {
      const matched = matchVietQrBank(b.code_name, vietQrBanks);
      const logoUrl = matched?.logo || null;
      const logoBase64 = logoUrl ? await fetchLogoBase64(logoUrl) : null;
      return {
        bank_cd: b.code_cd,
        code_name: b.code_name,
        bin_code: matched?.bin || null,
        logo_url: logoUrl,
        logo_base64: logoBase64,
        short_name: matched?.shortName || codeNameParser(b.code_name),
      };
    })
  );
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

  // 1. Verify hotel ownership & active status
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id, hotel_status')
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

  if (hotel.hotel_status === 'INACTIVE') {
    throw createError(400, 'Khách sạn này hiện đang tạm ngưng hoạt động. Không thể thực hiện thao tác ví.');
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

  // 3. Get active & verified linked bank account from m_bank_account (is_verify must be true)
  const { data: bankAccount, error: bankErr } = await supabase
    .from('m_bank_account')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_verify', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bankErr) throwDatabaseError('Không thể lấy thông tin tài khoản ngân hàng.', bankErr);

  // If bank account has bank_cd, attach dynamic logo from VietQR
  let enrichedBank = bankAccount || null;
  if (bankAccount?.bank_cd) {
    const { data: sysCode } = await supabase
      .from('m_system_code')
      .select('code_name')
      .eq('business_cd', 'BANK_CD')
      .eq('code_cd', String(bankAccount.bank_cd))
      .maybeSingle();

    const lookupCode = sysCode?.code_name || bankAccount.bank_cd;
    const vietQrBanks = await fetchVietQrBanks();
    const matched = matchVietQrBank(lookupCode, vietQrBanks);
    if (matched) {
      const logoBase64 = matched.logo ? await fetchLogoBase64(matched.logo) : null;
      enrichedBank = {
        ...bankAccount,
        code_name: lookupCode,
        logo_url: matched.logo || null,
        logo_base64: logoBase64,
        bank_name: matched.shortName || null,
      };
    }
  }

  return {
    hotel: {
      hotel_id: hotel.hotel_id,
      name: hotel.name,
    },
    wallet: {
      wallet_id: wallet.wallet_id,
      hotel_id: wallet.hotel_id,
      pending_balance: Math.max(0, Number(wallet.pending_balance) || 0),
      available_balance: Math.max(0, Number(wallet.available_balance) || 0),
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    },
    bank_account: enrichedBank,
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

  // 1. Verify hotel ownership & operational status
  let hotelQuery = supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id, hotel_status')
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

  if (hotel.hotel_status === 'INACTIVE') {
    throw createError(400, 'Khách sạn này hiện đang tạm ngưng hoạt động. Không thể liên kết tài khoản ngân hàng.');
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

  // 3. Check if hotel already has an active, verified linked bank account (is_verify = true)
  const { data: existingActiveAccount, error: checkBankErr } = await supabase
    .from('m_bank_account')
    .select('bank_account_id')
    .eq('hotel_id', hotelId)
    .eq('is_verify', true)
    .limit(1)
    .maybeSingle();

  if (checkBankErr) throwDatabaseError('Không thể kiểm tra tài khoản ngân hàng.', checkBankErr);

  if (existingActiveAccount) {
    throw createError(
      409,
      'Khách sạn này đã liên kết tài khoản ngân hàng cố định với ví. Mỗi khách sạn chỉ được liên kết 1 tài khoản hoạt động duy nhất.'
    );
  }

  // Clean up any old unverified / inactive bank records for this hotel
  await supabase
    .from('m_bank_account')
    .delete()
    .eq('hotel_id', hotelId)
    .eq('is_verify', false);

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

  // 5. Resolve BIN dynamically from VietQR official API
  let resolvedBin = binCode || null;
  if (!resolvedBin) {
    const vietQrBanks = await fetchVietQrBanks();
    const matched = matchVietQrBank(validBank.code_name, vietQrBanks);
    resolvedBin = matched?.bin || null;
  }

  // 6. Insert single bank account record
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
