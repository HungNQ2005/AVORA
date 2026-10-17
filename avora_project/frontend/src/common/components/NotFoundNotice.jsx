import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const REDIRECT_SECONDS = 5;

/**
 * Explains why a page could not be found, then returns the user to the previous page.
 */
const NotFoundNotice = ({ title = 'Không tìm thấy trang', reason }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const message = reason || `Đường dẫn "${location.pathname}" không tồn tại hoặc đã bị di chuyển.`;

  const goBack = () => {
    // 'default' key means this is the first entry, so there is no previous page
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  };

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (location.key === 'default') navigate('/', { replace: true });
      else navigate(-1);
      return undefined;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, location.key, navigate]);

  return (
    <section role="alert" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>404 - {title}</h1>
      <p style={{ color: '#4b5563', marginBottom: '0.5rem' }}>{message}</p>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Bạn sẽ được đưa về trang trước sau {Math.max(secondsLeft, 0)} giây.
      </p>
      <button type="button" onClick={goBack} style={{ padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
        Quay lại ngay
      </button>
    </section>
  );
};

export default NotFoundNotice;
