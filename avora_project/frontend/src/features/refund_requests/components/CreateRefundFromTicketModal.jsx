import React, { useEffect, useState } from 'react';
import {
  CloseIcon,
  CreditCardIcon,
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '../../../common/components/icons';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';
import { codeNameParser } from '../../../utils/codeNameParser';

const removeVietnameseDiacritics = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

/**
 * Modal cho Business Manager:
 * - Chế độ 'FROM_TICKET': Tạo (hoặc gộp) Refund Request từ Support Ticket hoàn tiền đã duyệt (RFD + RSV).
 * - Chế độ 'EDIT_REFUND': Cập nhật Ngân hàng / STK / Chủ TK / Số tiền hoàn cho 1 Refund Request đang chờ (PND).
 */
const CreateRefundFromTicketModal = ({
  isOpen,
  mode = 'FROM_TICKET',
  ticket,
  refundItem,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const [refundAmount, setRefundAmount] = useState('');
  const [bankCd, setBankCd] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [mergeExisting, setMergeExisting] = useState(true);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch(API_ENDPOINTS.BOOKING_BANKS);
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled && list.length > 0) {
          setBanks(list);
          setLoadingBanks(false);
          return;
        }
      } catch {
        // Fallback to SYSTEM_CODES
      }

      try {
        const res = await fetch(`${API_ENDPOINTS.SYSTEM_CODES}?business_cd=BANK_CD`);
        const json = await res.json();
        const rawList = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setBanks(
            rawList.map((b) => ({
              bank_cd: b.code_cd,
              code_cd: b.code_cd,
              code_name: b.code_name,
              short_name: codeNameParser(b.code_name) || b.code_name,
              name: codeNameParser(b.code_name) || b.code_name,
            }))
          );
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setLoadingBanks(false);
      }
    };

    loadBanks();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setNote('');

    if (mode === 'FROM_TICKET' && ticket) {
      const suggested =
        ticket.suggestion?.suggested_refund_amount ||
        ticket.existing_pending_refund?.refund_amount ||
        ticket.booking?.paid_amount ||
        0;
      setRefundAmount(suggested > 0 ? String(Math.round(suggested)) : '');
      setBankCd(ticket.customer?.refund_bank_cd || '');
      setAccountNumber(ticket.customer?.refund_account_number || '');
      setAccountHolder(
        ticket.customer?.refund_account_holder ||
          removeVietnameseDiacritics(ticket.customer?.full_name || '').toUpperCase()
      );
      setSaveToProfile(true);
      setMergeExisting(Boolean(ticket.existing_pending_refund?.refund_id));
    } else if (mode === 'EDIT_REFUND' && refundItem) {
      setRefundAmount(refundItem.refund_amount ? String(Math.round(refundItem.refund_amount)) : '');
      setBankCd(refundItem.bank_cd || '');
      setAccountNumber(refundItem.account_number || '');
      setAccountHolder(
        refundItem.account_holder ||
          removeVietnameseDiacritics(refundItem.customer_name || '').toUpperCase()
      );
      setSaveToProfile(true);
      setMergeExisting(false);
    }
  }, [isOpen, mode, ticket, refundItem]);

  if (!isOpen) return null;

  const isFromTicket = mode === 'FROM_TICKET';
  const existingPending = isFromTicket ? ticket?.existing_pending_refund : null;
  const suggestion = isFromTicket ? ticket?.suggestion : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanAmount = Math.round(Number(String(refundAmount).replace(/[^\d]/g, '')));
    if (!Number.isInteger(cleanAmount) || cleanAmount <= 0) {
      setFormError('Vui lòng nhập số tiền cần hoàn hợp lệ (lớn hơn 0 VND).');
      return;
    }
    if (!String(bankCd).trim()) {
      setFormError('Vui lòng chọn ngân hàng nhận hoàn tiền.');
      return;
    }
    const cleanAcc = String(accountNumber).trim();
    if (!/^[0-9A-Za-z]{4,30}$/.test(cleanAcc)) {
      setFormError('Số tài khoản không hợp lệ (4–30 ký tự chữ/số, viết liền).');
      return;
    }
    const cleanHolder = removeVietnameseDiacritics(accountHolder).trim().toUpperCase();
    if (cleanHolder.length < 2) {
      setFormError('Vui lòng nhập tên chủ tài khoản nhận tiền (không dấu, viết hoa).');
      return;
    }

    try {
      await onSubmit({
        refund_amount: cleanAmount,
        bank_cd: String(bankCd).trim(),
        account_number: cleanAcc,
        account_holder: cleanHolder,
        save_to_user_profile: Boolean(saveToProfile),
        merge_existing_refund_id:
          isFromTicket && mergeExisting && existingPending?.refund_id
            ? existingPending.refund_id
            : null,
        note: note.trim(),
      });
    } catch (err) {
      setFormError(err.message || 'Không thể lưu thông tin hoàn tiền.');
    }
  };

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="disbursement-modal" style={{ maxWidth: '680px' }}>
        <div
          className="disbursement-modal__header"
          style={{
            background: 'linear-gradient(135deg, #003580 0%, #00224F 100%)',
            borderBottom: '2px solid rgba(255,255,255,0.2)',
          }}
        >
          <div className="disbursement-modal__header-info">
            <div
              className="disbursement-modal__icon"
              style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}
            >
              <CreditCardIcon size={20} />
            </div>
            <div>
              <h2 className="disbursement-modal__title">
                {isFromTicket
                  ? 'Tạo lệnh hoàn tiền từ Support Ticket'
                  : 'Cập nhật STK & Số tiền hoàn'}
              </h2>
              <p className="disbursement-modal__subtitle" style={{ color: '#E0F2FE' }}>
                {isFromTicket
                  ? `${ticket?.ticket_code || ''} · Khách hàng: ${ticket?.customer?.full_name || '—'}`
                  : `${refundItem?.refund_code || ''} · Khách hàng: ${refundItem?.customer_name || '—'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="disbursement-modal__close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            className="disbursement-modal__body"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {formError && (
              <div className="disbursement-qr-banner disbursement-qr-banner--error" role="alert">
                <AlertTriangleIcon size={16} />
                <div>{formError}</div>
              </div>
            )}

            {/* Thông tin tóm tắt Ticket / Đơn đặt phòng */}
            {isFromTicket && ticket && (
              <div
                className="disbursement-preview-box"
                style={{ marginBottom: '1rem', background: '#F8FAFC' }}
              >
                <div className="disbursement-qr-row">
                  <span className="disbursement-preview-label">Phiếu hỗ trợ</span>
                  <strong>
                    [{ticket.ticket_code}] {ticket.title}
                  </strong>
                </div>
                {ticket.booking && (
                  <div className="disbursement-qr-row">
                    <span className="disbursement-preview-label">Đơn đặt phòng liên kết</span>
                    <strong>
                      {ticket.booking.booking_code} · {ticket.booking.hotel_name} (Đã TT:{' '}
                      {formatCurrency(ticket.booking.paid_amount)})
                    </strong>
                  </div>
                )}
                {ticket.description && (
                  <div className="disbursement-qr-row" style={{ alignItems: 'flex-start' }}>
                    <span className="disbursement-preview-label">Nội dung khách gửi</span>
                    <span style={{ textAlign: 'right', maxWidth: '420px', fontSize: '0.84rem', color: '#334155' }}>
                      {ticket.description}
                    </span>
                  </div>
                )}
                {ticket.resolution_note && (
                  <div className="disbursement-qr-row" style={{ alignItems: 'flex-start' }}>
                    <span className="disbursement-preview-label">Ghi chú duyệt Ticket</span>
                    <span style={{ textAlign: 'right', maxWidth: '420px', fontSize: '0.84rem', color: '#065F46', fontWeight: 600 }}>
                      {ticket.resolution_note}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Gợi ý tính toán số tiền hoàn (nếu có booking) */}
            {isFromTicket && suggestion?.calculation_note && (
              <div className="disbursement-qr-banner disbursement-qr-banner--info" style={{ marginBottom: '1rem' }}>
                <InfoIcon size={16} />
                <div>
                  <strong>Gợi ý tính toán theo chính sách hủy phòng:</strong>
                  <div style={{ marginTop: '2px' }}>{suggestion.calculation_note}</div>
                </div>
              </div>
            )}

            {/* Cảnh báo chống trùng nếu đơn đặt phòng đã có sẵn 1 lệnh hoàn tiền đang PND */}
            {isFromTicket && existingPending && (
              <div
                className="disbursement-qr-banner disbursement-qr-banner--warn"
                style={{ marginBottom: '1rem' }}
              >
                <AlertTriangleIcon size={16} />
                <div style={{ flex: 1 }}>
                  <strong>Phát hiện đơn đặt phòng này đã có 1 lệnh hoàn tiền đang chờ ({formatCurrency(existingPending.refund_amount)})</strong>
                  <div style={{ marginTop: '4px', fontSize: '0.82rem' }}>
                    Để tránh hoàn tiền trùng 2 lần cho cùng 1 đơn hủy, hệ thống khuyến nghị gộp & cập nhật
                    STK/số tiền vào lệnh đang chờ sẵn. (Nếu đây là hoàn tiền chuyển khoản thừa 2 lần độc lập,
                    bạn có thể bỏ chọn để tạo lệnh riêng).
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={mergeExisting}
                      onChange={(e) => setMergeExisting(e.target.checked)}
                    />
                    <span>
                      Gộp và cập nhật vào lệnh hoàn tiền đang chờ hiện có (Khuyên dùng)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Số tiền cần hoàn */}
            <div className="disbursement-form-group" style={{ marginBottom: '1rem' }}>
              <label className="disbursement-form-label" htmlFor="bmr-refund-amount">
                Số tiền cần hoàn cho khách (VND) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="bmr-refund-amount"
                  type="number"
                  min="1000"
                  step="1"
                  className="disbursement-form-input"
                  placeholder="Nhập số tiền hoàn (VD: 850000)"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
                {isFromTicket && suggestion?.suggested_refund_amount > 0 && (
                  <button
                    type="button"
                    className="disbursement-btn disbursement-btn--outline"
                    onClick={() =>
                      setRefundAmount(String(Math.round(suggestion.suggested_refund_amount)))
                    }
                  >
                    Dùng mức gợi ý ({formatCurrency(suggestion.suggested_refund_amount)})
                  </button>
                )}
              </div>
            </div>

            {/* Thông tin Ngân hàng + STK + Chủ TK nhận hoàn tiền */}
            <div className="disbursement-form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="disbursement-form-label" htmlFor="bmr-refund-bank">
                Ngân hàng thụ hưởng của khách <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="bmr-refund-bank"
                className="disbursement-form-input"
                value={bankCd}
                onChange={(e) => setBankCd(e.target.value)}
                disabled={loadingBanks}
                required
              >
                <option value="">
                  {loadingBanks ? 'Đang tải danh sách ngân hàng...' : '-- Chọn ngân hàng nhận hoàn tiền --'}
                </option>
                {banks.map((b) => {
                  const cd = b.bank_cd || b.code_cd;
                  const label =
                    b.short_name && b.name && b.short_name !== b.name
                      ? `${b.short_name} - ${b.name}`
                      : b.name || b.short_name || b.code_name;
                  return (
                    <option key={cd} value={cd}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                marginBottom: '0.85rem',
              }}
            >
              <div className="disbursement-form-group">
                <label className="disbursement-form-label" htmlFor="bmr-refund-acc">
                  Số tài khoản nhận tiền <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="bmr-refund-acc"
                  type="text"
                  className="disbursement-form-input"
                  placeholder="VD: 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                  required
                />
              </div>

              <div className="disbursement-form-group">
                <label className="disbursement-form-label" htmlFor="bmr-refund-holder">
                  Tên chủ tài khoản (Không dấu) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="bmr-refund-holder"
                  type="text"
                  className="disbursement-form-input"
                  placeholder="VD: NGUYEN VAN A"
                  value={accountHolder}
                  onChange={(e) =>
                    setAccountHolder(removeVietnameseDiacritics(e.target.value).toUpperCase())
                  }
                  required
                />
              </div>
            </div>

            {isFromTicket && (
              <div className="disbursement-form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="disbursement-form-label" htmlFor="bmr-refund-note">
                  Ghi chú nghiệp vụ hoàn tiền (tùy chọn)
                </label>
                <input
                  id="bmr-refund-note"
                  type="text"
                  className="disbursement-form-input"
                  placeholder="VD: Hoàn tiền theo phiếu hỗ trợ RFD đã được Admin xác nhận..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}

            <label
              className="disbursement-qr-ack"
              style={{ marginTop: '0.5rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
              />
              <span>
                Lưu cập nhật Ngân hàng & Số tài khoản này vào hồ sơ mặc định (<code>m_user</code>) của
                khách hàng cho các lần sau
              </span>
            </label>
          </div>

          <div className="disbursement-modal__footer" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="disbursement-btn disbursement-btn--outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="disbursement-btn disbursement-btn--primary"
              disabled={loading}
            >
              <CheckIcon size={16} />
              <span>
                {loading
                  ? 'Đang xử lý...'
                  : isFromTicket
                    ? existingPending && mergeExisting
                      ? 'Gộp & Cập nhật lệnh hoàn tiền'
                      : 'Tạo lệnh hoàn tiền'
                    : 'Lưu cập nhật'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRefundFromTicketModal;

