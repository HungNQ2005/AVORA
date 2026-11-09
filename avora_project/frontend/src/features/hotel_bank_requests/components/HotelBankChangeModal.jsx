import React, { useState, useEffect } from 'react';
import {
  CreditCardIcon,
  HotelIcon,
  UserIcon,
  CloseIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SpinnerIcon,
} from '../../../common/components/icons';
import './HotelBankChangeModal.css';
import { fetchSystemBanks } from '../../../services/hotelBankRequestApi';

const ExternalLinkIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const extractErrorMessage = (err, fallback = 'Đã xảy ra lỗi khi thực hiện.') => {
  const backendMsg = err?.response?.data?.message;
  if (backendMsg && typeof backendMsg === 'string') return backendMsg;
  const rawMsg = err?.message || '';
  if (/failed to fetch|network|load failed/i.test(rawMsg)) {
    return 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
  }
  if (/internal server error|500/i.test(rawMsg)) {
    return 'Đã xảy ra lỗi hệ thống trên máy chủ. Vui lòng thử lại sau.';
  }
  return rawMsg || fallback;
};

const HotelBankChangeModal = ({
  isOpen,
  onClose,
  request,
  systemBanks = [],
  onSubmit,
}) => {
  const [localBanks, setLocalBanks] = useState(systemBanks);
  const [bankCd, setBankCd] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Luôn đảm bảo danh mục ngân hàng được tải trực tiếp từ m_system_code
  useEffect(() => {
    if (systemBanks && systemBanks.length > 0) {
      setLocalBanks(systemBanks);
    } else if (isOpen) {
      fetchSystemBanks()
        .then((data) => setLocalBanks(data || []))
        .catch((err) => console.warn('Could not load banks from data:', err));
    }
  }, [isOpen, systemBanks]);
  useEffect(() => {
    if (isOpen && request) {
      setError('');
      setConfirmed(false);
      setBankCd('');
      setAccountNumber('');
      setAccountHolder('');

      // Cố gắng phân tích tự động dữ liệu dự kiến nếu có trong description của ticket
      if (request.description) {
        const text = request.description;
        const accMatch = text.match(/Số tài khoản(?: ngân hàng)?(?: muốn thay đổi)?:\s*([a-zA-Z0-9]+)/i);
        if (accMatch && accMatch[1]) {
          setAccountNumber(accMatch[1].trim());
        }
      }
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const { ticket_id, hotel, requester } = request;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!bankCd) {
      setError('Vui lòng chọn ngân hàng mới từ danh mục hệ thống.');
      return;
    }
    const cleanAccNumber = accountNumber.trim();
    if (!cleanAccNumber || cleanAccNumber.length < 4) {
      setError('Vui lòng nhập số tài khoản mới hợp lệ (tối thiểu 4 ký tự).');
      return;
    }
    const cleanHolder = accountHolder.trim().toUpperCase();
    if (!cleanHolder || cleanHolder.length < 2) {
      setError('Vui lòng nhập tên chủ tài khoản mới (tối thiểu 2 ký tự).');
      return;
    }
    if (!confirmed) {
      setError('Bạn phải tích xác nhận đã trao đổi với khách sạn trước khi đổi thông tin.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ticketId: ticket_id,
        bank_cd: bankCd,
        account_number: cleanAccNumber,
        account_holder: cleanHolder,
        confirmed_with_hotel: confirmed,
      });
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể thực thi đổi tài khoản ngân hàng. Vui lòng thử lại sau.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hbc-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="hbc-modal-title">
      <div className="hbc-modal-card">
        {/* Header */}
        <header className="hbc-modal-header">
          <div className="hbc-modal-header-title">
            <span className="hbc-modal-header-icon">
              <CreditCardIcon size={18} />
            </span>
            <h3 id="hbc-modal-title">Xác nhận đổi tài khoản ngân hàng khách sạn</h3>
          </div>
          <button
            type="button"
            className="hbc-modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="hbc-form-container">
          <div className="hbc-modal-content">
            {error && (
              <div className="hbc-alert hbc-alert--error" role="alert">
                <AlertTriangleIcon size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Khối 1: Thông tin khách sạn & Người yêu cầu */}
            <div className="hbc-info-grid">
              <div className="hbc-info-card">
                <div className="hbc-info-card-title">
                  <HotelIcon size={14} />
                  <span>Thông tin khách sạn</span>
                </div>
                <div className="hbc-info-row">
                  <strong>Tên KS:</strong> {hotel?.hotel_name || '—'}
                </div>
                <div className="hbc-info-row">
                  <strong>Địa chỉ:</strong> {hotel?.address || '—'}
                </div>
                <div className="hbc-info-row">
                  <strong>STK hiện tại:</strong><br />
                  {hotel?.current_bank ? (
                    <span className="hbc-current-bank-tag">
                      {hotel.current_bank.bank_name || hotel.current_bank.bank_cd} - {hotel.current_bank.account_number} ({hotel.current_bank.account_holder})
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                      Chưa có tài khoản xác minh
                    </span>
                  )}
                </div>
              </div>

              <div className="hbc-info-card">
                <div className="hbc-info-card-title">
                  <UserIcon size={14} />
                  <span>Người yêu cầu (Vendor)</span>
                </div>
                <div className="hbc-info-row">
                  <strong>Họ tên:</strong> {requester?.full_name || '—'}
                </div>
                <div className="hbc-info-row">
                  <strong>Email:</strong> {requester?.email || '—'}
                </div>
                <div className="hbc-info-row">
                  <strong>Số điện thoại:</strong> {requester?.phone || '—'}
                </div>
              </div>
            </div>

            {/* Khối 2: Nút click để nhảy vào xem lại ticket */}
            <div className="hbc-ticket-link-banner">
              <div className="hbc-ticket-link-info">
                <strong>Hồ sơ Ticket #{ticket_id.slice(0, 8)}</strong>
                <span>Nhấp để kiểm tra lại các tài liệu đính kèm (CCCD, sao kê, công văn xác nhận).</span>
              </div>
              <a
                href={`/dashboard/support?ticketId=${encodeURIComponent(ticket_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hbc-ticket-link-btn"
                title="Mở chi tiết phiếu hỗ trợ trong tab mới"
              >
                <span>Xem lại Ticket</span>
                <ExternalLinkIcon size={15} />
              </a>
            </div>

            {/* Khối 3: 3 trường nhập liệu mới */}
            <div className="hbc-form">
              <h4 className="hbc-form-section-title">Thông tin tài khoản ngân hàng mới</h4>

              {/* Trường 1: Ngân hàng mới (Dropdown lấy từ system code) */}
              <div className="hbc-form-group">
                <label htmlFor="hbc-new-bank" className="hbc-form-label">
                  Ngân hàng mới <span className="hbc-req">*</span>
                </label>
                <select
                  id="hbc-new-bank"
                  className="hbc-select"
                  value={bankCd}
                  onChange={(e) => setBankCd(e.target.value)}
                  required
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {localBanks.map((bank) => (
                    <option key={bank.code_cd || bank.bank_cd} value={bank.code_cd || bank.bank_cd}>
                      {bank.code_name || bank.short_name} - {bank.name || bank.code_name}
                    </option>
                  ))}
                </select>
                <span className="hbc-form-hint">Danh mục lấy trực tiếp từ dữ liệu hệ thống.</span>
              </div>

              {/* Trường 2: Số tài khoản mới */}
              <div className="hbc-form-group">
                <label htmlFor="hbc-new-acc-num" className="hbc-form-label">
                  Số tài khoản mới <span className="hbc-req">*</span>
                </label>
                <input
                  id="hbc-new-acc-num"
                  type="text"
                  className="hbc-input hbc-input--mono"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Nhập số tài khoản ngân hàng mới..."
                  required
                  autoComplete="off"
                />
              </div>

              {/* Trường 3: Tên chủ tài khoản mới */}
              <div className="hbc-form-group">
                <label htmlFor="hbc-new-acc-holder" className="hbc-form-label">
                  Tên chủ tài khoản mới <span className="hbc-req">*</span>
                </label>
                <input
                  id="hbc-new-acc-holder"
                  type="text"
                  className="hbc-input hbc-input--uppercase"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN VAN A (Tự động in hoa)"
                  required
                  autoComplete="off"
                />
                <span className="hbc-form-hint">Tên in hoa không dấu đúng theo giấy đăng ký kinh doanh hoặc tài khoản thụ hưởng.</span>
              </div>
            </div>

            {/* Khối 4: Checkbox confirm đã trao đổi với khách sạn */}
            <div className="hbc-confirm-group">
              <label className="hbc-confirm-label">
                <input
                  type="checkbox"
                  className="hbc-confirm-checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  <strong>Xác nhận an toàn:</strong> Tôi đã trao đổi trực tiếp với đại diện khách sạn và xác nhận thay đổi thông tin tài khoản ngân hàng thụ hưởng này trên hệ thống.
                </span>
              </label>
            </div>
          </div>

          {/* Khối 5: Nút thao tác */}
          <footer className="hbc-modal-footer">
            <button
              type="button"
              className="hbc-btn-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="hbc-btn-submit"
              disabled={!confirmed || submitting}
            >
              {submitting ? (
                <>
                  <SpinnerIcon size={16} />
                  <span>Đang thực hiện...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon size={16} />
                  <span>Đổi tài khoản</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default HotelBankChangeModal;
