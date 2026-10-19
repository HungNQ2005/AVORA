import React, { useState, useEffect } from 'react';
import './AvatarContent.css';

/**
 * Nội dung bên trong ô avatar: hiển thị ảnh nếu có `src`, ngược lại (hoặc ảnh lỗi)
 * hiển thị chữ cái viết tắt như trước đây.
 * Đặt bên trong container tròn/bo góc có sẵn (header, sidebar, bảng người dùng...).
 */
const AvatarContent = ({ src, fallback, alt = '' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        className="avora-avatar__img"
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <>{fallback}</>;
};

export default AvatarContent;
