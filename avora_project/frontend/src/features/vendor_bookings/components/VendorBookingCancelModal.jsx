import React, { useState } from 'react';
import './VendorBookingCancelModal.css';

const VendorBookingCancelModal = ({
  isOpen = false,
  booking = null,
  onClose,
  onConfirmCancel,
  isProcessing = false,
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !booking) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('Vui lòng nhập lý do hủy đơn để thông báo cho khách hàng.');
      return;
    }
    if (trimmed.length < 5) {
      setValidationError('Lý do hủy đơn cần ít nhất 5 ký tự.');
      return;
    }
    if (trimmed.length > 500) {
      setValidationError('Lý do hủy đơn không được dài quá 500 ký tự.');
      return;
    }

    setValidationError('');
    onConfirmCancel(booking, trimmed);
  };

  const handleClose = () => {
    setReason('');
    setValidationError('');
    onClose();
  };

  return (
    <div className="vbooking-modal-backdrop" onClick={handleClose}>
      <div className="vbooking-cancel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vbooking-cancel-modal__header">
          <div className="vbooking-cancel-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div>
            <h3 className="vbooking-cancel-modal__title">Xác nhận hủy đơn đặt phòng</h3>
            <p className="vbooking-cancel-modal__sub">
              Mã đơn: <strong>{booking.booking_ref}</strong> ({booking.guest_name})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="vbooking-cancel-modal__form">
          <p className="vbooking-cancel-warning">
            Lưu ý: Sau khi hủy, phòng sẽ được mở lại trên hệ thống và trạng thái đơn sẽ được cập nhật thành "Đã hủy".
          </p>

          <div className="vbooking-form-group">
            <label className="vbooking-form-label">
              Lý do hủy phòng <span className="text-red-500">*</span>:
            </label>
            <textarea
              className={`vbooking-textarea ${validationError ? 'vbooking-textarea--error' : ''}`}
              rows={3}
              placeholder="Ví dụ: Khách báo không đến, phòng gặp sự cố kỹ thuật đột xuất, thời tiết xấu..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={isProcessing}
            />
            {validationError && (
              <span className="vbooking-form-error-msg">{validationError}</span>
            )}
          </div>

          <div className="vbooking-cancel-modal__actions">
            <button
              type="button"
              className="vbooking-btn vbooking-btn--secondary"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="vbooking-btn vbooking-btn--danger"
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorBookingCancelModal;

