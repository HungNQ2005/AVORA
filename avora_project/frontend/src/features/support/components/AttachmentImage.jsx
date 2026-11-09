import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadSupportImage } from '../../../services/supportApi';
import { CloseIcon, TrashIcon } from '../../../common/components/icons';
import './attachmentImage.css';

const AttachmentImage = ({ attachment, onDelete }) => {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    let active = true;
    loadSupportImage(attachment.url, controller.signal)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((loadError) => {
        if (loadError.name !== 'CanceledError' && loadError.name !== 'AbortError') {
          setError(loadError.response?.data?.message || 'Không thể tải ảnh đính kèm.');
        }
      });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url]);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previewButton = previewButtonRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsPreviewOpen(false);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previewButton?.focus();
    };
  }, [isPreviewOpen]);

  if (error) return <span className="support-attachment-error" role="alert">{error}</span>;
  if (!src) return <span className="support-attachment-loading">Đang tải ảnh…</span>;
  const previewModal = isPreviewOpen && createPortal(
    <div
      className="support-image-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsPreviewOpen(false);
      }}
    >
      <section
        className="support-image-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={attachment.name || 'Ảnh đính kèm'}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="support-image-modal__close"
          onClick={() => setIsPreviewOpen(false)}
          aria-label="Đóng ảnh"
        ><CloseIcon size={18} /></button>
        <img src={src} alt={attachment.name || 'Ảnh đính kèm'} />
        {attachment.name && <p>{attachment.name}</p>}
      </section>
    </div>,
    document.body
  );

  return (
    <>
      <figure className="support-attachment">
        <button
          ref={previewButtonRef}
          type="button"
          className="support-attachment__preview"
          onClick={() => setIsPreviewOpen(true)}
          aria-label={`Phóng to ảnh ${attachment.name || ''}`}
        >
          <img src={src} alt={attachment.name || 'Ảnh đính kèm'} />
        </button>
        <figcaption>
          <span>{attachment.name || 'Ảnh đính kèm'}</span>
          {onDelete && <button type="button" onClick={() => onDelete(attachment)}><TrashIcon size={14} /> Xóa ảnh</button>}
        </figcaption>
      </figure>
      {previewModal}
    </>
  );
};

export default AttachmentImage;
