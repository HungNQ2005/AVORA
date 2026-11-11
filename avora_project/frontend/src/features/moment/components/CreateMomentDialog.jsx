import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createMoment } from '../../../services/momentApi';
import '../MomentShared.css';
import './MomentDialog.css';
import './CreateMomentDialog.css';

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const sortBookingsForCreation = (bookings) => {
  const today = getToday();
  const getPriority = (booking) => {
    const checkout = String(booking.stay?.check_out_date || '').slice(0, 10);
    const checkin = String(booking.stay?.check_in_date || '').slice(0, 10);
    if (checkout && checkout < today) return 0;
    if (checkin && checkout && checkin <= today && today <= checkout) return 1;
    return 2;
  };
  return [...bookings].sort((a, b) => (
    getPriority(a) - getPriority(b)
    || String(b.stay?.check_out_date || '').localeCompare(String(a.stay?.check_out_date || ''))
  ));
};

const CreateMomentDialog = ({ bookings, onClose, onCreated }) => {
  const sortedBookings = useMemo(() => sortBookingsForCreation(bookings), [bookings]);
  const [bookingId, setBookingId] = useState(sortedBookings[0]?.booking_id || '');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');
    if (!file) {
      setImage(null);
      setPreviewUrl('');
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setImage(null);
      setPreviewUrl('');
      setError('Vui lòng chọn ảnh PNG hoặc JPEG.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImage(null);
      setPreviewUrl('');
      setError('Ảnh không được vượt quá 2 MB.');
      event.target.value = '';
      return;
    }
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!bookingId || !image || !message.trim()) {
      setError('Vui lòng chọn đơn đặt phòng, nhập nội dung và tải ảnh lên.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await createMoment({ bookingId, message, image });
      onCreated(created);
    } catch (submitError) {
      setError(submitError.message || 'Không thể tạo moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="moment-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section className="moment-modal moment-modal--create" role="dialog" aria-modal="true" aria-labelledby="moment-create-title">
        <header className="moment-modal__header">
          <div>
            <span className="moment-eyebrow">CHIA SẺ KHOẢNH KHẮC</span>
            <h2 id="moment-create-title">Tạo moment của bạn</h2>
          </div>
          <button type="button" className="moment-modal__close" onClick={onClose} disabled={submitting} aria-label="Đóng">×</button>
        </header>
        <form className="moment-modal__form" onSubmit={handleSubmit}>
          <label className="moment-form-field">
            <span>Đơn đặt phòng</span>
            <select value={bookingId} onChange={(event) => setBookingId(event.target.value)} required>
              {sortedBookings.map((booking) => (
                <option key={booking.booking_id} value={booking.booking_id}>
                  {booking.hotel.name} · {booking.stay.check_in_date || '—'} – {booking.stay.check_out_date || '—'}
                </option>
              ))}
            </select>
          </label>

          <label className="moment-form-field">
            <span>Nội dung</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Kể lại khoảnh khắc đáng nhớ trong chuyến đi..."
              maxLength={5000}
              rows={4}
              required
            />
          </label>

          <div className="moment-form-field">
            <span>Ảnh chuyến đi</span>
            <label className="moment-image-picker">
              {previewUrl
                ? <img src={previewUrl} alt="Ảnh xem trước" />
                : <span><strong>＋</strong> Chọn ảnh PNG hoặc JPEG <small>Tối đa 2 MB</small></span>}
              <input ref={imageInputRef} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleImageChange} required />
            </label>
            {image && <button type="button" className="moment-image-remove" onClick={() => {
              setImage(null);
              setPreviewUrl('');
              if (imageInputRef.current) imageInputRef.current.value = '';
            }}>Xóa ảnh đã chọn</button>}
          </div>

          {error && <p className="moment-form-error" role="alert">{error}</p>}
          <footer className="moment-modal__footer">
            <button type="button" className="moment-button moment-button--secondary" onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className="moment-button moment-button--primary" disabled={submitting}>
              {submitting ? 'Đang đăng…' : 'Đăng moment'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default CreateMomentDialog;
