import React from 'react';
import './RefundPolicyDeleteModal.css';

const RefundPolicyDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  policy = null,
  loading = false,
  serverError = null,
}) => {
  if (!isOpen || !policy) return null;

  const isAssignedToHotel = Boolean(policy.hotel_id);
  const hasBookings = (policy.associated_bookings_count || 0) > 0;
  const isDeletionBlocked = isAssignedToHotel || hasBookings;

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

          <h3 className="rp-delete-title">
            {isDeletionBlocked ? 'Không thể xóa chính sách' : 'Xác nhận xóa chính sách?'}
          </h3>
          <p className="rp-delete-desc">
            {isDeletionBlocked
              ? 'Hệ thống kiểm soát tính toàn vẹn dữ liệu ngăn việc xóa chính sách này.'
              : 'Hành động này sẽ xóa chính sách hoàn tiền không thuộc khách sạn nào khỏi hệ thống AVORA.'}
          </p>

          <div className="rp-delete-item-box">
            <div className="rp-delete-item-name">{policy.policy_name}</div>
            <div className="rp-delete-item-meta">
              <span>Mã: <strong>{policy.policy_code || policy.policy_id?.substring(0, 8)}</strong></span>
              <span>Áp dụng: <strong>{policy.hotel_name || 'Toàn hệ thống'}</strong></span>
            </div>

            {isAssignedToHotel && (
              <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, background: '#fef2f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecaca', textAlign: 'left' }}>
                ⚠️ Không thể xóa: Chính sách đang được chỉ định cho khách sạn "{policy.hotel_name}". Theo quy định, chỉ có thể xóa các chính sách không thuộc khách sạn nào (hoặc chuyển trạng thái sang "Tạm dừng").
              </div>
            )}

            {!isAssignedToHotel && hasBookings && (
              <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, background: '#fef2f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecaca', textAlign: 'left' }}>
                ⚠️ Cảnh báo: Chính sách đang gắn với {policy.associated_bookings_count} đơn đặt phòng. Hệ thống từ chối xóa để đảm bảo toàn vẹn dữ liệu.
              </div>
            )}

            {serverError && (
              <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, background: '#fef2f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecaca', textAlign: 'left' }}>
                ⚠️ Lỗi từ máy chủ: {serverError}
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
            {isDeletionBlocked ? 'Đóng lại' : 'Hủy bỏ'}
          </button>
          {!isDeletionBlocked && (
            <button
              type="button"
              className="rp-btn rp-btn--danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <span className="rp-btn-spinner"></span>}
              Xóa chính sách
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyDeleteModal;
