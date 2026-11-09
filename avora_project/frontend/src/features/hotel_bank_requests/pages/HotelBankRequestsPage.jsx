import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  CreditCardIcon,
  SearchIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SpinnerIcon,
  HotelIcon,
} from '../../../common/components/icons';
import {
  fetchHotelBankRequests,
  applyHotelBankChange,
  fetchSystemBanks,
} from '../../../services/hotelBankRequestApi';
import HotelBankChangeModal from '../components/HotelBankChangeModal';
import './HotelBankRequestsPage.css';

const ExternalLinkIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};
const extractErrorMessage = (err, fallback = 'Không thể tải danh sách yêu cầu đổi tài khoản.') => {
  const backendMsg = err?.response?.data?.message;
  if (backendMsg && typeof backendMsg === 'string') return backendMsg;
  const rawMsg = err?.message || '';
  if (/failed to fetch|network|load failed/i.test(rawMsg)) {
    return 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
  }
  if (/internal server error|500/i.test(rawMsg)) {
    return 'Đã xảy ra lỗi hệ thống trên máy chủ. Vui lòng thử lại sau.';
  }
  return rawMsg || fallback;
};


const HotelBankRequestsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
    .trim().toUpperCase().replace(/[ -]+/g, '_');
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isAdmin = ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) || roleCd === '1';

  if (!authLoading && !isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }
  const [statusTab, setStatusTab] = useState('RSV'); // 'RSV', 'CLS', 'ALL'
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [systemBanks, setSystemBanks] = useState([]);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);

  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Tải danh mục ngân hàng trực tiếp từ m_system_code (BANK_CD)
  useEffect(() => {
    fetchSystemBanks()
      .then((banks) => setSystemBanks(banks || []))
      .catch((err) => console.warn('Could not load system banks from m_system_code:', err));
  }, []);
  // Tải danh sách yêu cầu
  const loadRequests = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchHotelBankRequests({
        page,
        limit: 10,
        status: statusTab,
        q: searchTerm,
      });
      setRequests(data?.items || []);
      setPagination(data?.pagination || { page: 1, limit: 10, total: 0, total_pages: 1 });
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tải danh sách yêu cầu đổi tài khoản.'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchTerm]);

  useEffect(() => {
    loadRequests(1);
  }, [loadRequests]);

  const handleOpenActionModal = (requestItem) => {
    setActiveRequest(requestItem);
    setModalOpen(true);
  };

  const handleApplyChange = async (payload) => {
    const result = await applyHotelBankChange(payload.ticketId, {
      bank_cd: payload.bank_cd,
      account_number: payload.account_number,
      account_holder: payload.account_holder,
      confirmed_with_hotel: payload.confirmed_with_hotel,
    });
    showToast(`Đã đổi tài khoản thành công cho khách sạn ${result.new_bank_account?.bank_name || ''}!`);
    loadRequests(pagination.page);
  };

  return (
    <div className="hb-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="hb-toast hb-toast--success" role="alert">
          <CheckCircleIcon size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="hb-header">
        <div className="hb-header-titles">
          <h1>
            <CreditCardIcon size={24} style={{ color: '#2563eb' }} />
            <span>Yêu cầu đổi tài khoản ngân hàng khách sạn</span>
          </h1>
          <p>
            Danh sách yêu cầu đổi tài khoản ngân hàng thụ hưởng (Ticket VBU) đã được duyệt, chờ Admin xác nhận và thực thi đổi.
          </p>
        </div>
        <div className="hb-header-actions">
          <button
            type="button"
            className="hb-btn-refresh"
            onClick={() => loadRequests(pagination.page)}
            disabled={loading}
            title="Làm mới danh sách"
          >
            <RefreshIcon size={15} className={loading ? 'avora-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* Control Bar: Tabs & Search */}
      <div className="hb-controls">
        <div className="hb-tabs">
          <button
            type="button"
            className={`hb-tab-btn ${statusTab === 'RSV' ? 'hb-tab-btn--active' : ''}`}
            onClick={() => setStatusTab('RSV')}
          >
            Chờ đổi tài khoản (Đã duyệt)
          </button>
          <button
            type="button"
            className={`hb-tab-btn ${statusTab === 'CLS' ? 'hb-tab-btn--active' : ''}`}
            onClick={() => setStatusTab('CLS')}
          >
            Đã hoàn tất (Đã đóng)
          </button>
          <button
            type="button"
            className={`hb-tab-btn ${statusTab === 'ALL' ? 'hb-tab-btn--active' : ''}`}
            onClick={() => setStatusTab('ALL')}
          >
            Tất cả
          </button>
        </div>

        <div className="hb-search-box">
          <span className="hb-search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="hb-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên KS, chủ KS, mã ticket..."
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="hb-alert hb-alert--error" role="alert">
          <AlertTriangleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="hb-table-card">
        {loading ? (
          <div className="hb-loading-box">
            <SpinnerIcon size={32} />
            <p>Đang tải danh sách yêu cầu...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="hb-empty-box">
            <div className="hb-empty-icon">
              <CreditCardIcon size={24} />
            </div>
            <h4>Không có yêu cầu đổi tài khoản nào</h4>
            <p>
              {statusTab === 'RSV'
                ? 'Hiện tại không có ticket xin đổi tài khoản ngân hàng nào ở trạng thái đã duyệt.'
                : 'Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hb-table-wrap">
              <table className="hb-table">
                <thead>
                  <tr>
                    <th>Mã Ticket</th>
                    <th>Khách sạn</th>
                    <th>Người yêu cầu</th>
                    <th>Thời gian duyệt</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => {
                    const isPendingAction = item.ticket_status_cd === 'RSV';
                    return (
                      <tr key={item.ticket_id}>
                        {/* 1. Mã Ticket */}
                        <td>
                          <div className="hb-cell-ticket">
                            <span className="hb-ticket-code">#{item.ticket_id.slice(0, 8)}</span>
                            <span className="hb-ticket-title" title={item.title}>
                              {item.title}
                            </span>
                          </div>
                        </td>

                        {/* 2. Khách sạn & STK hiện tại */}
                        <td>
                          <div className="hb-cell-hotel">
                            <span className="hb-hotel-name">
                              {item.hotel?.hotel_name || 'Khách sạn chưa xác định'}
                            </span>
                            {item.hotel?.current_bank ? (
                              <span className="hb-hotel-current-bank" title="Tài khoản hiện tại">
                                Hiện tại: {item.hotel.current_bank.bank_name || item.hotel.current_bank.bank_cd} - {item.hotel.current_bank.account_number}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                Chưa có tài khoản xác minh
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Người yêu cầu */}
                        <td>
                          <div className="hb-cell-requester">
                            <span className="hb-requester-name">
                              {item.requester?.full_name || '—'}
                            </span>
                            <span className="hb-requester-sub">
                              {item.requester?.phone || item.requester?.email || '—'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Thời gian duyệt */}
                        <td>
                          <div className="hb-cell-date">
                            {formatDate(item.resolved_at || item.created_at)}
                          </div>
                        </td>

                        {/* 5. Trạng thái */}
                        <td>
                          {isPendingAction ? (
                            <span className="hb-badge hb-badge--pending">
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b45309' }} />
                              <span>Chờ đổi STK</span>
                            </span>
                          ) : (
                            <span className="hb-badge hb-badge--completed">
                              <CheckCircleIcon size={13} />
                              <span>Đã hoàn tất</span>
                            </span>
                          )}
                        </td>

                        {/* 6. Thao tác */}
                        <td style={{ textAlign: 'right' }}>
                          {isPendingAction ? (
                            <button
                              type="button"
                              className="hb-btn-action"
                              onClick={() => handleOpenActionModal(item)}
                            >
                              <span>Thao tác</span>
                            </button>
                          ) : (
                            <a
                              href={`/dashboard/support?ticketId=${encodeURIComponent(item.ticket_id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hb-btn-action hb-btn-action--outline"
                              style={{ textDecoration: 'none' }}
                            >
                              <span>Xem Ticket</span>
                              <ExternalLinkIcon size={13} />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="hb-pagination">
                <span>
                  Trang <strong>{pagination.page}</strong> / <strong>{pagination.total_pages}</strong> (Tổng cộng {pagination.total} yêu cầu)
                </span>
                <div className="hb-pagination-actions">
                  <button
                    type="button"
                    className="hb-page-btn"
                    disabled={pagination.page <= 1}
                    onClick={() => loadRequests(pagination.page - 1)}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="hb-page-btn"
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => loadRequests(pagination.page + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal thao tác đổi tài khoản */}
      <HotelBankChangeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        request={activeRequest}
        systemBanks={systemBanks}
        onSubmit={handleApplyChange}
      />
    </div>
  );
};

export default HotelBankRequestsPage;
