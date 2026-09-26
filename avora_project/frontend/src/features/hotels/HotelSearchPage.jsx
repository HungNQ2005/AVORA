import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import HotelCard from './components/HotelCard';
import FilterSidebar from './components/FilterSidebar';
import MapModal from './components/MapModal';
import './HotelSearchPage.css';

/* Custom SVG Icons */
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

const HotelSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Primary Search Fields
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '2024-07-12');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '2024-07-14');
  const [adults, setAdults] = useState(Number(searchParams.get('adults')) || 2);
  const [children, setChildren] = useState(Number(searchParams.get('children')) || 0);
  const [rooms, setRooms] = useState(Number(searchParams.get('rooms')) || 1);

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
  const [selectedTypes, setSelectedTypes] = useState(
    searchParams.get('types') ? searchParams.get('types').split(',') : []
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

  // Calculate stay nights
  const nights = useMemo(() => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 2;
    } catch {
      return 2;
    }
  }, [checkIn, checkOut]);

  // Formatted date string for compact search bar
  const formattedDates = useMemo(() => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const day1 = d1.getDate() < 10 ? `0${d1.getDate()}` : d1.getDate();
      const m1 = d1.getMonth() + 1 < 10 ? `0${d1.getMonth() + 1}` : d1.getMonth() + 1;
      const day2 = d2.getDate() < 10 ? `0${d2.getDate()}` : d2.getDate();
      const m2 = d2.getMonth() + 1 < 10 ? `0${d2.getMonth() + 1}` : d2.getMonth() + 1;
      return `T6, ${day1} Th${m1} – CN, ${day2} Th${m2} (${nights} đêm)`;
    } catch {
      return 'T6, 12 Th07 – CN, 14 Th07 (2 đêm)';
    }
  }, [checkIn, checkOut, nights]);

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
    if (sortBy) queryParams.set('sortBy', sortBy);

    if (minPrice !== null) queryParams.set('minPrice', minPrice);
    if (maxPrice !== null) queryParams.set('maxPrice', maxPrice);
    if (selectedStars.length > 0) queryParams.set('starRatings', selectedStars.join(','));
    if (selectedScore !== null) queryParams.set('minScore', selectedScore);
    if (onlyAvailable) queryParams.set('onlyAvailable', 'true');

    // Combine facilities & types for backend filter
    const facilitiesParam = [...selectedFacilities];
    if (selectedTypes.includes('beachCenter')) facilitiesParam.push('biển');
    if (facilitiesParam.length > 0) queryParams.set('facilities', facilitiesParam.join(','));

    try {
      const response = await fetch(`${API_ENDPOINTS.HOTELS}?${queryParams.toString()}`);
      const result = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Không thể tải danh sách khách sạn');
      }

      const hotelData = result.data?.hotels || [];
      const stats = result.data?.filterStats || {};

      setHotels(hotelData);
      setFilterStats(stats);

      // Check if DB is completely empty (no hotels at all)
      if (stats.priceRanges?.all === 0 && (!destination || destination.trim() === '')) {
        setIsDbEmpty(true);
      } else {
        setIsDbEmpty(false);
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
    sortBy,
    selectedPriceRange,
    selectedStars,
    selectedScore,
    selectedFacilities,
    selectedTypes,
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

  const handleTypeToggle = (typeKey) => {
    setSelectedTypes((prev) =>
      prev.includes(typeKey) ? prev.filter((t) => t !== typeKey) : [...prev, typeKey]
    );
  };

  const handleResetAllFilters = () => {
    setDestination('');
    setSelectedPriceRange('all');
    setSelectedStars([]);
    setSelectedScore(null);
    setSelectedFacilities([]);
    setSelectedTypes([]);
    setOnlyAvailable(false);
    setSortBy('popularity');
  };

  // Check if any filter is active
  const hasActiveFilters =
    Boolean(destination && destination.trim()) ||
    selectedPriceRange !== 'all' ||
    selectedStars.length > 0 ||
    selectedScore !== null ||
    selectedFacilities.length > 0 ||
    selectedTypes.length > 0 ||
    onlyAvailable;

  return (
    <div className="hotel-search-page">
      {/* ─── 1. TOP COMPACT SEARCH BAR (YELLOW ACCENT BORDER) ─── */}
      <section className="search-bar-strip">
        <div className="search-bar-strip__container">
          <form className="compact-search-box" onSubmit={handleSearchSubmit}>
            {/* Field 1: Destination */}
            <div className="compact-search-field compact-search-field--dest">
              <span className="compact-search-field__icon">
                <BedIcon />
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Điểm đến, khách sạn..."
                className="compact-search-input"
              />
            </div>

            <div className="compact-search-divider" />

            {/* Field 2: Dates */}
            <div className="compact-search-field compact-search-field--dates">
              <span className="compact-search-field__icon">
                <CalendarIcon />
              </span>
              <span className="compact-search-field__text">{formattedDates}</span>
            </div>

            <div className="compact-search-divider" />

            {/* Field 3: Guests & Rooms */}
            <div className="compact-search-field compact-search-field--guests">
              <span className="compact-search-field__icon">
                <UsersIcon />
              </span>
              <span className="compact-search-field__text">
                {adults} người lớn · {children} trẻ em · {rooms} phòng
              </span>
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="compact-search-btn"
              aria-label="Tìm kiếm khách sạn"
            >
              <SearchIcon />
            </button>
          </form>
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
            onlyAvailable={onlyAvailable}
            onOnlyAvailableChange={setOnlyAvailable}
            selectedTypes={selectedTypes}
            onTypeToggle={handleTypeToggle}
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
                <strong>78% chỗ nghỉ tại {destination || 'Đà Nẵng'} không còn phòng trống</strong> cho ngày bạn chọn trên trang web của chúng tôi. Hãy nhanh tay đặt ngay để giữ mức giá tốt này!
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
                <div className="hotel-empty-state__icon">⚠️</div>
                <h3 className="hotel-empty-state__title">LỖI KẾT NỐI HỆ THỐNG</h3>
                <p className="hotel-empty-state__desc">{errorMsg}</p>
                <button
                  type="button"
                  className="hotel-empty-state__btn"
                  onClick={fetchHotels}
                >
                  Thử lại
                </button>
              </div>
            ) : isDbEmpty ? (
              /* Mandatory requirement: If DB contains no data -> "CHƯA CÓ DỮ LIỆU" */
              <div className="hotel-empty-state">
                <div className="hotel-empty-state__icon">🏨</div>
                <h3 className="hotel-empty-state__title">CHƯA CÓ DỮ LIỆU</h3>
                <p className="hotel-empty-state__desc">
                  Hiện tại chưa có thông tin khách sạn nào được lưu trữ trong cơ sở dữ liệu.
                </p>
              </div>
            ) : hotels.length === 0 ? (
              /* Mandatory requirement: If search/filter returns no matching results -> "KHÔNG TÌM THẤY NƠI NGHỈ PHÙ HỢP" */
              <div className="hotel-empty-state">
                <div className="hotel-empty-state__icon">🔍</div>
                <h3 className="hotel-empty-state__title">KHÔNG TÌM THẤY NƠI NGHỈ PHÙ HỢP</h3>
                <p className="hotel-empty-state__desc">
                  Không có kết quả nào phù hợp với bộ lọc hiện tại của bạn. Vui lòng thử nới lỏng các tiêu chí tìm kiếm.
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
