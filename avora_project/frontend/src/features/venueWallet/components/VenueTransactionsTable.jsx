import React, { useState, useMemo } from 'react';

const formatCurrency = (val) => {
  const num = Math.round(Number(val) || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatShortDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

const VenueTransactionsTable = ({ inflow = [], outflow = [], onSelectTransaction }) => {
  const [activeTab, setActiveTab] = useState('inflow'); // 'inflow' | 'outflow'
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('DATE_DESC');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const currentList = activeTab === 'inflow' ? inflow : outflow;

  // Filter list by search query, date, type, and sort
  const filtered = useMemo(() => {
    const list = currentList.filter((item) => {
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'REFUND' && item.type_code !== 'REF') return false;
        if (typeFilter === 'WITHDRAW' && item.type_code !== 'WDR') return false;
        if (typeFilter === 'BOOKING' && item.type_code !== 'REV') return false;
      }

      // Date filter
      if (item.occurred_at) {
        const itemDate = String(item.occurred_at).slice(0, 10);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }

      // Search filter
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.booking_code?.toLowerCase().includes(q) ||
        item.gateway_ref?.toLowerCase().includes(q) ||
        item.guest_name?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.room_summary?.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'DATE_ASC') {
        return (new Date(a.occurred_at || 0).getTime() || 0) - (new Date(b.occurred_at || 0).getTime() || 0);
      }
      if (sortBy === 'AMOUNT_DESC') {
        return Number(b.net_amount || 0) - Number(a.net_amount || 0);
      }
      if (sortBy === 'AMOUNT_ASC') {
        return Number(a.net_amount || 0) - Number(b.net_amount || 0);
      }
      // DATE_DESC
      return (new Date(b.occurred_at || 0).getTime() || 0) - (new Date(a.occurred_at || 0).getTime() || 0);
    });
  }, [currentList, search, fromDate, toDate, typeFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTypeFilter('ALL');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setSortBy('DATE_DESC');
    setTypeFilter('ALL');
    setPage(1);
  };

  const hasFilter = Boolean(search || fromDate || toDate || typeFilter !== 'ALL' || sortBy !== 'DATE_DESC');

  return (
    <div className="vw-table-section">
      {/* 1. Status Tabs matching rp-status-tabs */}
      <div className="vw-status-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'inflow'}
          className={`vw-status-tab ${activeTab === 'inflow' ? 'vw-status-tab--active' : ''}`}
          onClick={() => handleTabChange('inflow')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>Tiền Vào (Đặt phòng thành công)</span>
          <span className={`vw-status-tab__count ${activeTab === 'inflow' ? 'vw-status-tab__count--active' : ''}`}>
            {inflow.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'outflow'}
          className={`vw-status-tab ${activeTab === 'outflow' ? 'vw-status-tab--active' : ''}`}
          onClick={() => handleTabChange('outflow')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
          <span>Tiền Ra (Rút tiền)</span>
          <span className={`vw-status-tab__count ${activeTab === 'outflow' ? 'vw-status-tab__count--active' : ''}`}>
            {outflow.length}
          </span>
        </button>
      </div>

      {/* 2. Filter Bar matching rp-filter-bar */}
      <div className="vw-filter-bar">
        <div className="vw-filter-bar__search-box">
          <svg
            className="vw-filter-bar__search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="vw-filter-bar__input"
            placeholder="Tìm theo mã đơn, mã giao dịch, khách hàng, ghi chú..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button type="button" className="vw-filter-bar__clear-btn" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>

        <div className="vw-filter-bar__controls">
          {activeTab === 'outflow' && (
            <select
              className="vw-filter-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              title="Lọc phân loại giao dịch"
            >
              <option value="ALL">Tất cả loại tiền ra</option>
              <option value="REFUND">Chỉ hoàn tiền</option>
              <option value="WITHDRAW">Chỉ rút tiền</option>
            </select>
          )}

          <select
            className="vw-filter-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            title="Sắp xếp thứ tự giao dịch"
          >
            <option value="DATE_DESC">Mới nhất trước</option>
            <option value="DATE_ASC">Cũ nhất trước</option>
            <option value="AMOUNT_DESC">Số tiền lớn nhất</option>
            <option value="AMOUNT_ASC">Số tiền nhỏ nhất</option>
          </select>

          <div className="vw-date-group">
            <span className="vw-date-label">Từ ngày:</span>
            <input
              type="date"
              className="vw-date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <span className="vw-date-label">Đến:</span>
            <input
              type="date"
              className="vw-date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {hasFilter && (
            <button type="button" className="vw-btn-reset" onClick={handleResetFilters}>
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* 3. Table Card matching rp-table-card */}
      <div className="vw-table-card">
        <div className="vw-table-subheader">
          <div className="vw-table-stats">
            <span>
              Tổng số giao dịch: <strong>{filtered.length}</strong>
            </span>
            {hasFilter && <span className="vw-filter-tag">Đang lọc</span>}
          </div>
          <div className="vw-table-note-hint">
            Nhấp vào hàng để xem bảng đối soát kiểm toán chi tiết
          </div>
        </div>

        <div className="vw-table-container">
          <table className="vw-table">
            <thead>
              <tr>
                <th style={{ width: '135px' }}>Thời gian</th>
                <th style={{ width: '165px' }}>Mã giao dịch</th>
                <th style={{ minWidth: '280px' }}>Diễn giải biến động</th>
                <th style={{ width: '145px', textAlign: 'right' }}>Biến động ví</th>
                <th style={{ width: '145px', textAlign: 'right' }}>Số dư sau giao dịch</th>
                <th style={{ width: '125px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="vw-empty-cell">
                    <div className="vw-empty-wrap">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <h4>Không có dữ liệu giao dịch</h4>
                      <p>
                        {hasFilter
                          ? 'Không tìm thấy bản ghi nào phù hợp với bộ lọc hiện tại.'
                          : activeTab === 'inflow'
                            ? 'Chưa có khoản Tiền Vào nào từ đơn booking thành công.'
                            : 'Chưa có khoản Tiền Ra nào từ yêu cầu hoàn tiền hoặc rút tiền.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const isIn = tx.direction === 'IN';
                  return (
                    <tr
                      key={tx.id}
                      className="vw-row"
                      onClick={() => {
                        if (onSelectTransaction) onSelectTransaction(tx);
                      }}
                    >
                      {/* 1. Time */}
                      <td className="vw-col-time">
                        <span className="vw-time-text">{formatShortDate(tx.occurred_at)}</span>
                      </td>

                      {/* 2. Booking Code & Guest */}
                      <td className="vw-col-booking">
                        <div className="vw-booking-code">
                          {tx.type_code === 'WDR'
                            ? (tx.gateway_ref && !tx.gateway_ref.startsWith('WDR-') ? tx.gateway_ref : '—')
                            : (tx.booking_code || tx.gateway_ref || '—')}
                        </div>
                        <div className="vw-guest-name">
                          {tx.type_code === 'WDR' ? 'Rút tiền ví' : (tx.guest_name || 'Khách hàng')}
                        </div>
                      </td>

                      {/* 3. Note explanation */}
                      <td className="vw-col-note">
                        <div className="vw-note-snippet" title={tx.note}>
                          {tx.type_code !== 'WDR' && (
                            <span className="vw-note-badge">
                              {isIn ? 'BOOKING' : 'REFUND'}
                            </span>
                          )}
                          <span className="vw-note-content">{tx.note}</span>
                        </div>
                      </td>

                      {/* 4. Delta Amount */}
                      <td className="vw-col-amount">
                        <span className={`vw-delta-amount ${isIn ? 'vw-text-green' : 'vw-text-rose'}`}>
                          {Number(tx.net_amount) > 0 ? (isIn ? '+' : '-') : ''}{formatCurrency(tx.net_amount)}
                        </span>
                      </td>

                      {/* 5. Balance After */}
                      <td className="vw-col-balance">
                        <span className="vw-balance-num">{formatCurrency(tx.balance_after)}</span>
                      </td>

                      {/* 6. Status Badge */}
                      <td className="vw-col-status">
                        <span
                          className={`vw-badge ${isIn
                            ? 'vw-badge--green'
                            : tx.is_deducted
                              ? 'vw-badge--rose'
                              : 'vw-badge--amber'
                            }`}
                        >
                          {tx.status_label || (isIn ? 'Đã cộng ví' : 'Đã trừ ví')}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td className="vw-col-action">
                        <button
                          type="button"
                          className="vw-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTransaction) onSelectTransaction(tx);
                          }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching rp-pagination */}
        {totalPages > 1 && (
          <div className="vw-pagination">
            <span className="vw-pagination-info">
              Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} trên tổng số {filtered.length} giao dịch
            </span>
            <div className="vw-pagination-actions">
              <button
                type="button"
                className="vw-page-nav-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <span className="vw-page-indicator">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="vw-page-nav-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueTransactionsTable;
