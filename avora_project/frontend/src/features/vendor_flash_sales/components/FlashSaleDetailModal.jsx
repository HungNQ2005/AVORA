import React from 'react';
import './FlashSaleModal.css';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString('vi-VN')} đ`;
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

const FlashSaleDetailModal = ({ isOpen, onClose, flashSale }) => {
  if (!isOpen || !flashSale) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(flashSale.code);
  };

  return (
    <div className="rt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rt-modal-content fs-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rt-modal-header fs-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon fs-modal-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">Chi tiết chương trình Flash Sale</h2>
              <p className="rt-modal-subtitle">{flashSale.hotel_name}</p>
            </div>
          </div>
          <button type="button" className="rt-modal-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="rt-modal-body" style={{ padding: '20px 24px' }}>
          {/* Top Banner Code & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Mã khuyến mãi giờ vàng</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {flashSale.code}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  title="Sao chép mã"
                  style={{ background: '#e2e8f0', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Sao chép
                </button>
              </div>
            </div>
            <div>
              <span className={`promo-status-badge promo-status--${flashSale.status?.toLowerCase()}`}>
                {flashSale.status === 'ACTIVE' && '⚡ '}
                {flashSale.status_label || flashSale.status}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#ffffff', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>MỨC GIẢM ƯU ĐÃI</span>
              <p style={{ margin: '6px 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {flashSale.discount_type === 'FIXED_AMOUNT'
                  ? formatCurrency(flashSale.discount_value)
                  : `${flashSale.discount_value}%`}
                {flashSale.max_discount_amount && (
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, display: 'block' }}>
                    (Tối đa: {formatCurrency(flashSale.max_discount_amount)})
                  </span>
                )}
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>ĐƠN TỐI THIỂU ÁP DỤNG</span>
              <p style={{ margin: '6px 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {flashSale.min_order_amount ? formatCurrency(flashSale.min_order_amount) : 'Không giới hạn'}
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>KHUNG GIỜ VÀNG (BẮT ĐẦU - KẾT THÚC)</span>
              <p style={{ margin: '6px 0 0', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                {formatDateTime(flashSale.valid_from)} <br />
                <span style={{ color: '#64748b' }}>đến</span> {formatDateTime(flashSale.valid_to)}
              </p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>HIỆU SUẤT SỬ DỤNG</span>
              <p style={{ margin: '6px 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {flashSale.usage_count || 0} / {flashSale.usage_limit || '∞'} lượt
                {flashSale.total_discount_given > 0 && (
                  <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600, display: 'block' }}>
                    Tổng tiền ưu đãi: {formatCurrency(flashSale.total_discount_given)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Recent Bookings Table (if any) */}
          {flashSale.recent_bookings && flashSale.recent_bookings.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                Lịch sử đặt phòng áp dụng gần nhất ({flashSale.recent_bookings.length})
              </h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Khách hàng</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tổng tiền</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Đã giảm</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flashSale.recent_bookings.map((b) => (
                      <tr key={b.booking_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>{b.guest_name || 'Khách vãng lai'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(b.total_amount)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>-{formatCurrency(b.discount_amount)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{formatDateTime(b.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="rt-modal-footer">
          <button type="button" className="rt-btn rt-btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashSaleDetailModal;
