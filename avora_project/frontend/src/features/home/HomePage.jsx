import React from 'react';

/**
 * HomePage — A simple hello world landing page.
 */
const HomePage = () => {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #818cf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Hello World
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>
        Welcome to AVORA OTA Platform
      </p>
    </div>
  );
};

export default HomePage;
