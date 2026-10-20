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

/**
 * Professional Hospitality & Hotel Iconography (AVORA Design System)
 */
const SearchIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ShieldCheckIcon = ({ width = 18, height = 18, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ConciergeBellIcon = ({ width = 24, height = 24, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2H2Z" />
    <path d="M20 18a8 8 0 1 0-16 0" />
    <path d="M12 4v2" />
    <path d="M10 4h4" />
  </svg>
);

const HotelBuildingIcon = ({ width = 24, height = 24, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    <path d="M9 7h1.5" /><path d="M13.5 7h1.5" />
    <path d="M9 11h1.5" /><path d="M13.5 11h1.5" />
    <path d="M9 15h1.5" /><path d="M13.5 15h1.5" />
    <path d="M10 21v-3.5a1.5 1.5 0 0 1 3 0V21" />
  </svg>
);

const BedDoubleIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 4v16" />
    <path d="M2 8h20" />
    <path d="M2 17h20" />
    <path d="M22 4v16" />
    <path d="M6 8v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V8" />
    <path d="M13 8v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V8" />
  </svg>
);

const RoomSizeIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
    <rect x="7" y="7" width="10" height="10" rx="1.5" strokeDasharray="2 2" />
  </svg>
);

const GuestsIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CalendarDaysIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
    <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
  </svg>
);

const ClockIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 15 15" />
  </svg>
);

const MapPinIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const StarIcon = ({ width = 13, height = 13, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const KeyCardIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="7" cy="15" r="1.2" fill="currentColor" />
    <line x1="13" y1="15" x2="18" y2="15" />
  </svg>
);

const VoucherIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M12 6v12" strokeDasharray="3 3" />
    <circle cx="7" cy="12" r="1" fill="currentColor" />
    <polyline points="15 10 17 12 20 9" />
  </svg>
);

const FolioInvoiceIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
    <circle cx="16" cy="17" r="1.5" />
  </svg>
);

const ReceiptRefundIcon = ({ width = 20, height = 20, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CalendarEditIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18" />
    <path d="M18.5 13.5a1.414 1.414 0 0 1 2 2L14 22l-4 1 1-4 7.5-7.5z" />
  </svg>
);

const GuestEditIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CalendarCancelIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="10" y1="14" x2="14" y2="18" />
    <line x1="14" y1="14" x2="10" y2="18" />
  </svg>
);

