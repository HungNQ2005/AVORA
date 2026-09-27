import React from 'react';
import './RoomTypeDeleteModal.css';

const RoomTypeDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  roomTypeName,
  deleting = false,
  error = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className="rt-modal-overlay">
      <div className="rt-delete-modal-content" role="dialog" aria-modal="true">
        <div className="rt-delete-modal-header">
          <div className="rt-delete-icon-wrapper" aria-hidden="true">!</div>
          <h2 className="rt-delete-modal-title">Xóa hạng phòng</h2>
        </div>

        <div className="rt-delete-modal-body">
          <p>
            Bạn có chắc chắn muốn xóa hạng phòng <strong>{roomTypeName}</strong> không?
          </p>
          <p className="rt-delete-modal-warning">
            Hạng phòng sẽ được ẩn khỏi danh sách. Dữ liệu vẫn được lưu trong hệ thống.
          </p>
          {error && <p className="rt-delete-modal-warning" role="alert">{error}</p>}
        </div>

        <div className="rt-delete-modal-footer">
          <button className="rt-btn rt-btn-cancel" onClick={onClose} disabled={deleting}>
            Hủy bỏ
          </button>
          <button className="rt-btn rt-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomTypeDeleteModal;
