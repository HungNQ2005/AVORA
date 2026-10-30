import React, { useState } from 'react';

const DisbursementSettleModal = ({ isOpen, onClose, onConfirm, request, loading }) => {
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
    <div className="cp-modal-overlay">
      <div className="cp-modal" style={{ maxWidth: '520px' }}>
        <div className="cp-modal__header">
          <div className="cp-modal__title-group">
            <h2 className="cp-modal__title">Quyết toán & Xác nhận chi trả</h2>
            <p className="cp-modal__subtitle">
              Hoàn tất chuyển khoản giải ngân doanh thu cho đối tác khách sạn
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
            {/* Box thông tin chuyển khoản */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Khách sạn:</span>
                <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '13px' }}>
                  {request.hotel_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Chủ sở hữu:</span>
                <span style={{ fontWeight: '500', color: '#1E293B', fontSize: '13px' }}>
                  {request.owner_name} ({request.owner_email})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Ngân hàng thụ hưởng:</span>
                <span style={{ fontWeight: '600', color: '#003580', fontSize: '13px' }}>
                  {request.bank_info?.bank_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Số tài khoản:</span>
                <span style={{ fontWeight: '700', color: '#0F172A', fontSize: '14px', letterSpacing: '0.5px' }}>
                  {request.bank_info?.account_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Chủ tài khoản:</span>
                <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '13px' }}>
                  {request.bank_info?.account_holder}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px dashed #CBD5E1',
                  paddingTop: '8px',
                  marginTop: '8px',
                }}
              >
                <span style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>
                  Số tiền cần chi trả:
                </span>
                <span style={{ fontWeight: '800', color: '#059669', fontSize: '16px' }}>
                  {Number(request.amount).toLocaleString('vi-VN')} VND
                </span>
              </div>
            </div>

            {/* Input Mã giao dịch ngân hàng */}
            <div className="cp-form-group" style={{ marginBottom: '14px' }}>
              <label className="cp-form-label" style={{ fontWeight: '600', color: '#334155' }}>
                Mã tham chiếu ngân hàng / Biên nhận chuyển khoản
              </label>
              <input
                type="text"
                className="cp-form-input"
                placeholder="Nhập mã giao dịch (VD: FT263001894...)"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <small style={{ color: '#64748B', fontSize: '12px' }}>
                Nếu để trống, hệ thống sẽ tự động tạo mã quyết toán theo thời gian thực.
              </small>
            </div>

            {/* Ghi chú */}
            <div className="cp-form-group">
              <label className="cp-form-label" style={{ fontWeight: '600', color: '#334155' }}>
                Ghi chú đối soát (Tùy chọn)
              </label>
              <textarea
                className="cp-form-input"
                rows={2}
                placeholder="Ghi chú nội bộ cho giao dịch giải ngân này..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cp-btn cp-btn--primary"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: '6px',
                backgroundColor: '#059669',
                color: '#FFF',
                border: 'none',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang xử lý...' : '✓ Xác nhận đã chi trả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisbursementSettleModal;