const AlertTriangleIcon = ({ width = 22, height = 22, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CameraIcon = ({ width = 22, height = 22, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <circle cx="12" cy="13" r="4" />
    <path d="M7 5l1.5-2h7L17 5" />
  </svg>
);

const PrinterIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const DownloadIcon = ({ width = 15, height = 15, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const LuggageIcon = ({ width = 48, height = 48, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="7" width="12" height="13" rx="2.5" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="6" y1="16" x2="18" y2="16" />
    <circle cx="8.5" cy="21.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="21.5" r="1" fill="currentColor" />
  </svg>
);

const PhoneCallIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ChatSupportIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
  </svg>
);

const TagDiscountIcon = ({ width = 13, height = 13, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
  </svg>
);

const InfoCircleIcon = ({ width = 16, height = 16, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckIcon = ({ width = 13, height = 13, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CheckCircleIcon = ({ width = 14, height = 14, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="16 10 11 15 8 12" />
  </svg>
);

const XCircleIcon = ({ width = 14, height = 14, className = '' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

/**
 * Format currency in VND
 */
const formatVnd = (amount) => {
  return `${Number(amount || 0).toLocaleString('vi-VN')} đ`;
};

/**
 * Format Vietnamese date e.g. "12/07/2024 (Thứ Sáu)"
 */
const formatVnStayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy} (${dayName})`;
};

const PAYMENT_HOLD_MS = 10 * 60 * 1000;

const getBookingPaymentDeadline = (booking) => {
  if (!booking?.created_at) return null;
  const createdAt = new Date(booking.created_at);
  if (Number.isNaN(createdAt.getTime())) return null;
  return new Date(createdAt.getTime() + PAYMENT_HOLD_MS);
};

const getBookingCountdown = (booking, currentTime) => {
  const deadline = getBookingPaymentDeadline(booking);
  if (!deadline) return null;

  const remainingMs = Math.max(0, deadline.getTime() - currentTime);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    deadline,
    remainingMs,
    totalSeconds,
    minutes,
    seconds,
    expired: remainingMs <= 0,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
};

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
            <h1 className="my-bookings-title">Quản lý Đặt Chỗ & Lịch Sử Kỳ Nghỉ</h1>
            <p className="my-bookings-subtitle">
              Tra cứu vé điện tử, thay đổi ngày lưu trú, xuất hóa đơn VAT điện tử và quản trị hoàn hủy theo thời gian thực.
            </p>
          </div>

        </div>

        {/* ─── 2. STATUS TABS BAR ───────────────────────────────────────── */}
        <div className="my-bookings-tabs-bar" role="tablist">
          <button
            type="button"
            className={`my-bookings-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <span>Tất cả đơn</span>
            <span className="my-bookings-tab-badge">{counts.all}</span>
          </button>

          <button
            type="button"
            className={`my-bookings-tab-btn ${activeTab === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('upcoming')}
          >
            <span>Sắp tới / Hiện tại</span>
            <span className="my-bookings-tab-badge my-bookings-tab-badge--amber">
              {counts.upcoming}
            </span>
          </button>

          <button
            type="button"
            className={`my-bookings-tab-btn ${activeTab === 'completed' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('completed')}
          >
            <span>Đã hoàn thành</span>
            <span className="my-bookings-tab-badge">{counts.completed}</span>
          </button>

          <button
            type="button"
            className={`my-bookings-tab-btn ${activeTab === 'cancelled' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('cancelled')}
          >
            <span>Đã hủy</span>
            <span className="my-bookings-tab-badge">{counts.cancelled}</span>
          </button>
        </div>

        {/* ─── 3. SEARCH & FILTER BAR ───────────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="my-bookings-filter-bar">
          <div className="my-bookings-search-wrap">
            <span className="my-bookings-search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="my-bookings-search-input"
              placeholder="Tìm theo mã đơn (AV#...), tên khách sạn, địa danh..."
              value={searchInput}
              onChange={handleSearchInputChange}
            />
          </div>

          <select
            className="my-bookings-filter-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Lọc đơn đặt phòng theo ngày đặt"
          >
            <option value="all">Ngày đặt: Tất cả</option>
            <option value="last_30_days">30 ngày qua</option>
            <option value="last_90_days">90 ngày qua</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_year">Năm nay</option>
            {availableYears.map((yr) => (
              yr !== currentYear && yr !== 2024 && (
                <option key={yr} value={String(yr)}>
                  Năm {yr}
                </option>
              )
            ))}
          </select>
          <label className="my-bookings-filter-vat-toggle">
            <input
              type="checkbox"
              checked={requireVatOnly}
              onChange={(e) => setRequireVatOnly(e.target.checked)}
            />
            <span>Xuất hóa đơn lưu trú</span>
          </label>

          <button type="submit" className="my-bookings-search-submit-btn">
            <SearchIcon />
            <span>Tra cứu vé nhanh</span>
          </button>
        </form>

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
                  <div key={booking.booking_id} className="my-bookings-hero-card">
                    {/* Media Left */}
                    <div className="my-bookings-hero-media">
                      {booking.hotel.thumbnail_url ? (
                        <img
                          src={booking.hotel.thumbnail_url}
                          alt={booking.hotel.name}
                          className="my-bookings-hero-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fb = e.target.parentElement?.querySelector('.my-bookings-img-fallback');
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="my-bookings-img-fallback"
                        style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}
                      >
                        <div className="my-bookings-fallback-icon-wrap">
                          <HotelBuildingIcon width="34" height="34" />
                        </div>
                        <span className="my-bookings-fallback-main">Hình ảnh chỗ nghỉ</span>
                        <span className="my-bookings-fallback-sub">Đang đồng bộ từ hệ thống lưu trú</span>
                      </div>

                      <div className="my-bookings-hero-badges-top">
                        <span className="my-bookings-badge-time">
                          <ClockIcon width="13" height="13" />
                          <span>{booking.stay.days_left_text}</span>
                        </span>
                        <span className="my-bookings-badge-checkin">
                          <KeyCardIcon width="13" height="13" />
                          <span>Check-in trực tuyến mở trước 24h</span>
                        </span>
                      </div>
                    </div>


                    {/* Details Right */}
                    <div className="my-bookings-hero-body">
                      <div>
                        {/* Top stars & Rating */}
                        {/* Top stars & Rating from DB */}
                        <div className="my-bookings-hero-top-meta">
                          <div className="my-bookings-hotel-stars">
                            {booking.hotel.star_quality > 0 && (
                              <>
                                <span className="my-bookings-stars-icons" aria-label={`Khách sạn ${booking.hotel.star_quality} sao`}>
                                  {Array.from({ length: booking.hotel.star_quality }).map((_, i) => (
                                    <StarIcon key={i} width="13" height="13" />
                                  ))}
                                </span>
                                <span className="my-bookings-badge-hotel-class">
                                  Khách Sạn {booking.hotel.star_quality} Sao
                                </span>
                              </>
                            )}

                          </div>

                          {booking.hotel.rating_score != null && (
                            <div className="my-bookings-rating-score-box">
                              <div className="my-bookings-rating-text">
                                <div className="my-bookings-rating-text-label">
                                  {booking.hotel.rating_score >= 9
                                    ? 'Xuất sắc'
                                    : booking.hotel.rating_score >= 8
                                      ? 'Tuyệt vời'
                                      : 'Đánh giá tốt'}
                                </div>
                                <div className="my-bookings-rating-text-count">
                                  {booking.hotel.review_count > 0
                                    ? `${booking.hotel.review_count} đánh giá (t_review)`
                                    : ' '}
                                </div>
                              </div>
                              <div className="my-bookings-rating-number">
                                {booking.hotel.rating_score}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Hotel Name */}
                        <h3 className="my-bookings-hero-hotel-name">
                          <span>{booking.hotel.name}</span>
                          <span
                            className="my-bookings-view-map-link"
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.hotel.name + ' ' + booking.hotel.address)}`, '_blank')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>Xem trên bản đồ</span>
                            <MapPinIcon width="12" height="12" />
                          </span>
                        </h3>

                        {/* Address */}
                        <p className="my-bookings-hero-address">
                          <MapPinIcon width="14" height="14" />
                          <span>{booking.hotel.address}</span>
                        </p>

                        {/* Real booking date from database, Status Badge, Booking Code and Coupon info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0 14px 0', fontSize: 13, color: '#475569' }}>
                          {/* Status Badge */}
                          <span className={`my-bookings-hero-status-badge my-bookings-hero-status-badge--${booking.status_badge_variant || 'confirmed'}`}>
                            {booking.status_badge_variant === 'cancelled' ? (
                              <XCircleIcon width="13" height="13" />
                            ) : booking.status_badge_variant === 'amber' || booking.status_badge_variant === 'pending' ? (
                              <ClockIcon width="13" height="13" />
                            ) : (
                              <CheckCircleIcon width="13" height="13" />
                            )}
                            <span>{booking.status_name}</span>
                            {(booking.status_badge_variant === 'amber' || booking.status_badge_variant === 'pending') &&
                              booking.payment?.is_paid !== true && (() => {
                                const countdown = getBookingCountdown(booking, nowMs);
                                if (!countdown) return null;

                                return (
                                  <span
                                    className={`my-bookings-payment-timer ${countdown.expired ? 'is-expired' : ''}`}
                                    aria-label={countdown.expired ? 'Đã hết thời gian thanh toán' : `Còn ${countdown.label} để thanh toán`}
                                  >
                                    <ClockIcon width="12" height="12" />
                                    <span>{countdown.label}</span>
                                  </span>
                                );
                              })()}
                          </span>

                          {booking.booking_code && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
                              <span>Mã: #{booking.booking_code}</span>
                            </span>
                          )}

                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <CalendarDaysIcon width="14" height="14" />
                            <span>Ngày đặt: <strong>{booking.booking_date_formatted || new Date(booking.created_at).toLocaleDateString('vi-VN')}</strong></span>
                          </span>
                          {booking.coupon?.code && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                              <TagDiscountIcon width="13" height="13" />
                              <span>Voucher: {booking.coupon.code} ({booking.coupon.discount_text})</span>
                            </span>
                          )}
                        </div>

                        {/* 3-Column Stay Dates & Pricing Grid */}
                        <div className="my-bookings-stay-grid">
                          <div className="my-bookings-stay-col">
                            <span className="my-bookings-stay-label">NHẬN PHÒNG (CHECK-IN)</span>
                            <span className="my-bookings-stay-time">
                              {formatVnStayDate(booking.stay.check_in_date)}
                            </span>
                          </div>

                          <div className="my-bookings-stay-col">
                            <span className="my-bookings-stay-label">TRẢ PHÒNG (CHECK-OUT)</span>
                            <span className="my-bookings-stay-time">
                              {formatVnStayDate(booking.stay.check_out_date)} ({booking.stay.nights} đêm)
                            </span>
                          </div>

                          <div className="my-bookings-stay-col">
                            <span className="my-bookings-stay-label">TỔNG CHI PHÍ ĐƠN</span>
                            <span className="my-bookings-stay-price">
                              {formatVnd(booking.total_amount)}
                            </span>
                            <span className="my-bookings-stay-price-sub">
                              {booking.discount_amount > 0
                                ? `Đã giảm ${formatVnd(booking.discount_amount)}`
                                : `${booking.stay.quantity} phòng × ${booking.stay.nights} đêm`}
                            </span>
                          </div>
                        </div>

                        {/* Room specs & facilities from DB */}
                        <div className="my-bookings-room-amenities-line">
                          <span className="my-bookings-room-bullet-item">
                            <BedDoubleIcon width="15" height="15" />
                            <span>
                              {booking.stay.room_type_name || 'Hạng phòng tiêu chuẩn'}
                              {booking.stay.quantity > 1 ? ` (×${booking.stay.quantity})` : ''}
                            </span>
                          </span>
                          {booking.stay.bed_type && (
                            <>
                              <span className="my-bookings-bullet-divider">•</span>
                              <span className="my-bookings-room-bullet-item">
                                <BedDoubleIcon width="14" height="14" />
                                <span>{booking.stay.bed_type}</span>
                              </span>
                            </>
                          )}
                          {booking.stay.room_size && (
                            <>
                              <span className="my-bookings-bullet-divider">•</span>
                              <span className="my-bookings-room-bullet-item">
                                <RoomSizeIcon width="14" height="14" />
                                <span>{booking.stay.room_size}</span>
                              </span>
                            </>
                          )}
                          <span className="my-bookings-bullet-divider">•</span>
                          <span className="my-bookings-room-bullet-item">
                            <GuestsIcon width="14" height="14" />
                            <span>Sức chứa: {booking.stay.guests_summary}</span>
                          </span>
                          {(booking.stay.facilities || []).map((fac) => (
                            <React.Fragment key={fac.facility_id || fac.facility_name}>
                              <span className="my-bookings-bullet-divider">•</span>
                              <span className="my-bookings-room-bullet-item my-bookings-room-bullet-item--green">
                                <CheckIcon width="12" height="12" />
                                <span>{fac.facility_name}</span>
                              </span>
                            </React.Fragment>
                          ))}
                        </div>

                        {booking.special_request && (
                          <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 10 }}>
                            <strong>Ghi chú / Yêu cầu đặc biệt:</strong> {booking.special_request}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Bar */}
                      <div className="my-bookings-hero-actions">
                        <button
                          type="button"
                          className="my-bookings-btn-primary"
                          onClick={() => handleOpenVoucher(booking)}
                        >
                          <VoucherIcon width="15" height="15" />
                          <span>Xem chi tiết &amp; Voucher</span>
                        </button>

                        <button
                          type="button"
                          className="my-bookings-btn-secondary"
                          onClick={() => handleOpenEditGuest(booking)}
                        >
                          <GuestEditIcon width="15" height="15" />
                          <span>Cập nhật thông tin booking</span>
                        </button>

                        <button
                          type="button"
                          className="my-bookings-btn-secondary"
                          onClick={() => handleOpenDateChange(booking)}
                        >
                          <CalendarEditIcon width="15" height="15" />
                          <span>Đổi ngày nhận/trả phòng</span>
                        </button>

                        <button
                          type="button"
                          className="my-bookings-btn-danger"
                          onClick={() => handleOpenCancel(booking)}
                        >
                          <CalendarCancelIcon width="15" height="15" />
                          <span>Hủy đặt phòng</span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                  <div key={booking.booking_id} className="my-bookings-compact-card">
                    {/* Thumbnail */}
                    <div className="my-bookings-compact-thumb-wrap">
                      {booking.hotel.thumbnail_url ? (
                        <img
                          src={booking.hotel.thumbnail_url}
                          alt={booking.hotel.name}
                          className="my-bookings-compact-thumb"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fb = e.target.parentElement?.querySelector('.my-bookings-compact-fallback');
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="my-bookings-compact-fallback"
                        style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}
                      >
                        <HotelBuildingIcon width="24" height="24" />
                        <span>Avora Stay</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="my-bookings-compact-body">
                      <div className="my-bookings-compact-tag-row">
                        <span className="my-bookings-compact-stay-time" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CalendarDaysIcon width="13" height="13" />
                          <span>Đã lưu trú Tháng {new Date(booking.stay.check_in_date).getMonth() + 1}/{new Date(booking.stay.check_in_date).getFullYear()}</span>
                        </span>
                        <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircleIcon width="12" height="12" />
                          <span>{booking.status_name}</span>
                        </span>
                      </div>


                      <h4 className="my-bookings-compact-name">{booking.hotel.name}</h4>
                      <p className="my-bookings-compact-address" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MapPinIcon width="13" height="13" />
                        <span>{booking.hotel.address}</span>
                      </p>

                      <p className="my-bookings-compact-stay-details">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CalendarDaysIcon width="12" height="12" />
                          <span>Ngày đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
                        </span> • Lưu trú: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
                      </p>

                      <div className="my-bookings-compact-payment-line">
                        <span>Tổng cộng: <strong>{formatVnd(booking.total_amount)}</strong></span>
                        <span>•</span>
                        <span className="my-bookings-compact-payment-method">
                          Trạng thái: {booking.status_name}
                          {booking.payment?.is_paid ? ` • ${booking.payment.payment_method}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="my-bookings-compact-actions">
                      <button
                        type="button"
                        className="my-bookings-compact-btn-primary"
                        onClick={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}
                      >
                        <CalendarDaysIcon width="13" height="13" />
                        <span>Đặt lại phòng này</span>
                      </button>

                      <button
                        type="button"
                        className="my-bookings-compact-btn-secondary"
                        onClick={() => handleOpenInvoice(booking)}
                      >
                        <FolioInvoiceIcon width="13" height="13" />
                        <span>Xem hóa đơn VAT</span>
                      </button>

                      <span
                        className="my-bookings-compact-link"
                        onClick={() => handleOpenVoucher(booking)}
                      >
                        <VoucherIcon width="12" height="12" />
                        <span>Xem lại hóa đơn &amp; voucher</span>
                      </span>
                    </div>
                  </div>
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
                  <div key={booking.booking_id} className="my-bookings-compact-card my-bookings-compact-card--cancelled">
                    {/* Thumbnail */}
                    <div className="my-bookings-compact-thumb-wrap">
                      {booking.hotel.thumbnail_url ? (
                        <img
                          src={booking.hotel.thumbnail_url}
                          alt={booking.hotel.name}
                          className="my-bookings-compact-thumb"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fb = e.target.parentElement?.querySelector('.my-bookings-compact-fallback');
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="my-bookings-compact-fallback"
                        style={{ display: booking.hotel.thumbnail_url ? 'none' : 'flex' }}
                      >
                        <HotelBuildingIcon width="24" height="24" />
                        <span>Đã hủy</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="my-bookings-compact-body">
                      <div className="my-bookings-compact-tag-row">
                        <span className="my-bookings-compact-stay-time" style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CalendarCancelIcon width="13" height="13" />
                          <span>Đã hủy ngày {new Date(booking.refund?.created_at || booking.updated_at || booking.created_at).toLocaleDateString('vi-VN')}</span>
                        </span>
                        <span className="my-bookings-compact-status-badge my-bookings-compact-status-badge--cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <XCircleIcon width="12" height="12" />
                          <span>{booking.status_name}{booking.refund?.refund_status_label ? ` • ${booking.refund.refund_status_label}` : ''}</span>
                        </span>
                      </div>

                      <h4 className="my-bookings-compact-name">{booking.hotel.name}</h4>
                      <p className="my-bookings-compact-address" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MapPinIcon width="13" height="13" />
                        <span>{booking.hotel.address}</span>
                      </p>

                      <p className="my-bookings-compact-stay-details">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CalendarDaysIcon width="12" height="12" />
                          <span>Ngày đặt: {new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
                        </span> • Dự kiến: {booking.stay.check_in_date} – {booking.stay.check_out_date} ({booking.stay.nights} đêm) • {booking.stay.room_type_name}
                      </p>

                      {/* Refund detail box from t_refund_request */}
                      {booking.refund ? (
                        <div className="my-bookings-compact-refund-box">
                          <span>
                            Số tiền hoàn lại:{' '}
                            <strong className="my-bookings-compact-refund-amount">
                              {formatVnd(booking.refund.refund_amount)}
                            </strong>
                          </span>
                          <div>
                            (Mã tham chiếu: {booking.refund.gateway_refund_ref || 'Chưa có'} • Trạng thái:{' '}
                            {booking.refund.refund_status_label || booking.refund.refund_status_cd}
                            {booking.refund.reason ? ` • ${booking.refund.reason}` : ''})
                          </div>
                        </div>
                      ) : (
                        <div className="my-bookings-compact-refund-box">
                          <span>Đơn đặt phòng đã hủy</span>
                        </div>
                      )}
                    </div>
                    {/* Right Actions */}
                    <div className="my-bookings-compact-actions">
                      <button
                        type="button"
                        className="my-bookings-compact-btn-primary"
                        onClick={() => navigate(`/hotels/${booking.hotel.hotel_id}`)}
                      >
                        <SearchIcon width="13" height="13" />
                        <span>Tìm lại chỗ nghỉ</span>
                      </button>

                      <button
                        type="button"
                        className="my-bookings-compact-btn-secondary"
                        onClick={() => handleOpenRefundReceipt(booking)}
                      >
                        <ReceiptRefundIcon width="13" height="13" />
                        <span>Biên lai hoàn tiền</span>
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {/* ─── 4. BOTTOM 24/7 SUPPORT BANNER ────────────────────────────── */}
        <div className="my-bookings-support-banner">
          <div className="my-bookings-support-left">
            <div className="my-bookings-support-icon-wrap">
              <ConciergeBellIcon width="26" height="26" />
            </div>
            <div className="my-bookings-support-text">
              <h4 className="my-bookings-support-title">
                Cần trợ giúp đặc biệt cho chuyến đi sắp tới?
              </h4>
              <p className="my-bookings-support-desc">
                Đội ngũ hỗ trợ &amp; lễ tân Avora túc trực 24/7 qua điện thoại, ứng dụng và trung tâm trợ giúp nhanh.
              </p>
            </div>
          </div>

          <div className="my-bookings-support-actions">
            <button
              type="button"
              className="my-bookings-btn-chat"
              onClick={() => {
                const chatWidgetBtn = document.querySelector('.ai-chat-bubble-toggle');
                if (chatWidgetBtn) {
                  chatWidgetBtn.click();
                } else {
                  alert('Đang kết nối tổng đài viên trực tuyến...');
                }
              }}
            >
              <ChatSupportIcon width="16" height="16" />
              <span>Chat với CSKH</span>
            </button>

            <a href="tel:19006868" className="my-bookings-btn-call" style={{ textDecoration: 'none' }}>
              <PhoneCallIcon width="16" height="16" />
              <span>Gọi 1900 6868</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: CHI TIẾT VOUCHER / E-TICKET ───────────────────────── */}
      {selectedBookingForVoucher && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setSelectedBookingForVoucher(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card my-bookings-modal-card--lg" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <VoucherIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Voucher Điện Tử (E-Ticket)</h3>
                  <span className="my-bookings-modal-subtitle">
                    Mã đặt chỗ: {voucherData?.booking_code || selectedBookingForVoucher?.booking_code} • Xuất trình khi làm thủ tục nhận phòng
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setSelectedBookingForVoucher(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="my-bookings-modal-body">
              {voucherLoading ? (
                <div className="my-bookings-modal-loading">
                  <div className="my-bookings-spinner" />
                  <p>Đang khởi tạo voucher điện tử từ hệ thống...</p>
                </div>
              ) : (
                <>
                  <div className="voucher-ticket-box">
                    <div className="voucher-ticket-label">
                      MÃ ĐẶT CHỖ ĐIỆN TỬ (E-TICKET)
                    </div>
                    <div className="voucher-ticket-code">
                      {voucherData?.booking_code || selectedBookingForVoucher?.booking_code}
                    </div>

                    <div className="voucher-ticket-qr">
                      <svg width="116" height="116" viewBox="0 0 100 100" fill="currentColor">
                        {/* Top-Left Finder */}
                        <rect x="4" y="4" width="28" height="28" rx="3" fill="#003580" />
                        <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                        <rect x="13" y="13" width="10" height="10" rx="1.5" fill="#003580" />

                        {/* Top-Right Finder */}
                        <rect x="68" y="4" width="28" height="28" rx="3" fill="#003580" />
                        <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                        <rect x="77" y="13" width="10" height="10" rx="1.5" fill="#003580" />

                        {/* Bottom-Left Finder */}
                        <rect x="4" y="68" width="28" height="28" rx="3" fill="#003580" />
                        <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                        <rect x="13" y="77" width="10" height="10" rx="1.5" fill="#003580" />

                        {/* Timing Patterns */}
                        <rect x="36" y="8" width="4" height="4" fill="#003580" />
                        <rect x="44" y="8" width="4" height="4" fill="#003580" />
                        <rect x="52" y="8" width="4" height="4" fill="#003580" />
                        <rect x="60" y="8" width="4" height="4" fill="#003580" />
                        <rect x="8" y="36" width="4" height="4" fill="#003580" />
                        <rect x="8" y="44" width="4" height="4" fill="#003580" />
                        <rect x="8" y="52" width="4" height="4" fill="#003580" />
                        <rect x="8" y="60" width="4" height="4" fill="#003580" />

                        {/* QR Data Matrix Cells */}
                        <rect x="36" y="20" width="8" height="8" fill="#003580" />
                        <rect x="52" y="20" width="4" height="12" fill="#003580" />
                        <rect x="60" y="28" width="4" height="4" fill="#003580" />
                        <rect x="20" y="36" width="8" height="8" fill="#003580" />
                        <rect x="36" y="36" width="12" height="4" fill="#003580" />
                        <rect x="56" y="40" width="12" height="4" fill="#003580" />
                        <rect x="76" y="36" width="8" height="4" fill="#003580" />
                        <rect x="88" y="40" width="8" height="8" fill="#003580" />
                        <rect x="20" y="52" width="4" height="12" fill="#003580" />
                        <rect x="36" y="48" width="8" height="16" fill="#003580" />
                        <rect x="52" y="52" width="12" height="8" fill="#003580" />
                        <rect x="72" y="48" width="12" height="8" fill="#003580" />
                        <rect x="88" y="60" width="8" height="4" fill="#003580" />
                        <rect x="36" y="72" width="12" height="4" fill="#003580" />
                        <rect x="56" y="68" width="8" height="12" fill="#003580" />
                        <rect x="72" y="68" width="8" height="8" fill="#003580" />
                        <rect x="84" y="76" width="12" height="4" fill="#003580" />
                        <rect x="40" y="84" width="8" height="12" fill="#003580" />
                        <rect x="56" y="88" width="12" height="8" fill="#003580" />
                        <rect x="76" y="84" width="8" height="12" fill="#003580" />
                        <rect x="88" y="88" width="8" height="8" fill="#003580" />
                      </svg>
                    </div>

                    {voucherData?.coupon_code && (
                      <div className="voucher-ticket-coupon" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <TagDiscountIcon width="14" height="14" />
                        <span>Mã giảm giá đã áp dụng: <strong>{voucherData.coupon_code}</strong> ({voucherData.discount_text})</span>
                      </div>
                    )}
                  </div>

                  <table className="voucher-info-table">
                    <tbody>
                      <tr>
                        <td>Mã đặt chỗ:</td>
                        <td>
                          <span className="voucher-code-pill">
                            {voucherData?.booking_code || selectedBookingForVoucher?.booking_code}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Ngày đặt phòng:</td>
                        <td>
                          <strong>{voucherData?.booking_date || selectedBookingForVoucher?.booking_date_formatted}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>Mã Coupon:</td>
                        <td>
                          {voucherData?.coupon_code ? (
                            <span className="voucher-coupon-pill">
                              {voucherData.coupon_code} ({voucherData.discount_text})
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>Không áp dụng mã giảm giá</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Khách sạn:</td>
                        <td><strong>{voucherData?.hotel_name}</strong></td>
                      </tr>
                      <tr>
                        <td>Địa chỉ:</td>
                        <td>{voucherData?.hotel_address}</td>
                      </tr>
                      <tr>
                        <td>Họ tên khách:</td>
                        <td><strong>{voucherData?.guest_name}</strong></td>
                      </tr>
                      <tr>
                        <td>Số điện thoại:</td>
                        <td>{voucherData?.guest_phone}</td>
                      </tr>
                      <tr>
                        <td>Loại phòng:</td>
                        <td>{voucherData?.room_type}</td>
                      </tr>
                      <tr>
                        <td>Nhận phòng:</td>
                        <td>{voucherData?.check_in_date}</td>
                      </tr>
                      <tr>
                        <td>Trả phòng:</td>
                        <td>{voucherData?.check_out_date}</td>
                      </tr>
                      <tr>
                        <td>Trạng thái đơn:</td>
                        <td>
                          <span style={{ color: selectedBookingForVoucher?.status_badge_variant === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 700 }}>
                            {selectedBookingForVoucher?.status_name}
                          </span>{' '}
                        </td>
                      </tr>
                      <tr>
                        <td>Tổng tiền đơn:</td>
                        <td>
                          <span style={{ color: '#059669', fontSize: 15, fontWeight: 700 }}>
                            {formatVnd(voucherData?.total_amount)}
                          </span>{' '}
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                            {voucherData?.is_paid ? '(Đã có giao dịch thanh toán)' : '(Chưa thanh toán trực tuyến)'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="voucher-tip-box">
                    <InfoCircleIcon width="18" height="18" />
                    <div>
                      <strong>Hướng dẫn nhận phòng:</strong> Quý khách chỉ cần xuất trình mã QR trên màn hình điện thoại hoặc cung cấp mã voucher tại quầy lễ tân khi làm thủ tục nhận phòng.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="my-bookings-modal-footer">
              <button
                type="button"
                className="my-bookings-btn-secondary"
                onClick={() => window.print()}
              >
                <PrinterIcon width="15" height="15" />
                <span>In vé / Tải PDF</span>
              </button>
              <button
                type="button"
                className="my-bookings-btn-primary"
                onClick={() => setSelectedBookingForVoucher(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CẬP NHẬT THÔNG TIN GUEST ─────────────────────────── */}
      {editGuestModalBooking && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setEditGuestModalBooking(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <GuestEditIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Cập nhật thông tin nhận phòng</h3>
                  <span className="my-bookings-modal-subtitle">
                    Đơn: {editGuestModalBooking.booking_code} • {editGuestModalBooking.hotel?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setEditGuestModalBooking(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGuestInfo}>
              <div className="my-bookings-modal-body">
                <p className="my-bookings-modal-intro">
                  Thay đổi người nhận phòng hoặc gửi thêm yêu cầu đặc biệt đến cơ sở lưu trú <strong>{editGuestModalBooking.hotel.name}</strong>.
                </p>

                <div className="modal-form-group">
                  <label className="modal-form-label">
                    Họ và tên khách nhận phòng <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    value={editGuestForm.guest_name}
                    onChange={(e) => setEditGuestForm({ ...editGuestForm, guest_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">
                    Số điện thoại liên lạc <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="modal-form-input"
                    value={editGuestForm.guest_phone}
                    onChange={(e) => setEditGuestForm({ ...editGuestForm, guest_phone: e.target.value })}
                    placeholder="VD: 0912345678"
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">Yêu cầu đặc biệt gửi khách sạn</label>
                  <textarea
                    rows="3"
                    className="modal-form-textarea"
                    placeholder="Ví dụ: Giường đôi, tầng cao, nhận phòng muộn sau 18:00..."
                    value={editGuestForm.special_request}
                    onChange={(e) => setEditGuestForm({ ...editGuestForm, special_request: e.target.value })}
                  />
                </div>
              </div>

              <div className="my-bookings-modal-footer">
                <button
                  type="button"
                  className="my-bookings-btn-secondary"
                  onClick={() => setEditGuestModalBooking(null)}
                  disabled={isUpdatingGuest}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="my-bookings-btn-primary"
                  disabled={isUpdatingGuest}
                >
                  {isUpdatingGuest ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ĐỔI NGÀY LƯU TRÚ ─────────────────────────────────── */}
      {dateChangeModalBooking && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setDateChangeModalBooking(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <CalendarEditIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Đổi ngày nhận / trả phòng</h3>
                  <span className="my-bookings-modal-subtitle">
                    Đơn: {dateChangeModalBooking.booking_code} • {dateChangeModalBooking.hotel?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setDateChangeModalBooking(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDateChange}>
              <div className="my-bookings-modal-body">
                <p className="my-bookings-modal-intro">
                  Thay đổi ngày lưu trú cho đơn <strong>{dateChangeModalBooking.booking_code}</strong> tại {dateChangeModalBooking.hotel.name}.
                </p>

                <div className="modal-form-grid-2">
                  <div className="modal-form-group">
                    <label className="modal-form-label">
                      Ngày nhận phòng mới <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="modal-form-input"
                      value={newCheckIn}
                      onChange={(e) => setNewCheckIn(e.target.value)}
                    />
                  </div>

                  <div className="modal-form-group">
                    <label className="modal-form-label">
                      Ngày trả phòng mới <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="modal-form-input"
                      value={newCheckOut}
                      onChange={(e) => setNewCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                <div className="date-change-notice-box">
                  <ShieldCheckIcon width="18" height="18" />
                  <div>
                    <strong>Chính sách linh hoạt Avora:</strong> Ngày lưu trú mới cần nằm trong khung thời gian phòng còn trống tại khách sạn.
                  </div>
                </div>
              </div>

              <div className="my-bookings-modal-footer">
                <button
                  type="button"
                  className="my-bookings-btn-secondary"
                  onClick={() => setDateChangeModalBooking(null)}
                  disabled={isChangingDates}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="my-bookings-btn-primary"
                  disabled={isChangingDates}
                >
                  {isChangingDates ? 'Đang cập nhật...' : 'Xác nhận đổi ngày'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: HỦY ĐẶT PHÒNG ───────────────────────────────────── */}
      {cancelModalBooking && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setCancelModalBooking(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header my-bookings-modal-header--danger">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <AlertTriangleIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Xác nhận hủy đặt phòng</h3>
                  <span className="my-bookings-modal-subtitle">
                    Đơn: {cancelModalBooking.booking_code} • {cancelModalBooking.hotel?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setCancelModalBooking(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="my-bookings-modal-body">
              <p className="my-bookings-modal-intro" style={{ color: '#1e293b' }}>
                Bạn có chắc chắn muốn hủy đơn đặt phòng tại <strong>{cancelModalBooking.hotel.name}</strong> không?
              </p>

              <div className="cancel-policy-card">
                <div className="cancel-policy-header">
                  <span>Chính sách hoàn hủy từ hệ thống:</span>
                  <span className="cancel-policy-badge">
                    {cancelModalBooking.cancellation?.refund_percentage ?? 100}% hoàn tiền
                  </span>
                </div>
                <div className="cancel-policy-note">
                  {cancelModalBooking.cancellation?.policy_note}
                </div>
                <div className="cancel-policy-refund">
                  <span>Số tiền hoàn dự kiến:</span>
                  <strong className="cancel-policy-refund-val">
                    {formatVnd(
                      cancelModalBooking.cancellation?.estimated_refund_amount ??
                      cancelModalBooking.total_amount
                    )}
                  </strong>
                </div>
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">
                  Lý do hủy phòng <span className="req">*</span>
                </label>
                <select
                  className="modal-form-select"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="Khách thay đổi kế hoạch chuyến đi">Thay đổi kế hoạch chuyến đi</option>
                  <option value="Tìm thấy khách sạn / phòng khác tốt hơn">Tìm thấy chỗ nghỉ khác phù hợp hơn</option>
                  <option value="Lý do cá nhân hoặc công việc đột xuất">Lý do sức khỏe / công việc đột xuất</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>
            </div>

            <div className="my-bookings-modal-footer">
              <button
                type="button"
                className="my-bookings-btn-secondary"
                onClick={() => setCancelModalBooking(null)}
                disabled={isCancelling}
              >
                Giữ lại phòng
              </button>
              <button
                type="button"
                className="my-bookings-btn-danger-solid"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                <CalendarCancelIcon width="15" height="15" />
                <span>{isCancelling ? 'Đang xử lý hủy...' : 'Xác nhận hủy phòng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: HÓA ĐƠN VAT ĐIỆN TỬ ─────────────────────────────── */}
      {invoiceModalBooking && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setInvoiceModalBooking(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card my-bookings-modal-card--lg" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <FolioInvoiceIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Biên Nhận & Hóa Đơn Điện Tử</h3>
                  <span className="my-bookings-modal-subtitle">
                    Đơn: {invoiceModalBooking.booking_code} • Khách sạn {invoiceModalBooking.hotel?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setInvoiceModalBooking(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="my-bookings-modal-body">
              {!invoiceData ? (
                <div className="my-bookings-modal-loading">
                  <div className="my-bookings-spinner" />
                  <p>Đang tải dữ liệu biên nhận từ hệ thống...</p>
                </div>
              ) : (
                <>
                  <div className="invoice-meta-card">
                    <div className="invoice-meta-row">
                      <span className="invoice-meta-label">MÃ CHỨNG TỪ:</span>
                      <strong className="invoice-meta-code">{invoiceData.invoice_number}</strong>
                    </div>
                    <div className="invoice-meta-row">
                      <span className="invoice-meta-label">MÃ BOOKING TRA CỨU:</span>
                      <span className="invoice-meta-val" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {invoiceData.lookup_code}
                      </span>
                    </div>
                    <div className="invoice-meta-row">
                      <span className="invoice-meta-label">TRẠNG THÁI:</span>
                      <span className="invoice-status-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircleIcon width="13" height="13" />
                        <span>{invoiceData.invoice_status}</span>
                      </span>
                    </div>
                  </div>

                  <table className="voucher-info-table">
                    <tbody>
                      <tr>
                        <td>Khách sạn lưu trú:</td>
                        <td><strong>{invoiceData.hotel_name}</strong></td>
                      </tr>
                      <tr>
                        <td>Địa chỉ khách sạn:</td>
                        <td>{invoiceData.hotel_address}</td>
                      </tr>
                      <tr>
                        <td>Khách nhận phòng:</td>
                        <td><strong>{invoiceData.buyer_name}</strong> ({invoiceData.buyer_phone})</td>
                      </tr>
                      <tr>
                        <td>Ngày tạo đơn:</td>
                        <td>{invoiceData.issued_date}</td>
                      </tr>
                      <tr>
                        <td>Tạm tính tiền phòng:</td>
                        <td>{formatVnd(invoiceData.subtotal)}</td>
                      </tr>
                      <tr>
                        <td>Giảm giá (Coupon):</td>
                        <td>
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            -{formatVnd(invoiceData.discount_amount)}
                            {invoiceData.coupon_code ? ` (${invoiceData.coupon_code})` : ''}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Tổng tiền đơn đặt phòng:</td>
                        <td>
                          <span style={{ color: '#059669', fontSize: 16, fontWeight: 800 }}>
                            {formatVnd(invoiceData.total_amount)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="my-bookings-modal-footer">
              <button
                type="button"
                className="my-bookings-btn-secondary"
                onClick={() => alert(`Tải file PDF hóa đơn: ${invoiceData?.invoice_number}`)}
              >
                <DownloadIcon width="15" height="15" />
                <span>Tải file PDF hóa đơn</span>
              </button>
              <button
                type="button"
                className="my-bookings-btn-primary"
                onClick={() => setInvoiceModalBooking(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: BIÊN LAI HOÀN TIỀN ──────────────────────────────── */}
      {refundModalData && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setRefundModalData(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <ReceiptRefundIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Biên Lai Hoàn Tiền Giao Dịch</h3>
                  <span className="my-bookings-modal-subtitle">
                    {refundModalData.booking_code ? `Đơn ${refundModalData.booking_code} • ` : ''}Chi tiết hoàn tiền từ cổng thanh toán
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setRefundModalData(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="my-bookings-modal-body">
              <div className="refund-summary-hero">
                <div className="refund-check-circle">
                  <CheckIcon width="26" height="26" />
                </div>
                <h4 className="refund-summary-title">
                  {refundModalData.refund_status_label || `Trạng thái: ${refundModalData.refund_status_cd}`}
                </h4>
                <div className="refund-summary-amount">
                  {formatVnd(refundModalData.refund_amount)}
                </div>
              </div>

              <table className="voucher-info-table">
                <tbody>
                  <tr>
                    <td>Mã yêu cầu hoàn:</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{refundModalData.refund_id || '—'}</td>
                  </tr>
                  <tr>
                    <td>Mã giao dịch hoàn:</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{refundModalData.gateway_refund_ref || 'Chưa có'}</td>
                  </tr>
                  <tr>
                    <td>Trạng thái hoàn tiền:</td>
                    <td>
                      <span className="refund-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircleIcon width="13" height="13" />
                        <span>{refundModalData.refund_status_label || refundModalData.refund_status_name || 'Đang xử lý'}</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Lý do &amp; Ghi chú:</td>
                    <td>{refundModalData.reason || '—'}</td>
                  </tr>
                  <tr>
                    <td>Thời gian tạo yêu cầu:</td>
                    <td>
                      {refundModalData.created_at
                        ? new Date(refundModalData.created_at).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="my-bookings-modal-footer">
              <button
                type="button"
                className="my-bookings-btn-primary"
                onClick={() => setRefundModalData(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: GALLERY ẢNH THỰC TẾ ─────────────────────────────── */}
      {galleryModalImages && (
        <div
          className="my-bookings-modal-overlay"
          onClick={() => setGalleryModalImages(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="my-bookings-modal-card my-bookings-modal-card--gallery" onClick={(e) => e.stopPropagation()}>
            <div className="my-bookings-modal-header">
              <div className="my-bookings-modal-header-left">
                <div className="my-bookings-modal-header-icon" aria-hidden="true">
                  <CameraIcon width="22" height="22" />
                </div>
                <div className="my-bookings-modal-title-wrap">
                  <h3 className="my-bookings-modal-title">Bộ Sưu Tập Ảnh Thực Tế Chỗ Nghỉ</h3>
                  <span className="my-bookings-modal-subtitle">
                    {galleryModalImages.length} hình ảnh thực tế phòng & cơ sở lưu trú
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="my-bookings-modal-close-btn"
                onClick={() => setGalleryModalImages(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="my-bookings-modal-body">
              {galleryModalImages.length === 0 ? (
                <div className="gallery-empty-state">
                  <div className="gallery-empty-icon">
                    <CameraIcon width="40" height="40" />
                  </div>
                  <p className="gallery-empty-title">Chưa có hình ảnh được lưu trong hệ thống</p>
                  <p className="gallery-empty-desc">Dữ liệu ảnh thực tế đang được khách sạn cập nhật</p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {galleryModalImages.map((url, i) => (
                    <div key={i} className="gallery-grid-item">
                      <img
                        src={url}
                        alt={`Ảnh thực tế ${i + 1}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="my-bookings-modal-footer">
              <button
                type="button"
                className="my-bookings-btn-primary"
                onClick={() => setGalleryModalImages(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
