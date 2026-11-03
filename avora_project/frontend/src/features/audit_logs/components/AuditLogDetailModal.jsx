import React, { useEffect, useState } from 'react';
import AuditLogDiffViewer from './AuditLogDiffViewer';
import AvatarContent from '../../../common/components/AvatarContent';
import './AuditLogDetailModal.css';

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

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Action badge class mapping
 */
const getActionBadgeClass = (actionCode, actionCd) => {
  const code = (actionCode || '').toUpperCase();
  const cd = String(actionCd || '');
  if (code === 'INS' || cd === '1') return 'audit-badge--ins';
  if (code === 'UPD' || cd === '2') return 'audit-badge--upd';
  if (code === 'DEL' || cd === '3') return 'audit-badge--del';
  if (code === 'LGN' || cd === '4') return 'audit-badge--lgn';
  return 'audit-badge--default';
};

const getActionLabel = (actionCode, actionCd, actionName) => {
  if (actionName && actionName !== 'Unknown') return actionName;
  const code = (actionCode || '').toUpperCase();
  const cd = String(actionCd || '');
  if (code === 'INS' || cd === '1') return 'Thêm mới (Insert)';
  if (code === 'UPD' || cd === '2') return 'Cập nhật (Update)';
  if (code === 'DEL' || cd === '3') return 'Xóa (Delete)';
  if (code === 'LGN' || cd === '4') return 'Đăng nhập (Login)';
  return actionCode || 'Không xác định';
};

const AuditLogDetailModal = ({ isOpen, onClose, log }) => {
  const [copiedId, setCopiedId] = useState(false);

  // Close on Escape key & block background scroll
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !log) return null;

  const handleCopyLogId = async () => {
    if (!log.log_id) return;
    try {
      await navigator.clipboard.writeText(log.log_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1600);
    } catch {
      // ignore
    }
  };

  const actor = log.actor;
  const actorName = actor?.full_name?.trim() || (log.actor_user_id ? 'Người dùng #' + log.actor_user_id.slice(0, 8) : 'Hệ thống');
  const actorEmail = actor?.email || (log.actor_user_id ? `ID: ${log.actor_user_id}` : 'system@avora.vn');
  const actionLabel = getActionLabel(log.action_code_name, log.action_cd, log.action_name);
  const actionBadgeCls = getActionBadgeClass(log.action_code_name, log.action_cd);

  return (
    <div className="audit-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="audit-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="audit-modal-header">
          <div className="audit-modal-header__title-group">
            <span className="audit-modal-tag">CHI TIẾT NHẬT KÝ KIỂM TOÁN</span>
            <h2 className="audit-modal-title">Bản ghi kiểm toán hệ thống</h2>
          </div>
          <button
            type="button"
            className="audit-modal-close-btn"
            onClick={onClose}
            title="Đóng modal (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="audit-modal-body">
          {/* Metadata Grid */}
          <div className="audit-meta-grid">
            {/* Row 1: Log ID */}
            <div className="audit-meta-item audit-meta-item--full">
              <span className="audit-meta-label">Mã định danh nhật ký (Log ID)</span>
              <div className="audit-meta-id-row">
                <code className="audit-id-code">{log.log_id}</code>
                <button
                  type="button"
                  className="audit-copy-id-btn"
                  onClick={handleCopyLogId}
                  title="Sao chép Log ID"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedId ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Actor Info */}
            <div className="audit-meta-item">
              <span className="audit-meta-label">Người thực hiện</span>
              <div className="audit-meta-actor">
                <div className="audit-actor-avatar" aria-hidden="true">
                  <AvatarContent
                    src={actor?.avatar_url}
                    fallback={getInitials(actorName)}
                    alt={actorName}
                  />
                </div>
                <div className="audit-actor-info">
                  <span className="audit-actor-name">{actorName}</span>
                  <span className="audit-actor-email">{actorEmail}</span>
                </div>
              </div>
            </div>

            {/* Row 2: Action Type */}
            <div className="audit-meta-item">
              <span className="audit-meta-label">Hành động ghi nhận</span>
              <div className="audit-meta-action">
                <span className={`audit-badge ${actionBadgeCls}`}>
                  ● {actionLabel}
                </span>
                {log.action_code_name && (
                  <span className="audit-action-code-tag">Mã: {log.action_code_name}</span>
                )}
              </div>
            </div>

            {/* Row 3: Target Entity */}
            <div className="audit-meta-item">
              <span className="audit-meta-label">Đối tượng tác động</span>
              <div className="audit-meta-entity">
                <span className="audit-entity-name-badge">
                  {log.entity_name || '—'}
                </span>
                {log.entity_id && (
                  <span className="audit-entity-id-badge" title={log.entity_id}>
                    ID: {log.entity_id}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: IP Address & Timestamp */}
            <div className="audit-meta-item">
              <span className="audit-meta-label">Địa chỉ IP &amp; Thời gian</span>
              <div className="audit-meta-ip-time">
                <span className="audit-ip-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  {log.ip_address || '127.0.0.1 (Local)'}
                </span>
                <span className="audit-time-text">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Section Divider */}
          <div className="audit-section-heading">
            <h3>So sánh biến động dữ liệu (Payload Diff)</h3>
            <p>Chi tiết dữ liệu trước và sau khi thao tác được thực hiện</p>
          </div>

          {/* Diff Viewer Integration */}
          <AuditLogDiffViewer
            oldData={log.old_data}
            newData={log.new_data}
            actionCodeName={log.action_code_name}
            actionCd={log.action_cd}
            _diff={log.diff}
          />
        </div>

        {/* Modal Footer */}
        <div className="audit-modal-footer">
          <button
            type="button"
            className="audit-modal-btn audit-modal-btn--secondary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailModal;
