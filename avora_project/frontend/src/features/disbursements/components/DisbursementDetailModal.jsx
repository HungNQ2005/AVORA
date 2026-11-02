import React, { useState } from 'react';
import {
  CloseIcon,
  CreditCardIcon,
  BuildingIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UserIcon,
  CalendarIcon,
  CheckIcon,
} from '../../../common/components/icons';

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DisbursementDetailModal = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  onSettle,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !request) return null;

  const isPending = String(request.status_cd) === '1';
  const isApproved = String(request.status_cd) === '2';
  const isSettled = String(request.status_cd) === '4';
  const isRejected = String(request.status_cd) === '5';

  const handleCopyAccount = () => {
    if (request.bank_info?.account_number) {
      navigator.clipboard.writeText(request.bank_info.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    if (isPending) {
      return { label: 'Chờ phê duyệt', classModifier: 'warning' };
    }
    if (isApproved) {
      return { label: 'Đã phê duyệt (Chờ thanh toán)', classModifier: 'info' };
    }
    if (isSettled) {
      return { label: 'Đã giải ngân (Đã quyết toán)', classModifier: 'success' };
    }
    if (isRejected) {
      return { label: 'Bị từ chối', classModifier: 'error' };
    }
    return { label: request.status_label || 'Khác', classModifier: 'default' };
  };

  const badge = getStatusBadge();

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="disbursement-modal disbursement-modal--detail">
        {/* Modal Header: Deep Navy + Gold Accent line */}
        <div className="disbursement-modal__header">
          <div className="disbursement-modal__header-info">
            <div className="disbursement-modal__icon">
              <CreditCardIcon size={20} />
            </div>
            <div>
              <h2 id="detail-modal-title" className="disbursement-modal__title">
                Chi tiết yêu cầu giải ngân
              </h2>
              <p className="disbursement-modal__subtitle">
                Mã yêu cầu: <span className="disbursement-mono">{request.withdrawal_id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="disbursement-modal__close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="disbursement-modal__body">
          {/* Hero Banner: Amount & Status */}
          <div className="disbursement-detail-hero">
            <div className="disbursement-detail-hero__left">
              <span className="disbursement-detail-hero__label">Số tiền yêu cầu giải ngân</span>
              <div className="disbursement-detail-hero__amount">
                {formatCurrency(request.amount)}
              </div>
            </div>
            <div className="disbursement-detail-hero__right">
              <span className={`disbursement-badge disbursement-badge--${badge.classModifier}`}>
                {badge.label}
              </span>
            </div>
          </div>

          {/* Section 1: Hotel & Vendor Information */}
          <div className="disbursement-detail-section">
            <div className="disbursement-detail-section__header">
              <BuildingIcon size={16} />
              <span>Thông tin Khách sạn &amp; Đối tác</span>
            </div>
            <div className="disbursement-detail-grid">
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Khách sạn</span>
                <span className="disbursement-detail-item__val disbursement-detail-item__val--bold">
                  {request.hotel_name}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Chủ sở hữu / Đại diện</span>
                <span className="disbursement-detail-item__val">
                  {request.owner_name}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Email liên hệ</span>
                <span className="disbursement-detail-item__val">
                  {request.owner_email || '—'}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Số điện thoại</span>
                <span className="disbursement-detail-item__val">
                  {request.owner_phone || '—'}
                </span>
              </div>
              {request.hotel_address && (
                <div className="disbursement-detail-item disbursement-detail-item--full">
                  <span className="disbursement-detail-item__label">Địa chỉ khách sạn</span>
                  <span className="disbursement-detail-item__val">
                    {request.hotel_address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Bank Account Information */}
          <div className="disbursement-detail-section">
            <div className="disbursement-detail-section__header">
              <CreditCardIcon size={16} />
              <span>Tài khoản Ngân hàng thụ hưởng</span>
            </div>
            <div className="disbursement-detail-grid">
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Ngân hàng</span>
                <span className="disbursement-detail-item__val disbursement-detail-item__val--bold" style={{ color: '#003580' }}>
                  {request.bank_info?.bank_name || 'Ngân hàng'}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Số tài khoản</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="disbursement-detail-item__val disbursement-mono" style={{ fontSize: '15px', fontWeight: '700' }}>
                    {request.bank_info?.account_number || '—'}
                  </span>
                  {request.bank_info?.account_number && (
                    <button
                      type="button"
                      className="disbursement-copy-btn"
                      onClick={handleCopyAccount}
                      title="Sao chép số tài khoản"
                    >
                      {copied ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  )}
                </div>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Chủ tài khoản</span>
                <span className="disbursement-detail-item__val" style={{ textTransform: 'uppercase', fontWeight: '600' }}>
                  {request.bank_info?.account_holder || '—'}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Chi nhánh</span>
                <span className="disbursement-detail-item__val">
                  {request.bank_info?.bank_branch || 'Mặc định'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Timeline & Audit Information */}
          <div className="disbursement-detail-section">
            <div className="disbursement-detail-section__header">
              <CalendarIcon size={16} />
              <span>Tiến trình &amp; Đối soát</span>
            </div>
            <div className="disbursement-detail-grid">
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Thời gian tạo yêu cầu</span>
                <span className="disbursement-detail-item__val">
                  {formatDate(request.created_at)}
                </span>
              </div>
              <div className="disbursement-detail-item">
                <span className="disbursement-detail-item__label">Cập nhật gần nhất</span>
                <span className="disbursement-detail-item__val">
                  {formatDate(request.updated_at)}
                </span>
              </div>
              <div className="disbursement-detail-item disbursement-detail-item--full">
                <span className="disbursement-detail-item__label">
                  {isRejected ? 'Lý do từ chối / Ghi chú' : 'Mã tham chiếu ngân hàng / Biên nhận'}
                </span>
                <span className="disbursement-detail-item__val disbursement-mono">
                  {request.gateway_transaction_ref || 'Chưa phát sinh (Đang chờ xử lý)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="disbursement-modal__footer">
          <button
            type="button"
            className="disbursement-btn disbursement-btn--outline"
            onClick={onClose}
          >
            Đóng
          </button>

          {/* Quick action buttons directly from inside details modal */}
          {isPending && (
            <>
              <button
                type="button"
                className="disbursement-btn disbursement-btn--danger"
                onClick={() => {
                  onClose();
                  onReject(request);
                }}
              >
                <CloseIcon size={15} />
                <span>Từ chối</span>
              </button>
              <button
                type="button"
                className="disbursement-btn disbursement-btn--primary"
                onClick={() => {
                  onClose();
                  onApprove(request);
                }}
              >
                <CheckIcon size={16} />
                <span>Phê duyệt yêu cầu</span>
              </button>
            </>
          )}

          {isApproved && onSettle && (
            <button
              type="button"
              className="disbursement-btn disbursement-btn--success"
              onClick={() => {
                onClose();
                onSettle(request);
              }}
            >
              <CreditCardIcon size={15} />
              <span>Xác nhận chi trả</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisbursementDetailModal;

