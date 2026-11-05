import React from 'react';
import './VendorBookingTable.css';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  } catch {
    return dateStr;
  }
};

const VendorBookingTable = ({
  bookings = [],
  loading = false,
  pagination = {},
  onPageChange,
  onViewDetail,
  onQuickConfirm,
  onQuickCancel,
  actionLoadingId = null,
}) => {
  if (loading && bookings.length === 0) {
    return (
      <div className="vbooking-table-card">
        <div className="vbooking-loading-state">
          <div className="vbooking-spinner"></div>
          <p>Đang tải danh sách đơn đặt phòng...</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="vbooking-table-card">
        <div className="vbooking-empty-state">
          <div className="vbooking-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h3>Không tìm thấy đơn đặt phòng nào</h3>
          <p>Thử thay đổi từ khóa tìm kiếm, bộ lọc trạng thái hoặc khoảng ngày.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vbooking-table-card">
      <div className="vbooking-table-responsive">
        <table className="vbooking-table">
          <thead>
            <tr>
              <th>MÃ ĐƠN & THỜI GIAN</th>
              <th>KHÁCH SẠN</th>
              <th>KHÁCH HÀNG</th>
              <th>PHÒNG & LỊCH Ở</th>
              <th>TỔNG THANH TOÁN</th>
              <th>TRẠNG THÁI</th>
              <th className="vbooking-th--actions">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const isPnd = b.status?.name === 'PND';
              const isCfm = b.status?.name === 'CFM';
              const isCan = b.status?.name === 'CAN';
              const isProcessing = actionLoadingId === b.booking_id;

              return (
                <tr key={b.booking_id} className="vbooking-tr">
                  {/* Mã đơn & Thời gian đặt */}
                  <td>
                    <div className="vbooking-ref-block">
                      <span className="vbooking-ref-code" title={b.booking_id}>
                        {b.booking_ref}
                      </span>
                      <span className="vbooking-date-sub">
                        {formatDateTime(b.created_at)}
                      </span>
                    </div>
                  </td>

                  {/* Khách sạn */}
                  <td>
                    <div className="vbooking-hotel-name" title={b.hotel_address}>
                      {b.hotel_name}
                    </div>
                  </td>

                  {/* Khách hàng */}
                  <td>
                    <div className="vbooking-guest-block">
                      <span className="vbooking-guest-name">{b.guest_name}</span>
                      <span className="vbooking-guest-phone">{b.guest_phone}</span>
                    </div>
                  </td>

                  {/* Phòng & Lịch ở */}
                  <td>
                    <div className="vbooking-stay-block">
                      <div className="vbooking-room-desc">
                        {b.details.length > 0 ? (
                          b.details.map((d, idx) => (
                            <span key={idx} className="vbooking-room-pill">
                              {d.room_type_name} × {d.quantity}
                            </span>
                          ))
                        ) : (
                          <span>{b.total_rooms} phòng</span>
                        )}
                      </div>
                      <div className="vbooking-stay-dates">
                        <span>{formatDate(b.check_in_date)}</span>
                        <span className="vbooking-arrow">→</span>
                        <span>{formatDate(b.check_out_date)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Tổng tiền */}
                  <td>
                    <div className="vbooking-amount-block">
                      <span className="vbooking-amount">{formatCurrency(b.total_amount)}</span>
                      {b.discount_amount > 0 && (
                        <span className="vbooking-discount">
                          Đã giảm: {formatCurrency(b.discount_amount)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td>
                    <span className={`vbooking-status-badge vbooking-status-badge--${b.status?.name?.toLowerCase() || 'default'}`}>
                      {b.status?.label || 'Chờ xác nhận'}
                    </span>
                  </td>

                  {/* Thao tác */}
                  <td className="vbooking-td--actions">
                    <div className="vbooking-action-buttons">
                      {/* Xem chi tiết */}
                      <button
                        type="button"
                        className="vbooking-action-btn vbooking-action-btn--view"
                        onClick={() => onViewDetail(b)}
                        title="Xem chi tiết đơn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>Chi tiết</span>
                      </button>

                      {/* Duyệt nhanh khi PND */}
                      {isPnd && (
                        <button
                          type="button"
                          className="vbooking-action-btn vbooking-action-btn--confirm"
                          onClick={() => onQuickConfirm(b)}
                          disabled={isProcessing}
                          title="Xác nhận nhận phòng"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Duyệt</span>
                        </button>
                      )}

                      {/* Hủy khi PND */}
                      {isPnd && (
                        <button
                          type="button"
                          className="vbooking-action-btn vbooking-action-btn--cancel"
                          onClick={() => onQuickCancel(b)}
                          disabled={isProcessing}
                          title="Hủy đơn đặt phòng"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="6"></line>
                          </svg>
                          <span>Hủy</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {pagination.totalPages > 1 && (
        <div className="vbooking-pagination">
          <span className="vbooking-pagination-info">
            Hiển thị <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> -{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> trong tổng số{' '}
            <strong>{pagination.total}</strong> đơn
          </span>

          <div className="vbooking-pagination-controls">
            <button
              type="button"
              className="vbooking-page-btn"
              disabled={pagination.page <= 1 || loading}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ← Trước
            </button>

            <span className="vbooking-page-indicator">
              Trang {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              className="vbooking-page-btn"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorBookingTable;

