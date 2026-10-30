import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchBusinessDisbursements,
  approveDisbursement,
  settleDisbursement,
  rejectDisbursement,
} from '../../../services/disbursementApi';
import DisbursementSettleModal from '../components/DisbursementSettleModal';
import DisbursementRejectModal from '../components/DisbursementRejectModal';
import {
  RefreshCwIcon,
  SearchIcon,
  CheckCircleIcon,
  CreditCardIcon,
  BuildingIcon,
  DownloadIcon,
  InfoIcon,
} from '../../../common/components/icons';
import ExcelJS from 'exceljs';
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

  // Filters & Tabs
  // TABS: PENDING_APPROVAL (1), PENDING_PAYMENT (2), SETTLEMENT (4), ALL
  const [activeTab, setActiveTab] = useState('PENDING_APPROVAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modals
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleRequest, setSettleRequest] = useState(null);
  const [settleLoading, setSettleLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Load data from Backend API
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchBusinessDisbursements({
        status: activeTab,
        search: debouncedSearch,
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
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab 1: Approve request (PND -> APR / Pending Payment)
  const handleApprove = async (request) => {
    if (actionLoadingId) return;
    const confirmApprove = window.confirm(
      `Bạn có chắc chắn muốn phê duyệt yêu cầu giải ngân ${formatCurrency(request.amount)} của khách sạn "${request.hotel_name}"?\n\nYêu cầu sẽ được chuyển sang tab "Chờ thanh toán" để thực hiện đối soát chi trả.`
    );
    if (!confirmApprove) return;

    setActionLoadingId(request.withdrawal_id);
    try {
      await approveDisbursement(request.withdrawal_id);
      showToast('Phê duyệt yêu cầu thành công! Đã tự động chuyển sang Chờ thanh toán.', 'success');
      await loadData(true);
    } catch (err) {
      showToast(err.message || 'Phê duyệt thất bại.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Tab 2: Settle / Complete Payment (APR -> CMP / Settled)
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

  // Reject Request (PND -> REJ)
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

  // Excel Export
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Giai_Ngan_Vendor');

      worksheet.columns = [
        { header: 'Mã yêu cầu', key: 'id', width: 36 },
        { header: 'Khách sạn', key: 'hotel', width: 25 },
        { header: 'Chủ sở hữu', key: 'owner', width: 22 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Ngân hàng', key: 'bank', width: 18 },
        { header: 'Số tài khoản', key: 'acc_no', width: 18 },
        { header: 'Tên thụ hưởng', key: 'acc_name', width: 22 },
        { header: 'Số tiền (VND)', key: 'amount', width: 18 },
        { header: 'Trạng thái', key: 'status', width: 18 },
        { header: 'Mã GD / Biên nhận', key: 'ref', width: 22 },
        { header: 'Ngày tạo', key: 'created_at', width: 20 },
      ];

      items.forEach((item) => {
        worksheet.addRow({
          id: item.withdrawal_id,
          hotel: item.hotel_name,
          owner: item.owner_name,
          email: item.owner_email,
          bank: item.bank_info?.bank_name || '',
          acc_no: item.bank_info?.account_number || '',
          acc_name: item.bank_info?.account_holder || '',
          amount: item.amount,
          status: item.status_label,
          ref: item.gateway_transaction_ref || '',
          created_at: formatDate(item.created_at),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Giai_Ngan_Vendor_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Xuất báo cáo Excel giải ngân thành công!', 'success');
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      showToast('Lỗi khi xuất file Excel.', 'error');
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
          {toast.message}
        </div>
      )}

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
            className="disbursement-btn disbursement-btn--secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          <button
            className="disbursement-btn disbursement-btn--primary"
            onClick={handleExportExcel}
            disabled={items.length === 0}
            title="Xuất danh sách ra Excel"
          >
            <DownloadIcon />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="disbursement-stats-grid">
        <div className="disbursement-stat-card">
          <div className="disbursement-stat-card__icon disbursement-stat-card__icon--pending">
            <InfoIcon />
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
            <CreditCardIcon />
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
            <CheckCircleIcon />
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
            <BuildingIcon />
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

      {/* Main Card with Tabs & Table */}
      <div className="disbursement-main-card">
        {/* Navigation Tabs */}
        <div className="disbursement-tabs-bar">
          <div className="disbursement-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
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

          {/* Search box */}
          <div className="disbursement-search">
            <SearchIcon className="disbursement-search__icon" />
            <input
              type="text"
              className="disbursement-search__input"
              placeholder="Tìm theo tên KS, chủ sở hữu, STK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="disbursement-search__clear"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
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
              <p>{error}</p>
              <button
                className="disbursement-btn disbursement-btn--secondary"
                onClick={() => loadData()}
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="disbursement-empty">
              <CreditCardIcon style={{ width: '48px', height: '48px', color: '#94A3B8' }} />
              <h3>Không tìm thấy yêu cầu giải ngân</h3>
              <p>
                {debouncedSearch
                  ? `Không có kết quả nào khớp với từ khóa "${debouncedSearch}".`
                  : 'Hiện tại chưa có yêu cầu nào trong danh mục này.'}
              </p>
            </div>
          ) : (
            <table className="disbursement-table">
              <thead>
                <tr>
                  <th>Khách sạn & Đối tác</th>
                  <th>Thông tin ngân hàng</th>
                  <th>Số tiền yêu cầu</th>
                  <th>Thời gian yêu cầu</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const isActionLoading = actionLoadingId === row.withdrawal_id;
                  return (
                    <tr key={row.withdrawal_id}>
                      {/* Cột 1: Khách sạn & Đối tác */}
                      <td>
                        <div className="disbursement-hotel-cell">
                          <span className="disbursement-hotel-name">{row.hotel_name}</span>
                          <span className="disbursement-hotel-owner">
                            Chủ sở hữu: <strong>{row.owner_name}</strong>
                          </span>
                          <span className="disbursement-hotel-email">{row.owner_email}</span>
                        </div>
                      </td>

                      {/* Cột 2: Ngân hàng thụ hưởng */}
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

                      {/* Cột 3: Số tiền */}
                      <td>
                        <div className="disbursement-amount-cell">
                          <span className="disbursement-amount">
                            {Number(row.amount).toLocaleString('vi-VN')}
                          </span>
                          <span className="disbursement-currency">VND</span>
                        </div>
                      </td>

                      {/* Cột 4: Thời gian */}
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

                      {/* Cột 5: Trạng thái */}
                      <td>
                        <span
                          className={`disbursement-badge disbursement-badge--${row.status_color}`}
                        >
                          {row.status_label}
                        </span>
                      </td>

                      {/* Cột 6: Thao tác quy trình */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="disbursement-actions">
                          {/* Bước 1: Duyệt yêu cầu (PND -> APR / Pending Payment) */}
                          {row.status_cd === '1' && (
                            <>
                              <button
                                className="disbursement-action-btn disbursement-action-btn--approve"
                                onClick={() => handleApprove(row)}
                                disabled={isActionLoading}
                                title="Phê duyệt yêu cầu này và chuyển sang Chờ thanh toán"
                              >
                                {isActionLoading ? '...' : '✓ Phê duyệt'}
                              </button>
                              <button
                                className="disbursement-action-btn disbursement-action-btn--reject"
                                onClick={() => handleOpenRejectModal(row)}
                                disabled={isActionLoading}
                                title="Từ chối yêu cầu và hoàn trả tiền về ví khách sạn"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {/* Bước 2: Hoàn tất chi trả / Quyết toán (APR -> CMP / Settled) */}
                          {row.status_cd === '2' && (
                            <button
                              className="disbursement-action-btn disbursement-action-btn--settle"
                              onClick={() => handleOpenSettleModal(row)}
                              title="Xác nhận hoàn tất chuyển khoản và quyết toán cho Vendor"
                            >
                              💳 Xác nhận chi trả
                            </button>
                          )}

                          {/* Bước 3: Đã giải ngân (CMP) */}
                          {row.status_cd === '4' && (
                            <span className="disbursement-settled-text">
                              ✓ Đã quyết toán
                            </span>
                          )}

                          {/* Trạng thái khác: Đã từ chối */}
                          {row.status_cd === '5' && (
                            <span className="disbursement-rejected-text">
                              ✕ Đã từ chối
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
      </div>

      {/* Settle Modal */}
      <DisbursementSettleModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        onConfirm={handleConfirmSettle}
        request={settleRequest}
        loading={settleLoading}
      />

      {/* Reject Modal */}
      <DisbursementRejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
        request={rejectRequest}
        loading={rejectLoading}
      />
    </div>
  );
};

export default DisbursementManagementPage;

