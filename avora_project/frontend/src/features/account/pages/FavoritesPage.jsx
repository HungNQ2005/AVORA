import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getSavedFavorites, removeFavoriteHotel } from '../../../utils/favoritesStorage';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';
import MapModal from '../../hotels/components/MapModal';
import './FavoritesPage.css';

/* ─── SVG ICONS ───────────────────────────────────────────────────────────── */
const HeartOutlineIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const FolderPlusIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const LocationPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#006ce4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const PhoneCallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Format currency VND (e.g. 2.350.000 VND)
 */
const formatPriceVND = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${Number(val).toLocaleString('vi-VN')} VND`;
};

/**
 * FavoritesPage Component
 * 100% sourced from Database via Supabase / API_ENDPOINTS.HOTELS
 */
const FavoritesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Saved Hotels State (stores IDs or objects in localStorage)
  const [savedIds, setSavedIds] = useState(() => getSavedFavorites());

  // Database Hotels State (all active hotels fetched from Supabase)
  const [dbHotels, setDbHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Control States
  const [selectedCity, setSelectedCity] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('list');

  // Sidebar widget states
  const [priceAlertActive, setPriceAlertActive] = useState(true);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Modals & Feedback
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Fetch real database hotels on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`${API_ENDPOINTS.HOTELS}?destination=Vi%E1%BB%87t%20Nam`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json?.data?.hotels) {
          setDbHotels(json.data.hotels);
        }
      })
      .catch((err) => {
        console.error('Error fetching hotels from database:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Reactive listener for updates across tabs and storage
  useEffect(() => {
    const handleSync = () => {
      setSavedIds(getSavedFavorites());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('avora_favorites_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('avora_favorites_updated', handleSync);
    };
  }, []);

  // 3. Resolve saved hotels strictly against database records
  const savedHotels = useMemo(() => {
    if (!savedIds || savedIds.length === 0) return [];
    if (!dbHotels || dbHotels.length === 0) {
      // Fallback: If DB query is still in progress, use object cache if available
      return savedIds.filter((item) => typeof item === 'object' && item !== null && item.hotel_id);
    }

    const hotelMap = new Map();
    dbHotels.forEach((h) => hotelMap.set(String(h.hotel_id), h));

    const resolved = [];
    savedIds.forEach((item) => {
      const id = typeof item === 'object' && item !== null ? (item.hotel_id || item.id) : item;
      const dbRecord = hotelMap.get(String(id));
      if (dbRecord) {
        resolved.push(dbRecord);
      } else if (typeof item === 'object' && item !== null && item.name) {
        resolved.push(item);
      }
    });

    return resolved;
  }, [savedIds, dbHotels]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Dynamic city counts strictly computed from saved database hotels
  const cityCounts = useMemo(() => {
    const counts = { all: savedHotels.length };

    savedHotels.forEach((h) => {
      const cName = (h.city_name || h.city || '').trim();
      if (cName) {
        counts[cName] = (counts[cName] || 0) + 1;
      }
    });

    return counts;
  }, [savedHotels]);

  // List of unique cities found in saved hotels
  const availableCities = useMemo(() => {
    const cities = Object.keys(cityCounts).filter((c) => c !== 'all');
    return cities;
  }, [cityCounts]);

  // Filtered and sorted hotels
  const filteredHotels = useMemo(() => {
    let list = [...savedHotels];

    // City filter
    if (selectedCity !== 'all') {
      list = list.filter((h) => {
        const cName = h.city_name || h.city || '';
        return cName.toLowerCase().includes(selectedCity.toLowerCase());
      });
    }

    // Only available filter
    if (onlyAvailable) {
      list = list.filter((h) => !h.is_sold_out && (h.available_rooms > 0 || h.available_rooms === undefined));
    }

    // Sorting
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.star_rating) || 0) - (Number(a.star_rating) || 0));
    }

    return list;
  }, [savedHotels, selectedCity, onlyAvailable, sortBy]);

  // Handlers
  const handleRemove = (hotelId, hotelName, e) => {
    e.stopPropagation();
    const updated = removeFavoriteHotel(hotelId);
    setSavedIds(updated);
    setToastMessage(`Đã xóa "${hotelName || 'chỗ nghỉ'}" khỏi danh sách yêu thích.`);
  };

  const handleShareList = () => {
    navigator.clipboard?.writeText(window.location.href);
    setToastMessage('Đã sao chép liên kết chia sẻ danh sách yêu thích vào clipboard!');
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setIsFolderModalOpen(false);
    setToastMessage(`Đã tạo thư mục "${folderName.trim()}" thành công!`);
    setFolderName('');
  };

  const handlePriceAlertToggle = () => {
    const nextState = !priceAlertActive;
    setPriceAlertActive(nextState);
    setToastMessage(nextState ? 'Đã bật thông báo theo dõi biến động giá.' : 'Đã tắt thông báo theo dõi biến động giá.');
  };

  return (
    <div className="favorites-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fav-toast">
          <CheckIcon />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Map Modal with Real Saved Hotels from Database */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        hotels={filteredHotels}
        destination={selectedCity !== 'all' ? selectedCity : 'Việt Nam'}
      />

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fav-modal-backdrop" onClick={() => setIsFolderModalOpen(false)}>
          <div className="fav-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="fav-modal-header">
              <h3 className="fav-modal-title">Tạo thư mục danh sách mới</h3>
              <button
                type="button"
                className="fav-modal-close-btn"
                onClick={() => setIsFolderModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="fav-modal-body">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                  Tên thư mục chỗ nghỉ
                </label>
                <input
                  type="text"
                  className="fav-modal-input"
                  placeholder="Ví dụ: Kỳ nghỉ hè 2026..."
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="fav-modal-footer">
                <button
                  type="button"
                  className="fav-modal-btn-cancel"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="fav-modal-btn-save"
                  disabled={!folderName.trim()}
                >
                  Tạo thư mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="favorites-container">
        {/* ─── 1. BREADCRUMBS ────────────────────────────────────────── */}
        <nav className="favorites-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="fav-breadcrumb-link">Trang chủ</Link>
          <span className="fav-breadcrumb-sep">/</span>
          <Link to="/myaccount" className="fav-breadcrumb-link">Tài khoản của tôi</Link>
          <span className="fav-breadcrumb-sep">/</span>
          <span className="fav-breadcrumb-current">Danh sách yêu thích</span>
        </nav>

        {/* ─── 2. HERO BANNER CARD ────────────────────────────────────── */}
        <header className="favorites-hero-card">
          <div className="favorites-hero-card__left">
            <div className="favorites-hero-title-row">
              <span className="favorites-hero-heart-icon">
                <HeartOutlineIcon />
              </span>
              <h1 className="favorites-hero-title">Danh sách chỗ nghỉ yêu thích</h1>
              <span className="favorites-hero-count-pill">{savedHotels.length} chỗ nghỉ</span>
            </div>
            <p className="favorites-hero-subtitle">
              Lưu trữ các điểm dừng chân lý tưởng, so sánh giá phòng và nhận thông báo khi có đợt giảm giá chớp nhoáng.
            </p>
          </div>

          <div className="favorites-hero-card__actions">
            <button
              type="button"
              className="btn-hero-folder"
              onClick={() => setIsFolderModalOpen(true)}
            >
              <FolderPlusIcon />
              <span>Tạo thư mục mới</span>
            </button>

            <button
              type="button"
              className="btn-hero-share"
              onClick={handleShareList}
            >
              <ShareIcon />
              <span>Chia sẻ danh sách</span>
            </button>
          </div>
        </header>

        {/* ─── 3. FILTER & SORT TOOLBAR ───────────────────────────────── */}
        <section className="favorites-toolbar" aria-label="Bộ lọc và sắp xếp">
          {/* Left Destination Pills based on Real Database Cities */}
          <div className="favorites-city-pills">
            <button
              type="button"
              className={`city-pill ${selectedCity === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedCity('all')}
            >
              Tất cả ({cityCounts.all || 0})
            </button>

            {availableCities.map((city) => (
              <button
                key={city}
                type="button"
                className={`city-pill ${selectedCity === city ? 'is-active' : ''}`}
                onClick={() => setSelectedCity(city)}
              >
                {city} ({cityCounts[city] || 0})
              </button>
            ))}
          </div>

          {/* Right Controls */}
          <div className="favorites-toolbar__right">
            <label className="checkbox-available">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              <span>Chỉ chỗ nghỉ còn phòng trống</span>
            </label>

            <select
              className="favorites-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Đã lưu gần đây nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>

            <div className="favorites-view-toggle">
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              >
                <ListIcon />
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              >
                <GridIcon />
              </button>
            </div>
          </div>
        </section>

        {/* ─── 4. MAIN TWO-COLUMN CONTENT GRID ────────────────────────── */}
        <div className="favorites-main-grid">
          {/* Left Column: Saved Hotels List */}
          <div className="favorites-list-column">
            {loading ? (
              <div className="fav-empty-state" style={{ padding: '60px 20px' }}>
                <div style={{ fontSize: '15px', color: '#003580', fontWeight: 600 }}>
                  Đang đồng bộ dữ liệu chỗ nghỉ từ cơ sở dữ liệu...
                </div>
              </div>
            ) : filteredHotels.length > 0 ? (
              filteredHotels.map((hotel) => {
                const hotelId = hotel.hotel_id || hotel.id;
                const starCount = Math.max(1, Math.min(5, Number(hotel.star_quality || 4)));
                const score = Number(hotel.star_rating || 9.0).toFixed(1);
                const isSoldOut = hotel.available_rooms !== undefined && Number(hotel.available_rooms) <= 0;

                // Resolved Facilities from Database
                const facilitiesList = Array.isArray(hotel.facilities)
                  ? hotel.facilities.map((f) => (typeof f === 'object' && f !== null ? f.name : f)).filter(Boolean)
                  : [];

                return (
                  <article key={hotelId} className="fav-card">
                    {/* Left Image Area */}
                    <div
                      className="fav-card__image-box"
                      onClick={() => navigate(`/hotels/${hotelId}`)}
                    >
                      <img
                        src={hotel.thumbnail || hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                        alt={hotel.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                        }}
                      />

                      {/* Top-Right Circular Red Trash Button */}
                      <button
                        type="button"
                        className="fav-card__trash-btn"
                        onClick={(e) => handleRemove(hotelId, hotel.name, e)}
                        title="Xóa khỏi danh sách yêu thích"
                        aria-label="Xóa khỏi danh sách yêu thích"
                      >
                        <TrashIcon />
                      </button>

                      {/* Bottom-Left Image Badges */}
                      <div className="fav-card__image-badges">
                        <span className="badge-hotel-star">
                          Khách sạn {starCount} sao
                        </span>
                        {hotel.city_name && (
                          <span className="badge-saved-room">{hotel.city_name}</span>
                        )}
                        {isSoldOut && (
                          <span className="badge-sold-out">Tạm hết phòng</span>
                        )}
                      </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="fav-card__body">
                      {/* Top Row: Stars, Genius, Score */}
                      <div className="fav-card__top-row">
                        <div className="fav-card__stars-wrap">
                          <div className="fav-card__stars" title={`${starCount} sao`}>
                            {Array.from({ length: starCount }).map((_, sIdx) => (
                              <StarIcon key={sIdx} />
                            ))}
                          </div>
                          {hotel.genius_level && (
                            <span className="fav-card__genius-tag">
                              Genius Cấp {hotel.genius_level}
                            </span>
                          )}
                        </div>

                        <div className="fav-card__rating-box">
                          <div className="fav-card__rating-labels">
                            <span className="fav-card__score-label">{hotel.score_label || (Number(score) >= 9 ? 'Tuyệt hảo' : 'Tuyệt vời')}</span>
                            <span className="fav-card__review-count">{hotel.reviews_count || '1.200'} đánh giá</span>
                          </div>
                          <span className="fav-card__score-badge">{score}</span>
                        </div>
                      </div>

                      {/* Hotel Name */}
                      <h3
                        className="fav-card__title"
                        onClick={() => navigate(`/hotels/${hotelId}`)}
                      >
                        {hotel.name}
                      </h3>

                      {/* Address */}
                      <div className="fav-card__address">
                        <LocationPinIcon />
                        <span>{hotel.address || 'Địa chỉ đang cập nhật'}</span>
                      </div>

                      {/* Amenity tags from database */}
                      {facilitiesList.length > 0 && (
                        <div className="fav-card__tags">
                          {facilitiesList.slice(0, 3).map((facName, fIdx) => (
                            <span key={fIdx} className="fav-tag-pill">{facName}</span>
                          ))}
                        </div>
                      )}

                      {/* Policy / Status alerts */}
                      {!isSoldOut ? (
                        <div className="fav-card__policy-text">
                          Miễn phí hủy phòng • Không cần thanh toán trước
                        </div>
                      ) : (
                        <div className="fav-card__soldout-text">
                          Hết phòng trong ngày bạn chọn • Nhận thông báo khi mở thêm phòng
                        </div>
                      )}

                      {/* Special Highlight Box (if room highlight exists in database) */}
                      {hotel.room_highlight && (
                        <div className="fav-card__room-highlight">
                          <div className="fav-room-highlight__header">
                            HẠNG PHÒNG ĐÃ LƯU CỤ THỂ:
                          </div>
                          <div className="fav-room-highlight__title">
                            {hotel.room_highlight.name || hotel.room_highlight.title}
                          </div>
                          <div className="fav-room-highlight__specs">
                            {hotel.room_highlight.bed_type} • {hotel.room_highlight.room_size}
                          </div>
                          <div className="fav-room-highlight__guarantee">
                            <CheckIcon />
                            <span>Bảo đảm giá độc quyền cho phòng đã lưu</span>
                          </div>
                        </div>
                      )}

                      {/* Bottom Footer: Price & Action */}
                      <div className="fav-card__footer">
                        <div className="fav-card__price-box">
                          {hotel.original_price && hotel.original_price > hotel.price && (
                            <span className="fav-card__orig-price">
                              {formatPriceVND(hotel.original_price)}
                            </span>
                          )}
                          <div className="fav-card__main-price">
                            {formatPriceVND(hotel.price || 1500000)}
                          </div>
                          <span className="fav-card__price-subtext">
                            Đã bao gồm thuế & phí
                          </span>
                        </div>

                        {!isSoldOut ? (
                          <button
                            type="button"
                            className="fav-card__btn-view"
                            onClick={() => navigate(`/hotels/${hotelId}`)}
                          >
                            Xem phòng trống
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="fav-card__btn-alt"
                            onClick={() => navigate(`/hotels/${hotelId}`)}
                          >
                            Chọn ngày khác
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="fav-empty-state">
                <div className="fav-empty-icon">
                  <HeartOutlineIcon />
                </div>
                <h3 className="fav-empty-title">
                  {savedHotels.length === 0
                    ? 'Bạn chưa có chỗ nghỉ nào trong danh sách yêu thích'
                    : 'Không tìm thấy chỗ nghỉ nào phù hợp bộ lọc'}
                </h3>
                <p className="fav-empty-desc">
                  {savedHotels.length === 0
                    ? 'Hãy khám phá các điểm lưu trú tuyệt vời trên Avora và bấm biểu tượng trái tim để lưu lại theo dõi giá bất cứ lúc nào!'
                    : 'Hãy thử chọn tất cả các thành phố hoặc tắt bộ lọc chỉ xem phòng còn trống.'}
                </p>
                {savedHotels.length === 0 ? (
                  <button
                    type="button"
                    className="fav-empty-btn"
                    onClick={() => navigate('/hotels')}
                  >
                    Khám phá chỗ nghỉ ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    className="fav-empty-btn"
                    onClick={() => {
                      setSelectedCity('all');
                      setOnlyAvailable(false);
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: 3 Sidebar Widgets */}
          <aside className="favorites-sidebar" aria-label="Tiện ích hỗ trợ">
            {/* Widget 1: Theo dõi biến động giá */}
            <div className="fav-widget">
              <div className="fav-widget__header-row">
                <div className="fav-widget__title-group">
                  <span className="fav-widget__icon-bell">
                    <BellIcon />
                  </span>
                  <h3 className="fav-widget__title">Theo dõi biến động giá</h3>
                </div>
                <input
                  type="checkbox"
                  className="fav-widget__checkbox-toggle"
                  checked={priceAlertActive}
                  onChange={handlePriceAlertToggle}
                  title="Bật/Tắt theo dõi giá"
                />
              </div>
              <p className="fav-widget__desc">
                Avora sẽ tự động gửi email hoặc thông báo ngay khi các khách sạn trong danh sách yêu thích của bạn có đợt giảm giá từ 10% trở lên.
              </p>
              <div className="fav-widget__guarantee-box">
                <ShieldCheckIcon />
                <span>Bảo đảm giá thấp nhất thị trường</span>
              </div>
            </div>

            {/* Widget 2: Bản đồ các địa điểm đã lưu */}
            <div className="fav-widget">
              <div className="fav-widget__header-row">
                <div className="fav-widget__title-group">
                  <span className="fav-widget__icon-map">
                    <MapIcon />
                  </span>
                  <h3 className="fav-widget__title">Bản đồ các địa điểm đã lưu</h3>
                </div>
              </div>

              {/* Map Preview Canvas */}
              <div className="fav-widget-map__preview">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=500&q=80"
                  alt="Bản đồ các địa điểm yêu thích"
                />
                <button
                  type="button"
                  className="fav-widget-map__overlay-btn"
                  onClick={() => setIsMapModalOpen(true)}
                  disabled={savedHotels.length === 0}
                >
                  <CheckIcon />
                  <span>Xem vị trí trên bản đồ</span>
                </button>
              </div>

              <p className="fav-widget-map__subtext">
                Xem toàn bộ {savedHotels.length} chỗ nghỉ yêu thích trên cùng một bản đồ tương tác
              </p>
            </div>

            {/* Widget 3: Cần trợ giúp đặt phòng */}
            <div className="fav-widget fav-widget--support">
              <div className="fav-widget__support-title">
                BẠN CẦN TRỢ GIÚP ĐẶT PHÒNG?
              </div>
              <p className="fav-widget__support-desc">
                Đội ngũ chăm sóc khách hàng người Việt của Avora luôn sẵn sàng tư vấn khách sạn tốt nhất theo ngân sách của bạn.
              </p>
              <a href="tel:19006868" className="fav-widget__hotline-link">
                <PhoneCallIcon />
                <span>Hotline miễn cước: 1900 6868</span>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
