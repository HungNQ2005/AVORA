import React from 'react';
import { CameraIcon } from './BookingIcons';

/**
 * Modal 7: Bộ sưu tập ảnh thực tế của khách sạn / chỗ nghỉ
 */
const GalleryModal = ({
  images,
  onClose,
}) => {
  if (!images) return null;

  return (
    <div
      className="my-bookings-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="my-bookings-modal-card my-bookings-modal-card--gallery" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-modal-header">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <CameraIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Bộ Sưu Tập Ảnh Thực Tế Chỗ Nghỉ</h3>
              <span className="my-bookings-modal-subtitle">
                {images.length} hình ảnh thực tế phòng &amp; cơ sở lưu trú
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
          {images.length === 0 ? (
            <div className="gallery-empty-state">
              <div className="gallery-empty-icon">
                <CameraIcon width="40" height="40" />
              </div>
              <p className="gallery-empty-title">Chưa có hình ảnh được lưu trong hệ thống</p>
              <p className="gallery-empty-desc">Dữ liệu ảnh thực tế đang được khách sạn cập nhật</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {images.map((url, i) => (
                <div key={i} className="gallery-grid-item">
                  <img
                    src={url}
                    alt={`Ảnh thực tế ${i + 1}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
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

export default GalleryModal;
