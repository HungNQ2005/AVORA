import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GeniusBanner from '../components/GeniusBanner';
import ContactInfoCard from '../components/ContactInfoCard';
import SelectedRoomCard from '../components/SelectedRoomCard';
import SpecialRequestsCard from '../components/SpecialRequestsCard';
import OrderSummarySidebar from '../components/OrderSummarySidebar';
import BookingSuccessModal from '../components/BookingSuccessModal';
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

  // Real-time current day (cannot book earlier than today)
  const todayStr = useMemo(() => {
    return getLocalDateString(new Date());
  }, []);

  const defaultCheckIn = todayStr;

  const defaultCheckOut = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }, []);

  // Strict initial dates: reject any past dates passed from router state / query params
  const initialCheckIn = useMemo(() => {
    const raw = stateData.checkIn || queryParams.get('checkIn');
    if (raw && raw >= todayStr) return raw;
    return defaultCheckIn;
  }, [stateData.checkIn, queryParams, defaultCheckIn, todayStr]);

  const initialCheckOut = useMemo(() => {
    const raw = stateData.checkOut || queryParams.get('checkOut');
    const minOut = new Date(initialCheckIn);
    minOut.setDate(minOut.getDate() + 1);
    const minOutStr = getLocalDateString(minOut);
    if (raw && raw > initialCheckIn) return raw;
    return minOutStr;
  }, [stateData.checkOut, queryParams, initialCheckIn]);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);

  const minCheckOutStr = useMemo(() => {
    if (!checkInDate) return todayStr;
    const d = new Date(checkInDate);
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }, [checkInDate, todayStr]);

  const handleCheckInChange = (newDate) => {
    if (!newDate) return;
    // Strict check: absolutely no past dates allowed
    if (newDate < todayStr) {
      setErrorMessage(`Không được chọn ngày trong quá khứ! Ngày nhận phòng sớm nhất là hôm nay (${formatDateLabel(todayStr)}).`);
      setCheckInDate(todayStr);
      return;
    }
    setErrorMessage(null);
    setCheckInDate(newDate);

    // If checkOut <= checkIn, automatically shift checkOut to checkIn + 1 day
    const inDateObj = new Date(newDate);
    const outDateObj = new Date(checkOutDate);
    if (outDateObj <= inDateObj) {
      const nextD = new Date(inDateObj);
      nextD.setDate(nextD.getDate() + 1);
      setCheckOutDate(getLocalDateString(nextD));
    }
  };

  const handleCheckOutChange = (newDate) => {
    if (!newDate) return;
    if (newDate <= checkInDate) {
      setErrorMessage('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      const inDateObj = new Date(checkInDate);
      inDateObj.setDate(inDateObj.getDate() + 1);
      setCheckOutDate(getLocalDateString(inDateObj));
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


  // Fetch real hotel, room, pricing, cancellation policy & active coupons from DB
  const syncBookingPricing = useCallback(
    async (codeToApply = '') => {
      setIsApplyingCoupon(true);
      try {
        const res = await calculateBookingPricing({
          hotel_id: initialHotelId,
          room_type_id: initialRoomTypeId,
          quantity: roomsCount,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          coupon_code: codeToApply ? codeToApply.trim() : undefined,
        });

        setPricing(res);
        if (codeToApply && codeToApply.trim()) {
          setCouponMessage(res.coupon_message || null);
        } else {
          setCouponMessage(null);
        }
      } catch (err) {
        console.warn('[BookingPage] Không thể đồng bộ biểu giá CSDL:', err.message);
        if (!stateData.hotel && !pricing.hotel) {
          setErrorMessage(err.message || 'Không thể tải dữ liệu giá phòng từ cơ sở dữ liệu.');
        }
      } finally {
        setIsApplyingCoupon(false);
        setIsLoadingPricing(false);
      }
    },
    [initialHotelId, initialRoomTypeId, roomsCount, checkInDate, checkOutDate]
  );

  useEffect(() => {
    syncBookingPricing('');
  }, [syncBookingPricing]);

  const handleApplyCoupon = async (overrideCode) => {
    const targetCode = typeof overrideCode === 'string' ? overrideCode : couponCode;
    if (!targetCode || !targetCode.trim()) return;
    await syncBookingPricing(targetCode);
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
      setErrorMessage('Không tìm thấy thông tin khách sạn hoặc hạng phòng hợp lệ trong CSDL.');
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

    // Khóa cờ ngay lập tức trước khi thực hiện bất kỳ tác vụ bất đồng bộ nào
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const fullName = [contactForm.lastName.trim(), contactForm.firstName.trim()]
      .filter(Boolean)
      .join(' ');
    let rawDigits = contactForm.phone.replace(/[^\d]/g, '');
    if (rawDigits.startsWith('84') && rawDigits.length > 9) {
      rawDigits = rawDigits.slice(2);
    }
    rawDigits = rawDigits.replace(/^0+/, '');
    const fullPhone = rawDigits ? `0${rawDigits}` : contactForm.phone.trim();

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
      setErrorMessage(err.message || 'Không thể lưu đơn đặt phòng vào cơ sở dữ liệu.');
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

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 700,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {isLoadingPricing && !activeHotel ? (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#475569' }}>
          Đang tải thông tin khách sạn và bảng giá từ cơ sở dữ liệu...
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
            minCheckOut={minCheckOutStr}
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
          onClose={() => setCreatedBookingResult(null)}
          onViewMyBookings={() => {
            navigate('/my-bookings');
          }}
        />
      )}
    </div>
  );
};

export default BookingPage;
