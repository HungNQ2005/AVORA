import React from 'react';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, couponCode, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="dcm-overlay" onClick={onClose}>
      <div className="dcm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dcm-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>

        <h3 className="dcm-title">Vô hiệu hóa mã khuyến mãi</h3>
        <p className="dcm-message">
          Bạn có chắc chắn muốn vô hiệu hóa mã{' '}
          <span className="dcm-code">{couponCode}</span>?
          <br />
          Mã này sẽ không thể sử dụng được nữa trên hệ thống.
        </p>

        <div className="dcm-actions">
          <button className="dcm-btn dcm-btn--cancel" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </button>
          <button className="dcm-btn dcm-btn--confirm" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <span className="dcm-spinner"></span>
                Đang xử lý...
              </>
            ) : (
              'Vô hiệu hóa'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
