import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GeniusBanner from '../components/GeniusBanner';
import ContactInfoCard from '../components/ContactInfoCard';
import SelectedRoomCard from '../components/SelectedRoomCard';
import SpecialRequestsCard from '../components/SpecialRequestsCard';
import OrderSummarySidebar from '../components/OrderSummarySidebar';
import BookingSuccessModal from '../components/BookingSuccessModal';
import BookingErrorModal from '../components/BookingErrorModal';
import { calculateBookingPricing, createBooking } from '../../../services/bookingApi';
import { useAuth } from '../../../context/AuthContext';
import './booking.css';

/**
 * Main Booking Checkout Page.
 * 100% database-driven hotel, room, pricing, cancellation policy, and coupon validation.
 */
const BookingPage = () => {
  const { id: routeParamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const stateData = location.state || {};
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [errorMessage, setErrorMessage] = useState(null);

  const getBookingErrorMessage = (error) => {
    if (error?.code === 'SOLD_OUT') {
      const dates = error.message.match(/đêm:\s*(.+)\.$/i)?.[1];
      const formattedDates = dates
        ? dates.split(',').map((date) => {
          const [year, month, day] = date.trim().split('-');
          return day && month && year ? `${day}/${month}/${year}` : date.trim();
        }).join(', ')
        : null;

      return formattedDates
        ? `Rất tiếc, phòng đã hết cho đêm ${formattedDates}. Vui lòng chọn ngày khác hoặc giảm số phòng.`
        : 'Rất tiếc, phòng đã hết trong thời gian bạn chọn. Vui lòng chọn ngày khác hoặc giảm số phòng.';
    }

    return error?.message || 'Không thể hoàn tất đơn đặt phòng. Vui lòng thử lại.';
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = dayNames[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Real-time helper producing exact YYYY-MM-DD in local time
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDateOnly = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const addDaysToDateString = (dateStr, days = 1) => {
    const d = parseLocalDateOnly(dateStr);
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
  };

  const MAX_STAY_NIGHTS = 30; // Tiêu chuẩn OTA: đặt trực tuyến tối đa 30 đêm
  const MAX_ADVANCE_DAYS = 365; // Đặt phòng trước tối đa 365 ngày (1 năm)
  const MAX_ROOMS_PER_BOOKING = 8; // Tối đa 8 phòng/lần đặt (tránh đầu cơ)
  const GUEST_NAME_REGEX = /^\p{L}[\p{L}\p{M}]*(?:(?:\p{Zs}+|['\u2019.-])\p{L}[\p{L}\p{M}]*)*$/u;

  // Real-time current day (cannot book earlier than today)
  const todayStr = useMemo(() => {
    return getLocalDateString(new Date());
  }, []);

  const defaultCheckIn = todayStr;

  // Strict initial dates: reject any past dates passed from router state / query params
  const initialCheckIn = useMemo(() => {
    const raw = stateData.checkIn || queryParams.get('checkIn');
    if (raw && raw >= todayStr) return raw;
    return defaultCheckIn;
  }, [stateData.checkIn, queryParams, defaultCheckIn, todayStr]);

  const initialCheckOut = useMemo(() => {
    const raw = stateData.checkOut || queryParams.get('checkOut');
    const minOutStr = addDaysToDateString(initialCheckIn, 1);
    if (raw && raw > initialCheckIn) return raw;
    return minOutStr;
  }, [stateData.checkOut, queryParams, initialCheckIn]);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);

  const maxCheckInStr = useMemo(() => {
    return addDaysToDateString(todayStr, MAX_ADVANCE_DAYS);
  }, [todayStr]);

  const minCheckOutStr = useMemo(() => {
    if (!checkInDate) return todayStr;
    return addDaysToDateString(checkInDate, 1);
  }, [checkInDate, todayStr]);

  const maxCheckOutStr = useMemo(() => {
    if (!checkInDate) return addDaysToDateString(todayStr, MAX_STAY_NIGHTS);
    return addDaysToDateString(checkInDate, MAX_STAY_NIGHTS);
  }, [checkInDate, todayStr]);

  const handleCheckInChange = (newDate) => {
    if (!newDate) return;
    // Strict check: absolutely no past dates allowed
    if (newDate < todayStr) {
      setErrorMessage(`Không được chọn ngày trong quá khứ! Ngày nhận phòng sớm nhất là hôm nay (${formatDateLabel(todayStr)}).`);
      setCheckInDate(todayStr);
      return;
    }
    if (newDate > maxCheckInStr) {
      setErrorMessage(`Chỉ hỗ trợ đặt phòng trước tối đa ${MAX_ADVANCE_DAYS} ngày.`);
      setCheckInDate(maxCheckInStr);
      return;
    }
    setErrorMessage(null);
    setCheckInDate(newDate);

    // If checkOut <= checkIn, automatically shift checkOut to checkIn + 1 day
    if (checkOutDate <= newDate) {
      setCheckOutDate(addDaysToDateString(newDate, 1));
    } else {
      const allowedMaxOut = addDaysToDateString(newDate, MAX_STAY_NIGHTS);
      if (checkOutDate > allowedMaxOut) {
        setCheckOutDate(allowedMaxOut);
      }
    }
  };

  const handleCheckOutChange = (newDate) => {
    if (!newDate) return;
    if (newDate <= checkInDate) {
      setErrorMessage('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      setCheckOutDate(addDaysToDateString(checkInDate, 1));
      return;
    }
    const currentMaxOut = addDaysToDateString(checkInDate, MAX_STAY_NIGHTS);
    if (newDate > currentMaxOut) {
      setErrorMessage(`Thời gian lưu trú tối đa cho mỗi đơn đặt phòng trực tuyến là ${MAX_STAY_NIGHTS} đêm. Vui lòng liên hệ để đặt phòng dài hạn.`);
      setCheckOutDate(currentMaxOut);
      return;
    }
    setErrorMessage(null);
    setCheckOutDate(newDate);
  };
  const roomsCount = Math.max(
    1,
    Number(stateData.roomsCount || stateData.quantity || queryParams.get('rooms')) || 1
  );

  const initialHotelId =
    stateData.hotel?.hotel_id || queryParams.get('hotelId') || routeParamId || null;
  const initialRoomTypeId =
    stateData.room?.room_type_id || queryParams.get('roomTypeId') || null;

  // Contact Info Form State (synced from logged-in user, empty if guest)
  const [contactForm, setContactForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    countryCode: '+84',
  });

  useEffect(() => {
    if (user) {
      const nameParts = String(user.full_name || '').trim().split(/\s+/).filter(Boolean);
      const parsedLastName =
        nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '';
      const parsedFirstName =
        nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      setContactForm((prev) => ({
        ...prev,
        lastName: prev.lastName || parsedLastName,
        firstName: prev.firstName || parsedFirstName,
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  // Special Requests State (not pre-filled with hardcoded notes)
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [customNote, setCustomNote] = useState('');

  const handleToggleRequest = (item) => {
    setSelectedRequests((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  // Coupon & Pricing State loaded from DB
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);

  const [pricing, setPricing] = useState({
    hotel_id: initialHotelId,
    hotel: stateData.hotel
      ? {
        hotel_id: stateData.hotel.hotel_id,
        name: stateData.hotel.name,
        address: stateData.hotel.address || stateData.hotel.full_address || '',
        star_quality: stateData.hotel.star_quality,
        rating_score: stateData.hotel.rating_score ?? stateData.hotel.star_rating,
        review_count: stateData.hotel.review_count ?? stateData.hotel.reviews_count ?? 0,
        thumbnail_url:
          stateData.hotel.thumbnail_url ||
          (Array.isArray(stateData.hotel.images) && stateData.hotel.images[0]) ||
          stateData.hotel.thumbnail ||
          '',
      }
      : null,
    nights: 1,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    subtotal: 0,
    discount_amount: 0,
    total_amount: 0,
    coupon: null,
    available_coupons: [],
    cancellation_policy: stateData.hotel?.cancellation_policy || null,
    rooms: stateData.room
      ? [
        {
          room_type_id: stateData.room.room_type_id,
          type_name: stateData.room.type_name || stateData.room.name,
          bed_type: stateData.room.bed_type || '',
          room_size: stateData.room.room_size || '',
          max_adults: stateData.room.max_adults ?? 2,
          max_children: stateData.room.max_children ?? 0,
          unit_price: Number(stateData.room.price || stateData.room.default_price || 0),
          quantity: roomsCount,
          facilities: [],
        },
      ]
      : [],
  });


  const activeCouponRef = useRef('');
  activeCouponRef.current = couponCode;

  // Fetch real hotel, room, pricing, cancellation policy & active coupons from DB
  const syncBookingPricing = useCallback(
    async (codeOverride) => {
      const codeToApply = codeOverride !== undefined ? codeOverride : activeCouponRef.current;
      setIsApplyingCoupon(true);
      try {
        const res = await calculateBookingPricing({
          hotel_id: initialHotelId,
          room_type_id: initialRoomTypeId,
          quantity: roomsCount,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          coupon_code: codeToApply && codeToApply.trim() ? codeToApply.trim() : undefined,
        });

        setPricing(res);
        if (codeToApply && codeToApply.trim()) {
          setCouponMessage(res.coupon_message || null);
        } else {
          setCouponMessage(null);
        }
      } catch (err) {
        console.warn('[BookingPage] Không thể đồng bộ biểu giá:', err.message);
        if (!stateData.hotel && !pricing.hotel) {
          setErrorMessage(err.message || 'Không thể tải thông tin giá phòng. Vui lòng thử lại.');
        }
      } finally {
        setIsApplyingCoupon(false);
        setIsLoadingPricing(false);
      }
    },
    [initialHotelId, initialRoomTypeId, roomsCount, checkInDate, checkOutDate]
  );

  useEffect(() => {
    syncBookingPricing();
  }, [syncBookingPricing]);

  const handleApplyCoupon = async (overrideCode) => {
    const targetCode = typeof overrideCode === 'string' ? overrideCode : couponCode;
    if (!targetCode || !targetCode.trim()) return;
    const cleanCode = targetCode.trim().toUpperCase();
    setCouponCode(cleanCode);
    await syncBookingPricing(cleanCode);
  };

  const handleRemoveCoupon = async () => {
    setCouponCode('');
    setCouponMessage(null);
    await syncBookingPricing('');
  };

  const activeHotel = pricing.hotel || stateData.hotel || null;
  const activeRoom = pricing.rooms?.[0] || stateData.room || null;
  const nights = pricing.nights || 1;

  // Submit Booking State with double-click guard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [createdBookingResult, setCreatedBookingResult] = useState(null);

  const handleConfirmBooking = async () => {
    // Chặn triệt để double-click ngay lập tức
    if (isSubmittingRef.current || isSubmitting) return;

    setErrorMessage(null);

    if (!contactForm.lastName.trim() && !contactForm.firstName.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ và Tên người nhận phòng.');
      return;
    }
    if (!contactForm.phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (!activeHotel?.hotel_id || !activeRoom?.room_type_id) {
      setErrorMessage('Không tìm thấy thông tin khách sạn hoặc hạng phòng hợp lệ.');
      return;
    }

    // Strict real-time check before submission
    if (checkInDate < todayStr) {
      setErrorMessage('Ngày nhận phòng không hợp lệ: Không được chọn ngày trong quá khứ.');
      return;
    }
    if (checkOutDate <= checkInDate) {
      setErrorMessage('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      return;
    }

    const fullName = [contactForm.lastName.trim(), contactForm.firstName.trim()]
      .filter(Boolean)
      .join(' ');

    if (
      !GUEST_NAME_REGEX.test(fullName) ||
      (fullName.match(/\p{L}/gu) || []).length < 2 ||
      fullName.length > 100
    ) {
      setErrorMessage('Họ và tên người nhận phòng phải có ít nhất 2 chữ cái, tối đa 100 ký tự; chỉ dùng chữ cái, khoảng trắng, dấu nháy đơn, dấu gạch nối hoặc dấu chấm.');
      return;
    }

    if (roomsCount > MAX_ROOMS_PER_BOOKING) {
      setErrorMessage(`Số lượng phòng tối đa cho mỗi đơn đặt phòng trực tuyến là ${MAX_ROOMS_PER_BOOKING} phòng. Để đặt số lượng lớn hơn, vui lòng liên hệ dịch vụ khách đoàn.`);
      return;
    }

    // Khóa cờ ngay lập tức trước khi thực hiện bất kỳ tác vụ bất đồng bộ nào
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const rawDigits = contactForm.phone.replace(/[^\d]/g, '');
    let fullPhone = '';
    const selectedCode = (contactForm.countryCode || '+84').trim();

    if (selectedCode === '+84') {
      let vnDigits = rawDigits;
      if (vnDigits.startsWith('84') && vnDigits.length > 9) {
        vnDigits = vnDigits.slice(2);
      }
      vnDigits = vnDigits.replace(/^0+/, '');
      fullPhone = vnDigits ? `0${vnDigits}` : contactForm.phone.trim();
    } else {
      const intlDigits = rawDigits.replace(/^0+/, '');
      fullPhone = intlDigits ? `${selectedCode}${intlDigits}` : contactForm.phone.trim();
    }

    const combinedSpecialRequest = [
      ...selectedRequests,
      customNote.trim(),
    ].filter(Boolean).join('; ') || null;

    const bookingPayload = {
      hotel_id: activeHotel.hotel_id,
      room_type_id: activeRoom.room_type_id,
      quantity: roomsCount,
      rooms: (pricing.rooms || []).map((r) => ({
        room_type_id: r.room_type_id,
        quantity: r.quantity || roomsCount,
      })),
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      guest_name: fullName,
      guest_phone: fullPhone,
      special_request: combinedSpecialRequest,
      coupon_code: pricing.coupon?.code || null,
    };

    try {
      const res = await createBooking(bookingPayload);
      setCreatedBookingResult(res);
    } catch (err) {
      setErrorMessage(getBookingErrorMessage(err));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="booking-page-container" role="status">Đang kiểm tra đăng nhập...</div>;
  }

  if (!user) {
    return (
      <div className="booking-page-container">
        <section className="booking-auth-required" role="status">
          <h1>Vui lòng đăng nhập để đặt phòng</h1>
          <p>Bạn cần đăng nhập trước khi tiếp tục hoàn tất đặt phòng.</p>
          <button type="button" onClick={() => navigate('/signin')}>
            Đăng nhập
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="booking-page-container">
      {/* Stepper Breadcrumbs */}
      <div className="booking-stepper">
        <div className="booking-step-item completed">
          <span className="booking-step-badge">✓</span>
          <span>1. Chọn phòng</span>
        </div>
        <span className="booking-step-divider">›</span>
        <div className="booking-step-item active">
          <span className="booking-step-badge">2</span>
          <span>2. Thông tin khách &amp; Đặt phòng</span>
        </div>
        <span className="booking-step-divider">›</span>
        <div className="booking-step-item">
          <span className="booking-step-badge">3</span>
          <span>3. Quản lý đặt chỗ</span>
        </div>
      </div>

      {isLoadingPricing && !activeHotel ? (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#475569' }}>
          Đang tải thông tin phòng và bảng giá...
        </div>
      ) : (
        <div className="booking-layout-grid">
          {/* Left Column: Form & Details */}
          <div className="booking-main-col">
            {/* 1. User & Active Coupons Banner */}
            <GeniusBanner
              user={user}
              availableCoupons={pricing.available_coupons}
            />

            {/* 3. Contact Information Card */}
            <ContactInfoCard form={contactForm} onChange={handleContactChange} />
            {/* 4. Selected Room Details Card */}
            <SelectedRoomCard
              room={activeRoom}
              quantity={roomsCount}
            />

            {/* 5. Special Requests Card */}
            <SpecialRequestsCard
              hotelName={activeHotel?.name || 'chỗ nghỉ'}
              selectedRequests={selectedRequests}
              onToggleRequest={handleToggleRequest}
              customNote={customNote}
              onNoteChange={(e) => setCustomNote(e.target.value)}
            />

          </div>

          {/* Right Column: Order Summary Sidebar (Sticky) */}
          <OrderSummarySidebar
            hotel={activeHotel}
            pricing={pricing}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onCheckInChange={handleCheckInChange}
            onCheckOutChange={handleCheckOutChange}
            minCheckIn={todayStr}
            maxCheckIn={maxCheckInStr}
            minCheckOut={minCheckOutStr}
            maxCheckOut={maxCheckOutStr}
            nights={nights}
            couponCode={couponCode}
            onCouponChange={setCouponCode}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            isApplyingCoupon={isApplyingCoupon}
            couponMessage={couponMessage}
            onConfirmBooking={handleConfirmBooking}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Success Modal */}
      {createdBookingResult && (
        <BookingSuccessModal
          bookingData={createdBookingResult}
          onClose={() => {
            setCreatedBookingResult(null);
            navigate('/my-bookings');
          }}
          onViewMyBookings={() => {
            navigate('/my-bookings');
          }}
        />
      )}
      <BookingErrorModal
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </div>
  );
};

export default BookingPage;
