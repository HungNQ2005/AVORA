'use strict';

const supabase = require('../../config/supabaseClient');
const env = require('../../config/env');
const { codeNameParser } = require('../../utils/codeNameParser');
const { matchesSearch } = require('../../utils/textSearchHelper');
const otpService = require('../otp/otp.service');


/**
 * Service to manage users, roles, statistics, and access control.
 */

/**
 * Fetch and construct dynamic role mapping from m_system_code where business_cd = 'USER_ROLE'.
 * Resolves role_cd (code_cd) -> code_name and uses codeNameParser for human-readable label.
 */
let cachedRoleMap = null;
let lastRoleFetchTime = 0;
const ROLE_CACHE_TTL_MS = 60 * 1000; // 1-minute cache to avoid repeated queries

const getRoleMap = async () => {
  const now = Date.now();
  if (cachedRoleMap && now - lastRoleFetchTime < ROLE_CACHE_TTL_MS) {
    return cachedRoleMap;
  }

  const { data: systemCodes, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', 'USER_ROLE')
    .order('sort_no');

  if (error) {
    console.error('Error fetching role system codes:', error);
    if (cachedRoleMap) return cachedRoleMap;
    return new Map();
  }

  const roleMap = new Map();
  (systemCodes || []).forEach((sc) => {
    const codeName = sc.code_name ? sc.code_name.trim().toUpperCase() : '';
    roleMap.set(String(sc.code_cd), {
      code_cd: String(sc.code_cd),
      code: codeName,
      code_name: codeName,
      label: codeNameParser(codeName),
    });
  });

  cachedRoleMap = roleMap;
  lastRoleFetchTime = now;
  return roleMap;
};

/**
 * Fetch paginated and filtered list of users with resolved roles and hotels.
 */
const getUsersList = async ({
  page = 1,
  limit = 10,
  search = '',
  role = 'ALL',
  status = 'ALL',
  hotel_id = 'ALL',
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  // Fetch dynamic role mapping from m_system_code (business_cd = 'USER_ROLE')
  const roleMap = await getRoleMap();

  // Build query for users
  let query = supabase
    .from('m_user')
    .select(
      'user_id, email, full_name, phone, role_cd, account_status, is_email_verified, avatar_url, created_at, updated_at'
    )
    .eq('is_deleted', false);

  // Status Filter
  if (status && status !== 'ALL') {
    query = query.eq('account_status', status.toUpperCase());
  }

  // Role Filter (resolved dynamically from m_system_code)
  if (role && role !== 'ALL') {
    const roleUpper = role.trim().toUpperCase();
    let matchedCodeCd = null;
    for (const [cd, val] of roleMap.entries()) {
      if (val.code === roleUpper || cd === role) {
        matchedCodeCd = cd;
        break;
      }
    }
    if (matchedCodeCd) {
      query = query.eq('role_cd', matchedCodeCd);
    } else {
      query = query.eq('role_cd', role);
    }
  }

  // Order by latest created
  query = query.order('created_at', { ascending: false });

  const { data: users, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error('Không thể tải danh sách người dùng. Vui lòng thử lại sau.');
  }

  // Fetch all hotels to map ownership / affiliated branch
  const { data: hotels } = await supabase
    .from('m_hotel')
    .select('hotel_id, name, address, owner_id')
    .eq('is_deleted', false);

  const hotelByOwner = new Map();
  if (hotels && hotels.length > 0) {
    hotels.forEach((h) => {
      if (h.owner_id) {
        hotelByOwner.set(h.owner_id, h);
      }
    });
  }

  // Format and enrich each user record
  const enrichedUsers = (users || []).map((u, index) => {
    const roleInfo = roleMap.get(String(u.role_cd)) || {
      code: u.role_cd || 'CUS',
      code_name: u.role_cd || 'CUS',
      label: codeNameParser(u.role_cd) || 'Customer',
    };
    const hotel = hotelByOwner.get(u.user_id) || null;

    // Generate formatted employee / member code (e.g. AVR-25K-001)
    const codeSeq = String(index + 1).padStart(3, '0');
    const employeeCode = `AVR-25K-${codeSeq}`;

    // Detect if account is recently registered (within 7 days)
    const isNew = u.created_at
      ? Date.now() - new Date(u.created_at).getTime() < 7 * 24 * 3600 * 1000
      : false;

    return {
      user_id: u.user_id,
      email: u.email,
      full_name: u.full_name || 'Chưa cập nhật tên',
      phone: u.phone || 'Chưa có SĐT',
      role_cd: u.role_cd,
      role_code: roleInfo.code,
      role_code_name: roleInfo.code_name,
      role_label: roleInfo.label,
      account_status: u.account_status || 'ACTIVE',
      is_email_verified: Boolean(u.is_email_verified),
      avatar_url: u.avatar_url,
      employee_code: employeeCode,
      is_new: isNew,
      hotel: hotel
        ? {
            hotel_id: hotel.hotel_id,
            name: hotel.name,
            address: hotel.address,
          }
        : null,
      created_at: u.created_at,
      updated_at: u.updated_at,
    };
  });

  // Filter by hotel if specified
  let filteredUsers = enrichedUsers;
  if (hotel_id && hotel_id !== 'ALL') {
    filteredUsers = filteredUsers.filter(
      (u) => u.hotel && String(u.hotel.hotel_id) === String(hotel_id)
    );
  }

  // Contains search filter (multi-field: name, email, phone, employee code, role, hotel)
  if (search && search.trim()) {
    filteredUsers = filteredUsers.filter((u) =>
      matchesSearch(
        [
          u.full_name,
          u.email,
          u.phone,
          u.employee_code,
          u.role_label,
          u.role_code,
          u.role_code_name,
          u.hotel?.name,
          u.hotel?.address,
        ],
        search
      )
    );
  }

  const total = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);

  return {
    users: paginatedUsers,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Fetch aggregated stats for dashboard KPI cards & role tabs.
 */
const getUserStats = async () => {
  const [usersResult, roleMap] = await Promise.all([
    supabase
      .from('m_user')
      .select('user_id, role_cd, account_status, created_at')
      .eq('is_deleted', false),
    getRoleMap(),
  ]);

  const { data: users, error } = usersResult;

  if (error) {
    console.error('Error fetching user stats:', error);
    throw new Error('Không thể tải thống kê người dùng.');
  }

  const allUsers = users || [];
  const totalUsers = allUsers.length;

  let activeUsers = 0;
  let pendingUsers = 0;
  let lockedUsers = 0;

  const roleCounts = {
    hotelManager: 0,
    businessManager: 0,
    customer: 0,
    systemAdmin: 0,
  };

  allUsers.forEach((u) => {
    const status = (u.account_status || '').toUpperCase();
    if (status === 'ACTIVE') {
      activeUsers += 1;
    } else if (status === 'VERIFYING') {
      pendingUsers += 1;
    } else if (status === 'DEACTIVATED') {
      lockedUsers += 1;
    }

    const roleInfo = roleMap.get(String(u.role_cd));
    const roleCode = roleInfo?.code;

    if (roleCode === 'VEN') roleCounts.hotelManager += 1;
    else if (roleCode === 'BMR') roleCounts.businessManager += 1;
    else if (roleCode === 'CUS') roleCounts.customer += 1;
    else if (roleCode === 'ADM') roleCounts.systemAdmin += 1;
  });

  return {
    totalUsers,
    activeUsers,
    pendingUsers,
    lockedUsers,
    roleCounts,
  };
};

/**
 * Update user account status (e.g. approve, lock, activate).
 */
const updateUserStatus = async (userId, newStatus) => {
  const STATUS_MAP = {
    ACTIVE: 'ACTIVE',
    PENDING: 'VERIFYING',
    VERIFYING: 'VERIFYING',
    LOCKED: 'DEACTIVATED',
    DEACTIVATED: 'DEACTIVATED',
  };

  const statusUpper = (newStatus || '').toUpperCase();
  const resolvedStatus = STATUS_MAP[statusUpper];

  if (!resolvedStatus) {
    const err = new Error('Trạng thái không hợp lệ. Chọn ACTIVE, PENDING, hoặc LOCKED.');
    err.statusCode = 400;
    throw err;
  }

  // Lấy thông tin user hiện tại để kiểm tra vai trò
  const { data: existingUser, error: fetchErr } = await supabase
    .from('m_user')
    .select('user_id, role_cd, email, full_name')
    .eq('user_id', userId)
    .single();

  if (fetchErr || !existingUser) {
    const err = new Error('Không tìm thấy người dùng.');
    err.statusCode = 404;
    throw err;
  }

  // Lấy thông tin vai trò từ roleMap
  const roleMap = await getRoleMap();
  const roleInfo = roleMap.get(String(existingUser.role_cd));
  const roleCode = (roleInfo?.code || existingUser.role_cd || '').toUpperCase();

  // Không cho phép bất kỳ ai khóa tài khoản có vai trò Quản trị viên hệ thống (System Admin - ADM)
  if (roleCode === 'ADM' && resolvedStatus === 'DEACTIVATED') {
    const err = new Error('Tài khoản có vai trò Quản trị viên hệ thống (System Admin) không thể bị khóa.');
    err.statusCode = 403;
    throw err;
  }

  const { data: user, error } = await supabase
    .from('m_user')
    .update({
      account_status: resolvedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id, email, full_name, account_status')
    .single();

  if (error) {
    console.error('Error updating user status:', error);
    throw new Error('Không thể cập nhật trạng thái người dùng.');
  }

  return user;
};

/**
 * Helper to resolve and validate target role from input string ('ADMIN', 'BMR', 'VENDOR', etc.)
 */
const resolveTargetRole = async (inputRole) => {
  if (!inputRole || typeof inputRole !== 'string') {
    const err = new Error('Vui lòng chọn vai trò mới hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  const roleMap = await getRoleMap();
  const inputUpper = inputRole.trim().toUpperCase();

  const ALIAS_MAP = {
    ADMIN: 'ADM',
    SYSTEM_ADMIN: 'ADM',
    ADM: 'ADM',
    BUSINESS_MANAGER: 'BMR',
    BMR: 'BMR',
    VENDOR: 'VEN',
    HOTEL_MANAGER: 'VEN',
    VEN: 'VEN',
    CUSTOMER: 'CUS',
    CUS: 'CUS',
  };

  const targetCodeName = ALIAS_MAP[inputUpper] || inputUpper;

  for (const [cd, val] of roleMap.entries()) {
    if (val.code === targetCodeName || cd === inputUpper) {
      const isSensitive = ['ADM', 'BMR'].includes(val.code);
      return {
        code_cd: cd,
        code_name: val.code,
        label: val.label,
        isSensitive,
      };
    }
  }

  const err = new Error(`Vai trò "${inputRole}" không tồn tại trong hệ thống.`);
  err.statusCode = 400;
  throw err;
};

/**
 * Request role change for a target user with Step-up Authentication check.
 * Security: Admin cannot change their own role.
 * Sensitive roles (ADM, BMR) require 6-digit OTP sent to the acting Admin's email.
 */
const requestRoleChange = async ({ adminUser, targetUserId, newRole }) => {
  const adminId = adminUser?.user_id || adminUser?.id;
  if (!adminId) {
    const err = new Error('Không xác định được phiên làm việc của Quản trị viên.');
    err.statusCode = 401;
    throw err;
  }

  // Security Rule 1: Admin cannot change their own role
  if (String(adminId) === String(targetUserId)) {
    const err = new Error('Quản trị viên không được phép tự thay đổi vai trò của chính mình.');
    err.statusCode = 403;
    throw err;
  }

  // Security Rule 2: Fetch target user and ensure they exist
  const { data: targetUser, error: fetchErr } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, role_cd, account_status')
    .eq('user_id', targetUserId)
    .eq('is_deleted', false)
    .single();

  if (fetchErr || !targetUser) {
    const err = new Error('Không tìm thấy tài khoản người dùng mục tiêu.');
    err.statusCode = 404;
    throw err;
  }

  // Resolve target role
  const resolvedRole = await resolveTargetRole(newRole);

  // Check if user already possesses this role
  if (String(targetUser.role_cd) === String(resolvedRole.code_cd)) {
    const err = new Error(`Người dùng này hiện đã giữ vai trò "${resolvedRole.label}".`);
    err.statusCode = 400;
    throw err;
  }

  // Check if sensitive role (ADMIN or BUSINESS_MANAGER)
  if (resolvedRole.isSensitive) {
    // Resolve acting admin email
    let adminEmail = adminUser.email;
    if (!adminEmail) {
      const { data: adminRecord } = await supabase
        .from('m_user')
        .select('email')
        .eq('user_id', adminId)
        .single();
      adminEmail = adminRecord?.email;
    }

    if (!adminEmail) {
      const err = new Error('Không thể tìm thấy địa chỉ email của Quản trị viên để gửi OTP.');
      err.statusCode = 500;
      throw err;
    }

    // Step-up Auth: Generate OTP and send security email to acting Admin
    const purpose = `ROLE_CHANGE_${targetUserId}_${resolvedRole.code_name}`;
    await otpService.sendOtp({
      identifier: adminId,
      email: adminEmail,
      purpose,
      expiryMinutes: 5,
      subject: 'Cảnh báo Bảo mật: Xác nhận cấp quyền quản trị - Avora Booking',
      templateName: 'adminRoleChangeOtp',
      templateData: {
        newRole: resolvedRole.label,
        targetUserEmail: targetUser.email,
      },
    });

    return {
      status: 'REQUIRES_OTP',
      message: 'Hành động nhạy cảm yêu cầu xác thực bảo mật cấp 2 (Step-up Auth). Vui lòng nhập mã OTP 6 số đã gửi tới email Quản trị viên.',
      data: {
        targetUserId,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.full_name,
        newRole: resolvedRole.code_name,
        newRoleLabel: resolvedRole.label,
        adminEmail,
        expiresInMinutes: 5,
      },
    };
  }

  // Non-sensitive roles (VENDOR, CUSTOMER): Update directly
  const { data: updatedUser, error: updateErr } = await supabase
    .from('m_user')
    .update({
      role_cd: resolvedRole.code_cd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId)
    .select('user_id, email, full_name, role_cd, account_status')
    .single();

  if (updateErr) {
    console.error('Error updating role:', updateErr);
    const err = new Error('Không thể cập nhật quyền người dùng.');
    err.statusCode = 500;
    throw err;
  }

  return {
    status: 'SUCCESS',
    message: `Đã thay đổi quyền thành công cho "${targetUser.full_name}" sang vai trò "${resolvedRole.label}".`,
    data: {
      user: {
        ...updatedUser,
        role_code: resolvedRole.code_name,
        role_label: resolvedRole.label,
      },
    },
  };
};

/**
 * Confirm role change using OTP verification for Step-up Authentication.
 */
const confirmRoleChange = async ({ adminUser, targetUserId, newRole, otpCode }) => {
  const adminId = adminUser?.user_id || adminUser?.id;
  if (!adminId) {
    const err = new Error('Không xác định được phiên làm việc của Quản trị viên.');
    err.statusCode = 401;
    throw err;
  }

  // Security Rule 1: Admin cannot change their own role
  if (String(adminId) === String(targetUserId)) {
    const err = new Error('Quản trị viên không được phép tự thay đổi vai trò của chính mình.');
    err.statusCode = 403;
    throw err;
  }

  if (!otpCode || typeof otpCode !== 'string' || otpCode.trim().length !== 6) {
    const err = new Error('Mã OTP xác thực phải gồm đúng 6 chữ số.');
    err.statusCode = 400;
    throw err;
  }

  // Security Rule 2: Fetch target user
  const { data: targetUser, error: fetchErr } = await supabase
    .from('m_user')
    .select('user_id, email, full_name, role_cd')
    .eq('user_id', targetUserId)
    .eq('is_deleted', false)
    .single();

  if (fetchErr || !targetUser) {
    const err = new Error('Không tìm thấy tài khoản người dùng mục tiêu.');
    err.statusCode = 404;
    throw err;
  }

  const resolvedRole = await resolveTargetRole(newRole);

  // Security Rule 3: Verify Step-up OTP with dedicated purpose
  const purpose = `ROLE_CHANGE_${targetUserId}_${resolvedRole.code_name}`;
  await otpService.verifyOtp({
    identifier: adminId,
    otp: otpCode.trim(),
    purpose,
  });

  // Security Rule 4: Update DB after successful OTP verification
  const { data: updatedUser, error: updateErr } = await supabase
    .from('m_user')
    .update({
      role_cd: resolvedRole.code_cd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId)
    .select('user_id, email, full_name, role_cd, account_status')
    .single();

  if (updateErr) {
    console.error('Error applying role update:', updateErr);
    const err = new Error('Không thể lưu cập nhật vai trò mới vào hệ thống.');
    err.statusCode = 500;
    throw err;
  }

  return {
    status: 'SUCCESS',
    message: `Xác thực OTP thành công! Đã cấp quyền "${resolvedRole.label}" cho tài khoản "${targetUser.email}".`,
    data: {
      user: {
        ...updatedUser,
        role_code: resolvedRole.code_name,
        role_label: resolvedRole.label,
      },
    },
  };
};

// ─── Avatar (Supabase Storage bucket `pfp`) ──────────────────────────────────
const AVATAR_BUCKET = 'pfp';
const AVATAR_MAX_URL_LENGTH = 1000;

/** Prefix công khai của file avatar thuộc về một user: <SUPABASE_URL>/storage/v1/object/public/pfp/<userId>/ */
const buildAvatarPublicPrefix = (userId) =>
  `${String(env.SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${userId}/`;

/** Lấy đường dẫn object trong bucket từ public URL; trả null nếu URL không thuộc bucket pfp. */
const extractAvatarObjectPath = (publicUrl) => {
  if (typeof publicUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = publicUrl.slice(idx + marker.length).split('?')[0];
  try {
    return decodeURIComponent(rawPath) || null;
  } catch {
    return null;
  }
};

/**
 * Cập nhật (hoặc xóa) ảnh đại diện của user.
 * @param {string} userId
 * @param {string|null} avatarUrl - public URL từ Supabase Storage; null/'' để xóa avatar
 * @returns {Promise<{ user_id: string, avatar_url: string|null }>}
 */
const updateAvatar = async (userId, avatarUrl) => {
  const newUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : avatarUrl;
  const isRemoving = newUrl === null || newUrl === undefined || newUrl === '';

  if (!isRemoving) {
    if (typeof newUrl !== 'string' || newUrl.length > AVATAR_MAX_URL_LENGTH) {
      const err = new Error('Đường dẫn ảnh đại diện không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }
    if (!newUrl.startsWith(buildAvatarPublicPrefix(userId))) {
      const err = new Error('Ảnh đại diện phải được tải lên kho lưu trữ AVORA (thư mục của chính bạn).');
      err.statusCode = 400;
      throw err;
    }
  }

  const { data: current, error: findError } = await supabase
    .from('m_user')
    .select('user_id, avatar_url, account_status')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (findError) {
    console.error('[Avatar] Lỗi truy vấn người dùng:', findError);
    const err = new Error('Không thể truy xuất thông tin người dùng.');
    err.statusCode = 500;
    throw err;
  }
  if (!current) {
    const err = new Error('Không tìm thấy người dùng.');
    err.statusCode = 404;
    throw err;
  }

  // Token còn hạn nhưng tài khoản đã bị khóa/vô hiệu hóa thì không được phép thay đổi dữ liệu
  if (['DEACTIVATED', 'LOCKED'].includes(String(current.account_status || '').toUpperCase())) {
    const err = new Error('Tài khoản của bạn không còn hoạt động.');
    err.statusCode = 403;
    throw err;
  }

  // Phạm vi UPDATE bị ép ở tầng DB: chỉ đúng dòng của chủ token (userId đến từ JWT, không từ client)
  const { data: updated, error: updateError } = await supabase
    .from('m_user')
    .update({ avatar_url: isRemoving ? null : newUrl, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .select('user_id, avatar_url')
    .single();

  if (updateError || !updated) {
    console.error('[Avatar] Lỗi cập nhật avatar_url:', updateError);
    const err = new Error('Không thể lưu ảnh đại diện. Vui lòng thử lại.');
    err.statusCode = 500;
    throw err;
  }

  // Dọn file cũ trong Storage (không làm hỏng luồng chính nếu lỗi)
  const oldPath = extractAvatarObjectPath(current.avatar_url);
  if (oldPath && oldPath.startsWith(`${userId}/`) && current.avatar_url !== updated.avatar_url) {
    try {
      const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
      if (removeError) console.warn('[Avatar] Không xóa được file cũ:', removeError.message);
    } catch (removeErr) {
      console.warn('[Avatar] Lỗi khi xóa file cũ:', removeErr.message);
    }
  }

  return updated;
};

module.exports = {
  getUsersList,
  getUserStats,
  updateUserStatus,
  requestRoleChange,
  confirmRoleChange,
  resolveTargetRole,
  updateAvatar,
};

