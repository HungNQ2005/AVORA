import React from 'react';
import './CommissionPolicyDeleteModal.css';

const CommissionPolicyDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  policy = null,
  loading = false,
}) => {
  if (!isOpen || !policy) return null;

  return (
    <div className="cp-delete-overlay" onClick={onClose}>
      <div className="cp-delete-content" onClick={(e) => e.stopPropagation()}>
        <div className="cp-delete-body">
          <div className="cp-delete-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          <h3 className="cp-delete-title">Xác nhận xóa chính sách phí hoa hồng?</h3>
          <p className="cp-delete-desc">
            Chính sách sẽ được chuyển sang trạng thái đã xóa (xóa mềm trong CSDL) và ẩn khỏi giao diện hoạt động. Lịch sử quyết toán và giao dịch liên kết vẫn được bảo toàn nguyên vẹn.
          </p>

          <div className="cp-delete-item-box">
            <div className="cp-delete-item-name">{policy.policy_name}</div>
            <div className="cp-delete-item-meta">
              <span>Mã: <strong>{policy.policy_code || policy.policy_id?.substring(0, 8)}</strong></span>
              <span>Tỷ lệ hoa hồng: <strong style={{ color: '#003580' }}>{policy.commission_rate}%</strong></span>
              <span>Phạm vi: <strong>{policy.scope_label}</strong></span>
              <span>Mức ưu tiên: <strong>Cấp {policy.priority_level}</strong></span>
            </div>
          </div>
        </div>

        <div className="cp-delete-footer">
          <button
            type="button"
            className="rp-btn rp-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="rp-btn rp-btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="rp-btn-spinner"></span>}
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionPolicyDeleteModal;
