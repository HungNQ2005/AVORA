import React from 'react';

/**
 * Card 2: Selected Room display component bound to m_room_type and m_facility.
 */
const SelectedRoomCard = ({ room, quantity = 1 }) => {
  if (!room) return null;

  const roomName = room.type_name || room.name || 'Hạng phòng đã chọn';
  const roomBed = room.bed_type || '';
  const roomSize = room.room_size || '';
  const maxAdults = Number(room.max_adults ?? 2);
  const maxChildren = Number(room.max_children ?? 0);
  const facilities = Array.isArray(room.facilities) ? room.facilities : [];
  const availableRooms = room.available_rooms;

  const specsParts = [
    quantity > 1 ? `Số lượng: ${quantity} phòng` : null,
    roomBed ? `Giường: ${roomBed}` : null,
    roomSize ? `Diện tích: ${roomSize}` : null,
    `Tiêu chuẩn phòng: ${maxAdults} người lớn${maxChildren > 0 ? `, ${maxChildren} trẻ em` : ''}`,
  ].filter(Boolean);

  return (
    <div className="booking-card selected-room-card">
      <div className="room-card-tags">
        <div className="room-tag-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span className="room-pill-vip">
            {quantity > 1 ? `${quantity} × Hạng phòng` : 'Hạng phòng đã chọn'}
          </span>
          {availableRooms != null && (
            <span className="room-breakfast-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Còn {availableRooms} phòng trống trong CSDL
            </span>
          )}
          {facilities.map((fac) => (
            <span key={fac.facility_id || fac.facility_name} className="room-breakfast-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {fac.facility_name || fac.name}
            </span>
          ))}
        </div>
        <div className="room-capacity-badge">
          {quantity > 1 ? `${quantity} phòng đặt` : '1 phòng đặt'}
        </div>
      </div>

      <h3 className="selected-room-title">{roomName}</h3>
      <p className="selected-room-specs">{specsParts.join(' • ')}</p>
    </div>
  );
};

export default SelectedRoomCard;
