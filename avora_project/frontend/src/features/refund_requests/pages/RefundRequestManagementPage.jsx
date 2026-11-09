import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchBusinessRefundOverview,
  createRefundFromTicket,
  updateRefundRequestInfo,
  settleRefundManually,
} from '../../../services/refundRequestApi';
import CreateRefundFromTicketModal from '../components/CreateRefundFromTicketModal';
import RefundSettleModal from '../components/RefundSettleModal';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BuildingIcon,
  InfoIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  SearchIcon,
} from '../../../common/components/icons';
import '../../disbursements/pages/DisbursementManagementPage.css';

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const raw = String(dateStr);
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RefundRequestManagementPage = () => {
  const [summary, setSummary] = useState(null);
  const [approvedTickets, setApprovedTickets] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // 3 tabs: APPROVED_TICKETS | PENDING_REQUESTS | COMPLETED_REQUESTS
  const [activeTab, setActiveTab] = useState('PENDING_REQUESTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState('FROM_TICKET'); // 'FROM_TICKET' | 'EDIT_REFUND'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedRefundForEdit, setSelectedRefundForEdit] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleRequest, setSettleRequest] = useState(null);
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchBusinessRefundOverview();
      setSummary(data?.summary || null);
      setApprovedTickets(data?.approved_tickets || []);
      setPendingRequests(data?.pending_requests || []);
      setCompletedRequests(data?.completed_requests || []);
    } catch (err) {
      console.error('Lỗi tải danh sách hoàn tiền:', err);
      setError(err.message || 'Không thể tải danh sách quản lý hoàn tiền.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, sourceFilter, bankFilter, sortBy]);

  const uniqueBanks = useMemo(() => {
    const map = new Map();
    [...pendingRequests, ...completedRequests].forEach((r) => {
      if (r.bank_cd && r.bank_name && !map.has(String(r.bank_cd))) {
        map.set(String(r.bank_cd), r.bank_name);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [pendingRequests, completedRequests]);

  const currentItems = useMemo(() => {
    const baseList =
      activeTab === 'APPROVED_TICKETS'
        ? approvedTickets
        : activeTab === 'PENDING_REQUESTS'
          ? pendingRequests
          : completedRequests;

    let result = [...baseList];

    // 1. Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((item) => {
        if (activeTab === 'APPROVED_TICKETS') {
          const tCode = (item.ticket_code || '').toLowerCase();
          const title = (item.title || '').toLowerCase();
          const cName = (item.customer?.full_name || '').toLowerCase();
          const cEmail = (item.customer?.email || '').toLowerCase();
          const cPhone = (item.customer?.phone || '').toLowerCase();
          const bCode = (item.booking?.booking_code || '').toLowerCase();
          const hName = (item.booking?.hotel_name || '').toLowerCase();
          const accNum = (item.customer?.refund_account_number || '').toLowerCase();
          return (
            tCode.includes(term) ||
            title.includes(term) ||
            cName.includes(term) ||
            cEmail.includes(term) ||
            cPhone.includes(term) ||
            bCode.includes(term) ||
            hName.includes(term) ||
            accNum.includes(term)
          );
        }

        const rCode = (item.refund_code || '').toLowerCase();
        const tCode = (item.ticket_code || '').toLowerCase();
        const bCode = (item.booking_code || '').toLowerCase();
        const hName = (item.hotel_name || '').toLowerCase();
        const cName = (item.customer_name || '').toLowerCase();
        const cEmail = (item.customer_email || '').toLowerCase();
        const cPhone = (item.customer_phone || '').toLowerCase();
        const accNum = (item.account_number || '').toLowerCase();
        const accHolder = (item.account_holder || '').toLowerCase();
        const payCode = (item.payment_code || '').toLowerCase();
        const refCode = (item.gateway_refund_ref || '').toLowerCase();

        return (
          rCode.includes(term) ||
          tCode.includes(term) ||
          bCode.includes(term) ||
          hName.includes(term) ||
          cName.includes(term) ||
          cEmail.includes(term) ||
          cPhone.includes(term) ||
          accNum.includes(term) ||
          accHolder.includes(term) ||
          payCode.includes(term) ||
          refCode.includes(term)
        );
      });
    }

    // 2. Source & Bank filter (applies to Pending & Completed refund requests)
    if (activeTab !== 'APPROVED_TICKETS') {
      if (sourceFilter !== 'ALL') {
        result = result.filter((item) => item.source_type === sourceFilter);
      }
      if (bankFilter !== 'ALL') {
        result = result.filter((item) => String(item.bank_cd) === String(bankFilter));
      }
    }

    // 3. Sort
    result.sort((a, b) => {
      const timeA = new Date(a.paid_at || a.resolved_at || a.created_at || 0).getTime();
      const timeB = new Date(b.paid_at || b.resolved_at || b.created_at || 0).getTime();
      const amtA = Number(a.refund_amount ?? a.suggestion?.suggested_refund_amount ?? 0);
      const amtB = Number(b.refund_amount ?? b.suggestion?.suggested_refund_amount ?? 0);

      switch (sortBy) {
        case 'OLDEST':
          return timeA - timeB;
        case 'AMOUNT_DESC':
          return amtB - amtA;
        case 'AMOUNT_ASC':
          return amtA - amtB;
        case 'NEWEST':
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [
    activeTab,
    approvedTickets,
    pendingRequests,
    completedRequests,
    searchTerm,
    sourceFilter,
    bankFilter,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(currentItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || sourceFilter !== 'ALL' || bankFilter !== 'ALL' || sortBy !== 'NEWEST'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSourceFilter('ALL');
    setBankFilter('ALL');
    setSortBy('NEWEST');
  };

  // Open modal to create refund request from an approved RFD ticket
  const handleOpenCreateFromTicket = (ticketRow) => {
    setSelectedTicket(ticketRow);
    setSelectedRefundForEdit(null);
    setFormModalMode('FROM_TICKET');
    setFormModalOpen(true);
  };

  // Open modal to edit bank / amount of a pending refund request
  const handleOpenEditRefund = (refundRow) => {
    setSelectedRefundForEdit(refundRow);
    setSelectedTicket(null);
    setFormModalMode('EDIT_REFUND');
    setFormModalOpen(true);
  };

  const handleSubmitFormModal = async (payload) => {
    setFormSubmitting(true);
    try {
      if (formModalMode === 'FROM_TICKET' && selectedTicket) {
        await createRefundFromTicket(selectedTicket.ticket_id, payload);
        showToast(
          payload.merge_existing_refund_id
            ? 'Đã gộp & cập nhật thông tin từ Support Ticket vào lệnh hoàn tiền đang chờ!'
            : 'Đã tạo lệnh hoàn tiền mới từ Support Ticket thành công!',
          'success'
        );
        setFormModalOpen(false);
        setSelectedTicket(null);
        setActiveTab('PENDING_REQUESTS');
        await loadData(true);
      } else if (formModalMode === 'EDIT_REFUND' && selectedRefundForEdit) {
        await updateRefundRequestInfo(selectedRefundForEdit.refund_id, payload);
        showToast('Đã cập nhật thông tin Ngân hàng & Số tiền hoàn thành công!', 'success');
        setFormModalOpen(false);
        setSelectedRefundForEdit(null);
        await loadData(true);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenSettleModal = (refundRow) => {
    if (!refundRow.has_bank_info) {
      showToast(
        'Yêu cầu này chưa đủ Ngân hàng / Số tài khoản. Vui lòng cập nhật STK trước khi quét QR hoàn tiền.',
        'error'
      );
      handleOpenEditRefund(refundRow);
      return;
    }
    setSettleRequest(refundRow);
    setSettleModalOpen(true);
  };

  const handleConfirmManualSettle = async (payload) => {
    if (!settleRequest) return;
    setSettleSubmitting(true);
    try {
      await settleRefundManually(settleRequest.refund_id, payload);
      showToast('Đã xác nhận hoàn tiền thủ công cho khách hàng thành công!', 'success');
      setSettleModalOpen(false);
      setSettleRequest(null);
      await loadData(true);
    } catch (err) {
      showToast(err.message || 'Xác nhận hoàn tiền thất bại.', 'error');
    } finally {
      setSettleSubmitting(false);
    }
  };

  const handleAutoSettled = () => {
    showToast('SePay đã xác nhận chuyển tiền hoàn thành công (AVRRF)!', 'success');
    loadData(true);
  };

  const tabs = [
    {
      key: 'APPROVED_TICKETS',
      label: 'Support Ticket hoàn tiền đã duyệt',
      count: summary?.approved_tickets_count ?? approvedTickets.length,
      badgeColor: '#D97706',
    },
    {
      key: 'PENDING_REQUESTS',
      label: 'Refund Request đang chờ (PND)',
      count: summary?.pending_refunds_count ?? pendingRequests.length,
      badgeColor: '#2563EB',
    },
    {
      key: 'COMPLETED_REQUESTS',
      label: 'Đã hoàn tiền thành công (SUC)',
      count: summary?.completed_refunds_count ?? completedRequests.length,
      badgeColor: '#059669',
    },
  ];

  return (
    <div className="disbursement-page">
      {toast.message && (
        <div className={`disbursement-toast disbursement-toast--${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircleIcon size={18} />
          ) : (
            <AlertTriangleIcon size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="disbursement-breadcrumb" aria-label="Breadcrumb">
        <span>BẢNG ĐIỀU KHIỂN</span>
        <span className="disbursement-breadcrumb__sep">/</span>
        <span>MARKETING &amp; DOANH THU</span>
        <span className="disbursement-breadcrumb__sep">/</span>
        <span className="disbursement-breadcrumb__active">Quản lý hoàn tiền khách hàng</span>
      </nav>

      {/* Hero Header */}
      <div className="disbursement-hero">
        <div className="disbursement-hero__content">
          <div className="disbursement-hero__title-row">
            <span className="disbursement-role-badge">BUSINESS MANAGER</span>
            <h1 className="disbursement-hero__title">Quản lý Hoàn tiền Khách hàng (AVRRF)</h1>
          </div>
          <p className="disbursement-hero__desc">
            Tiếp nhận các phiếu hỗ trợ hoàn tiền đã giải quyết (RFD + RSV), quản lý danh sách lệnh
            hoàn tiền từ đơn đặt phòng bị hủy và chi trả tự động qua VietQR + SePay Outgoing Webhook
            với mã định danh <strong>AVRRF</strong>.
          </p>
        </div>
        <div className="disbursement-hero__actions">
          <button
            type="button"
            className="disbursement-btn disbursement-btn--secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCwIcon size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="disbursement-stats-grid">
        <div
          className="disbursement-stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('APPROVED_TICKETS')}
        >
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--pending">
            <InfoIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Ticket RFD đã duyệt</span>
            <h3 className="disbursement-stat-card__value">
              {summary?.approved_tickets_count ?? approvedTickets.length} phiếu
            </h3>
            <span className="disbursement-stat-card__sub">
              Chờ Business Manager tạo lệnh hoàn tiền
            </span>
          </div>
        </div>

        <div
          className="disbursement-stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('PENDING_REQUESTS')}
        >
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--payment">
            <CreditCardIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Đang chờ hoàn tiền (PND)</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(summary?.pending_refunds_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {summary?.pending_refunds_count ?? pendingRequests.length} lệnh từ Ticket &amp; Đơn hủy
            </span>
          </div>
        </div>

        <div
          className="disbursement-stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('COMPLETED_REQUESTS')}
        >
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--settled">
            <CheckCircleIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Đã hoàn tiền (SUC)</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(summary?.completed_refunds_amount)}
            </h3>
            <span className="disbursement-stat-card__sub">
              {summary?.completed_refunds_count ?? completedRequests.length} lệnh đã chi trả thành công
            </span>
          </div>
        </div>

        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--total">
            <BuildingIcon size={22} />
          </div>
          <div className="disbursement-stat-card__info">
            <span className="disbursement-stat-card__label">Tổng giá trị xử lý</span>
            <h3 className="disbursement-stat-card__value">
              {formatCurrency(
                Number(summary?.pending_refunds_amount || 0) +
                Number(summary?.completed_refunds_amount || 0)
              )}
            </h3>
            <span className="disbursement-stat-card__sub">
              {(summary?.pending_refunds_count || 0) + (summary?.completed_refunds_count || 0)} tổng
              số lệnh hoàn tiền
            </span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="disbursement-main-card">
        {/* Tabs Bar */}
        <div className="disbursement-tabs-bar">
          <div className="disbursement-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  className={`disbursement-tab ${isActive ? 'disbursement-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
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
        </div>

        {/* Search & Filter Toolbar */}
        <div className="disbursement-toolbar">
          <div className="disbursement-search-wrap">
            <SearchIcon size={16} className="disbursement-search-icon" />
            <input
              type="text"
              className="disbursement-search-input"
              placeholder={
                activeTab === 'APPROVED_TICKETS'
                  ? 'Tìm theo mã Ticket (TK-...), mã đơn (BK-...), tên khách hàng, SĐT, STK...'
                  : 'Tìm theo mã hoàn tiền (RF-...), mã AVRRF, mã đơn, khách hàng, STK, mã FT...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="disbursement-search-clear"
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          <div className="disbursement-filter-group">
            {activeTab !== 'APPROVED_TICKETS' && (
              <>
                <div className="disbursement-filter-select-wrap">
                  <label className="disbursement-filter-label">Nguồn:</label>
                  <select
                    className="disbursement-select"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả nguồn</option>
                    <option value="TICKET">Từ Support Ticket (RFD)</option>
                    <option value="BOOKING_CANCEL">Từ đơn đặt phòng bị hủy</option>
                  </select>
                </div>

                <div className="disbursement-filter-select-wrap">
                  <label className="disbursement-filter-label">Ngân hàng:</label>
                  <select
                    className="disbursement-select"
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả ngân hàng</option>
                    {uniqueBanks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="disbursement-filter-select-wrap">
              <label className="disbursement-filter-label">Sắp xếp:</label>
              <select
                className="disbursement-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="NEWEST">Mới nhất trước</option>
                <option value="OLDEST">Cũ nhất trước</option>
                <option value="AMOUNT_DESC">Số tiền cao nhất</option>
                <option value="AMOUNT_ASC">Số tiền thấp nhất</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="disbursement-btn-reset"
                onClick={handleResetFilters}
              >
                <CloseIcon size={14} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="disbursement-results-bar">
          <span className="disbursement-results-count">
            Hiển thị <strong>{currentItems.length}</strong> bản ghi trong danh mục hiện tại
          </span>
        </div>

        {/* Table Content */}
        <div className="disbursement-table-container">
          {loading && !refreshing ? (
            <div className="disbursement-loading">
              <div className="disbursement-spinner"></div>
              <span>Đang tải dữ liệu quản lý hoàn tiền...</span>
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
          ) : currentItems.length === 0 ? (
            <div className="disbursement-empty">
              <CreditCardIcon size={48} style={{ color: '#94A3B8' }} />
              <h3>
                {activeTab === 'APPROVED_TICKETS'
                  ? 'Không có Support Ticket hoàn tiền nào đang chờ tạo lệnh'
                  : activeTab === 'PENDING_REQUESTS'
                    ? 'Không có yêu cầu hoàn tiền nào đang chờ thanh toán'
                    : 'Chưa có lịch sử hoàn tiền thành công'}
              </h3>
              <p>
                {hasActiveFilters
                  ? 'Không có bản ghi nào khớp với bộ lọc hiện tại.'
                  : activeTab === 'APPROVED_TICKETS'
                    ? 'Khi Admin giải quyết (RSV) một phiếu hỗ trợ thuộc loại Yêu cầu hoàn tiền (RFD), phiếu đó sẽ xuất hiện tại đây.'
                    : 'Các lệnh hoàn tiền từ Support Ticket và từ đơn đặt phòng bị hủy sẽ hiển thị tại đây.'}
              </p>
            </div>
          ) : activeTab === 'APPROVED_TICKETS' ? (
            /* ─── TAB 1 TABLE: APPROVED SUPPORT TICKETS (RFD + RSV) ─── */
            <table className="disbursement-table">
              <thead>
                <tr>
                  <th>Mã Ticket</th>
                  <th>Khách hàng &amp; Nội dung</th>
                  <th>Đơn đặt phòng liên kết</th>
                  <th>STK hoàn tiền (m_user)</th>
                  <th>Gợi ý số tiền hoàn</th>
                  <th>Thời gian duyệt</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((t) => (
                  <tr key={t.ticket_id}>
                    <td>
                      <span className="disbursement-id-badge" title={t.ticket_id}>
                        {t.ticket_code}
                      </span>
                    </td>
                    <td>
                      <div className="disbursement-hotel-cell">
                        <span className="disbursement-hotel-name">{t.title}</span>
                        <span className="disbursement-hotel-owner">
                          Khách hàng: <strong>{t.customer?.full_name}</strong>
                        </span>
                        <span className="disbursement-hotel-email">
                          {t.customer?.email || t.customer?.phone || '—'}
                        </span>
                        {t.existing_pending_refund && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              fontSize: '0.74rem',
                              color: '#B45309',
                              background: '#FEF3C7',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ⚠ Đơn này đã có 1 lệnh PND chờ hoàn (
                            {formatCurrency(t.existing_pending_refund.refund_amount)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {t.booking ? (
                        <div className="disbursement-hotel-cell">
                          <span className="disbursement-hotel-name">{t.booking.booking_code}</span>
                          <span className="disbursement-hotel-owner">{t.booking.hotel_name}</span>
                          <span className="disbursement-hotel-email">
                            Đã TT: {formatCurrency(t.booking.paid_amount)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.82rem' }}>
                          Không gắn mã đơn
                        </span>
                      )}
                    </td>
                    <td>
                      {t.customer?.has_refund_bank ? (
                        <div className="disbursement-bank-cell">
                          <span className="disbursement-bank-name">
                            {t.customer.refund_bank_name}
                          </span>
                          <span className="disbursement-bank-acc">
                            STK: <strong>{t.customer.refund_account_number}</strong>
                          </span>
                          <span className="disbursement-bank-holder">
                            Chủ TK: {t.customer.refund_account_holder}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="disbursement-badge disbursement-badge--amber"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Chưa lưu STK trong m_user
                        </span>
                      )}
                    </td>
                    <td>
                      {t.suggestion?.suggested_refund_amount > 0 ? (
                        <div className="disbursement-amount-cell">
                          <span className="disbursement-amount">
                            {Number(t.suggestion.suggested_refund_amount).toLocaleString('vi-VN')}
                          </span>
                          <span className="disbursement-currency">VND</span>
                          {t.suggestion.penalty_rate > 0 && (
                            <div style={{ fontSize: '0.73rem', color: '#D97706' }}>
                              (Phí hủy {t.suggestion.penalty_rate}%)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.82rem' }}>
                          BMR nhập khi tạo lệnh
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="disbursement-date-cell">
                        <span>{formatDate(t.resolved_at || t.created_at)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="disbursement-actions">
                        <button
                          type="button"
                          className="disbursement-action-btn disbursement-action-btn--approve"
                          onClick={() => handleOpenCreateFromTicket(t)}
                        >
                          <CheckIcon size={14} />
                          <span>Tạo Refund Request</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ─── TAB 2 & TAB 3 TABLE: PENDING & COMPLETED REFUND REQUESTS ─── */
            <table className="disbursement-table">
              <thead>
                <tr>
                  <th>Mã lệnh / Nguồn</th>
                  <th>Khách hàng &amp; Đơn đặt phòng</th>
                  <th>Tài khoản nhận hoàn tiền</th>
                  <th>Số tiền hoàn</th>
                  <th>Mã AVRRF / Đối soát</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((row) => (
                  <tr key={row.refund_id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="disbursement-id-badge" title={row.refund_id}>
                          {row.refund_code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            color: row.source_type === 'TICKET' ? '#7C3AED' : '#0369A1',
                          }}
                        >
                          {row.source_label}
                        </span>
                        {row.ticket_code && (
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Ticket: {row.ticket_code}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="disbursement-hotel-cell">
                        <span className="disbursement-hotel-name">{row.customer_name}</span>
                        <span className="disbursement-hotel-owner">
                          {row.booking_code ? `${row.booking_code} · ` : ''}
                          <strong>{row.hotel_name}</strong>
                        </span>
                        <span className="disbursement-hotel-email">
                          {row.customer_email || row.customer_phone || '—'}
                        </span>
                      </div>
                    </td>

                    <td>
                      {row.has_bank_info ? (
                        <div className="disbursement-bank-cell">
                          <span className="disbursement-bank-name">{row.bank_name}</span>
                          <span className="disbursement-bank-acc">
                            STK: <strong>{row.account_number}</strong>
                          </span>
                          <span className="disbursement-bank-holder">
                            Chủ TK: {row.account_holder}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="disbursement-badge disbursement-badge--amber">
                            Thiếu thông tin STK
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                            Cần cập nhật STK trước khi quét QR
                          </span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="disbursement-amount-cell">
                        <span className="disbursement-amount">
                          {Number(row.refund_amount || 0).toLocaleString('vi-VN')}
                        </span>
                        <span className="disbursement-currency">VND</span>
                      </div>
                    </td>

                    <td>
                      <div className="disbursement-date-cell">
                        {row.payment_code ? (
                          <span className="disbursement-id-badge" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                            {row.payment_code}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                            Sinh tự động khi mở QR
                          </span>
                        )}
                        {row.gateway_refund_ref && (
                          <span className="disbursement-ref" title={row.gateway_refund_ref}>
                            Mã GD: {row.gateway_refund_ref}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {row.is_settled
                            ? `Hoàn lúc: ${formatDate(row.paid_at || row.updated_at)}`
                            : `Tạo lúc: ${formatDate(row.created_at)}`}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`disbursement-badge disbursement-badge--${row.is_settled ? 'green' : 'amber'
                          }`}
                      >
                        <span className="disbursement-badge__dot"></span>
                        {row.status_label}
                      </span>
                      {row.is_settled && row.settlement_source && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px', fontWeight: 600 }}>
                          {row.settlement_source === 'SEPAY' ? 'Ghi nhận tự động' : 'Thủ công (FT)'}
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className="disbursement-actions">
                        {row.is_pending && (
                          <>
                            <button
                              type="button"
                              className="disbursement-action-btn disbursement-action-btn--settle"
                              onClick={() => handleOpenSettleModal(row)}
                              title="Mở mã VietQR (AVRRF) để quét chuyển tiền hoàn cho khách"
                            >
                              <CreditCardIcon size={14} />
                              <span>Thanh toán hoàn tiền</span>
                            </button>
                            <button
                              type="button"
                              className="disbursement-action-btn disbursement-action-btn--detail"
                              onClick={() => handleOpenEditRefund(row)}
                              title="Cập nhật Ngân hàng / STK / Số tiền hoàn"
                            >
                              <span>Sửa STK / Số tiền</span>
                            </button>
                          </>
                        )}
                        {row.is_settled && (
                          <span className="disbursement-settled-text">✓ Đã hoàn tiền</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {currentItems.length > 0 && (
          <div className="disbursement-pagination-bar">
            <span className="disbursement-pagination-info">
              Hiển thị {paginatedItems.length ? (currentPage - 1) * pageSize + 1 : 0} –{' '}
              {Math.min(currentPage * pageSize, currentItems.length)} trong số {currentItems.length}{' '}
              bản ghi
            </span>
            <div className="disbursement-pagination-controls">
              <button
                type="button"
                className="disbursement-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
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
              >
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Create Refund from Ticket OR Edit Pending Refund Bank/Amount */}
      <CreateRefundFromTicketModal
        isOpen={formModalOpen}
        mode={formModalMode}
        ticket={selectedTicket}
        refundItem={selectedRefundForEdit}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedTicket(null);
          setSelectedRefundForEdit(null);
        }}
        onSubmit={handleSubmitFormModal}
        loading={formSubmitting}
      />

      {/* Modal 2: VietQR Payout (AVRRF) + SePay Polling + Manual FT Settlement */}
      <RefundSettleModal
        isOpen={settleModalOpen}
        request={settleRequest}
        onClose={() => {
          setSettleModalOpen(false);
          setSettleRequest(null);
        }}
        onConfirm={handleConfirmManualSettle}
        onSettled={handleAutoSettled}
        onNeedBankUpdate={(req) => handleOpenEditRefund(req)}
        loading={settleSubmitting}
      />
    </div>
  );
};

export default RefundRequestManagementPage;

