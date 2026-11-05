import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchVendorFlashSales,
  createVendorFlashSale,
  updateVendorFlashSale,
  deleteVendorFlashSale,
} from '../../services/vendorFlashSaleApi';
import FlashSaleModal from './components/FlashSaleModal';
import FlashSaleDeleteModal from './components/FlashSaleDeleteModal';
import FlashSaleDetailModal from './components/FlashSaleDetailModal';
import './VendorFlashSalePage.css';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '0 đ';
  return `${Number(val).toLocaleString('vi-VN')} đ`;
};

const formatDateTime = (iso) => {
  if (!iso) return { time: '—', date: '—', full: '—' };
  const d = new Date(iso);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { time, date, full: `${time} ${date}` };
};

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

const VendorFlashSalePage = () => {
  // Main state
  const [flashSales, setFlashSales] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filters state
  const [selectedHotelId, setSelectedHotelId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | UPCOMING | EXPIRED
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    let active = true;

    fetchVendorFlashSales({
      hotel_id: selectedHotelId,
      status: statusFilter,
      search: searchTerm,
      page: 1,
      limit: 100, // Fetch set for rich client-side sort & filter
    })
      .then((data) => {
        if (!active) return;
        setFlashSales(data.flash_sales || []);
        if (data.hotels && data.hotels.length > 0) {
          setHotels(data.hotels);
        }
        setStats(data.stats || null);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không thể tải danh sách Flash Sale từ máy chủ.');
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [selectedHotelId, statusFilter, searchTerm]);

  useEffect(() => {
    const cancel = loadData();
    return () => {
      if (cancel) cancel();
    };
  }, [loadData]);

  // Client-side filtering & sorting
  const filteredAndSorted = useMemo(() => {
    let list = [...flashSales];

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((item) =>
        item.code?.toLowerCase().includes(term) ||
        item.code_name?.toLowerCase().includes(term) ||
        item.hotel_name?.toLowerCase().includes(term)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'OLDEST') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === 'DISCOUNT_DESC') return Number(b.discount_value || 0) - Number(a.discount_value || 0);
      if (sortBy === 'EXPIRY_ASC') return new Date(a.valid_to || 0) - new Date(b.valid_to || 0);
      if (sortBy === 'USAGE_DESC') return (b.usage_count || 0) - (a.usage_count || 0);
      return 0;
    });

    return list;
  }, [flashSales, statusFilter, searchTerm, sortBy]);

  // Counts for quick tabs
  const tabCounts = useMemo(() => {
    return {
      ALL: flashSales.length,
      ACTIVE: flashSales.filter((f) => f.status === 'ACTIVE').length,
      UPCOMING: flashSales.filter((f) => f.status === 'UPCOMING').length,
      EXPIRED: flashSales.filter((f) => f.status === 'EXPIRED').length,
    };
  }, [flashSales]);

  // Pagination slice
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setIsDetailModalOpen(true);
  };

  const handleModalSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingItem) {
        await updateVendorFlashSale(editingItem.coupon_id, payload);
        showToast('Cập nhật Flash Sale thành công! ⚡');
      } else {
        await createVendorFlashSale(payload);
        showToast('Kích hoạt chương trình Flash Sale mới thành công! ⚡');
      }
      setIsModalOpen(false);
      loadData(true);
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu Flash Sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      await deleteVendorFlashSale(deletingItem.coupon_id);
      showToast('Đã vô hiệu hóa chương trình Flash Sale thành công.');
      setIsDeleteModalOpen(false);
      loadData(true);
    } catch (err) {
      alert(err.message || 'Lỗi khi vô hiệu hóa Flash Sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(code);
    showToast(`Đã sao chép mã "${code}"`);
  };

  return (
    <div className="promo-page vendor-fs-page">
      {/* Toast Notification */}
      {toastMessage && <div className="promo-toast">{toastMessage}</div>}

      {/* Breadcrumb */}
      <nav className="promo-breadcrumb" aria-label="Breadcrumb">
        <span>Marketing &amp; Doanh thu</span>
        <span className="promo-breadcrumb__sep">/</span>
        <span className="promo-breadcrumb__active">Quản lý Flash Sale</span>
      </nav>

      {/* Header */}
      <header className="promo-page__header">
        <div className="promo-page__title-area">
          <div className="promo-page__title-row">
            <h1 className="promo-page__title">Quản lý Flash Sale khách sạn</h1>
            <span className="promo-badge-live">
              <span className="promo-badge-live__dot"></span>
              ⚡ LIVE PROMO
            </span>
          </div>
          <p className="promo-page__subtitle">
            Thiết lập và kiểm soát các chương trình khuyến mãi giờ vàng cho cơ sở lưu trú của bạn.
          </p>
        </div>

        <div className="promo-page__top-actions">
          {/* Multi-hotel dropdown */}
          {hotels.length > 1 && (
            <select
              className="vfs-hotel-select"
              value={selectedHotelId}
              onChange={(e) => {
                setSelectedHotelId(e.target.value);
                setPage(1);
              }}
              title="Lọc theo khách sạn"
            >
              <option value="ALL">Tất cả khách sạn ({hotels.length})</option>
              {hotels.map((h) => (
                <option key={h.hotel_id} value={h.hotel_id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            className="promo-btn promo-btn--outline"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Làm mới dữ liệu"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? 'vfs-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* Create Button */}
          <button
            type="button"
            className="promo-btn promo-btn--primary vfs-btn-create"
            onClick={handleOpenCreate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>+ Tạo Flash Sale mới</span>
          </button>
        </div>
      </header>

      {/* Stat Cards Strip */}
      <section className="promo-stat-grid" aria-label="Thống kê Flash Sale">
        <StatCard
          label="Tổng Flash Sale"
          value={stats?.total ?? flashSales.length}
          sub="Chương trình đã tạo"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          }
        />
        <StatCard
          label="Đang diễn ra ⚡"
          value={stats?.active ?? tabCounts.ACTIVE}
          sub="Trong khung giờ vàng"
          accent="active"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
        />
        <StatCard
          label="Sắp diễn ra"
          value={stats?.upcoming ?? tabCounts.UPCOMING}
          sub="Đã lên lịch trước"
          accent="upcoming"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          }
        />
        <StatCard
          label="Lượt đã đặt"
          value={`${stats?.total_usage ?? 0} lượt`}
          sub="Áp dụng thành công"
          accent="purple"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          }
        />
        <StatCard
          label="Tổng tiền đã ưu đãi"
          value={formatCurrency(stats?.total_discount_given ?? 0)}
          sub="Tiết kiệm cho khách hàng"
          accent="emerald"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          }
        />
      </section>

      {/* Filter Bar & Quick Status Tabs */}
      <section className="promo-filter-bar">
        {/* Status Tabs */}
        <div className="promo-filter-tabs" role="tablist">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACTIVE', label: 'Đang diễn ra ⚡' },
            { key: 'UPCOMING', label: 'Sắp diễn ra' },
            { key: 'EXPIRED', label: 'Đã kết thúc' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              className={`promo-filter-tab ${statusFilter === tab.key ? 'promo-filter-tab--active' : ''}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span className="promo-filter-tab__count">{tabCounts[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="promo-filter-controls">
          <div className="promo-search-wrap">
            <svg
              className="promo-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="promo-search-input"
              placeholder="Tìm theo mã, tên Flash Sale, khách sạn..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="promo-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa"
              >
                ×
              </button>
            )}
          </div>

          <select
            className="promo-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Mới nhất trước</option>
            <option value="OLDEST">Cũ nhất trước</option>
            <option value="DISCOUNT_DESC">Mức giảm cao nhất</option>
            <option value="EXPIRY_ASC">Sắp kết thúc trước</option>
            <option value="USAGE_DESC">Lượt dùng nhiều nhất</option>
          </select>
        </div>
      </section>

      {/* Error Notice */}
      {error && (
        <div className="promo-error-banner" role="alert">
          <span className="promo-error-icon">⚠️</span>
          <span>{error}</span>
          <button type="button" className="promo-btn-retry" onClick={() => loadData(true)}>
            Thử lại
          </button>
        </div>
      )}

      {/* Main Table */}
      <section className="promo-table-container">
        {loading ? (
          <div className="promo-loading-state">
            <span className="rt-spinner-sm"></span>
            <span>Đang tải danh sách Flash Sale...</span>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="promo-empty-state">
            <div className="promo-empty-icon">⚡</div>
            <h3>Chưa có chương trình Flash Sale nào</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL' || selectedHotelId !== 'ALL'
                ? 'Không tìm thấy chương trình nào phù hợp với bộ lọc hiện tại.'
                : 'Khởi tạo ngay chương trình giờ vàng đầu tiên để bùng nổ doanh số phòng!'}
            </p>
            {searchTerm || statusFilter !== 'ALL' ? (
              <button
                type="button"
                className="promo-btn promo-btn--outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setSelectedHotelId('ALL');
                }}
              >
                Đặt lại bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="promo-btn promo-btn--primary"
                onClick={handleOpenCreate}
              >
                + Tạo Flash Sale ngay
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="promo-table vfs-table">
              <thead>
                <tr>
                  <th>Mã Flash Sale</th>
                  <th>Khách sạn</th>
                  <th>Mức giảm</th>
                  <th>Đơn tối thiểu</th>
                  <th>Khung giờ vàng</th>
                  <th>Lượt dùng</th>
                  <th>Trạng thái</th>
                  <th className="vfs-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((item) => {
                  const from = formatDateTime(item.valid_from);
                  const to = formatDateTime(item.valid_to);
                  const isCurrentActive = item.status === 'ACTIVE';

                  return (
                    <tr
                      key={item.coupon_id}
                      className={`vfs-row ${isCurrentActive ? 'vfs-row--active' : ''}`}
                      onClick={() => handleOpenDetail(item)}
                    >
                      {/* Code */}
                      <td>
                        <div className="vfs-code-cell">
                          <span className="vfs-code-tag">
                            <span className="vfs-bolt">⚡</span>
                            <code>{item.code}</code>
                          </span>
                          <button
                            type="button"
                            className="vfs-btn-copy"
                            title="Sao chép mã"
                            onClick={(e) => handleCopyCode(item.code, e)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* Hotel */}
                      <td>
                        <div className="vfs-hotel-cell">
                          <span className="vfs-hotel-name" title={item.hotel_name}>
                            {item.hotel_name || 'Khách sạn của bạn'}
                          </span>
                          <span className="vfs-hotel-prefix">Prefix: {item.hotel_prefix}</span>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td>
                        <div className="vfs-discount-cell">
                          <span className="vfs-discount-val">
                            {item.discount_type === 'FIXED_AMOUNT'
                              ? formatCurrency(item.discount_value)
                              : `${item.discount_value}%`}
                          </span>
                          {item.max_discount_amount && (
                            <span className="vfs-discount-cap">
                              Tối đa: {formatCurrency(item.max_discount_amount)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Min Order */}
                      <td>
                        <span className="vfs-min-order">
                          {item.min_order_amount ? formatCurrency(item.min_order_amount) : 'Không giới hạn'}
                        </span>
                      </td>

                      {/* Golden Hours Window */}
                      <td>
                        <div className="vfs-golden-window">
                          <div className="vfs-golden-time-badge">
                            <span className="vfs-time-from">{from.time}</span>
                            <span className="vfs-time-arrow">→</span>
                            <span className="vfs-time-to">{to.time}</span>
                          </div>
                          <span className="vfs-golden-dates">
                            {from.date} {from.date !== to.date && `- ${to.date}`}
                          </span>
                        </div>
                      </td>

                      {/* Usage */}
                      <td>
                        <div className="vfs-usage-cell">
                          <span className="vfs-usage-numbers">
                            <strong>{item.usage_count || 0}</strong> / {item.usage_limit || '∞'}
                          </span>
                          {item.usage_limit && (
                            <div className="vfs-progress-bar">
                              <div
                                className="vfs-progress-fill"
                                style={{
                                  width: `${Math.min(100, Math.round(((item.usage_count || 0) / item.usage_limit) * 100))}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`promo-status-badge promo-status--${item.status?.toLowerCase()}`}>
                          {item.status === 'ACTIVE' && <span className="vfs-live-dot"></span>}
                          {item.status_label || item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="vfs-actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="vfs-action-btn"
                          title="Xem chi tiết"
                          onClick={() => handleOpenDetail(item)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="vfs-action-btn"
                          title="Chỉnh sửa Flash Sale"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="vfs-action-btn vfs-action-btn--delete"
                          title="Vô hiệu hóa Flash Sale"
                          onClick={() => handleOpenDelete(item)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="promo-pagination">
                <span className="promo-pagination-info">
                  Hiển thị {(page - 1) * pageSize + 1} -{' '}
                  {Math.min(page * pageSize, filteredAndSorted.length)} trên tổng số{' '}
                  {filteredAndSorted.length} Flash Sale
                </span>
                <div className="promo-pagination-buttons">
                  <button
                    type="button"
                    className="promo-btn promo-btn--outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <span className="promo-pagination-current">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="promo-btn promo-btn--outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Create / Edit Modal */}
      <FlashSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingItem}
        hotels={hotels}
        loading={submitting}
      />

      {/* Delete / Deactivate Confirm Modal */}
      <FlashSaleDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        flashSale={deletingItem}
        loading={submitting}
      />

      {/* Detail Modal */}
      <FlashSaleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        flashSale={detailItem}
      />
    </div>
  );
};

export default VendorFlashSalePage;
