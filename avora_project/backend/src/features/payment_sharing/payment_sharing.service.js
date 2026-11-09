'use strict';

const crypto = require('crypto');
const supabase = require('../../config/supabaseClient');
const env = require('../../config/env');

const GROUP_HOLD_MS = 2 * 60 * 60 * 1000; // 2 tiếng
const SINGLE_HOLD_MS = 10 * 60 * 1000; // 10 phút
const GROUP_CODE_PREFIX = 'AVRGP';
const GROUP_CODE_REGEX = /AVRGP\d{7,9}/i;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 10;
const MIN_MEMBER_AMOUNT = 10000;
const MAX_CODE_ATTEMPTS = 6;

const createError = (message, statusCode = 500, code = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const ensureClient = () => {
  if (!supabase) throw createError('Database client is not initialized.', 503);
};

const parseDbTimestamp = (val) => {
  if (!val) return null;
  let s = String(val).trim();
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) s += 'Z';
  else if (!s.includes('T') && /^\d{4}-\d{2}-\d{2} /.test(s)) s = `${s.replace(' ', 'T')}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getRemainingSecondsUntil = (expiresAt, fallbackCreatedAt = null, holdMs = GROUP_HOLD_MS) => {
  const exp = parseDbTimestamp(expiresAt);
  if (exp) {
    return Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 1000));
  }
  const created = parseDbTimestamp(fallbackCreatedAt);
  if (!created) return 0;
  return Math.max(0, Math.ceil((created.getTime() + holdMs - Date.now()) / 1000));
};

const generateGroupPaymentCode = () => `${GROUP_CODE_PREFIX}${crypto.randomInt(10000000, 100000000)}`;

const generateInviteHash = () => crypto.randomBytes(9).toString('base64url');

const extractGroupPaymentCode = (text) => {
  const match = String(text || '').match(GROUP_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
};

const buildQrUrl = ({ amount, paymentCode }) => {
  const { BANK_CODE, ACCOUNT_NUMBER, ACCOUNT_HOLDER_NAME } = env;
  if (!BANK_CODE || !ACCOUNT_NUMBER || !ACCOUNT_HOLDER_NAME) {
    return null;
  }
  return (
    `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT_NUMBER}-compact2.png` +
    `?amount=${Math.round(Number(amount))}&addInfo=${paymentCode}&accountName=${encodeURIComponent(ACCOUNT_HOLDER_NAME)}`
  );
};

const loadCodeGroup = async (businessCd) => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name')
    .eq('business_cd', businessCd);
  if (error) throw createError(`Không thể tải mã hệ thống (${businessCd}): ${error.message}`);

  const byCode = new Map();
  const byName = new Map();
  (data || []).forEach((row) => {
    const name = String(row.code_name || '').trim().toUpperCase();
    const cd = String(row.code_cd || '').trim();
    byCode.set(cd, name);
    byName.set(name, cd);
  });
  return {
    nameOf: (cd) => byCode.get(String(cd || '').trim()) || String(cd || '').toUpperCase(),
    cdOf: (name) => byName.get(String(name || '').toUpperCase()),
  };
};

/**
 * Chia đều tổng tiền cho `memberCount` thành viên (làm tròn số nguyên VND, phần dư dồn vào Trưởng nhóm).
 */
const computeEqualSplit = (totalAmount, memberCount, hostName = 'Trưởng nhóm') => {
  const total = Math.round(Number(totalAmount));
  const count = Number(memberCount);
  if (!Number.isInteger(count) || count < MIN_MEMBERS || count > MAX_MEMBERS) {
    throw createError(`Số lượng thành viên nhóm phải từ ${MIN_MEMBERS} đến ${MAX_MEMBERS} người.`, 400, 'INVALID_MEMBER_COUNT');
  }
  const baseShare = Math.floor(total / count);
  const remainder = total - baseShare * count;
  if (baseShare < MIN_MEMBER_AMOUNT) {
    throw createError(
      `Số tiền mỗi thành viên phải tối thiểu ${MIN_MEMBER_AMOUNT.toLocaleString('vi-VN')} VND.`,
      400,
      'MIN_AMOUNT_VIOLATION'
    );
  }

  return Array.from({ length: count }, (_, idx) => ({
    member_name: idx === 0 ? hostName : `Thành viên ${idx + 1}`,
    member_phone: null,
    amount_allocated: idx === 0 ? baseShare + remainder : baseShare,
    is_host: idx === 0,
  }));
};

/**
 * Kiểm tra tính hợp lệ của danh sách phân bổ thành viên.
 */
const validateAndNormalizeMembers = ({ members, memberCount, totalRequired, hostUser }) => {
  const total = Math.round(Number(totalRequired));
  const hostDisplayName = String(hostUser?.full_name || 'Trưởng nhóm').trim() || 'Trưởng nhóm';

  let list = members;
  if (!Array.isArray(list) || list.length === 0) {
    list = computeEqualSplit(total, Number(memberCount || 2), hostDisplayName);
  }

  if (list.length < MIN_MEMBERS || list.length > MAX_MEMBERS) {
    throw createError(
      `Nhóm thanh toán cần từ ${MIN_MEMBERS} đến ${MAX_MEMBERS} thành viên.`,
      400,
      'INVALID_MEMBER_COUNT'
    );
  }

  let sum = 0;
  const normalized = list.map((item, idx) => {
    const amount = Number(item?.amount_allocated ?? item?.amount_assigned);
    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw createError(`Số tiền của thành viên thứ ${idx + 1} phải là số nguyên VND.`, 400, 'INVALID_MEMBER_AMOUNT');
    }
    if (amount < MIN_MEMBER_AMOUNT) {
      throw createError(
        `Mỗi thành viên phải đóng tối thiểu ${MIN_MEMBER_AMOUNT.toLocaleString('vi-VN')} VND.`,
        400,
        'MIN_AMOUNT_VIOLATION'
      );
    }
    const rawName = String(item?.member_name || '').trim();
    const name = rawName || (idx === 0 ? hostDisplayName : `Thành viên ${idx + 1}`);
    if (name.length > 100) {
      throw createError(`Tên thành viên thứ ${idx + 1} quá dài (tối đa 100 ký tự).`, 400);
    }
    const rawPhoneVal = item?.member_phone ?? item?.phone;
    const rawPhone = rawPhoneVal != null ? String(rawPhoneVal).trim() : '';
    if (rawPhone && !/^[0-9+\-\s()]{7,20}$/.test(rawPhone)) {
      throw createError(`Số điện thoại của "${name}" không hợp lệ.`, 400);
    }

    sum += amount;
    return {
      member_name: name,
      member_phone: rawPhone || null,
      amount_allocated: amount,
      is_host: idx === 0,
      user_id: idx === 0 ? hostUser?.user_id || null : null,
    };
  });

  if (sum !== total) {
    const diff = total - sum;
    throw createError(
      `Tổng tiền phân bổ (${sum.toLocaleString('vi-VN')} đ) chưa khớp với tổng tiền đơn hàng (${total.toLocaleString('vi-VN')} đ). ${
        diff > 0 ? `Còn thiếu ${diff.toLocaleString('vi-VN')} đ.` : `Đang dư ${Math.abs(diff).toLocaleString('vi-VN')} đ.`
      }`,
      400,
      'TOTAL_MISMATCH'
    );
  }

  return normalized;
};

const insertMembersWithUniqueCodes = async (groupId, normalizedMembers) => {
  const now = new Date().toISOString();
  const insertedMembers = [];

  for (const m of normalizedMembers) {
    let created = null;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !created; attempt += 1) {
      const code = generateGroupPaymentCode();
      const { data, error } = await supabase
        .from('t_payment_sharing_member')
        .insert({
          group_id: groupId,
          user_id: m.user_id,
          member_name: m.member_name,
          member_phone: m.member_phone,
          amount_allocated: m.amount_allocated,
          amount_paid: 0,
          payment_code: code,
          is_paid: false,
          paid_at: null,
          is_host: Boolean(m.is_host),
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (!error) {
        created = data;
        break;
      }
      if (error.code === '23505') continue;
      throw createError(`Không thể khởi tạo thành viên thanh toán nhóm: ${error.message}`);
    }
    if (!created) {
      throw createError('Không thể sinh mã thanh toán cho thành viên. Vui lòng thử lại.', 500);
    }
    insertedMembers.push(created);
  }

  return insertedMembers;
};

const formatGroupResponse = ({ group, booking, members, shareCodes, bookingCodes }) => {
  const shareStatusName = shareCodes.nameOf(group.share_status_cd);
  const bookingStatusName = booking ? bookingCodes.nameOf(booking.booking_status_cd) : 'PND';
  const remainingSeconds =
    shareStatusName === 'PND'
      ? getRemainingSecondsUntil(group.expires_at, group.created_at, GROUP_HOLD_MS)
      : 0;

  const isCompleted = shareStatusName === 'CMP' || bookingStatusName === 'CFM';
  const isExpired =
    !isCompleted &&
    (shareStatusName === 'EXP' ||
      shareStatusName === 'CAN' ||
      bookingStatusName === 'CAN' ||
      remainingSeconds <= 0);

  const totalRequired = Math.round(Number(group.total_required || 0));
  const totalCollected = Math.round(Number(group.total_collected || 0));
  const remainingAmount = Math.max(0, totalRequired - totalCollected);
  const progressPercent =
    totalRequired > 0 ? Math.min(100, Math.round((totalCollected / totalRequired) * 100)) : 0;

  const details = Array.isArray(booking?.t_booking_detail) ? booking.t_booking_detail : [];
  const firstDetail = details[0] || null;
  const paidMembersCount = (members || []).filter((m) => m.is_paid).length;
  const canEditSplit = !isCompleted && !isExpired && paidMembersCount === 0 && totalCollected === 0;

  return {
    group_id: group.group_id,
    booking_id: group.booking_id,
    booking_ref: String(group.booking_id || '').split('-')[0].toUpperCase(),
    booking_code: String(group.booking_id || '').split('-')[0].toUpperCase(),
    host_user_id: group.host_user_id || booking?.user_id || null,
    host_name: booking?.guest_name || '',
    guest_name: booking?.guest_name || '',
    invite_link_hash: group.invite_link_hash,
    share_status_cd: group.share_status_cd,
    status_code_name: shareStatusName,
    share_status_name: shareStatusName,
    booking_status_code_name: bookingStatusName,
    is_completed: isCompleted,
    is_expired: isExpired,
    can_edit_split: canEditSplit,
    total_required: totalRequired,
    total_collected: totalCollected,
    remaining_amount: remainingAmount,
    progress_percent: progressPercent,
    paid_members_count: paidMembersCount,
    total_members_count: (members || []).length,
    remaining_time_seconds: remainingSeconds,
    remaining_seconds: remainingSeconds,
    stay: {
      check_in_date: firstDetail?.check_in_date || null,
      check_out_date: firstDetail?.check_out_date || null,
    },
    expires_at: group.expires_at,
    created_at: group.created_at,
    bank_info: {
      bank_code: env.BANK_CODE || '',
      account_number: env.ACCOUNT_NUMBER || '',
      account_holder: env.ACCOUNT_HOLDER_NAME || '',
    },
    hotel: {
      hotel_id: booking?.hotel_id || null,
      name: booking?.m_hotel?.name || 'Khách sạn AVORA',
      address: booking?.m_hotel?.address || '',
      check_in_date: firstDetail?.check_in_date || null,
      check_out_date: firstDetail?.check_out_date || null,
      guest_name: booking?.guest_name || '',
    },
    members: (members || []).map((m) => ({
      member_id: m.member_id,
      group_id: m.group_id,
      user_id: m.user_id,
      member_name: m.member_name,
      member_phone: m.member_phone,
      phone: m.member_phone || null,
      amount_allocated: Math.round(Number(m.amount_allocated || 0)),
      amount_assigned: Math.round(Number(m.amount_allocated || 0)),
      amount_paid: Math.round(Number(m.amount_paid || 0)),
      payment_code: m.payment_code,
      is_paid: Boolean(m.is_paid),
      paid_at: m.paid_at,
      is_host: Boolean(m.is_host),
      qr_url:
        !m.is_paid && !isCompleted && !isExpired
          ? buildQrUrl({ amount: m.amount_allocated, paymentCode: m.payment_code })
          : null,
    })),
  };
};

/**
 * Tạo mới (hoặc cập nhật phân bổ nếu chưa có ai đóng tiền) một nhóm thanh toán cho booking.
 */
const createOrUpdateSharingGroup = async (bookingId, payload, currentUser) => {
  ensureClient();
  if (!env.BANK_CODE || !env.ACCOUNT_NUMBER || !env.ACCOUNT_HOLDER_NAME) {
    throw createError(
      'Hệ thống chưa cấu hình tài khoản ngân hàng nhận tiền (BANK_CODE / ACCOUNT_NUMBER / ACCOUNT_HOLDER_NAME).',
      503
    );
  }

  const [bookingRes, bookingCodes, shareCodes, payMethodCodes, hostUserRes] = await Promise.all([
    supabase
      .from('t_booking')
      .select(
        'booking_id, user_id, hotel_id, total_amount, guest_name, guest_phone, booking_status_cd, created_at, m_hotel(name, address), t_booking_detail(check_in_date, check_out_date, quantity), t_payment_transaction(transaction_id, amount_paid, paid_at)'
      )
      .eq('booking_id', bookingId)
      .maybeSingle(),
    loadCodeGroup('BOOKING_STS'),
    loadCodeGroup('SHARE_STS'),
    loadCodeGroup('PAYMENT_METHOD'),
    supabase
      .from('m_user')
      .select('user_id, full_name, email, phone')
      .eq('user_id', currentUser.user_id)
      .maybeSingle(),
  ]);

  if (bookingRes.error) throw createError(`Lỗi truy vấn đơn đặt phòng: ${bookingRes.error.message}`);
  const booking = bookingRes.data;
  if (!booking) throw createError('Không tìm thấy đơn đặt phòng.', 404);
  if (String(booking.user_id) !== String(currentUser?.user_id)) {
    throw createError('Chỉ người đặt phòng (Trưởng nhóm) mới có quyền thiết lập thanh toán nhóm.', 403);
  }

  const bookingStatus = bookingCodes.nameOf(booking.booking_status_cd);
  if (bookingStatus === 'CFM') {
    throw createError('Đơn đặt phòng này đã được thanh toán hoàn tất.', 409, 'ALREADY_PAID');
  }
  if (bookingStatus !== 'PND') {
    throw createError('Đơn đặt phòng không còn ở trạng thái chờ thanh toán.', 400, 'NOT_PENDING');
  }

  const hostUser = hostUserRes.data || {
    user_id: currentUser.user_id,
    full_name: booking.guest_name || 'Trưởng nhóm',
  };

  const normalizedMembers = validateAndNormalizeMembers({
    members: payload?.members,
    memberCount: payload?.member_count,
    totalRequired: booking.total_amount,
    hostUser,
  });

  // Kiểm tra xem booking đã có nhóm thanh toán chưa
  const { data: existingGroup, error: existingErr } = await supabase
    .from('t_payment_sharing_group')
    .select('*')
    .eq('booking_id', booking.booking_id)
    .maybeSingle();

  if (existingErr) throw createError(`Lỗi kiểm tra nhóm thanh toán: ${existingErr.message}`);

  if (existingGroup) {
    const { data: currentMembers, error: memErr } = await supabase
      .from('t_payment_sharing_member')
      .select('*')
      .eq('group_id', existingGroup.group_id);
    if (memErr) throw createError(`Lỗi tải danh sách thành viên: ${memErr.message}`);

    const anyPaid =
      Number(existingGroup.total_collected || 0) > 0 ||
      (currentMembers || []).some((m) => m.is_paid);
    if (anyPaid) {
      throw createError(
        'Đã có thành viên đóng tiền nên không thể sửa lại phân bổ. Bạn có thể dùng nút "Đóng nốt phần còn thiếu".',
        409,
        'CANNOT_EDIT_AFTER_PAYMENT'
      );
    }

    const groupStatusName = shareCodes.nameOf(existingGroup.share_status_cd);
    const remainingSec = getRemainingSecondsUntil(existingGroup.expires_at, existingGroup.created_at, GROUP_HOLD_MS);
    if (groupStatusName !== 'PND' || remainingSec <= 0) {
      throw createError('Nhóm thanh toán này đã hết hạn hoặc đã kết thúc.', 410, 'GROUP_EXPIRED');
    }

    const { error: delErr } = await supabase
      .from('t_payment_sharing_member')
      .delete()
      .eq('group_id', existingGroup.group_id)
      .eq('is_paid', false);
    if (delErr) throw createError(`Không thể cập nhật danh sách thành viên: ${delErr.message}`);

    const insertedMembers = await insertMembersWithUniqueCodes(existingGroup.group_id, normalizedMembers);
    return formatGroupResponse({
      group: existingGroup,
      booking,
      members: insertedMembers,
      shareCodes,
      bookingCodes,
    });
  }

  // Tạo nhóm mới: kiểm tra đơn lẻ chưa bị thanh toán và còn trong hạn
  const singleTxPaid = (booking.t_payment_transaction || []).some(
    (tx) => Number(tx.amount_paid) > 0 || Boolean(tx.paid_at)
  );
  if (singleTxPaid) {
    throw createError('Đơn đặt phòng này đã có giao dịch thanh toán.', 409, 'ALREADY_PAID');
  }

  const singleRemaining = getRemainingSecondsUntil(null, booking.created_at, SINGLE_HOLD_MS);
  if (singleRemaining <= 0) {
    throw createError('Đơn đặt phòng đã hết hạn chờ thanh toán.', 410, 'PAYMENT_EXPIRED');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + GROUP_HOLD_MS).toISOString();
  const sharePndCd = shareCodes.cdOf('PND') || '1';
  const btrCd = payMethodCodes.cdOf('BTR') || '1';

  let createdGroup = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !createdGroup; attempt += 1) {
    const inviteHash = generateInviteHash();
    const { data, error } = await supabase
      .from('t_payment_sharing_group')
      .insert({
        booking_id: booking.booking_id,
        host_user_id: currentUser.user_id,
        total_required: Math.round(Number(booking.total_amount)),
        total_collected: 0,
        share_status_cd: sharePndCd,
        payment_method_cd: btrCd,
        invite_link_hash: inviteHash,
        expires_at: expiresAt,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('*')
      .single();

    if (!error) {
      createdGroup = data;
      break;
    }
    if (error.code === '23505') continue;
    throw createError(`Không thể tạo nhóm thanh toán: ${error.message}`);
  }

  if (!createdGroup) {
    throw createError('Không thể tạo đường dẫn chia sẻ nhóm. Vui lòng thử lại.', 500);
  }

  const insertedMembers = await insertMembersWithUniqueCodes(createdGroup.group_id, normalizedMembers);

  return formatGroupResponse({
    group: createdGroup,
    booking,
    members: insertedMembers,
    shareCodes,
    bookingCodes,
  });
};

/**
 * Lấy thông tin nhóm theo invite_link_hash (Public - bạn bè mở link không cần đăng nhập).
 */
const getGroupByInviteHash = async (inviteHash) => {
  ensureClient();
  const cleanHash = String(inviteHash || '').trim();
  if (!cleanHash) throw createError('Đường dẫn nhóm thanh toán không hợp lệ.', 400);

  const { data: group, error: grpErr } = await supabase
    .from('t_payment_sharing_group')
    .select('*')
    .eq('invite_link_hash', cleanHash)
    .maybeSingle();

  if (grpErr) throw createError(`Lỗi truy vấn nhóm thanh toán: ${grpErr.message}`);
  if (!group) throw createError('Không tìm thấy nhóm thanh toán hoặc đường dẫn không tồn tại.', 404);

  const [bookingRes, membersRes, shareCodes, bookingCodes] = await Promise.all([
    supabase
      .from('t_booking')
      .select(
        'booking_id, user_id, hotel_id, total_amount, guest_name, guest_phone, booking_status_cd, created_at, m_hotel(name, address), t_booking_detail(check_in_date, check_out_date, quantity)'
      )
      .eq('booking_id', group.booking_id)
      .maybeSingle(),
    supabase
      .from('t_payment_sharing_member')
      .select('*')
      .eq('group_id', group.group_id)
      .order('is_host', { ascending: false })
      .order('created_at', { ascending: true }),
    loadCodeGroup('SHARE_STS'),
    loadCodeGroup('BOOKING_STS'),
  ]);

  if (bookingRes.error) throw createError(`Lỗi tải thông tin đơn đặt phòng: ${bookingRes.error.message}`);
  if (membersRes.error) throw createError(`Lỗi tải danh sách thành viên: ${membersRes.error.message}`);

  return formatGroupResponse({
    group,
    booking: bookingRes.data,
    members: membersRes.data || [],
    shareCodes,
    bookingCodes,
  });
};

/**
 * Lấy thông tin nhóm theo booking_id (Dành cho người đặt phòng).
 */
const getGroupByBookingId = async (bookingId, currentUser) => {
  ensureClient();
  const { data: booking, error: bErr } = await supabase
    .from('t_booking')
    .select('booking_id, user_id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (bErr) throw createError(`Lỗi truy vấn đơn đặt phòng: ${bErr.message}`);
  if (!booking) throw createError('Không tìm thấy đơn đặt phòng.', 404);
  if (String(booking.user_id) !== String(currentUser?.user_id)) {
    throw createError('Bạn không có quyền xem nhóm thanh toán của đơn này.', 403);
  }

  const { data: group, error: gErr } = await supabase
    .from('t_payment_sharing_group')
    .select('invite_link_hash')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (gErr) throw createError(`Lỗi kiểm tra nhóm thanh toán: ${gErr.message}`);
  if (!group) return null;

  return getGroupByInviteHash(group.invite_link_hash);
};

/**
 * Thành viên mở link mời cập nhật Tên + SĐT cho suất đóng tiền của mình và nhận mã QR.
 */
const claimMemberSlot = async (inviteHash, memberId, payload = {}) => {
  ensureClient();
  const { data: group, error: gErr } = await supabase
    .from('t_payment_sharing_group')
    .select('*')
    .eq('invite_link_hash', String(inviteHash || '').trim())
    .maybeSingle();

  if (gErr) throw createError(`Lỗi truy vấn nhóm thanh toán: ${gErr.message}`);
  if (!group) throw createError('Không tìm thấy nhóm thanh toán.', 404);

  const shareCodes = await loadCodeGroup('SHARE_STS');
  const statusName = shareCodes.nameOf(group.share_status_cd);
  const remainingSec = getRemainingSecondsUntil(group.expires_at, group.created_at, GROUP_HOLD_MS);

  if (statusName === 'CMP') {
    throw createError('Nhóm thanh toán này đã gom đủ 100% tiền.', 409, 'GROUP_COMPLETED');
  }
  if (statusName !== 'PND' || remainingSec <= 0) {
    throw createError('Nhóm thanh toán đã hết hạn.', 410, 'GROUP_EXPIRED');
  }

  const { data: member, error: mErr } = await supabase
    .from('t_payment_sharing_member')
    .select('*')
    .eq('member_id', memberId)
    .eq('group_id', group.group_id)
    .maybeSingle();

  if (mErr) throw createError(`Lỗi truy vấn suất thành viên: ${mErr.message}`);
  if (!member) throw createError('Không tìm thấy suất đóng tiền này trong nhóm.', 404);
  if (member.is_paid) {
    throw createError('Suất này đã được thanh toán.', 409, 'MEMBER_ALREADY_PAID');
  }

  const updates = { updated_at: new Date().toISOString() };
  if (payload.member_name !== undefined) {
    const cleanName = String(payload.member_name || '').trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      throw createError('Vui lòng nhập tên hiển thị hợp lệ (2–100 ký tự).', 400);
    }
    updates.member_name = cleanName;
  }
  const rawClaimPhone = payload.member_phone !== undefined ? payload.member_phone : payload.phone;
  if (rawClaimPhone !== undefined) {
    const cleanPhone = String(rawClaimPhone || '').trim();
    if (cleanPhone && !/^[0-9+\-\s()]{7,20}$/.test(cleanPhone)) {
      throw createError('Số điện thoại không hợp lệ.', 400);
    }
    updates.member_phone = cleanPhone || null;
  }

  const { data: updatedMember, error: uErr } = await supabase
    .from('t_payment_sharing_member')
    .update(updates)
    .eq('member_id', memberId)
    .eq('is_paid', false)
    .select('*')
    .maybeSingle();

  if (uErr) throw createError(`Không thể cập nhật thông tin thành viên: ${uErr.message}`);
  const finalMember = updatedMember || member;

  const updatedGroup = await getGroupByInviteHash(inviteHash);
  return {
    ...updatedGroup,
    claimed_member: {
      member_id: finalMember.member_id,
      group_id: finalMember.group_id,
      member_name: finalMember.member_name,
      member_phone: finalMember.member_phone,
      phone: finalMember.member_phone || null,
      amount_allocated: Math.round(Number(finalMember.amount_allocated)),
      amount_assigned: Math.round(Number(finalMember.amount_allocated)),
      payment_code: finalMember.payment_code,
      is_paid: Boolean(finalMember.is_paid),
      qr_url: buildQrUrl({
        amount: finalMember.amount_allocated,
        paymentCode: finalMember.payment_code,
      }),
    },
  };
};

/**
 * Trưởng nhóm bấm "Đóng nốt phần còn thiếu":
 * Gộp toàn bộ các suất chưa thanh toán thành 1 suất duy nhất có số tiền = remaining_amount để Trưởng nhóm quét 1 lần.
 */
const createHostPayRemaining = async (groupId, currentUser) => {
  ensureClient();
  const { data: group, error: gErr } = await supabase
    .from('t_payment_sharing_group')
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle();

  if (gErr) throw createError(`Lỗi truy vấn nhóm thanh toán: ${gErr.message}`);
  if (!group) throw createError('Không tìm thấy nhóm thanh toán.', 404);
  if (String(group.host_user_id) !== String(currentUser?.user_id)) {
    throw createError('Chỉ Trưởng nhóm mới có quyền thực hiện thao tác đóng nốt phần còn thiếu.', 403);
  }

  const shareCodes = await loadCodeGroup('SHARE_STS');
  const statusName = shareCodes.nameOf(group.share_status_cd);
  const remainingSec = getRemainingSecondsUntil(group.expires_at, group.created_at, GROUP_HOLD_MS);

  if (statusName === 'CMP') {
    throw createError('Nhóm đã gom đủ 100% tiền.', 409, 'GROUP_COMPLETED');
  }
  if (statusName !== 'PND' || remainingSec <= 0) {
    throw createError('Nhóm thanh toán đã hết hạn.', 410, 'GROUP_EXPIRED');
  }

  const { data: members, error: mErr } = await supabase
    .from('t_payment_sharing_member')
    .select('*')
    .eq('group_id', group.group_id)
    .order('is_host', { ascending: false })
    .order('created_at', { ascending: true });

  if (mErr) throw createError(`Lỗi tải danh sách thành viên: ${mErr.message}`);

  const unpaid = (members || []).filter((m) => !m.is_paid);
  const paid = (members || []).filter((m) => m.is_paid);
  const totalRequired = Math.round(Number(group.total_required || 0));
  const totalCollected = Math.round(Number(group.total_collected || 0));
  const remainingAmount = Math.max(0, totalRequired - totalCollected);

  if (unpaid.length === 0 || remainingAmount <= 0) {
    throw createError('Không còn khoản thiếu nào cần đóng.', 409, 'GROUP_COMPLETED');
  }

  let targetSlot = unpaid[0];
  if (unpaid.length > 1 || Math.round(Number(targetSlot.amount_allocated)) !== remainingAmount) {
    const { data: hostUser } = await supabase
      .from('m_user')
      .select('full_name, phone')
      .eq('user_id', currentUser.user_id)
      .maybeSingle();

    const hostLabel = `${hostUser?.full_name || 'Trưởng nhóm'} (Đóng nốt phần còn thiếu)`;

    // Xóa các suất chưa đóng và tạo 1 suất gộp duy nhất cho phần còn lại
    const { error: delErr } = await supabase
      .from('t_payment_sharing_member')
      .delete()
      .eq('group_id', group.group_id)
      .eq('is_paid', false);

    if (delErr) throw createError(`Không thể gộp các suất còn thiếu: ${delErr.message}`);

    const [inserted] = await insertMembersWithUniqueCodes(group.group_id, [
      {
        user_id: currentUser.user_id,
        member_name: hostLabel,
        member_phone: hostUser?.phone || null,
        amount_allocated: remainingAmount,
        is_host: !paid.some((m) => m.is_host),
      },
    ]);
    targetSlot = inserted;
  }

  const updatedGroup = await getGroupByInviteHash(group.invite_link_hash);
  const activeMember =
    updatedGroup.members.find((m) => m.member_id === targetSlot.member_id) ||
    updatedGroup.members.find((m) => !m.is_paid);

  return {
    group: updatedGroup,
    pay_slot: activeMember,
    remaining_slot: activeMember,
  };
};

/**
 * Xử lý webhook SePay cho giao dịch tiền vào mang mã AVRGPxxxxxxxx.
 */
const processGroupWebhook = async (paymentCode, transferAmount) => {
  ensureClient();
  const { data, error } = await supabase.rpc('fn_process_sepay_group_payment', {
    p_payment_code: paymentCode,
    p_transfer_amount: transferAmount,
  });
  if (error) throw createError(`Lỗi xử lý thanh toán nhóm: ${error.message}`);
  return { ...(data || {}), payment_code: paymentCode };
};

module.exports = {
  GROUP_HOLD_MS,
  GROUP_CODE_PREFIX,
  GROUP_CODE_REGEX,
  MIN_MEMBERS,
  MAX_MEMBERS,
  MIN_MEMBER_AMOUNT,
  computeEqualSplit,
  extractGroupPaymentCode,
  createOrUpdateSharingGroup,
  getGroupByInviteHash,
  getGroupByBookingId,
  claimMemberSlot,
  createHostPayRemaining,
  processGroupWebhook,
};
