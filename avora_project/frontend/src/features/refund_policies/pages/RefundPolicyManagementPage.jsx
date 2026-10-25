import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchRefundPolicies,
  fetchRefundPolicyHotels,
  createRefundPolicy,
  updateRefundPolicy,
  deleteRefundPolicy,
} from '../../../services/refundPolicyApi';
import { exportRefundPoliciesToExcel } from '../../../utils/exportToExcel';
import RefundPolicyFormModal from '../components/RefundPolicyFormModal';
import RefundPolicyDeleteModal from '../components/RefundPolicyDeleteModal';
import './RefundPolicyManagementPage.css';

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
const RefundPolicyManagementPage = () => {
  const navigate = useNavigate();

  // Data states
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Toast feedback matching Admin User Management
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
  const [formServerError, setFormServerError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState(null);
  const [deleteServerError, setDeleteServerError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters & Search & Sorting (Note: "Newest First" removed per UC requirement)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | INACTIVE
  const [hotelFilter, setHotelFilter] = useState('ALL'); // ALL | SYSTEM | <hotel_id>
  const [sortBy, setSortBy] = useState('PERCENT_DESC'); // Default: highest refund rate
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Debounce search query to avoid jitter and excessive recalculation (matching UserManagementPage)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch hotels list for filter dropdown and form modal
  useEffect(() => {
    fetchRefundPolicyHotels()
      .then((data) => setHotels(data || []))
      .catch((err) => console.error('Lỗi khi tải danh sách khách sạn:', err));
  }, []);

  // Fetch refund policies data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetchRefundPolicies();
      setPolicies(res.policies || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Lỗi khi tải chính sách hoàn tiền:', err);
      setError(err.message || 'Không thể tải dữ liệu chính sách hoàn tiền từ hệ thống.');
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
    const activeList = policies.filter((p) => p.is_active !== false);
    return {
      ALL: activeList.length,
      ACTIVE: activeList.filter((p) => p.status === 'ACTIVE').length,
      INACTIVE: activeList.filter((p) => p.status === 'INACTIVE').length,
    };
  }, [policies]);

  // Filter & Sort Logic (Client-side for instant responsiveness)
  const filtered = useMemo(() => {
    let result = policies.filter((p) => p.is_active !== false);

    // Search filter using debouncedSearch (matches all fields like Admin User Management)
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.policy_name?.toLowerCase().includes(term) ||
          p.policy_code?.toLowerCase().includes(term) ||
          p.policy_id?.toLowerCase().includes(term) ||
          p.hotel_name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          String(p.refund_percentage || '').includes(term) ||
          String(p.minimum_cancellation_hours || '').includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Hotel scope filter
    if (hotelFilter !== 'ALL') {
      if (hotelFilter === 'SYSTEM') {
        result = result.filter((p) => !p.hotel_id);
      } else {
        result = result.filter((p) => p.hotel_id === hotelFilter);
      }
    }

    // Sorting without "Newest First"
    result.sort((a, b) => {
      if (sortBy === 'PERCENT_DESC') return (Number(b.refund_percentage) || 0) - (Number(a.refund_percentage) || 0);
      if (sortBy === 'PERCENT_ASC') return (Number(a.refund_percentage) || 0) - (Number(b.refund_percentage) || 0);
      if (sortBy === 'HOURS_ASC') return (Number(a.minimum_cancellation_hours) || 0) - (Number(b.minimum_cancellation_hours) || 0);
      if (sortBy === 'HOURS_DESC') return (Number(b.minimum_cancellation_hours) || 0) - (Number(a.minimum_cancellation_hours) || 0);
      if (sortBy === 'BOOKINGS_DESC') return (b.associated_bookings_count || 0) - (a.associated_bookings_count || 0);
      if (sortBy === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
      return 0;
    });

    return result;
  }, [policies, debouncedSearch, statusFilter, hotelFilter, sortBy]);

  // Reset to page 1 on search or filter change
  const handleSearchChange = (val) => {
    setSearchTerm(val);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleHotelFilterChange = (hotelId) => {
    setHotelFilter(hotelId);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setHotelFilter('ALL');
    setSortBy('PERCENT_DESC');
    setPage(1);
    showToast('Đã đặt lại toàn bộ bộ lọc về mặc định.', 'info');
  };

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Navigate to policy detail page
  const handleViewDetail = (policyId) => {
    navigate(`/dashboard/refund-policies/${policyId}`);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormServerError(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (policy, e) => {
    if (e) e.stopPropagation();
    setEditingPolicy(policy);
    setFormServerError(null);
    setFormModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (policy, e) => {
    if (e) e.stopPropagation();
    setDeletingPolicy(policy);
    setDeleteServerError(null);
    setDeleteModalOpen(true);
  };

  // Submit Create / Edit
  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    setFormServerError(null);
    try {
      if (editingPolicy) {
        await updateRefundPolicy(editingPolicy.policy_id, formData);
        showToast('Cập nhật chính sách hoàn tiền thành công!', 'success');
      } else {
        await createRefundPolicy(formData);
        showToast('Tạo mới chính sách hoàn tiền thành công!', 'success');
      }
      setFormModalOpen(false);
      setEditingPolicy(null);
      loadData();
    } catch (err) {
      setFormServerError(err.message || 'Có lỗi xảy ra khi lưu chính sách.');
      showToast(err.message || 'Có lỗi xảy ra khi lưu chính sách.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingPolicy) return;
    setDeleteLoading(true);
    setDeleteServerError(null);
    try {
      await deleteRefundPolicy(deletingPolicy.policy_id);
      showToast(`Đã xóa thành công chính sách "${deletingPolicy.policy_name}".`, 'success');
      setDeleteModalOpen(false);
      setDeletingPolicy(null);
      loadData();
    } catch (err) {
      setDeleteServerError(err.message || 'Không thể xóa chính sách hoàn tiền.');
      showToast(err.message || 'Không thể xóa chính sách hoàn tiền.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export to Excel (Follows exact same layout and Midnight Blue styling as exportUsersToExcel)
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exportList = filtered.length > 0 ? filtered : policies;
      const res = await exportRefundPoliciesToExcel(exportList);
      if (res.success) {
        showToast(`Đã xuất thành công ${res.count} chính sách ra file Excel!`, 'success');
      } else {
        showToast(res.message || 'Không thể xuất file Excel.', 'error');
      }
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Lỗi khi tải xuống file Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="refund-policy-page">
      {/* Toast Feedback Notification (Aligned with Admin User Management) */}
      {toast.message && (
        <div className={`rp-mgmt-toast rp-mgmt-toast--${toast.type}`}>
          <div className="rp-mgmt-toast__icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header (Aligned with Admin User Management) */}
      <div className="rp-page-header">
        <div className="rp-page-header__left">
          {/* Breadcrumb */}
          <nav className="rp-breadcrumb" aria-label="Breadcrumb">
            <span>Hệ thống</span>
            <span className="rp-breadcrumb__sep">&gt;</span>
            <span>Marketing &amp; Doanh thu</span>
            <span className="rp-breadcrumb__sep">&gt;</span>
            <span className="rp-breadcrumb__current">Chính sách hoàn tiền</span>
          </nav>

          {/* Title & Badge */}
          <div className="rp-title-row">
            <h1 className="rp-main-title">Quản lý Chính sách Hoàn tiền</h1>
            <span className="rp-role-badge">BUSINESS MANAGER</span>
          </div>

          {/* Subtitle Description */}
          <p className="rp-subtitle">
            Quản trị danh mục chính sách hủy phòng &amp; hoàn tiền cho hệ thống khách sạn AVORA. Thiết lập tỷ lệ hoàn, thời hạn hủy tối thiểu và kiểm soát trạng thái áp dụng theo từng cơ sở.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="rp-page-header__actions">
          {/* Action 1: Export Excel (Styled like user-btn--outline) */}
          <button
            type="button"
            className="rp-btn rp-btn--outline"
            onClick={handleExportExcel}
            disabled={exporting || policies.length === 0}
            title="Xuất toàn bộ danh sách chính sách ra file Excel chuyên nghiệp"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{exporting ? 'Đang xuất Excel...' : 'Xuất dữ liệu (Excel)'}</span>
          </button>

          {/* Action 2: Refresh Data */}
          <button
            type="button"
            className="rp-btn rp-btn--outline"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Đồng bộ dữ liệu mới nhất từ máy chủ"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? 'rp-btn-spinner' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* Action 3: Add Policy (Primary Gold) */}
          <button
            type="button"
            className="rp-btn rp-btn--primary-gold"
            onClick={openCreateModal}
            title="Tạo mới chính sách hoàn tiền"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm chính sách mới</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ Thống Kê KPI Cards (Aligned with UserStatsCards) */}
      <div className="rp-stats-grid">
        {/* Card 1: Tổng số chính sách */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">TỔNG SỐ CHÍNH SÁCH</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">
              {loading ? '—' : stats?.total_policies ?? policies.length}
            </span>
            <span className="rp-stat-card__unit">chính sách</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--online">Hệ thống</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Đang áp dụng</span>
            <span className="rp-stat-card__footer-right">
              {stats?.active_policies ?? tabCounts.ACTIVE} chính sách
            </span>
          </div>
        </div>

        {/* Card 2: Đang kích hoạt */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">ĐANG KÍCH HOẠT</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">
              {loading ? '—' : stats?.active_policies ?? tabCounts.ACTIVE}
            </span>
            <span className="rp-stat-card__unit">hoạt động</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--growth">Hiệu lực</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Tạm ngưng</span>
            <span className="rp-stat-card__footer-right">
              {stats?.inactive_policies ?? tabCounts.INACTIVE} chính sách
            </span>
          </div>
        </div>

        {/* Card 3: Tỷ lệ hoàn TB */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">TỶ LỆ HOÀN TRUNG BÌNH</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">
              {loading ? '—' : `${stats?.avg_refund_rate ?? 0}%`}
            </span>
            <span className="rp-stat-card__unit">toàn hệ thống</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--urgent">Mức hoàn</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Chính sách hủy linh hoạt</span>
            <span className="rp-stat-card__footer-right">
              {stats?.free_cancel_count ?? 0} chính sách
            </span>
          </div>
        </div>

        {/* Card 4: Đơn booking bảo đảm */}
        <div className="rp-stat-card">
          <div className="rp-stat-card__header">
            <span className="rp-stat-card__title">ĐƠN ĐẶT PHÒNG BẢO ĐẢM</span>
            <div className="rp-stat-card__icon-box rp-stat-card__icon-box--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="rp-stat-card__value-row">
            <span className="rp-stat-card__main-value">
              {loading ? '—' : stats?.total_associated_bookings ?? 0}
            </span>
            <span className="rp-stat-card__unit">đơn đặt phòng</span>
            <span className="rp-stat-card__badge rp-stat-card__badge--secured">Bảo vệ</span>
          </div>
          <div className="rp-stat-card__footer">
            <span className="rp-stat-card__footer-left">Liên kết giao dịch</span>
            <span className="rp-stat-card__footer-right">Được đảm bảo</span>
          </div>
        </div>
      </div>

      {/* Các Tab Trạng Thái (Aligned with UserRoleTabs) */}
      <div className="rp-status-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`rp-status-tab ${statusFilter === 'ALL' ? 'rp-status-tab--active' : ''}`}
          onClick={() => handleStatusFilterChange('ALL')}
        >
          <span>Tất cả chính sách</span>
          <span className={`rp-status-tab__count ${statusFilter === 'ALL' ? 'rp-status-tab__count--active' : ''}`}>
            {tabCounts.ALL}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          className={`rp-status-tab ${statusFilter === 'ACTIVE' ? 'rp-status-tab--active' : ''}`}
          onClick={() => handleStatusFilterChange('ACTIVE')}
        >
          <span>Đang áp dụng</span>
          <span className={`rp-status-tab__count ${statusFilter === 'ACTIVE' ? 'rp-status-tab__count--active' : ''}`}>
            {tabCounts.ACTIVE}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          className={`rp-status-tab ${statusFilter === 'INACTIVE' ? 'rp-status-tab--active' : ''}`}
          onClick={() => handleStatusFilterChange('INACTIVE')}
        >
          <span>Tạm dừng</span>
          <span className={`rp-status-tab__count ${statusFilter === 'INACTIVE' ? 'rp-status-tab__count--active' : ''}`}>
            {tabCounts.INACTIVE}
          </span>
        </button>
      </div>

      {/* Thanh Tìm kiếm & Bộ Lọc (Aligned with UserFilterBar, "Newest First" removed) */}
      <div className="rp-filter-bar">
        {/* Search Box */}
        <div className="rp-filter-bar__search-box">
          <svg className="rp-filter-bar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="rp-filter-bar__input"
            placeholder="Tìm theo tên chính sách, mã, khách sạn, mô tả quy định..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="rp-filter-bar__clear-btn"
              onClick={() => handleSearchChange('')}
              title="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="rp-filter-bar__controls">
          {/* Hotel Filter */}
          <select
            className="rp-filter-select"
            value={hotelFilter}
            onChange={(e) => handleHotelFilterChange(e.target.value)}
            title="Lọc theo khách sạn áp dụng"
          >
            <option value="ALL">Tất cả khách sạn</option>
            <option value="SYSTEM">Áp dụng toàn hệ thống</option>
            {hotels.map((h) => (
              <option key={h.hotel_id} value={h.hotel_id}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Status Filter Dropdown */}
          <select
            className="rp-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            title="Lọc theo trạng thái hiệu lực"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="INACTIVE">Tạm dừng</option>
          </select>

          {/* Sort Dropdown: REMOVED "Newest First" completely per requirement */}
          <select
            className="rp-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sắp xếp danh sách"
          >
            <option value="PERCENT_DESC">Tỷ lệ hoàn: Cao nhất</option>
            <option value="PERCENT_ASC">Tỷ lệ hoàn: Thấp nhất</option>
            <option value="HOURS_ASC">Giờ hủy tối thiểu: Ít nhất</option>
            <option value="HOURS_DESC">Giờ hủy tối thiểu: Nhiều nhất</option>
            <option value="BOOKINGS_DESC">Lượt đặt phòng: Nhiều nhất</option>
            <option value="OLDEST">Ngày tạo: Cũ nhất trước</option>
          </select>

          {/* Reset Filters */}
          <button
            type="button"
            className="rp-filter-icon-btn"
            onClick={handleResetFilters}
            title="Đặt lại toàn bộ bộ lọc"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table Card (Aligned with UserTable) */}
      <div className="rp-table-card">
        {/* Table Subheader with Quick Status Counts */}
        <div className="rp-table-subheader">
          <div>
            Hiển thị <strong>{paginated.length}</strong> / <strong>{totalItems}</strong> chính sách phù hợp
          </div>
          <div className="rp-table-quick-stats">
            <span className="rp-stat-dot--active">
              ● {tabCounts.ACTIVE} đang áp dụng
            </span>
            <span className="rp-stat-dot--locked">
              ● {tabCounts.INACTIVE} tạm dừng
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div className="rp-table-container">
          {loading ? (
            <div className="rp-table-loading">
              <div className="rp-table-spinner" />
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Đang tải danh sách chính sách hoàn tiền...</div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="rp-table-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3 style={{ margin: '0.25rem 0', color: '#1e293b', fontSize: '0.95rem' }}>
                Không tìm thấy chính sách hoàn tiền nào
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                Vui lòng thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các bộ lọc.
              </p>
            </div>
          ) : (
            <table className="rp-table">
              <thead>
                <tr>
                  <th>MÃ &amp; TÊN CHÍNH SÁCH</th>
                  <th>CƠ SỞ ÁP DỤNG</th>
                  <th style={{ textAlign: 'center' }}>TỶ LỆ HOÀN TIỀN</th>
                  <th>HẠN HỦY TỐI THIỂU</th>
                  <th>CẬP NHẬT LẦN CUỐI</th>
                  <th style={{ textAlign: 'center' }}>ĐƠN ÁP DỤNG</th>
                  <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const rate = Number(p.refund_percentage || 0);
                  const rateClass =
                    rate === 100
                      ? 'rp-rate-pill--100'
                      : rate > 0
                      ? 'rp-rate-pill--partial'
                      : 'rp-rate-pill--zero';
                  const hours = Number(p.minimum_cancellation_hours || 0);

                  return (
                    <tr
                      key={p.policy_id}
                      onClick={() => handleViewDetail(p.policy_id)}
                      title="Nhấn để xem chi tiết chính sách hoàn tiền"
                    >
                      {/* 1. Mã & Tên chính sách */}
                      <td>
                        <div className="rp-policy-cell">
                          <div className="rp-policy-avatar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <path d="M9 12l2 2 4-4" />
                            </svg>
                          </div>
                          <div className="rp-policy-info-col">
                            <span className="rp-policy-code">
                              {p.policy_code || `RP-${(p.policy_id || '').substring(0, 8).toUpperCase()}`}
                            </span>
                            <span className="rp-policy-name">{p.policy_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cơ sở áp dụng */}
                      <td>
                        <div className="rp-hotel-cell">
                          <span className="rp-hotel-name">{p.hotel_name || 'Toàn hệ thống AVORA'}</span>
                          <span className="rp-hotel-sub">
                            {p.hotel_id ? 'Khách sạn cơ sở' : 'Áp dụng toàn chuỗi'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Tỷ lệ hoàn tiền */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rp-rate-pill ${rateClass}`}>{rate}%</span>
                      </td>

                      {/* 4. Hạn hủy tối thiểu */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#1e293b' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{hours > 0 ? `${hours} giờ trước check-in` : 'Trước nhận phòng'}</span>
                        </div>
                      </td>

                      {/* 5. Cập nhật lần cuối */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(p.updated_at || p.created_at)}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tạo: {formatDate(p.created_at)}</div>
                        </div>
                      </td>

                      {/* 6. Đơn áp dụng */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0b1e3f' }}>
                          {p.associated_bookings_count || 0}
                        </span>
                      </td>

                      {/* 7. Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`rp-status-pill ${
                            p.status === 'ACTIVE' ? 'rp-status-pill--active' : 'rp-status-pill--locked'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm dừng'}
                        </span>
                      </td>

                      {/* 8. Thao tác */}
                      <td>
                        <div className="rp-action-btns" onClick={(e) => e.stopPropagation()}>
                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            className="rp-action-btn"
                            onClick={() => handleViewDetail(p.policy_id)}
                            title="Xem chi tiết chính sách"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Nút Sửa */}
                          <button
                            type="button"
                            className="rp-action-btn"
                            onClick={(e) => openEditModal(p, e)}
                            title="Chỉnh sửa chính sách"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Nút Xóa */}
                          <button
                            type="button"
                            className="rp-action-btn rp-action-btn--delete"
                            onClick={(e) => openDeleteModal(p, e)}
                            title="Xóa chính sách"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer (Aligned with UserTable pagination) */}
        <div className="rp-table-pagination">
          <div className="rp-table-pagination__info">
            <span>
              Hiển thị{' '}
              <strong>
                {totalItems === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
                {Math.min(page * pageSize, totalItems)}
              </strong>{' '}
              trên tổng <strong>{totalItems}</strong> chính sách
            </span>

            <div className="rp-page-size-selector">
              <span>Hiển thị mỗi trang:</span>
              <select
                className="rp-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <div className="rp-pagination-controls">
            <button
              type="button"
              className="rp-page-btn"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              title="Trang trước"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                type="button"
                className={`rp-page-btn ${pNum === page ? 'rp-page-btn--active' : ''}`}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </button>
            ))}

            <button
              type="button"
              className="rp-page-btn"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              title="Trang tiếp theo"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal (Create / Edit) */}
      <RefundPolicyFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setFormServerError(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingPolicy}
        hotels={hotels}
        loading={formLoading}
        serverError={formServerError}
      />

      {/* Delete Confirmation Modal */}
      <RefundPolicyDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteServerError(null);
        }}
        onConfirm={handleDeleteConfirm}
        policy={deletingPolicy}
        loading={deleteLoading}
        serverError={deleteServerError}
      />
    </div>
  );
};

export default RefundPolicyManagementPage;
