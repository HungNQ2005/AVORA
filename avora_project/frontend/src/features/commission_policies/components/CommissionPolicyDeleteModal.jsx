import React from 'react';
import { AlertTriangleIcon } from '../../../common/components/icons';
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
            <AlertTriangleIcon size={28} />
          </div>

          <h3 className="cp-delete-title">Xác nhận xóa chính sách phí hoa hồng?</h3>
          <p className="cp-delete-desc">
            Hành động này sẽ xóa chính sách hoa hồng khỏi hệ thống AVORA.
            Các quyết toán trong tương lai sẽ áp dụng chính sách cấp hệ thống mặc định.
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
            Xóa chính sách
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionPolicyDeleteModal;
