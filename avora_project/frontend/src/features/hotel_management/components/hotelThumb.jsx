import React, { useState } from 'react';

/**
 * Building/Hotel vector fallback icon, shown when a hotel has no images
 * or the image URL fails to load.
 */
export const HotelFallbackIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12h12" />
    <path d="M6 7h12" />
    <path d="M6 17h12" />
    <path d="M10 22v-4h4v4" />
  </svg>
);

/**
 * Hotel thumbnail with automatic fallback to HotelFallbackIcon when there is
 * no image URL, or the URL fails to load (404/broken link via onError).
 */
const HotelThumb = ({ src, alt, className = '', iconSize }) => {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <div className={`hotel-thumb ${showFallback ? 'hotel-thumb--fallback' : ''} ${className}`}>
      {showFallback ? (
        <HotelFallbackIcon size={iconSize} />
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
};

export default HotelThumb;
