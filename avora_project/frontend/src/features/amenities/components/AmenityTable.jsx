import React from 'react';
import AmenityIconRenderer from './AmenityIconRenderer';
import './AmenityTable.css';

const FACILITY_TYPE_LABELS = {
  INTERNET: 'Internet / Wi-Fi',
  POOL: 'Hồ bơi',
  FOOD: 'Ẩm thực',
  PARKING: 'Bãi đỗ xe',
  SERVICE: 'Dịch vụ',
  GYM: 'Thể hình / Gym',
  RESTAURANT: 'Nhà hàng',
  SPA: 'Spa & Chăm sóc',
};

const AmenityTable = ({
  amenities = [],
  loading = false,
  error = null,
  onRetry,
  onView,
  onEdit,
  onDelete,
  page = 1,
  pageSize = 5,
  onPageChange,
  onPageSizeChange,
  totalItems = 0,
  visibleColumns = {
    // id: true,
    name: true,
    codeIcon: true,
    type: true,
    applied: true,
    actions: true,
  },
}) => {
  const showId = visibleColumns.id ?? visibleColumns.facility_id ?? true;
  const showName = visibleColumns.name ?? true;
  const showIcon = visibleColumns.codeIcon ?? visibleColumns.icon ?? true;
  const showType = visibleColumns.type ?? true;
  const showApplied = visibleColumns.applied ?? true;
  const showActions = visibleColumns.actions ?? true;

  if (loading) {
    return (
      <div className="amenity-table-card">
        <div className="amenity-loading-state">
          <div className="amenity-spinner"></div>
          <p>Đang tải danh sách tiện ích từ hệ thống cơ sở dữ liệu Cloud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="amenity-table-card">
        <div className="amenity-error-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Lỗi tải dữ liệu</h3>
          <p>{error}</p>
          <button type="button" className="amenity-retry-btn" onClick={onRetry}>
            Thử lại kết nối
          </button>
        </div>
      </div>
    );
  }

  if (amenities.length === 0) {
    return (
      <div className="amenity-table-card">
        <div className="amenity-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3>Không tìm thấy tiện ích nào</h3>
          <p>Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc danh mục.</p>
        </div>
      </div>
    );
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate pagination pages array
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisibleButtons = 5;

    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <>
      <div className="amenity-table-card">
        <div className="amenity-table-container">
          <table className="amenity-table">
            <thead>
              <tr>
                {/* {showId && <th className="col-id">ID TIỆN ÍCH</th>} */}
                {showName && <th className="col-name">TÊN TIỆN NGHI</th>}
                {showIcon && <th className="col-code-icon col-center">ICON</th>}
                {showType && <th className="col-type">LOẠI</th>}
                {showApplied && <th className="col-applied">ĐANG ÁP DỤNG</th>}
                {showActions && <th className="col-actions">THAO TÁC</th>}
              </tr>
            </thead>
            <tbody>
              {amenities.map((item, idx) => {
                return (
                  <tr key={item.facility_id || idx} className="amenity-table-row">
                    {/* Cột 1: ID tiện ích */}
                    {/* {showId && (
                      <td className="col-id">
                        <span className="amenity-id-badge">#{item.facility_id}</span>
                      </td>
                    )} */}

                    {/* Cột 2: Tên tiện nghi */}
                    {showName && (
                      <td className="col-name">
                        <div className="amenity-cell-name">
                          <div className="amenity-name-primary-row">
                            <span className="amenity-name-vi">{item.name_vi}</span>
                            {item.is_highlight && (
                              <span className="amenity-badge-highlight">HIGHLIGHT</span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Cột 3: Icon (ở giữa bảng) */}
                    {showIcon && (
                      <td className="col-code-icon col-center">
                        <div className="amenity-cell-code-icon amenity-cell-center">
                          <div className="amenity-icon-box">
                            <AmenityIconRenderer
                              name={item.name_vi}
                              code={item.code}
                              type={item.type || item.scope_type}
                              icon={item.icon}
                            />
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Cột 4: Loại */}
                    {showType && (
                      <td className="col-type">
                        <div className="amenity-cell-type">
                          <span className={`amenity-type-badge amenity-type-badge--${(item.type || 'other').toLowerCase()}`}>
                            {FACILITY_TYPE_LABELS[item.type] || item.type || 'Chưa phân loại'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Cột 5: Đang áp dụng */}
                    {showApplied && (
                      <td className="col-applied">
                        <div className="amenity-applied-cell">
                          <span className="amenity-applied-number">{item.applied_count ?? 0}</span>
                          <span className="amenity-applied-unit">{item.applied_unit || 'Hạng phòng'}</span>
                        </div>
                      </td>
                    )}

                    {/* Column 6: THAO TÁC */}
                    {showActions && (
                      <td className="col-actions">
                        <div className="amenity-actions-cell">
                          <button
                            type="button"
                            className="amenity-action-btn amenity-action-btn--view"
                            title="Xem chi tiết"
                            onClick={() => onView(item)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="amenity-action-btn amenity-action-btn--edit"
                            title="Chỉnh sửa tiện ích"
                            onClick={() => onEdit(item)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="amenity-action-btn amenity-action-btn--delete"
                            title="Xóa tiện ích"
                            onClick={() => onDelete(item)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Footer summary */}
      <div className="amenity-footer-bar">
        <div className="amenity-footer-bar__info">
          <span>
            Hiển thị {amenities.length} trên {totalItems} tiện ích theo cấu hình cơ sở
          </span>
          <span className="amenity-footer-bar__dot">•</span>
          <button
            type="button"
            className="amenity-footer-bar__sync-btn"
            onClick={onRetry}
          >
            Tải lại dữ liệu OTA chống overbooking
          </button>
        </div>

        <div className="amenity-pagination">
          <button
            type="button"
            className="amenity-pagination__btn"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page <= 1}
          >
            Trước
          </button>
          {renderPaginationButtons().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="amenity-pagination__ellipsis">
                  ...
                </span>
              );
            }
            return (
              <button
                key={`page-${p}`}
                type="button"
                className={`amenity-pagination__num ${p === page ? 'amenity-pagination__num--active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            type="button"
            className="amenity-pagination__btn"
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Tiếp
          </button>
        </div>
      </div>
    </>
  );
};

export default AmenityTable;
