import React from 'react';
import { BuildingIcon, EyeIcon, EditIcon, TrashIcon } from '../../../common/components/icons';
import './RoomTable.css';

const getBadgeForRoomType = (typeName = '') => {
  const lower = typeName.toLowerCase();
  if (lower.includes('villa') || lower.includes('biệt thự')) {
    return { label: 'VILLA SUITE', class: 'room-tag--villa' };
  }
  if (lower.includes('ocean') || lower.includes('suite') || lower.includes('vip')) {
    return { label: 'EXECUTIVE', class: 'room-tag--suite' };
  }
  if (lower.includes('deluxe')) {
    return { label: 'BEST SELLER', class: 'room-tag--bestseller' };
  }
  return { label: 'STANDARD', class: 'room-tag--standard' };
};

const getStatusBadge = (room) => {
  if (room.is_deleted || room.status_cd === 'LOCKED') {
    return {
      text: 'Tạm khóa',
      sub: 'Đóng bán',
      className: 'room-status-badge--locked',
      dotClass: 'room-status-dot--locked',
    };
  }
  if (room.status_cd === 'MAINTENANCE') {
    return {
      text: 'Bảo trì',
      sub: 'Kỹ thuật',
      className: 'room-status-badge--maintenance',
      dotClass: 'room-status-dot--maintenance',
    };
  }
  if (room.status_cd === 'OCCUPIED' || room.status_cd === 'BOOKED') {
    return {
      text: 'Có khách',
      sub: 'Đang ở',
      className: 'room-status-badge--occupied',
      dotClass: 'room-status-dot--occupied',
    };
  }
  return {
    text: 'Khả dụng',
    sub: 'Đón khách',
    className: 'room-status-badge--available',
    dotClass: 'room-status-dot--available',
  };
};

