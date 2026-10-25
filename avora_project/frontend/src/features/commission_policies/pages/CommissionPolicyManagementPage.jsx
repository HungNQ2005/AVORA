import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCommissionPolicies,
  fetchCommissionPolicyHotels,
  createCommissionPolicy,
  updateCommissionPolicy,
  deleteCommissionPolicy,
} from '../../../services/commissionPolicyApi';
import CommissionPolicyFormModal from '../components/CommissionPolicyFormModal';
import CommissionPolicyDeleteModal from '../components/CommissionPolicyDeleteModal';
import { exportCommissionPoliciesToExcel } from '../../../utils/exportToExcel';
import {
  DownloadIcon,
  RefreshCwIcon,
  PlusIcon,
  CreditCardIcon,
  CheckCircleIcon,
  InfoIcon,
  BuildingIcon,
  SearchIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
} from '../../../common/components/icons';
import './CommissionPolicyManagementPage.css';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/* ─── Main Component ─────────────────────────────────────────────────── */
const CommissionPolicyManagementPage = () => {
  const navigate = useNavigate();

  // Data states
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters & Search & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | UPCOMING | EXPIRED
  const [scopeFilter, setScopeFilter] = useState('ALL'); // ALL | SYSTEM | STAR | HOTEL
  const [sortBy, setSortBy] = useState('PRIORITY_DESC');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch hotels for dropdowns
  useEffect(() => {
    fetchCommissionPolicyHotels()
      .then((data) => setHotels(data || []))
      .catch((err) => console.error('Lỗi khi tải danh sách khách sạn:', err));
  }, []);

  // Fetch commission policies
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetchCommissionPolicies();
      setPolicies(res.policies || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Lỗi khi tải chính sách hoa hồng:', err);
      setError(err.message || 'Không thể tải dữ liệu chính sách phí hoa hồng từ hệ thống.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: policies.length,
      ACTIVE: policies.filter((p) => p.status === 'ACTIVE').length,
      UPCOMING: policies.filter((p) => p.status === 'UPCOMING').length,
      EXPIRED: policies.filter((p) => p.status === 'EXPIRED').length,
    };
  }, [policies]);

  // Client-side filtering & sorting
  const filteredPolicies = useMemo(() => {
    let result = [...policies];

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (scopeFilter !== 'ALL') {
      result = result.filter((p) => p.scope === scopeFilter);
    }

    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.policy_name?.toLowerCase().includes(term) ||
          p.policy_code?.toLowerCase().includes(term) ||
          p.hotel_name?.toLowerCase().includes(term) ||
          p.scope_label?.toLowerCase().includes(term) ||
          String(p.commission_rate).includes(term)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'RATE_ASC':
          return a.commission_rate - b.commission_rate;
        case 'RATE_DESC':
          return b.commission_rate - a.commission_rate;
        case 'PRIORITY_DESC':
          return b.priority_level - a.priority_level;
        case 'PRIORITY_ASC':
          return a.priority_level - b.priority_level;
        case 'OLDEST':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'NAME_ASC':
          return (a.policy_name || '').localeCompare(b.policy_name || '');
        case 'NEWEST':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return result;
  }, [policies, statusFilter, scopeFilter, debouncedSearch, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / pageSize));
  const paginatedPolicies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPolicies.slice(start, start + pageSize);
  }, [filteredPolicies, page, pageSize]);

  // Reset filter handler
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setScopeFilter('ALL');
    setSortBy('PRIORITY_DESC');
    setPage(1);
  };

  // Create or Update submit
  const handleFormSubmit = async (payload) => {
    setFormLoading(true);
    try {
      if (editingPolicy) {
        await updateCommissionPolicy(editingPolicy.policy_id, payload);
        showToast('Cập nhật chính sách phí hoa hồng thành công!', 'success');
      } else {
        await createCommissionPolicy(payload);
        showToast('Tạo mới chính sách phí hoa hồng thành công!', 'success');
      }
      setFormModalOpen(false);
      setEditingPolicy(null);
      await loadData();
    } catch (err) {
      console.error('Lỗi khi lưu chính sách hoa hồng:', err);
      showToast(err.message || 'Lỗi khi lưu chính sách.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete submit
  const handleDeleteConfirm = async () => {
    if (!deletingPolicy) return;
    setDeleteLoading(true);
    try {
      await deleteCommissionPolicy(deletingPolicy.policy_id);
      showToast('Đã xóa chính sách phí hoa hồng khỏi hệ thống.', 'info');
      setDeleteModalOpen(false);
      setDeletingPolicy(null);
      await loadData();
    } catch (err) {
      console.error('Lỗi khi xóa chính sách hoa hồng:', err);
      showToast(err.message || 'Lỗi khi xóa chính sách.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormModalOpen(true);
  };

  const openEditModal = (policy, e) => {
    if (e) e.stopPropagation();
    setEditingPolicy(policy);
    setFormModalOpen(true);
  };

  const openDeleteModal = (policy, e) => {
    if (e) e.stopPropagation();
    setDeletingPolicy(policy);
    setDeleteModalOpen(true);
  };

  const handleRowClick = (policyId) => {
    navigate(`/dashboard/commission-policies/${policyId}`);
  };

  // Export to Excel (adhering to AVORA Enterprise Midnight Blue styling)
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exportList = filteredPolicies.length > 0 ? filteredPolicies : policies;
      const res = await exportCommissionPoliciesToExcel(exportList);
      if (res.success) {
        showToast(`Đã xuất thành công ${res.count} chính sách phí hoa hồng ra file Excel!`, 'success');
      } else {
        showToast(res.message || 'Không thể xuất file Excel.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      showToast('Lỗi khi tải xuống file Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="commission-policy-page">
      {/* Toast Feedback */}
      {toast.message && (
        <div className={`cp-mgmt-toast cp-mgmt-toast--${toast.type}`}>
          <span className="cp-mgmt-toast__icon">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="cp-page-header">
        <div className="cp-page-header__left">
          <div className="cp-breadcrumb">
            <span>Trang chủ</span>
            <span className="cp-breadcrumb__sep">/</span>
            <span>Quản trị hệ thống</span>
            <span className="cp-breadcrumb__sep">/</span>
            <span className="cp-breadcrumb__current">Chính sách phí hoa hồng</span>
          </div>

          <div className="cp-title-row">
            <h1 className="cp-main-title">Quản lý chính sách phí hoa hồng</h1>
            <span className="cp-role-badge">BUSINESS MANAGER</span>
          </div>

          <p className="cp-subtitle">
            Cấu hình tỷ lệ phần trăm trích hoa hồng trên mỗi đơn đặt phòng thành công,
            hỗ trợ phân cấp theo toàn chuỗi, phân khúc hạng sao và hợp đồng đối tác riêng biệt.
          </p>
        </div>

        <div className="cp-page-header__actions">
          <button
            type="button"
            className="cp-btn cp-btn--outline"
            onClick={handleExportExcel}
            disabled={exporting || policies.length === 0}
            title="Xuất danh sách chính sách phí hoa hồng ra file Excel"
          >
            <DownloadIcon size={15} />
            <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel'}</span>
          </button>

          <button
            type="button"
            className="cp-btn cp-btn--outline"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon
              size={14}
              className={refreshing ? 'cp-btn-spinner' : ''}
            />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="cp-btn cp-btn--primary-gold"
            onClick={openCreateModal}
            title="Tạo mới chính sách hoa hồng"
          >
            <PlusIcon size={14} strokeWidth={2.2} />
            <span>Thêm chính sách</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Metrics Cards */}
      <div className="cp-stats-grid">
        {/* Card 1: Tổng chính sách */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">TỔNG SỐ CHÍNH SÁCH</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--blue">
              <CreditCardIcon size={18} />
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">
              {loading ? '—' : stats?.total_policies ?? policies.length}
            </span>
            <span className="cp-stat-card__unit">chính sách</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--online">Hệ thống</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Đang áp dụng</span>
            <span className="cp-stat-card__footer-right">
              {stats?.active_policies ?? tabCounts.ACTIVE} chính sách
            </span>
          </div>
        </div>

        {/* Card 2: Đang kích hoạt / áp dụng */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">ĐANG KÍCH HOẠT</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--green">
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">
              {loading ? '—' : stats?.active_policies ?? tabCounts.ACTIVE}
            </span>
            <span className="cp-stat-card__unit">hoạt động</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--growth">Hiệu lực</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Chờ &amp; Hết hạn</span>
            <span className="cp-stat-card__footer-right">
              {(tabCounts.UPCOMING || 0) + (tabCounts.EXPIRED || 0)} chính sách
            </span>
          </div>
        </div>

        {/* Card 3: Tỷ lệ hoa hồng trung bình */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">TỶ LỆ HOA HỒNG TRUNG BÌNH</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--amber">
              <InfoIcon size={18} />
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">
              {loading ? '—' : `${stats?.avg_commission_rate ?? 0}%`}
            </span>
            <span className="cp-stat-card__unit">toàn chuỗi</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--urgent">Mức thu</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Đối tác nhận bình quân</span>
            <span className="cp-stat-card__footer-right">
              {100 - (Number(stats?.avg_commission_rate) || 0)}% doanh thu
            </span>
          </div>
        </div>

        {/* Card 4: Đối tác & Khách sạn riêng */}
        <div className="cp-stat-card">
          <div className="cp-stat-card__header">
            <span className="cp-stat-card__title">CHÍNH SÁCH RIÊNG &amp; ĐỐI TÁC</span>
            <div className="cp-stat-card__icon-box cp-stat-card__icon-box--purple">
              <BuildingIcon size={18} />
            </div>
          </div>
          <div className="cp-stat-card__value-row">
            <span className="cp-stat-card__main-value">
              {loading ? '—' : (stats?.hotel_specific_count || 0) + (stats?.star_specific_count || 0)}
            </span>
            <span className="cp-stat-card__unit">hợp đồng</span>
            <span className="cp-stat-card__badge cp-stat-card__badge--secured">Phân cấp</span>
          </div>
          <div className="cp-stat-card__footer">
            <span className="cp-stat-card__footer-left">Theo khách sạn riêng</span>
            <span className="cp-stat-card__footer-right">
              {stats?.hotel_specific_count || 0} cơ sở lưu trú
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Filter theo trạng thái hiệu lực */}
      <div className="cp-tabs-container">
        <button
          type="button"
          className={`cp-tab-btn ${statusFilter === 'ALL' ? 'cp-tab-btn--active' : ''}`}
          onClick={() => { setStatusFilter('ALL'); setPage(1); }}
        >
          <span>Tất cả</span>
          <span className="cp-tab-badge">{tabCounts.ALL}</span>
        </button>

        <button
          type="button"
          className={`cp-tab-btn ${statusFilter === 'ACTIVE' ? 'cp-tab-btn--active' : ''}`}
          onClick={() => { setStatusFilter('ACTIVE'); setPage(1); }}
        >
          <span>Đang áp dụng</span>
          <span className="cp-tab-badge">{tabCounts.ACTIVE}</span>
        </button>

        <button
          type="button"
          className={`cp-tab-btn ${statusFilter === 'UPCOMING' ? 'cp-tab-btn--active' : ''}`}
          onClick={() => { setStatusFilter('UPCOMING'); setPage(1); }}
        >
          <span>Sắp hiệu lực</span>
          <span className="cp-tab-badge">{tabCounts.UPCOMING}</span>
        </button>

        <button
          type="button"
          className={`cp-tab-btn ${statusFilter === 'EXPIRED' ? 'cp-tab-btn--active' : ''}`}
          onClick={() => { setStatusFilter('EXPIRED'); setPage(1); }}
        >
          <span>Đã hết hạn</span>
          <span className="cp-tab-badge">{tabCounts.EXPIRED}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="cp-filter-bar">
        {/* Search */}
        <div className="cp-search-wrapper">
          <SearchIcon size={14} className="cp-search-icon" strokeWidth={2.5} />
          <input
            type="text"
            className="cp-search-input"
            placeholder="Tìm theo mã CP, tên chính sách, đối tác áp dụng, tỷ lệ hoa hồng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="cp-filter-controls">
          {/* Lọc theo phạm vi */}
          <select
            className="cp-filter-select"
            value={scopeFilter}
            onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">Tất cả phạm vi</option>
            <option value="SYSTEM">Toàn hệ thống AVORA</option>
            <option value="STAR">Theo phân khúc sao</option>
            <option value="HOTEL">Khách sạn cụ thể</option>
          </select>

          {/* Sắp xếp */}
          <select
            className="cp-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="PRIORITY_DESC">Ưu tiên: Cao nhất trước</option>
            <option value="RATE_DESC">Tỷ lệ: Cao nhất trước</option>
            <option value="RATE_ASC">Tỷ lệ: Thấp nhất trước</option>
            <option value="NEWEST">Ngày tạo: Mới nhất</option>
            <option value="OLDEST">Ngày tạo: Cũ nhất</option>
            <option value="NAME_ASC">Tên: A → Z</option>
          </select>

          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || scopeFilter !== 'ALL' || sortBy !== 'PRIORITY_DESC') && (
            <button
              type="button"
              className="cp-btn-reset"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="cp-table-card">
        {loading ? (
          <div className="cp-empty-state">
            <div className="cp-btn-spinner" style={{ margin: '0 auto 12px', width: 28, height: 28, borderColor: '#003580', borderTopColor: 'transparent' }} />
            <div className="cp-empty-title">Đang tải danh sách chính sách phí hoa hồng...</div>
          </div>
        ) : error ? (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">⚠️</div>
            <div className="cp-empty-title">Không thể tải dữ liệu</div>
            <div className="cp-empty-desc">{error}</div>
            <button
              type="button"
              className="cp-btn cp-btn--outline"
              onClick={() => loadData(true)}
              style={{ marginTop: '12px' }}
            >
              Thử lại
            </button>
          </div>
        ) : paginatedPolicies.length === 0 ? (
          <div className="cp-empty-state">
            <div className="cp-empty-icon">📋</div>
            <div className="cp-empty-title">Không tìm thấy chính sách phù hợp</div>
            <div className="cp-empty-desc">
              Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem toàn bộ danh sách.
            </div>
          </div>
        ) : (
          <div className="cp-table-responsive">
            <table className="cp-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã chính sách</th>
                  <th>Tên chính sách phí hoa hồng</th>
                  <th>Phạm vi áp dụng</th>
                  <th style={{ textAlign: 'center' }}>Tỷ lệ hoa hồng</th>
                  <th style={{ textAlign: 'center' }}>Mức ưu tiên</th>
                  <th>Thời gian hiệu lực</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPolicies.map((p) => {
                  const rate = Number(p.commission_rate || 0);
                  const rateClass =
                    rate <= 10
                      ? 'cp-rate-pill--low'
                      : rate <= 15
                      ? 'cp-rate-pill--med'
                      : 'cp-rate-pill--high';

                  const scopeClass =
                    p.scope === 'SYSTEM'
                      ? 'cp-scope-pill--system'
                      : p.scope === 'STAR'
                      ? 'cp-scope-pill--star'
                      : 'cp-scope-pill--hotel';

                  const statusClass =
                    p.status === 'ACTIVE'
                      ? 'cp-status-pill--active'
                      : p.status === 'UPCOMING'
                      ? 'cp-status-pill--upcoming'
                      : 'cp-status-pill--expired';

                  return (
                    <tr
                      key={p.policy_id}
                      className="cp-clickable-row"
                      onClick={() => handleRowClick(p.policy_id)}
                      title="Nhấn để xem chi tiết chính sách"
                    >
                      {/* Mã chính sách */}
                      <td>
                        <span className="cp-code-badge">{p.policy_code}</span>
                      </td>

                      {/* Tên chính sách */}
                      <td>
                        <div className="cp-policy-name-cell">{p.policy_name}</div>
                        <div className="cp-policy-sub">Mã ID: {p.policy_id?.substring(0, 8)}...</div>
                      </td>

                      {/* Phạm vi áp dụng */}
                      <td>
                        <span className={`cp-scope-pill ${scopeClass}`}>
                          {p.scope === 'SYSTEM' && '🌐 '}
                          {p.scope === 'STAR' && '★ '}
                          {p.scope === 'HOTEL' && '🏨 '}
                          {p.scope_label}
                        </span>
                      </td>

                      {/* Tỷ lệ hoa hồng */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`cp-rate-pill ${rateClass}`}>{rate}%</span>
                      </td>

                      {/* Mức ưu tiên */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="cp-priority-badge" title="Độ ưu tiên giải quyết xung đột">
                          Cấp {p.priority_level}
                        </span>
                      </td>

                      {/* Thời gian hiệu lực */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          <div>Từ: {formatDate(p.valid_from)}</div>
                          <div>Đến: {p.valid_to ? formatDate(p.valid_to) : 'Vô thời hạn'}</div>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`cp-status-pill ${statusClass}`}>{p.status_label}</span>
                      </td>

                      {/* Thao tác */}
                      <td>
                        <div className="cp-action-btns" onClick={(e) => e.stopPropagation()}>
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            className="cp-action-btn"
                            onClick={() => handleRowClick(p.policy_id)}
                            title="Xem chi tiết chính sách"
                          >
                            <EyeIcon size={14} />
                          </button>

                          {/* Sửa */}
                          <button
                            type="button"
                            className="cp-action-btn"
                            onClick={(e) => openEditModal(p, e)}
                            title="Chỉnh sửa chính sách"
                          >
                            <EditIcon size={14} />
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            className="cp-action-btn cp-action-btn--delete"
                            onClick={(e) => openDeleteModal(p, e)}
                            title="Xóa chính sách"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredPolicies.length > 0 && (
          <div className="cp-pagination">
            <div>
              Hiển thị <strong>{Math.min((page - 1) * pageSize + 1, filteredPolicies.length)}</strong> -{' '}
              <strong>{Math.min(page * pageSize, filteredPolicies.length)}</strong> trên tổng số{' '}
              <strong>{filteredPolicies.length}</strong> chính sách
            </div>

            <div className="cp-page-controls">
              <button
                type="button"
                className="cp-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`cp-page-btn ${page === pNum ? 'cp-page-btn--active' : ''}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}
              <button
                type="button"
                className="cp-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <CommissionPolicyFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingPolicy(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingPolicy}
        hotels={hotels}
        loading={formLoading}
      />

      {/* Delete Modal */}
      <CommissionPolicyDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletingPolicy(null); }}
        onConfirm={handleDeleteConfirm}
        policy={deletingPolicy}
        loading={deleteLoading}
      />
    </div>
  );
};

export default CommissionPolicyManagementPage;
