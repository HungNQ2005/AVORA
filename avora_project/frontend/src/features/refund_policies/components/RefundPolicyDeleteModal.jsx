import React from 'react';
import './RefundPolicyDeleteModal.css';

const RefundPolicyDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  policy = null,
  loading = false,
}) => {
  if (!isOpen || !policy) return null;

  const isAssignedToHotel = Boolean(policy.hotel_id);
  const hasBookings = (policy.associated_bookings_count || 0) > 0;

  return (
    <div className="rp-delete-overlay" onClick={onClose}>
      <div className="rp-delete-content" onClick={(e) => e.stopPropagation()}>
        <div className="rp-delete-body">
          <div className="rp-delete-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          <h3 className="rp-delete-title">Xác nhận xóa chính sách hoàn tiền?</h3>
          <p className="rp-delete-desc">
            Chính sách sẽ được chuyển sang trạng thái đã xóa (xóa mềm trong CSDL) và ẩn khỏi giao diện hoạt động. Lịch sử giao dịch và đơn đặt phòng liên quan vẫn được bảo lưu nguyên vẹn.
          </p>

          <div className="rp-delete-item-box">
            <div className="rp-delete-item-name">{policy.policy_name}</div>
            <div className="rp-delete-item-meta">
              <span>Mã: <strong>{policy.policy_code || policy.policy_id?.substring(0, 8)}</strong></span>
              <span>Áp dụng: <strong>{policy.hotel_name || 'Toàn hệ thống'}</strong></span>
              <span>Mức hoàn: <strong>{policy.refund_percentage}%</strong></span>
            </div>

            {isAssignedToHotel && (
              <div style={{ marginTop: '8px', color: '#1e40af', fontSize: '0.8rem', fontWeight: 500, background: '#eff6ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', textAlign: 'left' }}>
                ℹ️ Lưu ý: Chính sách này hiện gắn với khách sạn "{policy.hotel_name}". Khi xóa mềm, khách sạn sẽ không còn áp dụng chính sách hoàn tiền này cho các đặt phòng mới.
              </div>
            )}

            {hasBookings && (
              <div style={{ marginTop: '8px', color: '#854d0e', fontSize: '0.8rem', fontWeight: 500, background: '#fefce8', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fef08a', textAlign: 'left' }}>
                🛡️ Bảo toàn: Có {policy.associated_bookings_count} đơn đặt phòng đã liên kết. Dữ liệu kế toán quá khứ vẫn được giữ nguyên đầy đủ.
              </div>
            )}
          </div>
        </div>

        <div className="rp-delete-footer">
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

export default RefundPolicyDeleteModal;
