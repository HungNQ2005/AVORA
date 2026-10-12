import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL, toCoordinate } from '../../../utils/leafletSetup';
import './coordinatePickerModal.css';

const VIETNAM_CENTER = [16.0, 106.0];
const roundCoordinate = (value) => Number(value.toFixed(7));

const ClickHandler = ({ onSelect }) => {
  useMapEvents({ click: (event) => onSelect(event.latlng) });
  return null;
};

// The map mounts inside a freshly shown full-screen container, so tiles need a size refresh.
const ResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

/** Full-screen map where the user clicks a spot and confirms it as the hotel coordinates. */
const CoordinatePickerModal = ({ initialLat, initialLng, onConfirm, onClose }) => {
  const [pending, setPending] = useState(null);
  const currentLat = toCoordinate(initialLat);
  const currentLng = toCoordinate(initialLng);
  const hasCurrent = currentLat !== null && currentLng !== null;

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      if (pending) setPending(null);
      else onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pending, onClose]);

  const handleSelect = (latlng) => {
    setPending({ lat: roundCoordinate(latlng.lat), lng: roundCoordinate(latlng.lng) });
  };

  return createPortal(
    <div className="coord-picker" role="dialog" aria-modal="true" aria-labelledby="coord-picker-title">
      <div className="coord-picker__container">
        <header className="coord-picker__header">
          <div>
            <h2 id="coord-picker-title">Chọn tọa độ khách sạn</h2>
            <p>Nhấp vào vị trí trên bản đồ để chọn tọa độ. Phóng to để chọn chính xác hơn.</p>
          </div>
          <button type="button" className="coord-picker__close" onClick={onClose} aria-label="Đóng bản đồ">×</button>
        </header>

        <div className="coord-picker__map">
          <MapContainer
            center={hasCurrent ? [currentLat, currentLng] : VIETNAM_CENTER}
            zoom={hasCurrent ? 15 : 6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            <ResizeFix />
            <ClickHandler onSelect={handleSelect} />
            {hasCurrent && !pending && <Marker position={[currentLat, currentLng]} />}
            {pending && <Marker position={[pending.lat, pending.lng]} />}
          </MapContainer>

          {pending && (
            <div className="coord-picker__prompt" role="alertdialog" aria-labelledby="coord-picker-prompt">
              <p id="coord-picker-prompt">Bạn có muốn sử dụng tọa độ này cho khách sạn không?</p>
              <p className="coord-picker__coords">Vĩ độ: <b>{pending.lat}</b> · Kinh độ: <b>{pending.lng}</b></p>
              <div className="coord-picker__prompt-actions">
                <button type="button" className="hotel-button hotel-button--quiet" onClick={() => setPending(null)}>Chọn lại</button>
                <button type="button" className="hotel-button hotel-button--primary" onClick={() => onConfirm(pending)}>Sử dụng tọa độ này</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CoordinatePickerModal;