const RoomTable = ({
  rooms = [],
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  onToggleStatus,
  onViewClick,
  onEditClick,
  onDeleteClick,
  readOnly = false,
}) => {
  const isAllSelected = rooms.length > 0 && selectedIds.length === rooms.length;

  return (
    <div className="room-table-container">
      <table className="room-table">
        <thead>
          <tr>
            <th className="room-th room-th--checkbox">
              <input
                type="checkbox"
                className="room-checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                aria-label="Chọn tất cả"
              />
            </th>
            <th className="room-th room-th--hotel">KHÁCH SẠN</th>
            <th className="room-th room-th--name">HẠNG PHÒNG</th>
            <th className="room-th room-th--specs">VỊ TRÍ TẦNG</th>
            <th className="room-th room-th--status-spec">SỐ PHÒNG &amp; TÌNH TRẠNG</th>
            <th className="room-th room-th--toggle">TRẠNG THÁI (ĐÓNG/MỞ)</th>
            <th className="room-th room-th--actions">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          {rooms.length === 0 ? (
            <tr>
              <td colSpan="7">
                <div className="room-empty-state">
                  <div className="room-empty-state__icon">
                    <BuildingIcon size={32} />
                  </div>
                  <h3 className="room-empty-state__title">Không tìm thấy buồng phòng nào</h3>
                  <p className="room-empty-state__desc">
                    {readOnly
                      ? 'Thử thay đổi bộ lọc tìm kiếm để xem các buồng phòng khác.'
                      : 'Thử thay đổi bộ lọc tìm kiếm hoặc nhấn nút "Thêm buồng phòng mới" để bắt đầu quản lý.'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rooms.map((room) => {
              const rt = room.m_room_type || {};
              const hotel = room.m_hotel || {};
              const isSelected = selectedIds.includes(room.room_id);
              const tag = getBadgeForRoomType(rt.type_name);
              const statusInfo = getStatusBadge(room);
              const statusUpper = String(room.status_cd || '').toUpperCase();
              const isAvailable = !room.is_deleted && statusUpper === 'AVAILABLE';
              const isOccupied = statusUpper === 'OCCUPIED';
              const isBooked = statusUpper === 'BOOKED';
              const isOccupiedOrBooked = isOccupied || isBooked;

              return (
                <tr
                  key={room.room_id}
                  className={`room-tr ${isSelected ? 'room-tr--selected' : ''}`}
                >
                  {/* 1. Checkbox */}
                  <td className="room-td room-td--checkbox">
                    <input
                      type="checkbox"
                      className="room-checkbox"
                      checked={isSelected}
                      onChange={() => onSelectRow(room.room_id)}
                      aria-label={`Chọn phòng ${room.room_number}`}
                    />
                  </td>

                  {/* 2. Khách sạn */}
                  <td className="room-td room-td--hotel">
                    <div className="room-profile-cell">
                      <div className="room-thumb-wrap">
                        {room.hotel_image_url ? (
                          <img
                            src={room.hotel_image_url}
                            alt={hotel.name || 'Khách sạn'}
                            className="room-thumb-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="room-thumb-placeholder">
                            <BuildingIcon size={20} />
                          </div>
                        )}
                      </div>

                      <div className="room-profile-info">
                        <h4 className="room-profile-title" title={hotel.name}>
                          {hotel.name || 'Khách sạn'}
                        </h4>
                        {hotel.address && (
                          <div className="room-profile-sub">
                            <span className="room-hotel-name" title={hotel.address}>{hotel.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Hạng phòng */}
                  <td className="room-td room-td--name">
                    <div className="room-profile-info">
                      <span className={`room-tag ${tag.class}`}>{tag.label}</span>
                      <h4 className="room-profile-title" title={rt.type_name}>
                        {rt.type_name || 'Hạng phòng chưa đặt tên'}
                      </h4>
                      <div className="room-profile-sub">
                        <span className="room-sku">{room.sku || `Phòng ${room.room_number}`}</span>
                      </div>
                    </div>
                  </td>

                  {/* 4. Vị trí tầng */}
                  <td className="room-td room-td--specs">
                    <div className="room-spec-cell">
                      <span className="room-floor-tag">
                        {room.floor || 'Tầng 1'}
                      </span>
                    </div>
                  </td>

                  {/* 5. Số phòng & Tình trạng */}
                  <td className="room-td room-td--status-spec">
                    <div className="room-number-cell">
                      <div className="room-number-badge">
                        Phòng {room.room_number}
                      </div>
                      <div className={`room-status-badge ${statusInfo.className}`}>
                        <span className={`room-status-dot ${statusInfo.dotClass}`}></span>
                        <span>{statusInfo.text}</span>
                      </div>
                      <span className="room-status-sub">{statusInfo.sub}</span>
                    </div>
                  </td>

                  {/* 6. Trạng thái (Đóng/Mở Toggle) */}
                  <td className="room-td room-td--toggle">
                    <div className="room-toggle-cell">
                      {!readOnly && (
                        <label
                          className={`room-switch ${isOccupiedOrBooked ? 'room-switch--disabled' : ''}`}
                          title={
                            isOccupiedOrBooked
                              ? `Phòng đang ${isOccupied ? 'có khách lưu trú' : 'đã đặt trước'}, không thể đổi trạng thái đóng/mở bán trực tiếp`
                              : isAvailable
                                ? 'Nhấn để tạm khóa'
                                : 'Nhấn để mở bán'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isAvailable}
                            disabled={isOccupiedOrBooked}
                            onChange={() => {
                              if (!isOccupiedOrBooked) {
                                onToggleStatus(room);
                              }
                            }}
                          />
                          <span className="room-slider"></span>
                        </label>
                      )}
                      <span
                        className={`room-toggle-label ${
                          isAvailable
                            ? 'room-toggle-label--active'
                            : isOccupiedOrBooked
                              ? 'room-toggle-label--busy'
                              : 'room-toggle-label--locked'
                        }`}
                      >
                        {isAvailable
                          ? 'Đang mở bán'
                          : isOccupied
                            ? 'Đang có khách'
                            : isBooked
                              ? 'Đã đặt trước'
                              : 'Tạm khóa'}
                      </span>
                    </div>
                  </td>

                  {/* 7. Thao tác */}
                  <td className="room-td room-td--actions">
                    <div className="room-action-group">
                      <button
                        type="button"
                        className="room-btn-icon room-btn-icon--view"
                        onClick={() => onViewClick(room)}
                        title="Xem chi tiết"
                      >
                        <EyeIcon size={14} />
                      </button>
                      {!readOnly && (
                      <>
                      <button
                        type="button"
                        className="room-btn-icon room-btn-icon--edit"
                        onClick={() => onEditClick(room)}
                        title="Chỉnh sửa buồng phòng"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className={`room-btn-icon room-btn-icon--delete ${isOccupiedOrBooked ? 'room-btn-icon--blocked' : ''}`}
                        onClick={() => onDeleteClick(room)}
                        title={
                          isOccupiedOrBooked
                            ? `Phòng đang ${isOccupied ? 'có khách lưu trú' : 'đã đặt trước'} (bấm để xem lý do không thể xóa)`
                            : 'Xóa buồng phòng'
                        }
                      >
                        <TrashIcon size={14} />
                      </button>
                      </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RoomTable;
