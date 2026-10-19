import React from 'react';
import './RoomFloorMatrixModal.css';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString('vi-VN')} đ`;
};

const RoomFloorMatrixModal = ({
  isOpen,
  onClose,
  rooms = [],
  hotelName = '',
  onSelectRoom,
}) => {
  if (!isOpen) return null;

  // Group rooms by floor
  const floorsMap = {};
  rooms.forEach((room) => {
    const floor = room.floor || 'Tầng 1';
    if (!floorsMap[floor]) {
      floorsMap[floor] = [];
    }
    floorsMap[floor].push(room);
  });

  const sortedFloors = Object.keys(floorsMap).sort((a, b) =>
    a.localeCompare(b, 'vi', { numeric: true })
  );

  return (
    <div className="matrix-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="matrix-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="matrix-modal__header">
          <div className="matrix-modal__title-area">
            <div className="matrix-modal__badge">
              <span className="matrix-modal__dot"></span>
              SƠ ĐỒ TRỰC QUAN THEO TẦNG
            </div>
            <h2 className="matrix-modal__title">Sơ đồ buồng phòng &amp; Trạng thái thực tế</h2>
            <p className="matrix-modal__sub">
              Cơ sở: <strong>{hotelName}</strong> ({rooms.length} buồng phòng)
            </p>
          </div>

          <div className="matrix-modal__header-actions">
            {/* Legend */}
            <div className="matrix-legend">
              <span className="matrix-legend__item">
                <span className="matrix-legend__dot matrix-legend__dot--green"></span>
                Khả dụng ({rooms.filter((r) => r.status_cd === 'AVAILABLE' && !r.is_deleted).length})
              </span>
              <span className="matrix-legend__item">
                <span className="matrix-legend__dot matrix-legend__dot--orange"></span>
                Có khách ({rooms.filter((r) => r.status_cd === 'OCCUPIED' || r.status_cd === 'BOOKED').length})
              </span>
              <span className="matrix-legend__item">
                <span className="matrix-legend__dot matrix-legend__dot--red"></span>
                Bảo trì ({rooms.filter((r) => r.status_cd === 'MAINTENANCE').length})
              </span>
              <span className="matrix-legend__item">
                <span className="matrix-legend__dot matrix-legend__dot--gray"></span>
                Tạm khóa ({rooms.filter((r) => r.is_deleted || r.status_cd === 'LOCKED').length})
              </span>
            </div>

            <button
              type="button"
              className="matrix-modal__close-btn"
              onClick={onClose}
              title="Đóng sơ đồ"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body / Floors */}
        <div className="matrix-modal__body">
          {sortedFloors.length === 0 ? (
            <div className="matrix-empty">Không có dữ liệu buồng phòng để hiển thị sơ đồ.</div>
          ) : (
            sortedFloors.map((floor) => {
              const floorRooms = floorsMap[floor];
              const availableOnFloor = floorRooms.filter(
                (r) => r.status_cd === 'AVAILABLE' && !r.is_deleted
              ).length;

              return (
                <div key={floor} className="matrix-floor-row">
                  <div className="matrix-floor-info">
                    <span className="matrix-floor-name">{floor}</span>
                    <span className="matrix-floor-summary">
                      {availableOnFloor}/{floorRooms.length} trống
                    </span>
                  </div>

                  <div className="matrix-room-cards">
                    {floorRooms.map((room) => {
                      const isDeleted = room.is_deleted || room.status_cd === 'LOCKED';
                      const isOccupied = room.status_cd === 'OCCUPIED' || room.status_cd === 'BOOKED';
                      const isMaintenance = room.status_cd === 'MAINTENANCE';

                      let cardModifier = 'matrix-room--available';
                      let statusText = 'Khả dụng';
                      if (isDeleted) {
                        cardModifier = 'matrix-room--locked';
                        statusText = 'Tạm khóa';
                      } else if (isMaintenance) {
                        cardModifier = 'matrix-room--maintenance';
                        statusText = 'Bảo trì';
                      } else if (isOccupied) {
                        cardModifier = 'matrix-room--occupied';
                        statusText = 'Có khách';
                      }

                      return (
                        <div
                          key={room.room_id}
                          className={`matrix-room-card ${cardModifier}`}
                          onClick={() => onSelectRoom(room)}
                          title={`Nhấn để xem chi tiết phòng ${room.room_number}`}
                        >
                          <div className="matrix-room-card__header">
                            <span className="matrix-room-card__num">{room.room_number}</span>
                            <span className="matrix-room-card__status">{statusText}</span>
                          </div>
                          <div className="matrix-room-card__type">
                            {room.m_room_type?.type_name || 'Phòng tiêu chuẩn'}
                          </div>
                          <div className="matrix-room-card__price">
                            {formatCurrency(room.m_room_type?.default_price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomFloorMatrixModal;
