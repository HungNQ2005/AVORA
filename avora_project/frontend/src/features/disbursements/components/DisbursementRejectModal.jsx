import React, { useState } from 'react';

const DisbursementRejectModal = ({ isOpen, onClose, onConfirm, request, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ reason: reason.trim() });
  };

  return (
    <div className="cp-modal-overlay">
      <div className="cp-modal" style={{ maxWidth: '480px' }}>
        <div className="cp-modal__header">
          <div className="cp-modal__title-group">
            <h2 className="cp-modal__title" style={{ color: '#DC2626' }}>
              Từ chối yêu cầu giải ngân
            </h2>
            <p className="cp-modal__subtitle">
              Số tiền sẽ được tự động hoàn trả về số dư khả dụng của khách sạn
            </p>
          </div>
          <button
            type="button"
            className="cp-modal__close-btn"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cp-modal__body" style={{ padding: '20px' }}>
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                color: '#991B1B',
                fontSize: '13.5px',
                lineHeight: '1.5',
              }}
            >
              Bạn đang từ chối yêu cầu giải ngân số tiền{' '}
              <strong>{Number(request.amount).toLocaleString('vi-VN')} VND</strong> của khách sạn{' '}
              <strong>{request.hotel_name}</strong>. Khi từ chối, toàn bộ số tiền này sẽ được hoàn
              lại ngay lập tức vào ví khách sạn.
            </div>

            <div className="cp-form-group">
              <label className="cp-form-label" style={{ fontWeight: '600', color: '#334155' }}>
                Lý do từ chối (bắt buộc)
              </label>
              <textarea
                className="cp-form-input"
                rows={3}
                placeholder="VD: Sai thông tin số tài khoản thụ hưởng, nghi vấn trùng lặp giao dịch..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                }}
              />
            </div>
          </div>

          <div
            className="cp-modal__footer"
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              className="cp-btn cp-btn--secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFF',
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="cp-btn cp-btn--danger"
              disabled={loading || !reason.trim()}
              style={{
                padding: '9px 20px',
                borderRadius: '6px',
                backgroundColor: '#DC2626',
                color: '#FFF',
                border: 'none',
                fontWeight: '600',
                cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisbursementRejectModal;

