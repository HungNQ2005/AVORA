import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

/**
 * Reusable Header component — displays AVORA branding/logo and navigation.
 * Used by MainLayout.
 */
const Header = () => {
  return (
    <header className="avora-header">
      <div className="avora-header__inner">
        <Link to="/" className="avora-header__brand">
          <span className="avora-header__logo-icon">✈</span>
          <span className="avora-header__logo-text">AVORA</span>
        </Link>
        <nav className="avora-header__nav">
          <Link to="/system_codes" className="avora-header__link">System Codes</Link>
          <span className="avora-header__tag">OTA Platform</span>
          <span className="avora-header__version">v1.0.0</span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
