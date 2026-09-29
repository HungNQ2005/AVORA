import React from 'react';
import './AmenityDeleteModal.css';

const AmenityDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  amenity,
  deleting = false,
  error = '',
}) => {
  if (!isOpen || !amenity) return null;

  const displayName = amenity.name_vi || amenity.facility_name || 'tiện ích này';

  return (
    <div className="rt-modal-overlay" onClick={onClose}>
      <div
        className="rt-delete-modal-content"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rt-delete-modal-header">
          <div className="rt-delete-icon-wrapper" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <h2 className="rt-delete-modal-title">Xóa tiện nghi</h2>
        </div>

        <div className="rt-delete-modal-body">
          <p>
            Bạn có chắc chắn muốn xóa tiện nghi <strong>"{displayName}"</strong> khỏi hệ thống cơ sở dữ liệu không?
          </p>
          <p className="rt-delete-modal-warning">
            Hành động này sẽ xóa dữ liệu tiện ích vĩnh viễn trên cơ sở dữ liệu cloud.
          </p>
          {error && <p className="rt-delete-modal-warning" role="alert">{error}</p>}
        </div>

        <div className="rt-delete-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={deleting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="rt-btn rt-btn-danger"
            onClick={() => onConfirm(amenity.facility_id)}
            disabled={deleting}
          >
            {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmenityDeleteModal;
