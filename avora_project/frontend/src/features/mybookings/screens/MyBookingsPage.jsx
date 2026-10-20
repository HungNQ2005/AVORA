import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchMyBookings,
  updateBookingGuestInfo,
  changeBookingDates,
  cancelBooking,
  fetchBookingVoucher,
  fetchBookingInvoice,
} from '../../../services/bookingApi';
import './MyBookingsPage.css';

// Subcomponents & Helpers
import { LuggageIcon, SearchIcon } from '../components/BookingIcons';
import BookingFilterBar from '../components/BookingFilterBar';
import BookingSupportBanner from '../components/BookingSupportBanner';
import UpcomingBookingCard from '../components/UpcomingBookingCard';
import CompletedBookingCard from '../components/CompletedBookingCard';
import CancelledBookingCard from '../components/CancelledBookingCard';

// Modals
import BookingVoucherModal from '../components/BookingVoucherModal';
import EditGuestModal from '../components/EditGuestModal';
import DateChangeModal from '../components/DateChangeModal';
import CancelBookingModal from '../components/CancelBookingModal';
import InvoiceModal from '../components/InvoiceModal';
import RefundReceiptModal from '../components/RefundReceiptModal';
import GalleryModal from '../components/GalleryModal';

/**
 * Main "Quản lý Đặt Chỗ & Lịch Sử Kỳ Nghỉ" Page Component
 */
