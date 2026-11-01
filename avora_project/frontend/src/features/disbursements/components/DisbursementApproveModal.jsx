import React from 'react';
import {
  CloseIcon,
  CheckIcon,
  BuildingIcon,
  InfoIcon,
} from '../../../common/components/icons';

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const DisbursementApproveModal = ({
  isOpen,
  onClose,
  onConfirm,
  request,
  loading,
}) => {
  if (!isOpen || !request) return null;

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-modal-title"
    >
      <div className="disbursement-modal" style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="disbursement-modal__header">
          <div className="disbursement-modal__header-info">
            <div className="disbursement-modal__icon">
              <BuildingIcon size={20} />
            </div>
            <div>
              <h2 id="approve-modal-title" className="disbursement-modal__title">
                Phê duyệt yêu cầu giải ngân
              </h2>
              <p className="disbursement-modal__subtitle">
                Xác nhận điều kiện hợp lệ và chuyển sang bước Chờ thanh toán
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
        <div className="disbursement-modal__body">
          {/* Card thông tin yêu cầu */}
          <div className="disbursement-preview-box">
            <div className="disbursement-preview-row">
              <span className="disbursement-preview-label">Khách sạn:</span>
              <strong className="disbursement-preview-val">{request.hotel_name}</strong>
            </div>
            <div className="disbursement-preview-row">
              <span className="disbursement-preview-label">Đối tác / Đại diện:</span>
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
                {request.bank_info?.account_number} ({request.bank_info?.account_holder})
              </span>
            </div>
            <div className="disbursement-preview-row disbursement-preview-row--divider">
              <span className="disbursement-preview-label" style={{ fontSize: '14px', fontWeight: '700' }}>
                Số tiền giải ngân:
              </span>
              <span className="disbursement-preview-val" style={{ fontSize: '18px', fontWeight: '800', color: '#003580' }}>
                {formatCurrency(request.amount)}
              </span>
            </div>
          </div>

          {/* Workflow compliance notice */}
          <div className="disbursement-alert-box disbursement-alert-box--info">
            <InfoIcon size={18} className="disbursement-alert-box__icon" />
            <div className="disbursement-alert-box__content">
              <strong>Quy trình tài chính AVORA:</strong>
              <p>
                Sau khi phê duyệt, yêu cầu sẽ tự động chuyển sang trạng thái <strong>Đã phê duyệt (Chờ thanh toán)</strong>.
              </p>
              <p style={{ marginTop: '4px', color: '#1e3a8a' }}>
                <em>* Lưu ý: Yêu cầu <strong>CHƯA</strong> được ghi nhận là Đã chi trả cho đến khi bước thanh toán và quyết toán ngân hàng được hoàn tất.</em>
              </p>
            </div>
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
            type="button"
            className="disbursement-btn disbursement-btn--primary"
            onClick={onConfirm}
            disabled={loading}
          >
            <CheckIcon size={16} />
            <span>{loading ? 'Đang phê duyệt...' : 'Xác nhận phê duyệt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisbursementApproveModal;

