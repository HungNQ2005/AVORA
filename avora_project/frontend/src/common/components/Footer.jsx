import React from 'react';
import './Footer.css';

/**
 * Reusable Footer component.
 * Used by MainLayout.
 */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="avora-footer">
      <div className="avora-footer__inner">
        <span className="avora-footer__copy">
          © {year} <strong>AVORA OTA Platform</strong>. University Capstone Project.
        </span>
        <span className="avora-footer__stack">
          React · Vite · Node.js · Supabase
        </span>
      </div>
    </footer>
  );
};

export default Footer;
