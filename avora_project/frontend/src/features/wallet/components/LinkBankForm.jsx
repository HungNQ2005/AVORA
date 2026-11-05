import React from 'react';
import { codeNameParser } from '../../../utils/codeNameParser';
import VirtualBankCard from './VirtualBankCard';

const LinkBankForm = ({
  formData,
  banks,
  vendorSavedAccounts = [],
  onQuickFillSavedAccount,
  fieldErrors = {},
  touchedFields = {},
  onBankChange,
  onFormChange,
  onFieldBlur,
  onSubmit,
  isSubmitting,
}) => {
  const selectedBank = banks.find((b) => String(b.code_cd || b.bank_cd) === String(formData.bank_cd));

  const getInputClass = (fieldName, value) => {
    const isTouched = Boolean(touchedFields[fieldName]);
    const hasError = Boolean(fieldErrors[fieldName]);
    if (isTouched && hasError) return 'hw-input--invalid';
    if (isTouched && !hasError && String(value ?? '').trim() !== '') return 'hw-input--valid';
    return '';
  };

  return (
    <form className="hw-form" onSubmit={onSubmit} noValidate>
      {/* Alert Notice */}
      <div className="hw-alert-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <strong>Lưu ý bảo mật:</strong> Mỗi khách sạn chỉ được liên kết <strong>1 tài khoản ngân hàng duy nhất</strong>. Bạn có thể dùng chung tài khoản ngân hàng giữa các khách sạn của mình hoặc nhập tài khoản riêng cho từng khách sạn.
        </div>
      </div>

      {/* Quick-Reuse Saved Bank Account from Vendor's Other Active Hotels */}
      {vendorSavedAccounts.length > 0 && (
        <div className="hw-saved-accounts-box">
          <div className="hw-saved-accounts-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Dùng chung tài khoản đã liên kết ở khách sạn khác của bạn (hoặc tự nhập tài khoản khác bên dưới):</span>
          </div>
          <div className="hw-saved-accounts-list">
            {vendorSavedAccounts.map((acc) => {
              const bankObj = banks.find((b) => String(b.code_cd || b.bank_cd) === String(acc.bank_cd));
              const bankLabel = bankObj ? `${codeNameParser(bankObj.code_name)} (${bankObj.code_name})` : codeNameParser(acc.bank_cd);
              const isSelected =
                String(formData.bank_cd) === String(acc.bank_cd) &&
                String(formData.account_number) === String(acc.account_number);

              return (
                <div
                  key={`${acc.bank_cd}-${acc.account_number}`}
                  className={`hw-saved-account-item ${isSelected ? 'hw-saved-account-item--active' : ''}`}
                >
                  <div className="hw-saved-account-info">
                    <strong>{bankLabel} — {acc.account_number}</strong>
                    <span>{acc.account_holder} • Đang dùng tại: <em>{acc.source_hotel_name}</em></span>
                  </div>
                  <button
                    type="button"
                    className="hw-saved-account-btn"
                    onClick={() => onQuickFillSavedAccount && onQuickFillSavedAccount(acc)}
                  >
                    {isSelected ? '✓ Đã chọn điền' : 'Dùng tài khoản này'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Interactive Virtual Bank Card Preview (Matches official bank branding in real-time with zero hardcoding) */}
      <div className="hw-form-preview-area">
        <VirtualBankCard
          bankCd={selectedBank?.bank_cd || formData.bank_cd}
          codeName={selectedBank?.code_name}
          bankDisplayName={selectedBank ? codeNameParser(selectedBank.code_name) : 'CHỌN NGÂN HÀNG THỤ HƯỞNG'}
          logoUrl={selectedBank?.logo_url}
          logoBase64={selectedBank?.logo_base64}
          accountNumber={formData.account_number}
          accountHolder={formData.account_holder}
          bankBranch={formData.bank_branch}
          binCode={formData.bin_code || selectedBank?.bin_code}
          isPreview={true}
        />
      </div>

      {/* Field Grid matching Hotel Management theme */}
      <div className="hw-field-grid">
        <label className="hw-field">
          <span>Ngân hàng thụ hưởng <b className="hw-required">*</b></span>
          <select
            name="bank_cd"
            value={formData.bank_cd}
            onChange={onBankChange}
            onBlur={onFieldBlur}
            className={getInputClass('bank_cd', formData.bank_cd)}
            required
          >
            <option value="">-- Chọn ngân hàng --</option>
            {banks.map((b) => (
              <option key={b.bank_cd} value={b.code_cd || b.bank_cd}>
                {codeNameParser(b.code_name)} ({b.code_name})
              </option>
            ))}
          </select>
          {touchedFields.bank_cd && fieldErrors.bank_cd ? (
            <small className="hw-field__error">{fieldErrors.bank_cd}</small>
          ) : (
            <small>Chọn ngân hàng chính thức nhận tiền thanh toán doanh thu</small>
          )}
        </label>

        <label className="hw-field">
          <span>Mã định danh ngân hàng (BIN)</span>
          <input
            type="text"
            value={formData.bin_code ? `${formData.bin_code} (Chuẩn NAPAS 247)` : 'Tự động cấp theo ngân hàng'}
            readOnly
            disabled
            className="hw-input--readonly"
          />
          <small>Được hệ thống tự động đối chiếu từ dữ liệu VietQR chuẩn</small>
        </label>

        <label className="hw-field">
          <span>Số tài khoản ngân hàng <b className="hw-required">*</b></span>
          <input
            type="text"
            inputMode="numeric"
            name="account_number"
            value={formData.account_number}
            onChange={onFormChange}
            onBlur={onFieldBlur}
            placeholder="Ví dụ: 0011001234567"
            maxLength={20}
            className={getInputClass('account_number', formData.account_number)}
            required
          />
          {touchedFields.account_number && fieldErrors.account_number ? (
            <small className="hw-field__error">{fieldErrors.account_number}</small>
          ) : (
            <small>Chỉ gồm 6 đến 20 chữ số ({formData.account_number.length}/20)</small>
          )}
        </label>

        <label className="hw-field">
          <span>Tên chủ tài khoản <b className="hw-required">*</b></span>
          <input
            type="text"
            name="account_holder"
            value={formData.account_holder}
            onChange={onFormChange}
            onBlur={onFieldBlur}
            placeholder="Ví dụ: NGUYEN VAN A"
            maxLength={100}
            className={getInputClass('account_holder', formData.account_holder)}
            required
          />
          {touchedFields.account_holder && fieldErrors.account_holder ? (
            <small className="hw-field__error">{fieldErrors.account_holder}</small>
          ) : (
            <small>In hoa không dấu, đầy đủ Họ & Tên trùng khớp tại ngân hàng</small>
          )}
        </label>

        <label className="hw-field hw-field--wide">
          <span>Chi nhánh mở tài khoản ngân hàng</span>
          <input
            type="text"
            name="bank_branch"
            value={formData.bank_branch}
            onChange={onFormChange}
            onBlur={onFieldBlur}
            placeholder="Ví dụ: Chi nhánh Ba Đình, Hà Nội"
            maxLength={150}
            className={getInputClass('bank_branch', formData.bank_branch)}
          />
          {touchedFields.bank_branch && fieldErrors.bank_branch ? (
            <small className="hw-field__error">{fieldErrors.bank_branch}</small>
          ) : (
            <small>Phòng giao dịch / Chi nhánh ngân hàng phát hành số tài khoản (không bắt buộc, từ 3–150 ký tự)</small>
          )}
        </label>
      </div>

      {/* Form Action Bar matching Avora dashboard */}
      <footer className="hw-form-actions">
        <span className="hw-form-actions__hint">
          Kiểm tra kỹ thông tin trên thẻ xem trước trước khi xác nhận liên kết
        </span>
        <button
          type="submit"
          className="hotel-button hotel-button--primary hw-submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang xử lý…' : 'Xác nhận liên kết ngân hàng'}
        </button>
      </footer>
    </form>
  );
};

export default LinkBankForm;
