import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite hashes asset URLs, so Leaflet's default marker icon paths must be set explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const VIETMAP_ATTRIBUTION = '&copy; <a href="https://maps.vietmap.vn" target="_blank" rel="noreferrer">Vietmap</a>';

/**
 * Builds the VietMap raster tile URL using the provided tile API key,
 * or gracefully falls back to OpenStreetMap if key is not configured.
 */
export const buildVietMapTileUrl = (tileKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VIETMAP_TILE_KEY)) => {
  if (!tileKey || typeof tileKey !== 'string' || !tileKey.trim()) {
    return TILE_URL;
  }
  return `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${tileKey.trim()}`;
};

/**
 * Returns the tile configuration (url and attribution) for Leaflet TileLayer,
 * selecting VietMap when key is present, and OpenStreetMap otherwise.
 */
export const getVietMapTileConfig = (tileKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VIETMAP_TILE_KEY)) => {
  const key = typeof tileKey === 'string' ? tileKey.trim() : '';
  if (!key) {
    return {
      url: TILE_URL,
      attribution: TILE_ATTRIBUTION,
    };
  }
  return {
    url: `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${key}`,
    attribution: VIETMAP_ATTRIBUTION,
  };
};

export const VIETMAP_TILE_URL = getVietMapTileConfig().url;

/**
 * Distinct user location marker icon (pulsing blue dot).
 */
export const createUserLocationIcon = () =>
  L.divIcon({
    className: 'user-location-marker',
    html: '<div class="user-pin-pulse"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

/**
 * Distinct hotel marker icon.
 */
export const createHotelMarkerIcon = (label = '') =>
  L.divIcon({
    className: 'hotel-location-marker',
    html: `<div class="hotel-pin-bubble"><span class="hotel-pin-icon">🏨</span>${label ? `<span class="hotel-pin-label">${label}</span>` : ''}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

export const toCoordinate = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
