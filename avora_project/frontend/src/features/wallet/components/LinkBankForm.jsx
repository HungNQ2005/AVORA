import React from 'react';
import { codeNameParser } from '../../../utils/codeNameParser';

const LinkBankForm = ({
  formData,
  banks,
  onBankChange,
  onFormChange,
  onSubmit,
  isSubmitting,
}) => {
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
          <span>Mã định danh ngân hàng (BIN Napas)</span>
          <input
            type="text"
            value={formData.bin_code ? `${formData.bin_code} (Chuẩn Napas)` : 'Tự động theo ngân hàng'}
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
            maxLength={25}
            required
          />
          <small>Chỉ gồm 6 đến 20 chữ số</small>
        </label>

        <label className="hw-field">
          <span>Tên chủ tài khoản (In hoa không dấu) <b className="hw-required">*</b></span>
          <input
            type="text"
            name="account_holder"
            value={formData.account_holder}
            onChange={onFormChange}
            placeholder="Ví dụ: NGUYEN VAN A"
            maxLength={100}
            required
          />
          <small>Trùng khớp với tên đăng ký tài khoản tại ngân hàng</small>
        </label>

        <label className="hw-field hw-field--wide">
          <span>Chi nhánh mở tài khoản ngân hàng (Tùy chọn)</span>
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
          Kiểm tra kỹ thông tin trước khi xác nhận liên kết
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
