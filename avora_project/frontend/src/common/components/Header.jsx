import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { codeNameParser } from '../../utils/codeNameParser';
import { getSavedFavorites } from '../../utils/favoritesStorage';
import './Header.css';

/* Custom SVG Icons matching the reference UI */
const LogoutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
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

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const TagIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const SupportGreenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const LoginArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const UserPlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

/**
 * Reusable Header component matching the visual reference image.
 * Features a two-row layout with branding, user utilities, and primary navigation tabs.
 *
 * @param {Object} props
 * @param {number} [props.savedCount=0] - Number of saved favorite items.
 * @param {string} [props.activeTab="home"] - Active navigation item ID.
 * @param {Function} [props.onNavClick] - Navigation click handler for future routing/events.
 */
const Header = ({
  savedCount = 0,
  activeTab = "home",
  onNavClick
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);
  const userMenuRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [internalTab, setInternalTab] = useState(null);
  const currentPath = location.pathname;
  const currentTab = internalTab !== null
    ? internalTab
    : (currentPath.startsWith('/hotels') || currentPath === '/search' ? 'hotels' : (currentPath === '/favorites' || currentPath === '/saved' ? 'favorites' : (currentPath === '/' ? 'home' : activeTab)));

  const [internalSavedCount, setInternalSavedCount] = useState(() => {
    const list = getSavedFavorites();
    return list.length || savedCount || 0;
  });

  useEffect(() => {
    const syncCount = () => {
      const list = getSavedFavorites();
      setInternalSavedCount(list.length);
    };
    window.addEventListener('storage', syncCount);
    window.addEventListener('avora_favorites_updated', syncCount);
    return () => {
      window.removeEventListener('storage', syncCount);
      window.removeEventListener('avora_favorites_updated', syncCount);
    };
  }, []);

  // Close user profile & account dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.full_name || user?.email || '';
  const userRoleDisplayName = codeNameParser(user?.role_code_name);
  const isPartnerOrAdmin = user && ['ADM', 'VEN', 'BMR'].includes(user.role_code_name);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty('--header-height', `${height}px`);
        }
      }
    };

    updateHeaderHeight();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderHeight();
      });
      resizeObserver.observe(headerRef.current);
    }

    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  const [showSupportToast, setShowSupportToast] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const toastTimerRef = useRef(null);

  // Sync contact form with logged-in user info
  useEffect(() => {
    if (user) {
      setContactForm((prev) => ({
        ...prev,
        name: prev.name || user.full_name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSupportClick = (e) => {
    e.preventDefault();
    setShowSupportToast(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setShowSupportToast(false);
    }, 6000);

    if (onNavClick) {
      onNavClick('support');
    }
  };

  const handleAction = (tabKey) => (e) => {
    if (tabKey === 'about') {
      e.preventDefault();
      setInternalTab(tabKey);
      setShowAboutModal(true);
    } else if (tabKey === 'contact') {
      e.preventDefault();
      setInternalTab(tabKey);
      setShowContactModal(true);
    } else if (tabKey === 'favorites') {
      navigate('/favorites');
      return;
    } else if (tabKey === 'my-bookings') {
      if (!user) {
        navigate('/signin');
        return;
      }
      navigate('/myaccount');
      return;
    } else if (tabKey === 'pms') {
      if (!user) {
        navigate('/signin');
        return;
      }
      if (!isPartnerOrAdmin) {
        alert('Tài khoản của bạn không có quyền truy cập hệ thống Quản lý Khách sạn (PMS).');
        return;
      }
      setInternalTab(tabKey);
    } else {
      setInternalTab(null);
    }
    if (onNavClick) {
      onNavClick(tabKey);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setShowContactModal(false);
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };


  return (
    <>
      <header ref={headerRef} className="avora-header">
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

              {/* Support 24/7 (No active state, shows toast on click) */}
              <button type="button" className="avora-header__util-item avora-header__util-item--support" onClick={handleSupportClick}>
                <HeadsetIcon />
                <span className="avora-header__two-line">
                  <span>Hỗ trợ</span>
                  <span>24/7</span>
                </span>
              </button>

              {/* Favorites / Saved (Default: like Contact button, Active: default state of My Bookings) */}
              <button
                type="button"
                className={`avora-header__saved-btn ${(currentTab === 'favorites' || currentPath === '/favorites' || currentPath === '/saved' || (location.pathname === '/myaccount' && location.search.includes('tab=favorites'))) ? 'is-active' : ''}`}
                onClick={handleAction('favorites')}
              >
                <HeartIcon />
                <span className="avora-header__two-line">
                  <span>Đã</span>
                  <span>Lưu</span>
                </span>
                <span className="avora-header__count-badge">{internalSavedCount}</span>
              </button>

              {/* Action Button: My Bookings (Active: Gold/Bronze border & background) */}
              <button
                type="button"
                className={`avora-header__pill-btn ${currentTab === 'my-bookings' ? 'is-active' : ''}`}
                onClick={handleAction('my-bookings')}
              >
                <LuggageIcon />
                <span className="avora-header__two-line">
                  <span>Đặt chỗ</span>
                  <span>của tôi</span>
                </span>
              </button>

              {/* Action Button: Hotel Management PMS (only for partner/admin roles or guests) */}
              {(isPartnerOrAdmin || !user) && (
                <button
                  type="button"
                  className={`avora-header__pill-btn avora-header__pill-btn--pms ${currentTab === 'pms' ? 'is-active' : ''}`}
                  onClick={handleAction('pms')}
                >
                  <BuildingIcon />
                  <span className="avora-header__two-line">
                    <span>Quản lý</span>
                    <span>Khách sạn</span>
                  </span>
                  <span className="avora-header__pms-badge">PMS</span>
                </button>
              )}

              {/* Real Authentication State: User Profile Menu if logged in, else Sign In / Sign Up buttons */}
              {user ? (
                <div className="avora-header__user-menu-wrapper" ref={userMenuRef}>
                  <button
                    type="button"
                    className={`avora-header__user-profile ${isUserMenuOpen ? 'is-active' : ''}`}
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                  >
                    <div className="avora-header__user-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="avora-header__user-name">{displayName}</span>
                    <ChevronDownIcon />
                  </button>

                  {isUserMenuOpen && (
                    <div className="avora-header__user-dropdown">
                      <div className="avora-header__dropdown-user-info">
                        <div className="avora-header__dropdown-avatar">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="avora-header__dropdown-details">
                          <span className="avora-header__dropdown-name">{displayName}</span>
                          <span className="avora-header__dropdown-email">{user.email}</span>
                          {userRoleDisplayName && (
                            <span className="avora-header__dropdown-badge">{userRoleDisplayName}</span>
                          )}
                        </div>
                      </div>

                      <div className="avora-header__dropdown-divider" />

                      <Link
                        to="/myaccount"
                        className="avora-header__dropdown-item"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserIcon />
                        <span>Tài khoản của tôi</span>
                      </Link>

                      <div className="avora-header__dropdown-divider" />

                      <button
                        type="button"
                        className="avora-header__dropdown-item avora-header__dropdown-item--logout"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                          navigate('/signin');
                        }}
                      >
                        <LogoutIcon />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="avora-header__account-wrapper" ref={accountDropdownRef}>
                  <button
                    type="button"
                    className={`avora-header__pill-btn avora-header__account-btn ${isAccountDropdownOpen || currentPath === '/signin' || currentPath === '/signup' ? 'is-active' : ''}`}
                    onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                    aria-expanded={isAccountDropdownOpen}
                    aria-haspopup="true"
                  >
                    <UserIcon />
                    <span className="avora-header__two-line">
                      <span>Tài</span>
                      <span>khoản</span>
                    </span>
                    <span className={`avora-header__chevron-icon ${isAccountDropdownOpen ? 'is-open' : ''}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>

                  {isAccountDropdownOpen && (
                    <div className="avora-header__account-dropdown">
                      <div className="avora-header__account-dropdown-top">
                        <div className="avora-header__account-dropdown-title">
                          Chào mừng bạn đến Avora
                        </div>
                        <div className="avora-header__account-dropdown-subtitle">
                          Đăng nhập để nhận ưu đãi thành viên Genius 15%
                        </div>
                      </div>

                      <div className="avora-header__account-dropdown-divider" />

                      <Link
                        to="/signin"
                        className="avora-header__account-dropdown-item avora-header__account-dropdown-item--login"
                        onClick={() => setIsAccountDropdownOpen(false)}
                      >
                        <LoginArrowIcon />
                        <span>Đăng nhập</span>
                      </Link>

                      <Link
                        to="/signup"
                        className="avora-header__account-dropdown-item"
                        onClick={() => setIsAccountDropdownOpen(false)}
                      >
                        <UserPlusIcon />
                        <span>Đăng ký tài khoản</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Navigation Bar */}
        <div className="avora-header__bottom-row">
          <div className="avora-header__container">
            <nav className="avora-header__nav-list">
              {/* Home / Trang chủ */}
              <Link
                to="/"
                className={`avora-header__nav-item ${currentTab === 'home' ? 'is-active' : ''}`}
                onClick={handleAction('home')}
              >
                <HomeIcon />
                <span>Trang chủ</span>
              </Link>

              {/* Hotels / Khách sạn */}
              <Link
                to="/hotels"
                className={`avora-header__nav-item ${currentTab === 'hotels' ? 'is-active' : ''}`}
                onClick={handleAction('hotels')}
              >
                <BedIcon />
                <span>Khách sạn</span>
              </Link>

              {/* Smart AI Suggestions / Gợi ý AI thông minh */}
              <Link
                to="/"
                className={`avora-header__nav-item avora-header__nav-item--ai ${currentTab === 'ai' ? 'is-active' : ''}`}
                onClick={handleAction('ai')}
              >
                <SparklesIcon />
                <span>Gợi ý AI thông minh</span>
                <span className="avora-header__new-badge">MỚI</span>
              </Link>

              {/* About Us / Về chúng tôi (Opens Modal) */}
              <Link
                to="/"
                className={`avora-header__nav-item ${currentTab === 'about' ? 'is-active' : ''}`}
                onClick={handleAction('about')}
              >
                <BuildingIcon />
                <span>Về chúng tôi</span>
              </Link>

              {/* Contact / Liên hệ */}
              <Link
                to="/"
                className={`avora-header__nav-item ${currentTab === 'contact' ? 'is-active' : ''}`}
                onClick={handleAction('contact')}
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

      {/* Support Fixed Viewport Toast Notification with Rubber Ball Bounce Effect */}
      {showSupportToast && (
        <div className="avora-support-toast">
          <div className="avora-support-toast__icon">
            <HeadsetIcon />
          </div>
          <div className="avora-support-toast__content">
            <div className="avora-support-toast__message">
              Trung tâm hỗ trợ khách hàng Avora 24/7 · Hotline: <strong>1900 8668</strong> (Miễn cước)
            </div>
          </div>
          <button
            type="button"
            className="avora-support-toast__close"
            onClick={() => setShowSupportToast(false)}
            aria-label="Đóng thông báo"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* About Us Popup Modal */}
      {showAboutModal && (
        <div className="avora-modal-backdrop" onClick={() => setShowAboutModal(false)}>
          <div className="avora-about-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header Dark Blue Section */}
            <div className="avora-about-modal__header">
              <button
                type="button"
                className="avora-about-modal__close"
                onClick={() => setShowAboutModal(false)}
                aria-label="Đóng"
              >
                <CloseIcon />
              </button>

              <div className="avora-about-modal__brand">
                <span className="avora-about-modal__logo">Avora</span>
                <span className="avora-about-modal__badge">VIỆT NAM</span>
                <span className="avora-about-modal__badge">VIỆT NAM</span>
              </div>

              <h2 className="avora-about-modal__title">Về Avora - Nền tảng Đặt phòng Khách sạn Việt Nam</h2>
              <p className="avora-about-modal__subtitle">
                Kết nối hàng triệu du khách đến với hơn 10.000 khách sạn đẳng cấp tuyệt đẹp khắp dải đất hình chữ S.
              </p>
            </div>

            {/* Body White Section */}
            <div className="avora-about-modal__body">
              {/* Mission */}
              <div className="avora-about-modal__mission">
                <div className="avora-about-modal__mission-header">
                  <FlagIcon />
                  <h3>Sứ mệnh của chúng tôi</h3>
                </div>
                <p>
                  Avora được xây dựng với mục tiêu mang đến cho người Việt trải nghiệm đặt phòng thuận tiện, minh bạch và tin cậy nhất. Chúng tôi loại bỏ mọi phụ phí ẩn, hiển thị giá phòng trọn gói bao gồm thuế phí và mang đến các tiện ích độc quyền như bữa sáng miễn phí và hủy phòng linh hoạt.
                </p>
              </div>

              {/* 3 Highlight Feature Cards */}
              <div className="avora-about-modal__cards">
                <div className="avora-about-modal__card">
                  <div className="avora-about-modal__card-icon">
                    <ShieldCheckIcon />
                  </div>
                  <h4>10.000+ Chỗ nghỉ</h4>
                  <p>Được kiểm định chất lượng thực tế từ tiêu chuẩn 3 sao đến 5 sao quốc tế.</p>
                </div>

                <div className="avora-about-modal__card">
                  <div className="avora-about-modal__card-icon">
                    <TagIcon />
                  </div>
                  <h4>Genius Member</h4>
                  <p>Giảm ngay 10% - 15% trọn đời khi đặt phòng cùng đặc quyền nâng hạng.</p>
                </div>

                <div className="avora-about-modal__card">
                  <div className="avora-about-modal__card-icon avora-about-modal__card-icon--green">
                    <SupportGreenIcon />
                  </div>
                  <h4>Hỗ trợ 24/7</h4>
                  <p>Đội ngũ chăm sóc khách hàng bản địa túc trực 24/7 qua hotline 1900 8668.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="avora-about-modal__footer">
                <span className="avora-about-modal__address">
                  Trụ sở: Tòa nhà Indochina Riverside, Bạch Đằng, Hải Châu, Đà Nẵng
                </span>
                <button
                  type="button"
                  className="avora-about-modal__close-btn"
                  onClick={() => setShowAboutModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Contact Form Popup Modal */}
      {showContactModal && (

        <div className="avora-modal-backdrop" onClick={() => setShowContactModal(false)}>
          <div className="avora-contact-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header Dark Blue Section */}
            <div className="avora-contact-modal__header">
              <button
                type="button"
                className="avora-contact-modal__close"
                onClick={() => setShowContactModal(false)}
                aria-label="Đóng"
              >
                <CloseIcon />
              </button>

              <div className="avora-contact-modal__tagline">
                <HeadsetIcon />
                <span>HỖ TRỢ 24/7</span>
              </div>

              <h2 className="avora-contact-modal__title">Liên hệ Avora Việt Nam</h2>
              <div className="avora-contact-modal__subtitle">
                Hotline miễn cước: <strong>1900 8668</strong> · Email: <strong>hotro@avora.vn</strong>
              </div>
            </div>

            {/* Form Body White Section */}
            <form className="avora-contact-modal__body" onSubmit={handleContactSubmit}>
              <div className="avora-contact-modal__field">
                <label htmlFor="avora-contact-name">Họ và tên của bạn</label>
                <input
                  id="avora-contact-name"
                  type="text"
                  placeholder="Nhập họ và tên của bạn"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="avora-contact-modal__row">
                <div className="avora-contact-modal__field">
                  <label htmlFor="avora-contact-email">Email</label>
                  <input
                    id="avora-contact-email"
                    type="email"
                    placeholder="email@domain.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="avora-contact-modal__field">
                  <label htmlFor="avora-contact-phone">Số điện thoại</label>
                  <input
                    id="avora-contact-phone"
                    type="tel"
                    placeholder="0912 345 678"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="avora-contact-modal__field">
                <label htmlFor="avora-contact-message">Nội dung cần hỗ trợ</label>
                <textarea
                  id="avora-contact-message"
                  rows="4"
                  placeholder="Bạn cần hỗ trợ về đặt phòng, đổi ngày lưu trú hoặc hợp tác khách sạn..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>

              {/* Footer */}
              <div className="avora-contact-modal__footer">
                <div className="avora-contact-modal__response-time">
                  <ClockIcon />
                  <span>Thời gian phản hồi &lt; 15 phút</span>
                </div>

                <button type="submit" className="avora-contact-modal__submit-btn">
                  <span>Gửi tin nhắn</span>
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;




