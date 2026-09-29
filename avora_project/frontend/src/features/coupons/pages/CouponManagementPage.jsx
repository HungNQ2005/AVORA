import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  updatePromotion,
} from '../../../services/couponApi';
import PromotionFormModal from '../components/CouponFormModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import './CouponManagementPage.css';

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

const getStatusClass = (status) => {
  switch (status) {
    case 'ACTIVE': return 'promo-status--active';
    case 'EXPIRED': return 'promo-status--expired';
    case 'UPCOMING': return 'promo-status--upcoming';
    case 'DELETED': return 'promo-status--deleted';
    default: return '';
  }
};

/* ─── Stat Card ───────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon, accent }) => (
  <div className={`promo-stat-card ${accent ? `promo-stat-card--${accent}` : ''}`}>
    <div className="promo-stat-card__icon">{icon}</div>
    <div className="promo-stat-card__body">
      <span className="promo-stat-card__value">{value}</span>
      <span className="promo-stat-card__label">{label}</span>
      {sub && <span className="promo-stat-card__sub">{sub}</span>}
    </div>
  </div>
);

/* ─── Main Page Component ─────────────────────────────────── */
const PromotionManagementPage = () => {
  const navigate = useNavigate();

  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPromotion, setDeletingPromotion] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | ACTIVE | EXPIRED | UPCOMING
  const [discountTypeFilter, setDiscountTypeFilter] = useState('ALL'); // ALL | PERCENT | FIXED
  const [sortBy, setSortBy] = useState('NEWEST');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    let active = true;

    fetchPromotions()
      .then((res) => {
        if (active) {
          setPromotions(res.coupons || []);
          setStats(res.stats || null);
          setLoading(false);
          setRefreshing(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Không thể tải dữ liệu từ máy chủ.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const cancel = loadData();
    return () => { if (cancel) cancel(); };
  }, [loadData]);

  /* Filter + Sort */
  const filtered = useMemo(() => {
    let result = [...promotions];

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((p) =>
        p.code?.toLowerCase().includes(term) ||
        p.status_label?.toLowerCase().includes(term) ||
        p.discount_type?.toLowerCase().includes(term)
      );
    }

    if (activeFilter !== 'ALL') {
      result = result.filter((p) => p.status === activeFilter);
    }

    if (discountTypeFilter !== 'ALL') {
      result = result.filter((p) => p.discount_type === discountTypeFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'DISCOUNT_DESC') return Number(b.discount_value || 0) - Number(a.discount_value || 0);
      if (sortBy === 'EXPIRY_ASC') return new Date(a.valid_to || 0) - new Date(b.valid_to || 0);
      if (sortBy === 'USAGE_DESC') return (b.usage_count || 0) - (a.usage_count || 0);
      return 0;
    });

    return result;
  }, [promotions, searchTerm, activeFilter, discountTypeFilter, sortBy]);

  /* Counts for filter pills */
  const counts = useMemo(() => ({
    ALL: promotions.length,
    ACTIVE: promotions.filter((p) => p.status === 'ACTIVE').length,
    EXPIRED: promotions.filter((p) => p.status === 'EXPIRED').length,
    UPCOMING: promotions.filter((p) => p.status === 'UPCOMING').length,
  }), [promotions]);

  /* Pagination */
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const handleRowClick = (couponId) => {
    navigate(`/admin/coupons/${couponId}`);
  };

  /* ── Modal Handlers ── */
  const openCreateModal = () => {
    setEditingPromotion(null);
    setFormModalOpen(true);
  };

  const openEditModal = (promotion, e) => {
    e.stopPropagation();
    setEditingPromotion(promotion);
    setFormModalOpen(true);
  };

  const openDeleteModal = (promotion, e) => {
    e.stopPropagation();
    setDeletingPromotion(promotion);
    setDeleteModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.coupon_id, formData);
      } else {
        await createPromotion(formData);
      }
      showToast(editingPromotion ? 'Cập nhật mã khuyến mãi thành công!' : 'Tạo mã khuyến mãi mới thành công!');
      setFormModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deletePromotion(deletingPromotion.coupon_id);
      showToast(`Đã xóa mã khuyến mãi "${deletingPromotion?.code}".`);
      setDeleteModalOpen(false);
      setDeletingPromotion(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="promo-page">
      {toastMessage && <div className="promo-toast">{toastMessage}</div>}

      {/* Breadcrumb */}
      <nav className="promo-breadcrumb">
        <span>Marketing &amp; Doanh thu</span>
        <span className="promo-breadcrumb__sep">&gt;</span>
        <span className="promo-breadcrumb__active">Quản lý mã khuyến mãi</span>
      </nav>

      {/* Header */}
      <div className="promo-page__header">
        <div className="promo-page__title-area">
          <div className="promo-page__title-row">
            <h1 className="promo-page__title">Quản lý mã khuyến mãi</h1>
          </div>
          <p className="promo-page__subtitle">
            Quản lý toàn bộ mã khuyến mãi và ưu đãi trên hệ thống đặt phòng.
          </p>
        </div>

        <div className="promo-page__top-actions">
          <button
            className="promo-btn promo-btn--outline"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            {refreshing ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            className="promo-btn promo-btn--primary"
            onClick={openCreateModal}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Thêm mã mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="promo-alert promo-alert--error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            {error}
          </span>
          <button onClick={() => loadData()} className="promo-alert__retry-btn">Thử lại</button>
        </div>
      )}

      {/* Stats */}
      <div className="promo-stats-grid">
        <StatCard
          label="Tổng mã khuyến mãi"
          value={loading ? '—' : (stats?.total_coupons ?? 0)}
          sub={`${stats?.active_coupons ?? 0} đang hoạt động`}
          accent="blue"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          }
        />
        <StatCard
          label="Đang hoạt động"
          value={loading ? '—' : (stats?.active_coupons ?? 0)}
          sub={`${stats?.upcoming_coupons ?? 0} sắp diễn ra`}
          accent="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          }
        />
        <StatCard
          label="Lượt sử dụng"
          value={loading ? '—' : (stats?.total_usage ?? 0).toLocaleString('vi-VN')}
          sub="Tổng coupon đã dùng"
          accent="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          }
        />
        <StatCard
          label="Tổng ưu đãi đã cấp"
          value={loading ? '—' : formatCurrency(stats?.total_discount_given)}
          sub="Tổng số tiền giảm giá"
          accent="orange"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          }
        />
      </div>

      {/* Filter Bar */}
      <div className="promo-filter-bar">
        <div className="promo-filter-pills">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACTIVE', label: 'Đang hoạt động' },
            { key: 'UPCOMING', label: 'Sắp diễn ra' },
            { key: 'EXPIRED', label: 'Hết hạn' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`promo-filter-pill ${activeFilter === key ? 'promo-filter-pill--active' : ''}`}
              onClick={() => { setActiveFilter(key); setPage(1); }}
            >
              {label}
              <span className="promo-filter-pill__count">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="promo-filter-controls">
          {/* Search */}
          <div className="promo-search-box">
            <svg className="promo-search-box__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              className="promo-search-box__input"
              type="text"
              placeholder="Tìm mã coupon..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          {/* Discount Type */}
          <select
            className="promo-select"
            value={discountTypeFilter}
            onChange={(e) => { setDiscountTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">Loại giảm giá: Tất cả</option>
            <option value="PERCENT">Giảm theo %</option>
            <option value="FIXED">Giảm tiền cố định</option>
          </select>

          {/* Sort */}
          <select
            className="promo-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Mới nhất trước</option>
            <option value="OLDEST">Cũ nhất trước</option>
            <option value="DISCOUNT_DESC">Giá trị giảm cao nhất</option>
            <option value="EXPIRY_ASC">Hết hạn sớm nhất</option>
            <option value="USAGE_DESC">Lượt dùng nhiều nhất</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="promo-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="promo-skeleton__row">
              <div className="promo-skeleton__block promo-skeleton__block--icon"></div>
              <div className="promo-skeleton__block promo-skeleton__block--code"></div>
              <div className="promo-skeleton__block promo-skeleton__block--text"></div>
              <div className="promo-skeleton__block promo-skeleton__block--badge"></div>
              <div className="promo-skeleton__block promo-skeleton__block--text"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="promo-table-wrap">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Mã Coupon</th>
                <th>Loại giảm giá</th>
                <th>Giá trị ưu đãi</th>
                <th>Điều kiện áp dụng</th>
                <th>Thời gian hiệu lực</th>
                <th>Trạng thái</th>
                <th>Lượt dùng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="promo-empty-state">
                      <div className="promo-empty-state__icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                          <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                      </div>
                      <h3 className="promo-empty-state__title">Không tìm thấy mã khuyến mãi</h3>
                      <p className="promo-empty-state__desc">Thử thay đổi bộ lọc hoặc tìm kiếm để kết quả khác</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr
                    key={p.coupon_id}
                    className="promo-table__row"
                    onClick={() => handleRowClick(p.coupon_id)}
                    title="Nhấn để xem chi tiết"
                  >
                    <td>
                      <div className="promo-code-cell">
                        <div className="promo-code-cell__icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                          </svg>
                        </div>
                        <div>
                          <span className="promo-code-cell__code">{p.code}</span>
                          <span className="promo-code-cell__id">ID: {p.coupon_id.substring(0, 8)}…</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`promo-type-badge ${p.discount_type === 'PERCENT' ? 'promo-type-badge--percent' : 'promo-type-badge--fixed'}`}>
                        {p.discount_type === 'PERCENT' ? '% Phần trăm' : 'Tiền cố định'}
                      </span>
                    </td>
                    <td>
                      <span className="promo-discount-val">
                        {p.discount_type === 'PERCENT'
                          ? `${p.discount_value}%`
                          : formatCurrency(p.discount_value)}
                      </span>
                      {p.max_discount_amount && (
                        <span className="promo-discount-cap">
                          tối đa {formatCurrency(p.max_discount_amount)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="promo-min-order">
                        {p.min_order_amount
                          ? `Đơn tối thiểu ${formatCurrency(p.min_order_amount)}`
                          : 'Không giới hạn'}
                      </span>
                    </td>
                    <td>
                      <div className="promo-validity">
                        <span>{formatDate(p.valid_from)}</span>
                        <span className="promo-validity__sep">→</span>
                        <span>{formatDate(p.valid_to)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`promo-status ${getStatusClass(p.status)}`}>
                        <span className="promo-status__dot"></span>
                        {p.status_label}
                      </span>
                    </td>
                    <td>
                      <div className="promo-usage-cell">
                        <span className="promo-usage-cell__count">{p.usage_count || 0}</span>
                        {p.usage_limit && (
                          <>
                            <span className="promo-usage-cell__sep">/</span>
                            <span className="promo-usage-cell__limit">{p.usage_limit}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="promo-action-btns">
                        <button
                          className="promo-action-btn promo-action-btn--view"
                          onClick={(e) => { e.stopPropagation(); handleRowClick(p.coupon_id); }}
                          title="Xem chi tiết"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button
                          className="promo-action-btn promo-action-btn--edit"
                          onClick={(e) => openEditModal(p, e)}
                          title="Chỉnh sửa"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="promo-action-btn promo-action-btn--delete"
                          onClick={(e) => openDeleteModal(p, e)}
                          title="Xóa mã"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer / Pagination */}
      <div className="promo-footer-bar">
        <div className="promo-footer-bar__info">
          <span>Hiển thị {paginated.length} trên {filtered.length} mã khuyến mãi</span>
          <span className="promo-footer-bar__dot">•</span>
          <button
            className="promo-footer-bar__sync-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Đang tải lại...' : 'Đồng bộ dữ liệu'}
          </button>
        </div>

        <div className="promo-pagination">
          <button
            className="promo-pagination__btn"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`promo-pagination__num ${p === page ? 'promo-pagination__num--active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="promo-pagination__btn"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Tiếp
          </button>
        </div>
      </div>

      {/* Modals */}
      <PromotionFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingPromotion}
        loading={formLoading}
      />
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        couponCode={deletingPromotion?.code}
        loading={deleteLoading}
      />
    </div>
  );
};

export default PromotionManagementPage;
