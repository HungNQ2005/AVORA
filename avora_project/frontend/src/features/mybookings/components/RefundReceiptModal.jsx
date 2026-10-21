import React from 'react';
import { ReceiptRefundIcon, CheckIcon, CheckCircleIcon } from './BookingIcons';
import { formatVnd, parseIsoToDate } from './bookingCardHelpers';

/**
 * Modal 6: Biên lai hoàn tiền giao dịch
 */
const RefundReceiptModal = ({
  refundData,
  onClose,
}) => {
  if (!refundData) return null;

  return (
    <div
      className="my-bookings-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-modal-header">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <ReceiptRefundIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Biên Lai Hoàn Tiền Giao Dịch</h3>
              <span className="my-bookings-modal-subtitle">
                {refundData.booking_code ? `Đơn ${refundData.booking_code} • ` : ''}Chi tiết hoàn tiền từ cổng thanh toán
              </span>
            </div>
          </div>
          <button
            type="button"
            className="my-bookings-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="my-bookings-modal-body">
          <div className="refund-summary-hero">
            <div className="refund-check-circle">
              <CheckIcon width="26" height="26" />
            </div>
            <h4 className="refund-summary-title">
              {refundData.refund_status_label || `Trạng thái: ${refundData.refund_status_cd}`}
            </h4>
            <div className="refund-summary-amount">
              {formatVnd(refundData.refund_amount)}
            </div>
          </div>

          <table className="voucher-info-table">
            <tbody>
              <tr>
                <td>Mã yêu cầu hoàn:</td>
                <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                  {refundData.refund_id || '—'}
                </td>
              </tr>
              <tr>
                <td>Mã giao dịch hoàn:</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {refundData.gateway_refund_ref || 'Chưa có'}
                </td>
              </tr>
              <tr>
                <td>Trạng thái hoàn tiền:</td>
                <td>
                  <span className="refund-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircleIcon width="13" height="13" />
                    <span>{refundData.refund_status_label || refundData.refund_status_name || 'Đang xử lý'}</span>
                  </span>
                </td>
              </tr>
              <tr>
                <td>Lý do &amp; Ghi chú:</td>
                <td>{refundData.reason || '—'}</td>
              </tr>
              <tr>
                <td>Thời gian tạo yêu cầu:</td>
                <td>
                  {refundData.created_at
                    ? parseIsoToDate(refundData.created_at)?.toLocaleString('vi-VN')
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="my-bookings-modal-footer">
          <button
            type="button"
            className="my-bookings-btn-primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundReceiptModal;
