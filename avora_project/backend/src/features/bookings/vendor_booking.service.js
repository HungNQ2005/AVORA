'use strict';

const supabase = require('../../config/supabaseClient');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const ensureClient = () => {
  if (!supabase) throw createError('Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.', 503);
};

// Tra cứu mã trạng thái chuẩn từ BOOKING_STS
const STATUS_CONFIG = {
  PND: { codeCd: '1', name: 'PND', label: 'Chờ xác nhận', color: 'warning' },
  CFM: { codeCd: '2', name: 'CFM', label: 'Đã xác nhận', color: 'success' },
  CAN: { codeCd: '3', name: 'CAN', label: 'Đã hủy', color: 'danger' },
};

const normalizeStatusCode = (val) => {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (s === '1' || s === 'PND' || s === 'PENDING') return STATUS_CONFIG.PND;
  if (s === '2' || s === 'CFM' || s === 'CONFIRMED') return STATUS_CONFIG.CFM;
  if (s === '3' || s === 'CAN' || s === 'CANCELLED' || s === 'CANCELED') return STATUS_CONFIG.CAN;
  return { codeCd: s, name: s, label: s, color: 'default' };
};

/**
 * Lấy danh sách khách sạn mà tài khoản hiện tại được phép quản lý:
 * - CHỈ dành riêng cho Vendor (m_hotel có owner_id === userId)
 */
const getAccessibleHotels = async (hotelAccess) => {
  ensureClient();
  if (!hotelAccess || !hotelAccess.isVendor) {
    throw createError('Chỉ tài khoản Quản lý khách sạn (Vendor) mới có quyền truy cập chức năng này.', 403);
  }

  const query = supabase
    .from('m_hotel')
    .select('hotel_id, name, address, owner_id')
    .eq('is_deleted', false)
    .eq('owner_id', hotelAccess.userId)
    .order('name', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('[VendorBooking] Lỗi truy vấn khách sạn:', error.message);
    throw createError('Không thể tải danh sách khách sạn bạn quản lý.', 500);
  }

  return data || [];
};

/**
 * Danh sách đơn đặt phòng dành cho Vendor:
 * Có bộ lọc theo: Khách sạn, Trạng thái (PND/CFM/CAN), Từ khóa (Tên khách, SĐT, Mã đơn), Khoảng ngày
 */
