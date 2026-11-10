'use strict';

const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const sharp = require('sharp');
const supabase = require('../../config/supabaseClient');
const { processChat } = require('../chatbot/chatbot.service');
const { formatBookingCode } = require('../bookings/booking.service');
const { codeNameParser } = require('../../utils/codeNameParser');

const BUCKET = 'support_ticket_attachments';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TICKET_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const CUSTOMER_CATEGORIES = new Set(['PWC', 'PWA', 'PTO', 'RFD', 'BKI', 'GEN']);
const VENDOR_CATEGORIES = new Set(['VBU', 'VIU', 'VPO']);
const BOOKING_LINK_CATEGORIES = new Set(['PWC', 'PWA', 'PTO', 'RFD', 'BKI']);
const SUPPORT_CATEGORY_LABELS = {
  PWC: 'Chuyển khoản sai nội dung',
  PWA: 'Thanh toán sai số tiền',
  PTO: 'Thanh toán quá hạn / chưa ghi nhận',
  RFD: 'Yêu cầu hoàn tiền',
  BKI: 'Vấn đề đơn đặt phòng',
  VBU: 'Cập nhật tài khoản ngân hàng',
  VIU: 'Cập nhật thông tin nhà cung cấp / khách sạn',
  VPO: 'Chính sách và hoa hồng',
  GEN: 'Khác',
};
const ticketEvents = new EventEmitter();
ticketEvents.setMaxListeners(0);
let bookingLinkTableWarningLogged = false;

const createError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const isMissingBookingLinkTable = (error) => ['42P01', 'PGRST205'].includes(error?.code);
const logMissingBookingLinkTable = () => {
  if (bookingLinkTableWarningLogged) return;
  bookingLinkTableWarningLogged = true;
  console.warn('[SUPPORT] Multiple booking links are unavailable until the support booking migration is applied.');
};
const getCategoryLabel = (code) => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  return SUPPORT_CATEGORY_LABELS[normalizedCode] || 'Khác';
};
const normalizeRole = (user) => String(user?.role_code_name || '').trim().toUpperCase();
const isAdmin = (user) => normalizeRole(user) === 'ADM';
const isRequesterRole = (user) => ['CUS', 'VEN', 'BMR'].includes(normalizeRole(user));
const isVendorRole = (user) => normalizeRole(user) === 'VEN';
const parseJsonArray = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const ticketEmitter = (ticketId) => `ticket:${ticketId}`;

const loadCategories = async () => {
  const { data, error } = await supabase
    .from('m_system_code')
    .select('code_cd, code_name, sort_no')
    .eq('business_cd', 'SUPPORT_CAT')
    .order('sort_no', { ascending: true });
  if (error) throw error;
  return (data || []).map((category) => ({
    code: String(category.code_name).trim().toUpperCase(),
    code_cd: String(category.code_cd),
    sort_no: Number(category.sort_no || 0),
    label: getCategoryLabel(category.code_name),
    group: categoryGroup(category),
  }));
};

const categoryGroup = (category) => {
  const code = String(category.code_name || '').trim().toUpperCase();
  if (CUSTOMER_CATEGORIES.has(code)) return 'customer';
  if (VENDOR_CATEGORIES.has(code)) return 'vendor';
  if (code.startsWith('CUS_') || Number(category.sort_no) >= 10000 && Number(category.sort_no) < 20000) return 'customer';
  if (code.startsWith('VEN_') || Number(category.sort_no) >= 20000) return 'vendor';
  if (code === 'GEN') return 'both';
  return 'customer';
};

const assertCategoryAllowed = (category, user) => {
  const group = category.group;
  if (group === 'vendor' && !isVendorRole(user)) {
    throw createError(403, 'Danh mục này chỉ dành cho Nhà cung cấp.');
  }
  if (group === 'customer' && !['CUS', 'VEN', 'BMR'].includes(normalizeRole(user))) {
    throw createError(403, 'Bạn không có quyền sử dụng danh mục này.');
  }
  if (group === 'both' && !isRequesterRole(user)) {
    throw createError(403, 'Bạn không có quyền sử dụng danh mục này.');
  }
};

const getCategoryByCode = async (code) => {
  const categories = await loadCategories();
  const category = categories.find((item) => item.code === String(code || '').trim().toUpperCase());
  if (!category) throw createError(400, 'Danh mục hỗ trợ không hợp lệ.');
  return category;
};

const isCategoryInGroup = (category, group) => (
  group === 'all' || category.group === group || category.group === 'both'
);

const assertTicketGroup = (ticket, group, user) => {
  if (!group || group === 'all') return;
  const category = { code_name: ticket.ticket_type_cd };
  if (!isCategoryInGroup({ ...category, group: categoryGroup(category) }, group)) {
    throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  }
  if (isAdmin(user) && group === 'customer' && String(ticket.requester_id) !== String(user.user_id)) {
    throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  }
};

const toAttachmentDto = (ticketId, attachment) => ({
  key: attachment.key,
  name: attachment.name,
  mime_type: 'image/webp',
  size: Number(attachment.size || 0),
  url: `/api/support/tickets/${ticketId}/attachments/${attachment.key}`,
});

