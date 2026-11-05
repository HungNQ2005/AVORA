import React from 'react';
import AvatarContent from '../../../common/components/AvatarContent';
import './AuditLogTable.css';

/**
 * Format timestamp into standard Vietnamese format DD/MM/YYYY HH:mm:ss
 */
const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
};

const getUserInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getActionBadge = (actionCodeName, actionCd, actionName) => {
  const code = (actionCodeName || '').toUpperCase();
  const cd = String(actionCd || '');

  if (code === 'INS' || cd === '1') {
    return {
      label: actionName || 'Thêm mới',
      className: 'audit-table-badge--ins',
    };
  }
  if (code === 'UPD' || cd === '2') {
    return {
      label: actionName || 'Cập nhật',
      className: 'audit-table-badge--upd',
    };
  }
  if (code === 'DEL' || cd === '3') {
    return {
      label: actionName || 'Xóa',
      className: 'audit-table-badge--del',
    };
  }
  if (code === 'LGN' || cd === '4') {
    return {
      label: actionName || 'Đăng nhập',
      className: 'audit-table-badge--lgn',
    };
  }
  return {
    label: actionName || code || 'Khác',
    className: 'audit-table-badge--default',
  };
};

/**
 * Summarize change impact for table column
 */
const getChangeSummary = (log) => {
  const code = (log.action_code_name || '').toUpperCase();
  const cd = String(log.action_cd || '');

  if (code === 'INS' || cd === '1') {
    const newKeys = log.new_data && typeof log.new_data === 'object' ? Object.keys(log.new_data).length : 0;
    return `Tạo mới (+${newKeys} trường)`;
  }
  if (code === 'DEL' || cd === '3') {
    return 'Đã xóa bản ghi';
  }
  if (code === 'LGN' || cd === '4') {
    return 'Đăng nhập hệ thống';
  }
  if (code === 'UPD' || cd === '2') {
    const oldObj = log.old_data && typeof log.old_data === 'object' ? log.old_data : {};
    const newObj = log.new_data && typeof log.new_data === 'object' ? log.new_data : {};
    const changed = Object.keys(newObj).filter((k) => JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k]));
    if (changed.length > 0) {
      if (changed.length <= 2) {
        return `Đổi: ${changed.join(', ')}`;
      }
      return `${changed.length} trường thay đổi`;
    }
    return 'Cập nhật bản ghi';
  }
  return 'Ghi nhận thao tác';
};

const AuditLogTable = ({
  logs = [],
  loading = false,
  error = null,
  onRetry,
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Pagination page buttons generator
  const renderPaginationButtons = () => {
    const pages = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        start = 2;
        end = 4;
      } else if (page >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="audit-table-card">
        <div className="audit-table-state audit-table-state--loading">
          <div className="audit-table-spinner" />
          <p>Đang tải danh sách nhật ký kiểm toán...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-table-card">
        <div className="audit-table-state audit-table-state--error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Không thể tải dữ liệu nhật ký</h3>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="audit-table-retry-btn" onClick={onRetry}>
              Thử lại kết nối
            </button>
          )}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="audit-table-card">
        <div className="audit-table-state audit-table-state--empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3>Không tìm thấy nhật ký kiểm toán phù hợp</h3>
          <p>Hãy thử thay đổi điều kiện tìm kiếm hoặc đặt lại các bộ lọc ngày / hành động.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-table-wrapper">
      <div className="audit-table-card">
        <div className="audit-table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Thời gian</th>
                <th style={{ width: '22%' }}>Người thực hiện</th>
                <th style={{ width: '13%' }}>Hành động</th>
                <th style={{ width: '18%' }}>Đối tượng (Entity)</th>
                <th style={{ width: '11%' }}>Địa chỉ IP</th>
                <th style={{ width: '13%' }}>Tóm tắt thay đổi</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const actor = log.actor;
                const actorName = actor?.full_name?.trim() || (log.actor_user_id ? `Người dùng #${log.actor_user_id.slice(0, 8)}` : 'Hệ thống');
                const actorEmail = actor?.email || (log.actor_user_id ? log.actor_user_id.slice(0, 16) + '...' : 'Tự động');
                const badge = getActionBadge(log.action_code_name, log.action_cd, log.action_name);
                const summary = getChangeSummary(log);

                return (
                  <tr key={log.log_id || `audit-log-${idx}`}>
                    {/* Timestamp */}
                    <td>
                      <div className="audit-cell-time">
                        <span className="audit-cell-time__main">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td>
                      <div className="audit-cell-actor">
                        <div className="audit-cell-actor__avatar" aria-hidden="true">
                          <AvatarContent
                            src={actor?.avatar_url}
                            fallback={getUserInitials(actorName)}
                            alt={actorName}
                          />
                        </div>
                        <div className="audit-cell-actor__details">
                          <span className="audit-cell-actor__name" title={actorName}>
                            {actorName}
                          </span>
                          <span className="audit-cell-actor__email" title={actorEmail}>
                            {actorEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td>
                      <span className={`audit-table-badge ${badge.className}`}>
                        ● {badge.label}
                      </span>
                    </td>

                    {/* Entity */}
                    <td>
                      <div className="audit-cell-entity">
                        <span className="audit-entity-tag">
                          {log.entity_name || '—'}
                        </span>
                        {log.entity_id && (
                          <span className="audit-entity-id-tag" title={log.entity_id}>
                            #{String(log.entity_id).slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* IP */}
                    <td>
                      <span className="audit-cell-ip">
                        {log.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    {/* Summary */}
                    <td>
                      <span className="audit-cell-summary" title={summary}>
                        {summary}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="audit-action-btn"
                        onClick={() => onViewDetail(log)}
                        title="Xem chi tiết nhật ký"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="audit-table-pagination">
          <div className="audit-table-pagination__info">
            <span>
              Hiển thị <strong>{startItem} - {endItem}</strong> trên tổng số <strong>{totalItems}</strong> bản ghi
            </span>
            <div className="audit-table-page-size-selector">
              <span>Số hàng:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="audit-table-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="audit-table-pagination__controls">
            {/* First Page */}
            <button
              type="button"
              className="audit-page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              title="Trang đầu"
            >
              {'|<'}
            </button>

            {/* Prev Page */}
            <button
              type="button"
              className="audit-page-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              title="Trang trước"
            >
              {'<'}
            </button>

            {/* Page numbers */}
            {renderPaginationButtons().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="audit-page-dots">
                    ...
                  </span>
                );
              }
              const isActive = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  className={`audit-page-btn ${isActive ? 'audit-page-btn--active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              className="audit-page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              title="Trang sau"
            >
              {'>'}
            </button>

            {/* Last Page */}
            <button
              type="button"
              className="audit-page-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Trang cuối"
            >
              {'>|'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogTable;
