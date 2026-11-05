import React, { useState, useEffect, useCallback } from 'react';
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

  // Load data from Backend API
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchBusinessDisbursements({
        status: activeTab,
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
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      {/* Main Card with Tabs & Table */}
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
          ) : items.length === 0 ? (
            <div className="disbursement-empty">
              <CreditCardIcon size={48} style={{ color: '#94A3B8' }} />
              <h3>Không tìm thấy yêu cầu giải ngân</h3>
              <p>Hiện tại chưa có yêu cầu nào trong danh mục này.</p>
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
                {items.map((row) => {
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