const shapeTicket = (ticket, replies = [], requester = null, assigned = null, viewer = null, bookingRecords = []) => {
  const publicReplies = isAdmin(viewer) ? replies : replies.filter((reply) => !reply.is_internal_note);
  const lastPublic = [...replies].reverse().find((reply) => !reply.is_internal_note);
  const status = String(ticket.ticket_status_cd || '').trim().toUpperCase();
  const viewerIsAdmin = isAdmin(viewer);
  const unread = status !== 'CLS' && (viewerIsAdmin
    ? String(ticket.assigned_to || '') === String(viewer?.user_id || '')
      && (lastPublic?.sender_role && lastPublic.sender_role !== 'ADM'
        || status === 'RSV' && Boolean(ticket.resolved_at))
    : status === 'WAT'
      && lastPublic?.sender_role === 'ADM');

  const bookings = [...bookingRecords];
  if (ticket.booking_id && !bookings.some((booking) => String(booking.booking_id) === String(ticket.booking_id))) {
    bookings.unshift({ booking_id: ticket.booking_id, booking_code: null, hotel_name: null });
  }

  return {
    ticket_id: ticket.ticket_id,
    requester_id: ticket.requester_id,
    requester: viewerIsAdmin && requester ? {
      user_id: requester.user_id,
      full_name: requester.full_name || requester.email || 'Người dùng',
      email: requester.email || '',
      avatar_url: requester.avatar_url || null,
    } : undefined,
    group: categoryGroup({ code_name: ticket.ticket_type_cd }),
    ticket_type_cd: ticket.ticket_type_cd,
    category_label: getCategoryLabel(ticket.ticket_type_cd),
    ticket_status_cd: status,
    priority_cd: ticket.priority_cd || 'MEDIUM',
    title: ticket.title,
    description: ticket.description,
    hotel_id: ticket.hotel_id || null,
    hotel_name: ticket.hotel_name || null,
    booking_id: ticket.booking_id || null,
    booking_ids: [...new Set(bookings.map((booking) => booking.booking_id))],
    bookings,
    attachment_urls: parseJsonArray(ticket.attachment_urls).map((file) => toAttachmentDto(ticket.ticket_id, file)),
    assigned_to: ticket.assigned_to || null,
    assigned_admin: assigned ? {
      label: categoryGroup({ code_name: ticket.ticket_type_cd }) !== 'vendor'
        ? 'Admin'
        : assigned.full_name || 'Admin',
    } : null,
    resolution_note: ticket.resolution_note || null,
    resolved_at: ticket.resolved_at || null,
    is_deleted: Boolean(ticket.is_deleted),
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    unread,
    replies: publicReplies.map((reply) => ({
      reply_id: reply.reply_id,
      sender_id: reply.sender_id,
      sender_role: reply.sender_role,
      sender_name: reply.sender_role === 'ADM' && !isAdmin(viewer)
        ? (categoryGroup({ code_name: ticket.ticket_type_cd }) !== 'vendor' ? 'Admin' : reply.sender_name || 'Admin')
        : reply.sender_name || 'Admin',
      sender_avatar_url: isAdmin(viewer) ? reply.sender_avatar_url : null,
      message: reply.message,
      is_internal_note: Boolean(reply.is_internal_note),
      attachment_urls: parseJsonArray(reply.attachment_urls).map((file) => toAttachmentDto(ticket.ticket_id, file)),
      created_at: reply.created_at,
    })),
  };
};

const getTicketRow = async (ticketId) => {
  const { data: ticket, error } = await supabase
    .from('t_support_ticket')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  return ticket;
};

const assertTicketAccess = async (ticket, user) => {
  if (isAdmin(user)) return;
  if (!isRequesterRole(user) || String(ticket.requester_id) !== String(user.user_id)) {
    throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  }
};

const getAttachmentTotal = async (ticket) => {
  const { data: replies, error } = await supabase
    .from('t_support_ticket_reply')
    .select('attachment_urls')
    .eq('ticket_id', ticket.ticket_id);
  if (error) throw error;
  return [
    ...parseJsonArray(ticket.attachment_urls),
    ...(replies || []).flatMap((reply) => parseJsonArray(reply.attachment_urls)),
  ].reduce((sum, item) => sum + Number(item.size || 0), 0);
};

const sanitizeImage = async (file) => {
  if (!file?.buffer || !file.buffer.length) throw createError(400, 'Tệp ảnh không hợp lệ.');
  if (file.buffer.length > MAX_FILE_BYTES) throw createError(413, 'Mỗi ảnh không được vượt quá 2 MB.');
  let metadata;
  let output;
  try {
    const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 40000000 });
    metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw createError(415, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP hợp lệ (không hỗ trợ GIF).');
    }
    if (!metadata.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000) {
      throw createError(400, 'Kích thước ảnh không hợp lệ.');
    }
    output = await sharp(file.buffer, { failOn: 'error', limitInputPixels: 40000000 })
      .rotate()
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(415, 'Tệp tải lên không phải ảnh hợp lệ hoặc ảnh bị lỗi.');
  }
  if (!output.length || output.length > MAX_FILE_BYTES) {
    throw createError(413, 'Ảnh sau khi xử lý không được vượt quá 2 MB.');
  }
  const originalName = String(file.originalname || 'image').replace(/[\\/]/g, '_').slice(0, 120);
  return {
    buffer: output,
    metadata: {
      key: randomUUID(),
      name: originalName,
      size: output.length,
    },
  };
};