const getVendorBookings = async ({
  hotelAccess,
  page = 1,
  limit = 10,
  status = 'all',
  hotelId = 'all',
  search = '',
  startDate = '',
  endDate = '',
}) => {
  ensureClient();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  // 1. Xác thực danh sách khách sạn thuộc quyền của Vendor
  const accessibleHotels = await getAccessibleHotels(hotelAccess);
  if (accessibleHotels.length === 0) {
    return {
      bookings: [],
      hotels: [],
      pagination: {
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      },
      counts: { all: 0, pnd: 0, cfm: 0, can: 0 },
    };
  }

  const accessibleHotelIds = accessibleHotels.map((h) => h.hotel_id);

  // Nếu người dùng chọn lọc theo 1 khách sạn cụ thể, kiểm tra quyền
  let targetHotelIds = accessibleHotelIds;
  if (hotelId && hotelId !== 'all') {
    if (!accessibleHotelIds.includes(hotelId)) {
      throw createError('Bạn không có quyền quản lý khách sạn này.', 403);
    }
    targetHotelIds = [hotelId];
  }

  // 2. Thống kê số lượng theo từng trạng thái (trong phạm vi các khách sạn được lọc)
  const { data: countRows, error: countErr } = await supabase
    .from('t_booking')
    .select('booking_status_cd')
    .in('hotel_id', targetHotelIds);

  const counts = { all: 0, pnd: 0, cfm: 0, can: 0 };
  if (!countErr && Array.isArray(countRows)) {
    counts.all = countRows.length;
    countRows.forEach((r) => {
      const st = normalizeStatusCode(r.booking_status_cd);
      if (st.name === 'PND') counts.pnd += 1;
      else if (st.name === 'CFM') counts.cfm += 1;
      else if (st.name === 'CAN') counts.can += 1;
    });
  }

  // 3. Xây dựng truy vấn danh sách đặt phòng
  let query = supabase
    .from('t_booking')
    .select(`
      booking_id,
      user_id,
      hotel_id,
      total_amount,
      discount_amount,
      guest_name,
      guest_phone,
      special_request,
      booking_status_cd,
      created_at,
      updated_at,
      m_hotel (
        hotel_id,
        name,
        address
      ),
      t_booking_detail (
        booking_detail_id,
        room_type_id,
        check_in_date,
        check_out_date,
        quantity,
        unit_price,
        m_room_type (
          room_type_id,
          type_name,
          bed_type,
          room_size
        )
      )
    `, { count: 'exact' })
    .in('hotel_id', targetHotelIds);

  // Lọc theo trạng thái
  if (status && status !== 'all') {
    const stConfig = normalizeStatusCode(status);
    if (stConfig.codeCd) {
      // Tìm theo cả code_cd ('1','2','3') hoặc mã tên ('PND','CFM','CAN')
      query = query.or(`booking_status_cd.eq.${stConfig.codeCd},booking_status_cd.eq.${stConfig.name}`);
    }
  }

  // Lọc theo khoảng ngày tạo đơn hoặc ngày nhận phòng
  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59Z`);
  }

  // Lọc theo từ khóa tìm kiếm (tên khách, số điện thoại, hoặc mã đặt phòng)
  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    // Nếu là định dạng UUID, tìm chính xác theo booking_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmedSearch)) {
      query = query.eq('booking_id', trimmedSearch);
    } else {
      query = query.or(`guest_name.ilike.%${trimmedSearch}%,guest_phone.ilike.%${trimmedSearch}%`);
    }
  }

  // Sắp xếp đơn mới nhất lên đầu và phân trang
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data: rows, count: totalCount, error: fetchError } = await query;
  if (fetchError) {
    console.error('[VendorBooking] Lỗi lấy danh sách đặt phòng:', fetchError.message);
    throw createError('Không thể tải danh sách đơn đặt phòng. Vui lòng thử lại sau.', 500);
  }

  // Định dạng lại dữ liệu trả về cho giao diện
  const formattedBookings = (rows || []).map((b) => {
    const statusMeta = normalizeStatusCode(b.booking_status_cd);
    const details = b.t_booking_detail || [];

    // Tìm khoảng ngày ở tổng quan
    let earliestCheckIn = null;
    let latestCheckOut = null;
    let totalRoomsCount = 0;

    details.forEach((d) => {
      totalRoomsCount += Number(d.quantity || 1);
      if (d.check_in_date) {
        if (!earliestCheckIn || d.check_in_date < earliestCheckIn) earliestCheckIn = d.check_in_date;
      }
      if (d.check_out_date) {
        if (!latestCheckOut || d.check_out_date > latestCheckOut) latestCheckOut = d.check_out_date;
      }
    });

    return {
      booking_id: b.booking_id,
      booking_ref: String(b.booking_id || '').split('-')[0].toUpperCase(),
      hotel_id: b.hotel_id,
      hotel_name: b.m_hotel?.name || 'Khách sạn',
      hotel_address: b.m_hotel?.address || '',
      guest_name: b.guest_name || 'Khách vãng lai',
      guest_phone: b.guest_phone || 'Chưa cập nhật',
      special_request: b.special_request || '',
      total_amount: Number(b.total_amount || 0),
      discount_amount: Number(b.discount_amount || 0),
      status: statusMeta,
      created_at: b.created_at,
      updated_at: b.updated_at,
      check_in_date: earliestCheckIn,
      check_out_date: latestCheckOut,
      total_rooms: totalRoomsCount,
      details: details.map((d) => ({
        booking_detail_id: d.booking_detail_id,
        room_type_id: d.room_type_id,
        room_type_name: d.m_room_type?.type_name || 'Phòng tiêu chuẩn',
        bed_type: d.m_room_type?.bed_type || '',
        room_size: d.m_room_type?.room_size || '',
        quantity: Number(d.quantity || 1),
        unit_price: Number(d.unit_price || 0),
        check_in_date: d.check_in_date,
        check_out_date: d.check_out_date,
      })),
    };
  });

  const total = totalCount || 0;
  return {
    bookings: formattedBookings,
    hotels: accessibleHotels.map((h) => ({ hotel_id: h.hotel_id, name: h.name })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
    counts,
  };
};

/**
 * Xem chi tiết 1 đơn đặt phòng theo ID
 */
const getVendorBookingById = async ({ hotelAccess, bookingId }) => {
  ensureClient();

  if (!bookingId) {
    throw createError('Mã đơn đặt phòng không hợp lệ.', 400);
  }

  const accessibleHotels = await getAccessibleHotels(hotelAccess);
  const accessibleHotelIds = accessibleHotels.map((h) => h.hotel_id);

  const { data: booking, error } = await supabase
    .from('t_booking')
    .select(`
      booking_id,
      user_id,
      hotel_id,
      total_amount,
      discount_amount,
      guest_name,
      guest_phone,
      special_request,
      booking_status_cd,
      created_at,
      updated_at,
      m_hotel (
        hotel_id,
        name,
        address
      ),
      t_booking_detail (
        booking_detail_id,
        room_type_id,
        check_in_date,
        check_out_date,
        quantity,
        unit_price,
        m_room_type (
          room_type_id,
          type_name,
          bed_type,
          room_size,
          default_price
        )
      )
    `)
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) {
    console.error('[VendorBooking] Lỗi lấy chi tiết đặt phòng:', error.message);
    throw createError('Không thể tải thông tin đơn đặt phòng.', 500);
  }

  if (!booking) {
    throw createError('Không tìm thấy đơn đặt phòng yêu cầu.', 404);
  }

  // Kiểm tra quyền sở hữu
  if (!accessibleHotelIds.includes(booking.hotel_id)) {
    throw createError('Bạn không có quyền truy cập đơn đặt phòng của khách sạn này.', 403);
  }

  const statusMeta = normalizeStatusCode(booking.booking_status_cd);
  const details = booking.t_booking_detail || [];

  return {
    booking_id: booking.booking_id,
    booking_ref: String(booking.booking_id || '').split('-')[0].toUpperCase(),
    hotel_id: booking.hotel_id,
    hotel_name: booking.m_hotel?.name || 'Khách sạn',
    hotel_address: booking.m_hotel?.address || '',
    guest_name: booking.guest_name || 'Khách vãng lai',
    guest_phone: booking.guest_phone || 'Chưa cập nhật',
    special_request: booking.special_request || '',
    total_amount: Number(booking.total_amount || 0),
    discount_amount: Number(booking.discount_amount || 0),
    status: statusMeta,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    details: details.map((d) => ({
      booking_detail_id: d.booking_detail_id,
      room_type_id: d.room_type_id,
      room_type_name: d.m_room_type?.type_name || 'Phòng tiêu chuẩn',
      bed_type: d.m_room_type?.bed_type || '',
      room_size: d.m_room_type?.room_size || '',
      quantity: Number(d.quantity || 1),
      unit_price: Number(d.unit_price || 0),
      check_in_date: d.check_in_date,
      check_out_date: d.check_out_date,
    })),
  };
};

/**
 * Cập nhật trạng thái đơn đặt phòng bởi Vendor:
 * - Chờ xác nhận (PND - 1) -> Đã xác nhận (CFM - 2)
 * - Chờ xác nhận (PND - 1) hoặc Đã xác nhận (CFM - 2) -> Đã hủy (CAN - 3)
 */
const updateVendorBookingStatus = async ({ hotelAccess, bookingId, newStatus, reason = '' }) => {
  ensureClient();

  if (!bookingId) {
    throw createError('Mã đơn đặt phòng không hợp lệ.', 400);
  }

  const targetStatus = normalizeStatusCode(newStatus);
  if (!targetStatus || !['CFM', 'CAN'].includes(targetStatus.name)) {
    throw createError('Trạng thái cập nhật không hợp lệ. Chỉ chấp nhận Xác nhận hoặc Hủy đơn.', 400);
  }

  // 1. Kiểm tra đơn phòng hiện tại
  const currentBooking = await getVendorBookingById({ hotelAccess, bookingId });
  const currentStatus = currentBooking.status.name;

  if (currentStatus === 'CAN') {
    throw createError('Đơn đặt phòng này đã bị hủy trước đó, không thể thay đổi trạng thái.', 400);
  }

  if (currentStatus === targetStatus.name) {
    throw createError(`Đơn đặt phòng đã ở trạng thái "${targetStatus.label}".`, 400);
  }

  // 2. Cập nhật trạng thái vào t_booking
  const updatePayload = {
    booking_status_cd: targetStatus.codeCd, // lưu mã chuẩn '2' hoặc '3'
    updated_at: new Date().toISOString(),
  };

  // Nếu có lý do hủy, ghi chú thêm vào special_request
  if (targetStatus.name === 'CAN' && reason) {
    const existingReq = currentBooking.special_request ? `${currentBooking.special_request}\n` : '';
    updatePayload.special_request = `${existingReq}[Lý do khách sạn hủy: ${reason.trim()}]`;
  }

  const { data, error } = await supabase
    .from('t_booking')
    .update(updatePayload)
    .eq('booking_id', bookingId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[VendorBooking] Lỗi cập nhật trạng thái:', error.message);
    throw createError('Không thể cập nhật trạng thái đơn đặt phòng. Vui lòng thử lại.', 500);
  }

  return {
    booking_id: bookingId,
    booking_ref: currentBooking.booking_ref,
    status: targetStatus,
    message:
      targetStatus.name === 'CFM'
        ? 'Xác nhận đơn đặt phòng thành công!'
        : 'Đã hủy đơn đặt phòng thành công.',
  };
};

module.exports = {
  getVendorBookings,
  getVendorBookingById,
  updateVendorBookingStatus,
};
