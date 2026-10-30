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
 * Get vendor's hotels list (Only approved & active hotels owned by this vendor)
 */
const getVendorHotels = async (vendorId) => {
  ensureClient();
  if (!vendorId) {
    throw createError(403, 'Không xác định được danh tính chủ khách sạn (Vendor).');
  }

  const { data, error } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, address, hotel_status')
    .eq('owner_id', vendorId)
    .eq('is_deleted', false)
    .eq('hotel_status', 'ACTIVE')
    .order('name', { ascending: true });

  if (error) throwDatabaseError('Không thể tải danh sách khách sạn.', error);
  return data || [];
};

/**
 * Get wallet & linked bank account of a single hotel
 */
const getHotelWalletAndBank = async (hotelId, vendorId) => {
  ensureClient();
  if (!vendorId) {
    throw createError(403, 'Không xác định được danh tính chủ khách sạn (Vendor).');
  }

  // 1. Verify hotel ownership & strictly require ACTIVE status
  const { data: hotel, error: hotelErr } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, owner_id, hotel_status')
    .eq('hotel_id', hotelId)
    .eq('owner_id', vendorId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (hotelErr) throwDatabaseError('Không thể kiểm tra thông tin khách sạn.', hotelErr);
  if (!hotel) {
    throw createError(404, 'Không tìm thấy khách sạn hoặc bạn không có quyền truy cập.');
  }

  if (hotel.hotel_status !== 'ACTIVE') {
    throw createError(
      400,
      'Khách sạn chưa được phê duyệt hoặc không ở trạng thái hoạt động (ACTIVE). Không thể thực hiện thao tác ví.'
    );
  }

  // 2. Get or initialize t_hotel_wallet (safe against concurrent auto-creation)
  let { data: wallet, error: walletErr } = await supabase
    .from('t_hotel_wallet')
    .select('*')
    .eq('hotel_id', hotelId)
    .limit(1)
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
      // Handle race condition if another concurrent request just created the wallet
      const { data: retryWallet, error: retryErr } = await supabase
        .from('t_hotel_wallet')
        .select('*')
        .eq('hotel_id', hotelId)
        .limit(1)
        .maybeSingle();

      if (retryErr || !retryWallet) {
        throwDatabaseError('Không thể khởi tạo ví khách sạn.', insertWalletErr);
      }
      wallet = retryWallet;
    } else {
      wallet = newWallet;
    }
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

  // 4. Fetch existing verified bank accounts from OTHER active hotels owned by this same Vendor
  //    so the Vendor can optionally reuse their bank account with 1 click or enter a different one.
  let vendorSavedAccounts = [];
  const { data: otherHotels } = await supabase
    .from('m_hotel')
    .select('hotel_id, name')
    .eq('owner_id', vendorId)
    .eq('is_deleted', false)
    .eq('hotel_status', 'ACTIVE')
    .neq('hotel_id', hotelId);

  if (otherHotels && otherHotels.length > 0) {
    const otherHotelIds = otherHotels.map((h) => h.hotel_id);
    const hotelNameMap = Object.fromEntries(otherHotels.map((h) => [h.hotel_id, h.name]));

    const { data: otherBankAccounts } = await supabase
      .from('m_bank_account')
      .select('bank_account_id, hotel_id, bank_cd, bin_code, account_number, account_holder, bank_branch')
      .in('hotel_id', otherHotelIds)
      .eq('is_verify', true)
      .order('created_at', { ascending: false });

    if (otherBankAccounts && otherBankAccounts.length > 0) {
      const seenKeys = new Set();
      for (const acc of otherBankAccounts) {
        const key = `${acc.bank_cd}:${acc.account_number}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          vendorSavedAccounts.push({
            ...acc,
            source_hotel_name: hotelNameMap[acc.hotel_id] || 'Khách sạn cùng chủ sở hữu',
          });
        }
      }
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
    vendor_saved_accounts: vendorSavedAccounts,
  };
};

// Per-hotel concurrency mutex lock to prevent simultaneous duplicate linking requests
const activeLinkingLocks = new Set();

/**
 * Link single bank account to hotel's wallet (Strictly 1 account per hotel, permanent)
 */
const linkBankAccount = async ({
  hotelId,
  vendorId,
  bankCd,
  accountNumber,
  accountHolder,
  bankBranch,
}) => {
  ensureClient();
  if (!vendorId) {
    throw createError(403, 'Không xác định được danh tính chủ khách sạn (Vendor).');
  }

  const hotelLockKey = `hotel:${hotelId}`;

  if (activeLinkingLocks.has(hotelLockKey)) {
    throw createError(
      409,
      'Yêu cầu liên kết tài khoản cho khách sạn này đang được xử lý. Vui lòng không gửi lặp lại.'
    );
  }

  activeLinkingLocks.add(hotelLockKey);

  try {
    // 1. Verify hotel ownership & strictly require ACTIVE operational status
    const { data: hotel, error: hotelErr } = await supabase
      .from('m_hotel')
      .select('hotel_id, name, owner_id, hotel_status')
      .eq('hotel_id', hotelId)
      .eq('owner_id', vendorId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (hotelErr) throwDatabaseError('Không thể kiểm tra khách sạn.', hotelErr);
    if (!hotel) {
      throw createError(404, 'Không tìm thấy khách sạn hoặc bạn không có quyền truy cập.');
    }

    if (hotel.hotel_status !== 'ACTIVE') {
      throw createError(
        400,
        'Khách sạn chưa được phê duyệt hoặc không ở trạng thái hoạt động (ACTIVE). Không thể liên kết tài khoản ngân hàng.'
      );
    }

    // 2. Ensure wallet exists (safe against concurrent auto-creation)
    let { data: wallet } = await supabase
      .from('t_hotel_wallet')
      .select('wallet_id')
      .eq('hotel_id', hotelId)
      .limit(1)
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
        const { data: retryWallet } = await supabase
          .from('t_hotel_wallet')
          .select('wallet_id')
          .eq('hotel_id', hotelId)
          .limit(1)
          .maybeSingle();
        if (!retryWallet) {
          throwDatabaseError('Không thể khởi tạo ví khách sạn.', createWalletErr);
        }
        wallet = retryWallet;
      } else {
        wallet = newWallet;
      }
    }

    // 3. Check duplicate #1: Hotel already has an active linked bank account (is_verify = true)
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

    // Clean up any old inactive bank records (is_verify = false) for this hotel
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

    // 4b. Check duplicate #2: Allow the same Vendor to use their own bank account across their hotels,
    //     but block if this (bank_cd + account_number) is already linked to a DIFFERENT Vendor's hotel.
    const { data: existingAccountsWithNum, error: dupErr } = await supabase
      .from('m_bank_account')
      .select('bank_account_id, hotel_id')
      .eq('bank_cd', String(validBank.code_cd))
      .eq('account_number', accountNumber.trim())
      .eq('is_verify', true);

    if (dupErr) throwDatabaseError('Không thể kiểm tra trùng lặp số tài khoản.', dupErr);

    if (existingAccountsWithNum && existingAccountsWithNum.length > 0) {
      const linkedHotelIds = existingAccountsWithNum.map((item) => item.hotel_id).filter(Boolean);
      if (linkedHotelIds.length > 0) {
        const { data: conflictHotels, error: conflictErr } = await supabase
          .from('m_hotel')
          .select('hotel_id, owner_id')
          .in('hotel_id', linkedHotelIds)
          .neq('owner_id', vendorId)
          .limit(1);

        if (conflictErr) throwDatabaseError('Không thể đối chiếu chủ sở hữu tài khoản.', conflictErr);

        if (conflictHotels && conflictHotels.length > 0) {
          throw createError(
            409,
            'Số tài khoản ngân hàng này đã được liên kết bởi một chủ khách sạn (Vendor) khác trên hệ thống.'
          );
        }
      }
    }

    // 5. Resolve BIN exclusively on server from authoritative VietQR data (never trust client bin_code)
    const vietQrBanks = await fetchVietQrBanks();
    const matched = matchVietQrBank(validBank.code_name, vietQrBanks);
    const resolvedBin = matched?.bin || null;

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

    // 7. Post-insert concurrency verification:
    //    (a) Ensure only 1 active account per hotel survives
    //    (b) Ensure no other Vendor concurrently linked the exact same (bank_cd + account_number)
    const [{ data: activeHotelAccounts }, { data: activeSameNumberAccounts }] = await Promise.all([
      supabase
        .from('m_bank_account')
        .select('bank_account_id, created_at')
        .eq('hotel_id', hotelId)
        .eq('is_verify', true)
        .order('created_at', { ascending: true })
        .order('bank_account_id', { ascending: true }),
      supabase
        .from('m_bank_account')
        .select('bank_account_id, hotel_id, created_at')
        .eq('bank_cd', String(validBank.code_cd))
        .eq('account_number', accountNumber.trim())
        .eq('is_verify', true)
        .order('created_at', { ascending: true })
        .order('bank_account_id', { ascending: true }),
    ]);

    const hotelWinnerId = activeHotelAccounts?.[0]?.bank_account_id;

    if (
      activeHotelAccounts &&
      activeHotelAccounts.length > 1 &&
      createdAccount.bank_account_id !== hotelWinnerId
    ) {
      await supabase
        .from('m_bank_account')
        .delete()
        .eq('bank_account_id', createdAccount.bank_account_id);
      throw createError(
        409,
        'Phát hiện yêu cầu liên kết trùng lặp đồng thời cho khách sạn này. Vui lòng tải lại trang.'
      );
    }

    if (activeSameNumberAccounts && activeSameNumberAccounts.length > 1) {
      const firstAccount = activeSameNumberAccounts[0];
      if (firstAccount.bank_account_id !== createdAccount.bank_account_id) {
        const { data: firstOwnerHotel } = await supabase
          .from('m_hotel')
          .select('owner_id')
          .eq('hotel_id', firstAccount.hotel_id)
          .maybeSingle();

        if (firstOwnerHotel && firstOwnerHotel.owner_id !== vendorId) {
          await supabase
            .from('m_bank_account')
            .delete()
            .eq('bank_account_id', createdAccount.bank_account_id);
          throw createError(
            409,
            'Số tài khoản ngân hàng này vừa được liên kết bởi một chủ khách sạn khác.'
          );
        }
      }
    }

    return createdAccount;
  } finally {
    activeLinkingLocks.delete(hotelLockKey);
  }
};

module.exports = {
  getSupportedBanks,
  getVendorHotels,
  getHotelWalletAndBank,
  linkBankAccount,
};