const uploadAttachments = async (ticketId, files, currentBytes = 0) => {
  if (!Array.isArray(files) || !files.length) return [];
  const sanitized = [];
  for (const file of files) sanitized.push(await sanitizeImage(file));
  const nextTotal = currentBytes + sanitized.reduce((sum, item) => sum + item.metadata.size, 0);
  if (nextTotal > MAX_TICKET_ATTACHMENT_BYTES) {
    throw createError(413, 'Tổng dung lượng ảnh của một phiếu không được vượt quá 6 MB.');
  }
  const uploaded = [];
  try {
    for (const item of sanitized) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${ticketId}/${item.metadata.key}`, item.buffer, {
          contentType: 'image/webp',
          upsert: false,
        });
      if (error) throw error;
      uploaded.push(item.metadata);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET)
        .remove(uploaded.map((item) => `${ticketId}/${item.key}`));
      if (cleanupError) console.error(`[SUPPORT] Attachment rollback failed: ${cleanupError.message}`);
    }
    throw error;
  }
};

const removeUploadedFiles = async (ticketId, files) => {
  if (!files.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(files.map((file) => `${ticketId}/${file.key}`));
  if (error) console.error(`[SUPPORT] Attachment cleanup failed: ${error.message}`);
};

const getUsersById = async (ids) => {
  const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase
    .from('m_user')
    .select('user_id, full_name, email, avatar_url, role_cd')
    .in('user_id', uniqueIds);
  if (error) throw error;
  const roleCodes = [...new Set((data || []).map((user) => user.role_cd).filter(Boolean).map(String))];
  const { data: roleRows, error: roleError } = roleCodes.length
    ? await supabase.from('m_system_code').select('code_cd, code_name').eq('business_cd', 'USER_ROLE').in('code_cd', roleCodes)
    : { data: [], error: null };
  if (roleError) throw roleError;
  const roleByCode = new Map((roleRows || []).map((row) => [String(row.code_cd), String(row.code_name || '').toUpperCase()]));
  return new Map((data || []).map((user) => [String(user.user_id), {
    ...user,
    role_code_name: roleByCode.get(String(user.role_cd)) || '',
  }]));
};

const getHotelNamesById = async (tickets) => {
  const hotelIds = [...new Set(tickets.map((ticket) => ticket.hotel_id).filter(Boolean).map(String))];
  if (!hotelIds.length) return new Map();
  const { data, error } = await supabase
    .from('m_hotel')
    .select('hotel_id, name')
    .in('hotel_id', hotelIds);
  if (error) throw error;
  return new Map((data || []).map((hotel) => [String(hotel.hotel_id), hotel.name]));
};

const getReplies = async (ticketId) => {
  const { data, error } = await supabase
    .from('t_support_ticket_reply')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const userMap = await getUsersById((data || []).map((reply) => reply.sender_id));
  return (data || []).map((reply) => ({
    ...reply,
    sender_role: String(userMap.get(String(reply.sender_id))?.role_code_name || '').toUpperCase(),
    sender_name: userMap.get(String(reply.sender_id))?.full_name || '',
    sender_avatar_url: userMap.get(String(reply.sender_id))?.avatar_url || null,
  }));
};

const getTicketBookingIds = async (tickets) => {
  const ticketIds = tickets.map((ticket) => ticket.ticket_id);
  if (!ticketIds.length) return new Map();
  const { data, error } = await supabase
    .from('t_support_ticket_booking')
    .select('ticket_id, booking_id, booking:t_booking(booking_id, created_at, hotel:m_hotel(name))')
    .in('ticket_id', ticketIds);
  const bookingIdsByTicket = new Map(ticketIds.map((ticketId) => [String(ticketId), []]));
  if (error && isMissingBookingLinkTable(error)) {
    logMissingBookingLinkTable();
    return bookingIdsByTicket;
  }
  if (error) throw error;
  (data || []).forEach((row) => {
    const { ticket_id: ticketId, booking_id: bookingId, booking } = row;
    const bookings = bookingIdsByTicket.get(String(ticketId));
    if (bookings && !bookings.some((booking) => String(booking.booking_id) === String(bookingId))) {
      bookings.push({
        booking_id: bookingId,
        booking_code: booking?.created_at ? formatBookingCode(bookingId, booking.created_at) : null,
        hotel_name: booking?.hotel?.name || null,
      });
    }
  });
  return bookingIdsByTicket;
};

const withTicketDetails = async (ticket, user) => {
  const [replies, users, bookingIdsByTicket, hotelNames] = await Promise.all([
    getReplies(ticket.ticket_id),
    getUsersById([ticket.requester_id, ticket.assigned_to]),
    getTicketBookingIds([ticket]),
    getHotelNamesById([ticket]),
  ]);
  return shapeTicket(
    { ...ticket, hotel_name: hotelNames.get(String(ticket.hotel_id)) || null },
    replies,
    users.get(String(ticket.requester_id)),
    users.get(String(ticket.assigned_to)),
    user,
    bookingIdsByTicket.get(String(ticket.ticket_id)) || []
  );
};

const listCategories = async (user, group = 'all') => {
  const categories = await loadCategories();
  return categories.filter((category) => (
    (isAdmin(user) || (() => {
      try {
        assertCategoryAllowed(category, user);
        return true;
      } catch {
        return false;
      }
    })())
    && isCategoryInGroup(category, group)
  ));
};

const listTickets = async (user, query) => {
  if (query.from && query.to && query.from > query.to) {
    throw createError(400, 'Ngày bắt đầu không được sau ngày kết thúc.');
  }
  const admin = isAdmin(user);
  const requesterView = !admin || query.group === 'customer';
  let request = supabase.from('t_support_ticket').select('*', { count: 'exact' }).eq('is_deleted', false);
  if (requesterView) request = request.eq('requester_id', user.user_id);
  if (query.group !== 'all') {
    const categories = await loadCategories();
    const codes = categories.filter((category) => isCategoryInGroup(category, query.group))
      .map((category) => category.code);
    if (!codes.length) return { items: [], pagination: { page: query.page, limit: query.limit, total: 0, total_pages: 0 } };
    request = request.in('ticket_type_cd', codes);
  }
  if (query.category) {
    const category = await getCategoryByCode(query.category);
    if (!isCategoryInGroup(category, query.group)) {
      throw createError(404, 'Không tìm thấy danh mục hỗ trợ.');
    }
    if (!admin) assertCategoryAllowed(category, user);
    request = request.eq('ticket_type_cd', category.code);
  }
  if (query.status) request = request.eq('ticket_status_cd', query.status.toUpperCase());
  if (query.q) request = request.ilike('title', `%${query.q.replace(/[%_,]/g, '')}%`);
  if (query.from) request = request.gte('created_at', `${query.from}T00:00:00.000Z`);
  if (query.to) request = request.lte('created_at', `${query.to}T23:59:59.999Z`);
  if (admin && !requesterView && query.assigned === 'mine') request = request.eq('assigned_to', user.user_id);
  if (admin && !requesterView && query.assigned === 'unassigned') request = request.is('assigned_to', null).eq('ticket_status_cd', 'OPN');
  const start = (query.page - 1) * query.limit;
  request = request.order('updated_at', { ascending: false }).range(start, start + query.limit - 1);

  const { data, error, count } = await request;
  if (error) throw error;
  const tickets = data || [];
  const [allReplies, bookingIdsByTicket] = await Promise.all([
    Promise.all(tickets.map((ticket) => getReplies(ticket.ticket_id))),
    getTicketBookingIds(tickets),
  ]);
  const [users, hotelNames] = await Promise.all([
    getUsersById(tickets.flatMap((ticket) => [ticket.requester_id, ticket.assigned_to])),
    getHotelNamesById(tickets),
  ]);
  const items = tickets.map((ticket, index) => shapeTicket(
    { ...ticket, hotel_name: hotelNames.get(String(ticket.hotel_id)) || null },
    allReplies[index],
    users.get(String(ticket.requester_id)),
    users.get(String(ticket.assigned_to)),
    user,
    bookingIdsByTicket.get(String(ticket.ticket_id)) || []
  ));
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / query.limit),
    },
  };
};

const createTicket = async (user, input, files) => {
  if (!isRequesterRole(user)) throw createError(403, 'Bạn không có quyền tạo phiếu hỗ trợ.');
  const category = await getCategoryByCode(input.ticket_type_cd);
  assertCategoryAllowed(category, user);
  if (input.support_group === 'vendor' && !isVendorRole(user)) {
    throw createError(403, 'Chỉ Nhà cung cấp mới có thể tạo yêu cầu hỗ trợ trong trang quản lý.');
  }
  if (!isCategoryInGroup(category, input.support_group)) {
    throw createError(403, 'Danh mục này không thuộc nhóm hỗ trợ đang mở.');
  }
  if (input.priority_cd === 'URGENT' && category.group !== 'vendor') {
    throw createError(400, 'Mức ưu tiên Khẩn cấp chỉ dành cho phiếu hỗ trợ Nhà cung cấp.');
  }
  const priority = category.group === 'vendor' ? input.priority_cd || 'MEDIUM' : 'MEDIUM';
  let bankName = '';
  if (category.code === 'VBU') {
    if (!input.hotel_id || !input.bank_cd || !input.bank_account_number?.trim()) {
      throw createError(400, 'Vui lòng chọn khách sạn, ngân hàng và nhập số tài khoản ngân hàng muốn thay đổi.');
    }
    const { data: bank, error } = await supabase
      .from('m_system_code')
      .select('code_cd, code_name')
      .eq('business_cd', 'BANK_CD')
      .eq('code_cd', input.bank_cd)
      .maybeSingle();
    if (error) throw error;
    if (!bank) throw createError(400, 'Ngân hàng được chọn không hợp lệ.');
    bankName = codeNameParser(bank.code_name);
  }
  if (input.hotel_id) {
    if (!isVendorRole(user) || category.group !== 'vendor') {
      throw createError(400, 'Chỉ phiếu hỗ trợ Nhà cung cấp mới được liên kết khách sạn.');
    }
    const { data: hotel, error } = await supabase
      .from('m_hotel')
      .select('hotel_id')
      .eq('hotel_id', input.hotel_id)
      .eq('owner_id', user.user_id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;
    if (!hotel) throw createError(404, 'Không tìm thấy khách sạn thuộc quyền quản lý của bạn.');
  }
  const bookingIds = [...new Set([...(input.booking_ids || []), ...(input.booking_id ? [input.booking_id] : [])])];
  if (bookingIds.length && !BOOKING_LINK_CATEGORIES.has(category.code)) {
    throw createError(400, 'Danh mục này không hỗ trợ liên kết đơn đặt phòng.');
  }
  if (bookingIds.length) {
    const { data: booking, error } = await supabase
      .from('t_booking')
      .select('booking_id, user_id')
      .in('booking_id', bookingIds);
    if (error) throw error;
    if ((booking || []).length !== bookingIds.length) throw createError(404, 'Không tìm thấy đơn đặt phòng.');
    if ((booking || []).some((item) => String(item.user_id) !== String(user.user_id))) {
      throw createError(403, 'Bạn chỉ có thể liên kết đơn đặt phòng của chính mình.');
    }
  }

  const description = category.code === 'VBU'
    ? `Ngân hàng muốn thay đổi:\n${bankName}\n\nNội dung muốn thay đổi:\n${input.description}\n\nSố tài khoản ngân hàng muốn thay đổi:\n${input.bank_account_number.trim()}`
    : input.description;
  const descriptionWordCount = (description.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || []).length;
  if (descriptionWordCount > 500) throw createError(400, 'Mô tả không được vượt quá 500 từ.');

  const ticketId = randomUUID();
  const attachments = await uploadAttachments(ticketId, files);
  let insertedTicketId = null;
  try {
    const { data, error } = await supabase.from('t_support_ticket').insert({
      ticket_id: ticketId,
      requester_id: user.user_id,
      hotel_id: input.hotel_id || null,
      booking_id: bookingIds[0] || null,
      ticket_type_cd: category.code,
      ticket_status_cd: 'OPN',
      priority_cd: priority,
      title: input.title,
      description,
      attachment_urls: attachments,
      is_deleted: false,
    }).select('*').single();
    if (error) throw error;
    insertedTicketId = data.ticket_id;
    if (bookingIds.length) {
      const { error: bookingLinkError } = await supabase
        .from('t_support_ticket_booking')
        .insert(bookingIds.map((bookingId) => ({ ticket_id: ticketId, booking_id: bookingId })));
      if (bookingLinkError && isMissingBookingLinkTable(bookingLinkError)) {
        logMissingBookingLinkTable();
        if (bookingIds.length > 1) {
          throw createError(503, 'Liên kết nhiều đơn đặt phòng chưa khả dụng. Vui lòng áp dụng bản cập nhật cơ sở dữ liệu trước khi sử dụng tính năng này.');
        }
      } else if (bookingLinkError) {
        throw bookingLinkError;
      }
    }
    ticketEvents.emit(ticketEmitter(ticketId));
    return await withTicketDetails(data, user);
  } catch (error) {
    if (insertedTicketId) {
      const { error: rollbackError } = await supabase.from('t_support_ticket').delete().eq('ticket_id', ticketId);
      if (rollbackError) console.error(`[SUPPORT] Ticket rollback failed: ${rollbackError.message}`);
    }
    await removeUploadedFiles(ticketId, attachments);
    throw error;
  }
};

const getTicket = async (ticketId, user, group = 'all') => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  assertTicketGroup(ticket, group, user);
  return withTicketDetails(ticket, user);
};

const claimTicket = async (ticketId, user) => {
  if (!isAdmin(user)) throw createError(403, 'Chỉ Quản trị viên mới có thể nhận phiếu hỗ trợ.');
  const ticket = await getTicketRow(ticketId);
  if (ticket.ticket_status_cd !== 'OPN' || ticket.assigned_to) {
    throw createError(409, 'Phiếu hỗ trợ này đã được một Quản trị viên nhận xử lý.');
  }
  const { data, error } = await supabase
    .from('t_support_ticket')
    .update({ assigned_to: user.user_id, ticket_status_cd: 'INP', updated_at: now() })
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .eq('ticket_status_cd', 'OPN')
    .is('assigned_to', null)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw createError(409, 'Phiếu hỗ trợ vừa được một Quản trị viên khác nhận.');
  ticketEvents.emit(ticketEmitter(ticketId));
  return withTicketDetails(data, user);
};

const createReply = async (ticketId, user, input, files) => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  if (ticket.ticket_status_cd === 'CLS') throw createError(409, 'Phiếu đã đóng; không thể gửi thêm tin nhắn.');
  if (isAdmin(user) && !ticket.assigned_to) {
    throw createError(409, 'Nhận xử lý phiếu trước khi gửi tin nhắn.');
  }
  if (input.is_internal_note && !isAdmin(user)) {
    throw createError(403, 'Chỉ Quản trị viên mới có thể gửi ghi chú nội bộ.');
  }
  const existingBytes = await getAttachmentTotal(ticket);
  const attachments = await uploadAttachments(ticketId, files, existingBytes);
  let insertedReplyId = null;
  try {
    const { data: reply, error } = await supabase.from('t_support_ticket_reply').insert({
      ticket_id: ticketId,
      sender_id: user.user_id,
      message: input.message,
      attachment_urls: attachments,
      is_internal_note: Boolean(input.is_internal_note),
    }).select('*').single();
    if (error) throw error;
    insertedReplyId = reply.reply_id;
    let updatedTicket = ticket;
    if (!input.is_internal_note) {
      const isConfirmedResolved = ticket.ticket_status_cd === 'RSV' && Boolean(ticket.resolved_at);
      let nextStatus = ticket.ticket_status_cd;
      if (isConfirmedResolved) {
        nextStatus = 'RSV';
      } else if (isAdmin(user)) {
        nextStatus = 'WAT';
      } else if (ticket.ticket_status_cd === 'RSV' || ticket.ticket_status_cd === 'WAT') {
        nextStatus = 'INP';
      }
      let ticketUpdate = supabase.from('t_support_ticket')
        .update({
          ticket_status_cd: nextStatus,
          ...(!isConfirmedResolved && ticket.ticket_status_cd === 'RSV' ? { resolved_at: null, resolution_note: null } : {}),
          updated_at: now(),
        })
        .eq('ticket_id', ticketId)
        .eq('is_deleted', false)
        .eq('ticket_status_cd', ticket.ticket_status_cd);
      ticketUpdate = ticket.resolved_at
        ? ticketUpdate.eq('resolved_at', ticket.resolved_at)
        : ticketUpdate.is('resolved_at', null);
      const { data, error: updateError } = await ticketUpdate
        .select('*')
        .maybeSingle();
      if (updateError) throw updateError;
      updatedTicket = data || await getTicketRow(ticketId);
    }
    ticketEvents.emit(ticketEmitter(ticketId));
    const replies = await getReplies(ticketId);
    const [users, hotelNames] = await Promise.all([
      getUsersById([updatedTicket.requester_id, updatedTicket.assigned_to]),
      getHotelNamesById([updatedTicket]),
    ]);
    return shapeTicket(
      { ...updatedTicket, hotel_name: hotelNames.get(String(updatedTicket.hotel_id)) || null },
      replies,
      users.get(String(updatedTicket.requester_id)),
      users.get(String(updatedTicket.assigned_to)),
      user
    );
  } catch (error) {
    if (insertedReplyId) {
      const { error: rollbackError } = await supabase.from('t_support_ticket_reply')
        .delete()
        .eq('reply_id', insertedReplyId);
      if (rollbackError) console.error(`[SUPPORT] Reply rollback failed: ${rollbackError.message}`);
    }
    await removeUploadedFiles(ticketId, attachments);
    throw error;
  }
};

const updateTicketStatus = async (ticketId, user, input) => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  const admin = isAdmin(user);
  let updates;
  if (ticket.ticket_status_cd === 'RSV' && ticket.resolved_at && input.action !== 'close') {
    throw createError(409, 'Phiếu đã được xác nhận giải quyết; chỉ có thể đóng hoặc xóa phiếu.');
  }
  if (input.action === 'claim') return claimTicket(ticketId, user);
  if (input.action === 'request_resolution') {
    if (!admin) throw createError(403, 'Chỉ Quản trị viên mới có thể đề xuất giải quyết.');
    if (!ticket.assigned_to) throw createError(409, 'Nhận phiếu hỗ trợ trước khi đề xuất giải quyết.');
    if (String(ticket.assigned_to) !== String(user.user_id)) {
      throw createError(403, 'Chỉ Quản trị viên phụ trách mới có thể đề xuất giải quyết.');
    }
    updates = { ticket_status_cd: 'RSV', resolution_note: input.resolution_note, resolved_at: null };
  } else if (input.action === 'confirm_resolution') {
    if (admin) throw createError(403, 'Chỉ người tạo phiếu mới có thể xác nhận giải quyết.');
    if (ticket.ticket_status_cd !== 'RSV' || ticket.resolved_at) {
      throw createError(409, ticket.resolved_at
        ? 'Phiếu giải quyết đã được xác nhận.'
        : 'Phiếu chưa được đề xuất giải quyết.');
    }
    updates = { ticket_status_cd: 'RSV', resolved_at: now() };
  } else if (input.action === 'reject_resolution') {
    if (admin) throw createError(403, 'Chỉ người tạo phiếu mới có thể từ chối giải quyết.');
    if (ticket.ticket_status_cd !== 'RSV') throw createError(409, 'Phiếu chưa được đề xuất giải quyết.');
    updates = { ticket_status_cd: 'INP', resolved_at: null, resolution_note: null };
  } else if (input.action === 'close') {
    if (!admin) throw createError(403, 'Chỉ Quản trị viên mới có thể đóng phiếu.');
    if (String(ticket.assigned_to) !== String(user.user_id)) {
      throw createError(403, 'Chỉ Quản trị viên phụ trách mới có thể đóng phiếu.');
    }
    if (ticket.ticket_status_cd !== 'RSV' || !ticket.resolved_at) {
      throw createError(409, 'Người tạo phiếu phải xác nhận đã giải quyết trước khi đóng.');
    }
    updates = { ticket_status_cd: 'CLS' };
  } else {
    throw createError(400, 'Thao tác trạng thái không hợp lệ.');
  }
  let statusUpdate = supabase.from('t_support_ticket')
    .update({ ...updates, updated_at: now() })
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .eq('ticket_status_cd', ticket.ticket_status_cd);
  statusUpdate = ticket.resolved_at
    ? statusUpdate.eq('resolved_at', ticket.resolved_at)
    : statusUpdate.is('resolved_at', null);
  const { data, error } = await statusUpdate
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw createError(409, 'Trạng thái phiếu đã thay đổi. Vui lòng tải lại rồi thử lại.');
  ticketEvents.emit(ticketEmitter(ticketId));
  return withTicketDetails(data, user);
};

const softDeleteTicket = async (ticketId, user) => {
  const ticket = await getTicketRow(ticketId);
  const isAssignedAdmin = isAdmin(user) && String(ticket.assigned_to) === String(user.user_id);
  if (['RSV', 'CLS'].includes(ticket.ticket_status_cd) && !isAdmin(user)) {
    throw createError(403, 'Chỉ Quản trị viên.');
  }
  if (!isAdmin(user) && String(ticket.requester_id) !== String(user.user_id)) {
    throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  }
  if (isAdmin(user) && !isAssignedAdmin) {
    throw createError(403, 'Chỉ Quản trị viên đang phụ trách mới có thể xóa phiếu này.');
  }
  const { data: deletedTicket, error } = await supabase.from('t_support_ticket')
    .update({ is_deleted: true, updated_at: now() })
    .eq('ticket_id', ticketId)
    .eq('is_deleted', false)
    .select('ticket_id')
    .maybeSingle();
  if (error) throw error;
  if (!deletedTicket) throw createError(404, 'Không tìm thấy phiếu hỗ trợ.');
  const { error: auditError } = await supabase.from('h_system_audit_log').insert({
    actor_user_id: user.user_id,
    action_cd: '3',
    entity_name: 't_support_ticket',
    entity_id: ticketId,
    old_data: { ticket_id: ticketId, is_deleted: false },
    new_data: { ticket_id: ticketId, is_deleted: true, deleted_at: now() },
    ip_address: null,
  });
  if (auditError) {
    const { error: rollbackError } = await supabase.from('t_support_ticket')
      .update({ is_deleted: false, updated_at: now() })
      .eq('ticket_id', ticketId)
      .eq('is_deleted', true);
    if (rollbackError) console.error(`[SUPPORT] Ticket deletion rollback failed: ${rollbackError.message}`);
    throw auditError;
  }
  ticketEvents.emit(ticketEmitter(ticketId));
  return { deleted: true };
};

const deleteAttachment = async (ticketId, key, user) => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  if (ticket.ticket_status_cd === 'CLS') throw createError(409, 'Phiếu đã đóng; không thể thay đổi tệp đính kèm.');
  const inTicket = parseJsonArray(ticket.attachment_urls);
  const initialFile = inTicket.find((file) => file.key === key);
  if (initialFile) {
    if (isAdmin(user)) throw createError(403, 'Chỉ người tạo phiếu mới có thể xóa ảnh ban đầu.');
    const next = inTicket.filter((file) => file.key !== key);
    const { error } = await supabase.from('t_support_ticket').update({ attachment_urls: next, updated_at: now() })
      .eq('ticket_id', ticketId);
    if (error) throw error;
  } else {
    const { data: replies, error } = await supabase.from('t_support_ticket_reply')
      .select('reply_id, sender_id, attachment_urls')
      .eq('ticket_id', ticketId);
    if (error) throw error;
    const parent = (replies || []).find((reply) => parseJsonArray(reply.attachment_urls).some((file) => file.key === key));
    if (!parent) throw createError(404, 'Không tìm thấy tệp đính kèm.');
    if (String(parent.sender_id) !== String(user.user_id)) {
      throw createError(403, 'Chỉ người gửi ảnh mới có thể xóa tệp đính kèm.');
    }
    const next = parseJsonArray(parent.attachment_urls).filter((file) => file.key !== key);
    const { error: updateError } = await supabase.from('t_support_ticket_reply')
      .update({ attachment_urls: next, updated_at: now() })
      .eq('reply_id', parent.reply_id);
    if (updateError) throw updateError;
  }
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([`${ticketId}/${key}`]);
  if (storageError) console.error(`[SUPPORT] Could not remove attachment ${key}: ${storageError.message}`);
  ticketEvents.emit(ticketEmitter(ticketId));
  return { key, deleted: true };
};

const downloadAttachment = async (ticketId, key, user) => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  const replies = await supabase.from('t_support_ticket_reply').select('is_internal_note, attachment_urls').eq('ticket_id', ticketId);
  if (replies.error) throw replies.error;
  const file = [
    ...parseJsonArray(ticket.attachment_urls),
    ...(replies.data || []).filter((reply) => isAdmin(user) || !reply.is_internal_note)
      .flatMap((reply) => parseJsonArray(reply.attachment_urls)),
  ].find((attachment) => attachment.key === key);
  if (!file) throw createError(404, 'Không tìm thấy tệp đính kèm.');
  const { data, error } = await supabase.storage.from(BUCKET).download(`${ticketId}/${key}`);
  if (error) throw error;
  return { data, filename: file.name };
};

const chatWithAI = async (ticketId, user, { message, history }) => {
  const ticket = await getTicketRow(ticketId);
  await assertTicketAccess(ticket, user);
  if (isAdmin(user) || ticket.ticket_status_cd !== 'OPN') {
    throw createError(409, 'Chat với AI chỉ khả dụng khi phiếu đang chờ Admin tiếp nhận.');
  }
  return processChat({
    message,
    history,
    context: {
      currentPage: 'support-ticket',
      supportCategory: ticket.ticket_type_cd,
      supportTicketId: ticket.ticket_id,
    },
    userId: user.user_id,
  });
};

const subscribeToTicket = (ticketId, listener) => {
  const eventName = ticketEmitter(ticketId);
  ticketEvents.on(eventName, listener);
  return () => ticketEvents.off(eventName, listener);
};

const getTicketEventVersion = async (ticketId) => {
  const { data: ticket, error: ticketError } = await supabase
    .from('t_support_ticket')
    .select('updated_at, is_deleted')
    .eq('ticket_id', ticketId)
    .maybeSingle();
  if (ticketError) throw ticketError;
  if (!ticket) return null;

  const { data: latestReply, error: replyError } = await supabase
    .from('t_support_ticket_reply')
    .select('reply_id, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .order('reply_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (replyError) throw replyError;

  return JSON.stringify({
    updated_at: ticket.updated_at,
    is_deleted: Boolean(ticket.is_deleted),
    latest_reply_id: latestReply?.reply_id || null,
    latest_reply_at: latestReply?.created_at || null,
  });
};

const getSupportCounts = async (user, group = 'all') => {
  const requesterView = !isAdmin(user) || group === 'customer';
  let query = supabase.from('t_support_ticket').select('*').eq('is_deleted', false);
  if (group !== 'all') {
    const categories = await loadCategories();
    const codes = categories.filter((category) => isCategoryInGroup(category, group)).map((category) => category.code);
    if (!codes.length) return { unread: 0 };
    query = query.in('ticket_type_cd', codes);
  }
  const { data, error } = requesterView
    ? await query.eq('requester_id', user.user_id)
    : await query.eq('assigned_to', user.user_id);
  if (error) throw error;
  const tickets = data || [];
  if (!tickets.length) return { unread: 0 };
  const replies = await Promise.all(tickets.map((ticket) => getReplies(ticket.ticket_id)));
  const users = await getUsersById(replies.flat().map((reply) => reply.sender_id));
  const unreadCount = tickets.reduce((count, ticket, index) => {
    const roleAwareReplies = replies[index].map((reply) => ({
      ...reply,
      sender_role: !requesterView
        ? String(users.get(String(reply.sender_id))?.role_code_name || '').toUpperCase()
        : (String(reply.sender_id) === String(user.user_id) ? normalizeRole(user) : 'ADM'),
    }));
    const lastPublic = [...roleAwareReplies].reverse().find((reply) => !reply.is_internal_note);
    const status = String(ticket.ticket_status_cd || '').toUpperCase();
    const unread = status !== 'CLS' && (!requesterView
      ? String(ticket.assigned_to || '') === String(user.user_id)
        && (lastPublic?.sender_role && lastPublic.sender_role !== 'ADM'
          || status === 'RSV' && Boolean(ticket.resolved_at))
      : status === 'WAT'
        && lastPublic?.sender_role === 'ADM');
    return count + (unread ? 1 : 0);
  }, 0);
  return { unread: unreadCount };
};

module.exports = {
  listCategories,
  listTickets,
  createTicket,
  getTicket,
  claimTicket,
  createReply,
  updateTicketStatus,
  softDeleteTicket,
  deleteAttachment,
  downloadAttachment,
  chatWithAI,
  subscribeToTicket,
  getTicketEventVersion,
  getSupportCounts,
};
