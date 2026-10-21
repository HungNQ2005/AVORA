import React from 'react';
import { FolioInvoiceIcon, CheckCircleIcon, DownloadIcon } from './BookingIcons';
import { formatVnd } from './bookingCardHelpers';

/**
 * Modal 5: Hóa đơn VAT điện tử & Biên nhận
 */
const InvoiceModal = ({
  booking,
  invoiceData,
  onClose,
}) => {
  if (!booking) return null;

  return (
    <div
      className="my-bookings-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="my-bookings-modal-card my-bookings-modal-card--lg" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-modal-header">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <FolioInvoiceIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Biên Nhận & Hóa Đơn Điện Tử</h3>
              <span className="my-bookings-modal-subtitle">
                Đơn: {booking.booking_code} • Khách sạn {booking.hotel?.name}
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
          {!invoiceData ? (
            <div className="my-bookings-modal-loading">
              <div className="my-bookings-spinner" />
              <p>Đang tải dữ liệu biên nhận từ hệ thống...</p>
            </div>
          ) : (
            <>
              <div className="invoice-meta-card">
                <div className="invoice-meta-row">
                  <span className="invoice-meta-label">MÃ CHỨNG TỪ:</span>
                  <strong className="invoice-meta-code">{invoiceData.invoice_number}</strong>
                </div>
                <div className="invoice-meta-row">
                  <span className="invoice-meta-label">MÃ BOOKING TRA CỨU:</span>
                  <span className="invoice-meta-val" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {invoiceData.lookup_code}
                  </span>
                </div>
                <div className="invoice-meta-row">
                  <span className="invoice-meta-label">TRẠNG THÁI:</span>
                  <span className="invoice-status-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircleIcon width="13" height="13" />
                    <span>{invoiceData.invoice_status}</span>
                  </span>
                </div>
              </div>

              <table className="voucher-info-table">
                <tbody>
                  <tr>
                    <td>Khách sạn lưu trú:</td>
                    <td><strong>{invoiceData.hotel_name}</strong></td>
                  </tr>
                  <tr>
                    <td>Địa chỉ khách sạn:</td>
                    <td>{invoiceData.hotel_address}</td>
                  </tr>
                  <tr>
                    <td>Khách nhận phòng:</td>
                    <td><strong>{invoiceData.buyer_name}</strong> ({invoiceData.buyer_phone})</td>
                  </tr>
                  <tr>
                    <td>Ngày tạo đơn:</td>
                    <td>{invoiceData.issued_date}</td>
                  </tr>
                  <tr>
                    <td>Tạm tính tiền phòng:</td>
                    <td>{formatVnd(invoiceData.subtotal)}</td>
                  </tr>
                  <tr>
                    <td>Giảm giá (Coupon):</td>
                    <td>
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        -{formatVnd(invoiceData.discount_amount)}
                        {invoiceData.coupon_code ? ` (${invoiceData.coupon_code})` : ''}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Tổng tiền đơn đặt phòng:</td>
                    <td>
                      <span style={{ color: '#059669', fontSize: 16, fontWeight: 800 }}>
                        {formatVnd(invoiceData.total_amount)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="my-bookings-modal-footer">
          <button
            type="button"
            className="my-bookings-btn-secondary"
            onClick={() => alert(`Tải file PDF hóa đơn: ${invoiceData?.invoice_number}`)}
          >
            <DownloadIcon width="15" height="15" />
            <span>Tải file PDF hóa đơn</span>
          </button>
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

export default InvoiceModal;
