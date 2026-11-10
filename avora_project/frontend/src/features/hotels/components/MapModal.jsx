import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloseIcon, StarIcon } from '../../../common/components/icons';
import { getVietMapTileConfig, toCoordinate } from '../../../utils/leafletSetup';

const getHotelPrice = (hotel) => {
  if (!hotel) return null;
  if (typeof hotel.price === 'number' && hotel.price > 0) return hotel.price;
  if (typeof hotel.min_price === 'number' && hotel.min_price > 0) return hotel.min_price;
  if (Array.isArray(hotel.rooms) && hotel.rooms.length > 0) {
    const validPrices = hotel.rooms
      .map((r) => Number(r.price ?? r.default_price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (validPrices.length > 0) return Math.min(...validPrices);
  }
  return null;
};

const formatPrice = (val) => {
  if (val === null || val === undefined || isNaN(val) || val <= 0) return 'Xem phòng';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

// Sửa kích thước bản đồ khi modal mở lên và căn chỉnh khung nhìn
const MapLifecycleHandler = ({ onMapReady, userLocation, hotels }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    onMapReady(map);

    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map, onMapReady]);

  // Căn chỉnh khung nhìn ban đầu để thấy cả vị trí người dùng (nếu có GPS thật) và các khách sạn
  useEffect(() => {
    if (!map) return;

    const points = [];
    if (userLocation && !userLocation.isEstimated && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    hotels.forEach((h) => {
      if (h.effectiveLat && h.effectiveLng) {
        points.push([h.effectiveLat, h.effectiveLng]);
      }
    });

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, userLocation, hotels]);

  return null;
};

// Tạo icon hiển thị vị trí trực tiếp của người dùng ("Bạn đang ở đây")
const createUserLiveLocationIcon = () =>
  L.divIcon({
    className: 'user-live-map-marker-container',
    html: `
      <div class="user-live-pin">
        <div class="user-live-pin__pulse-ring"></div>
        <div class="user-live-pin__beacon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#003580" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="12" cy="5" r="5" fill="#3B82F6"/>
            <circle cx="12" cy="2" r="2" fill="#FFFFFF"/>
          </svg>
        </div>
        <div class="user-live-pin__label-box">
          <span class="user-live-pin__text">📍 Bạn đang ở đây</span>
        </div>
      </div>
    `,
    iconSize: [150, 44],
    iconAnchor: [20, 22],
    popupAnchor: [0, -22],
  });

// Tạo icon hiển thị giá phòng khách sạn trên bản đồ
const createHotelPinIcon = (price, isSelected) =>
  L.divIcon({
    className: `hotel-leaflet-marker ${isSelected ? 'is-selected' : ''}`,
    html: `
      <div class="map-hotel-pin-pill ${isSelected ? 'is-selected' : ''}">
        <span class="map-hotel-pin-price">${formatPrice(price)}</span>
      </div>
    `,
    iconSize: [100, 32],
    iconAnchor: [50, 16],
    popupAnchor: [0, -16],
  });

const DEFAULT_VIETNAM_CENTER = [10.034185, 105.787895]; // Cần Thơ mặc định

const MapModal = ({ isOpen, onClose, hotels = [], destination = '' }) => {
  const [activeHotel, setActiveHotel] = useState(hotels[0] || null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState(null); // { text, type: 'info' | 'error' | 'success' }

  // Vị trí người dùng: chỉ lưu khi đã có GPS thật (từ sessionStorage hoặc navigator.geolocation)
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const cached = sessionStorage.getItem('avora_user_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          return { lat: parsed.lat, lng: parsed.lng, isEstimated: false };
        }
      }
    } catch (_) { }
    return null;
  });

  // Tự tắt thông báo sau 6 giây
  useEffect(() => {
    if (geoNotice) {
      const timer = setTimeout(() => setGeoNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [geoNotice]);

  // Gọi định vị GPS của trình duyệt
  const requestUserLocation = useCallback((options = {}) => {
    const { silent = false, flyTo = false } = options;

    if (!navigator.geolocation) {
      if (!silent) {
        setGeoNotice({
          type: 'error',
          text: 'Trình duyệt của bạn không hỗ trợ dịch vụ định vị GPS (Geolocation).',
        });
      }
      return;
    }

    if (!silent) {
      setIsLocating(true);
      setGeoNotice({ type: 'info', text: 'Đang xác định vị trí GPS của bạn...' });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isEstimated: false,
        };
        setUserLocation(coords);
        try {
          sessionStorage.setItem('avora_user_coords', JSON.stringify(coords));
        } catch (_) { }

        if (!silent) {
          setGeoNotice({
            type: 'success',
            text: 'Đã xác định vị trí thực tế của bạn qua GPS thành công!',
          });
        }

        if (mapInstance && (flyTo || !silent)) {
          mapInstance.flyTo([coords.lat, coords.lng], 15, { animate: true, duration: 0.8 });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('[MapModal] Không thể lấy GPS trình duyệt:', err);
        if (!silent) {
          let errorMsg = 'Không thể lấy tọa độ GPS từ thiết bị của bạn.';
          if (err.code === 1) { // PERMISSION_DENIED
            errorMsg = 'Trình duyệt đang chặn quyền vị trí. Vui lòng bấm vào biểu tượng ổ khóa/vị trí trên thanh địa chỉ trình duyệt để cho phép AVORA truy cập GPS.';
          } else if (err.code === 2) { // POSITION_UNAVAILABLE
            errorMsg = 'Thiết bị không xác định được tọa độ GPS. Vui lòng kiểm tra lại dịch vụ Location trên hệ điều hành máy tính/điện thoại.';
          } else if (err.code === 3) { // TIMEOUT
            errorMsg = 'Yêu cầu định vị GPS bị quá thời gian chờ. Vui lòng thử bấm lại.';
          }
          setGeoNotice({ type: 'error', text: errorMsg });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [mapInstance]);

  // Khi modal mở: chỉ kiểm tra định vị ngầm nếu chưa có userLocation
  useEffect(() => {
    if (isOpen) {
      if (!userLocation) {
        requestUserLocation({ silent: true, flyTo: false });
      }
    }
  }, [isOpen, userLocation, requestUserLocation]);

  useEffect(() => {
    if (hotels && hotels.length > 0 && !activeHotel) {
      setActiveHotel(hotels[0]);
    }
  }, [hotels, activeHotel]);

  // Cấu hình Tile VietMap
  const tileConfig = useMemo(() => getVietMapTileConfig(), []);

  // Tính tọa độ cho các khách sạn
  const hotelMarkers = useMemo(() => {
    return hotels.map((hotel, index) => {
      const lat = toCoordinate(hotel.lat);
      const lng = toCoordinate(hotel.lng);
      const baseCenter = DEFAULT_VIETNAM_CENTER;
      const effectiveLat = lat !== null ? lat : baseCenter[0] + (index * 0.007 - 0.015);
      const effectiveLng = lng !== null ? lng : baseCenter[1] + (index * 0.007 - 0.015);
      const calculatedPrice = getHotelPrice(hotel);

      return {
        ...hotel,
        price: calculatedPrice,
        effectiveLat,
        effectiveLng,
        hasExactCoords: lat !== null && lng !== null,
      };
    });
  }, [hotels]);

  // Tọa độ trung tâm khởi tạo: ưu tiên vị trí khách sạn, sau đó mới đến vị trí người dùng
  const initialCenter = useMemo(() => {
    const firstHotel = hotelMarkers.find((h) => h.hasExactCoords);
    if (firstHotel) {
      return [firstHotel.effectiveLat, firstHotel.effectiveLng];
    }
    if (userLocation && !userLocation.isEstimated) {
      return [userLocation.lat, userLocation.lng];
    }
    return DEFAULT_VIETNAM_CENTER;
  }, [hotelMarkers, userLocation]);

  // Xử lý sự kiện bấm nút "Về vị trí của tôi"
  const handleFlyToUser = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (userLocation && !userLocation.isEstimated && mapInstance) {
      mapInstance.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 0.8 });
    }
    requestUserLocation({ silent: false, flyTo: true });
  };

  if (!isOpen) return null;

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="map-modal-header">
          <div>
            <h3 className="map-modal-title">Bản đồ khách sạn{destination ? ` tại ${destination}` : ''}</h3>
            <span className="map-modal-subtitle">
              Hiển thị {hotels.length} chỗ nghỉ có sẵn trong khu vực
              {userLocation && !userLocation.isEstimated ? ' • Đang hiển thị vị trí thực tế của bạn' : ''}
            </span>
          </div>
          <div className="map-modal-header-actions">
            <button
              type="button"
              className="map-modal-geo-btn"
              onClick={() => requestUserLocation({ silent: false, flyTo: true })}
              title="Cập nhật vị trí GPS"
              disabled={isLocating}
            >
              {isLocating ? '⏳ Đang định vị...' : '📍 Cập nhật vị trí'}
            </button>
            <button
              type="button"
              className="map-modal-close-btn"
              onClick={onClose}
              aria-label="Đóng bản đồ"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Thông báo trạng thái GPS */}
        {geoNotice && (
          <div className={`map-modal-notice-banner map-modal-notice-banner--${geoNotice.type}`}>
            <span>{geoNotice.text}</span>
            <button
              type="button"
              className="map-modal-notice-close"
              onClick={() => setGeoNotice(null)}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body với bản đồ VietMap */}
        <div className="map-modal-body">
          {/* Nút bấm Về vị trí của tôi đặt ở Floating Overlay TRÊN BẢN ĐỒ */}
          <div className="map-modal-floating-toolbar">
            <button
              type="button"
              className="map-modal-recenter-btn"
              onClick={handleFlyToUser}
              title="Di chuyển bản đồ về vị trí của bạn"
              disabled={isLocating}
            >
              <span className="map-modal-recenter-icon">🎯</span>
              <span>{isLocating ? 'Đang dò vị trí...' : 'Về vị trí của tôi'}</span>
            </button>
          </div>

          <MapContainer
            center={initialCenter}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            className="map-modal-leaflet-container"
          >
            <TileLayer
              url={tileConfig.url}
              attribution={tileConfig.attribution}
            />
            <MapLifecycleHandler
              onMapReady={setMapInstance}
              userLocation={userLocation}
              hotels={hotelMarkers}
            />

            {/* Marker thể hiện vị trí của người dùng ("Bạn đang ở đây") - CHỈ HIỂN THỊ KHI CÓ GPS THẬT */}
            {userLocation && !userLocation.isEstimated && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createUserLiveLocationIcon()}
                zIndexOffset={1000}
              >
                <Popup>
                  <div style={{ textAlign: 'center', padding: '4px' }}>
                    <strong style={{ color: '#003580' }}>📍 Vị trí thực tế của bạn</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
                      Tọa độ GPS được xác định từ thiết bị
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Markers của các khách sạn */}
            {hotelMarkers.map((hotel) => {
              const isSelected = activeHotel?.hotel_id === hotel.hotel_id;
              return (
                <Marker
                  key={hotel.hotel_id || hotel.name}
                  position={[hotel.effectiveLat, hotel.effectiveLng]}
                  icon={createHotelPinIcon(hotel.price, isSelected)}
                  eventHandlers={{
                    click: () => setActiveHotel(hotel),
                  }}
                />
              );
            })}
          </MapContainer>

          {/* Sidebar Hotel Preview Card inside map */}
          {activeHotel && (
            <div className="map-modal-hotel-preview">
              <img
                src={activeHotel.thumbnail || (activeHotel.images && activeHotel.images[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'}
                alt={activeHotel.name}
                className="map-preview-img"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
                }}
              />
              <div className="map-preview-content">
                <div className="map-preview-stars">
                  {Array.from({ length: activeHotel.star_quality || 4 }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                  <span className="map-preview-score">{activeHotel.star_rating?.toFixed(1) || '9.0'}</span>
                </div>
                <h4 className="map-preview-title">{activeHotel.name}</h4>
                <p className="map-preview-address">{activeHotel.address}</p>
                <div className="map-preview-price">
                  <span className="map-preview-price-val">{formatPrice(activeHotel.price)}</span>
                  {activeHotel.price ? <span className="map-preview-price-sub">/ đêm</span> : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapModal;
