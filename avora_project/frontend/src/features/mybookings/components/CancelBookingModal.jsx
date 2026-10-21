import React from 'react';
import { AlertTriangleIcon, CalendarCancelIcon } from './BookingIcons';
import { formatVnd } from './bookingCardHelpers';

/**
 * Modal 4: Xác nhận hủy đặt phòng & Chính sách hoàn tiền
 */
const CancelBookingModal = ({
  booking,
  cancelReason,
  setCancelReason,
  isCancelling,
  onConfirm,
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
      <div className="my-bookings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-modal-header my-bookings-modal-header--danger">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <AlertTriangleIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Xác nhận hủy đặt phòng</h3>
              <span className="my-bookings-modal-subtitle">
                Đơn: {booking.booking_code} • {booking.hotel?.name}
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
          <p className="my-bookings-modal-intro" style={{ color: '#1e293b' }}>
            Bạn có chắc chắn muốn hủy đơn đặt phòng tại <strong>{booking.hotel?.name}</strong> không?
          </p>

          <div className="cancel-policy-card">
            <div className="cancel-policy-header">
              <span>Chính sách hoàn hủy từ hệ thống:</span>
              <span className="cancel-policy-badge">
                {booking.cancellation?.refund_percentage ?? 100}% hoàn tiền
              </span>
            </div>
            <div className="cancel-policy-note">
              {booking.cancellation?.policy_note}
            </div>
            <div className="cancel-policy-refund">
              <span>Số tiền hoàn dự kiến:</span>
              <strong className="cancel-policy-refund-val">
                {formatVnd(
                  booking.cancellation?.estimated_refund_amount ??
                  booking.total_amount
                )}
              </strong>
            </div>
          </div>

          <div className="modal-form-group">
            <label className="modal-form-label">
              Lý do hủy phòng <span className="req">*</span>
            </label>
            <select
              className="modal-form-select"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              <option value="Khách thay đổi kế hoạch chuyến đi">Thay đổi kế hoạch chuyến đi</option>
              <option value="Tìm thấy khách sạn / phòng khác tốt hơn">Tìm thấy chỗ nghỉ khác phù hợp hơn</option>
              <option value="Lý do cá nhân hoặc công việc đột xuất">Lý do sức khỏe / công việc đột xuất</option>
              <option value="Khác">Lý do khác</option>
            </select>
          </div>
        </div>

        <div className="my-bookings-modal-footer">
          <button
            type="button"
            className="my-bookings-btn-secondary"
            onClick={onClose}
            disabled={isCancelling}
          >
            Giữ lại phòng
          </button>
          <button
            type="button"
            className="my-bookings-btn-danger-solid"
            onClick={onConfirm}
            disabled={isCancelling}
          >
            <CalendarCancelIcon width="15" height="15" />
            <span>{isCancelling ? 'Đang xử lý hủy...' : 'Xác nhận hủy phòng'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
