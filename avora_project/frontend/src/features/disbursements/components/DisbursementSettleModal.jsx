import React, { useState } from 'react';
import {
  CloseIcon,
  CreditCardIcon,
} from '../../../common/components/icons';

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const DisbursementSettleModal = ({
  isOpen,
  onClose,
  onConfirm,
  request,
  loading,
}) => {
  const [refCode, setRefCode] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen || !request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      gateway_transaction_ref: refCode.trim() || `BANK-TX-${Date.now()}`,
      note: note.trim(),
    });
  };

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-modal-title"
    >
      <div className="disbursement-modal" style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="disbursement-modal__header" style={{ background: '#059669', borderBottom: '2px solid #34D399' }}>
          <div className="disbursement-modal__header-info">
            <div className="disbursement-modal__icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}>
              <CreditCardIcon size={20} />
            </div>
            <div>
              <h2 id="settle-modal-title" className="disbursement-modal__title">
                Quyết toán &amp; Xác nhận chi trả
              </h2>
              <p className="disbursement-modal__subtitle" style={{ color: '#D1FAE5' }}>
                Hoàn tất chuyển khoản giải ngân doanh thu cho đối tác khách sạn
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

        <form onSubmit={handleSubmit}>
          <div className="disbursement-modal__body">
            {/* Box thông tin chuyển khoản */}
            <div className="disbursement-preview-box">
              <div className="disbursement-preview-row">
                <span className="disbursement-preview-label">Khách sạn:</span>
                <strong className="disbursement-preview-val">{request.hotel_name}</strong>
              </div>
              <div className="disbursement-preview-row">
                <span className="disbursement-preview-label">Chủ sở hữu:</span>
                <span className="disbursement-preview-val">
                  {request.owner_name} ({request.owner_email})
                </span>
              </div>
              <div className="disbursement-preview-row">
                <span className="disbursement-preview-label">Ngân hàng thụ hưởng:</span>
                <span className="disbursement-preview-val" style={{ color: '#003580', fontWeight: '600' }}>
                  {request.bank_info?.bank_name}
                </span>
              </div>
              <div className="disbursement-preview-row">
                <span className="disbursement-preview-label">Số tài khoản:</span>
                <span className="disbursement-preview-val disbursement-mono" style={{ fontWeight: '700' }}>
                  {request.bank_info?.account_number}
                </span>
              </div>
              <div className="disbursement-preview-row">
                <span className="disbursement-preview-label">Chủ tài khoản:</span>
                <span className="disbursement-preview-val" style={{ textTransform: 'uppercase', fontWeight: '600' }}>
                  {request.bank_info?.account_holder}
                </span>
              </div>
              <div className="disbursement-preview-row disbursement-preview-row--divider">
                <span className="disbursement-preview-label" style={{ fontSize: '14px', fontWeight: '700' }}>
                  Số tiền cần chi trả:
                </span>
                <span className="disbursement-preview-val" style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>
                  {formatCurrency(request.amount)}
                </span>
              </div>
            </div>

            {/* Input Mã giao dịch ngân hàng */}
            <div className="disbursement-form-group">
              <label htmlFor="settle-ref" className="disbursement-form-label">
                Mã tham chiếu ngân hàng / Biên nhận chuyển khoản
              </label>
              <input
                id="settle-ref"
                type="text"
                className="disbursement-form-input"
                placeholder="VD: FT241029888999 (để trống sẽ tạo tự động)"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
              />
            </div>

            {/* Input Ghi chú */}
            <div className="disbursement-form-group">
              <label htmlFor="settle-note" className="disbursement-form-label">
                Ghi chú nội bộ (tùy chọn)
              </label>
              <textarea
                id="settle-note"
                className="disbursement-form-textarea"
                rows={2}
                placeholder="VD: Đã đối soát ngày 30/10, chuyển qua Internet Banking Techcombank..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

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
              className="disbursement-btn disbursement-btn--success"
              disabled={loading}
            >
              <CreditCardIcon size={16} />
              <span>{loading ? 'Đang quyết toán...' : 'Xác nhận hoàn tất chi trả'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisbursementSettleModal;
