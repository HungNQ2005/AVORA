import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

/* Custom SVG Icons matching the reference UI */
const HeadsetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const LuggageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="14" rx="2" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M9 10v6" />
    <path d="M15 10v6" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12h12" />
    <path d="M6 7h12" />
    <path d="M6 17h12" />
    <path d="M10 22v-4h4v4" />
  </svg>
);

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 18.5c.4-2.2 2.3-3.5 5-3.5s4.6 1.3 5 3.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const BedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <circle cx="7" cy="11" r="2" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFC107">
    <path d="M12 2L14.39 8.26L21 9.27L16 14.14L17.47 21L12 17.77L6.53 21L8 14.14L3 9.27L9.61 8.26L12 2Z" />
  </svg>
);

const StorePlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7" />
    <path d="M19 7l-1-4H6L5 7" />
    <path d="M12 13v4" />
    <path d="M10 15h4" />
  </svg>
);

/**
 * Reusable Header component matching the visual reference image.
 * Features a two-row layout with branding, user utilities, and primary navigation tabs.
 *
 * @param {Object} props
 * @param {string} [props.userName="Nguyễn Văn An"] - Current logged-in user display name.
 * @param {number} [props.savedCount=5] - Number of saved favorite items.
 * @param {string} [props.activeTab="home"] - Active navigation item ID.
 * @param {Function} [props.onNavClick] - Navigation click handler for future routing/events.
 */
const Header = ({
  userName = "Nguyễn Văn An",
  savedCount = 5,
  activeTab = "home",
  onNavClick
}) => {
  const handleAction = (actionName) => (e) => {
    e.preventDefault();
    if (onNavClick) {
      onNavClick(actionName);
    }
  };

  return (
    <header className="avora-header">
      {/* TOP ROW: Main Header Bar */}
      <div className="avora-header__top-row">
        <div className="avora-header__container">
          {/* Brand Logo & Tagline */}
          <div className="avora-header__brand-group">
            <Link to="/" className="avora-header__brand">
              <span className="avora-header__logo-text">Avora</span>
              <span className="avora-header__country-badge">
                <span>VIỆT</span>
                <span>NĂM</span>
              </span>
            </Link>

            <div className="avora-header__divider" />

            <div className="avora-header__tagline">
              <span className="avora-header__tagline-main">Đặt phòng khách sạn hàng đầu</span>
              <span className="avora-header__tagline-sub">Việt Nam</span>
            </div>
          </div>

          {/* Right Utilities & Actions */}
          <div className="avora-header__utilities">
            {/* Currency Selector */}
            <button type="button" className="avora-header__text-btn" onClick={handleAction('currency')}>
              VND
            </button>

            {/* Support 24/7 */}
            <button type="button" className="avora-header__util-item" onClick={handleAction('support')}>
              <HeadsetIcon />
              <span className="avora-header__two-line">
                <span>Hỗ trợ</span>
                <span>24/7</span>
              </span>
            </button>

            {/* Favorites / Saved */}
            <button type="button" className="avora-header__pill-btn" onClick={handleAction('favorites')}>
              <HeartIcon />
              <span className="avora-header__two-line">
                <span>Đã</span>
                <span>Lưu</span>
              </span>
              <span className="avora-header__count-badge">{savedCount}</span>
            </button>

            {/* Action Button: My Bookings */}
            <button type="button" className="avora-header__pill-btn" onClick={handleAction('my-bookings')}>
              <LuggageIcon />
              <span className="avora-header__two-line">
                <span>Đặt chỗ</span>
                <span>của tôi</span>
              </span>
            </button>

            {/* Action Button: Hotel Management PMS */}
            <button type="button" className="avora-header__pill-btn avora-header__pill-btn--pms" onClick={handleAction('pms')}>
              <BuildingIcon />
              <span className="avora-header__two-line">
                <span>Quản lý</span>
                <span>Khách sạn</span>
              </span>
              <span className="avora-header__pms-badge">PMS</span>
            </button>

            {/* User Profile */}
            <button type="button" className="avora-header__user-profile" onClick={handleAction('profile')}>
              <UserIcon />
              <span className="avora-header__user-name">{userName}</span>
              <ChevronDownIcon />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Navigation Bar */}
      <div className="avora-header__bottom-row">
        <div className="avora-header__container">
          <nav className="avora-header__nav-list">
            {/* Home / Trang chủ (Active by default) */}
            <Link
              to="/"
              className={`avora-header__nav-item avora-header__nav-item--active ${activeTab === 'home' ? 'is-active' : ''}`}
              onClick={handleAction('nav-home')}
            >
              <HomeIcon />
              <span>Trang chủ</span>
            </Link>

            {/* Hotels / Khách sạn */}
            <Link
              to="/"
              className={`avora-header__nav-item ${activeTab === 'hotels' ? 'is-active' : ''}`}
              onClick={handleAction('nav-hotels')}
            >
              <BedIcon />
              <span>Khách sạn</span>
            </Link>

            {/* Smart AI Suggestions / Gợi ý AI thông minh */}
            <Link
              to="/"
              className={`avora-header__nav-item avora-header__nav-item--ai ${activeTab === 'ai' ? 'is-active' : ''}`}
              onClick={handleAction('nav-ai')}
            >
              <SparklesIcon />
              <span>Gợi ý AI thông minh</span>
              <span className="avora-header__new-badge">MỚI</span>
            </Link>

            {/* About Us / Về chúng tôi */}
            <Link
              to="/"
              className={`avora-header__nav-item ${activeTab === 'about' ? 'is-active' : ''}`}
              onClick={handleAction('nav-about')}
            >
              <BuildingIcon />
              <span>Về chúng tôi</span>
            </Link>

            {/* Contact / Liên hệ */}
            <Link
              to="/"
              className={`avora-header__nav-item ${activeTab === 'contact' ? 'is-active' : ''}`}
              onClick={handleAction('nav-contact')}
            >
              <HeadsetIcon />
              <span>Liên hệ</span>
            </Link>
          </nav>

          {/* Right Partner Action */}
          <button type="button" className="avora-header__partner-link" onClick={handleAction('list-property')}>
            <StorePlusIcon />
            <span>Đăng chỗ nghỉ của bạn</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

