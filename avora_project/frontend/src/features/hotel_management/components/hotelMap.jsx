import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, toCoordinate } from '../../../utils/leafletSetup';
import './hotelMap.css';

/** Read-only mini-map showing a single hotel location. */
const HotelMap = ({ lat, lng, height = 220 }) => {
  const latitude = toCoordinate(lat);
  const longitude = toCoordinate(lng);

  if (latitude === null || longitude === null) {
    return <div className="hotel-map hotel-map--empty" style={{ height }}>Chưa có tọa độ để hiển thị bản đồ.</div>;
  }

  return (
    <div className="hotel-map" style={{ height }}>
      <MapContainer
        key={`${latitude},${longitude}`}
        center={[latitude, longitude]}
        zoom={20}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
    </div>
  );
};

export default HotelMap;
