import React from 'react';

const BookingErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="booking-modal-overlay">
      <section
        className="booking-modal-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="booking-error-title"
        aria-describedby="booking-error-description"
      >
        <div className="booking-modal-error-icon" aria-hidden="true">!</div>
        <h2 id="booking-error-title" className="booking-modal-title">
          Không thể hoàn tất đặt phòng
        </h2>
        <p id="booking-error-description" className="booking-modal-desc">
          {message}
        </p>
        <div className="booking-modal-actions">
          <button
            type="button"
            className="booking-modal-btn-primary"
            onClick={onClose}
            autoFocus
          >
            Đã hiểu
          </button>
        </div>
      </section>
    </div>
  );
};

export default BookingErrorModal;
