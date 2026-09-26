import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile, changePassword, deactivateAccount, getProfile } from '../../../services/authService';
import Dialog from '../../../common/components/Dialog';
import { codeNameParser } from '../../../utils/codeNameParser';
import './MyAccountPage.css';

/**
 * Icons used throughout the Profile page matching the reference design.
 */
const ShieldCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const HeartIcon = ({ filled = false }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const SecurityShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LuggageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const HeadsetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
    <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.6 5.8 21l2.3-7.1L2 9.4h7.6z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/**
 * Redesigned User Profile Page
 * 100% Database as Source of Truth
 * Missing user field -> "Chưa điền thông tin"
 * Missing database information -> "Chưa có"
 */
const MyAccountPage = () => {
  const navigate = useNavigate();
  const { user, setUser, logout, loading } = useAuth();

  // Active navigation tab: 'info' | 'favorites' | 'security'
  const [activeTab, setActiveTab] = useState('info');

  // Edit mode state for profile info
  const [isEditing, setIsEditing] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password form state
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  // Dialog states
  const [deactivateDialog, setDeactivateDialog] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState(false);

  // Saved accommodations list (backed strictly by real database or user state)
  const [savedAccommodations, setSavedAccommodations] = useState(() => {
    // If the database user object has saved items or favorites
    if (Array.isArray(user?.saved_hotels) && user.saved_hotels.length > 0) {
      return user.saved_hotels;
    }
    // Check if user has stored favorites locally as fallback cache
    try {
      const stored = localStorage.getItem('avora_user_favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        phone: user.phone || '',
      });
      if (Array.isArray(user.saved_hotels)) {
        setSavedAccommodations(user.saved_hotels);
      }
    }
  }, [user]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!loading && (!localStorage.getItem('avora_token') || !user)) {
      navigate('/signin');
    }
  }, [loading, user, navigate]);

  /* ── Form Change Handlers ────────────────────────────────────────── */
  const handleProfileChange = (e) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setProfileMsg({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setProfile({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    });
    setProfileMsg({ type: '', text: '' });
    setIsEditing(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await updateProfile({ full_name: profile.full_name, phone: profile.phone });
      // Fetch latest profile from database to ensure fresh state
      const freshRes = await getProfile();
      if (freshRes?.data) {
        setUser(freshRes.data);
      }
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setIsEditing(false);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.' });
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── Password Change ─────────────────────────────────────────────── */
  const handlePassChange = (e) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPassMsg({ type: '', text: '' });
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (!passwords.current_password) {
      setPassMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPassMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (passwords.new_password.length < 8) {
      setPassMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
      return;
    }

    setPassLoading(true);
    setPassMsg({ type: '', text: '' });
    try {
      await changePassword(passwords.current_password, passwords.new_password);
      setPassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.' });
    } finally {
      setPassLoading(false);
    }
  };

  /* ── Account Deactivation ────────────────────────────────────────── */
  const handleDeactivateConfirm = async () => {
    setDeactivateLoading(true);
    try {
      await deactivateAccount();
      logout();
      navigate('/signin');
    } catch {
      setDeactivateDialog(false);
      setDeactivateLoading(false);
    }
  };

  /* ── Remove Saved Accommodation ─────────────────────────────────── */
  const handleRemoveSaved = (hotelId, e) => {
    e.stopPropagation();
    const updated = savedAccommodations.filter((item) => (item.hotel_id || item.id) !== hotelId);
    setSavedAccommodations(updated);
    try {
      localStorage.setItem('avora_user_favorites', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  /* ── Helpers for Source of Truth Formatting ──────────────────────── */
  // Display name from database
  const displayName = user?.full_name?.trim() ? user.full_name : 'Chưa điền thông tin';

  // Initials for avatar
  const avatarInitials = (user?.full_name?.trim() || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'U';

  // Role display name
  const roleDisplayName = codeNameParser(user?.role_code_name);

  // Phone formatted
  const formatPhone = (val) => {
    if (!val || !val.trim()) return 'Chưa điền thông tin';
    const clean = val.trim();
    if (clean.startsWith('0')) {
      return `+84 ${clean.slice(1)}`;
    }
    return clean;
  };

  // 4 Stat Cards real values or fallback to "Chưa có"
  const cashBalanceDisplay =
    user?.cash_balance !== undefined && user?.cash_balance !== null && user?.cash_balance !== ''
      ? `${Number(user.cash_balance).toLocaleString('vi-VN')} đ`
      : 'Chưa có';

  const rewardPointsDisplay =
    user?.reward_points !== undefined && user?.reward_points !== null && user?.reward_points !== ''
      ? `${Number(user.reward_points).toLocaleString('vi-VN')} điểm`
      : 'Chưa có';

  const savedAccommodationsCountDisplay =
    savedAccommodations.length > 0 ? `${savedAccommodations.length} địa điểm` : 'Chưa có';

  const geniusLevelDisplay = user?.genius_level
    ? `Cấp ${user.genius_level} (Giảm ${user.genius_discount || '15%'})`
    : 'Chưa có';

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-container">
          <div className="profile-spinner" />
          <p>Đang tải thông tin tài khoản từ hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* ─── 1. TOP BREADCRUMBS & STATUS BAR ─── */}
        <div className="profile-topbar">
          <nav className="profile-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Trang chủ</Link>
            <span className="breadcrumb-separator">&gt;</span>
            <span className="breadcrumb-link" onClick={() => setActiveTab('info')}>Tài khoản của tôi</span>
            <span className="breadcrumb-separator">&gt;</span>
            <span className="breadcrumb-current">Quản lý hồ sơ</span>
          </nav>

          <div className="profile-topbar__status">
            <ShieldCheckIcon />
            <span>
              {user?.account_status === 'ACTIVE'
                ? 'Tài khoản thành viên chính thức'
                : (user?.account_status || 'Chưa có')}
            </span>
          </div>
        </div>

        {/* ─── 2. HERO PROFILE HEADER CARD ─── */}
        <header className="profile-hero-card">
          <div className="profile-hero-card__left">
            <div className="profile-hero-avatar" aria-label="User Avatar">
              {avatarInitials}
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-title-row">
                <h1 className="profile-hero-name">{displayName}</h1>

                {user?.genius_level ? (
                  <span className="profile-badge profile-badge--genius">
                    <span className="badge-icon">🏆</span> GENIUS CẤP {user.genius_level}
                  </span>
                ) : roleDisplayName ? (
                  <span className="profile-badge profile-badge--role">
                    {roleDisplayName.toUpperCase()}
                  </span>
                ) : (
                  <span className="profile-badge profile-badge--role">Chưa có</span>
                )}
              </div>

              <div className="profile-hero-meta">
                <div className="profile-meta-item">
                  <MailIcon />
                  <span>{user?.email || 'Chưa điền thông tin'}</span>
                </div>

                <div className="profile-meta-item">
                  <PhoneIcon />
                  <span>{formatPhone(user?.phone)}</span>
                </div>

                <div className="profile-meta-item">
                  <MapPinIcon />
                  <span>
                    {user?.city?.trim() || user?.province?.trim() || user?.address?.trim() || 'Chưa điền thông tin'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-hero-card__actions">
            <button
              type="button"
              className="hero-action-btn hero-action-btn--primary"
              onClick={() => navigate('/hotels')}
            >
              <LuggageIcon />
              <span>Đặt chỗ của tôi</span>
            </button>

            <button
              type="button"
              className="hero-action-btn hero-action-btn--outline"
              onClick={() => setActiveTab('favorites')}
            >
              <HeartIcon />
              <span>Chỗ nghỉ đã lưu ({savedAccommodations.length})</span>
            </button>

            <button
              type="button"
              className="hero-action-btn hero-action-btn--danger-outline"
              onClick={() => setLogoutDialog(true)}
            >
              <LogoutIcon />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* ─── 3. 4 STAT CARDS ROW ─── */}
        <section className="profile-stats-grid" aria-label="Thống kê nhanh">
          <div className="stat-card stat-card--blue">
            <div className="stat-card__label">Ví Avora Cash</div>
            <div className="stat-card__value">{cashBalanceDisplay}</div>
          </div>

          <div className="stat-card stat-card--green">
            <div className="stat-card__label">Điểm thưởng</div>
            <div className="stat-card__value">{rewardPointsDisplay}</div>
          </div>

          <div className="stat-card stat-card--pink" onClick={() => setActiveTab('favorites')}>
            <div className="stat-card__label-row">
              <span className="stat-card__label">Chỗ nghỉ đã lưu</span>
              <span className="stat-card__icon"><HeartIcon filled={savedAccommodations.length > 0} /></span>
            </div>
            <div className="stat-card__value">{savedAccommodationsCountDisplay}</div>
          </div>

          <div className="stat-card stat-card--amber">
            <div className="stat-card__label">Cấp độ Genius</div>
            <div className="stat-card__value">{geniusLevelDisplay}</div>
          </div>
        </section>

        {/* ─── 4. MAIN TWO-COLUMN CONTENT AREA ─── */}
        <div className="profile-layout-grid">
          {/* ─── Left Sidebar Navigation ─── */}
          <aside className="profile-sidebar">
            <div className="profile-sidebar__heading">DANH MỤC HỒ SƠ</div>

            <nav className="profile-nav-menu" aria-label="Menu hồ sơ">
              <button
                type="button"
                className={`profile-nav-item ${activeTab === 'info' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                <div className="profile-nav-item__left">
                  <UserIcon />
                  <span>Thông tin cá nhân</span>
                </div>
                <ChevronRightIcon />
              </button>

              <button
                type="button"
                className={`profile-nav-item ${activeTab === 'favorites' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <div className="profile-nav-item__left">
                  <HeartIcon />
                  <span>Chỗ nghỉ đã lưu</span>
                </div>
                <span className="profile-nav-badge">{savedAccommodations.length}</span>
              </button>

              <button
                type="button"
                className={`profile-nav-item ${activeTab === 'security' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <div className="profile-nav-item__left">
                  <SecurityShieldIcon />
                  <span>Bảo mật tài khoản</span>
                </div>
                <span className="profile-nav-status-icon"><CheckCircleIcon /></span>
              </button>
            </nav>

            {/* Customer Care Box */}
            <div className="profile-support-card">
              <div className="profile-support-card__header">
                <HeadsetIcon />
                <h4>Hỗ trợ khách hàng Avora</h4>
              </div>
              <p>
                Cần trợ giúp với hồ sơ hoặc chuyến đi? Gọi tổng đài miễn phí <strong>1800 6868</strong> (24/7).
              </p>
            </div>
          </aside>

          {/* ─── Right Content Area ─── */}
          <main className="profile-content-area">
            {/* ════ TAB 1: THÔNG TIN CÁ NHÂN ════ */}
            {activeTab === 'info' && (
              <div className="profile-card profile-info-card">
                <div className="profile-card__header">
                  <div>
                    <h2 className="profile-card__title">Thông tin cá nhân</h2>
                    <p className="profile-card__subtitle">
                      Quản lý họ tên, số điện thoại và địa chỉ của bạn để trải nghiệm đặt phòng thuận tiện hơn.
                    </p>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      className="profile-edit-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      <EditIcon />
                      <span>Chỉnh sửa thông tin</span>
                    </button>
                  ) : (
                    <div className="profile-edit-actions-top">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancelEdit}
                        disabled={profileLoading}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        className="btn-save"
                        onClick={handleProfileSubmit}
                        disabled={profileLoading}
                      >
                        {profileLoading ? <span className="btn-spinner" /> : 'Lưu thay đổi'}
                      </button>
                    </div>
                  )}
                </div>

                {profileMsg.text && (
                  <div
                    className={`profile-alert profile-alert--${profileMsg.type}`}
                    role={profileMsg.type === 'error' ? 'alert' : 'status'}
                  >
                    {profileMsg.text}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="profile-form">
                  {/* Row 1: Full Name */}
                  <div className="profile-field-group">
                    <div className="profile-field-label-row">
                      <label htmlFor="field-fullname" className="profile-field-label">
                        Họ và tên đầy đủ <span className="required-star">*</span>
                      </label>
                      <span className="profile-field-tag profile-field-tag--editable">Có thể chỉnh sửa</span>
                    </div>

                    {isEditing ? (
                      <input
                        id="field-fullname"
                        name="full_name"
                        type="text"
                        className="profile-input profile-input--editing"
                        placeholder="Nhập họ và tên đầy đủ"
                        value={profile.full_name}
                        onChange={handleProfileChange}
                        autoFocus
                      />
                    ) : (
                      <div className="profile-input profile-input--readonly">
                        {user?.full_name?.trim() ? user.full_name : 'Chưa điền thông tin'}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Ngày sinh, Giới tính, Quốc tịch (3 columns) */}
                  <div className="profile-form-grid profile-form-grid--3">
                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Ngày sinh</label>
                        <span className="profile-field-tag"><LockIcon /> Chỉ đọc</span>
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.birthday || user?.dob || 'Chưa điền thông tin'}
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Giới tính</label>
                        <span className="profile-field-tag"><LockIcon /> Chỉ đọc</span>
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.gender || 'Chưa điền thông tin'}
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Quốc tịch</label>
                        <span className="profile-field-tag"><LockIcon /> Chỉ đọc</span>
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.nationality || 'Chưa điền thông tin'}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Email, Số điện thoại (2 columns) */}
                  <div className="profile-form-grid profile-form-grid--2">
                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Địa chỉ Email</label>
                        {user?.account_status === 'ACTIVE' || user?.is_email_verified ? (
                          <span className="status-verify-badge status-verify-badge--verified">
                            <CheckCircleIcon /> Đã xác minh
                          </span>
                        ) : (
                          <span className="status-verify-badge">Chưa xác minh</span>
                        )}
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.email || 'Chưa điền thông tin'}
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label htmlFor="field-phone" className="profile-field-label">
                          Số điện thoại liên lạc
                        </label>
                        {user?.phone ? (
                          <span className="status-verify-badge status-verify-badge--verified">
                            <CheckCircleIcon /> Đã xác thực OTP
                          </span>
                        ) : (
                          <span className="status-verify-badge">Chưa có</span>
                        )}
                      </div>

                      {isEditing ? (
                        <input
                          id="field-phone"
                          name="phone"
                          type="tel"
                          className="profile-input profile-input--editing"
                          placeholder="+84 0905 123 456"
                          value={profile.phone}
                          onChange={handleProfileChange}
                        />
                      ) : (
                        <div className="profile-input profile-input--readonly">
                          {user?.phone ? formatPhone(user.phone) : 'Chưa điền thông tin'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Địa chỉ thường trú, Tỉnh / Thành phố (2 columns) */}
                  <div className="profile-form-grid profile-form-grid--2">
                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Địa chỉ thường trú</label>
                        <span className="profile-field-tag"><LockIcon /> Chỉ đọc</span>
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.address?.trim() ? user.address : 'Chưa điền thông tin'}
                      </div>
                    </div>

                    <div className="profile-field-group">
                      <div className="profile-field-label-row">
                        <label className="profile-field-label">Tỉnh / Thành phố</label>
                        <span className="profile-field-tag"><LockIcon /> Chỉ đọc</span>
                      </div>
                      <div className="profile-input profile-input--readonly">
                        {user?.city?.trim() || user?.province?.trim() || 'Chưa điền thông tin'}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="profile-form-actions-bottom">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancelEdit}
                        disabled={profileLoading}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="btn-save"
                        disabled={profileLoading}
                      >
                        {profileLoading ? <span className="btn-spinner" /> : 'Lưu thay đổi'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ════ TAB 2: CHỖ NGHỈ ĐÃ LƯU ════ */}
            {activeTab === 'favorites' && (
              <div className="profile-card profile-favorites-card">
                <div className="profile-card__header">
                  <div>
                    <div className="profile-card__title-row">
                      <h2 className="profile-card__title">Chỗ nghỉ đã lưu</h2>
                      <span className="saved-count-pill">{savedAccommodations.length} chỗ nghỉ</span>
                    </div>
                    <p className="profile-card__subtitle">
                      Các khách sạn và khu nghỉ dưỡng bạn đã lưu lại để chuẩn bị cho kỳ nghỉ tiếp theo.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="profile-search-more-btn"
                    onClick={() => navigate('/hotels')}
                  >
                    <SearchIcon />
                    <span>Tìm thêm chỗ nghỉ</span>
                  </button>
                </div>

                {savedAccommodations.length > 0 ? (
                  <div className="saved-accommodations-list">
                    {savedAccommodations.map((hotel, idx) => {
                      const hotelId = hotel.hotel_id || hotel.id || idx;
                      const hotelName = hotel.hotel_name || hotel.name || 'Khách sạn Avora';
                      const city = hotel.city_name || hotel.city || 'Đà Nẵng';
                      const address = hotel.address || 'Địa chỉ khách sạn';
                      const score = hotel.review_score || hotel.rating || '9.4';
                      const reviewCount = hotel.review_count || '1.842';
                      const price = hotel.min_price || hotel.price || 2350000;
                      const img = hotel.thumbnail || hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';

                      return (
                        <article key={hotelId} className="saved-hotel-card">
                          <div className="saved-hotel-card__image-box">
                            <img src={img} alt={hotelName} loading="lazy" />
                            <span className="saved-hotel-card__city-badge">{city}</span>
                          </div>

                          <div className="saved-hotel-card__content">
                            <div className="saved-hotel-card__top">
                              <div className="saved-hotel-card__stars">
                                <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                              </div>
                              <button
                                type="button"
                                className="saved-hotel-card__remove-btn"
                                onClick={(e) => handleRemoveSaved(hotelId, e)}
                                title="Xóa khỏi danh sách lưu"
                                aria-label="Xóa khỏi danh sách lưu"
                              >
                                <TrashIcon />
                              </button>
                            </div>

                            <h3 className="saved-hotel-card__name">{hotelName}</h3>

                            <div className="saved-hotel-card__address">
                              <MapPinIcon />
                              <span>{address}</span>
                            </div>

                            <div className="saved-hotel-card__rating">
                              <span className="rating-badge">{score}</span>
                              <span className="rating-text">
                                {score >= 9 ? 'Tuyệt hảo' : 'Tuyệt vời'} • {reviewCount} đánh giá
                              </span>
                            </div>

                            <div className="saved-hotel-card__bottom">
                              <div className="saved-hotel-card__price-box">
                                <span className="price-label">Giá mỗi đêm từ</span>
                                <div className="price-amount">
                                  {Number(price).toLocaleString('vi-VN')} đ
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn-view-hotel"
                                onClick={() => navigate(`/hotels/${hotelId}`)}
                              >
                                <span>Xem chỗ nghỉ</span>
                                <ChevronRightIcon />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="saved-empty-state">
                    <div className="saved-empty-state__icon">
                      <HeartIcon />
                    </div>
                    <div className="saved-empty-state__title">Chưa có</div>
                    <p className="saved-empty-state__desc">
                      Bạn chưa có chỗ nghỉ nào được lưu trong tài khoản. Hãy khám phá và lưu lại những điểm lưu trú yêu thích!
                    </p>
                    <button
                      type="button"
                      className="hero-action-btn hero-action-btn--primary"
                      onClick={() => navigate('/hotels')}
                    >
                      <SearchIcon />
                      <span>Khám phá chỗ nghỉ ngay</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════ TAB 3: BẢO MẬT TÀI KHOẢN ════ */}
            {activeTab === 'security' && (
              <div className="profile-security-stack">
                {/* 1. 2FA Banner */}
                <div className="profile-card profile-2fa-card">
                  <div className="profile-2fa-card__left">
                    <div className="profile-2fa-icon">
                      <SecurityShieldIcon />
                    </div>
                    <div>
                      <h3 className="profile-2fa-title">Xác thực 2 bước (2FA qua SMS)</h3>
                      <p className="profile-2fa-subtitle">
                        Gửi mã xác thực OTP qua số điện thoại ({user?.phone ? formatPhone(user.phone) : 'Chưa điền thông tin'}) mỗi khi đăng nhập trên thiết bị lạ hoặc thanh toán đơn hàng giá trị cao.
                      </p>
                    </div>
                  </div>

                  <div className="profile-2fa-card__right">
                    {user?.two_factor_enabled ? (
                      <span className="twofa-status-pill twofa-status-pill--active">
                        ✓ Đang kích hoạt
                      </span>
                    ) : (
                      <span className="twofa-status-pill twofa-status-pill--unavailable">
                        Chưa có
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Change Password Card */}
                <div className="profile-card profile-password-card">
                  <div className="profile-card__header">
                    <div>
                      <h2 className="profile-card__title">Đổi mật khẩu tài khoản</h2>
                      <p className="profile-card__subtitle">
                        Để bảo mật tối ưu, mật khẩu cần có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường và số.
                      </p>
                    </div>
                  </div>

                  {passMsg.text && (
                    <div
                      className={`profile-alert profile-alert--${passMsg.type}`}
                      role={passMsg.type === 'error' ? 'alert' : 'status'}
                    >
                      {passMsg.text}
                    </div>
                  )}

                  <form onSubmit={handlePassSubmit} className="profile-form">
                    <div className="profile-field-group">
                      <label htmlFor="field-curr-pass" className="profile-field-label">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        id="field-curr-pass"
                        name="current_password"
                        type="password"
                        className="profile-input profile-input--editing"
                        placeholder="Nhập mật khẩu hiện tại"
                        value={passwords.current_password}
                        onChange={handlePassChange}
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label htmlFor="field-new-pass" className="profile-field-label">
                        Mật khẩu mới
                      </label>
                      <input
                        id="field-new-pass"
                        name="new_password"
                        type="password"
                        className="profile-input profile-input--editing"
                        placeholder="Tối thiểu 8 ký tự"
                        value={passwords.new_password}
                        onChange={handlePassChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="profile-field-group">
                      <label htmlFor="field-confirm-pass" className="profile-field-label">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        id="field-confirm-pass"
                        name="confirm_password"
                        type="password"
                        className="profile-input profile-input--editing"
                        placeholder="Nhập lại mật khẩu mới"
                        value={passwords.confirm_password}
                        onChange={handlePassChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="profile-form-actions-left">
                      <button
                        type="submit"
                        className="btn-update-password"
                        disabled={passLoading}
                      >
                        {passLoading ? <span className="btn-spinner" /> : 'Cập nhật mật khẩu'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. Account Deactivation Card */}
                <div className="profile-card profile-danger-card">
                  <div className="profile-card__header">
                    <div>
                      <h3 className="profile-danger-title">Vô hiệu hóa tài khoản</h3>
                      <p className="profile-danger-subtitle">
                        Hành động này sẽ tạm dừng tài khoản của bạn và đăng xuất ngay lập tức. Bạn cần liên hệ quản trị viên để khôi phục quyền truy cập.
                      </p>
                    </div>
                  </div>

                  <div className="profile-danger-action">
                    <button
                      type="button"
                      className="btn-deactivate"
                      onClick={() => setDeactivateDialog(true)}
                    >
                      Yêu cầu vô hiệu hóa tài khoản
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Confirmation Dialog for Deactivation */}
      <Dialog
        isOpen={deactivateDialog}
        onClose={() => setDeactivateDialog(false)}
        onConfirm={handleDeactivateConfirm}
        title="Vô hiệu hóa tài khoản?"
        message="Hành động này sẽ đăng xuất bạn ngay lập tức và tạm khóa tài khoản. Bạn sẽ cần liên hệ Quản trị viên để mở khóa lại. Bạn có chắc chắn muốn tiếp tục?"
        variant="confirm"
        confirmLabel={deactivateLoading ? 'Đang xử lý...' : 'Xác nhận vô hiệu hóa'}
        cancelLabel="Hủy"
      />

      {/* Confirmation Dialog for Logout */}
      <Dialog
        isOpen={logoutDialog}
        onClose={() => setLogoutDialog(false)}
        onConfirm={() => {
          setLogoutDialog(false);
          logout();
          navigate('/signin');
        }}
        title="Đăng xuất tài khoản?"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản AVORA của mình không?"
        variant="warning"
        confirmLabel="Đăng xuất"
        cancelLabel="Ở lại"
      />
    </div>
  );
};

export default MyAccountPage;
