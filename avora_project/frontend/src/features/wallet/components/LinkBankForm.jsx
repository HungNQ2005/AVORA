import React from 'react';
import { codeNameParser } from '../../../utils/codeNameParser';
import VirtualBankCard from './VirtualBankCard';

const LinkBankForm = ({
  formData,
  banks,
  onBankChange,
  onFormChange,
  onSubmit,
  isSubmitting,
}) => {
  const selectedBank = banks.find((b) => String(b.code_cd || b.bank_cd) === String(formData.bank_cd));

  return (
    <form className="hw-form" onSubmit={onSubmit}>
      {/* Alert Notice */}
      <div className="hw-alert-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <strong>Lưu ý bảo mật:</strong> Mỗi khách sạn chỉ được liên kết <strong>1 tài khoản ngân hàng duy nhất</strong>. Sau khi xác nhận, thông tin tài khoản sẽ được cố định với ví khách sạn để đảm bảo an toàn đối soát và chi trả doanh thu.
        </div>
      </div>

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
            required
          >
            <option value="">-- Chọn ngân hàng --</option>
            {banks.map((b) => (
              <option key={b.bank_cd} value={b.code_cd || b.bank_cd}>
                {codeNameParser(b.code_name)} ({b.code_name})
              </option>
            ))}
          </select>
        </label>

        <label className="hw-field">
          <span>Mã định danh ngân hàng</span>
          <input
            type="text"
            value={formData.bin_code ? `${formData.bin_code}` : 'Tự động theo ngân hàng'}
            readOnly
            disabled
            className="hw-input--readonly"
          />
        </label>

        <label className="hw-field">
          <span>Số tài khoản ngân hàng <b className="hw-required">*</b></span>
          <input
            type="text"
            name="account_number"
            value={formData.account_number}
            onChange={onFormChange}
            placeholder="Ví dụ: 0011001234567"
            maxLength={20}
            required
          />
          {formData.account_number.length > 0 && formData.account_number.length < 6 ? (
            <small style={{ color: '#dc2626' }}>Tối thiểu 6 chữ số (hiện có: {formData.account_number.length})</small>
          ) : formData.account_number.length > 0 && /^(\d)\1+$/.test(formData.account_number) ? (
            <small style={{ color: '#dc2626' }}>Số tài khoản không được trùng lặp toàn bộ 1 chữ số</small>
          ) : (
            <small>Chỉ gồm 6 đến 20 chữ số</small>
          )}
        </label>

        <label className="hw-field">
          <span>Tên chủ tài khoản<b className="hw-required">*</b></span>
          <input
            type="text"
            name="account_holder"
            value={formData.account_holder}
            onChange={onFormChange}
            placeholder="Ví dụ: NGUYEN VAN A"
            maxLength={100}
            required
          />
          {formData.account_holder.length > 0 && formData.account_holder.trim().split(/\s+/).filter(Boolean).length < 2 ? (
            <small style={{ color: '#dc2626' }}>Vui lòng nhập đầy đủ cả Họ và Tên</small>
          ) : (
            <small>In hoa không dấu, trùng khớp tên đăng ký tại ngân hàng</small>
          )}
        </label>

        <label className="hw-field hw-field--wide">
          <span>Chi nhánh mở tài khoản ngân hàng</span>
          <input
            type="text"
            name="bank_branch"
            value={formData.bank_branch}
            onChange={onFormChange}
            placeholder="Ví dụ: Chi nhánh Ba Đình, Hà Nội"
            maxLength={150}
          />
          <small>Phòng giao dịch / Chi nhánh ngân hàng phát hành số tài khoản</small>
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
