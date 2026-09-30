'use strict';

const supabase = require('../../config/supabaseClient');

/**
 * Service to manage users, roles, statistics, and access control.
 */

// Role mappings based on m_system_code
const ROLE_MAP = {
  '1': { code: 'ADM', label: 'System Admin' },
  '2': { code: 'CUS', label: 'Customer' },
  '3': { code: 'BMR', label: 'Business Manager' },
  '4': { code: 'VEN', label: 'Hotel Manager' },
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

  // Build query for users
  let query = supabase
    .from('m_user')
    .select(
      'user_id, email, full_name, phone, role_cd, account_status, is_email_verified, avatar_url, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('is_deleted', false);

  // Status Filter
  if (status && status !== 'ALL') {
    query = query.eq('account_status', status.toUpperCase());
  }

  // Role Filter
  if (role && role !== 'ALL') {
    const matchedRoleEntry = Object.entries(ROLE_MAP).find(
      ([cd, val]) => val.code === role.toUpperCase() || cd === role
    );
    if (matchedRoleEntry) {
      query = query.eq('role_cd', matchedRoleEntry[0]);
    }
  }

  // Search Filter (full_name, email, phone)
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  // Order by latest created
  query = query.order('created_at', { ascending: false });

  // Pagination slice
  query = query.range(offset, offset + limitNum - 1);

  const { data: users, count, error } = await query;

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
    const roleInfo = ROLE_MAP[u.role_cd] || { code: 'CUS', label: 'Customer' };
    const hotel = hotelByOwner.get(u.user_id) || null;

    // Generate formatted employee / member code (e.g. AVR-25K-001)
    const codeSeq = String(offset + index + 1).padStart(3, '0');
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

  return {
    users: enrichedUsers,
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil((count || 0) / limitNum),
  };
};

/**
 * Fetch aggregated stats for dashboard KPI cards & role tabs.
 */
const getUserStats = async () => {
  const { data: users, error } = await supabase
    .from('m_user')
    .select('user_id, role_cd, account_status, created_at')
    .eq('is_deleted', false);

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

    if (u.role_cd === '4') roleCounts.hotelManager += 1;
    else if (u.role_cd === '3') roleCounts.businessManager += 1;
    else if (u.role_cd === '2') roleCounts.customer += 1;
    else if (u.role_cd === '1') roleCounts.systemAdmin += 1;
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