const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.user_id;

  // Active status tab: 'all' | 'upcoming' | 'completed' | 'cancelled'
  const activeTab = searchParams.get('status') || 'all';
  const [currentYear] = useState(() => new Date().getFullYear());

  // Search input & filter state
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef('');
  const [timeRange, setTimeRange] = useState('all');
  const [requireVatOnly, setRequireVatOnly] = useState(false);

  // Bookings data state
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({ all: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [availableYears, setAvailableYears] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Modals state
  const [selectedBookingForVoucher, setSelectedBookingForVoucher] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [editGuestModalBooking, setEditGuestModalBooking] = useState(null);
  const [editGuestForm, setEditGuestForm] = useState({ guest_name: '', guest_phone: '', special_request: '' });
  const [isUpdatingGuest, setIsUpdatingGuest] = useState(false);

  const [dateChangeModalBooking, setDateChangeModalBooking] = useState(null);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [isChangingDates, setIsChangingDates] = useState(false);

  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi lịch trình');
  const [isCancelling, setIsCancelling] = useState(false);

  const [invoiceModalBooking, setInvoiceModalBooking] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  const [refundModalData, setRefundModalData] = useState(null);
  const [galleryModalImages, setGalleryModalImages] = useState(null);

  // Load bookings from database
  const loadBookings = useCallback(async (overrideStatus = activeTab, keyword = searchInputRef.current) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchMyBookings({
        status: overrideStatus,
        search: keyword,
        timeRange,
        userId: userId || undefined,
      });
      setBookings(data.bookings || []);
      setCounts(data.counts || { all: 0, upcoming: 0, completed: 0, cancelled: 0 });
      if (Array.isArray(data.available_years)) {
        setAvailableYears(data.available_years);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setErrorMsg(err.message || 'Không thể tải danh sách đơn đặt phòng.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, timeRange, userId]);

  useEffect(() => {
    if (authLoading) return;
    let isActive = true;
    Promise.resolve().then(() => {
      if (isActive) loadBookings(activeTab);
    });
    return () => {
      isActive = false;
    };
  }, [activeTab, authLoading, loadBookings, searchInput]);

  // Tab switch handler
  const handleTabChange = (statusKey) => {
    setSearchParams({ status: statusKey });
  };

  // Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBookings(activeTab, searchInput);
  };

  const handleSearchInputChange = (e) => {
    searchInputRef.current = e.target.value;
    setSearchInput(e.target.value);
  };

  // Apply client-side filter for VAT / Invoice eligible bookings if toggled
  const visibleBookings = useMemo(() => {
    if (!requireVatOnly) return bookings;
    return bookings.filter((b) => b.payment?.has_vat_invoice || b.category === 'completed');
  }, [bookings, requireVatOnly]);

  // Split bookings by category for structured sections
  const upcomingBookings = useMemo(() => {
    return visibleBookings.filter((b) => b.category === 'upcoming');
  }, [visibleBookings]);

  const completedBookings = useMemo(() => {
    return visibleBookings.filter((b) => b.category === 'completed');
  }, [visibleBookings]);

  const cancelledBookings = useMemo(() => {
    return visibleBookings.filter((b) => b.category === 'cancelled');
  }, [visibleBookings]);

  // Open voucher modal
  const handleOpenVoucher = async (booking) => {
    setSelectedBookingForVoucher(booking);
    setVoucherLoading(true);
    try {
      const v = await fetchBookingVoucher(booking.booking_id);
      setVoucherData(v);
    } catch (err) {
      alert(`Không thể tải voucher: ${err.message}`);
      setSelectedBookingForVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  // Open edit guest info modal
  const handleOpenEditGuest = (booking) => {
    setEditGuestModalBooking(booking);
    setEditGuestForm({
      guest_name: booking.guest_name || '',
      guest_phone: booking.guest_phone || '',
      special_request: booking.special_request || '',
    });
  };

  const handleSaveGuestInfo = async (e) => {
    e.preventDefault();
    if (!editGuestModalBooking) return;
    setIsUpdatingGuest(true);
    try {
      let rawDigits = String(editGuestForm.guest_phone || '').replace(/[^\d]/g, '');
      if (rawDigits.startsWith('84') && rawDigits.length > 9) {
        rawDigits = rawDigits.slice(2);
      }
      rawDigits = rawDigits.replace(/^0+/, '');
      const finalPhone = rawDigits ? `0${rawDigits}` : editGuestForm.guest_phone;

      await updateBookingGuestInfo(editGuestModalBooking.booking_id, {
        ...editGuestForm,
        guest_phone: finalPhone,
      });
      setEditGuestModalBooking(null);
      await loadBookings();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsUpdatingGuest(false);
    }
  };

  // Open date change modal
  const handleOpenDateChange = (booking) => {
    setDateChangeModalBooking(booking);
    setNewCheckIn(booking.stay.check_in_date);
    setNewCheckOut(booking.stay.check_out_date);
  };

  const handleSaveDateChange = async (e) => {
    e.preventDefault();
    if (!dateChangeModalBooking) return;
    setIsChangingDates(true);
    try {
      await changeBookingDates(dateChangeModalBooking.booking_id, {
        check_in_date: newCheckIn,
        check_out_date: newCheckOut,
      });
      setDateChangeModalBooking(null);
      await loadBookings();
    } catch (err) {
      alert(`Lỗi đổi ngày: ${err.message}`);
    } finally {
      setIsChangingDates(false);
    }
  };

  // Open cancel modal
  const handleOpenCancel = (booking) => {
    setCancelModalBooking(booking);
    setCancelReason('Khách thay đổi kế hoạch chuyến đi');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(cancelModalBooking.booking_id, { reason: cancelReason });
      setCancelModalBooking(null);
      await loadBookings();
    } catch (err) {
      alert(`Lỗi hủy phòng: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Open VAT Invoice modal
  const handleOpenInvoice = async (booking) => {
    setInvoiceModalBooking(booking);
    setInvoiceData(null);
    try {
      const inv = await fetchBookingInvoice(booking.booking_id);
      setInvoiceData(inv);
    } catch (err) {
      alert(`Không thể tải thông tin biên nhận / hóa đơn: ${err.message}`);
      setInvoiceModalBooking(null);
    }
  };

  // Close all modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedBookingForVoucher(null);
        setEditGuestModalBooking(null);
        setDateChangeModalBooking(null);
        setCancelModalBooking(null);
        setInvoiceModalBooking(null);
        setRefundModalData(null);
        setGalleryModalImages(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Refund Receipt modal
  const handleOpenRefundReceipt = (booking) => {
    if (!booking.refund) {
      alert('Đơn đặt phòng này chưa có bản ghi yêu cầu hoàn tiền trong bảng t_refund_request.');
      return;
    }
    setRefundModalData({
      ...booking.refund,
      booking_code: booking.booking_code,
      hotel_name: booking.hotel?.name,
    });
  };

  return (
    <div className="my-bookings-page">
      <div className="my-bookings-container">
        {/* ─── 1. TOP HEADER & TITLE ROW ────────────────────────────────── */}
        <div className="my-bookings-header-row">
          <div className="my-bookings-header-left">
            <span className="my-bookings-kicker">TRUNG TÂM ĐIỀU HÀNH CHUYẾN ĐI</span>
            <h1 className="my-bookings-title">Quản lý Đặt Chỗ &amp; Lịch Sử Kỳ Nghỉ</h1>
            <p className="my-bookings-subtitle">
              Tra cứu vé điện tử, thay đổi ngày lưu trú, xuất hóa đơn VAT điện tử và quản trị hoàn hủy theo thời gian thực.
            </p>
          </div>
        </div>

        {/* ─── 2. STATUS TABS & FILTER BAR ──────────────────────────────── */}
        <BookingFilterBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={counts}
          searchInput={searchInput}
          onSearchInputChange={handleSearchInputChange}
          onSearchSubmit={handleSearchSubmit}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          availableYears={availableYears}
          currentYear={currentYear}
          requireVatOnly={requireVatOnly}
          setRequireVatOnly={setRequireVatOnly}
        />

        {/* ─── 3. BOOKINGS LIST OR EMPTY/LOADING STATES ─────────────────── */}
        {loading ? (
          <div className="my-bookings-empty-state">
            <div className="profile-spinner" style={{ margin: '0 auto 16px' }} />
            <p>Đang tải thông tin đặt chỗ từ hệ thống...</p>
          </div>
        ) : errorMsg ? (
          <div className="my-bookings-empty-state">
            <p style={{ color: '#ef4444' }}>{errorMsg}</p>
            <button
              type="button"
              className="my-bookings-btn-primary"
              onClick={() => loadBookings()}
            >
              Thử lại
            </button>
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="my-bookings-empty-state">
            <div className="my-bookings-empty-icon">
              <LuggageIcon width="46" height="46" />
            </div>
            <h3 className="my-bookings-empty-title">Không tìm thấy đơn đặt phòng nào</h3>
            <p>Bạn chưa có đơn đặt phòng nào trong mục này hoặc từ khóa tìm kiếm không khớp.</p>
            <button
              type="button"
              className="my-bookings-btn-primary"
              onClick={() => navigate('/hotels')}
              style={{ marginTop: 12 }}
            >
              <SearchIcon width="14" height="14" />
              <span>Khám phá khách sạn ngay</span>
            </button>
          </div>
        ) : (
          <>
            {/* ════ SECTION 1: CHUYẾN ĐI SẮP TỚI CỦA BẠN ════ */}
            {(activeTab === 'all' || activeTab === 'upcoming') && upcomingBookings.length > 0 && (
              <section className="my-bookings-section">
                <div className="my-bookings-section-header">
                  <h2 className="my-bookings-section-title">
                    <span className="my-bookings-dot-green" />
                    Chuyến Đi Sắp Tới Của Bạn
                  </h2>
                  <span className="my-bookings-section-badge-right">
                    Hỗ trợ nhận phòng 24/7 trực tuyến
                  </span>
                </div>

                {upcomingBookings.map((booking) => (
                  <UpcomingBookingCard
                    key={booking.booking_id}
                    booking={booking}
                    nowMs={nowMs}
                    onOpenVoucher={handleOpenVoucher}
                    onOpenEditGuest={handleOpenEditGuest}
                    onOpenDateChange={handleOpenDateChange}
                    onOpenCancel={handleOpenCancel}
                  />
                ))}
              </section>
            )}

            {/* ════ SECTION 2: KỲ NGHỈ ĐÃ HOÀN THÀNH ════ */}
            {(activeTab === 'all' || activeTab === 'completed') && completedBookings.length > 0 && (
              <section className="my-bookings-section">
                <div className="my-bookings-section-header">
                  <h2 className="my-bookings-section-title">
                    <span className="my-bookings-dot-blue" />
                    Kỳ Nghỉ Đã Hoàn Thành
                  </h2>
                  <span className="my-bookings-section-count-right">
                    {completedBookings.length} kỳ nghỉ lưu trú tuyệt vời cùng Avora
                  </span>
                </div>

                {completedBookings.map((booking) => (
                  <CompletedBookingCard
                    key={booking.booking_id}
                    booking={booking}
                    onRebook={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}
                    onOpenInvoice={handleOpenInvoice}
                    onOpenVoucher={handleOpenVoucher}
                  />
                ))}
              </section>
            )}

            {/* ════ SECTION 3: ĐƠN ĐẶT PHÒNG ĐÃ HỦY ════ */}
            {(activeTab === 'all' || activeTab === 'cancelled') && cancelledBookings.length > 0 && (
              <section className="my-bookings-section">
                <div className="my-bookings-section-header">
                  <h2 className="my-bookings-section-title">
                    <span className="my-bookings-dot-gray" />
                    Đơn Đặt Phòng Đã Hủy
                  </h2>
                  <span className="my-bookings-section-count-right">
                    {cancelledBookings.length} đơn đã hoàn tất hoàn tiền
                  </span>
                </div>

                {cancelledBookings.map((booking) => (
                  <CancelledBookingCard
                    key={booking.booking_id}
                    booking={booking}
                    onRebook={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}
                    onOpenRefundReceipt={handleOpenRefundReceipt}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {/* ─── 4. BOTTOM 24/7 SUPPORT BANNER ────────────────────────────── */}
        <BookingSupportBanner />
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      <BookingVoucherModal
        booking={selectedBookingForVoucher}
        voucherData={voucherData}
        loading={voucherLoading}
        onClose={() => setSelectedBookingForVoucher(null)}
      />

      <EditGuestModal
        booking={editGuestModalBooking}
        form={editGuestForm}
        setForm={setEditGuestForm}
        isUpdating={isUpdatingGuest}
        onSave={handleSaveGuestInfo}
        onClose={() => setEditGuestModalBooking(null)}
      />

      <DateChangeModal
        booking={dateChangeModalBooking}
        newCheckIn={newCheckIn}
        setNewCheckIn={setNewCheckIn}
        newCheckOut={newCheckOut}
        setNewCheckOut={setNewCheckOut}
        isChanging={isChangingDates}
        onSave={handleSaveDateChange}
        onClose={() => setDateChangeModalBooking(null)}
      />

      <CancelBookingModal
        booking={cancelModalBooking}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        isCancelling={isCancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelModalBooking(null)}
      />

      <InvoiceModal
        booking={invoiceModalBooking}
        invoiceData={invoiceData}
        onClose={() => setInvoiceModalBooking(null)}
      />

      <RefundReceiptModal
        refundData={refundModalData}
        onClose={() => setRefundModalData(null)}
      />

      <GalleryModal
        images={galleryModalImages}
        onClose={() => setGalleryModalImages(null)}
      />
    </div>
  );
};

export default MyBookingsPage;
