import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import HotelCard from './components/HotelCard';
import FilterSidebar from './components/FilterSidebar';
import MapModal from './components/MapModal';
import { getMinRoomsRequired, validateGuestRoomCapacity, MAX_ROOM_CAPACITY } from '../../utils/roomCapacityHelper';
import './HotelSearchPage.css';

/* Custom SVG Icons */
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <circle cx="7" cy="11" r="2" />
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MapViewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const InfoCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Sorting tabs config
const SORT_TABS = [
  { id: 'popularity', label: 'Độ phổ biến hàng đầu' },
  { id: 'price_asc', label: 'Giá (thấp đến cao)' },
  { id: 'rating_price', label: 'Điểm đánh giá & Giá tốt' },
  { id: 'beach_distance', label: 'Gần bãi biển nhất' },
];

const getWeekdayVN = (d) => {
  if (!d) return '';
  const day = d.getDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
};

const formatShortDateVN = (d) => {
  if (!d) return '';
  const wd = getWeekdayVN(d);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${wd}, ${day} Th${month}`;
};

const formatDateISO = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

const HotelSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Primary Search Fields
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [checkInDate, setCheckInDate] = useState(() => {
    const param = searchParams.get('checkIn');
    if (param) {
      const d = parseLocalDate(param);
      if (d >= today) return d;
    }
    return new Date(today);
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const param = searchParams.get('checkOut');
    if (param) {
      const d = parseLocalDate(param);
      if (d > today) return d;
    }
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  });
  const [adults, setAdults] = useState(Number(searchParams.get('adults')) || 2);
  const [children, setChildren] = useState(Number(searchParams.get('children')) || 0);
  const [rooms, setRooms] = useState(Number(searchParams.get('rooms')) || 1);
  const [selectedCapacity, setSelectedCapacity] = useState(searchParams.get('capacity') || 'all');
  const [capacityNotice, setCapacityNotice] = useState(null);
  const [linkedNotice, setLinkedNotice] = useState(null);

  const totalGuests = adults + children;
  const guestsPerRoom = Math.ceil(totalGuests / Math.max(1, rooms));
  const minRoomsRequired = Math.ceil(totalGuests / 5);

  const handleAdultsDelta = (delta) => {
    const nextAdults = Math.max(1, adults + delta);
    setAdults(nextAdults);
    const nextTotal = nextAdults + children;
    const requiredRooms = Math.ceil(nextTotal / 5);
    if (requiredRooms > rooms) {
      setRooms(requiredRooms);
      setLinkedNotice(`Đã tự động liên kết: ${nextTotal} khách cần tối thiểu ${requiredRooms} phòng (tối đa 5 người/phòng gồm giường phụ).`);
    } else {
      setLinkedNotice(null);
    }
  };

  const handleChildrenDelta = (delta) => {
    const nextChildren = Math.max(0, children + delta);
    setChildren(nextChildren);
    const nextTotal = adults + nextChildren;
    const requiredRooms = Math.ceil(nextTotal / 5);
    if (requiredRooms > rooms) {
      setRooms(requiredRooms);
      setLinkedNotice(`Đã tự động liên kết: ${nextTotal} khách cần tối thiểu ${requiredRooms} phòng (tối đa 5 người/phòng gồm giường phụ).`);
    } else {
      setLinkedNotice(null);
    }
  };

  const handleRoomsDelta = (delta) => {
    const nextRooms = rooms + delta;
    if (delta < 0) {
      const minRequired = Math.ceil((adults + children) / 5);
      if (nextRooms < minRequired) {
        setLinkedNotice(`Không thể giảm dưới ${minRequired} phòng: 1 phòng tối đa 5 người (2 giường tiêu chuẩn × 2 + 1 giường phụ). ${adults + children} người cần ít nhất ${minRequired} phòng.`);
        return;
      }
    }
    setRooms(Math.max(1, nextRooms));
    setLinkedNotice(null);
  };

  // Month and year for calendar popover navigation
  const [selectedMonth, setSelectedMonth] = useState(() => checkInDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => checkInDate.getFullYear());

  const checkIn = useMemo(() => formatDateISO(checkInDate), [checkInDate]);
  const checkOut = useMemo(() => formatDateISO(checkOutDate), [checkOutDate]);

  // Sorting
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'popularity');

  // Filter States
  const [selectedPriceRange, setSelectedPriceRange] = useState(searchParams.get('priceRange') || 'all');
  const [selectedStars, setSelectedStars] = useState(
    searchParams.get('stars') ? searchParams.get('stars').split(',').map(Number) : []
  );
  const [selectedScore, setSelectedScore] = useState(
    searchParams.get('minScore') ? Number(searchParams.get('minScore')) : null
  );
  const [selectedFacilities, setSelectedFacilities] = useState(
    searchParams.get('facilities') ? searchParams.get('facilities').split(',') : []
  );
  const [onlyAvailable, setOnlyAvailable] = useState(searchParams.get('onlyAvailable') === 'true');

  // Server state
  const [hotels, setHotels] = useState([]);
  const [filterStats, setFilterStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDbEmpty, setIsDbEmpty] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Map Modal State
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Popovers state for compact search bar
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const datePickerRef = useRef(null);
  const guestDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(e.target)) {
        setShowGuestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar navigation & selection
  const canGoPrevMonth = useMemo(() => {
    const curMonth = today.getMonth() + 1;
    const curYear = today.getFullYear();
    if (selectedYear > curYear) return true;
    if (selectedYear === curYear && selectedMonth > curMonth) return true;
    return false;
  }, [selectedMonth, selectedYear, today]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleDateSelect = (dateObj) => {
    if (dateObj < today) return; // Disallow past dates

    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(dateObj);
      setCheckOutDate(null);
    } else if (dateObj.getTime() > checkInDate.getTime()) {
      setCheckOutDate(dateObj);
      setShowDatePicker(false);
    } else {
      setCheckInDate(dateObj);
      setCheckOutDate(null);
    }
  };

  // Calendar days grid for monthly view
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push({ key: `empty-${i}`, isEmpty: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      dateObj.setHours(0, 0, 0, 0);

      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const isCheckIn = checkInDate && dateObj.getTime() === checkInDate.getTime();
      const isCheckOut = checkOutDate && dateObj.getTime() === checkOutDate.getTime();
      const isInRange = checkInDate && checkOutDate && dateObj > checkInDate && dateObj < checkOutDate;

      days.push({
        key: `day-${selectedYear}-${selectedMonth}-${day}`,
        day,
        dateObj,
        isPast,
        isToday,
        isCheckIn,
        isCheckOut,
        isInRange,
      });
    }
    return days;
  }, [selectedMonth, selectedYear, today, checkInDate, checkOutDate]);

  // Calculate stay nights dynamically
  const nights = useMemo(() => {
    try {
      if (!checkInDate || !checkOutDate) return 1;
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Formatted date string for display in search frame
  const formattedDatesOnly = useMemo(() => {
    if (!checkInDate) return 'Chọn ngày nhận phòng';
    if (!checkOutDate) return `${formatShortDateVN(checkInDate)} – Chọn ngày trả`;
    return `${formatShortDateVN(checkInDate)} – ${formatShortDateVN(checkOutDate)}`;
  }, [checkInDate, checkOutDate]);

  // Price range helper
  const getPriceBounds = useCallback((rangeKey) => {
    switch (rangeKey) {
      case '0-1.2m':
        return { minPrice: 0, maxPrice: 1200000 };
      case '1.2m-2.5m':
        return { minPrice: 1200000, maxPrice: 2500000 };
      case '2.5m-5m':
        return { minPrice: 2500000, maxPrice: 5000000 };
      case 'above-5m':
        return { minPrice: 5000000, maxPrice: null };
      case 'all':
      default:
        return { minPrice: null, maxPrice: null };
    }
  }, []);

  // Fetch hotels from backend API
  const fetchHotels = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const { minPrice, maxPrice } = getPriceBounds(selectedPriceRange);

    const queryParams = new URLSearchParams();
    if (destination) queryParams.set('destination', destination);
    if (checkIn) queryParams.set('checkIn', checkIn);
    if (checkOut) queryParams.set('checkOut', checkOut);
    if (adults) queryParams.set('adults', adults);
    if (children) queryParams.set('children', children);
    if (rooms) queryParams.set('rooms', rooms);
    if (selectedCapacity && selectedCapacity !== 'all') queryParams.set('capacityFilter', selectedCapacity);
    if (sortBy) queryParams.set('sortBy', sortBy);

    if (minPrice !== null) queryParams.set('minPrice', minPrice);
    if (maxPrice !== null) queryParams.set('maxPrice', maxPrice);
    if (selectedStars.length > 0) queryParams.set('starRatings', selectedStars.join(','));
    if (selectedScore !== null) queryParams.set('minScore', selectedScore);
    if (onlyAvailable) queryParams.set('onlyAvailable', 'true');

    if (selectedFacilities.length > 0) queryParams.set('facilities', selectedFacilities.join(','));

    try {
      const response = await fetch(`${API_ENDPOINTS.HOTELS}?${queryParams.toString()}`);
      const result = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Không thể tải danh sách khách sạn');
      }

      if (result.data?.exceededCapacity) {
        setHotels([]);
        setFilterStats(result.data.filterStats || {});
        setCapacityNotice(result.data);
      } else if (Math.ceil((adults + children) / Math.max(1, rooms)) > 5) {
        setHotels([]);
        setCapacityNotice({
          exceededCapacity: true,
          totalGuests: adults + children,
          rooms,
          guestsPerRoom: Math.ceil((adults + children) / Math.max(1, rooms)),
          minRoomsRequired: Math.ceil((adults + children) / 5),
          message: 'Không có loại phòng nào như vậy. Sức chứa tối đa của 1 phòng là 5 người (2 giường tiêu chuẩn × 2 người = 4 người, có thêm 1 giường phụ × 1 người = tối đa 5 người). Không được phép đặt 6 người vào 1 phòng này.',
        });
      } else {
        const hotelData = (result.data?.hotels || []).filter(
          (h) => !h.hotel_status || h.hotel_status === 'ACTIVE'
        );
        const stats = result.data?.filterStats || {};

        setHotels(hotelData);
        setFilterStats(stats);
        setCapacityNotice(null);

        // Check if DB is completely empty (no hotels at all)
        if (stats.priceRanges?.all === 0 && (!destination || destination.trim() === '')) {
          setIsDbEmpty(true);
        } else {
          setIsDbEmpty(false);
        }
      }
    } catch (err) {
      console.error('Fetch hotels error:', err);
      setErrorMsg(err.message || 'Lỗi kết nối cơ sở dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, [
    destination,
    checkIn,
    checkOut,
    adults,
    children,
    rooms,
    selectedCapacity,
    sortBy,
    selectedPriceRange,
    selectedStars,
    selectedScore,
    selectedFacilities,
    onlyAvailable,
    getPriceBounds,
  ]);

  // Synchronize state with URL and trigger fetch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    fetchHotels();
  }, [fetchHotels]);

  // Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    let finalCheckIn = checkInDate || today;
    let finalCheckOut = checkOutDate;
    if (!finalCheckOut || finalCheckOut.getTime() <= finalCheckIn.getTime()) {
      finalCheckOut = new Date(finalCheckIn);
      finalCheckOut.setDate(finalCheckOut.getDate() + 2);
      setCheckOutDate(finalCheckOut);
    }

    const cleanDest = destination ? destination.split(',')[0].trim() : '';
    const queryParams = new URLSearchParams(searchParams);
    if (cleanDest) {
      queryParams.set('destination', cleanDest);
    } else {
      queryParams.delete('destination');
    }
    queryParams.set('checkIn', formatDateISO(finalCheckIn));
    queryParams.set('checkOut', formatDateISO(finalCheckOut));
    queryParams.set('adults', adults);
    queryParams.set('children', children);
    queryParams.set('rooms', rooms);
    if (selectedCapacity && selectedCapacity !== 'all') {
      queryParams.set('capacity', selectedCapacity);
    } else {
      queryParams.delete('capacity');
    }
    queryParams.set('sortBy', sortBy);

    setSearchParams(queryParams, { replace: true });
    fetchHotels();
  };

  // Filter toggle handlers
  const handleStarToggle = (star) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  const handleFacilityToggle = (facilityKey) => {
    setSelectedFacilities((prev) =>
      prev.includes(facilityKey)
        ? prev.filter((f) => f !== facilityKey)
        : [...prev, facilityKey]
    );
  };

  const handleResetAllFilters = () => {
    setDestination('');
    setSelectedPriceRange('all');
    setSelectedStars([]);
    setSelectedScore(null);
    setSelectedFacilities([]);
    setSelectedCapacity('all');
    setOnlyAvailable(false);
    setSortBy('popularity');
    setCapacityNotice(null);
    setLinkedNotice(null);
  };

  // Check if any filter is active
  const hasActiveFilters =
    Boolean(destination && destination.trim()) ||
    selectedPriceRange !== 'all' ||
    selectedStars.length > 0 ||
    selectedScore !== null ||
    selectedFacilities.length > 0 ||
    selectedCapacity !== 'all' ||
    onlyAvailable;

  return (
    <div className="hotel-search-page">
      {/* ─── 1. TOP COMPACT SEARCH BAR (UPGRADED TO MATCH HOMEPAGE WITH FRAME NIGHTS BADGE) ─── */}
      <section className="search-bar-strip">
        <div className="search-bar-strip__container">
          <div className="compact-search-box">
            <form className="compact-search-form" onSubmit={handleSearchSubmit}>
              {/* Field 1: Destination */}
              <div className="compact-search-field">
                <div className="compact-search-field__icon">
                  <PinIcon />
                </div>
                <div className="compact-search-field__content">
                  <label>Bạn muốn đến đâu?</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Nhập thành phố hoặc tên khách sạn..."
                    className="compact-search-input"
                  />
                </div>
                {destination && (
                  <button
                    type="button"
                    className="compact-search-field__clear"
                    onClick={() => setDestination('')}
                    title="Xóa địa điểm"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Field 2: Dates Dropdown with Frame Nights Badge & Interactive Calendar */}
              <div
                ref={datePickerRef}
                className={`compact-search-field compact-search-field--clickable ${showDatePicker ? 'is-active' : ''}`}
                onClick={() => {
                  setShowDatePicker((prev) => !prev);
                  setShowGuestDropdown(false);
                }}
              >
                <div className="compact-search-field__icon">
                  <CalendarIcon />
                </div>
                <div className="compact-search-field__content">
                  <label>Ngày nhận phòng – Ngày trả phòng</label>
                  <div className="compact-search-field__value-text">
                    <span className="compact-search-field__dates">{formattedDatesOnly}</span>
                    <span className="compact-search-nights-pill">{nights} đêm</span>
                  </div>
                </div>

                {/* Calendar Popover (Matches Homepage layout & functionality) */}
                {showDatePicker && (
                  <div className="avora-datepicker-popover" onClick={(e) => e.stopPropagation()}>
                    <div className="avora-datepicker-popover__header">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        disabled={!canGoPrevMonth}
                        className="avora-datepicker__nav-btn"
                        title={!canGoPrevMonth ? 'Không thể quay lại tháng trong quá khứ' : 'Tháng trước'}
                        aria-label="Tháng trước"
                      >
                        ‹
                      </button>
                      <span className="avora-datepicker__title">Tháng {selectedMonth}, {selectedYear}</span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="avora-datepicker__nav-btn"
                        title="Tháng tiếp theo"
                        aria-label="Tháng tiếp theo"
                      >
                        ›
                      </button>
                    </div>

                    <div className="avora-datepicker-popover__weekdays">
                      <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                    </div>

                    <div className="avora-datepicker-popover__days">
                      {calendarDays.map((item) => {
                        if (item.isEmpty) {
                          return <div key={item.key} className="avora-datepicker__day is-empty" />;
                        }

                        const dayClasses = [
                          'avora-datepicker__day',
                          item.isCheckIn ? 'is-start' : '',
                          item.isCheckOut ? 'is-end' : '',
                          item.isInRange ? 'is-in-range' : '',
                          item.isToday ? 'is-today' : '',
                          item.isPast ? 'is-disabled' : '',
                        ].filter(Boolean).join(' ');

                        return (
                          <button
                            key={item.key}
                            type="button"
                            disabled={item.isPast}
                            className={dayClasses}
                            onClick={() => handleDateSelect(item.dateObj)}
                            title={item.isPast ? 'Không thể chọn ngày trong quá khứ' : undefined}
                          >
                            {item.day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="compact-popover__stay-summary">
                      <span className="compact-popover__stay-text">
                        {checkInDate && checkOutDate ? (
                          <>Kỳ nghỉ: <strong>{nights} đêm</strong> ({formatShortDateVN(checkInDate)} – {formatShortDateVN(checkOutDate)})</>
                        ) : (
                          'Vui lòng chọn ngày trả phòng'
                        )}
                      </span>
                      <button
                        type="button"
                        className="compact-popover__apply-btn"
                        onClick={() => setShowDatePicker(false)}
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Guests & Rooms Popover */}
              <div
                ref={guestDropdownRef}
                className={`compact-search-field compact-search-field--clickable ${showGuestDropdown ? 'is-active' : ''}`}
                onClick={() => {
                  setShowGuestDropdown((prev) => !prev);
                  setShowDatePicker(false);
                }}
              >
                <div className="compact-search-field__icon">
                  <UsersIcon />
                </div>
                <div className="compact-search-field__content">
                  <label>Số khách và phòng</label>
                  <div className="compact-search-field__value-text">
                    <strong>{adults} người lớn</strong> · {children} trẻ em · {rooms} phòng
                  </div>
                </div>

                {showGuestDropdown && (
                  <div className="avora-guest-popover" onClick={(e) => e.stopPropagation()}>
                    {/* Capacity rule helper note */}
                    <div className="compact-popover__capacity-rule">
                      <span className="compact-popover__rule-icon">💡</span>
                      <span>
                        2 giường tiêu chuẩn = 4 người • Có thêm 1 giường phụ = tối đa 5 người/phòng.
                      </span>
                    </div>

                    {linkedNotice && (
                      <div className="compact-popover__linked-notice">
                        {linkedNotice}
                      </div>
                    )}

                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Người lớn</strong>
                        <span className="avora-guest-popover__sub">Từ 18 tuổi trở lên</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={adults <= 1}
                          onClick={() => handleAdultsDelta(-1)}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{adults}</span>
                        <button
                          type="button"
                          onClick={() => handleAdultsDelta(1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Trẻ em</strong>
                        <span className="avora-guest-popover__sub">0 – 17 tuổi</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={children <= 0}
                          onClick={() => handleChildrenDelta(-1)}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{children}</span>
                        <button
                          type="button"
                          onClick={() => handleChildrenDelta(1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="avora-guest-popover__row">
                      <div className="avora-guest-popover__info">
                        <strong className="avora-guest-popover__title">Phòng</strong>
                        <span className="avora-guest-popover__sub">Số lượng phòng</span>
                      </div>
                      <div className="avora-guest-popover__counter">
                        <button
                          type="button"
                          disabled={rooms <= 1 || (rooms - 1) * 5 < totalGuests}
                          title={
                            (rooms - 1) * 5 < totalGuests
                              ? `1 phòng tối đa 5 người. ${totalGuests} người cần ít nhất ${minRoomsRequired} phòng!`
                              : undefined
                          }
                          onClick={() => handleRoomsDelta(-1)}
                        >
                          -
                        </button>
                        <span className="avora-guest-popover__count">{rooms}</span>
                        <button
                          type="button"
                          onClick={() => handleRoomsDelta(1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="compact-popover__footer">
                      <button
                        type="button"
                        className="compact-popover__apply-btn"
                        onClick={() => setShowGuestDropdown(false)}
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Submit Button */}
              <button
                type="submit"
                className="compact-search-btn"
                aria-label="Tìm kiếm khách sạn"
                title="Tìm kiếm"
              >
                <SearchIcon />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── 2. MAIN CONTENT AREA (BREADCRUMB + 2-COLUMN LAYOUT) ─── */}
      <div className="hotel-search-container">
        {/* Breadcrumb Navigation */}
        <nav className="hotel-breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="hotel-breadcrumb__link">Trang chủ</Link>
          <span className="hotel-breadcrumb__sep">/</span>
          <Link to="/hotels" className="hotel-breadcrumb__link">Việt Nam</Link>
          {destination && destination.trim().toLowerCase() !== 'việt nam' && destination.trim().toLowerCase() !== 'viet nam' && (
            <>
              <span className="hotel-breadcrumb__sep">/</span>
              <span className="hotel-breadcrumb__destination">
                {destination.split(',')[0].trim()}
              </span>
            </>
          )}
          <span className="hotel-breadcrumb__sep">/</span>
          <span className="hotel-breadcrumb__current">Kết quả tìm kiếm</span>
        </nav>

        {/* 2-Column Responsive Layout */}
        <div className="hotel-search-layout">
          {/* Left Sidebar: Map & Filters */}
          <FilterSidebar
            filterStats={filterStats}
            selectedPriceRange={selectedPriceRange}
            onPriceRangeChange={setSelectedPriceRange}
            selectedStars={selectedStars}
            onStarToggle={handleStarToggle}
            selectedScore={selectedScore}
            onScoreChange={setSelectedScore}
            selectedFacilities={selectedFacilities}
            onFacilityToggle={handleFacilityToggle}
            selectedCapacity={selectedCapacity}
            onCapacityChange={setSelectedCapacity}
            guestsPerRoom={guestsPerRoom}
            onlyAvailable={onlyAvailable}
            onOnlyAvailableChange={setOnlyAvailable}
            onResetAll={handleResetAllFilters}
            onOpenMap={() => setIsMapOpen(true)}
          />

          {/* Right Column: Search Results Feed */}
          <main className="hotel-results-feed">
            {/* Header: Title, Count & Map Button */}
            <div className="hotel-results-header">
              <div className="hotel-results-header__left">
                <h1 className="hotel-results-title">
                  {destination ? `${destination}: ` : 'Việt Nam: '}
                  <span className="hotel-results-count">{hotels.length} chỗ nghỉ tìm thấy</span>
                </h1>
                <p className="hotel-results-subtitle">
                  Giá tốt nhất thị trường cho kỳ nghỉ {nights} đêm
                </p>
              </div>

              <button
                type="button"
                className="hotel-results-map-btn"
                onClick={() => setIsMapOpen(true)}
              >
                <MapViewIcon />
                <span>Xem trên bản đồ</span>
              </button>
            </div>

            {/* Urgency Alert Banner (Amber/Yellow Card) */}
            <div className="hotel-urgency-banner">
              <span className="hotel-urgency-banner__icon">
                <InfoCircleIcon />
              </span>
              <p className="hotel-urgency-banner__text">
                <strong>78% chỗ nghỉ tại {destination ? destination.split(',')[0].trim() : 'điểm đến này'} không còn phòng trống</strong> cho ngày bạn chọn trên trang web của chúng tôi. Hãy nhanh tay đặt ngay để giữ mức giá tốt này!
              </p>
            </div>

            {/* Sorting Tabs Segment */}
            <div className="hotel-sort-tabs">
              {SORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`hotel-sort-tab ${sortBy === tab.id ? 'is-active' : ''}`}
                  onClick={() => setSortBy(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results Content List */}
            {isLoading ? (
              <div className="hotel-loading-state">
                <div className="hotel-skeleton-card" />
                <div className="hotel-skeleton-card" />
                <div className="hotel-skeleton-card" />
              </div>
            ) : errorMsg ? (
              <div className="hotel-empty-state">
                <div className="hotel-empty-state__icon">🔍</div>
                <h3 className="hotel-empty-state__title">Không tìm thấy phòng</h3>
                <p className="hotel-empty-state__desc">
                  {errorMsg.toLowerCase().includes('không tìm thấy') || errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('500') || errorMsg.toLowerCase().includes('kết nối')
                    ? 'Rất tiếc, hệ thống không tìm thấy phòng nào phù hợp hoặc kết nối tạm thời gián đoạn. Vui lòng kiểm tra lại thời gian hoặc thử lại.'
                    : errorMsg}
                </p>
                <button
                  type="button"
                  className="hotel-empty-state__btn"
                  onClick={fetchHotels}
                >
                  Thử lại
                </button>
              </div>
            ) : isDbEmpty ? (
              <div className="hotel-empty-state">
                <div className="hotel-empty-state__icon">🏨</div>
                <h3 className="hotel-empty-state__title">Không tìm thấy phòng</h3>
                <p className="hotel-empty-state__desc">
                  Hiện tại chưa có thông tin phòng nào được lưu trữ trong cơ sở dữ liệu.
                </p>
              </div>
            ) : (capacityNotice || guestsPerRoom > 5) ? (
              <div className="hotel-empty-state hotel-empty-state--capacity">
                <div className="hotel-empty-state__icon">⚠️</div>
                <h3 className="hotel-empty-state__title">Không có loại phòng như vậy!</h3>
                <div className="hotel-capacity-rule-box">
                  <p className="hotel-capacity-rule-title">Quy chuẩn sức chứa phòng:</p>
                  <ul className="hotel-capacity-rule-list">
                    <li><strong>2 giường tiêu chuẩn × 2 người = 4 người</strong></li>
                    <li><strong>Có thêm 1 giường phụ × 1 người = tối đa 5 người</strong></li>
                    <li className="hotel-capacity-rule-highlight">
                      <strong>⛔ Không được cho phép booking 6 người vào phòng này!</strong>
                    </li>
                  </ul>
                </div>
                <p className="hotel-empty-state__desc">
                  Bạn đang tìm kiếm cho <strong>{totalGuests} người</strong> trong <strong>{rooms} phòng</strong> ({guestsPerRoom} người/phòng).
                  Hệ thống không có loại phòng nào chứa được vượt quá 5 người trong 1 phòng.
                </p>
                <div className="hotel-empty-state__actions">
                  <button
                    type="button"
                    className="hotel-empty-state__btn hotel-empty-state__btn--primary"
                    onClick={() => {
                      const minR = Math.ceil(totalGuests / 5);
                      setRooms(minR);
                      setCapacityNotice(null);
                      const qp = new URLSearchParams(searchParams);
                      qp.set('rooms', minR);
                      setSearchParams(qp, { replace: true });
                    }}
                  >
                    Tự động tăng lên {minRoomsRequired} phòng và tìm kiếm
                  </button>
                  <button
                    type="button"
                    className="hotel-empty-state__btn"
                    onClick={() => {
                      setAdults(2);
                      setChildren(0);
                      setRooms(1);
                      setCapacityNotice(null);
                      const qp = new URLSearchParams(searchParams);
                      qp.set('adults', 2);
                      qp.set('children', 0);
                      qp.set('rooms', 1);
                      setSearchParams(qp, { replace: true });
                    }}
                  >
                    Đặt lại: 2 người lớn · 1 phòng
                  </button>
                </div>
              </div>
            ) : hotels.length === 0 ? (
              <div className="hotel-empty-state">
                <div className="hotel-empty-state__icon">🔍</div>
                <h3 className="hotel-empty-state__title">Không tìm thấy phòng</h3>
                <p className="hotel-empty-state__desc">
                  Không có phòng nào phù hợp với yêu cầu tìm kiếm {destination ? `tại "${destination}"` : ''} trong khoảng thời gian {nights} đêm bạn đã chọn. Vui lòng thử nới lỏng các tiêu chí tìm kiếm hoặc đổi ngày lưu trú.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="hotel-empty-state__btn"
                    onClick={handleResetAllFilters}
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="hotel-cards-list">
                {hotels.map((hotel) => (
                  <HotelCard
                    key={hotel.hotel_id}
                    hotel={hotel}
                    nights={nights}
                    guests={adults}
                    onSelectHotel={(h) => {
                      navigate(`/hotels/${h.hotel_id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ─── 3. INTERACTIVE MAP MODAL ─── */}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        hotels={hotels}
        destination={destination}
      />
    </div>
  );
};

export default HotelSearchPage;
