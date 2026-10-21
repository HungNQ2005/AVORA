import React from 'react';
import { GuestEditIcon } from './BookingIcons';

/**
 * Modal 2: Cập nhật thông tin khách nhận phòng & Ghi chú
 */
const EditGuestModal = ({
  booking,
  form,
  setForm,
  isUpdating,
  onSave,
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
        <div className="my-bookings-modal-header">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <GuestEditIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Cập nhật thông tin nhận phòng</h3>
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
              Thay đổi người nhận phòng hoặc gửi thêm yêu cầu đặc biệt đến cơ sở lưu trú <strong>{booking.hotel?.name}</strong>.
            </p>

            <div className="modal-form-group">
              <label className="modal-form-label">
                Họ và tên khách nhận phòng <span className="req">*</span>
              </label>
              <input
                type="text"
                required
                className="modal-form-input"
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">
                Số điện thoại liên lạc <span className="req">*</span>
              </label>
              <input
                type="tel"
                required
                className="modal-form-input"
                value={form.guest_phone}
                onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                placeholder="VD: 0912345678"
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-form-label">Yêu cầu đặc biệt gửi khách sạn</label>
              <textarea
                rows="3"
                className="modal-form-textarea"
                placeholder="Ví dụ: Giường đôi, tầng cao, nhận phòng muộn sau 18:00..."
                value={form.special_request}
                onChange={(e) => setForm({ ...form, special_request: e.target.value })}
              />
            </div>
          </div>

          <div className="my-bookings-modal-footer">
            <button
              type="button"
              className="my-bookings-btn-secondary"
              onClick={onClose}
              disabled={isUpdating}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="my-bookings-btn-primary"
              disabled={isUpdating}
            >
              {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGuestModal;
