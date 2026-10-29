import React, { useEffect } from 'react';
import './ConfirmLinkModal.css';

const ConfirmLinkModal = ({
  isOpen,
  onClose,
  onConfirm,
  hotelName,
  bankName,
  accountNumber,
  accountHolder,
  isLoading,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="hw-modal-overlay" onClick={isLoading ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="hw-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Icon */}
        <div className="hw-modal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>

        {/* Title & Message */}
        <h2 className="hw-modal-title">Xác nhận liên kết ngân hàng</h2>
        <p className="hw-modal-desc">
          Bạn đang liên kết tài khoản nhận tiền thụ hưởng với ví của khách sạn{' '}
          <strong>"{hotelName}"</strong>.
        </p>

        {/* Account Details Box */}
        <div className="hw-modal-details">
          {bankName && (
            <div className="hw-modal-detail-row">
              <span>Ngân hàng</span>
              <strong>{bankName}</strong>
            </div>
          )}
          <div className="hw-modal-detail-row">
            <span>Số tài khoản</span>
            <strong className="hw-modal-acc-num">{accountNumber}</strong>
          </div>
          <div className="hw-modal-detail-row">
            <span>Chủ tài khoản</span>
            <strong>{accountHolder}</strong>
          </div>
        </div>

        {/* Security Warning */}
        <div className="hw-modal-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>
            Mỗi khách sạn chỉ liên kết 1 tài khoản duy nhất và sẽ được cố định sau khi xác nhận. Nếu muốn đổi sau này, bạn sẽ cần tạo ticket hỗ trợ.
          </span>
        </div>

        {/* Actions */}
        <div className="hw-modal-actions">
          <button
            type="button"
            className="hw-modal-btn hw-modal-btn--cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Kiểm tra lại
          </button>
          <button
            type="button"
            className="hw-modal-btn hw-modal-btn--confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Đang liên kết…' : 'Xác nhận liên kết'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLinkModal;

