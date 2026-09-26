import React from 'react';

/**
 * High-quality SVG icon renderer tailored for hospitality amenities.
 */
export const AmenityIconRenderer = ({ name = '', code = '', type = '', icon = '', size = 20, className = '' }) => {
  const text = `${name} ${code} ${type} ${icon}`.toLowerCase();

  // Swimming Pool / Bể bơi
  if (text.includes('pool') || text.includes('bơi') || text.includes('vô cực')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 14c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1" />
        <path d="M2 18c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1" />
        <path d="M6 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
        <line x1="6" y1="7" x2="14" y2="7" />
      </svg>
    );
  }

  // Parking / Bãi đỗ xe
  if (text.includes('parking') || text.includes('đỗ xe') || text.includes('đậu xe') || text.includes('bãi đỗ')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
      </svg>
    );
  }

  // Reception / Service / Lễ tân
  if (text.includes('reception') || text.includes('lễ tân') || text.includes('service') || text.includes('24/7')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }

  // Bathtub / Bồn tắm
  if (text.includes('bath') || text.includes('tắm') || text.includes('bồn')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z" />
        <path d="M6 12V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v2" />
        <path d="M5 20v2" />
        <path d="M19 20v2" />
      </svg>
    );
  }

  // WiFi / Mạng
  if (text.includes('wifi') || text.includes('internet') || text.includes('mạng')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    );
  }

  // Spa / Massage / Sức khỏe
  if (text.includes('spa') || text.includes('massage') || text.includes('thảo dược')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5Z" />
        <path d="M8 14c-3 1-5 4-5 7h18c0-3-2-6-5-7" />
      </svg>
    );
  }

  // Restaurant / Ẩm thực / Bar / Bữa sáng
  if (text.includes('ẩm thực') || text.includes('restaurant') || text.includes('bar') || text.includes('buffet') || text.includes('coffee') || text.includes('cafe') || text.includes('breakfast') || text.includes('bữa sáng') || text.includes('food')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    );
  }

  // Gym / Fitness
  if (text.includes('gym') || text.includes('fitness') || text.includes('thể thao')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6.5 6.5 11 11" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
      </svg>
    );
  }

  // Hotel / Building / Resort
  if (text.includes('hotel') || text.includes('resort') || text.includes('khách sạn')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      </svg>
    );
  }

  // Default Room / Bed / Amenity
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  );
};

export default AmenityIconRenderer;
