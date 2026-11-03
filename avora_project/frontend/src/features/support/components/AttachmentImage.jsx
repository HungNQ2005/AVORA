import React, { useEffect, useState } from 'react';
import { loadSupportImage } from '../../../services/supportApi';

const AttachmentImage = ({ attachment, onDelete }) => {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');

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

  if (error) return <span className="support-attachment-error" role="alert">{error}</span>;
  if (!src) return <span className="support-attachment-loading">Đang tải ảnh…</span>;
  return (
    <figure className="support-attachment">
      <a href={src} target="_blank" rel="noreferrer" aria-label={`Mở ảnh ${attachment.name || ''}`}>
        <img src={src} alt={attachment.name || 'Ảnh đính kèm'} />
      </a>
      <figcaption>
        <span>{attachment.name || 'Ảnh đính kèm'}</span>
        {onDelete && <button type="button" onClick={() => onDelete(attachment)}>Xóa ảnh</button>}
      </figcaption>
    </figure>
  );
};

export default AttachmentImage;
