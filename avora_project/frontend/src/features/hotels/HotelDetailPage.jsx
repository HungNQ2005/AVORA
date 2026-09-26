import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import MapModal from './components/MapModal';
import { useAuth } from '../../context/AuthContext';
import { isHotelSaved, toggleFavoriteHotel } from '../../utils/favoritesStorage';
import './HotelDetailPage.css';

/* ─── CUSTOM SVG ICONS ─────────────────────────────────────────────────────── */
const StarFilledIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008009" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const SparkleStarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const CarShuttleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const BeachIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" />
    <path d="M17.5 6.5C16 4 13.5 2 12 2s-4 2-5.5 4.5c-1.5 2.5-1.5 5.5-1.5 5.5h14s0-3-1.5-5.5z" />
    <path d="m9 12 3 9" />
  </svg>
);

const PoolWavesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </svg>
);

const BreakfastIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

const SpaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9A9 9 0 0 1 3 11a9 9 0 0 1 9-9z" />
    <path d="M12 8a4 4 0 0 1 4 4c0 2.21-1.79 4-4 4a4 4 0 0 1-4-4c0-2.21 1.79-4 4-4z" />
  </svg>
);

const GymIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const WifiIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
  </svg>
);

const CocktailBarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 22h8" />
    <path d="M12 11v11" />
    <path d="m19 3-7 8-7-8h14z" />
  </svg>
);

const ShuttleVanIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const FlameIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#d93025" stroke="#d93025">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

/* Icon mapper for 8 Highlighted Amenities */
const getAmenityIcon = (id) => {
  switch (id) {
    case 'beach': return <BeachIcon />;
    case 'pool': return <PoolWavesIcon />;
    case 'breakfast': return <BreakfastIcon />;
    case 'shuttle': return <ShuttleVanIcon />;
    case 'spa': return <SpaIcon />;
    case 'gym': return <GymIcon />;
    case 'wifi': return <WifiIcon />;
    case 'bar': return <CocktailBarIcon />;
    default: return <SparkleStarIcon />;
  }
};

/* Format currency in VND with dots (e.g. 5.200.000 VND) */
const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

/**
 * HotelDetailPage — 100% faithful replication of the reference designs.
 * Fetches real database data via backend endpoint /api/hotels/:id
 */
const HotelDetailPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query parameters with dynamic today/future fallbacks
  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }, []);
  const defaultCheckOutISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, []);

  const rawCheckIn = searchParams.get('checkIn');
  const rawCheckOut = searchParams.get('checkOut');
  const checkIn = (rawCheckIn && rawCheckIn >= todayISO) ? rawCheckIn : todayISO;
  const checkOut = (rawCheckOut && rawCheckOut > checkIn) ? rawCheckOut : defaultCheckOutISO;
  const adults = Number(searchParams.get('adults')) || 2;
  const nights = useMemo(() => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 2;
    } catch {
      return 2;
    }
  }, [checkIn, checkOut]);

  // Component state
  const [hotel, setHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isFavorited, setIsFavorited] = useState(() => isHotelSaved(id));
  const [toastMsg, setToastMsg] = useState(null);

  // Sync isFavorited when hotel data or ID loads
  useEffect(() => {
    if (hotel?.hotel_id || id) {
      setIsFavorited(isHotelSaved(hotel?.hotel_id || id));
    }
  }, [hotel, id]);

  // Modals state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);

  // Ref for smooth scroll to room booking section
  const roomsSectionRef = useRef(null);

  // Fetch hotel details from API / Database
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    const fetchDetails = async () => {
      try {
        const url = `${API_ENDPOINTS.HOTEL_DETAIL(id || 1)}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.status === 'error') {
          throw new Error(json.message || 'Không thể tải thông tin khách sạn');
        }

        if (isMounted) {
          setHotel(json.data);
        }
      } catch (err) {
        console.error('Error fetching hotel detail:', err);
        if (isMounted) {
          setErrorMsg(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [id, checkIn, checkOut, adults]);

  // Toast notification auto-dismiss
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Actions
  const handleScrollToRooms = () => {
    if (roomsSectionRef.current) {
      roomsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShareClick = () => {
    navigator.clipboard?.writeText(window.location.href);
    setToastMsg('Đã sao chép liên kết khách sạn vào clipboard!');
  };

  const handleFavoriteClick = () => {
    const targetObj = hotel || { hotel_id: id };
    const nowSaved = toggleFavoriteHotel(targetObj);
    setIsFavorited(nowSaved);
    setToastMsg(nowSaved ? 'Đã lưu khách sạn vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích');
  };

  const handleOpenLightbox = (index = 0) => {
    setLightboxImgIdx(index);
    setIsLightboxOpen(true);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    const totalImgs = hotel?.images?.length || 1;
    if (totalImgs <= 1) return;
    setLightboxImgIdx((prev) => (prev === 0 ? totalImgs - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    const totalImgs = hotel?.images?.length || 1;
    if (totalImgs <= 1) return;
    setLightboxImgIdx((prev) => (prev === totalImgs - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowLeft') setLightboxImgIdx((prev) => (prev === 0 ? (hotel?.images?.length || 1) - 1 : prev - 1));
      if (e.key === 'ArrowRight') setLightboxImgIdx((prev) => (prev === (hotel?.images?.length || 1) - 1 ? 0 : prev + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, hotel]);

  if (isLoading) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#003580' }}>
            Đang tải dữ liệu từ cơ sở dữ liệu...
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg && !hotel) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Lỗi kết nối cơ sở dữ liệu</h2>
          <p style={{ color: '#4b5563', marginBottom: '24px' }}>{errorMsg}</p>
          <button
            type="button"
            className="hotel-book-now-btn"
            onClick={() => window.location.reload()}
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const {
    name = '',
    description = '',
    address = '',
    full_address = '',
    ward_name = '',
    district_name = '',
    city_name = '',
    star_quality = 5,
    star_rating = 9,
    reviews_count = 0,
    score_label = 'Xuất sắc',
    facilities = [],
    images = [],
    cancellation_policy = null,
    rooms = [],
    reviews = [],
  } = hotel || {};

  const mainImage = images[0] || hotel?.thumbnail || '';
  const sideImage = images[1] || mainImage;

  return (
    <div className="hotel-detail-page">
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#003580',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 100000,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toastMsg}
        </div>
      )}

      <div className="hotel-detail-container">
        {/* ─── 1. BREADCRUMBS ROW ─── */}
        <div className="hotel-breadcrumb-row">
          <nav className="hotel-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="hotel-breadcrumb-link">Trang chủ</Link>
            <span className="hotel-breadcrumb-sep">/</span>
            <Link to="/hotels" className="hotel-breadcrumb-link">Khách sạn Việt Nam</Link>
            {city_name && (
              <>
                <span className="hotel-breadcrumb-sep">/</span>
                <Link to={`/hotels?destination=${encodeURIComponent(city_name)}`} className="hotel-breadcrumb-link">
                  Khách sạn {city_name}
                </Link>
              </>
            )}
            <span className="hotel-breadcrumb-sep">/</span>
            <span className="hotel-breadcrumb-current">{name}</span>
          </nav>

          <div className="hotel-preferred-badge">
            <ShieldCheckIcon />
            <span>Chỗ nghỉ đạt chuẩn Avora Preferred+</span>
          </div>
        </div>

        {/* ─── 2. HOTEL HEADER CARD ─── */}
        <section className="hotel-header-card">
          <div className="hotel-header-top-row">
            {/* Left Column: Stars, Badges, Title, Location */}
            <div className="hotel-header-left">
              <div className="hotel-meta-row">
                <div className="hotel-stars" title={`${star_quality} sao`}>
                  {Array.from({ length: star_quality }).map((_, i) => (
                    <StarFilledIcon key={i} />
                  ))}
                </div>
                <span className="hotel-badge hotel-badge--promo">Khách sạn {star_quality} sao</span>
                {city_name && (
                  <span className="hotel-badge hotel-badge--luxury">{city_name}</span>
                )}
              </div>

              <h1 className="hotel-title">{name}</h1>

              <div className="hotel-location-row">
                <span className="hotel-location-icon">
                  <PinIcon />
                </span>
                <span>{full_address || address}</span>
                <span>—</span>
                <button
                  type="button"
                  className="hotel-location-map-link"
                  onClick={() => setIsMapModalOpen(true)}
                >
                  Vị trí xuất sắc · Hiển thị trên bản đồ
                </button>
              </div>
            </div>

            {/* Right Column: Score Box & Action Buttons */}
            <div className="hotel-header-right">
              <div className="hotel-score-box">
                <div className="hotel-score-text">
                  <div className="hotel-score-label">{score_label}</div>
                  <div className="hotel-score-reviews">{reviews_count} đánh giá từ cơ sở dữ liệu</div>
                </div>
                <div className="hotel-score-badge">{Number(star_rating).toFixed(1)}</div>
              </div>

              <div className="hotel-actions-group">
                <button
                  type="button"
                  className={`hotel-action-btn ${isFavorited ? 'is-favorited' : ''}`}
                  onClick={handleFavoriteClick}
                >
                  <HeartIcon filled={isFavorited} />
                  <span>{isFavorited ? 'Đã lưu' : 'Lưu'}</span>
                </button>

                <button
                  type="button"
                  className="hotel-action-btn"
                  onClick={handleShareClick}
                >
                  <ShareIcon />
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  className="hotel-book-now-btn"
                  onClick={handleScrollToRooms}
                >
                  Đặt phòng ngay
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. PHOTO GALLERY ─── */}
        <section className="hotel-gallery-grid">
          {/* Main Large Photo */}
          <div className="hotel-gallery-main" onClick={() => handleOpenLightbox(0)}>
            <img
              src={mainImage}
              alt={name}
              loading="eager"
            />
          </div>

          {/* Right Side Photo */}
          <div className="hotel-gallery-side">
            <div className="hotel-gallery-side-item" style={{ height: '100%' }} onClick={() => handleOpenLightbox(1)}>
              <img
                src={sideImage}
                alt={`${name} preview`}
                loading="lazy"
              />
            </div>
          </div>

          {/* View All Photos Button */}
          <button
            type="button"
            className="hotel-view-all-photos-btn"
            onClick={() => handleOpenLightbox(0)}
          >
            <CameraIcon />
            <span>Xem hình ảnh ({images.length > 0 ? images.length : 1})</span>
          </button>
        </section>

        {/* ─── 4. TWO-COLUMN OVERVIEW (AMENITIES + LOCATION) ─── */}
        <div className="hotel-overview-grid">
          {/* Left Column: Amenities from Database */}
          <section className="hotel-amenities-card">
            <h2 className="hotel-card-title">
              <span className="hotel-card-title-icon">
                <SparkleStarIcon />
              </span>
              <span>Tiện nghi trong cơ sở dữ liệu ({facilities.length})</span>
            </h2>

            {/* Grid of actual DB Amenities */}
            {facilities.length > 0 ? (
              <div className="amenities-pill-grid">
                {facilities.map((item) => (
                  <div key={item.id} className="amenity-tile">
                    <span className="amenity-tile-icon">
                      {item.type === 'POOL' ? <PoolWavesIcon /> : item.type === 'INTERNET' ? <WifiIcon /> : <SparkleStarIcon />}
                    </span>
                    <span className="amenity-tile-label">{item.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '13.5px' }}>Chưa có danh sách tiện nghi được gán trong DB.</p>
            )}

            {/* Description Text directly from DB */}
            <div className="hotel-description-paragraphs">
              <p>{description || 'Chưa có mô tả chi tiết trong cơ sở dữ liệu.'}</p>
            </div>
          </section>

          {/* Right Column: Location & Address from Database */}
          <section className="hotel-location-card">
            <div className="location-card-header">
              <h2 className="hotel-card-title" style={{ margin: 0 }}>
                <span className="hotel-card-title-icon">
                  <PinIcon />
                </span>
                <span>Vị trí tại {district_name || cityName || 'khu vực'}</span>
              </h2>
              <span className="location-score-badge">
                Điểm {Number(star_rating).toFixed(1)} / 10
              </span>
            </div>

            {/* Map Preview Thumbnail */}
            <div className="location-map-preview" onClick={() => setIsMapModalOpen(true)}>
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80"
                alt="Bản đồ vị trí"
              />
              <button type="button" className="location-map-overlay-btn">
                🧭 Xem trên bản đồ
              </button>
            </div>

            {/* Address & Ward Details from DB */}
            <ul className="location-landmarks-list">
              <li className="landmark-item">
                <div className="landmark-left">
                  <span className="landmark-icon">📍</span>
                  <span>Địa chỉ</span>
                </div>
                <span className="landmark-distance">{address}</span>
              </li>
              {ward_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">🏘️</span>
                    <span>Phường/Xã</span>
                  </div>
                  <span className="landmark-distance">{ward_name}</span>
                </li>
              )}
              {district_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">🏛️</span>
                    <span>Quận/Huyện</span>
                  </div>
                  <span className="landmark-distance">{district_name}</span>
                </li>
              )}
              {city_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">🏙️</span>
                    <span>Thành phố</span>
                  </div>
                  <span className="landmark-distance">{city_name}</span>
                </li>
              )}
            </ul>

            {/* Cancellation Policy Callout Box from DB */}
            {cancellation_policy && (
              <div className="shuttle-callout-box">
                <span className="shuttle-callout-icon">
                  <ShieldCheckIcon />
                </span>
                <span>{cancellation_policy.description}</span>
              </div>
            )}
          </section>
        </div>

        {/* ─── 5. AVAILABLE ROOMS & PRICING TABLE FROM DATABASE ─── */}
        <section className="hotel-rooms-section" ref={roomsSectionRef} id="available-rooms">
          <div className="rooms-section-header">
            <div>
              <h2 className="rooms-section-title">Phòng còn trống &amp; Bảng giá chi tiết</h2>
              <p className="rooms-section-subtitle">
                Dữ liệu bảng giá và phòng trống được tải trực tiếp từ cơ sở dữ liệu
              </p>
            </div>

            <div className="rooms-date-pill">
              <CalendarIcon />
              <span>12/07 – 14/07 ({adults} người lớn)</span>
            </div>
          </div>

          {/* Rooms Stack from DB */}
          {rooms.length > 0 ? (
            <div className="rooms-list">
              {rooms.map((room) => (
                <article key={room.room_type_id} className="room-card">
                  {/* Column 1: Info & Photo */}
                  <div className="room-card-col-info">
                    <span className="room-badge room-badge--default">
                      Hạng phòng tiêu chuẩn
                    </span>

                    <h3 className="room-name">{room.name}</h3>

                    <div className="room-image-wrap">
                      <img
                        src={room.image || ''}
                        alt={room.name}
                        loading="lazy"
                      />
                      <span className="room-count-badge">
                        {room.available_rooms > 0 ? `${room.available_rooms} phòng` : 'Hết phòng'}
                      </span>
                    </div>

                    <ul className="room-specs-list">
                      {room.room_size && (
                        <li className="room-spec-item">
                          <span className="room-spec-icon">📐</span>
                          <span>Diện tích: {room.room_size}</span>
                        </li>
                      )}
                      <li className="room-spec-item">
                        <span className="room-spec-icon">👥</span>
                        <span>Tối đa {room.max_adults} người lớn{room.max_children ? `, ${room.max_children} trẻ em` : ''}</span>
                      </li>
                      {room.bed_type && (
                        <li className="room-spec-item">
                          <span className="room-spec-icon">🛏️</span>
                          <span>{room.bed_type}</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Column 2: Benefits */}
                  <div className="room-card-col-benefits">
                    <h4 className="benefits-title">QUYỀN LỢI &amp; CHÍNH SÁCH</h4>

                    <ul className="benefits-list">
                      <li className="benefit-item">
                        <span className="benefit-icon">
                          <CheckIcon />
                        </span>
                        <span>{room.policy_description || 'Theo chính sách đặt phòng của khách sạn'}</span>
                      </li>
                      <li className="benefit-item">
                        <span className="benefit-icon">
                          <CheckIcon />
                        </span>
                        <span>Xác nhận đặt phòng tức thì</span>
                      </li>
                      <li className="benefit-item">
                        <span className="benefit-icon">
                          <CheckIcon />
                        </span>
                        <span>Thanh toán tại quầy lễ tân khi nhận phòng</span>
                      </li>
                    </ul>

                    {room.available_rooms > 0 && room.available_rooms <= 5 && (
                      <div className="room-urgency-tag">
                        <FlameIcon />
                        <span>Còn {room.available_rooms} phòng trống theo cơ sở dữ liệu!</span>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Price & Action */}
                  <div className="room-card-col-pricing">
                    {room.original_price && room.original_price > room.price && (
                      <span className="room-original-price">
                        {formatPrice(room.original_price)}
                      </span>
                    )}

                    <div className="room-current-price">
                      {formatPrice(room.price)}
                    </div>

                    <span className="room-tax-note">
                      Giá niêm yết (chưa gồm thuế &amp; phí)
                    </span>

                    <button
                      type="button"
                      className="room-select-btn"
                      onClick={() => setSelectedRoomForBooking(room)}
                    >
                      <CartIcon />
                      <span>Chọn phòng này</span>
                    </button>

                    <div className="room-microcopy">
                      Đặt phòng nhanh · Hỗ trợ 24/7
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', padding: '20px 0' }}>Chưa có thông tin phòng trống trong cơ sở dữ liệu.</p>
          )}
        </section>

        {/* ─── 6. VERIFIED CUSTOMER REVIEWS SECTION FROM DATABASE ─── */}
        <section className="hotel-reviews-section">
          <div className="reviews-section-header">
            <div>
              <h2 className="reviews-section-title">Đánh giá từ khách hàng thực tế ({reviews.length})</h2>
              <p className="reviews-section-subtitle">
                Toàn bộ đánh giá được truy xuất trực tiếp từ bảng t_review trong cơ sở dữ liệu
              </p>
            </div>

            <div className="reviews-overall-box">
              <div className="reviews-score-badge">
                {Number(star_rating).toFixed(1)}
              </div>
              <div className="reviews-overall-text">
                <div className="reviews-overall-label">
                  {score_label}
                </div>
                <div className="reviews-overall-count">
                  {reviews.length} đánh giá thực tế
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews Grid from DB */}
          {reviews.length > 0 ? (
            <div className="customer-reviews-grid">
              {reviews.map((rev) => (
                <article key={rev.review_id} className="customer-review-card">
                  <div className="customer-review-header">
                    <div className="customer-author-info">
                      <div className="customer-avatar">
                        {(rev.guest_name || 'K').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="customer-name">{rev.guest_name}</div>
                        <div className="customer-trip-type">
                          {rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : 'Khách đã lưu trú'}
                        </div>
                      </div>
                    </div>
                    <span className="customer-score-tag">{rev.score} / 10</span>
                  </div>
                  <p className="customer-comment">"{rev.comment}"</p>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '14px', padding: '10px 0' }}>
              Chưa có đánh giá nào được ghi nhận trong cơ sở dữ liệu.
            </p>
          )}
        </section>
      </div>

      {/* ─── 7. LIGHTBOX GALLERY MODAL ─── */}
      {isLightboxOpen && (
        <div className="lightbox-backdrop" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setIsLightboxOpen(false)}
            >
              ✕
            </button>

            <img
              src={images[lightboxImgIdx] || mainImage}
              alt={`${name} photo ${lightboxImgIdx + 1}`}
              className="lightbox-img"
            />

            <button
              type="button"
              className="lightbox-nav-btn lightbox-nav-btn--prev"
              onClick={handlePrevImage}
            >
              ‹
            </button>

            <button
              type="button"
              className="lightbox-nav-btn lightbox-nav-btn--next"
              onClick={handleNextImage}
            >
              ›
            </button>

            <div className="lightbox-counter">
              {lightboxImgIdx + 1} / {images.length || 1}
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. INTERACTIVE MAP MODAL ─── */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        hotels={hotel ? [hotel] : []}
        destination={city_name || 'Hà Nội'}
      />

      {/* ─── 9. BOOKING CONFIRMATION MODAL ─── */}
      {selectedRoomForBooking && (
        <div className="booking-modal-backdrop" onClick={() => setSelectedRoomForBooking(null)}>
          <div className="booking-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-icon">🎉</div>
            <h3 className="booking-modal-title">Đặt chỗ thành công!</h3>
            <p className="booking-modal-desc">
              Bạn đã chọn <strong>{selectedRoomForBooking.name}</strong> tại <strong>{name}</strong>.
            </p>

            <div className="booking-modal-summary">
              {user && (
                <div className="booking-modal-row">
                  <span>Khách đặt phòng:</span>
                  <span><strong>{user.full_name || user.email}</strong></span>
                </div>
              )}
              <div className="booking-modal-row">
                <span>Thời gian lưu trú:</span>
                <span>12/07 – 14/07 (2 đêm)</span>
              </div>
              <div className="booking-modal-row">
                <span>Số lượng khách:</span>
                <span>{adults} người lớn</span>
              </div>
              <div className="booking-modal-row">
                <span>Chính sách hủy:</span>
                <span style={{ color: '#008009' }}>Miễn phí hủy phòng</span>
              </div>
              <div className="booking-modal-row">
                <span>Tổng giá tạm tính:</span>
                <span>{formatPrice(selectedRoomForBooking.price * nights)}</span>
              </div>
            </div>

            <button
              type="button"
              className="booking-modal-btn"
              onClick={() => {
                setSelectedRoomForBooking(null);
                setToastMsg('Đặt phòng thành công! Đơn đặt chỗ đã được ghi nhận.');
              }}
            >
              Hoàn tất &amp; Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetailPage;
