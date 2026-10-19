import React from 'react';
import './RoomDeleteModal.css';

const RoomDeleteModal = ({
  isOpen,
  onClose,
  room = null,
  deleting = false,
  error = '',
  onConfirm,
}) => {
  if (!isOpen || !room) return null;

  const isOccupied = room.status_cd === 'OCCUPIED';

  return (
    <div className="room-delete-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="room-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="room-delete-modal__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>

        <h3 className="room-delete-modal__title">Xác nhận xóa buồng phòng?</h3>
        <p className="room-delete-modal__desc">
          Bạn có chắc chắn muốn xóa buồng phòng{' '}
          <strong>Phòng {room.room_number}</strong> (
          {room.m_room_type?.type_name || 'Phòng'}) thuộc cơ sở{' '}
          <strong>{room.m_hotel?.name || 'khách sạn'}</strong>?
        </p>

        <div className="room-delete-modal__notice">
          {isOccupied
            ? 'Không thể xóa buồng phòng đang có khách lưu trú. Vui lòng hoàn tất thủ tục trả phòng trước.'
            : 'Hệ thống sẽ thực hiện đánh dấu xóa (soft-delete), ngừng mở bán buồng phòng này trên cổng trực tuyến OTA để bảo toàn dữ liệu lịch sử đặt phòng.'}
        </div>

        {error && (
          <div className="room-delete-alert">
            {error}
          </div>
        )}

        <div className="room-delete-modal__actions">
          <button
            type="button"
            className="room-delete-btn room-delete-btn--cancel"
            onClick={onClose}
            disabled={deleting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="room-delete-btn room-delete-btn--confirm"
            onClick={onConfirm}
            disabled={deleting || isOccupied}
          >
            {deleting ? 'Đang xóa...' : isOccupied ? 'Không thể xóa' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomDeleteModal;
