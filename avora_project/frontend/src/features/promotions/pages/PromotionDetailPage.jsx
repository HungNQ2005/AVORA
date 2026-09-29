import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchPromotionById } from '../../../services/promotionApi';
import './PromotionDetailPage.css';

/* ─── Helpers ─────────────────────────────────────────────── */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN');
};

const getStatusClass = (status) => {
  switch (status) {
    case 'ACTIVE': return 'pd-status--active';
    case 'EXPIRED': return 'pd-status--expired';
    case 'UPCOMING': return 'pd-status--upcoming';
    case 'DELETED': return 'pd-status--deleted';
    default: return '';
  }
};

const getBookingStatusLabel = (statusCd) => {
  const map = {
    CONFIRMED: 'Đã xác nhận',
    PENDING: 'Chờ xử lý',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Hoàn thành',
    CHECKED_IN: 'Đã nhận phòng',
    CHECKED_OUT: 'Đã trả phòng',
  };
  return map[statusCd] || statusCd || '—';
};

/* ─── Detail Page ─────────────────────────────────────────── */
const PromotionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPromotionById(id);
        if (isMounted) setCoupon(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Không thể tải dữ liệu chi tiết khuyến mãi.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (id) load();
    return () => { isMounted = false; };
  }, [id]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="pd-state-container">
        <div className="pd-spinner"></div>
        <p className="pd-state-text">Đang tải chi tiết mã khuyến mãi...</p>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !coupon) {
    return (
      <div className="pd-state-container pd-state-container--error">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h3 className="pd-state-title">Không thể tải dữ liệu</h3>
        <p className="pd-state-desc">{error || 'Không tìm thấy mã khuyến mãi.'}</p>
        <button className="pd-back-btn" onClick={() => navigate('/admin/promotions')}>
          ← Quay lại danh sách khuyến mãi
        </button>
      </div>
    );
  }

  const bookings = coupon.bookings || [];

  /* ─── Discount display helpers ─── */
  const discountDisplay = coupon.discount_type === 'PERCENT'
    ? `${coupon.discount_value}%`
    : formatCurrency(coupon.discount_value);

  const now = new Date();
  const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
  const validTo = coupon.valid_to ? new Date(coupon.valid_to) : null;
  const daysRemaining = validTo ? Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="pd-page">
      {/* Breadcrumb */}
      <nav className="pd-breadcrumb">
        <Link to="/admin" className="pd-breadcrumb__link">Tổng quan</Link>
        <span className="pd-breadcrumb__sep">/</span>
        <Link to="/admin/promotions" className="pd-breadcrumb__link">Quản lý Khuyến mãi</Link>
        <span className="pd-breadcrumb__sep">/</span>
        <span className="pd-breadcrumb__current">{coupon.code}</span>
      </nav>

      {/* Header */}
      <div className="pd-header">
        <div className="pd-header__left">
          <button
            className="pd-back-nav-btn"
            onClick={() => navigate('/admin/promotions')}
            title="Quay lại danh sách"
          >
            ←
          </button>
          <div>
            <div className="pd-header__title-row">
              <span className="pd-coupon-code-badge">{coupon.code}</span>
              <span className={`pd-status ${getStatusClass(coupon.status)}`}>
                <span className="pd-status__dot"></span>
                {coupon.status_label}
              </span>
              <span className={`pd-type-badge ${coupon.discount_type === 'PERCENT' ? 'pd-type-badge--percent' : 'pd-type-badge--fixed'}`}>
                {coupon.discount_type === 'PERCENT' ? 'Giảm %' : 'Giảm tiền cố định'}
              </span>
            </div>
            <p className="pd-header__subtitle">
              Mã ưu đãi đặt phòng •&nbsp;
              <span>Hiệu lực: {formatDate(coupon.valid_from)} → {formatDate(coupon.valid_to)}</span>
              {daysRemaining !== null && coupon.status === 'ACTIVE' && (
                <span className="pd-days-remaining">
                  &nbsp;({daysRemaining > 0 ? `còn ${daysRemaining} ngày` : 'hết hạn hôm nay'})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="pd-grid">
        {/* LEFT COLUMN */}
        <div className="pd-col pd-col--left">

          {/* Card: Thông tin cơ bản */}
          <section className="pd-card">
            <h2 className="pd-card__title">Thông tin mã ưu đãi</h2>
            <div className="pd-info-grid">
              <div className="pd-info-item">
                <span className="pd-info-label">Mã coupon</span>
                <span className="pd-info-val pd-info-val--code">{coupon.code}</span>
              </div>
              <div className="pd-info-item">
                <span className="pd-info-label">Loại giảm giá</span>
                <span className="pd-info-val">
                  {coupon.discount_type === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định (VNĐ)'}
                </span>
              </div>
              <div className="pd-info-item">
                <span className="pd-info-label">Giá trị ưu đãi</span>
                <span className="pd-info-val pd-info-val--discount">{discountDisplay}</span>
                <span className="pd-info-sub">Giảm trực tiếp trên đơn hàng</span>
              </div>
              {coupon.max_discount_amount && (
                <div className="pd-info-item">
                  <span className="pd-info-label">Giảm tối đa</span>
                  <span className="pd-info-val">{formatCurrency(coupon.max_discount_amount)}</span>
                  <span className="pd-info-sub">Mức trần giảm giá</span>
                </div>
              )}
              <div className="pd-info-item">
                <span className="pd-info-label">Đơn hàng tối thiểu</span>
                <span className="pd-info-val">
                  {coupon.min_order_amount ? formatCurrency(coupon.min_order_amount) : 'Không giới hạn'}
                </span>
              </div>
              <div className="pd-info-item">
                <span className="pd-info-label">Giới hạn sử dụng</span>
                <span className="pd-info-val">
                  {coupon.usage_limit ? `${coupon.usage_limit} lượt` : 'Không giới hạn'}
                </span>
              </div>
            </div>
          </section>

          {/* Card: Thời gian hiệu lực */}
          <section className="pd-card">
            <h2 className="pd-card__title">Thời gian áp dụng &amp; Hiệu lực</h2>
            <div className="pd-validity-block">
              <div className="pd-validity-item">
                <div className="pd-validity-item__icon pd-validity-item__icon--start">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <span className="pd-validity-label">Ngày bắt đầu</span>
                  <span className="pd-validity-date">{formatDate(coupon.valid_from)}</span>
                  <span className="pd-validity-time">{coupon.valid_from ? new Date(coupon.valid_from).toLocaleTimeString('vi-VN') : ''}</span>
                </div>
              </div>

              <div className="pd-validity-arrow">→</div>

              <div className="pd-validity-item">
                <div className="pd-validity-item__icon pd-validity-item__icon--end">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div>
                  <span className="pd-validity-label">Ngày kết thúc</span>
                  <span className="pd-validity-date">{formatDate(coupon.valid_to)}</span>
                  <span className="pd-validity-time">{coupon.valid_to ? new Date(coupon.valid_to).toLocaleTimeString('vi-VN') : ''}</span>
                </div>
              </div>
            </div>

            {coupon.status === 'ACTIVE' && daysRemaining !== null && (
              <div className="pd-validity-progress">
                <div className="pd-validity-progress__bar">
                  {validFrom && validTo && (
                    <div
                      className="pd-validity-progress__fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((now - validFrom) / (validTo - validFrom)) * 100))}%`
                      }}
                    ></div>
                  )}
                </div>
                <span className="pd-validity-progress__label">
                  {daysRemaining > 0
                    ? `Còn ${daysRemaining} ngày hiệu lực`
                    : 'Hết hạn hôm nay'}
                </span>
              </div>
            )}
          </section>

          {/* Card: Thống kê sử dụng */}
          <section className="pd-card">
            <h2 className="pd-card__title">Thống kê sử dụng</h2>
            <div className="pd-stats-row">
              <div className="pd-stat-item">
                <span className="pd-stat-item__value">{coupon.usage_count || 0}</span>
                <span className="pd-stat-item__label">Lượt sử dụng</span>
              </div>
              <div className="pd-stat-divider"></div>
              <div className="pd-stat-item">
                <span className="pd-stat-item__value pd-stat-item__value--money">
                  {formatCurrency(coupon.total_discount_given)}
                </span>
                <span className="pd-stat-item__label">Tổng tiền đã giảm</span>
              </div>
              <div className="pd-stat-divider"></div>
              <div className="pd-stat-item">
                <span className="pd-stat-item__value">
                  {coupon.usage_limit
                    ? `${coupon.usage_rate ?? 0}%`
                    : '∞'}
                </span>
                <span className="pd-stat-item__label">Tỉ lệ sử dụng</span>
              </div>
            </div>
            {coupon.usage_limit && (
              <div className="pd-usage-bar-wrap">
                <div className="pd-usage-bar">
                  <div
                    className="pd-usage-bar__fill"
                    style={{ width: `${Math.min(100, coupon.usage_rate ?? 0)}%` }}
                  ></div>
                </div>
                <span className="pd-usage-bar__label">
                  {coupon.usage_count || 0} / {coupon.usage_limit} lượt
                </span>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="pd-col pd-col--right">

          {/* Card: Lịch sử đặt phòng dùng coupon */}
          <section className="pd-card">
            <div className="pd-card__header-flex">
              <h2 className="pd-card__title">Lịch sử đặt phòng sử dụng mã</h2>
              <span className="pd-tag-count">{bookings.length} booking</span>
            </div>

            {bookings.length > 0 ? (
              <div className="pd-bookings-table-wrap">
                <table className="pd-subtable">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Tổng đơn</th>
                      <th>Giảm giá</th>
                      <th>Trạng thái</th>
                      <th>Ngày đặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.booking_id}>
                        <td>
                          <div className="pd-guest-cell">
                            <span className="pd-guest-name">{b.guest_name || '—'}</span>
                            <span className="pd-guest-phone">{b.guest_phone || ''}</span>
                          </div>
                        </td>
                        <td className="pd-amount-cell">{formatCurrency(b.total_amount)}</td>
                        <td className="pd-discount-cell">
                          <span className="pd-discount-given">-{formatCurrency(b.discount_amount)}</span>
                        </td>
                        <td>
                          <span className={`pd-booking-status pd-booking-status--${(b.booking_status_cd || '').toLowerCase()}`}>
                            {getBookingStatusLabel(b.booking_status_cd)}
                          </span>
                        </td>
                        <td className="pd-date-cell">
                          {new Date(b.created_at).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pd-empty-text">
                Chưa có đơn đặt phòng nào sử dụng mã coupon này.
              </div>
            )}
          </section>

          {/* Card: Thông tin hệ thống */}
          <section className="pd-card pd-card--muted">
            <h2 className="pd-card__title">Thông tin hệ thống &amp; Kiểm toán</h2>
            <div className="pd-audit-list">
              <div className="pd-audit-item">
                <span className="pd-audit-label">Mã định danh (ID):</span>
                <span className="pd-audit-val pd-audit-val--mono">{coupon.coupon_id}</span>
              </div>
              <div className="pd-audit-item">
                <span className="pd-audit-label">Ngày khởi tạo:</span>
                <span className="pd-audit-val">{formatDateTime(coupon.created_at)}</span>
              </div>
              <div className="pd-audit-item">
                <span className="pd-audit-label">Cập nhật lần cuối:</span>
                <span className="pd-audit-val">{formatDateTime(coupon.updated_at)}</span>
              </div>
              <div className="pd-audit-item">
                <span className="pd-audit-label">Trạng thái dữ liệu:</span>
                <span className="pd-audit-val">
                  {coupon.is_deleted ? '⚠️ Đã vô hiệu hóa' : '✅ Hoạt động bình thường'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetailPage;
