import React from 'react';
import { CalendarEditIcon, ShieldCheckIcon } from './BookingIcons';

/**
 * Modal 3: Đổi ngày nhận / trả phòng
 */
const DateChangeModal = ({
  booking,
  newCheckIn,
  setNewCheckIn,
  newCheckOut,
  setNewCheckOut,
  couponRemovalNotice,
  isChanging,
  onSave,
  onConfirmCouponRemoval,
  onCancelCouponRemoval,
  onClose,
}) => {
  if (!booking) return null;
  const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

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
              <CalendarEditIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Đổi ngày nhận / trả phòng</h3>
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

        <form onSubmit={onSave}>
          <div className="my-bookings-modal-body">
            <p className="my-bookings-modal-intro">
              Thay đổi ngày lưu trú cho đơn <strong>{booking.booking_code}</strong> tại {booking.hotel?.name}.
            </p>

            <div className="modal-form-grid-2">
              <div className="modal-form-group">
                <label className="modal-form-label">
                  Ngày nhận phòng mới <span className="req">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="modal-form-input"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">
                  Ngày trả phòng mới <span className="req">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="modal-form-input"
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="date-change-notice-box">
              <ShieldCheckIcon width="18" height="18" />
              <div>
                <strong>Chính sách linh hoạt Avora:</strong> Ngày lưu trú mới cần nằm trong khung thời gian phòng còn trống tại khách sạn.
              </div>
            </div>

            {couponRemovalNotice && (
              <div className="date-change-coupon-warning" role="alert">
                <strong>Voucher sẽ bị mất nếu bạn đổi ngày</strong>
                <p>
                  {couponRemovalNotice.coupon_code
                    ? `Voucher ${couponRemovalNotice.coupon_code} không còn đủ điều kiện áp dụng.`
                    : 'Voucher hiện tại không còn đủ điều kiện áp dụng.'}
                  {' '}Khoản giảm giá hiện tại {formatVnd(couponRemovalNotice.current_discount)} sẽ bị gỡ.
                </p>
                <p>
                  Tổng tiền sau khi đổi ngày và bỏ voucher: <strong>{formatVnd(couponRemovalNotice.proposed_total)}</strong>
                </p>
                {couponRemovalNotice.reason && <small>{couponRemovalNotice.reason}</small>}
              </div>
            )}
          </div>

          <div className="my-bookings-modal-footer">
            {couponRemovalNotice ? (
              <>
                <button
                  type="button"
                  className="my-bookings-btn-secondary"
                  onClick={onCancelCouponRemoval}
                  disabled={isChanging}
                >
                  Không đổi ngày
                </button>
                <button
                  type="button"
                  className="my-bookings-btn-primary"
                  onClick={onConfirmCouponRemoval}
                  disabled={isChanging}
                >
                  {isChanging ? 'Đang cập nhật...' : 'Bỏ voucher và xác nhận đổi ngày'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="my-bookings-btn-secondary"
                  onClick={onClose}
                  disabled={isChanging}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="my-bookings-btn-primary"
                  disabled={isChanging}
                >
                  {isChanging ? 'Đang cập nhật...' : 'Xác nhận đổi ngày'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DateChangeModal;
