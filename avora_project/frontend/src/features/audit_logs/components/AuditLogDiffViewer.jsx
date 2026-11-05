import React, { useState, useMemo } from 'react';
import './AuditLogDiffViewer.css';

/**
 * Format any value into a human-readable string representation.
 */
const formatValue = (val) => {
  if (val === null) return <span className="diff-val diff-val--null">null</span>;
  if (val === undefined) return <span className="diff-val diff-val--undefined">undefined</span>;
  if (typeof val === 'boolean') {
    return <span className={`diff-val diff-val--bool ${val ? 'diff-val--true' : 'diff-val--false'}`}>{String(val)}</span>;
  }
  if (typeof val === 'number') {
    return <span className="diff-val diff-val--num">{val.toLocaleString('vi-VN')}</span>;
  }
  if (typeof val === 'object') {
    return (
      <pre className="diff-val-object">
        <code>{JSON.stringify(val, null, 2)}</code>
      </pre>
    );
  }
  return <span className="diff-val diff-val--str">{String(val)}</span>;
};

/**
 * Visual & Raw JSON Diff Viewer for Audit Logs
 */
const AuditLogDiffViewer = ({
  oldData = null,
  newData = null,
  actionCodeName = '',
  actionCd = '',
  _diff = null,
}) => {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw'
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [copiedOld, setCopiedOld] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);

  // Normalize action code
  const isInsert =
    actionCodeName === 'INS' ||
    String(actionCd) === '1' ||
    (!oldData && Boolean(newData));

  const isDelete =
    actionCodeName === 'DEL' ||
    String(actionCd) === '3' ||
    (Boolean(oldData) && !newData);

  const isLogin =
    actionCodeName === 'LGN' ||
    String(actionCd) === '4';

  // Compute key comparison rows
  const comparisonRows = useMemo(() => {
    const oldObj = oldData && typeof oldData === 'object' && !Array.isArray(oldData) ? oldData : {};
    const newObj = newData && typeof newData === 'object' && !Array.isArray(newData) ? newData : {};

    // If precomputed diff is provided from backend, we can use it to determine categories
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort();

    return allKeys.map((key) => {
      const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      let status = 'unchanged';
      if (!hasOld && hasNew) {
        status = 'added';
      } else if (hasOld && !hasNew) {
        status = 'removed';
      } else {
        const oldStr = JSON.stringify(oldVal);
        const newStr = JSON.stringify(newVal);
        if (oldStr !== newStr) {
          status = 'modified';
        }
      }

      return {
        key,
        status,
        oldVal,
        newVal,
        hasOld,
        hasNew,
      };
    });
  }, [oldData, newData]);

  const filteredRows = useMemo(() => {
    if (!onlyChanges) return comparisonRows;
    return comparisonRows.filter((r) => r.status !== 'unchanged');
  }, [comparisonRows, onlyChanges]);

  const changedCount = useMemo(() => {
    return comparisonRows.filter((r) => r.status !== 'unchanged').length;
  }, [comparisonRows]);

  const handleCopyOld = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(oldData ?? {}, null, 2));
      setCopiedOld(true);
      setTimeout(() => setCopiedOld(false), 1500);
    } catch {
      // fallback
    }
  };

  const handleCopyNew = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(newData ?? {}, null, 2));
      setCopiedNew(true);
      setTimeout(() => setCopiedNew(false), 1500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="diff-viewer">
      {/* Header Bar with View Toggle & Options */}
      <div className="diff-viewer__toolbar">
        <div className="diff-viewer__tabs">
          <button
            type="button"
            className={`diff-tab-btn ${viewMode === 'visual' ? 'diff-tab-btn--active' : ''}`}
            onClick={() => setViewMode('visual')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>So sánh trực quan</span>
            {changedCount > 0 && <span className="diff-badge-count">{changedCount} thay đổi</span>}
          </button>
          <button
            type="button"
            className={`diff-tab-btn ${viewMode === 'raw' ? 'diff-tab-btn--active' : ''}`}
            onClick={() => setViewMode('raw')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Mã JSON gốc</span>
          </button>
        </div>

        {viewMode === 'visual' && (
          <label className="diff-filter-toggle">
            <input
              type="checkbox"
              checked={onlyChanges}
              onChange={(e) => setOnlyChanges(e.target.checked)}
            />
            <span>Chỉ hiện trường thay đổi</span>
          </label>
        )}
      </div>

      {/* Special Context Banners */}
      {isInsert && (
        <div className="diff-notice diff-notice--insert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <strong>Bản ghi mới tạo</strong>
            <p>Hành động tạo mới hoàn toàn (Insert). Không có dữ liệu cũ trước đó trong hệ thống.</p>
          </div>
        </div>
      )}

      {isDelete && (
        <div className="diff-notice diff-notice--delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <div>
            <strong>Bản ghi đã bị xóa</strong>
            <p>Bản ghi đã được xóa khỏi hệ thống (Delete). Dưới đây là toàn bộ ảnh chụp dữ liệu trước khi xóa.</p>
          </div>
        </div>
      )}

      {isLogin && (
        <div className="diff-notice diff-notice--login">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <div>
            <strong>Nhật ký phiên đăng nhập</strong>
            <p>Sự kiện xác thực người dùng thành công vào cổng quản trị AVORA.</p>
          </div>
        </div>
      )}

      {/* View Mode 1: Visual Side-by-Side Key-Value Diff */}
      {viewMode === 'visual' && (
        <div className="diff-visual-container">
          {filteredRows.length === 0 ? (
            <div className="diff-empty-notice">
              <p>Không có trường dữ liệu thay đổi nào để hiển thị.</p>
            </div>
          ) : (
            <div className="diff-table-responsive">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Trường dữ liệu</th>
                    <th style={{ width: '13%' }}>Trạng thái</th>
                    <th style={{ width: '32.5%' }}>Dữ liệu cũ (Old Data)</th>
                    <th style={{ width: '32.5%' }}>Dữ liệu mới (New Data)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.key} className={`diff-row diff-row--${row.status}`}>
                      <td className="diff-cell-key">
                        <code>{row.key}</code>
                      </td>
                      <td className="diff-cell-status">
                        {row.status === 'added' && (
                          <span className="diff-pill diff-pill--added">+ Thêm mới</span>
                        )}
                        {row.status === 'removed' && (
                          <span className="diff-pill diff-pill--removed">- Đã xóa</span>
                        )}
                        {row.status === 'modified' && (
                          <span className="diff-pill diff-pill--modified">● Thay đổi</span>
                        )}
                        {row.status === 'unchanged' && (
                          <span className="diff-pill diff-pill--unchanged">Không đổi</span>
                        )}
                      </td>
                      <td className="diff-cell-val diff-cell-val--old">
                        {row.hasOld ? (
                          <div className={row.status === 'modified' ? 'diff-val-strike' : ''}>
                            {formatValue(row.oldVal)}
                          </div>
                        ) : (
                          <span className="diff-empty-cell">—</span>
                        )}
                      </td>
                      <td className="diff-cell-val diff-cell-val--new">
                        {row.hasNew ? (
                          <div className={row.status === 'modified' ? 'diff-val-bold' : ''}>
                            {formatValue(row.newVal)}
                          </div>
                        ) : (
                          <span className="diff-empty-cell">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Mode 2: Raw JSON Comparison */}
      {viewMode === 'raw' && (
        <div className="diff-raw-grid">
          <div className="diff-raw-block">
            <div className="diff-raw-block__header">
              <span>Dữ liệu trước thay đổi (Old Data)</span>
              <button
                type="button"
                className="diff-copy-btn"
                onClick={handleCopyOld}
                disabled={!oldData}
              >
                {copiedOld ? 'Đã sao chép!' : 'Sao chép JSON'}
              </button>
            </div>
            <pre className="diff-raw-pre">
              <code>{oldData ? JSON.stringify(oldData, null, 2) : 'null (Không có dữ liệu cũ)'}</code>
            </pre>
          </div>

          <div className="diff-raw-block">
            <div className="diff-raw-block__header">
              <span>Dữ liệu sau thay đổi (New Data)</span>
              <button
                type="button"
                className="diff-copy-btn"
                onClick={handleCopyNew}
                disabled={!newData}
              >
                {copiedNew ? 'Đã sao chép!' : 'Sao chép JSON'}
              </button>
            </div>
            <pre className="diff-raw-pre">
              <code>{newData ? JSON.stringify(newData, null, 2) : 'null (Bản ghi đã xóa)'}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogDiffViewer;
