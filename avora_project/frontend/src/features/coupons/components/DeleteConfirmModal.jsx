import React from 'react';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, couponCode, loading = false }) => {
  if (!isOpen) return null;

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
          <h2 className="rt-delete-modal-title">Xóa mã khuyến mãi</h2>
        </div>

        <div className="rt-delete-modal-body">
          <p>
            Bạn có chắc chắn muốn xóa mã khuyến mãi <strong>"{couponCode}"</strong> khỏi hệ thống không?
          </p>
          <p className="rt-delete-modal-warning">
            Mã này sẽ bị xóa khỏi danh sách quản lý và không thể sử dụng trên hệ thống.
          </p>
        </div>

        <div className="rt-delete-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="rt-btn rt-btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
