import React, { useState, useEffect, useRef, useCallback } from 'react';
import AvatarContent from '../../../common/components/AvatarContent';
import {
  AVATAR_ACCEPTED_TYPES,
  validateAvatarFile,
  updateAvatar,
  removeAvatar,
} from '../../../services/avatarService';
import './AvatarUploadModal.css';

/**
 * Modal cập nhật ảnh đại diện: chọn ảnh (JPG/PNG/WEBP/GIF, ≤ 2MB), xem trước,
 * lưu, đổi ảnh khác hoặc xóa ảnh hiện tại.
 */
const AvatarUploadModal = ({ isOpen, onClose, userId, currentAvatarUrl, initials, onUpdated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); // 'save' | 'remove' | false
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setError('');
    setBusy(false);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Reset mỗi lần mở modal
  useEffect(() => {
    if (isOpen) resetState();
  }, [isOpen, resetState]);

  // Tạo / thu hồi URL xem trước
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const acceptFile = (file) => {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) acceptFile(file);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn một ảnh trước khi lưu.');
      return;
    }
    setBusy('save');
    setError('');
    try {
      const result = await updateAvatar(selectedFile, userId);
      onUpdated?.(result?.avatar_url || null, 'Cập nhật ảnh đại diện thành công!');
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    setError('');
    try {
      await removeAvatar();
      onUpdated?.(null, 'Đã xóa ảnh đại diện.');
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể xóa ảnh đại diện. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  const displayedSrc = previewUrl || currentAvatarUrl || '';

  return (
    <div
      className="avatar-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="avatar-modal__card">
        <div className="avatar-modal__header">
          <h2 id="avatar-modal-title" className="avatar-modal__title">Ảnh đại diện</h2>
          <button
            type="button"
            className="avatar-modal__close"
            onClick={onClose}
            disabled={Boolean(busy)}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="avatar-modal__body">
          <div className="avatar-modal__preview" aria-label="Xem trước ảnh đại diện">
            <AvatarContent src={displayedSrc} fallback={initials} alt="Ảnh đại diện" />
          </div>

          <div
            className={`avatar-modal__dropzone ${isDragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="avatar-file-input"
              type="file"
              accept={AVATAR_ACCEPTED_TYPES.join(',')}
              className="avatar-modal__file-input"
              onChange={handleFileChange}
              disabled={Boolean(busy)}
            />
            <label htmlFor="avatar-file-input" className="avatar-modal__choose-btn">
              {selectedFile || currentAvatarUrl ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
            </label>
            <p className="avatar-modal__hint">
              hoặc kéo thả ảnh vào đây · JPG, PNG, WEBP, GIF · tối đa 2MB
            </p>
            {selectedFile && (
              <p className="avatar-modal__file-name" title={selectedFile.name}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="avatar-modal__error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="avatar-modal__footer">
          {currentAvatarUrl && !selectedFile ? (
            <button
              type="button"
              className="avatar-modal__btn avatar-modal__btn--danger"
              onClick={handleRemove}
              disabled={Boolean(busy)}
            >
              {busy === 'remove' ? 'Đang xóa…' : 'Xóa ảnh'}
            </button>
          ) : (
            <span />
          )}
          <div className="avatar-modal__footer-right">
            <button
              type="button"
              className="avatar-modal__btn avatar-modal__btn--ghost"
              onClick={onClose}
              disabled={Boolean(busy)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="avatar-modal__btn avatar-modal__btn--primary"
              onClick={handleSave}
              disabled={Boolean(busy) || !selectedFile}
            >
              {busy === 'save' ? 'Đang tải lên…' : 'Lưu ảnh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploadModal;
