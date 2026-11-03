import React from 'react';
import './VendorBookingDetailModal.css';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  } catch {
    return dateStr;
  }
};

const VendorBookingDetailModal = ({
  isOpen = false,
  booking = null,
  onClose,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen || !booking) return null;

  const isPnd = booking.status?.name === 'PND';
  const isCfm = booking.status?.name === 'CFM';
  const isCan = booking.status?.name === 'CAN';

  return (
    <div className="vbooking-modal-backdrop" onClick={onClose}>
      <div className="vbooking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vbooking-modal__header">
          <div className="vbooking-modal__title-group">
            <div className="vbooking-modal__badge-row">
              <span className={`vbooking-status-badge vbooking-status-badge--${booking.status?.name?.toLowerCase() || 'default'}`}>
                {booking.status?.label || 'Chờ xác nhận'}
              </span>
              <span className="vbooking-modal__ref-label">MÃ ĐƠN:</span>
              <strong className="vbooking-modal__ref-code">{booking.booking_ref}</strong>
            </div>
            <span className="vbooking-modal__subtext">
              Thời gian tạo: {formatDateTime(booking.created_at)}
            </span>
          </div>

          <button
            type="button"
            className="vbooking-modal__close-btn"
            onClick={onClose}
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="vbooking-modal__body">
          {/* Section 1: Thông tin khách hàng */}
          <div className="vbooking-detail-section">
            <h4 className="vbooking-detail-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Thông tin khách hàng</span>
            </h4>
            <div className="vbooking-detail-grid">
              <div className="vbooking-detail-item">
                <span className="vbooking-detail-item__label">Họ và tên:</span>
                <span className="vbooking-detail-item__value font-bold">{booking.guest_name}</span>
              </div>
              <div className="vbooking-detail-item">
                <span className="vbooking-detail-item__label">Số điện thoại:</span>
                <span className="vbooking-detail-item__value">{booking.guest_phone}</span>
              </div>
              <div className="vbooking-detail-item vbooking-detail-item--full">
                <span className="vbooking-detail-item__label">Yêu cầu đặc biệt:</span>
                <span className="vbooking-detail-item__value vbooking-detail-item__value--note">
                  {booking.special_request || 'Không có yêu cầu đặc biệt nào từ khách hàng.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Thông tin cơ sở & Buồng phòng */}
          <div className="vbooking-detail-section">
            <h4 className="vbooking-detail-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              </svg>
              <span>Chi tiết phòng & lưu trú</span>
            </h4>
            <div className="vbooking-detail-hotel-info">
              <strong>{booking.hotel_name}</strong>
              <span>{booking.hotel_address}</span>
            </div>

            <div className="vbooking-detail-rooms-table-wrap">
              <table className="vbooking-detail-rooms-table">
                <thead>
                  <tr>
                    <th>Hạng phòng</th>
                    <th>Số lượng</th>
                    <th>Ngày nhận phòng</th>
                    <th>Ngày trả phòng</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.details.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{d.room_type_name}</strong>
                        {d.bed_type && <span className="vbooking-room-sub">{d.bed_type}</span>}
                      </td>
                      <td>{d.quantity} phòng</td>
                      <td>{formatDate(d.check_in_date)}</td>
                      <td>{formatDate(d.check_out_date)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(d.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Bảng kê thanh toán */}
          <div className="vbooking-detail-section">
            <h4 className="vbooking-detail-section__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              <span>Thanh toán & Hóa đơn</span>
            </h4>
            <div className="vbooking-billing-box">
              <div className="vbooking-billing-row">
                <span>Tiền phòng:</span>
                <span>{formatCurrency(booking.total_amount + (booking.discount_amount || 0))}</span>
              </div>
              {booking.discount_amount > 0 && (
                <div className="vbooking-billing-row vbooking-billing-row--discount">
                  <span>Mã ưu đãi / Giảm giá:</span>
                  <span>- {formatCurrency(booking.discount_amount)}</span>
                </div>
              )}
              <div className="vbooking-billing-row vbooking-billing-row--total">
                <strong>Tổng thanh toán:</strong>
                <strong className="vbooking-total-price">{formatCurrency(booking.total_amount)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="vbooking-modal__footer">
          <button
            type="button"
            className="vbooking-btn vbooking-btn--secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Đóng
          </button>

          {/* Nếu PND: Hiển thị Xác nhận và Hủy */}
          {isPnd && (
            <>
              <button
                type="button"
                className="vbooking-btn vbooking-btn--danger"
                onClick={() => onCancel(booking)}
                disabled={isProcessing}
              >
                Từ chối / Hủy đơn
              </button>
              <button
                type="button"
                className="vbooking-btn vbooking-btn--primary"
                onClick={() => onConfirm(booking)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận đơn đặt phòng'}
              </button>
            </>
          )}

          {/* Nếu CFM: Có thể hủy nếu khách báo hủy đột xuất */}
          {isCfm && (
            <button
              type="button"
              className="vbooking-btn vbooking-btn--danger"
              onClick={() => onCancel(booking)}
              disabled={isProcessing}
            >
              Hủy đơn đặt phòng này
            </button>
          )}

          {/* Nếu CAN: Đã hủy, chỉ xem */}
          {isCan && (
            <span className="vbooking-cancelled-notice">
              Đơn này đã hủy và đóng lịch sử.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorBookingDetailModal;

