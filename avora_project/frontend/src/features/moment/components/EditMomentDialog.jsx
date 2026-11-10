
import React, { useEffect, useRef, useState } from 'react';
import { updateMoment } from '../../../services/momentApi';
import '../MomentShared.css';
import './MomentDialog.css';
import './EditMomentDialog.css';

const EditMomentDialog = ({ moment, onClose, onUpdated }) => {
  const [message, setMessage] = useState(moment.message || '');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setError('');

    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Vui lòng chọn ảnh PNG hoặc JPEG.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 2 MB.');
      event.target.value = '';
      return;
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl('');

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      setError('Vui lòng nhập nội dung moment.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const updated = await updateMoment({
        id: moment.moment_id,
        message,
        image,
      });

      onUpdated(updated);
    } catch (updateError) {
      setError(
        updateError.message || 'Không thể cập nhật bài đăng.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="moment-modal-backdrop moment-edit-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        className="moment-modal moment-modal--edit moment-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moment-edit-title"
        aria-describedby="moment-edit-description"
      >
        {/* Header */}
        <header className="moment-edit-dialog__header">
          <div className="moment-edit-dialog__heading">
            <span className="moment-edit-dialog__eyebrow">
              YOUR STORY / EDIT MOMENT
            </span>

            <h2 id="moment-edit-title">
              Chỉnh sửa câu chuyện
            </h2>

            <p id="moment-edit-description">
              Hoàn thiện lại những khoảnh khắc đáng nhớ của bạn.
            </p>
          </div>

          <button
            type="button"
            className="moment-edit-dialog__close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
          >
            ×
          </button>
        </header>

        {/* Form */}
        <form
          className="moment-edit-dialog__form"
          onSubmit={handleSubmit}
        >
          <div className="moment-edit-dialog__body">

            {/* Story content */}
            <section className="moment-edit-section">
              <div className="moment-edit-section__heading">
                <div>
                  <span className="moment-edit-section__index">
                    01 / YOUR STORY
                  </span>

                  <h3>Nội dung chia sẻ</h3>
                </div>

                <span className="moment-edit-section__optional">
                  BẮT BUỘC
                </span>
              </div>

              <label
                className="moment-edit-field"
                htmlFor="moment-edit-message"
              >
                <textarea
                  id="moment-edit-message"
                  className="moment-edit-textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={5000}
                  rows={6}
                  placeholder="Hãy kể lại câu chuyện và những khoảnh khắc đáng nhớ của bạn..."
                  required
                />

                <span className="moment-edit-textarea__footer">
                  <span>
                    Nội dung câu chuyện của bạn
                  </span>

                  <span className="moment-edit-char-count">
                    {message.length.toLocaleString('vi-VN')} / 5000
                  </span>
                </span>
              </label>
            </section>

            <div className="moment-edit-dialog__divider" />

            {/* Image */}
            <section className="moment-edit-section">
              <div className="moment-edit-section__heading">
                <div>
                  {/* <span className="moment-edit-section__index">
                    02 / VISUAL MEMORY
                  </span> */}

                  <h3>Hình ảnh khoảnh khắc</h3>
                </div>

                <span className="moment-edit-section__optional">
                  TÙY CHỌN
                </span>
              </div>

              <p className="moment-edit-image-description">
                Giữ lại hình ảnh hiện tại hoặc chọn một bức ảnh mới
                để thay thế.
              </p>

              <div
                className={`moment-edit-image ${image ? 'moment-edit-image--changed' : ''
                  }`}
              >
                <img
                  src={previewUrl || moment.image_url}
                  alt={
                    previewUrl
                      ? 'Ảnh mới xem trước'
                      : 'Ảnh moment hiện tại'
                  }
                />

                <div className="moment-edit-image__overlay">
                  <span className="moment-edit-image__status">
                    {image ? 'Ảnh Mới' : 'Ảnh Hiện Tại'}
                  </span>

                  <label
                    className="moment-edit-image__change"
                    htmlFor="moment-edit-image-input"
                  >
                    <span aria-hidden="true">↗</span>
                    {image ? 'Chọn ảnh khác' : 'Thay đổi hình ảnh'}
                  </label>
                </div>

                <input
                  ref={imageInputRef}
                  id="moment-edit-image-input"
                  className="moment-edit-image__input"
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleImageChange}
                />
              </div>

              <div className="moment-edit-image__meta">
                <span>
                  Định dạng PNG hoặc JPEG
                </span>

                <span>
                  Dung lượng tối đa 2 MB
                </span>
              </div>

              {image && (
                <button
                  type="button"
                  className="moment-edit-image__remove"
                  onClick={handleRemoveImage}
                >
                  <span aria-hidden="true">↶</span>
                  Bỏ ảnh mới, giữ ảnh hiện tại
                </button>
              )}
            </section>

            {/* Validation */}
            {error && (
              <div
                className="moment-edit-error"
                role="alert"
              >
                <span className="moment-edit-error__icon">
                  !
                </span>

                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="moment-edit-dialog__footer">
            {/* <span className="moment-edit-dialog__footer-note">
              <span aria-hidden="true">✳</span>
              COLLECT MOMENTS. NOT THINGS.
            </span> */}

            <div className="moment-edit-dialog__actions">
              <button
                type="button"
                className="moment-edit-button moment-edit-button--cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                className="moment-edit-button moment-edit-button--save"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="moment-edit-button__spinner" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    Lưu thay đổi
                    <span aria-hidden="true">↗</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default EditMomentDialog;
