import React, { useState } from 'react';
import {
  CloseIcon,
  AlertTriangleIcon,
} from '../../../common/components/icons';

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const DisbursementRejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  request,
  loading,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm({ reason: reason.trim() });
  };

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="disbursement-modal" style={{ maxWidth: '500px' }}>
        {/* Modal Header */}
        <div className="disbursement-modal__header" style={{ background: '#991B1B', borderBottom: '2px solid #F87171' }}>
          <div className="disbursement-modal__header-info">
            <div className="disbursement-modal__icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}>
              <AlertTriangleIcon size={20} />
            </div>
            <div>
              <h2 id="reject-modal-title" className="disbursement-modal__title">
                Từ chối yêu cầu giải ngân
              </h2>
              <p className="disbursement-modal__subtitle" style={{ color: '#FEE2E2' }}>
                Hoàn trả toàn bộ số tiền về ví số dư khả dụng của khách sạn
              </p>
            </div>
          </div>
          <button
            type="button"
            className="disbursement-modal__close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="disbursement-modal__body">
            {/* Warning notice */}
            <div className="disbursement-alert-box disbursement-alert-box--error">
              <AlertTriangleIcon size={18} className="disbursement-alert-box__icon" />
              <div className="disbursement-alert-box__content">
                Bạn đang từ chối yêu cầu giải ngân số tiền{' '}
                <strong>{formatCurrency(request.amount)}</strong> của khách sạn{' '}
                <strong>{request.hotel_name}</strong>. Khi từ chối, toàn bộ số tiền này sẽ được hoàn lại ngay lập tức vào ví khách sạn.
              </div>
            </div>

            {/* Input reason */}
            <div className="disbursement-form-group">
              <label htmlFor="reject-reason" className="disbursement-form-label">
                Lý do từ chối <span className="disbursement-required">*</span>
              </label>
              <textarea
                id="reject-reason"
                className="disbursement-form-textarea"
                rows={3}
                placeholder="VD: Sai thông tin số tài khoản thụ hưởng, nghi vấn trùng lặp giao dịch..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="disbursement-modal__footer">
            <button
              type="button"
              className="disbursement-btn disbursement-btn--outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="disbursement-btn disbursement-btn--danger"
              disabled={loading || !reason.trim()}
            >
              <CloseIcon size={15} />
              <span>{loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisbursementRejectModal;
