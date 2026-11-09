import React, { useEffect } from 'react';

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('vi-VN') + ' đ';
};

/**
 * Promotion Policy & Conflict Resolution Modal.
 * Transparently informs customer about AVORA's mutual exclusivity rule:
 * Only 1 promotion per booking (Flash Sale OR Coupon, non-stackable).
 */
const PromotionPolicyModal = ({
  isOpen,
  onClose,
  type = 'policy_info', // 'confirm_switch' | 'conflict_replaced' | 'conflict_kept' | 'invalid_with_flash' | 'policy_info'
  data = {},
  onKeepFlashSale,
  onAcceptCoupon,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const {
    flashSaleDiscount = 0,
    flashSaleCode = '',
    manualCouponCode = '',
    manualCouponDiscount = 0,
    couponMessage = '',
    subtotal = 0,
  } = data;

  const diffAmount = Math.abs(Number(manualCouponDiscount || 0) - Number(flashSaleDiscount || 0));

  return (
    <div
      className="booking-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="booking-modal-box promo-policy-modal-box">
        {/* Header Close Button */}
        <button
          type="button"
          className="promo-policy-close-btn"
          onClick={onClose}
          aria-label="Đóng thông báo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Modal Status Icon */}
        <div className="promo-policy-icon-wrapper">
          {type === 'confirm_switch' && (
            <div className="promo-policy-icon promo-policy-icon--switch">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
          )}
          {type === 'conflict_replaced' && (
            <div className="promo-policy-icon promo-policy-icon--replaced">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          )}
          {type === 'conflict_kept' && (
            <div className="promo-policy-icon promo-policy-icon--kept">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          )}
          {type === 'invalid_with_flash' && (
            <div className="promo-policy-icon promo-policy-icon--alert">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          )}
          {type === 'policy_info' && (
            <div className="promo-policy-icon promo-policy-icon--info">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          )}
        </div>

        {/* Modal Title & Subtitle */}
        <div className="promo-policy-header">
          {type === 'confirm_switch' && (
            <>
              <span className="promo-policy-tag promo-policy-tag--amber">XÁC NHẬN ĐỔI ƯU ĐÃI</span>
              <h3 className="booking-modal-title">Đổi sang sử dụng mã giảm giá?</h3>
            </>
          )}
          {type === 'conflict_replaced' && (
            <>
              <span className="promo-policy-tag promo-policy-tag--blue">TỐI ƯU MỨC GIẢM GIÁ</span>
              <h3 className="booking-modal-title">Mã giảm giá đã thay thế Flash Sale</h3>
            </>
          )}
          {type === 'conflict_kept' && (
            <>
              <span className="promo-policy-tag promo-policy-tag--green">BẢO VỆ QUYỀN LỢI TỐI ĐA</span>
              <h3 className="booking-modal-title">Ưu tiên giữ ưu đãi Flash Sale</h3>
            </>
          )}
          {type === 'invalid_with_flash' && (
            <>
              <span className="promo-policy-tag promo-policy-tag--amber">THÔNG BÁO ƯU ĐÃI</span>
              <h3 className="booking-modal-title">Mã chưa đủ điều kiện & Giữ Flash Sale</h3>
            </>
          )}
          {type === 'policy_info' && (
            <>
              <span className="promo-policy-tag promo-policy-tag--navy">QUY ĐỊNH HỆ THỐNG</span>
              <h3 className="booking-modal-title">Quy ước áp dụng ưu đãi tại AVORA</h3>
            </>
          )}
        </div>

        {/* Core Mutual Exclusivity Statement */}
        <div className="promo-policy-core-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>
            <strong>Quy ước ưu đãi:</strong> Mỗi đơn đặt phòng chỉ áp dụng tối đa <strong>01 chương trình</strong> (Flash Sale hoặc Mã giảm giá, <strong>không cộng dồn</strong>).
          </span>
        </div>

        {/* Comparison Section (when comparing Flash Sale vs Manual Coupon) */}
        {(type === 'conflict_replaced' || type === 'conflict_kept') && (
          <div className="promo-compare-grid">
            <div className={`promo-compare-card ${type === 'conflict_kept' ? 'promo-compare-card--winner' : 'promo-compare-card--inactive'}`}>
              <div className="promo-compare-card__header">
                <span className="promo-compare-label">Ưu đãi Flash Sale</span>
                {type === 'conflict_kept' && <span className="promo-winner-badge">TỐT HƠN</span>}
              </div>
              <div className="promo-compare-code">{flashSaleCode || 'Flash Sale khách sạn'}</div>
              <div className="promo-compare-amount">-{formatCurrency(flashSaleDiscount)}</div>
            </div>

            <div className={`promo-compare-card ${type === 'conflict_replaced' ? 'promo-compare-card--winner' : 'promo-compare-card--inactive'}`}>
              <div className="promo-compare-card__header">
                <span className="promo-compare-label">Mã giảm giá nhập</span>
                {type === 'conflict_replaced' && <span className="promo-winner-badge">TỐT HƠN</span>}
              </div>
              <div className="promo-compare-code">{manualCouponCode || 'Mã Coupon'}</div>
              <div className="promo-compare-amount">-{formatCurrency(manualCouponDiscount)}</div>
            </div>
          </div>
        )}

        {/* Explanatory Description */}
        <div className="promo-policy-desc">
          {type === 'confirm_switch' && (
            <div className="promo-confirm-switch-box">
              <p className="promo-confirm-switch-text">
                Khách sạn hiện <strong>đang có chương trình Flash Sale</strong>{flashSaleDiscount > 0 ? ` (-${formatCurrency(flashSaleDiscount)})` : ''}.
              </p>
              <p className="promo-confirm-switch-prompt">
                Bạn có muốn đổi qua sử dụng mã giảm giá <strong>{manualCouponCode}</strong> không?
              </p>
              <div className="promo-confirm-switch-note">
                Hệ thống sẽ kiểm tra và áp dụng mã giảm giá thay thế Flash Sale cho đơn đặt phòng của bạn.
              </div>
            </div>
          )}

          {type === 'conflict_replaced' && (
            <p>
              Mã giảm giá <strong>{manualCouponCode}</strong> mang lại mức giảm <strong>{formatCurrency(manualCouponDiscount)}</strong>, tiết kiệm thêm <strong>{formatCurrency(diffAmount)}</strong> so với Flash Sale. Hệ thống đã áp dụng mã này thay thế Flash Sale để bạn có mức giá tốt nhất.
            </p>
          )}

          {type === 'conflict_kept' && (
            <p>
              Ưu đãi Flash Sale của khách sạn mang lại mức giảm <strong>{formatCurrency(flashSaleDiscount)}</strong>, tốt hơn mã <strong>{manualCouponCode}</strong> ({formatCurrency(manualCouponDiscount)}). Để bảo vệ quyền lợi của bạn, hệ thống ưu tiên giữ ưu đãi Flash Sale.
            </p>
          )}

          {type === 'invalid_with_flash' && (
            <p>
              {couponMessage || 'Mã giảm giá vừa nhập không hợp lệ hoặc chưa đạt giá trị đơn tối thiểu.'} Đơn phòng của bạn tiếp tục được áp dụng ưu đãi Flash Sale (-{formatCurrency(flashSaleDiscount)}) của khách sạn.
            </p>
          )}

          {type === 'policy_info' && (
            <ul className="promo-policy-list">
              <li>
                <div className="promo-policy-list__title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Chỉ áp dụng 01 ưu đãi duy nhất</span>
                </div>
                <div className="promo-policy-list__text">
                  Không thể cộng dồn đồng thời Flash Sale khung giờ vàng và mã giảm giá voucher trên cùng một đơn đặt phòng.
                </div>
              </li>
              <li>
                <div className="promo-policy-list__title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Tự động tối ưu chi phí</span>
                </div>
                <div className="promo-policy-list__text">
                  Hệ thống tự động so sánh giá trị giữa Flash Sale và mã bạn nhập, chọn mức giảm cao nhất để đảm bảo bạn luôn trả ít tiền nhất.
                </div>
              </li>
              <li>
                <div className="promo-policy-list__title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003580" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Linh hoạt thay đổi</span>
                </div>
                <div className="promo-policy-list__text">
                  Bạn có thể thử nhập các mã khác nhau hoặc bấm "Bỏ mã" bất kỳ lúc nào để chuyển lại ưu đãi Flash Sale ban đầu.
                </div>
              </li>
            </ul>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="booking-modal-actions promo-policy-actions">
          {type === 'confirm_switch' ? (
            <>
              <button
                type="button"
                className="booking-modal-btn-secondary"
                onClick={() => {
                  if (onKeepFlashSale) onKeepFlashSale();
                  onClose();
                }}
              >
                Giữ lại Flash Sale
              </button>
              <button
                type="button"
                className="booking-modal-btn-primary"
                onClick={() => {
                  if (onAcceptCoupon) onAcceptCoupon(manualCouponCode);
                  onClose();
                }}
              >
                Đổi qua sử dụng coupon
              </button>
            </>
          ) : type === 'conflict_replaced' ? (
            <>
              <button
                type="button"
                className="booking-modal-btn-secondary"
                onClick={() => {
                  if (onKeepFlashSale) onKeepFlashSale();
                  onClose();
                }}
              >
                Giữ lại Flash Sale
              </button>
              <button
                type="button"
                className="booking-modal-btn-primary"
                onClick={() => {
                  if (onAcceptCoupon) onAcceptCoupon();
                  onClose();
                }}
              >
                Đã hiểu & Sử dụng mã này
              </button>
            </>
          ) : type === 'conflict_kept' ? (
            <>
              <button
                type="button"
                className="booking-modal-btn-secondary"
                onClick={onClose}
              >
                Tiếp tục với Flash Sale
              </button>
              <button
                type="button"
                className="booking-modal-btn-primary"
                onClick={() => {
                  if (onAcceptCoupon) onAcceptCoupon(manualCouponCode);
                  onClose();
                }}
              >
                Vẫn dùng mã {manualCouponCode || 'này'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="booking-modal-btn-primary"
              onClick={onClose}
            >
              Đã hiểu quy ước
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionPolicyModal;
