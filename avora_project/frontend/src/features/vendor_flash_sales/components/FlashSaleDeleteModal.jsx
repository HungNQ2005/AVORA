import React from 'react';
import '../../coupons/components/DeleteConfirmModal.css';

const FlashSaleDeleteModal = ({ isOpen, onClose, onConfirm, flashSale, loading = false, error = '' }) => {
  if (!isOpen || !flashSale) return null;

  return (
    <div className="rt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="rt-delete-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rt-delete-modal-header">
          <div className="rt-delete-icon-wrapper" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <h2 className="rt-delete-modal-title">Vô hiệu hóa Flash Sale</h2>
        </div>

        <div className="rt-delete-modal-body">
          <p>
            Bạn có chắc chắn muốn vô hiệu hóa Flash Sale <strong>"{flashSale.code}"</strong> của khách sạn{' '}
            <strong>{flashSale.hotel_name}</strong> không?
          </p>
          <p className="rt-delete-modal-warning">
            ⚡ Chương trình khuyến mãi giờ vàng này sẽ kết thúc ngay lập tức và không còn tự động áp dụng cho các lượt đặt phòng mới. Lịch sử đặt phòng trước đây vẫn được lưu trữ nguyên vẹn.
          </p>

          {error && (
            <p className="rt-form-error" role="alert" style={{ margin: '14px 0 0' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </p>
          )}
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
            {loading ? 'Đang vô hiệu hóa...' : 'Vô hiệu hóa ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashSaleDeleteModal;
