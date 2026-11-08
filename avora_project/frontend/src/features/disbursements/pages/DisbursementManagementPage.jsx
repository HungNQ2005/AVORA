import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchBusinessDisbursements,
  approveDisbursement,
  settleDisbursement,
  rejectDisbursement,
} from '../../../services/disbursementApi';
import DisbursementDetailModal from '../components/DisbursementDetailModal';
import DisbursementApproveModal from '../components/DisbursementApproveModal';
import DisbursementRejectModal from '../components/DisbursementRejectModal';
import DisbursementSettleModal from '../components/DisbursementSettleModal';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BuildingIcon,
  InfoIcon,
  EyeIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  SearchIcon,
} from '../../../common/components/icons';
import './DisbursementManagementPage.css';

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('vi-VN') + ' VND';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DisbursementManagementPage = () => {
  // Data states
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Status tabs
  // TABS: PENDING_APPROVAL (1), PENDING_PAYMENT (2), SETTLEMENT (4), REJECTED (5), ALL
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('1'); // Mặc định khớp tab PENDING_APPROVAL
  const [bankFilter, setBankFilter] = useState('ALL');
  const [amountRangeFilter, setAmountRangeFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Đồng bộ khi người dùng chọn Trạng thái từ dropdown
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    switch (newStatus) {
      case '1':
        setActiveTab('PENDING_APPROVAL');
        break;
      case '2':
        setActiveTab('PENDING_PAYMENT');
        break;
      case '4':
        setActiveTab('SETTLEMENT');
        break;
      case '5':
        setActiveTab('REJECTED');
        break;
      default:
        setActiveTab('ALL');
        break;
    }
  };

  // Đồng bộ khi người dùng nhấn chuyển Tab trạng thái
  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    switch (tabKey) {
      case 'PENDING_APPROVAL':
        setStatusFilter('1');
        break;
      case 'PENDING_PAYMENT':
        setStatusFilter('2');
        break;
      case 'SETTLEMENT':
        setStatusFilter('4');
        break;
      case 'REJECTED':
        setStatusFilter('5');
        break;
      default:
        setStatusFilter('ALL');
        break;
    }
  };

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveRequest, setApproveRequest] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleRequest, setSettleRequest] = useState(null);
  const [settleLoading, setSettleLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Load data from Backend API (lấy danh sách toàn bộ để lọc mượt mà tức thì phía client)
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchBusinessDisbursements({
        status: 'ALL',
        limit: 200,
      });
      setItems(res.items || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách giải ngân:', err);
      setError(err.message || 'Không thể tải danh sách giải ngân.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page to 1 when filters or active tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bankFilter, amountRangeFilter, dateRangeFilter, sortBy, activeTab]);

  // Extract unique bank list from current items
  const uniqueBanks = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const bankName = item.bank_info?.bank_name;
      const bankCd = item.bank_info?.bank_cd || bankName;
      if (bankName && !map.has(bankCd)) {
        map.set(bankCd, bankName);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [items]);

  // Multi-criteria client-side filtering & sorting
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 0. Status filter (Dropdown hoặc Tab)
    if (statusFilter !== 'ALL') {
      result = result.filter((item) => String(item.status_cd) === String(statusFilter));
    } else if (activeTab !== 'ALL') {
      if (activeTab === 'PENDING_APPROVAL') {
        result = result.filter((item) => String(item.status_cd) === '1');
      } else if (activeTab === 'PENDING_PAYMENT') {
        result = result.filter((item) => String(item.status_cd) === '2');
      } else if (activeTab === 'SETTLEMENT') {
        result = result.filter((item) => String(item.status_cd) === '4');
      } else if (activeTab === 'REJECTED') {
        result = result.filter((item) => String(item.status_cd) === '5');
      }
    }

    // 1. Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((item) => {
        const shortId = item.withdrawal_id
          ? `wd-${item.withdrawal_id.slice(0, 8).toLowerCase()}`
          : '';
        const fullId = (item.withdrawal_id || '').toLowerCase();
        const hotelName = (item.hotel_name || '').toLowerCase();
        const ownerName = (item.owner_name || '').toLowerCase();
        const ownerEmail = (item.owner_email || '').toLowerCase();
        const ownerPhone = (item.owner_phone || '').toLowerCase();
        const bankName = (item.bank_info?.bank_name || '').toLowerCase();
        const accNumber = (item.bank_info?.account_number || '').toLowerCase();
        const accHolder = (item.bank_info?.account_holder || '').toLowerCase();
        const txRef = (item.gateway_transaction_ref || '').toLowerCase();

        return (
          shortId.includes(term) ||
          fullId.includes(term) ||
          hotelName.includes(term) ||
          ownerName.includes(term) ||
          ownerEmail.includes(term) ||
          ownerPhone.includes(term) ||
          bankName.includes(term) ||
          accNumber.includes(term) ||
          accHolder.includes(term) ||
          txRef.includes(term)
        );
      });
    }

    // 2. Bank filter
    if (bankFilter !== 'ALL') {
      result = result.filter((item) => {
        const cd = item.bank_info?.bank_cd || item.bank_info?.bank_name;
        return cd === bankFilter || item.bank_info?.bank_name === bankFilter;
      });
    }

    // 3. Amount range filter
    if (amountRangeFilter !== 'ALL') {
      result = result.filter((item) => {
        const amt = Number(item.amount) || 0;
        switch (amountRangeFilter) {
          case 'UNDER_5M':
            return amt < 5000000;
          case '5M_TO_20M':
            return amt >= 5000000 && amt <= 20000000;
          case '20M_TO_50M':
            return amt > 20000000 && amt <= 50000000;
          case 'OVER_50M':
            return amt > 50000000;
          default:
            return true;
        }
      });
    }

    // 4. Date range filter
    if (dateRangeFilter !== 'ALL') {
      const now = new Date();
      result = result.filter((item) => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        if (Number.isNaN(itemDate.getTime())) return false;
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (dateRangeFilter) {
          case 'TODAY':
            return itemDate.toDateString() === now.toDateString();
          case 'WEEK':
            return diffDays <= 7;
          case 'MONTH':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      switch (sortBy) {
        case 'NEWEST':
          return timeB - timeA;
        case 'OLDEST':
          return timeA - timeB;
        case 'AMOUNT_DESC':
          return amtB - amtA;
        case 'AMOUNT_ASC':
          return amtA - amtB;
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [items, statusFilter, activeTab, searchTerm, bankFilter, amountRangeFilter, dateRangeFilter, sortBy]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'ALL' ||
    activeTab !== 'ALL' ||
    bankFilter !== 'ALL' ||
    amountRangeFilter !== 'ALL' ||
    dateRangeFilter !== 'ALL' ||
    sortBy !== 'NEWEST'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setActiveTab('ALL');
    setBankFilter('ALL');
    setAmountRangeFilter('ALL');
    setDateRangeFilter('ALL');
    setSortBy('NEWEST');
  };

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Action: Open View Details
  const handleOpenDetail = (request) => {
    setDetailRequest(request);
    setDetailModalOpen(true);
  };

  // Action: Open Approve Modal (Accept)
  const handleOpenApproveModal = (request) => {
    setApproveRequest(request);
    setApproveModalOpen(true);
  };

  // Action: Confirm Approve (Accept: PND -> APR / Approved)
  const handleConfirmApprove = async () => {
    if (!approveRequest) return;
    setApproveLoading(true);
    try {
      await approveDisbursement(approveRequest.withdrawal_id);
      showToast('Phê duyệt yêu cầu giải ngân thành công! Đã tự động chuyển sang Chờ thanh toán.', 'success');
      setApproveModalOpen(false);
      setApproveRequest(null);
      await loadData(true);
    } catch (err) {
      showToast(err.message || 'Phê duyệt thất bại.', 'error');
    } finally {
      setApproveLoading(false);
    }
  };

  // Action: Open Settle Modal (Complete Payment: APR -> CMP / Settled)
  const handleOpenSettleModal = (request) => {
    setSettleRequest(request);
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = async (payload) => {
    if (!settleRequest) return;
    setSettleLoading(true);
    try {
      await settleDisbursement(settleRequest.withdrawal_id, payload);
      showToast('Đã xác nhận chi trả và hoàn tất quyết toán giải ngân!', 'success');
      setSettleModalOpen(false);
      setSettleRequest(null);
      await loadData(true);
    } catch (err) {
      showToast(err.message || 'Quyết toán chi trả thất bại.', 'error');
    } finally {
      setSettleLoading(false);
    }
  };

  // Action: SePay (hoặc xác nhận thủ công) đã ghi nhận chi trả -> làm mới danh sách, giữ modal mở để hiển thị kết quả
  const handleAutoSettled = () => {
    showToast('Giải ngân thành công! Trạng thái yêu cầu đã được cập nhật.', 'success');
    loadData(true);
  };

  // Action: Open Reject Modal (Reject: PND -> REJ, refunding balance)
  const handleOpenRejectModal = (request) => {
    setRejectRequest(request);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (payload) => {
    if (!rejectRequest) return;
    setRejectLoading(true);
    try {
      await rejectDisbursement(rejectRequest.withdrawal_id, payload);
      showToast('Đã từ chối yêu cầu và hoàn lại số dư vào ví khách sạn.', 'success');
      setRejectModalOpen(false);
      setRejectRequest(null);
      await loadData(true);
    } catch (err) {
      showToast(err.message || 'Từ chối thất bại.', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  // Tabs configuration
  const tabs = [
    {
      key: 'PENDING_APPROVAL',
      label: 'Chờ phê duyệt',
      count: stats?.pending_approval_count || 0,
      badgeColor: '#D97706',
    },
    {
      key: 'PENDING_PAYMENT',
      label: 'Chờ thanh toán',
      count: stats?.pending_payment_count || 0,
      badgeColor: '#2563EB',
    },
    {
      key: 'SETTLEMENT',
      label: 'Đã quyết toán',
      count: stats?.settlement_count || 0,
      badgeColor: '#059669',
    },
    {
      key: 'REJECTED',
      label: 'Bị từ chối',
      count: stats?.rejected_count || 0,
      badgeColor: '#DC2626',
    },
    {
      key: 'ALL',
      label: 'Tất cả yêu cầu',
      count: stats?.total_count || 0,
      badgeColor: '#64748B',
    },
  ];

  return (
    <div className="disbursement-page">
      {/* Toast alert */}
      {toast.message && (
        <div className={`disbursement-toast disbursement-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertTriangleIcon size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="disbursement-breadcrumb" aria-label="Breadcrumb">
        <span>BẢNG ĐIỀU KHIỂN</span>
        <span className="disbursement-breadcrumb__sep">/</span>
        <span>MARKETING &amp; DOANH THU</span>
        <span className="disbursement-breadcrumb__sep">/</span>
        <span className="disbursement-breadcrumb__active">Quản lý giải ngân</span>
      </nav>

      {/* Hero Header */}
      <div className="disbursement-hero">
        <div className="disbursement-hero__content">
          <div className="disbursement-hero__title-row">
            <span className="disbursement-role-badge">BUSINESS MANAGER</span>
            <h1 className="disbursement-hero__title">Quản lý Giải ngân Đối tác</h1>
          </div>
          <p className="disbursement-hero__desc">
            Quy trình phê duyệt, theo dõi lệnh rút doanh thu khách sạn và hoàn tất quyết toán chi trả
            theo quy chuẩn tài chính AVORA.
          </p>
        </div>
        <div className="disbursement-hero__actions">
          <button
            type="button"
            className="disbursement-btn disbursement-btn--secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="disbursement-stats-grid">
        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--pending">
            <InfoIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Chờ phê duyệt</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(stats?.pending_approval_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {stats?.pending_approval_count || 0} yêu cầu cần duyệt
            </span>
          </div>
        </div>

        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--payment">
            <CreditCardIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Chờ thanh toán</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(stats?.pending_payment_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {stats?.pending_payment_count || 0} yêu cầu đã duyệt chờ chuyển tiền
            </span>
          </div>
        </div>

        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--settled">
            <CheckCircleIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Đã quyết toán</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(stats?.settlement_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {stats?.settlement_count || 0} yêu cầu đã giải ngân thành công
            </span>
          </div>
        </div>

        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--total">
            <BuildingIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Tổng giải ngân</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(stats?.total_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {stats?.total_count || 0} tổng số yêu cầu hệ thống
            </span>
          </div>
        </div>
      </div>

      {/* Main Card with Tabs, Toolbar & Table */}
      <div className="disbursement-main-card">
        {/* Navigation Tabs Bar */}
        <div className="disbursement-tabs-bar">
          <div className="disbursement-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  className={`disbursement-tab ${isActive ? 'disbursement-tab--active' : ''}`}
                  onClick={() => handleTabClick(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span
                    className="disbursement-tab__count"
                    style={{
                      backgroundColor: isActive ? tab.badgeColor : '#E2E8F0',
                      color: isActive ? '#FFF' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Select Filter on the right of tabs */}
          <div className="disbursement-tabs-bar__right">
            <div className="disbursement-filter-select-wrap">
              <label htmlFor="filter-status" className="disbursement-filter-label">
                Trạng thái:
              </label>
              <select
                id="filter-status"
                className="disbursement-select"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Lọc theo trạng thái"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="1">Đợi giải ngân</option>
                <option value="2">Đã phê duyệt</option>
                <option value="3">Đang xử lý</option>
                <option value="4">Đã giải ngân</option>
                <option value="5">Bị từ chối</option>
                <option value="6">Thất bại</option>
                <option value="7">Đã hủy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="disbursement-toolbar">
          {/* Search Box */}
          <div className="disbursement-search-wrap">
            <SearchIcon size={16} className="disbursement-search-icon" />
            <input
              type="text"
              className="disbursement-search-input"
              placeholder="Tìm theo mã yêu cầu (WD-...), tên khách sạn, đối tác, số tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="disbursement-search-clear"
                onClick={() => setSearchTerm('')}
                title="Xóa từ khóa tìm kiếm"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Group */}
          <div className="disbursement-filter-group">
            {/* Filter by Bank */}
            <div className="disbursement-filter-select-wrap">
              <label htmlFor="filter-bank" className="disbursement-filter-label">
                Ngân hàng:
              </label>
              <select
                id="filter-bank"
                className="disbursement-select"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                aria-label="Lọc theo ngân hàng"
              >
                <option value="ALL">Tất cả ngân hàng</option>
                {uniqueBanks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Amount Range */}
            <div className="disbursement-filter-select-wrap">
              <label htmlFor="filter-amount" className="disbursement-filter-label">
                Số tiền:
              </label>
              <select
                id="filter-amount"
                className="disbursement-select"
                value={amountRangeFilter}
                onChange={(e) => setAmountRangeFilter(e.target.value)}
                aria-label="Lọc theo hạn mức số tiền"
              >
                <option value="ALL">Tất cả hạn mức</option>
                <option value="UNDER_5M">Dưới 5.000.000 đ</option>
                <option value="5M_TO_20M">5.000.000 đ – 20.000.000 đ</option>
                <option value="20M_TO_50M">20.000.000 đ – 50.000.000 đ</option>
                <option value="OVER_50M">Trên 50.000.000 đ</option>
              </select>
            </div>

            {/* Filter by Date Range */}
            <div className="disbursement-filter-select-wrap">
              <label htmlFor="filter-date" className="disbursement-filter-label">
                Thời gian:
              </label>
              <select
                id="filter-date"
                className="disbursement-select"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                aria-label="Lọc theo thời gian"
              >
                <option value="ALL">Tất cả thời gian</option>
                <option value="TODAY">Hôm nay</option>
                <option value="WEEK">7 ngày gần nhất</option>
                <option value="MONTH">30 ngày gần nhất</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="disbursement-filter-select-wrap">
              <label htmlFor="filter-sort" className="disbursement-filter-label">
                Sắp xếp:
              </label>
              <select
                id="filter-sort"
                className="disbursement-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp danh sách"
              >
                <option value="NEWEST">Mới nhất trước</option>
                <option value="OLDEST">Cũ nhất trước</option>
                <option value="AMOUNT_DESC">Số tiền cao nhất</option>
                <option value="AMOUNT_ASC">Số tiền thấp nhất</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                className="disbursement-btn-reset"
                onClick={handleResetFilters}
                title="Xóa toàn bộ bộ lọc"
              >
                <CloseIcon size={14} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="disbursement-results-bar">
          <span className="disbursement-results-count">
            Hiển thị <strong>{filteredItems.length}</strong> yêu cầu giải ngân
            {hasActiveFilters && (
              <span className="disbursement-results-total"> (lọc từ {items.length} yêu cầu)</span>
            )}
          </span>
        </div>

        {/* Content body */}
        <div className="disbursement-table-container">
          {loading && !refreshing ? (
            <div className="disbursement-loading">
              <div className="disbursement-spinner"></div>
              <span>Đang tải danh sách yêu cầu giải ngân...</span>
            </div>
          ) : error ? (
            <div className="disbursement-error">
              <AlertTriangleIcon size={24} style={{ color: '#DC2626' }} />
              <p>{error}</p>
              <button
                type="button"
                className="disbursement-btn disbursement-btn--secondary"
                onClick={() => loadData()}
              >
                Thử lại
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="disbursement-empty">
              <CreditCardIcon size={48} style={{ color: '#94A3B8' }} />
              <h3>Không tìm thấy yêu cầu giải ngân</h3>
              <p>
                {hasActiveFilters
                  ? 'Không tìm thấy yêu cầu nào phù hợp với bộ lọc và từ khóa tìm kiếm hiện tại.'
                  : 'Hiện tại chưa có yêu cầu nào trong danh mục này.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="disbursement-btn disbursement-btn--secondary"
                  onClick={handleResetFilters}
                  style={{ marginTop: '0.75rem' }}
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <table className="disbursement-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Khách sạn &amp; Đối tác</th>
                  <th>Thông tin ngân hàng</th>
                  <th>Số tiền yêu cầu</th>
                  <th>Thời gian yêu cầu</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((row) => {
                  const shortId = row.withdrawal_id
                    ? `WD-${row.withdrawal_id.slice(0, 8).toUpperCase()}`
                    : '—';
                  const isPending = String(row.status_cd) === '1';
                  const isApproved = String(row.status_cd) === '2';
                  const isSettled = String(row.status_cd) === '4';
                  const isRejected = String(row.status_cd) === '5';

                  return (
                    <tr key={row.withdrawal_id}>
                      {/* Cột 1: Mã yêu cầu (Request ID) */}
                      <td>
                        <span className="disbursement-id-badge" title={row.withdrawal_id}>
                          {shortId}
                        </span>
                      </td>

                      {/* Cột 2: Khách sạn & Đối tác (Hotel & Vendor) */}
                      <td>
                        <div className="disbursement-hotel-cell">
                          <span className="disbursement-hotel-name">{row.hotel_name}</span>
                          <span className="disbursement-hotel-owner">
                            Chủ sở hữu: <strong>{row.owner_name}</strong>
                          </span>
                          <span className="disbursement-hotel-email">{row.owner_email || '—'}</span>
                        </div>
                      </td>

                      {/* Cột 3: Ngân hàng thụ hưởng (Bank Account) */}
                      <td>
                        <div className="disbursement-bank-cell">
                          <span className="disbursement-bank-name">
                            {row.bank_info?.bank_name || 'Ngân hàng'}
                          </span>
                          <span className="disbursement-bank-acc">
                            STK: <strong>{row.bank_info?.account_number || '—'}</strong>
                          </span>
                          <span className="disbursement-bank-holder">
                            Chủ TK: {row.bank_info?.account_holder || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Cột 4: Số tiền (Amount) */}
                      <td>
                        <div className="disbursement-amount-cell">
                          <span className="disbursement-amount">
                            {Number(row.amount).toLocaleString('vi-VN')}
                          </span>
                          <span className="disbursement-currency">VND</span>
                        </div>
                      </td>

                      {/* Cột 5: Thời gian (Request Date) */}
                      <td>
                        <div className="disbursement-date-cell">
                          <span>{formatDate(row.created_at)}</span>
                          {row.gateway_transaction_ref && (
                            <span className="disbursement-ref" title={row.gateway_transaction_ref}>
                              Mã GD: {row.gateway_transaction_ref}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 6: Trạng thái (Status) */}
                      <td>
                        <span
                          className={`disbursement-badge disbursement-badge--${row.status_color}`}
                        >
                          <span className="disbursement-badge__dot"></span>
                          {row.status_label}
                        </span>
                      </td>

                      {/* Cột 7: Thao tác quy trình (Actions: View Details, Accept, Reject) */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="disbursement-actions">
                          {/* 1. Nút Xem chi tiết (View Details) */}
                          <button
                            type="button"
                            className="disbursement-action-btn disbursement-action-btn--detail"
                            onClick={() => handleOpenDetail(row)}
                            title="Xem chi tiết đầy đủ của yêu cầu này"
                          >
                            <EyeIcon size={14} />
                            <span>Chi tiết</span>
                          </button>

                          {/* 2. Thao tác khi ở bước Chờ phê duyệt (Accept & Reject) */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="disbursement-action-btn disbursement-action-btn--approve"
                                onClick={() => handleOpenApproveModal(row)}
                                title="Phê duyệt yêu cầu này và chuyển sang Chờ thanh toán"
                              >
                                <CheckIcon size={14} />
                                <span>Phê duyệt</span>
                              </button>
                              <button
                                type="button"
                                className="disbursement-action-btn disbursement-action-btn--reject"
                                onClick={() => handleOpenRejectModal(row)}
                                title="Từ chối yêu cầu và hoàn trả tiền về ví khách sạn"
                              >
                                <CloseIcon size={13} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {/* 3. Thao tác khi ở bước Chờ thanh toán (Settle Payment) */}
                          {isApproved && (
                            <button
                              type="button"
                              className="disbursement-action-btn disbursement-action-btn--settle"
                              onClick={() => handleOpenSettleModal(row)}
                              title="Xác nhận hoàn tất chuyển khoản và quyết toán cho Vendor"
                            >
                              <CreditCardIcon size={14} />
                              <span>Chi trả</span>
                            </button>
                          )}

                          {/* 4. Đã quyết toán thành công */}
                          {isSettled && (
                            <span className="disbursement-settled-text">
                              ✓ Đã quyết toán
                            </span>
                          )}

                          {/* 5. Đã từ chối */}
                          {isRejected && (
                            <span className="disbursement-rejected-text">
                              ✕ Bị từ chối
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredItems.length > 0 && (
          <div className="disbursement-pagination-bar">
            <span className="disbursement-pagination-info">
              Hiển thị {paginatedItems.length ? (currentPage - 1) * pageSize + 1 : 0} – {Math.min(currentPage * pageSize, filteredItems.length)} trong số {filteredItems.length} yêu cầu
            </span>
            <div className="disbursement-pagination-controls">
              <button
                type="button"
                className="disbursement-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Trang trước"
              >
                ← Trước
              </button>
              <span className="disbursement-page-indicator">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="disbursement-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Trang sau"
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* 1. View Details Modal */}
      <DisbursementDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailRequest(null);
        }}
        request={detailRequest}
        onApprove={(req) => handleOpenApproveModal(req)}
        onReject={(req) => handleOpenRejectModal(req)}
        onSettle={(req) => handleOpenSettleModal(req)}
      />

      {/* 2. Approve Modal (Accept) */}
      <DisbursementApproveModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setApproveRequest(null);
        }}
        onConfirm={handleConfirmApprove}
        request={approveRequest}
        loading={approveLoading}
      />

      {/* 3. Reject Modal (Reject) */}
      <DisbursementRejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectRequest(null);
        }}
        onConfirm={handleConfirmReject}
        request={rejectRequest}
        loading={rejectLoading}
      />

      {/* 4. Settle Modal (Complete Payment) */}
      <DisbursementSettleModal
        isOpen={settleModalOpen}
        onClose={() => {
          setSettleModalOpen(false);
          setSettleRequest(null);
        }}
        onConfirm={handleConfirmSettle}
        onSettled={handleAutoSettled}
        request={settleRequest}
        loading={settleLoading}
      />
    </div>
  );
};

export default DisbursementManagementPage;
