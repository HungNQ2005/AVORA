import React, { useState, useEffect } from 'react';
import './VendorBookingCancelModal.css';

const CANCELLATION_SUGGESTIONS = [
  { id: 'tech_issue', label: 'Lỗi kỹ thuật về phòng (sự cố điện nước, điều hòa, hỏng hóc...)' },
  { id: 'policy_violation', label: 'Khách hàng vi phạm chính sách / nội quy của chỗ nghỉ' },
  { id: 'overbooking', label: 'Hết phòng do sự cố trùng lịch đặt phòng (Overbooking)' },
  { id: 'customer_request', label: 'Khách hàng liên hệ qua điện thoại yêu cầu hủy phòng' },
  { id: 'force_majeure', label: 'Sự cố bất khả kháng (thiên tai, bão lũ, bảo trì khu vực)' },
  { id: 'no_show', label: 'Khách không đến nhận phòng theo thời gian quy định (No-show)' },
  { id: 'custom', label: 'Lý do khác (tự nhập cụ thể bên dưới)...' },
];

const VendorBookingCancelModal = ({
  isOpen = false,
  booking = null,
  onClose,
  onConfirmCancel,
  isProcessing = false,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('');
      setReason('');
      setValidationError('');
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const isPaid = Boolean(
    booking.is_paid ||
    (booking.payment && (booking.payment.is_paid || Number(booking.payment.amount_paid) > 0))
  );
  const refundAmount = booking.payment?.amount_paid || booking.total_amount || 0;

  const trimmed = reason.trim();
  const isReasonValid = trimmed.length >= 5 && /[a-zA-ZÀ-ỹ]/.test(trimmed) && trimmed.length <= 500;
  const isSubmitDisabled = isProcessing || !isReasonValid;

  const validateInput = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return 'Vui lòng nhập lý do hủy phòng, không được để trống.';
    }
    if (trimmed.length < 5) {
      return 'Lý do hủy phòng cần ít nhất 5 ký tự để khách hàng hiểu rõ.';
    }
    if (trimmed.length > 500) {
      return 'Lý do hủy phòng không được dài quá 500 ký tự.';
    }
    // Không được chỉ toàn ký tự đặc biệt hoặc chỉ toàn số (phải chứa ký tự chữ)
    if (!/[a-zA-ZÀ-ỹ]/.test(trimmed)) {
      return 'Lý do hủy phòng phải chứa chữ cái mô tả rõ ràng, không được chỉ chứa ký tự đặc biệt hoặc số.';
    }
    return '';
  };

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setSelectedTemplate(val);
    if (!val || val === 'custom') {
      setReason('');
      setValidationError('');
      return;
    }
    const found = CANCELLATION_SUGGESTIONS.find((s) => s.id === val);
    if (found) {
      setReason(found.label);
      setValidationError('');
    }
  };

  const handleReasonChange = (e) => {
    const val = e.target.value;
    setReason(val);
    if (validationError) {
      const err = validateInput(val);
      setValidationError(err);
    }
    // Update dropdown if matches any suggestion
    const match = CANCELLATION_SUGGESTIONS.find((s) => s.label === val);
    if (match) {
      setSelectedTemplate(match.id);
    } else {
      setSelectedTemplate(val ? 'custom' : '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateInput(reason);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError('');
    onConfirmCancel(booking, reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setSelectedTemplate('');
    setValidationError('');
    onClose();
  };

  const formatVnd = (val) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;

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
              Mã đơn: <strong>{booking.booking_ref}</strong> • Khách: <strong>{booking.guest_name}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="vbooking-cancel-modal__form">
          {/* Hộp thông tin liên kết luồng hoàn tiền */}
          {isPaid ? (
            <div className="vbooking-refund-alert vbooking-refund-alert--paid">
              <div className="vbooking-refund-alert__header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Liên kết luồng hoàn tiền tự động (100%)</span>
              </div>
              <p className="vbooking-refund-alert__body">
                Đơn phòng này <strong>đã thanh toán</strong>: <strong className="vbooking-refund-amount">{formatVnd(refundAmount)}</strong>.
                Khi bạn xác nhận hủy, hệ thống sẽ <strong>tự động tạo yêu cầu hoàn tiền 100%</strong> cho khách hàng và gửi thông báo lý do hủy.
              </p>
            </div>
          ) : (
            <div className="vbooking-refund-alert vbooking-refund-alert--unpaid">
              <div className="vbooking-refund-alert__header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Thông tin thanh toán & Hủy phòng</span>
              </div>
              <p className="vbooking-refund-alert__body">
                Đơn chưa thanh toán trực tuyến (thanh toán khi nhận phòng). Khi hủy, phòng sẽ được tự động mở lại trong kho và không phát sinh hoàn tiền.
              </p>
            </div>
          )}

          {/* Thanh dropdown đề xuất lý do */}
          <div className="vbooking-form-group">
            <label className="vbooking-form-label">
              Chọn lý do đề xuất:
            </label>
            <select
              className="vbooking-select"
              value={selectedTemplate}
              onChange={handleTemplateChange}
              disabled={isProcessing}
            >
              <option value="">-- Chọn lý do có sẵn (hoặc tự điền tay bên dưới) --</option>
              {CANCELLATION_SUGGESTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ô nhập lý do (cho phép điền tay) */}
          <div className="vbooking-form-group">
            <div className="vbooking-label-row">
              <label className="vbooking-form-label">
                Lý do hủy phòng thông báo cho khách <span className="text-red-500">*</span>:
              </label>
              <span className="vbooking-char-counter">
                {reason.length}/500 ký tự
              </span>
            </div>
            <textarea
              className={`vbooking-textarea ${validationError ? 'vbooking-textarea--error' : ''}`}
              rows={3}
              placeholder="Chọn từ gợi ý ở trên hoặc tự điền tay chi tiết (lỗi kỹ thuật về phòng, bạn đã vi phạm chính sách...)"
              value={reason}
              onChange={handleReasonChange}
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
              disabled={isSubmitDisabled}
              title={!isReasonValid ? 'Vui lòng chọn hoặc điền lý do hủy trước khi xác nhận' : ''}
            >
              {isProcessing
                ? 'Đang xử lý hủy...'
                : isPaid
                  ? 'Xác nhận hủy & Hoàn tiền'
                  : 'Xác nhận hủy đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorBookingCancelModal;
