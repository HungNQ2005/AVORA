import React, { useEffect } from 'react';

const formatCurrency = (val) => {
  const num = Math.round(Number(val) || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

const VenueTransactionDetailModal = ({ transaction, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transaction) return null;

  const isInflow = transaction.direction === 'IN';

  return (
    <div className="vw-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vw-modal-landscape" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="vw-modal-topbar">
          <div className="vw-modal-topbar__title-group">
            <div className="vw-modal-tag-row">
              <span className={`vw-type-badge ${isInflow ? 'vw-type-badge--inflow' : 'vw-type-badge--outflow'}`}>
                {isInflow ? 'TIỀN VÀO' : 'TIỀN RA'}
              </span>
              {transaction.type_code !== 'WDR' && (
                <span className="vw-modal-booking-id">
                  #{transaction.booking_code || transaction.gateway_ref || transaction.id}
                </span>
              )}
            </div>
            <h2 className="vw-modal-main-heading">
              {isInflow ? 'Chi Tiết Ghi Nhận Doanh Thu' : 'Chi Tiết Đối Soát Hoàn / Rút Tiền'}
            </h2>
          </div>

          <button type="button" className="vw-modal-close-btn" onClick={onClose} title="Đóng modal">
            ✕
          </button>
        </div>

        {/* Modal Body: 2-Column Landscape Layout */}
        <div className="vw-modal-grid">
          {/* ─── CỘT TRÁI: THÔNG TIN GIAO DỊCH & DIỄN GIẢI ───────────────── */}
          <div className="vw-modal-col vw-modal-col--left">
            {/* Box 1: Thông tin đơn hàng / đối tượng */}
            <div className="vw-section-card">
              <h3 className="vw-section-card__title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Thông tin giao dịch</span>
              </h3>

              <div className="vw-info-list">
                <div className="vw-info-item">
                  <span className="vw-info-label">Thời gian</span>
                  <span className="vw-info-val">{formatDateTime(transaction.occurred_at)}</span>
                </div>

                <div className="vw-info-item">
                  <span className="vw-info-label">Khách hàng</span>
                  <span className="vw-info-val font-semibold">{transaction.guest_name || 'Khách vãng lai'}</span>
                </div>

                {transaction.guest_phone && (
                  <div className="vw-info-item">
                    <span className="vw-info-label">Số điện thoại</span>
                    <span className="vw-info-val">{transaction.guest_phone}</span>
                  </div>
                )}

                {transaction.room_summary && (
                  <div className="vw-info-item">
                    <span className="vw-info-label">Hạng phòng</span>
                    <span className="vw-info-val font-semibold vw-text-blue">{transaction.room_summary}</span>
                  </div>
                )}

                {transaction.payment_method && (
                  <div className="vw-info-item">
                    <span className="vw-info-label">Phương thức</span>
                    <span className="vw-info-val">{transaction.payment_method}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Diễn giải biến động (Được format gọn gàng theo từng block) */}
            <div className="vw-section-card">
              <h3 className="vw-section-card__title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Diễn giải biến động số dư</span>
              </h3>

              <div className="vw-steps-breakdown">
                {isInflow ? (
                  <>
                    <div className="vw-step-row">
                      <div className="vw-step-icon vw-step-icon--blue">1</div>
                      <div className="vw-step-content">
                        <div className="vw-step-title">Khách thanh toán thành công</div>
                        <div className="vw-step-desc">Đơn booking được xác nhận thanh toán qua cổng thanh toán sàn.</div>
                      </div>
                      <div className="vw-step-val">{formatCurrency(transaction.gross_amount)}</div>
                    </div>

                    <div className="vw-step-row">
                      <div className="vw-step-icon vw-step-icon--amber">2</div>
                      <div className="vw-step-content">
                        <div className="vw-step-title">Khấu trừ hoa hồng sàn ({transaction.commission_rate || 0}%)</div>
                        <div className="vw-step-desc">Chính sách áp dụng: {transaction.policy_name || 'Mặc định sàn'}.</div>
                      </div>
                      <div className="vw-step-val vw-text-rose">-{formatCurrency(transaction.commission_amount)}</div>
                    </div>

                    <div className="vw-step-row vw-step-row--final">
                      <div className="vw-step-icon vw-step-icon--green">✓</div>
                      <div className="vw-step-content">
                        <div className="vw-step-title font-bold">Thực cộng vào ví chỗ nghỉ</div>
                        <div className="vw-step-desc">Số tiền ròng ghi nhận tăng số dư ví khách sạn.</div>
                      </div>
                      <div className="vw-step-val vw-text-green font-bold">+{formatCurrency(transaction.net_amount)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="vw-step-row">
                      <div className="vw-step-icon vw-step-icon--rose">1</div>
                      <div className="vw-step-content">
                        <div className="vw-step-title">Yêu cầu hoàn tiền được duyệt</div>
                        <div className="vw-step-desc">Lý do: "{transaction.reason || 'Khách hủy đơn'}"</div>
                      </div>
                      <div className="vw-step-val vw-text-rose">-{formatCurrency(transaction.gross_amount || transaction.refund_amount)}</div>
                    </div>

                    {transaction.penalty_amount > 0 && (
                      <div className="vw-step-row">
                        <div className="vw-step-icon vw-step-icon--green">+</div>
                        <div className="vw-step-content">
                          <div className="vw-step-title">Phí phạt hủy giữ lại ({transaction.penalty_rate || 0}%)</div>
                          <div className="vw-step-desc">Khách hủy phòng muộn so với thời hạn quy định.</div>
                        </div>
                        <div className="vw-step-val vw-text-green">+{formatCurrency(transaction.penalty_amount)}</div>
                      </div>
                    )}

                    <div className="vw-step-row vw-step-row--final">
                      <div className="vw-step-icon vw-step-icon--rose">✓</div>
                      <div className="vw-step-content">
                        <div className="vw-step-title font-bold">Tổng tiền trừ khỏi ví chỗ nghỉ</div>
                        <div className="vw-step-desc">Đã khấu trừ tự động khỏi số dư ví khách sạn.</div>
                      </div>
                      <div className="vw-step-val vw-text-rose font-bold">-{formatCurrency(transaction.net_amount)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── CỘT PHẢI: BẢNG CÂN ĐỐI TÀI CHÍNH & SỐ DƯ VÍ ─────────────── */}
          <div className="vw-modal-col vw-modal-col--right">
            {/* Box 3: Bảng kê hạch toán (Receipt Card) */}
            <div className="vw-receipt-card">
              <div className="vw-receipt-header">
                <span className="vw-receipt-label">BẢNG KÊ ĐỐI SOÁT TÀI CHÍNH</span>
                <span className="vw-receipt-status">
                  {isInflow ? '● ĐÃ HOÀN TẤT' : '● ĐÃ THANH QUYẾT'}
                </span>
              </div>

              <div className="vw-receipt-body">
                <div className="vw-receipt-row">
                  <span>Tổng giá trị đơn thanh toán</span>
                  <span>{formatCurrency(transaction.gross_amount)}</span>
                </div>

                {isInflow ? (
                  <div className="vw-receipt-row">
                    <span>
                      Phí hoa hồng sàn ({transaction.commission_rate || 0}%)
                    </span>
                    <span className="vw-text-rose">
                      -{formatCurrency(transaction.commission_amount)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="vw-receipt-row">
                      <span>Số tiền hoàn cho khách</span>
                      <span className="vw-text-rose">
                        -{formatCurrency(transaction.gross_amount || transaction.refund_amount)}
                      </span>
                    </div>
                    {transaction.penalty_amount > 0 && (
                      <div className="vw-receipt-row">
                        <span>Phí phạt khách sạn được hưởng</span>
                        <span className="vw-text-green">
                          +{formatCurrency(transaction.penalty_amount)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="vw-receipt-divider" />

                {/* Tổng biến động net */}
                <div className="vw-receipt-row vw-receipt-row--net">
                  <div>
                    <div className="vw-net-title">
                      {isInflow ? 'Thực nhận vào ví' : 'Tổng số tiền trừ ví'}
                    </div>
                    <div className="vw-net-subtitle">
                      {isInflow ? 'Ghi có (+)' : 'Ghi nợ (-)'} tài khoản chỗ nghỉ
                    </div>
                  </div>
                  <div className={`vw-net-amount ${isInflow ? 'vw-text-green' : 'vw-text-rose'}`}>
                    {isInflow ? '+' : '-'}{formatCurrency(transaction.net_amount)}
                  </div>
                </div>
              </div>

              {/* Số dư sau giao dịch */}
              <div className="vw-balance-after-box">
                <div className="vw-balance-after-label">SỐ DƯ VÍ SAU GIAO DỊCH:</div>
                <div className="vw-balance-after-val">
                  {formatCurrency(transaction.balance_after)}
                </div>
                <div className="vw-balance-after-desc">
                  Phân bổ vào {transaction.balance_bucket_label || 'Số dư khả dụng'}
                </div>
              </div>
            </div>

            {/* Note nguyên bản từ hệ thống (nếu cần đối chiếu) */}
            <div className="vw-raw-note-box">
              <span className="vw-raw-note-label">Toàn văn ghi chú hệ thống:</span>
              <p className="vw-raw-note-content">{transaction.note}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="vw-modal-footer">
          <button type="button" className="vw-modal-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueTransactionDetailModal;
