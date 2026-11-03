import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  cancelVendorHotelBooking,
  changeVendorBookingDates,
  changeVendorBookingRoomType,
  getHotel,
  getHotels,
  getVendorHotelBookings,
} from '../../../services/hotelManagementService';
import VendorBookingCard from '../components/VendorBookingCard';
import './vendorBookingsPage.css';

const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN') : '—';
const formatMoney = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const errorMessage = (error) => error.response?.data?.message || error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
const statusNames = {
  CAN: 'Đã hủy',
  CFM: 'Đã xác nhận',
  PND: 'Chờ xác nhận',
  OPN: 'Mới',
  COMPLETED: 'Đã trả phòng',
  CHECKED_OUT: 'Đã trả phòng',
};
const getVietnamToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const addCalendarMonth = (dateOnly) => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
};
const addCalendarDay = (dateOnly) => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const VendorBookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(searchParams.get('hotelId') || '');
  const [roomTypes, setRoomTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: 'all', check_in_date: '', check_out_date: '' });
  const [action, setAction] = useState(null);
  const [actionForm, setActionForm] = useState({ reason: '', check_in_date: '', check_out_date: '', booking_detail_id: '', room_type_id: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadVendorHotels = async () => {
      try {
        const firstPage = await getHotels({ page: 1 });
        const availableHotels = [...(firstPage.items || [])];
        for (let page = 2; page <= (firstPage.pagination?.total_pages || 1); page += 1) {
          const nextPage = await getHotels({ page });
          availableHotels.push(...(nextPage.items || []));
        }
        if (!active) return;
        setHotels(availableHotels);
        setSelectedHotelId((current) => current && availableHotels.some((hotel) => hotel.hotel_id === current)
          ? current
          : availableHotels[0]?.hotel_id || '');
      } catch (loadError) {
        if (active) setError(errorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadVendorHotels();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedHotelId) return undefined;
    let active = true;
    getHotel(selectedHotelId)
      .then((hotel) => { if (active) setRoomTypes(hotel.room_types || []); })
      .catch((loadError) => { if (active) setError(errorMessage(loadError)); });
    return () => { active = false; };
  }, [selectedHotelId]);

  const loadBookings = useCallback(async (page = 1) => {
    if (!selectedHotelId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getVendorHotelBookings(selectedHotelId, {
        page,
        limit: 20,
        status: filters.status,
        ...(filters.check_in_date ? { check_in_date: filters.check_in_date } : {}),
        ...(filters.check_out_date ? { check_out_date: filters.check_out_date } : {}),
      });
      setBookings(result.items || []);
      setPagination(result.pagination || { page: 1, total_pages: 1, total: 0 });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters, selectedHotelId]);

  useEffect(() => {
    loadBookings(1);
  }, [loadBookings]);

  useEffect(() => {
    if (selectedHotelId) setSearchParams({ hotelId: selectedHotelId }, { replace: true });
  }, [selectedHotelId, setSearchParams]);

  const openAction = (type, booking, room = null) => {
    setError('');
    setActionForm({
      reason: '',
      check_in_date: booking.stay.check_in_date,
      check_out_date: booking.stay.check_out_date,
      booking_detail_id: room?.booking_detail_id || booking.stay.rooms[0]?.booking_detail_id || '',
      current_room_type_id: room?.room_type_id || booking.stay.rooms[0]?.room_type_id || '',
      room_type_id: '',
    });
    setAction({ type, booking });
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action || !selectedHotelId) return;
    setError('');
    if (actionForm.reason.trim().length < 3 || actionForm.reason.trim().length > 500) {
      setError('Lý do cần có từ 3 đến 500 ký tự.');
      return;
    }
    if (action.type === 'dates') {
      const cutoff = addCalendarMonth(getVietnamToday());
      if (action.booking.stay.check_in_date < cutoff || actionForm.check_in_date < cutoff) {
        setError('Chỉ có thể đổi ngày khi ngày nhận phòng cũ và mới đều cách hiện tại ít nhất một tháng.');
        return;
      }
      if (actionForm.check_in_date >= actionForm.check_out_date) {
        setError('Ngày trả phòng phải sau ngày nhận phòng.');
        return;
      }
    }
    if (action.type === 'room' && (!actionForm.room_type_id || actionForm.room_type_id === actionForm.current_room_type_id)) {
      setError('Vui lòng chọn hạng phòng khác với hạng phòng hiện tại.');
      return;
    }
    setActionLoading(true);
    try {
      if (action.type === 'cancel') {
        await cancelVendorHotelBooking(selectedHotelId, action.booking.booking_id, { reason: actionForm.reason });
        setNotice(`Đã hủy đơn ${action.booking.booking_code} và gửi thông báo cho khách.`);
      } else if (action.type === 'dates') {
        await changeVendorBookingDates(selectedHotelId, action.booking.booking_id, {
          check_in_date: actionForm.check_in_date,
          check_out_date: actionForm.check_out_date,
          reason: actionForm.reason,
        });
        setNotice(`Đã cập nhật ngày lưu trú cho đơn ${action.booking.booking_code}.`);
      } else {
        await changeVendorBookingRoomType(selectedHotelId, action.booking.booking_id, {
          booking_detail_id: actionForm.booking_detail_id,
          room_type_id: actionForm.room_type_id,
          reason: actionForm.reason,
        });
        setNotice(`Đã cập nhật hạng phòng cho đơn ${action.booking.booking_code}.`);
      }
      setAction(null);
      await loadBookings(pagination.page);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setActionLoading(false);
    }
  };

  const selectedHotel = hotels.find((hotel) => String(hotel.hotel_id) === String(selectedHotelId));
  const vendorActionCutoff = addCalendarMonth(getVietnamToday());

  return (
    <section className="vendor-bookings">
      <header className="vendor-bookings__header">
        <div>
          <p>HỆ THỐNG KHÁCH SẠN / ĐẶT PHÒNG</p>
          <h1>Danh sách đặt phòng</h1>
          <span>Chỉ hiển thị đơn đã thanh toán của khách sạn do bạn quản lý.</span>
        </div>
        <Link to="/dashboard/hotel-management" className="vendor-bookings__back">Quản lý khách sạn</Link>
      </header>

      {error && <div className="vendor-bookings__alert vendor-bookings__alert--error" role="alert">{error}</div>}
      {notice && <div className="vendor-bookings__alert vendor-bookings__alert--success" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng">×</button></div>}

      <div className="vendor-bookings__toolbar">
        <label>Khách sạn
          <select value={selectedHotelId} onChange={(event) => setSelectedHotelId(event.target.value)} disabled={loading && !hotels.length}>
            {!hotels.length && <option value="">Không có khách sạn</option>}
            {hotels.map((hotel) => <option key={hotel.hotel_id} value={hotel.hotel_id}>{hotel.name}</option>)}
          </select>
        </label>
        <label>Trạng thái
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">Tất cả</option><option value="in_use">Đang lưu trú</option><option value="completed">Đã hoàn thành</option><option value="cancelled">Đã hủy</option>
          </select>
        </label>
        <label>Ngày nhận phòng<input type="date" value={filters.check_in_date} onChange={(event) => setFilters((current) => ({ ...current, check_in_date: event.target.value }))} /></label>
        <label>Ngày trả phòng<input type="date" value={filters.check_out_date} onChange={(event) => setFilters((current) => ({ ...current, check_out_date: event.target.value }))} /></label>
      </div>

      {selectedHotel && <h2 className="vendor-bookings__hotel-title">{selectedHotel.name} <span>{pagination.total} đơn</span></h2>}
      {loading ? (
        <div className="vendor-bookings__empty" role="status">Đang tải danh sách đặt phòng…</div>
      ) : bookings.length ? (
        <div className="vendor-bookings__list">
          {bookings.map((booking) => (
            <VendorBookingCard
              key={booking.booking_id}
              booking={booking}
              actionCutoff={vendorActionCutoff}
              statusNames={statusNames}
              formatDate={formatDate}
              formatMoney={formatMoney}
              onAction={openAction}
            />
          ))}
        </div>
      ) : (
        <div className="vendor-bookings__empty">Không tìm thấy đơn đặt phòng phù hợp.</div>
      )}

      {pagination.total_pages > 1 && (
        <div className="vendor-bookings__pagination">
          <button type="button" disabled={pagination.page <= 1} onClick={() => loadBookings(pagination.page - 1)}>Trước</button>
          <span>Trang {pagination.page} / {pagination.total_pages}</span>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => loadBookings(pagination.page + 1)}>Tiếp</button>
        </div>
      )}

      {action && (
        <div className="vendor-bookings__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAction(null); }}>
          <section className="vendor-bookings__dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-booking-action-title">
            <header><h2 id="vendor-booking-action-title">{action.type === 'cancel' ? 'Hủy đơn đặt phòng' : action.type === 'dates' ? 'Đổi ngày lưu trú' : 'Đổi hạng phòng'}</h2><button type="button" onClick={() => setAction(null)} aria-label="Đóng">×</button></header>
            <p>Đơn <strong>{action.booking.booking_code}</strong> · {action.booking.guest.name || 'Khách lưu trú'}</p>
            {error && <div className="vendor-bookings__alert vendor-bookings__alert--error" role="alert">{error}</div>}
            <form onSubmit={submitAction}>
              {action.type === 'dates' && (
                <div className="vendor-bookings__date-fields">
                  <label>Ngày nhận phòng<input type="date" min={vendorActionCutoff} required value={actionForm.check_in_date} onChange={(event) => setActionForm((current) => ({ ...current, check_in_date: event.target.value }))} /></label>
                  <label>Ngày trả phòng<input type="date" min={actionForm.check_in_date ? addCalendarDay(actionForm.check_in_date) : vendorActionCutoff} required value={actionForm.check_out_date} onChange={(event) => setActionForm((current) => ({ ...current, check_out_date: event.target.value }))} /></label>
                </div>
              )}
              {action.type === 'room' && (
                <>
                  <label>Hạng phòng
                    <select required value={actionForm.room_type_id} onChange={(event) => setActionForm((current) => ({ ...current, room_type_id: event.target.value }))}>
                      <option value="">Chọn hạng phòng mới</option>
                      {roomTypes.filter((room) => room.room_type_id !== actionForm.current_room_type_id).map((room) => <option key={room.room_type_id} value={room.room_type_id}>{room.type_name || room.name}</option>)}
                    </select>
                  </label>
                  <small>Đây là thay đổi hạng phòng đã đặt, không phải chỉ định phòng vật lý.</small>
                </>
              )}
              <label>Lý do (bắt buộc)<textarea required minLength={3} maxLength={500} value={actionForm.reason} onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Nhập lý do để thông báo cho khách" /></label>
              {action.type === 'cancel' && <p className="vendor-bookings__warning">Hủy đơn sẽ hoàn tiền đầy đủ cho khách. Chỉ được hủy trước ngày nhận phòng ít nhất một tháng.</p>}
              <footer><button type="button" onClick={() => setAction(null)}>Quay lại</button><button type="submit" className={action.type === 'cancel' ? 'is-danger' : ''} disabled={actionLoading}>{actionLoading ? 'Đang xử lý…' : action.type === 'cancel' ? 'Xác nhận hủy' : 'Lưu thay đổi'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
};

export default VendorBookingsPage;
