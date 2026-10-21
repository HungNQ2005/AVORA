import React from 'react';
import {
  VoucherIcon,
  TagDiscountIcon,
  InfoCircleIcon,
  PrinterIcon,
} from './BookingIcons';
import { formatVnd } from './bookingCardHelpers';

/**
 * Modal 1: Chi tiết Voucher / Vé Điện Tử (E-Ticket)
 */
const BookingVoucherModal = ({
  booking,
  voucherData,
  loading,
  onClose,
}) => {
  if (!booking) return null;

  return (
    <div
      className="my-bookings-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="my-bookings-modal-card my-bookings-modal-card--lg" onClick={(e) => e.stopPropagation()}>
        <div className="my-bookings-modal-header">
          <div className="my-bookings-modal-header-left">
            <div className="my-bookings-modal-header-icon" aria-hidden="true">
              <VoucherIcon width="22" height="22" />
            </div>
            <div className="my-bookings-modal-title-wrap">
              <h3 className="my-bookings-modal-title">Voucher Điện Tử (E-Ticket)</h3>
              <span className="my-bookings-modal-subtitle">
                Mã đặt chỗ: {voucherData?.booking_code || booking?.booking_code} • Xuất trình khi làm thủ tục nhận phòng
              </span>
            </div>
          </div>
          <button
            type="button"
            className="my-bookings-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="my-bookings-modal-body">
          {loading ? (
            <div className="my-bookings-modal-loading">
              <div className="my-bookings-spinner" />
              <p>Đang khởi tạo voucher điện tử từ hệ thống...</p>
            </div>
          ) : (
            <>
              <div className="voucher-ticket-box">
                <div className="voucher-ticket-label">
                  MÃ ĐẶT CHỖ ĐIỆN TỬ (E-TICKET)
                </div>
                <div className="voucher-ticket-code">
                  {voucherData?.booking_code || booking?.booking_code}
                </div>

                <div className="voucher-ticket-qr">
                  <svg width="116" height="116" viewBox="0 0 100 100" fill="currentColor">
                    {/* Top-Left Finder */}
                    <rect x="4" y="4" width="28" height="28" rx="3" fill="#003580" />
                    <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                    <rect x="13" y="13" width="10" height="10" rx="1.5" fill="#003580" />

                    {/* Top-Right Finder */}
                    <rect x="68" y="4" width="28" height="28" rx="3" fill="#003580" />
                    <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                    <rect x="77" y="13" width="10" height="10" rx="1.5" fill="#003580" />

                    {/* Bottom-Left Finder */}
                    <rect x="4" y="68" width="28" height="28" rx="3" fill="#003580" />
                    <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                    <rect x="13" y="77" width="10" height="10" rx="1.5" fill="#003580" />

                    {/* Timing Patterns */}
                    <rect x="36" y="8" width="4" height="4" fill="#003580" />
                    <rect x="44" y="8" width="4" height="4" fill="#003580" />
                    <rect x="52" y="8" width="4" height="4" fill="#003580" />
                    <rect x="60" y="8" width="4" height="4" fill="#003580" />
                    <rect x="8" y="36" width="4" height="4" fill="#003580" />
                    <rect x="8" y="44" width="4" height="4" fill="#003580" />
                    <rect x="8" y="52" width="4" height="4" fill="#003580" />
                    <rect x="8" y="60" width="4" height="4" fill="#003580" />

                    {/* QR Data Matrix Cells */}
                    <rect x="36" y="20" width="8" height="8" fill="#003580" />
                    <rect x="52" y="20" width="4" height="12" fill="#003580" />
                    <rect x="60" y="28" width="4" height="4" fill="#003580" />
                    <rect x="20" y="36" width="8" height="8" fill="#003580" />
                    <rect x="36" y="36" width="12" height="4" fill="#003580" />
                    <rect x="56" y="40" width="12" height="4" fill="#003580" />
                    <rect x="76" y="36" width="8" height="4" fill="#003580" />
                    <rect x="88" y="40" width="8" height="8" fill="#003580" />
                    <rect x="20" y="52" width="4" height="12" fill="#003580" />
                    <rect x="36" y="48" width="8" height="16" fill="#003580" />
                    <rect x="52" y="52" width="12" height="8" fill="#003580" />
                    <rect x="72" y="48" width="12" height="8" fill="#003580" />
                    <rect x="88" y="60" width="8" height="4" fill="#003580" />
                    <rect x="36" y="72" width="12" height="4" fill="#003580" />
                    <rect x="56" y="68" width="8" height="12" fill="#003580" />
                    <rect x="72" y="68" width="8" height="8" fill="#003580" />
                    <rect x="84" y="76" width="12" height="4" fill="#003580" />
                    <rect x="40" y="84" width="8" height="12" fill="#003580" />
                    <rect x="56" y="88" width="12" height="8" fill="#003580" />
                    <rect x="76" y="84" width="8" height="12" fill="#003580" />
                    <rect x="88" y="88" width="8" height="8" fill="#003580" />
                  </svg>
                </div>

                {voucherData?.coupon_code && (
                  <div className="voucher-ticket-coupon" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TagDiscountIcon width="14" height="14" />
                    <span>Mã giảm giá đã áp dụng: <strong>{voucherData.coupon_code}</strong> ({voucherData.discount_text})</span>
                  </div>
                )}
              </div>

              <table className="voucher-info-table">
                <tbody>
                  <tr>
                    <td>Mã đặt chỗ:</td>
                    <td>
                      <span className="voucher-code-pill">
                        {voucherData?.booking_code || booking?.booking_code}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Ngày đặt phòng:</td>
                    <td>
                      <strong>{voucherData?.booking_date || booking?.booking_date_formatted}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Mã Coupon:</td>
                    <td>
                      {voucherData?.coupon_code ? (
                        <span className="voucher-coupon-pill">
                          {voucherData.coupon_code} ({voucherData.discount_text})
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>Không áp dụng mã giảm giá</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Khách sạn:</td>
                    <td><strong>{voucherData?.hotel_name}</strong></td>
                  </tr>
                  <tr>
                    <td>Địa chỉ:</td>
                    <td>{voucherData?.hotel_address}</td>
                  </tr>
                  <tr>
                    <td>Họ tên khách:</td>
                    <td><strong>{voucherData?.guest_name}</strong></td>
                  </tr>
                  <tr>
                    <td>Số điện thoại:</td>
                    <td>{voucherData?.guest_phone}</td>
                  </tr>
                  <tr>
                    <td>Loại phòng:</td>
                    <td>{voucherData?.room_type}</td>
                  </tr>
                  <tr>
                    <td>Nhận phòng:</td>
                    <td>{voucherData?.check_in_date}</td>
                  </tr>
                  <tr>
                    <td>Trả phòng:</td>
                    <td>{voucherData?.check_out_date}</td>
                  </tr>
                  <tr>
                    <td>Trạng thái đơn:</td>
                    <td>
                      <span style={{ color: booking?.status_badge_variant === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 700 }}>
                        {booking?.status_name}
                      </span>{' '}
                    </td>
                  </tr>
                  <tr>
                    <td>Tổng tiền đơn:</td>
                    <td>
                      <span style={{ color: '#059669', fontSize: 15, fontWeight: 700 }}>
                        {formatVnd(voucherData?.total_amount)}
                      </span>{' '}
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                        {voucherData?.is_paid ? '(Đã có giao dịch thanh toán)' : '(Chưa thanh toán trực tuyến)'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="voucher-tip-box">
                <InfoCircleIcon width="18" height="18" />
                <div>
                  <strong>Hướng dẫn nhận phòng:</strong> Quý khách chỉ cần xuất trình mã QR trên màn hình điện thoại hoặc cung cấp mã voucher tại quầy lễ tân khi làm thủ tục nhận phòng.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="my-bookings-modal-footer">
          <button
            type="button"
            className="my-bookings-btn-secondary"
            onClick={() => window.print()}
          >
            <PrinterIcon width="15" height="15" />
            <span>In vé / Tải PDF</span>
          </button>
          <button
            type="button"
            className="my-bookings-btn-primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingVoucherModal;
