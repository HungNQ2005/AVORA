'use strict';

const supabase = require('../../config/supabaseClient');
const { codeNameParser } = require('../../utils/codeNameParser');
const { matchesSearch } = require('../../utils/textSearchHelper');

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
    throw new Error('Không thể tải danh sách người dùng từ cơ sở dữ liệu.');
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

module.exports = {
  getUsersList,
  getUserStats,
  updateUserStatus,
};
