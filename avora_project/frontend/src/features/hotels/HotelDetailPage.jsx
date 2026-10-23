import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import NotFoundNotice from '../../common/components/NotFoundNotice';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';
import MapModal from './components/MapModal';
import { useAuth } from '../../context/AuthContext';
import { isHotelSaved, toggleFavoriteHotel } from '../../utils/favoritesStorage';
import { getRoomCapacityDetails } from '../../utils/roomCapacityHelper';
import './HotelDetailPage.css';

import {
  StarIcon as StarFilledIcon,
  StarIcon,
  HeartIcon,
  ShareIcon,
  PinIcon,
  ShieldCheckIcon,
  CheckIcon,
  CameraIcon,
  CalendarIcon,
  CartIcon,
  BeachIcon,
  PoolIcon as PoolWavesIcon,
  CoffeeIcon as BreakfastIcon,
  SpaIcon,
  DumbbellIcon as GymIcon,
  WifiIcon,
  WineIcon as CocktailBarIcon,
  BusIcon as ShuttleVanIcon,
  FlameIcon,
  SlidersIcon,
  UsersIcon,
  BedIcon,
  AlertTriangleIcon,
  BuildingIcon,
  CompassIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../common/components/icons';

/* Icon mapper for 8 Highlighted Amenities */
const getAmenityIcon = (id) => {
  switch (id) {
    case 'beach': return <BeachIcon size={22} color="#006ce4" />;
    case 'pool': return <PoolWavesIcon size={22} color="#006ce4" />;
    case 'breakfast': return <BreakfastIcon size={22} color="#006ce4" />;
    case 'shuttle': return <ShuttleVanIcon size={22} color="#006ce4" />;
    case 'spa': return <SpaIcon size={22} color="#006ce4" />;
    case 'gym': return <GymIcon size={22} color="#006ce4" />;
    case 'wifi': return <WifiIcon size={22} color="#006ce4" />;
    case 'bar': return <CocktailBarIcon size={22} color="#006ce4" />;
    default: return <CheckIcon size={22} color="#006ce4" />;
  }
};

/* Format currency in VND with dots (e.g. 5.200.000 VND) */
const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

/**
 * Clean up policy description for customer display:
 * Strips internal <!--META:...--> comments and [Policy Name] brackets,
 * leaving clean, concise benefits text.
 */
const cleanPolicyText = (raw) => {
  if (!raw || typeof raw !== 'string') return 'Theo chính sách đặt phòng của khách sạn';
  let clean = raw.replace(/<!--META:[\s\S]*?-->/g, '').trim();
  clean = clean.replace(/^\[.*?\]\s*/g, '').trim();
  const condMatch = clean.match(/Điều kiện:\s*(.*)$/i);
  let descText = clean;
  if (condMatch) {
    descText = descText.replace(/Điều kiện:\s*.*$/i, '').trim();
  }
  if (descText) return descText;
  if (condMatch && condMatch[1] && condMatch[1].trim()) {
    return condMatch[1].trim();
  }
  return clean || 'Theo chính sách đặt phòng của khách sạn';
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
  const children = Number(searchParams.get('children')) || 0;
  const roomsCount = Math.max(1, Number(searchParams.get('rooms')) || 1);
  const totalGuests = adults + children;
  const guestsPerRoom = Math.ceil(totalGuests / roomsCount);

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

  const formattedStayDates = useMemo(() => {
    try {
      const parts1 = checkIn.split('-');
      const parts2 = checkOut.split('-');
      return `${parts1[2]}/${parts1[1]} – ${parts2[2]}/${parts2[1]}`;
    } catch {
      return `${checkIn} – ${checkOut}`;
    }
  }, [checkIn, checkOut]);

  // Component state
  const [hotel, setHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notFound, setNotFound] = useState(false);
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

  // Ref for smooth scroll to room booking section
  const roomsSectionRef = useRef(null);

  // Fetch hotel details from API / Database
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setNotFound(false);

    const fetchDetails = async () => {
      try {
        const url = `${API_ENDPOINTS.HOTEL_DETAIL(id || 1)}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${roomsCount}`;
        const res = await fetch(url);
        const json = await res.json();

        if (res.status === 404) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (!res.ok || json.status === 'error') {
          throw new Error(json.message || 'Không thể tải thông tin khách sạn');
        }

        if (json.data?.hotel_status && json.data.hotel_status !== 'ACTIVE') {
          throw new Error('Khách sạn hiện không hoạt động hoặc chưa được kích hoạt.');
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
  }, [id, checkIn, checkOut, adults, children, roomsCount]);

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
    setToastMsg(nowSaved ? 'Đã thêm khách sạn vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích');
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
            Đang tải thông tin khách sạn...
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <NotFoundNotice
        title="Không tìm thấy khách sạn"
        reason="Khách sạn không tồn tại, chưa được duyệt hoặc đã ngừng hoạt động."
      />
    );
  }

  if (errorMsg && !hotel) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Không thể kết nối đến hệ thống</h2>
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

  const roomTypes = [...new Map(
    rooms.map((room) => [room.room_type_id, room])
  ).values()];
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
                  <div className="hotel-score-reviews">{reviews_count} đánh giá thực tế</div>
                </div>
                <div className="hotel-score-badge">{Number(star_rating).toFixed(1)}</div>
              </div>

              <div className="hotel-actions-group">
                <button
                  type="button"
                  className={`hotel-action-btn ${isFavorited ? 'is-favorited' : ''}`}
                  onClick={handleFavoriteClick}
                  title={isFavorited ? 'Đã lưu trong danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
                >
                  <HeartIcon filled={isFavorited} />
                  <span>{isFavorited ? 'Đã yêu thích' : 'Yêu thích'}</span>
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
                <CheckIcon size={20} color="#006ce4" />
              </span>
              <span>Tiện nghi nổi bật ({facilities.length})</span>
            </h2>

            {/* Grid of actual DB Amenities */}
            {facilities.length > 0 ? (
              <div className="amenities-pill-grid">
                {facilities.map((item) => (
                  <div key={item.id} className="amenity-tile">
                    <span className="amenity-tile-icon">
                      {item.type === 'POOL' ? <PoolWavesIcon size={20} color="#006ce4" /> : item.type === 'INTERNET' ? <WifiIcon size={20} color="#006ce4" /> : <CheckIcon size={18} color="#006ce4" />}
                    </span>
                    <span className="amenity-tile-label">{item.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '13.5px' }}>Chưa có thông tin tiện nghi.</p>
            )}

            {/* Description Text directly from DB */}
            <div className="hotel-description-paragraphs">
              <p>{description || 'Đang cập nhật thông tin mô tả chi tiết.'}</p>
            </div>
          </section>

          {/* Right Column: Location & Address from Database */}
          <section className="hotel-location-card">
            <div className="location-card-header">
              <h2 className="hotel-card-title" style={{ margin: 0 }}>
                <span className="hotel-card-title-icon">
                  <PinIcon size={18} color="#006ce4" />
                </span>
                <span>Vị trí tại {district_name || city_name || 'khu vực'}</span>
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
                <CompassIcon size={16} />
                <span>Xem trên bản đồ</span>
              </button>
            </div>

            {/* Address & Ward Details from DB */}
            <ul className="location-landmarks-list">
              <li className="landmark-item">
                <div className="landmark-left">
                  <span className="landmark-icon">
                    <PinIcon size={16} color="#006ce4" />
                  </span>
                  <span>Địa chỉ</span>
                </div>
                <span className="landmark-distance">{address}</span>
              </li>
              {ward_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">
                      <BuildingIcon size={16} color="#006ce4" />
                    </span>
                    <span>Phường/Xã</span>
                  </div>
                  <span className="landmark-distance">{ward_name}</span>
                </li>
              )}
              {district_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">
                      <BuildingIcon size={16} color="#006ce4" />
                    </span>
                    <span>Quận/Huyện</span>
                  </div>
                  <span className="landmark-distance">{district_name}</span>
                </li>
              )}
              {city_name && (
                <li className="landmark-item">
                  <div className="landmark-left">
                    <span className="landmark-icon">
                      <BuildingIcon size={16} color="#006ce4" />
                    </span>
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
                <span>
                  {cleanPolicyText(cancellation_policy.description)}
                </span>
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
                Bảng giá và phòng trống được cập nhật theo thời gian thực
              </p>
            </div>

            <div className="rooms-date-pill">
              <CalendarIcon />
              <span>
                {formattedStayDates} ({adults} người lớn{children > 0 ? `, ${children} trẻ em` : ''} · {roomsCount} phòng)
              </span>
            </div>
          </div>

          {/* Rooms Stack from DB */}
          {roomTypes.length > 0 ? (
            <div className="rooms-list">
              {roomTypes.map((room) => {
                const capDetails = getRoomCapacityDetails(room);
                const isCapacityExceeded = guestsPerRoom > capDetails.maxCapacity;

                return (
                  <article
                    key={room.room_id || room.room_type_id}
                    className={`room-card ${isCapacityExceeded ? 'room-card--capacity-exceeded' : ''}`}
                  >
                    {/* Column 1: Info & Photo */}
                    <div className="room-card-col-info">
                      <span className="room-badge room-badge--default">
                        Hạng phòng tiêu chuẩn
                      </span>

                      <h3 className="room-name">{room.name}</h3>

                      <div className="room-image-wrap">
                        <img
                          src={room.image || images[1] || mainImage || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'}
                          alt={room.name}
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <span className="room-count-badge">
                          {room.available_rooms > 0 ? `${room.available_rooms} phòng` : 'Hết phòng'}
                        </span>
                      </div>

                      <ul className="room-specs-list">
                        {room.room_size && (
                          <li className="room-spec-item">
                            <span className="room-spec-icon">
                              <SlidersIcon size={14} color="#6b7280" />
                            </span>
                            <span>Diện tích: {room.room_size}</span>
                          </li>
                        )}
                        <li className="room-spec-item">
                          <span className="room-spec-icon">
                            <UsersIcon size={14} color="#6b7280" />
                          </span>
                          <span>
                            Sức chứa: {capDetails.standardBeds} giường tiêu chuẩn ({capDetails.standardCapacity} người)
                            {capDetails.hasExtraBed ? ` + 1 giường phụ (${capDetails.extraBedCapacity} người)` : ''} = Tối đa {capDetails.maxCapacity} người
                          </span>
                        </li>
                        {room.bed_type && (
                          <li className="room-spec-item">
                            <span className="room-spec-icon">
                              <BedIcon size={14} color="#6b7280" />
                            </span>
                            <span>{room.bed_type}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Column 2: Benefits & Capacity Alerts */}
                    <div className="room-card-col-benefits">
                      <h4 className="benefits-title">QUYỀN LỢI &amp; CHÍNH SÁCH</h4>

                      <ul className="benefits-list">
                        <li className="benefit-item">
                          <span className="benefit-icon">
                            <CheckIcon />
                          </span>
                          <span>{cleanPolicyText(room.policy_description)}</span>
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

                      {/* Capacity Status Notice */}
                      {isCapacityExceeded ? (
                        <div className="room-capacity-alert room-capacity-alert--blocked">
                          <span className="room-capacity-alert__icon">
                            <AlertTriangleIcon size={18} color="#dc2626" />
                          </span>
                          <div className="room-capacity-alert__content">
                            <strong>Không được cho phép booking {guestsPerRoom} người vào phòng này!</strong>
                            <p>
                              Phòng này chỉ gồm {capDetails.standardBeds} giường tiêu chuẩn ({capDetails.standardCapacity} người) + 1 giường phụ ({capDetails.extraBedCapacity} người) = tối đa {capDetails.maxCapacity} người.
                              Không thể đặt cho {guestsPerRoom} người.
                            </p>
                          </div>
                        </div>
                      ) : guestsPerRoom === 5 && capDetails.maxCapacity === 5 ? (
                        <div className="room-capacity-alert room-capacity-alert--extra-bed">
                          <span className="room-capacity-alert__icon">
                            <BedIcon size={18} color="#0284c7" />
                          </span>
                          <div className="room-capacity-alert__content">
                            <strong>Đã kích hoạt 01 giường phụ:</strong>
                            <p>4 người ở 2 giường tiêu chuẩn + 1 người ở 1 giường phụ (tổng 5 người).</p>
                          </div>
                        </div>
                      ) : null}

                      {room.available_rooms > 0 && room.available_rooms <= 5 && (
                        <div className="room-urgency-tag">
                          <FlameIcon />
                          <span>Chỉ còn {room.available_rooms} phòng trống với mức giá này!</span>
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

                      {isCapacityExceeded ? (
                        <button
                          type="button"
                          className="room-select-btn room-select-btn--blocked"
                          disabled
                          title={`Không được phép đặt ${guestsPerRoom} người vào phòng này! Tối đa ${capDetails.maxCapacity} người.`}
                          onClick={() => {
                            setToastMsg(`Không được cho phép booking ${guestsPerRoom} người vào phòng này! Phòng tối đa ${capDetails.maxCapacity} người.`);
                          }}
                        >
                          <span>Quá sức chứa ({guestsPerRoom}/{capDetails.maxCapacity} người)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="room-select-btn"
                          onClick={() => {
                            if (guestsPerRoom > capDetails.maxCapacity) {
                              setToastMsg(`Không được cho phép booking ${guestsPerRoom} người vào phòng này! Tối đa ${capDetails.maxCapacity} người.`);
                              return;
                            }
                            navigate('/booking', {
                              state: {
                                hotel,
                                room,
                                checkIn,
                                checkOut,
                                nights,
                                adults,
                                children,
                                roomsCount,
                              },
                            });
                          }}
                        >
                          <CartIcon />
                          <span>Chọn phòng này</span>
                        </button>
                      )}

                      <div className="room-microcopy">
                        {isCapacityExceeded
                          ? 'Vui lòng chọn phòng có sức chứa lớn hơn'
                          : 'Đặt phòng nhanh · Hỗ trợ 24/7'}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#6b7280', padding: '20px 0' }}>Hiện tại chưa có phòng trống phù hợp với ngày lưu trú đã chọn.</p>
          )}
        </section>

        {/* ─── 6. VERIFIED CUSTOMER REVIEWS SECTION FROM DATABASE ─── */}
        <section className="hotel-reviews-section">
          <div className="reviews-section-header">
            <div>
              <h2 className="reviews-section-title">Đánh giá từ khách hàng thực tế ({reviews.length})</h2>
              <p className="reviews-section-subtitle">
                100% đánh giá xác thực từ khách hàng đã đặt phòng và lưu trú
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
              Chưa có đánh giá nào cho chỗ nghỉ này.
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
              <CloseIcon size={20} color="#ffffff" />
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
              <ChevronLeftIcon size={24} color="#ffffff" />
            </button>

            <button
              type="button"
              className="lightbox-nav-btn lightbox-nav-btn--next"
              onClick={handleNextImage}
            >
              <ChevronRightIcon size={24} color="#ffffff" />
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
        destination={city_name || address || ''}
      />
    </div>
  );
};

export default HotelDetailPage;
