import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloseIcon, StarIcon } from '../../../common/components/icons';
import { getVietMapTileConfig, toCoordinate } from '../../../utils/leafletSetup';

const formatPrice = (val) => {
  if (!val && val !== 0) return '0 VND';
  return `${new Intl.NumberFormat('vi-VN').format(val)} VND`;
};

  // Sửa kích thước bản đồ khi modal mở lên và lưu tham chiếu map
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

  // Căn chỉnh khung nhìn ban đầu để thấy cả vị trí người dùng và khách sạn
  useEffect(() => {
    if (!map) return;

    const points = [];
    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    hotels.forEach((h) => {
      if (h.effectiveLat && h.effectiveLng) {
        points.push([h.effectiveLat, h.effectiveLng]);
      }
    });

    if (points.length === 1) {
      map.setView(points[0], 14);
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
            <circle cx="12" cy="12" r="5" fill="#3B82F6"/>
            <circle cx="12" cy="12" r="2" fill="#FFFFFF"/>
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

const MapModal = ({ isOpen, onClose, hotels = [], destination = '' }) => {
  const [activeHotel, setActiveHotel] = useState(hotels[0] || null);
  const [mapInstance, setMapInstance] = useState(null);

  // Vị trí mặc định thông minh gần cụm khách sạn hoặc điểm đến để LUÔN CÓ ICON hiển thị
  const defaultCoords = useMemo(() => {
    const firstHotel = hotels.find((h) => toCoordinate(h.lat) !== null && toCoordinate(h.lng) !== null);
    if (firstHotel) {
      return {
        lat: Number(firstHotel.lat) - 0.0035,
        lng: Number(firstHotel.lng) - 0.0035,
        isEstimated: true,
      };
    }
    return { lat: 10.034185, lng: 105.787895, isEstimated: true }; // Cần Thơ mặc định
  }, [hotels]);

  // Vị trí người dùng: khởi tạo từ cache hoặc defaultCoords để icon luôn xuất hiện
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

  // Gọi định vị GPS của trình duyệt (giống cơ chế chatbox)
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      if (!userLocation) setUserLocation(defaultCoords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
        isEstimated: false,
        };
    setUserLocation(coords);
    try {
      sessionStorage.setItem('avora_user_coords', JSON.stringify(coords));
    } catch (_) { }

    if (mapInstance) {
      mapInstance.flyTo([coords.lat, coords.lng], 15, { animate: true, duration: 0.8 });
    }
  },
  (err) => {
    console.warn('[MapModal] Không thể lấy GPS trình duyệt, sử dụng vị trí khu vực:', err.message);
    setUserLocation((prev) => prev || defaultCoords);
  },
  { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  };

useEffect(() => {
  if (isOpen) {
    if (!userLocation) {
      setUserLocation(defaultCoords);
    }
    requestUserLocation();
  }
}, [isOpen]);

useEffect(() => {
  if (hotels && hotels.length > 0 && !activeHotel) {
    setActiveHotel(hotels[0]);
  }
}, [hotels, activeHotel]);

// Cấu hình Tile VietMap (apikey lấy từ VITE_VIETMAP_TILE_KEY)
const tileConfig = useMemo(() => getVietMapTileConfig(), []);

// Tính tọa độ cho các khách sạn
const hotelMarkers = useMemo(() => {
  return hotels.map((hotel, index) => {
    const lat = toCoordinate(hotel.lat);
    const lng = toCoordinate(hotel.lng);
    const baseLat = userLocation ? userLocation.lat : defaultCoords.lat;
    const baseLng = userLocation ? userLocation.lng : defaultCoords.lng;
    const effectiveLat = lat !== null ? lat : baseLat + (index * 0.007 - 0.015);
    const effectiveLng = lng !== null ? lng : baseLng + (index * 0.007 - 0.015);
    return {
      ...hotel,
      effectiveLat,
      effectiveLng,
      hasExactCoords: lat !== null && lng !== null,
    };
  });
  }, [hotels, userLocation, defaultCoords]);

// Tọa độ trung tâm khởi tạo
const initialCenter = useMemo(() => {
const loc = userLocation || defaultCoords;
return [loc.lat, loc.lng];
  }, [userLocation, defaultCoords]);

// Xử lý sự kiện bấm nút "Về vị trí của tôi" (đặt bên ngoài MapContainer để không bị Leaflet nuốt click)
const handleFlyToUser = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const loc = userLocation || defaultCoords;
  if (mapInstance && loc) {
    mapInstance.flyTo([loc.lat, loc.lng], 15, { animate: true, duration: 0.8 });
  }
  requestUserLocation();
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
            Hiển thị {hotels.length} chỗ nghỉ có sẵn trong khu vực • Đang hiển thị vị trí của bạn
          </span>
        </div>
        <div className="map-modal-header-actions">
          <button
            type="button"
            className="map-modal-geo-btn"
            onClick={requestUserLocation}
            title="Cập nhật vị trí GPS"
          >
            📍 Cập nhật vị trí
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

      {/* Body với bản đồ VietMap */}
      <div className="map-modal-body">
        {/* Nút bấm Về vị trí của tôi đặt ở Floating Overlay TRÊN BẢN ĐỒ (không bị Leaflet chặn click) */}
        <div className="map-modal-floating-toolbar">
          <button
            type="button"
            className="map-modal-recenter-btn"
            onClick={handleFlyToUser}
            title="Di chuyển bản đồ về vị trí của bạn"
          >
            <span className="map-modal-recenter-icon">🎯</span>
            <span>Về vị trí của tôi</span>
          </button>
        </div>

        <MapContainer
          center={initialCenter}
          zoom={13}
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
            userLocation={userLocation || defaultCoords}
            hotels={hotelMarkers}
          />

            {/* Marker thể hiện vị trí của người dùng ("Bạn đang ở đây") - LUÔN HIỂN THỊ */ }
            {(userLocation || defaultCoords) && (
            <Marker
              position={[
                (userLocation || defaultCoords).lat,
                (userLocation || defaultCoords).lng,
              ]}
              icon={createUserLiveLocationIcon()}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <strong style={{ color: '#003580' }}>📍 Vị trí của bạn</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
                    Bạn đang ở khu vực này
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
              src={activeHotel.thumbnail || (activeHotel.images && activeHotel.images[0])}
              alt={activeHotel.name}
              className="map-preview-img"
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
                <span className="map-preview-price-sub">/ đêm</span>
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
