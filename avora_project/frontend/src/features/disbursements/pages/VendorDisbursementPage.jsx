import React, { useEffect, useState, useMemo } from 'react';
import {
  createVendorDisbursementRequest,
  fetchVendorDisbursementHistory,
  fetchVendorDisbursementOverview,
} from '../../../services/disbursementApi';
import {
  RefreshCwIcon,
  SearchIcon,
  PlusIcon,
  CreditCardIcon,
  BuildingIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CloseIcon,
  InfoIcon,
} from '../../../common/components/icons';
import './VendorDisbursementPage.css';

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const VendorDisbursementPage = () => {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [hotelId, setHotelId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [reloadKey, setReloadKey] = useState(0);
  const [requestFormOpen, setRequestFormOpen] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | PENDING | COMPLETED
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchVendorDisbursementOverview(hotelId || null);
        if (!active) return;
        setOverview(data);
        const currentHotelId = hotelId || data.hotel?.hotel_id || data.hotels?.[0]?.hotel_id || '';
        if (!hotelId && currentHotelId) {
          setHotelId(currentHotelId);
          return;
        }
        const requests = currentHotelId ? await fetchVendorDisbursementHistory(currentHotelId) : [];
        if (active) setHistory(requests || []);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Không thể tải thông tin ví và giải ngân.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [hotelId, reloadKey]);

  const accounts = overview?.bank_accounts || [];
  const selectedBankAccountId = accounts.some((account) => account.bank_account_id === bankAccountId)
    ? bankAccountId
    : accounts[0]?.bank_account_id || '';
  const wallet = overview?.wallet;
  const selectedHotel = overview?.hotels?.find((hotel) => hotel.hotel_id === hotelId) || overview?.hotel;

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    const requestedAmount = Number(amount);
    if (!hotelId || !selectedBankAccountId || !Number.isFinite(requestedAmount) || requestedAmount < 50000) {
      setError('Vui lòng chọn tài khoản nhận tiền và nhập số tiền từ 50.000 VND.');
      return;
    }
    if (requestedAmount > Number(wallet?.available_balance || 0)) {
      setError('Số tiền yêu cầu vượt quá số dư khả dụng của ví khách sạn.');
      return;
    }

    setSubmitting(true);
    try {
      await createVendorDisbursementRequest({
        hotel_id: hotelId,
        amount: requestedAmount,
        bank_account_id: selectedBankAccountId,
      });
      setAmount('');
      setRequestFormOpen(false);
      showToast('Tạo yêu cầu giải ngân thành công! Yêu cầu đang đợi xét duyệt.', 'success');
      setReloadKey((value) => value + 1);
    } catch (submitError) {
      setError(submitError.message || 'Không thể tạo yêu cầu giải ngân.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Status mapping requirement:
   * Show request information and two statuses: "Đợi giải ngân" and "Giải ngân"
   */
  const getRequestStatus = (request) => {
    const code = String(request.status_cd);
    if (['1', '2', '3'].includes(code)) {
      return { label: 'Đợi giải ngân', color: 'warning', code: 'PENDING' };
    }
    if (code === '4') {
      return { label: 'Giải ngân', color: 'success', code: 'COMPLETED' };
    }
    if (code === '5') {
      return { label: 'Bị từ chối', color: 'error', code: 'REJECTED' };
    }
    return {
      label: request.status_label || 'Khác',
      color: request.status_color || 'default',
      code: 'OTHER',
    };
  };

  const setQuickAmount = (ratio) => {
    const available = Number(wallet?.available_balance || 0);
    const calculated = Math.floor(available * ratio);
    setAmount(calculated > 0 ? calculated.toString() : '');
    setError('');
  };

  // Filtered requests based on activeTab and searchTerm
  const filteredHistory = useMemo(() => {
    return history.filter((req) => {
      const status = getRequestStatus(req);
      if (activeTab === 'PENDING' && status.code !== 'PENDING') return false;
      if (activeTab === 'COMPLETED' && status.code !== 'COMPLETED') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const bankName = (req.bank_info?.bank_name || '').toLowerCase();
        const accNumber = (req.bank_info?.account_number || '').toLowerCase();
        const accHolder = (req.bank_info?.account_holder || '').toLowerCase();
        const ref = (req.gateway_transaction_ref || '').toLowerCase();
        const id = (req.withdrawal_id || '').toLowerCase();
        return (
          bankName.includes(term) ||
          accNumber.includes(term) ||
          accHolder.includes(term) ||
          ref.includes(term) ||
          id.includes(term)
        );
      }
      return true;
    });
  }, [history, activeTab, searchTerm]);

  const tabCounts = useMemo(() => {
    return {
      ALL: history.length,
      PENDING: history.filter((r) => ['1', '2', '3'].includes(String(r.status_cd))).length,
      COMPLETED: history.filter((r) => String(r.status_cd) === '4').length,
    };
  }, [history]);

  return (
    <div className="vd-page">
      {/* Toast feedback */}
      {toast.message && (
        <div className={`vd-toast vd-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertTriangleIcon size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="vd-breadcrumb" aria-label="Breadcrumb">
        <span>BẢNG ĐIỀU KHIỂN</span>
        <span className="vd-breadcrumb__sep">/</span>
        <span>MARKETING &amp; DOANH THU</span>
        <span className="vd-breadcrumb__sep">/</span>
        <span className="vd-breadcrumb__active">Yêu cầu giải ngân</span>
      </nav>

      {/* Page Header */}
      <header className="vd-page-header">
        <div className="vd-page-header__left">
          <div className="vd-title-row">
            <h1 className="vd-title">Yêu cầu giải ngân</h1>
            <span className="vd-role-badge">HOTEL MANAGER</span>
          </div>
          <p className="vd-subtitle">
            Theo dõi số dư tài khoản khách sạn và gửi yêu cầu rút doanh thu về tài khoản ngân hàng đối tác.
          </p>
        </div>
        <div className="vd-page-header__right">
          {overview?.hotels?.length > 1 && (
            <div className="vd-hotel-picker">
              <BuildingIcon size={16} className="vd-hotel-picker__icon" />
              <select
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                className="vd-hotel-select"
                aria-label="Chọn khách sạn"
              >
                {overview.hotels.map((h) => (
                  <option key={h.hotel_id} value={h.hotel_id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            className="vd-btn vd-btn--outline"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon size={15} className={loading ? 'vd-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* Notice / Alert */}
      {error && !requestFormOpen && (
        <div className="vd-notice vd-notice--error" role="alert">
          <AlertTriangleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !overview ? (
        <div className="vd-loading-card">
          <div className="vd-spinner"></div>
          <span>Đang tải thông tin ví và số dư tài khoản...</span>
        </div>
      ) : !overview?.hotels?.length ? (
        <div className="vd-empty-card">
          <BuildingIcon size={44} className="vd-empty-icon" />
          <h3>Chưa có khách sạn nào</h3>
          <p>Tài khoản của bạn chưa được liên kết với khách sạn nào để thực hiện giải ngân.</p>
        </div>
      ) : (
        <>
          {/* Top-left: Display the hotel's current account balance from the database
              Top-right: Display a primary button "Yêu cầu giải ngân" */}
          <section className="vd-summary-card" aria-label="Số dư và yêu cầu giải ngân">
            <div className="vd-summary-card__left">
              <div className="vd-balance-badge">
                <span className="vd-balance-badge__dot"></span>
                <span className="vd-balance-badge__text">SỐ DƯ TÀI KHOẢN KHÁCH SẠN</span>
              </div>
              <div className="vd-balance-amount">
                {formatCurrency(wallet?.available_balance)}
              </div>
              <div className="vd-balance-sub">
                <span className="vd-balance-pending">
                  Tạm giữ: <strong>{formatCurrency(wallet?.pending_balance)}</strong>
                </span>
                {selectedHotel?.name && (
                  <>
                    <span className="vd-balance-dot">•</span>
                    <span className="vd-balance-hotel" title={selectedHotel.name}>
                      {selectedHotel.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="vd-summary-card__right">
              <button
                type="button"
                className="vd-btn vd-btn--primary vd-btn--lg"
                onClick={() => {
                  setError('');
                  setRequestFormOpen(true);
                }}
              >
                <PlusIcon size={18} />
                <span>Yêu cầu giải ngân</span>
              </button>
            </div>
          </section>

          {/* Below: Display a list/table of existing disbursement requests from the database */}
          <section className="vd-main-card">
            {/* Toolbar: Filter tabs & Search */}
            <div className="vd-toolbar">
              <div className="vd-tabs">
                <button
                  type="button"
                  className={`vd-tab ${activeTab === 'ALL' ? 'vd-tab--active' : ''}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  <span>Tất cả</span>
                  <span className="vd-tab__count">{tabCounts.ALL}</span>
                </button>
                <button
                  type="button"
                  className={`vd-tab ${activeTab === 'PENDING' ? 'vd-tab--active' : ''}`}
                  onClick={() => setActiveTab('PENDING')}
                >
                  <span>Đợi giải ngân</span>
                  <span className="vd-tab__count vd-tab__count--warning">{tabCounts.PENDING}</span>
                </button>
                <button
                  type="button"
                  className={`vd-tab ${activeTab === 'COMPLETED' ? 'vd-tab--active' : ''}`}
                  onClick={() => setActiveTab('COMPLETED')}
                >
                  <span>Giải ngân</span>
                  <span className="vd-tab__count vd-tab__count--success">{tabCounts.COMPLETED}</span>
                </button>
              </div>

              <div className="vd-search">
                <SearchIcon size={15} className="vd-search__icon" />
                <input
                  type="text"
                  className="vd-search__input"
                  placeholder="Tìm theo ngân hàng, STK, người nhận..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="vd-search__clear"
                    onClick={() => setSearchTerm('')}
                    title="Xóa tìm kiếm"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="vd-table-container">
              {loading ? (
                <div className="vd-loading-card">
                  <div className="vd-spinner"></div>
                  <span>Đang tải danh sách yêu cầu giải ngân...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="vd-empty-card">
                  <CreditCardIcon size={44} className="vd-empty-icon" />
                  <h3>Chưa có yêu cầu giải ngân nào</h3>
                  <p>
                    {searchTerm
                      ? `Không tìm thấy yêu cầu nào khớp với từ khóa "${searchTerm}".`
                      : 'Khi bạn gửi yêu cầu rút tiền từ số dư ví, danh sách sẽ hiển thị tại đây.'}
                  </p>
                </div>
              ) : (
                <table className="vd-table">
                  <thead>
                    <tr>
                      <th>Mã yêu cầu</th>
                      <th>Thời gian yêu cầu</th>
                      <th>Thông tin nhận tiền</th>
                      <th>Số tiền yêu cầu</th>
                      <th>Trạng thái</th>
                      <th>Mã đối soát</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((request) => {
                      const status = getRequestStatus(request);
                      const shortId = request.withdrawal_id
                        ? `WD-${request.withdrawal_id.slice(0, 8).toUpperCase()}`
                        : '—';
                      return (
                        <tr key={request.withdrawal_id}>
                          <td>
                            <span className="vd-cell-code" title={request.withdrawal_id}>
                              {shortId}
                            </span>
                          </td>
                          <td>
                            <span className="vd-cell-date">{formatDate(request.created_at)}</span>
                          </td>
                          <td>
                            <div className="vd-bank-cell">
                              <span className="vd-bank-name">
                                {request.bank_info?.bank_name || 'Ngân hàng'}
                              </span>
                              <span className="vd-bank-acc">
                                STK: <strong>{request.bank_info?.account_number || '—'}</strong>
                              </span>
                              <span className="vd-bank-holder">
                                Chủ TK: {request.bank_info?.account_holder || '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="vd-amount-cell">
                              {formatCurrency(request.amount)}
                            </span>
                          </td>
                          <td>
                            <span className={`vd-status-badge vd-status-badge--${status.color}`}>
                              <span className="vd-status-badge__dot"></span>
                              {status.label}
                            </span>
                          </td>
                          <td>
                            <span className="vd-ref-cell">
                              {request.gateway_transaction_ref || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Modal Tạo yêu cầu giải ngân */}
          {requestFormOpen && (
            <div
              className="vd-modal-overlay"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                  setRequestFormOpen(false);
                }
              }}
            >
              <div
                className="vd-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="disbursement-form-title"
              >
                {/* Modal Header: AVORA Deep Navy + Gold border */}
                <div className="vd-modal__header">
                  <div className="vd-modal__header-info">
                    <div className="vd-modal__icon">
                      <CreditCardIcon size={22} />
                    </div>
                    <div>
                      <h2 id="disbursement-form-title" className="vd-modal__title">
                        Tạo yêu cầu giải ngân
                      </h2>
                      <p className="vd-modal__subtitle">
                        {selectedHotel?.name || 'Khách sạn'} • Tối thiểu 50.000 VND
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="vd-modal__close-btn"
                    onClick={() => setRequestFormOpen(false)}
                    disabled={submitting}
                    aria-label="Đóng"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>

                <form className="vd-modal__body" onSubmit={submitRequest}>
                  {/* Balance preview in modal */}
                  <div className="vd-modal-balance-box">
                    <div className="vd-modal-balance-box__left">
                      <span className="vd-modal-balance-box__label">Số dư khả dụng hiện tại:</span>
                      <strong className="vd-modal-balance-box__value">
                        {formatCurrency(wallet?.available_balance)}
                      </strong>
                    </div>
                    <span className="vd-modal-balance-box__status">Khả dụng</span>
                  </div>

                  {error && (
                    <div className="vd-notice vd-notice--error" role="alert" style={{ marginBottom: '16px' }}>
                      <AlertTriangleIcon size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Field 1: Bank Account */}
                  <div className="vd-form-group">
                    <label htmlFor="disbursement-account" className="vd-form-label">
                      Tài khoản ngân hàng thụ hưởng <span className="vd-required">*</span>
                    </label>
                    {accounts.length === 0 ? (
                      <div className="vd-notice vd-notice--warning">
                        <InfoIcon size={16} />
                        <span>Khách sạn chưa có tài khoản ngân hàng liên kết để nhận tiền giải ngân.</span>
                      </div>
                    ) : (
                      <select
                        id="disbursement-account"
                        className="vd-form-select"
                        value={selectedBankAccountId}
                        onChange={(event) => setBankAccountId(event.target.value)}
                        required
                      >
                        <option value="">-- Chọn tài khoản ngân hàng --</option>
                        {accounts.map((account) => (
                          <option key={account.bank_account_id} value={account.bank_account_id}>
                            {account.bank_name} • {account.account_number} • {account.accountHolder || account.account_holder}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Field 2: Amount */}
                  <div className="vd-form-group">
                    <label htmlFor="disbursement-amount" className="vd-form-label">
                      Số tiền yêu cầu giải ngân (VND) <span className="vd-required">*</span>
                    </label>
                    <div className="vd-input-wrap">
                      <input
                        id="disbursement-amount"
                        type="number"
                        min="50000"
                        step="1000"
                        max={wallet?.available_balance || undefined}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Nhập số tiền cần rút (VD: 1000000)"
                        className="vd-form-input"
                        required
                      />
                      <span className="vd-input-suffix">VND</span>
                    </div>

                    {/* Quick percentage shortcuts */}
                    <div className="vd-quick-pills">
                      <button
                        type="button"
                        className="vd-quick-pill"
                        onClick={() => setQuickAmount(0.25)}
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        className="vd-quick-pill"
                        onClick={() => setQuickAmount(0.5)}
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        className="vd-quick-pill"
                        onClick={() => setQuickAmount(1.0)}
                      >
                        100% (Tất cả)
                      </button>
                    </div>
                  </div>

                  {/* Informative Workflow note */}
                  <div className="vd-modal-note">
                    <InfoIcon size={16} className="vd-modal-note__icon" />
                    <p className="vd-modal-note__text">
                      Quy trình: Yêu cầu sau khi gửi sẽ có trạng thái <strong>"Đợi giải ngân"</strong>. Khi Business Manager xác nhận chuyển tiền thành công, trạng thái sẽ tự động chuyển sang <strong>"Giải ngân"</strong>.
                    </p>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="vd-modal__footer">
                    <button
                      type="button"
                      className="vd-btn vd-btn--outline"
                      onClick={() => setRequestFormOpen(false)}
                      disabled={submitting}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="vd-btn vd-btn--primary"
                      disabled={submitting || !accounts.length || !Number(wallet?.available_balance || 0)}
                    >
                      {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu giải ngân'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorDisbursementPage;
