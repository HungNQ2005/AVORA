import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import './HomePage.css';

/* Custom SVG Icons */
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#FF4D4F" : "none"} stroke={filled ? "#FF4D4F" : "#ffffff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const MapCompassIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const PiggyBankIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-3.5c1-.5 2-1 2-2.5V9c0-.8-.7-1.5-1.5-1.5H19V5z" />
    <circle cx="15" cy="10" r="1" />
  </svg>
);

const Support24Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const FilterCheckmarkIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FilterNearMeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const FilterFreeCancelIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const FilterPayAtPropertyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="7" cy="15" r="1.2" fill="currentColor" />
  </svg>
);

const FilterGeniusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const HomePage = () => {
  const navigate = useNavigate();

  // Search Form State
  const [destination, setDestination] = useState('Đà Nẵng, Việt Nam');
  const [checkInDay, setCheckInDay] = useState(12);
  const [checkOutDay, setCheckOutDay] = useState(14);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [selectedYear, setSelectedYear] = useState(2024);

  // Guest & Room State (Default: 3 adults, 0 children, 2 rooms as in reference image)
  const [adults, setAdults] = useState(3);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(2);

  // Popover Toggles
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // Checkbox Filters State (All default unselected/inactive)
  const [filters, setFilters] = useState({
    nearby: false,
    freeCancel: false,
    payAtProperty: false,
    geniusOffer: false
  });

  // Favorites state tracking
  const [favorites, setFavorites] = useState({});

  // Database Hotels State (dynamically fetched from Supabase)
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchHotelsFromDb = async () => {
      try {
        setLoadingHotels(true);
        const res = await fetch(API_ENDPOINTS.HOTELS);
        const json = await res.json();
        if (isMounted && json?.data?.hotels) {
          setHotels(json.data.hotels);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách khách sạn từ database:', err);
      } finally {
        if (isMounted) setLoadingHotels(false);
      }
    };
    fetchHotelsFromDb();
    return () => { isMounted = false; };
  }, []);

  // Notification Toast State (Single active toast at a time, bottom-right fixed viewport)
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const toastTimerRef = React.useRef(null);

  const triggerToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastText(message);
    setToastKey(Date.now());
    setShowToast(true);

    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const toggleFavorite = (id) => {
    const nextState = !favorites[id];
    setFavorites(prev => ({ ...prev, [id]: nextState }));
    triggerToast(nextState ? 'Đã thêm chỗ nghỉ vào danh sách yêu thích' : 'Đã xóa chỗ nghỉ khỏi danh sách yêu thích');
  };

  const handleFilterToggle = (key) => {
    const filterNames = {
      nearby: 'Gần vị trí hiện tại',
      freeCancel: 'Miễn phí hủy phòng',
      payAtProperty: 'Thanh toán tại chỗ nghỉ',
      geniusOffer: 'Ưu đãi Genius'
    };
    const nextState = !filters[key];
    setFilters(prev => ({ ...prev, [key]: nextState }));
    triggerToast(`Đã ${nextState ? 'kích hoạt' : 'bỏ chọn'} bộ lọc "${filterNames[key]}"`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanDest = destination.split(',')[0].trim();
    const checkInDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkInDay).padStart(2, '0')}`;
    const checkOutDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkOutDay || checkInDay + 2).padStart(2, '0')}`;
    navigate(`/hotels?destination=${encodeURIComponent(cleanDest)}&checkIn=${checkInDate}&checkOut=${checkOutDate}&adults=${adults}&children=${children}&rooms=${rooms}`);
  };

  const getFormattedDateRange = () => {
    const nights = Math.max(1, checkOutDay - checkInDay);
    return `T6, ${checkInDay < 10 ? '0' + checkInDay : checkInDay} Th${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth} – CN, ${checkOutDay < 10 ? '0' + checkOutDay : checkOutDay} Th${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth} (${nights} đêm)`;
  };

  const handleDateSelect = (day) => {
    if (!checkInDay || (checkInDay && checkOutDay)) {
      setCheckInDay(day);
      setCheckOutDay(null);
      triggerToast(`Đã chọn ngày nhận phòng: Ngày ${day} tháng ${selectedMonth}`);
    } else if (day > checkInDay) {
      setCheckOutDay(day);
      setShowDatePicker(false);
      triggerToast(`Đã chọn thời gian lưu trú từ ${checkInDay} đến ${day} tháng ${selectedMonth}`);
    } else {
      setCheckInDay(day);
      setCheckOutDay(null);
      triggerToast(`Đã chọn ngày nhận phòng: Ngày ${day} tháng ${selectedMonth}`);
    }
  };

  const region = destination ? destination.split(',')[0].trim() : 'Đà Nẵng';

  // Check if there are promotional hotels for this region in the DB
  const regionalPromoHotels = useMemo(() => {
    if (!hotels || hotels.length === 0) return [];
    return hotels.filter((h) => {
      const matchCity = region
        ? (h.city_name?.toLowerCase().includes(region.toLowerCase()) ||
           h.address?.toLowerCase().includes(region.toLowerCase()))
        : true;
      const hasOffer = Boolean(
        h.tag?.toLowerCase().includes('ưu đãi') ||
        h.is_genius ||
        (h.original_price && h.original_price > h.price)
      );
      return matchCity && hasOffer;
    });
  }, [hotels, region]);

  const hasRegionalPromo = !loadingHotels && regionalPromoHotels.length > 0;

  const handlePromoClick = () => {
    const cleanDest = destination ? destination.split(',')[0].trim() : 'Đà Nẵng';
    const checkInDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkInDay).padStart(2, '0')}`;
    const checkOutDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkOutDay || checkInDay + 2).padStart(2, '0')}`;

    if (!hasRegionalPromo) {
      triggerToast(`Hiện chưa có ưu đãi tại ${cleanDest}`);
    }

    const queryParams = new URLSearchParams();
    queryParams.set('destination', cleanDest);
    queryParams.set('checkIn', checkInDate);
    queryParams.set('checkOut', checkOutDate);
    queryParams.set('adults', adults);
    queryParams.set('children', children);
    queryParams.set('rooms', rooms);

    navigate(`/hotels?${queryParams.toString()}`);
  };

  const handleDestinationClick = (destName) => {
    const checkInDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkInDay).padStart(2, '0')}`;
    const checkOutDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(checkOutDay || checkInDay + 2).padStart(2, '0')}`;

    const queryParams = new URLSearchParams();
    if (destName) queryParams.set('destination', destName);
    queryParams.set('checkIn', checkInDate);
    queryParams.set('checkOut', checkOutDate);
    queryParams.set('adults', adults);
    queryParams.set('children', children);
    queryParams.set('rooms', rooms);

    navigate(`/hotels?${queryParams.toString()}`);
  };

  const handleViewAllDestinations = (e) => {
    e.preventDefault();
    handleDestinationClick('Việt Nam');
  };

  return (
    <div className="avora-homepage">
      {/* 1. HERO BANNER & SEARCH BAR SECTION */}
      <section className="avora-hero">
        <div className="avora-homepage__container">
          {/* Top Guarantee Badge: Black semi-transparent border & background, fully opaque bold text */}
          <div className="avora-hero__guarantee-badge">
            <span className="avora-hero__badge-icon">✪</span>
            <span className="avora-hero__badge-text">Cam kết giá tốt nhất thị trường Việt Nam</span>
          </div>

          {/* Hero Main Titles with requested natural line wrapping */}
          <h1 className="avora-hero__title">Tìm chỗ nghỉ tiếp theo tại Việt Nam</h1>
          <p className="avora-hero__subtitle">
            Tìm ưu đãi khách sạn đẳng cấp, phòng nghỉ tiện nghi với mức giá đặc<br className="avora-hero__br" />
            quyền dành cho bạn.
          </p>

          {/* Search Card Container with Yellow Accent Outline */}
          <div className="avora-search-box">
            <form className="avora-search-form" onSubmit={handleSearchSubmit}>
              {/* Field 1: Destination */}
              <div className="avora-search-field">
                <div className="avora-search-field__icon">
                  <PinIcon />
                </div>
                <div className="avora-search-field__content">
                  <label>Bạn muốn đến đâu?</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Nhập thành phố hoặc tên khách sạn..."
                  />
                </div>
                {destination && (
                  <button type="button" className="avora-search-field__clear" onClick={() => setDestination('')}>
                    ✕
                  </button>
                )}
              </div>

              {/* Field 2: Dates Dropdown */}
              <div
                className={`avora-search-field avora-search-field--clickable ${showDatePicker ? 'is-active' : ''}`}
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowGuestDropdown(false);
                }}
              >
                <div className="avora-search-field__icon">
                  <CalendarIcon />
                </div>
                <div className="avora-search-field__content">
                  <label>Ngày nhận phòng – Ngày trả phòng</label>
                  <div className="avora-search-field__value-text">
                    {checkInDay && checkOutDay ? getFormattedDateRange() : 'Chọn ngày nhận & trả phòng'}
                  </div>
                </div>

                {/* Date Picker Popover */}
                {showDatePicker && (
                  <div className="avora-datepicker-popover" onClick={(e) => e.stopPropagation()}>
                    <div className="avora-datepicker-popover__header">
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(prev => prev > 1 ? prev - 1 : 12)}
                        className="avora-datepicker__nav-btn"
                      >
                        ‹
                      </button>
                      <span className="avora-datepicker__title">Tháng {selectedMonth}, {selectedYear}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(prev => prev < 12 ? prev + 1 : 1)}
                        className="avora-datepicker__nav-btn"
                      >
                        ›
                      </button>
                    </div>

                    <div className="avora-datepicker-popover__weekdays">
                      <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                    </div>

                    <div className="avora-datepicker-popover__days">
                      {[...Array(31)].map((_, idx) => {
                        const day = idx + 1;
                        const isCheckIn = day === checkInDay;
                        const isCheckOut = day === checkOutDay;
                        const isInRange = checkInDay && checkOutDay && day > checkInDay && day < checkOutDay;

                        return (
                          <button
                            key={day}
                            type="button"
                            className={`avora-datepicker__day ${isCheckIn ? 'is-start' : ''} ${isCheckOut ? 'is-end' : ''} ${isInRange ? 'is-in-range' : ''}`}
                            onClick={() => handleDateSelect(day)}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Guests & Rooms Popover Dropdown (Matches Reference Image) */}
              <div
                className={`avora-search-field avora-search-field--clickable ${showGuestDropdown ? 'is-active' : ''}`}
                onClick={() => {
                  setShowGuestDropdown(!showGuestDropdown);
                  setShowDatePicker(false);
                }}
              >
                <div className="avora-search-field__icon">
                  <UsersIcon />
                </div>
                <div className="avora-search-field__content">
                  <label>Số khách và phòng</label>
                  <div className="avora-search-field__value-text">
                    <strong>{adults} người lớn</strong> · {children} trẻ em · {rooms} phòng
                  </div>
                </div>

                {/* Guest & Room Popover Matching Reference Image */}
                {showGuestDropdown && (
                  <div className="avora-guest-popover" onClick={(e) => e.stopPropagation()}>
                    {/* Row 1: Adults */}
                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Người lớn</strong>
                        <span className="avora-guest-popover__sub">Từ 18 tuổi trở lên</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={adults <= 1}
                          onClick={() => setAdults(prev => Math.max(1, prev - 1))}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Children */}
                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Trẻ em</strong>
                        <span className="avora-guest-popover__sub">0 – 17 tuổi</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={children <= 0}
                          onClick={() => setChildren(prev => Math.max(0, prev - 1))}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Rooms */}
                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Phòng</strong>
                        <span className="avora-guest-popover__sub">Số lượng phòng cần đặt</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={rooms <= 1}
                          onClick={() => setRooms(prev => Math.max(1, prev - 1))}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{rooms}</span>
                        <button
                          type="button"
                          onClick={() => setRooms(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      className="avora-guest-popover__submit-btn"
                      onClick={() => {
                        setShowGuestDropdown(false);
                        triggerToast(`Đã cập nhật số khách & phòng: ${adults} người lớn, ${children} trẻ em, ${rooms} phòng`);
                      }}
                    >
                      Áp dụng
                    </button>
                  </div>
                )}
              </div>

              {/* Search Action Button */}
              <button type="submit" className="avora-search-btn" aria-label="Tìm kiếm">
                <SearchIcon />
              </button>
            </form>
          </div>

          {/* 100% Rounded Filter Capsule Pills Outside Search Bar */}
          <div className="avora-search-filter-boxes" role="toolbar" aria-label="Bộ lọc nhanh">
            <button
              type="button"
              className={`avora-filter-box avora-filter-box--nearby ${filters.nearby ? 'is-active' : ''}`}
              onClick={() => handleFilterToggle('nearby')}
              aria-pressed={filters.nearby}
            >
              <span className={`avora-filter-box__checkbox ${filters.nearby ? 'is-checked' : ''}`}>
                {filters.nearby && <FilterCheckmarkIcon />}
              </span>
              <span className="avora-filter-box__icon avora-filter-box__icon--nearby">
                <FilterNearMeIcon />
              </span>
              <span className="avora-filter-box__label">Gần vị trí hiện tại</span>
            </button>

            <button
              type="button"
              className={`avora-filter-box avora-filter-box--cancel ${filters.freeCancel ? 'is-active' : ''}`}
              onClick={() => handleFilterToggle('freeCancel')}
              aria-pressed={filters.freeCancel}
            >
              <span className={`avora-filter-box__checkbox ${filters.freeCancel ? 'is-checked' : ''}`}>
                {filters.freeCancel && <FilterCheckmarkIcon />}
              </span>
              <span className="avora-filter-box__icon avora-filter-box__icon--cancel">
                <FilterFreeCancelIcon />
              </span>
              <span className="avora-filter-box__label">Miễn phí hủy phòng</span>
            </button>

            <button
              type="button"
              className={`avora-filter-box avora-filter-box--payment ${filters.payAtProperty ? 'is-active' : ''}`}
              onClick={() => handleFilterToggle('payAtProperty')}
              aria-pressed={filters.payAtProperty}
            >
              <span className={`avora-filter-box__checkbox ${filters.payAtProperty ? 'is-checked' : ''}`}>
                {filters.payAtProperty && <FilterCheckmarkIcon />}
              </span>
              <span className="avora-filter-box__icon avora-filter-box__icon--payment">
                <FilterPayAtPropertyIcon />
              </span>
              <span className="avora-filter-box__label">Thanh toán tại chỗ nghỉ</span>
            </button>

            <button
              type="button"
              className={`avora-filter-box avora-filter-box--genius ${filters.geniusOffer ? 'is-active' : ''}`}
              onClick={() => handleFilterToggle('geniusOffer')}
              aria-pressed={filters.geniusOffer}
            >
              <span className={`avora-filter-box__checkbox ${filters.geniusOffer ? 'is-checked' : ''}`}>
                {filters.geniusOffer && <FilterCheckmarkIcon />}
              </span>
              <span className="avora-filter-box__icon avora-filter-box__icon--genius">
                <FilterGeniusIcon />
              </span>
              <span className="avora-filter-box__label">Ưu đãi Genius</span>
            </button>
          </div>
        </div>
      </section>


      {/* 2. SUMMER PROMOTION BANNER */}
      <section className="avora-section">
        <div className="avora-homepage__container">
          <div className="avora-promo-banner">
            <div className="avora-promo-banner__content">
              <div className="avora-promo-banner__badge">
                <span className="avora-promo-banner__badge-yellow">ƯU ĐÃI MÙA HÈ 2024</span>
                <span className="avora-promo-banner__badge-sub">
                  {!loadingHotels && !hasRegionalPromo ? 'Hiện chưa có ưu đãi' : 'Tiết kiệm tối thiểu 15%'}
                </span>
              </div>
              <h2 className="avora-promo-banner__title">Du ngoạn ngắm cảnh Việt Nam</h2>
              <p className="avora-promo-banner__text">
                Tận hưởng kỳ nghỉ trong mơ từ vịnh biển Nha Trang trong xanh đến sương mờ xứ Đà Lạt ngàn hoa.
              </p>
            </div>
            <button
              type="button"
              className="avora-promo-banner__btn"
              onClick={handlePromoClick}
            >
              Khám phá ưu đãi ngay
            </button>
          </div>
        </div>
      </section>

      {/* 3. TRENDING DESTINATIONS SECTION */}
      <section className="avora-section">
        <div className="avora-homepage__container">
          <div className="avora-section__header">
            <div>
              <h2 className="avora-section__title">Điểm đến thịnh hành tại Việt Nam</h2>
              <p className="avora-section__subtitle">
                Các lựa chọn phổ biến nhất của du khách trong nước và quốc tế
              </p>
            </div>
            <a
              href="/hotels"
              className="avora-section__link"
              onClick={handleViewAllDestinations}
            >
              <span>Xem tất cả</span>
              <span>›</span>
            </a>
          </div>

          {/* Grid Layout: Top 2 Featured + Bottom 3 Cards */}
          <div className="avora-destinations-grid">
            {/* Top Featured 1: Đà Nẵng */}
            <div
              className="avora-dest-card avora-dest-card--large"
              onClick={() => handleDestinationClick('Đà Nẵng')}
            >
              <img
                src="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=80"
                alt="Đà Nẵng"
              />
              <div className="avora-dest-card__overlay">
                <span className="avora-dest-card__tag">📍 Điểm đến số 1</span>
                <h3 className="avora-dest-card__title">Đà Nẵng</h3>
                <p className="avora-dest-card__sub">1.842 chỗ nghỉ sẵn có</p>
                <div className="avora-dest-card__price">Từ 480.000đ/đêm</div>
              </div>
            </div>

            {/* Top Featured 2: Phú Quốc */}
            <div
              className="avora-dest-card avora-dest-card--large"
              onClick={() => handleDestinationClick('Phú Quốc')}
            >
              <img
                src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80"
                alt="Phú Quốc"
              />
              <div className="avora-dest-card__overlay">
                <span className="avora-dest-card__tag">🏝 Đảo thiên đường</span>
                <h3 className="avora-dest-card__title">Phú Quốc</h3>
                <p className="avora-dest-card__sub">965 chỗ nghỉ sẵn có</p>
                <div className="avora-dest-card__price">Từ 750.000đ/đêm</div>
              </div>
            </div>

            {/* Bottom 1: Đà Lạt */}
            <div
              className="avora-dest-card avora-dest-card--small"
              onClick={() => handleDestinationClick('Đà Lạt')}
            >
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
                alt="Đà Lạt"
              />
              <div className="avora-dest-card__overlay">
                <h3 className="avora-dest-card__title">Đà Lạt</h3>
                <p className="avora-dest-card__sub">1.340 chỗ nghỉ ngắm mây</p>
              </div>
            </div>

            {/* Bottom 2: Nha Trang */}
            <div
              className="avora-dest-card avora-dest-card--small"
              onClick={() => handleDestinationClick('Nha Trang')}
            >
              <img
                src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80"
                alt="Nha Trang"
              />
              <div className="avora-dest-card__overlay">
                <h3 className="avora-dest-card__title">Nha Trang</h3>
                <p className="avora-dest-card__sub">1.120 chỗ nghỉ ven biển</p>
              </div>
            </div>

            {/* Bottom 3: Vịnh Hạ Long */}
            <div
              className="avora-dest-card avora-dest-card--small"
              onClick={() => handleDestinationClick('Hạ Long')}
            >
              <img
                src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80"
                alt="Vịnh Hạ Long"
              />
              <div className="avora-dest-card__overlay">
                <h3 className="avora-dest-card__title">Vịnh Hạ Long</h3>
                <p className="avora-dest-card__sub">540 khách sạn & du thuyền</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MOST FAVORITE ACCOMMODATIONS SECTION */}
      <section className="avora-section">
        <div className="avora-homepage__container">
          <div className="avora-section__header">
            <div>
              <span className="avora-section__top-tag">ĐƯỢC ĐẶT NHIỀU NHẤT 24 GIỜ QUA</span>
              <h2 className="avora-section__title">Chỗ nghỉ được khách yêu thích nhất</h2>
            </div>
            <div className="avora-section__controls">
              <button
                type="button"
                className={`avora-circle-btn ${carouselIdx > 0 ? 'avora-circle-btn--active' : ''}`}
                onClick={() => setCarouselIdx((prev) => Math.max(0, prev - 4))}
                disabled={carouselIdx === 0}
                aria-label="Trước"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className={`avora-circle-btn ${carouselIdx + 4 < hotels.length ? 'avora-circle-btn--active' : ''}`}
                onClick={() => setCarouselIdx((prev) => Math.min(hotels.length - 4, prev + 4))}
                disabled={carouselIdx + 4 >= hotels.length}
                aria-label="Sau"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          {/* Hotel Grid: Dynamically fetched from Database */}
          <div className="avora-hotels-grid">
            {loadingHotels ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={`hotel-skeleton-${idx}`} className="avora-hotel-card avora-hotel-card--skeleton">
                  <div className="avora-hotel-card__image-wrap avora-skeleton-pulse" />
                  <div className="avora-hotel-card__body">
                    <div className="avora-skeleton-line avora-skeleton-line--short avora-skeleton-pulse" />
                    <div className="avora-skeleton-line avora-skeleton-line--title avora-skeleton-pulse" />
                    <div className="avora-skeleton-line avora-skeleton-line--desc avora-skeleton-pulse" />
                    <div className="avora-skeleton-line avora-skeleton-line--price avora-skeleton-pulse" />
                    <div className="avora-skeleton-btn avora-skeleton-pulse" />
                  </div>
                </div>
              ))
            ) : hotels.length === 0 ? (
              <div className="avora-hotels-empty">
                <p>Không có chỗ nghỉ nào trong cơ sở dữ liệu.</p>
              </div>
            ) : (
              hotels.slice(carouselIdx, carouselIdx + 4).map((hotel) => {
                const isFav = !!favorites[hotel.hotel_id];
                const starQuality = Math.min(5, Math.max(1, hotel.star_quality || 5));
                const starsStr = '★'.repeat(starQuality) + '☆'.repeat(5 - starQuality);
                const hotelImage = hotel.thumbnail || hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                const formattedPrice = hotel.price ? new Intl.NumberFormat('vi-VN').format(hotel.price) : '1.500.000';
                const formattedOriginalPrice = hotel.original_price ? `${new Intl.NumberFormat('vi-VN').format(hotel.original_price)} VND` : null;

                return (
                  <div
                    key={hotel.hotel_id}
                    className="avora-hotel-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/hotels/${hotel.hotel_id}`)}
                  >
                    <div className="avora-hotel-card__image-wrap">
                      <img
                        src={hotelImage}
                        alt={hotel.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <button
                        type="button"
                        className="avora-hotel-card__fav-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(hotel.hotel_id);
                        }}
                        aria-label="Yêu thích"
                      >
                        <HeartIcon filled={isFav} />
                      </button>
                      <span className="avora-hotel-card__badge">
                        {hotel.is_genius ? 'Ưu đãi Genius' : (hotel.tag || 'Ưu đãi đặc biệt')}
                      </span>
                    </div>

                    <div className="avora-hotel-card__body">
                      <div className="avora-hotel-card__stars">{starsStr}</div>
                      <h3 className="avora-hotel-card__title" title={hotel.name}>
                        {hotel.name}
                      </h3>
                      <p className="avora-hotel-card__location" title={hotel.address ? `${hotel.address}, ${hotel.city_name}` : hotel.city_name}>
                        <PinIcon /> <span>{hotel.address ? `${hotel.address}, ${hotel.city_name}` : hotel.city_name}</span>
                      </p>

                      <div className="avora-hotel-card__rating">
                        <span className="avora-hotel-card__score">
                          {Number(hotel.star_rating || 9.2).toFixed(1)}
                        </span>
                        <div className="avora-hotel-card__rating-text">
                          <strong>{hotel.score_label || 'Tuyệt hảo'}</strong>
                          <span>{hotel.reviews_count ? `${hotel.reviews_count} đánh giá` : '1.200 đánh giá'}</span>
                        </div>
                      </div>

                      <div className="avora-hotel-card__price-box">
                        {formattedOriginalPrice && (
                          <span className="avora-hotel-card__old-price">{formattedOriginalPrice}</span>
                        )}
                        <div className="avora-hotel-card__current-price">
                          {formattedPrice} <span className="avora-hotel-card__curr">VND</span>
                        </div>
                        <span className="avora-hotel-card__tax-note">đã bao gồm thuế và phí</span>
                      </div>

                      <button
                        type="button"
                        className="avora-hotel-card__btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/hotels/${hotel.hotel_id}`);
                        }}
                      >
                        Xem phòng trống
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE MAP SECTION */}
      <section className="avora-section">
        <div className="avora-homepage__container">
          <div className="avora-map-card">
            <div className="avora-map-card__content">
              <div className="avora-map-card__tag">
                <MapCompassIcon />
                <span>Bản đồ du lịch tương tác</span>
              </div>

              <h2 className="avora-map-card__title">Tìm khách sạn trên bản đồ địa phương</h2>

              <p className="avora-map-card__desc">
                Dễ dàng định vị các khách sạn sát biển, gần trung tâm thương mại hoặc các địa điểm du lịch danh lam thắng cảnh ở Việt Nam theo ngân sách mong muốn.
              </p>

              <div className="avora-map-card__filters">
                <button
                  type="button"
                  className="avora-map-filter-btn"
                  onClick={() => handleDestinationClick('Đà Nẵng')}
                >
                  Đà Nẵng (1.840+)
                </button>
                <button
                  type="button"
                  className="avora-map-filter-btn"
                  onClick={() => handleDestinationClick('Hà Nội')}
                >
                  Hà Nội (2.400+)
                </button>
                <button
                  type="button"
                  className="avora-map-filter-btn"
                  onClick={() => handleDestinationClick('Phú Quốc')}
                >
                  Phú Quốc (950+)
                </button>
              </div>
            </div>

            {/* Map Preview Right Side */}
            <div className="avora-map-card__preview">
              <img
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80"
                alt="Bản đồ địa phương"
              />
              <button
                type="button"
                className="avora-map-card__open-btn"
                onClick={() => handleDestinationClick('Việt Nam')}
              >
                <MapCompassIcon />
                <span>Mở xem trên bản đồ</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. KEY FEATURES & GUARANTEES ROW */}
      <section className="avora-section avora-section--last">
        <div className="avora-homepage__container">
          <div className="avora-features-grid">
            {/* Feature 1 */}
            <div className="avora-feature-box">
              <div className="avora-feature-box__icon">
                <PiggyBankIcon />
              </div>
              <div className="avora-feature-box__content">
                <h3>Giá tốt không phí ẩn</h3>
                <p>
                  Mọi mức giá phòng hiển thị đều minh bạch thuế phí rõ ràng cho khách hàng tại Việt Nam.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="avora-feature-box">
              <div className="avora-feature-box__icon">
                <Support24Icon />
              </div>
              <div className="avora-feature-box__content">
                <h3>Hỗ trợ tiếng Việt 24/7</h3>
                <p>
                  Đội ngũ chăm sóc người Việt luôn sẵn sàng giải đáp và xử lý thay đổi đặt phòng qua hotline.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="avora-feature-box">
              <div className="avora-feature-box__icon">
                <ShieldCheckIcon />
              </div>
              <div className="avora-feature-box__content">
                <h3>Xác nhận đặt phòng tức thì</h3>
                <p>
                  Nhận ngay voucher điện tử kèm mã QR check-in nhanh chóng tại quầy lễ tân khách sạn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Check / Selection Notification Toast (Single active notification with re-triggered bounce) */}
      {showToast && (
        <div key={toastKey} className="avora-support-toast">
          <div className="avora-support-toast__icon">
            <ShieldCheckIcon />
          </div>
          <div className="avora-support-toast__content">
            <div className="avora-support-toast__message">
              {toastText}
            </div>
          </div>
          <button
            type="button"
            className="avora-support-toast__close"
            onClick={() => setShowToast(false)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;

