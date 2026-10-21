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

  const statusUpper = String(room.status_cd || '').toUpperCase();
  const isOccupied = statusUpper === 'OCCUPIED';
  const isBooked = statusUpper === 'BOOKED';
  const cannotDelete = isOccupied || isBooked;

  const getWarningMessage = () => {
    if (isOccupied) {
      return 'Không thể xóa buồng phòng đang có khách lưu trú. Vui lòng hoàn tất thủ tục trả phòng trước khi thực hiện xóa.';
    }
    if (isBooked) {
      return 'Không thể xóa buồng phòng đã được đặt trước. Vui lòng kiểm tra và hủy hoặc điều chuyển đơn đặt phòng trước khi thực hiện xóa.';
    }
    return 'Hệ thống sẽ thực hiện đánh dấu xóa mềm (soft-delete), ngừng mở bán buồng phòng này trên hệ thống để bảo toàn dữ liệu lịch sử đặt phòng.';
  };

  return (
    <div className="rt-modal-overlay" onClick={deleting ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="rt-delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rt-delete-modal-header">
          <div
            className={`rt-delete-icon-wrapper ${cannotDelete ? 'rt-delete-icon-wrapper--blocked' : ''}`}
            aria-hidden="true"
          >
            {cannotDelete ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            )}
          </div>
          <h2 className="rt-delete-modal-title">
            {cannotDelete ? 'Không thể xóa buồng phòng' : 'Xóa buồng phòng'}
          </h2>
        </div>

        <div className="rt-delete-modal-body">
          <p>
            {cannotDelete ? (
              <>
                Buồng phòng <strong>Phòng {room.room_number}</strong> ({room.m_room_type?.type_name || 'Hạng phòng chưa đặt tên'}) thuộc cơ sở{' '}
                <strong>{room.m_hotel?.name || 'khách sạn'}</strong> đang có dữ liệu {isOccupied ? 'khách lưu trú' : 'đơn đặt phòng'} hiệu lực.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn xóa buồng phòng <strong>Phòng {room.room_number}</strong> ({room.m_room_type?.type_name || 'Hạng phòng chưa đặt tên'}) thuộc cơ sở{' '}
                <strong>{room.m_hotel?.name || 'khách sạn'}</strong> không?
              </>
            )}
          </p>

          <div className={`rt-delete-modal-warning ${cannotDelete ? 'rt-delete-modal-warning--blocked' : ''}`}>
            {getWarningMessage()}
          </div>

          {error && (
            <p className="rt-delete-modal-warning rt-delete-modal-warning--error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="rt-delete-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={deleting}
          >
            {cannotDelete ? 'Đóng' : 'Hủy bỏ'}
          </button>
          {!cannotDelete && (
            <button
              type="button"
              className="rt-btn rt-btn-danger"
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomDeleteModal;
