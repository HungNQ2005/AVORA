import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangleIcon, CalendarCancelIcon, ShieldCheckIcon } from './BookingIcons';
import { formatVnd } from './bookingCardHelpers';
import { fetchRefundBanks } from '../../../services/bookingApi';
import { useAuth } from '../../../context/AuthContext';
import './CancelBookingModal.css';

/**
 * Remove Vietnamese accents and convert to uppercase
 * Example: 'Nguyễn Văn An' -> 'NGUYEN VAN AN'
 */
const sanitizeAccountHolder = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
};

const COMMON_REASONS = [
  'Khách thay đổi kế hoạch chuyến đi',
  'Tìm thấy khách sạn / phòng khác phù hợp hơn',
  'Lý do sức khỏe / công việc đột xuất',
  'Giá phòng hoặc chính sách không còn phù hợp',
  'Khác',
];

/**
 * Modal 4: Xác nhận hủy đặt phòng & Yêu cầu hoàn tiền (Phân nhánh 2 trường hợp)
 */
const CancelBookingModal = ({
  booking,
  isCancelling,
  onConfirm,
  onClose,
}) => {
  if (!booking) return null;

  // Determine branch:
  // Trường hợp 1: Đơn chưa thanh toán HOẶC số tiền hoàn = 0đ
  // Trường hợp 2: Đơn đã thanh toán VÀ số tiền hoàn > 0đ
  const { user } = useAuth();

  const isPaid = Boolean(
    (booking.payment?.is_paid || booking.payment?.has_partial_payment) &&
    Number(booking.payment?.total_paid_amount || booking.payment?.amount_paid || 0) > 0
  );

  const estimatedRefundAmount = Number(
    booking.status_code_name === 'PND' && booking.payment?.total_paid_amount > 0
      ? booking.payment.total_paid_amount
      : booking.cancellation?.estimated_refund_amount ??
        (isPaid ? booking.total_amount : 0)
  );

  const isCase2 = isPaid && estimatedRefundAmount > 0;

  // Form states
  const [reasonCategory, setReasonCategory] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Bank refund form states (Case 2)
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [accountNumber, setAccountNumber] = useState(user?.refund_account_number || '');
  const [accountHolder, setAccountHolder] = useState(user?.refund_account_holder || '');

  // Field validation errors
  const [errors, setErrors] = useState({});

  const bankDropdownRef = useRef(null);

  // Load supported banks from m_system_code when in Case 2
  useEffect(() => {
    if (!isCase2) return;
    let active = true;
    setLoadingBanks(true);

    fetchRefundBanks()
      .then((bankList) => {
        if (!active) return;
        const list = bankList || [];
        setBanks(list);
        if (user?.refund_bank_cd) {
          const defaultBank = list.find(
            (b) => String(b.bank_cd || b.code_cd) === String(user.refund_bank_cd)
          );
          if (defaultBank) setSelectedBank(defaultBank);
        }
      })
      .catch((err) => {
        console.warn('Failed to load banks for refund:', err);
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });

    return () => {
      active = false;
    };
  }, [isCase2]);

  // Close bank dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target)) {
        setIsBankDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter banks by search
  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return banks;
    const q = bankSearchQuery.trim().toLowerCase();
    return banks.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.short_name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.code_name?.toLowerCase().includes(q) ||
        b.bank_cd?.toLowerCase().includes(q) ||
        (b.bin && String(b.bin).includes(q)) ||
        (b.bin_code && String(b.bin_code).includes(q))
    );
  }, [banks, bankSearchQuery]);

  // Account holder change handler: auto uppercase & remove tones
  const handleAccountHolderChange = (e) => {
    const raw = e.target.value;
    const clean = sanitizeAccountHolder(raw);
    setAccountHolder(clean);
    if (errors.accountHolder) {
      setErrors((prev) => ({ ...prev, accountHolder: null }));
    }
  };

  // Account number change handler: numbers only
  const handleAccountNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setAccountNumber(val);
    if (errors.accountNumber) {
      setErrors((prev) => ({ ...prev, accountNumber: null }));
    }
  };

  // Resolve final reason text
  const finalReason =
    reasonCategory === 'Khác' && customReason.trim()
      ? customReason.trim()
      : reasonCategory;

  // Submit action with validation
  const handleSubmit = () => {
    const newErrors = {};

    if (reasonCategory === 'Khác' && !customReason.trim()) {
      newErrors.reason = 'Vui lòng nhập lý do hủy phòng cụ thể.';
    }

    if (isCase2) {
      if (!selectedBank) {
        newErrors.bank = 'Vui lòng chọn ngân hàng nhận tiền hoàn từ danh sách hệ thống.';
      }
      if (!accountNumber || accountNumber.length < 6 || accountNumber.length > 25) {
        newErrors.accountNumber = 'Vui lòng nhập số tài khoản ngân hàng hợp lệ (từ 6 đến 25 chữ số).';
      }
      if (!accountHolder || accountHolder.trim().length < 3) {
        newErrors.accountHolder = 'Vui lòng nhập tên chủ tài khoản (viết hoa không dấu).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const payload = {
      reason: finalReason,
    };

    if (isCase2 && selectedBank) {
      const bankShort = selectedBank.short_name || selectedBank.code_name || selectedBank.code || '';
      const bankFull = selectedBank.name || selectedBank.code_name || '';
      payload.bank_cd = selectedBank.bank_cd || selectedBank.code_cd || selectedBank.code || '';
      payload.bank_name = bankShort && bankFull && bankShort !== bankFull
        ? `${bankFull} (${bankShort})`
        : (bankFull || bankShort);
      payload.bank_bin = selectedBank.bin || selectedBank.bin_code || '';
      payload.account_number = accountNumber.trim();
      payload.account_holder = accountHolder.trim();
    }

    onConfirm(payload);
  };

  return (
    <div
      className="cbm-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="cbm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div
          className={`cbm-header ${
            isCase2 ? 'cbm-header--refund' : 'cbm-header--warning'
          }`}
        >
          <div className="cbm-header-left">
            <div
              className={`cbm-header-icon ${
                isCase2 ? 'cbm-header-icon--refund' : 'cbm-header-icon--warning'
              }`}
              aria-hidden="true"
            >
              {isCase2 ? (
                <ShieldCheckIcon width="24" height="24" />
              ) : (
                <AlertTriangleIcon width="24" height="24" />
              )}
            </div>
            <div className="cbm-header-title-wrap">
              <h3>
                {isCase2
                  ? 'Yêu cầu hủy phòng & Hoàn tiền'
                  : 'Xác nhận hủy đặt phòng'}
              </h3>
              <span className="cbm-header-subtitle">
                Mã đơn: #{booking.booking_code} • {booking.hotel?.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="cbm-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="cbm-body">
          {/* TRƯỜNG HỢP 1: Đơn chưa thanh toán hoặc hoàn 0đ */}
          {!isCase2 ? (
            <div className="cbm-unpaid-box">
              <h4 className="cbm-unpaid-box__title">
                Bạn có chắc chắn muốn hủy đặt phòng?
              </h4>
              <p className="cbm-unpaid-box__desc">
                {!isPaid
                  ? 'Đơn đặt phòng này hiện chưa thanh toán. Sau khi hủy, phòng sẽ được giải phóng ngay lập tức trên hệ thống.'
                  : 'Đơn đặt phòng này không phát sinh hoàn tiền theo chính sách hủy phòng của khách sạn.'}
              </p>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: Đơn đã thanh toán và số tiền hoàn > 0đ */
            <>
              {/* Box thông báo số tiền khách sẽ được hoàn lại */}
              <div className="cbm-refund-banner">
                <div className="cbm-refund-banner__top">
                  <span className="cbm-refund-banner__label">
                    Thông tin hoàn tiền
                  </span>
                  <span
                    className={`cbm-refund-badge ${
                      (booking.cancellation?.refund_percentage ?? 100) < 100
                        ? 'cbm-refund-badge--penalty'
                        : ''
                    }`}
                  >
                    Hoàn {booking.cancellation?.refund_percentage ?? 100}% giá trị đơn
                  </span>
                </div>

                <div className="cbm-refund-amount-row">
                  <span>Số tiền bạn sẽ được hoàn lại:</span>
                  <strong className="cbm-refund-amount-val">
                    {formatVnd(estimatedRefundAmount)}
                  </strong>
                </div>

                {booking.cancellation?.policy_note && (
                  <p className="cbm-refund-banner__note">
                    {booking.cancellation.policy_note}
                  </p>
                )}
              </div>

              {/* Form bắt buộc khách điền thông tin tài khoản nhận tiền */}
              <div className="cbm-section-title">
                Thông tin tài khoản nhận tiền hoàn
              </div>

              <div className="cbm-form-grid">
                {/* 1. Ngân hàng nhận tiền (Hệ thống m_system_code) */}
                <div className="cbm-field" ref={bankDropdownRef}>
                  <label className="cbm-label">
                    <span>
                      Ngân hàng nhận tiền <span className="cbm-req">*</span>
                    </span>
                    {(selectedBank?.bin || selectedBank?.bin_code) && (
                      <span className="cbm-label-hint">
                        Mã BIN: {selectedBank.bin || selectedBank.bin_code}
                      </span>
                    )}
                  </label>

                  <div className="cbm-bank-selector">
                    <button
                      type="button"
                      className={`cbm-bank-trigger ${
                        isBankDropdownOpen ? 'cbm-bank-trigger--active' : ''
                      } ${errors.bank ? 'cbm-input--error' : ''}`}
                      onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                    >
                      {selectedBank ? (
                        <div className="cbm-bank-trigger-content">
                          {(selectedBank.logo || selectedBank.logo_url) && (
                            <img
                              src={selectedBank.logo || selectedBank.logo_url}
                              alt={selectedBank.short_name || selectedBank.code_name || ''}
                              className="cbm-bank-logo"
                            />
                          )}
                          <div className="cbm-bank-info">
                            <span className="cbm-bank-shortname">
                              {selectedBank.short_name || selectedBank.code_name || selectedBank.name}
                            </span>
                            <span className="cbm-bank-bin-badge">
                              {selectedBank.name || selectedBank.code_name}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="cbm-bank-placeholder">
                          {loadingBanks
                            ? 'Đang tải danh sách ngân hàng hệ thống...'
                            : 'Chọn ngân hàng nhận tiền...'}
                        </span>
                      )}
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        ▼
                      </span>
                    </button>

                    {isBankDropdownOpen && (
                      <div className="cbm-bank-dropdown">
                        <div className="cbm-bank-search-wrap">
                          <input
                            type="text"
                            className="cbm-bank-search-input"
                            placeholder="Tìm kiếm ngân hàng (tên, mã BIN, viết tắt)..."
                            value={bankSearchQuery}
                            onChange={(e) => setBankSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="cbm-bank-list">
                          {filteredBanks.length === 0 ? (
                            <div
                              style={{
                                padding: '1rem',
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '0.85rem',
                              }}
                            >
                              Không tìm thấy ngân hàng phù hợp.
                            </div>
                          ) : (
                            filteredBanks.map((b) => (
                              <button
                                key={b.bank_cd || b.code_cd || b.bin || b.code || b.id}
                                type="button"
                                className={`cbm-bank-item ${
                                  ((selectedBank?.bank_cd && selectedBank.bank_cd === b.bank_cd) ||
                                   (selectedBank?.code_cd && selectedBank.code_cd === b.code_cd) ||
                                   (selectedBank?.bin && selectedBank.bin === b.bin))
                                    ? 'cbm-bank-item--selected'
                                    : ''
                                }`}
                                onClick={() => {
                                  setSelectedBank(b);
                                  setIsBankDropdownOpen(false);
                                  setBankSearchQuery('');
                                  if (errors.bank) {
                                    setErrors((prev) => ({
                                      ...prev,
                                      bank: null,
                                    }));
                                  }
                                }}
                              >
                                {(b.logo || b.logo_url) && (
                                  <img
                                    src={b.logo || b.logo_url}
                                    alt={b.short_name || b.code_name || ''}
                                    className="cbm-bank-logo"
                                  />
                                )}
                                <div className="cbm-bank-item-text">
                                  <span className="cbm-bank-item-title">
                                    {b.short_name || b.code_name || b.name}{' '}
                                    {(b.bin || b.bin_code) && (
                                      <span
                                        style={{
                                          color: '#64748b',
                                          fontSize: '0.72rem',
                                          fontWeight: 400,
                                        }}
                                      >
                                        (BIN: {b.bin || b.bin_code})
                                      </span>
                                    )}
                                  </span>
                                  <span className="cbm-bank-item-sub">
                                    {b.name || b.code_name}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.bank && (
                    <span className="cbm-error-msg">{errors.bank}</span>
                  )}
                </div>

                {/* 2. Số tài khoản nhận tiền */}
                <div className="cbm-field">
                  <label className="cbm-label">
                    <span>
                      Số tài khoản nhận tiền <span className="cbm-req">*</span>
                    </span>
                    <span className="cbm-label-hint">Chỉ nhập chữ số</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`cbm-input ${
                      errors.accountNumber ? 'cbm-input--error' : ''
                    }`}
                    placeholder="Ví dụ: 0987654321"
                    value={accountNumber}
                    onChange={handleAccountNumberChange}
                    maxLength={25}
                  />
                  {errors.accountNumber && (
                    <span className="cbm-error-msg">
                      {errors.accountNumber}
                    </span>
                  )}
                </div>

                {/* 3. Tên chủ tài khoản (viết hoa không dấu) */}
                <div className="cbm-field">
                  <label className="cbm-label">
                    <span>
                      Tên chủ tài khoản (viết hoa không dấu){' '}
                      <span className="cbm-req">*</span>
                    </span>
                    <span className="cbm-label-hint">
                      Tự động chuyển in hoa
                    </span>
                  </label>
                  <input
                    type="text"
                    className={`cbm-input cbm-input-uppercase ${
                      errors.accountHolder ? 'cbm-input--error' : ''
                    }`}
                    placeholder="VD: NGUYEN VAN A"
                    value={accountHolder}
                    onChange={handleAccountHolderChange}
                    maxLength={100}
                  />
                  {errors.accountHolder && (
                    <span className="cbm-error-msg">
                      {errors.accountHolder}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 4. Lý do hủy phòng (Cả 2 trường hợp đều có) */}
          <div className="cbm-field">
            <label className="cbm-label">
              <span>
                Lý do hủy phòng <span className="cbm-req">*</span>
              </span>
            </label>
            <select
              className="cbm-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {reasonCategory === 'Khác' && (
              <textarea
                className={`cbm-input ${
                  errors.reason ? 'cbm-input--error' : ''
                }`}
                style={{ marginTop: '0.45rem', minHeight: '65px' }}
                placeholder="Vui lòng nhập lý do hủy phòng của bạn..."
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (errors.reason) {
                    setErrors((prev) => ({ ...prev, reason: null }));
                  }
                }}
              />
            )}
            {errors.reason && (
              <span className="cbm-error-msg">{errors.reason}</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cbm-footer">
          <button
            type="button"
            className="cbm-btn-secondary"
            onClick={onClose}
            disabled={isCancelling}
          >
            Giữ lại phòng
          </button>
          <button
            type="button"
            className={isCase2 ? 'cbm-btn-primary' : 'cbm-btn-danger'}
            onClick={handleSubmit}
            disabled={isCancelling}
          >
            <CalendarCancelIcon width="16" height="16" />
            <span>
              {isCancelling
                ? 'Đang xử lý...'
                : isCase2
                ? 'Xác nhận gửi yêu cầu hoàn tiền'
                : 'Xác nhận hủy phòng'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
