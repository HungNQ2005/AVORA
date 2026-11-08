import React, { useState, useEffect } from 'react';
import './FlashSaleModal.css';

/**
 * Helper to extract deterministic hotel prefix: hotel_id first 8 uppercase hex characters.
 */
export const getHotelPrefix = (hotelId) => {
  if (!hotelId || typeof hotelId !== 'string') return '';
  return hotelId.trim().split('-')[0].toUpperCase();
};

/**
 * Convert ISO string to YYYY-MM-DDTHH:mm format for HTML5 datetime-local input.
 */
export const toDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = String(date.getDate()).padStart(2, '0');
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

/**
 * Convert datetime-local value to ISO 8601 string.
 */
export const toIsoString = (localValue) => {
  if (!localValue) return '';
  const date = new Date(localValue);
  if (isNaN(date.getTime())) return '';
  return date.toISOString();
};

const EMPTY_FORM = {
  hotel_id: '',
  code_name: '',
  discount_type: 'PERCENT',
  discount_value: '',
  max_discount_amount: '',
  min_order_amount: '',
  usage_limit: '',
  valid_from: '',
  valid_to: '',
};

const FlashSaleModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  hotels = [],
  loading = false,
  submitError = '',
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [validationError, setValidationError] = useState('');

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setForm({
        hotel_id: initialData.hotel_id || (hotels[0]?.hotel_id ?? ''),
        code_name: initialData.code_name || (initialData.code ? initialData.code.split('_').slice(2).join('_') : ''),
        discount_type: initialData.discount_type || 'PERCENT',
        discount_value: initialData.discount_value ?? '',
        max_discount_amount: initialData.max_discount_amount ?? '',
        min_order_amount: initialData.min_order_amount ?? '',
        usage_limit: initialData.usage_limit ?? '',
        valid_from: toDateTimeLocal(initialData.valid_from),
        valid_to: toDateTimeLocal(initialData.valid_to),
      });
    } else {
      // Default to first hotel if available
      const defaultHotelId = hotels.length > 0 ? hotels[0].hotel_id : '';
      // Default start time: top of the next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const later = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4 hours golden window

      setForm({
        ...EMPTY_FORM,
        hotel_id: defaultHotelId,
        valid_from: toDateTimeLocal(now.toISOString()),
        valid_to: toDateTimeLocal(later.toISOString()),
      });
    }
    setErrors({});
    setValidationError('');
  }, [isOpen, initialData, hotels]);

  if (!isOpen) return null;

  const currentPrefix = getHotelPrefix(form.hotel_id);
  const cleanCodeName = form.code_name.trim().toUpperCase().replace(/^FS_[A-F0-9]{8}_/, '');
  const fullPreviewCode = currentPrefix ? `FS_${currentPrefix}_${cleanCodeName || 'MÃ_ƯU_ĐÃI'}` : '';

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setValidationError('');
  };

  const handleCodeNameChange = (val) => {
    // Sanitize: allow only A-Z, 0-9, hyphen, underscore, up to 38 chars
    const sanitized = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 38);
    handleChange('code_name', sanitized);
  };

  const validate = () => {
    const errs = {};

    if (!form.hotel_id) {
      errs.hotel_id = 'Vui lòng chọn khách sạn áp dụng.';
    }

    if (!cleanCodeName) {
      errs.code_name = 'Vui lòng nhập tên mã Flash Sale.';
    } else if (!/^[A-Z0-9_-]{1,38}$/.test(cleanCodeName)) {
      errs.code_name = 'Tên mã chỉ chứa chữ cái, số, gạch nối hoặc gạch dưới (1-38 ký tự).';
    } else if (`FS_${currentPrefix}_${cleanCodeName}`.length > 50) {
      errs.code_name = 'Tổng độ dài mã Flash Sale không được vượt quá 50 ký tự.';
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      errs.discount_value = 'Vui lòng nhập mức giảm ưu đãi hợp lệ (từ 1% đến 100%).';
    } else if (Number(form.discount_value) > 100) {
      errs.discount_value = 'Tỷ lệ giảm theo phần trăm không được vượt quá 100%.';
    }

    if (form.max_discount_amount && Number(form.max_discount_amount) < 0) {
      errs.max_discount_amount = 'Mức giảm tối đa (VNĐ trần) phải là số không âm.';
    }

    if (form.min_order_amount && Number(form.min_order_amount) < 0) {
      errs.min_order_amount = 'Đơn tối thiểu phải là số không âm.';
    }

    if (form.usage_limit && (!Number.isInteger(Number(form.usage_limit)) || Number(form.usage_limit) <= 0)) {
      errs.usage_limit = 'Số lượt áp dụng phải là số nguyên dương lớn hơn 0.';
    }

    if (!form.valid_from) {
      errs.valid_from = 'Vui lòng chọn thời gian bắt đầu khung giờ vàng.';
    }

    if (!form.valid_to) {
      errs.valid_to = 'Vui lòng chọn thời gian kết thúc khung giờ vàng.';
    }

    if (form.valid_from && form.valid_to) {
      const fromTime = new Date(form.valid_from).getTime();
      const toTime = new Date(form.valid_to).getTime();

      if (toTime <= fromTime) {
        errs.valid_to = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
      } else if (!isEdit && toTime <= Date.now()) {
        errs.valid_to = 'Thời gian kết thúc khung giờ vàng không thể ở trong quá khứ.';
      }
    }

    setErrors(errs);
    const hasErrors = Object.keys(errs).length > 0;
    if (hasErrors) {
      setValidationError('Vui lòng kiểm tra lại các thông tin chưa hợp lệ bên dưới.');
    } else {
      setValidationError('');
    }
    return !hasErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code_name: cleanCodeName,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      valid_from: toIsoString(form.valid_from),
      valid_to: toIsoString(form.valid_to),
    };

    if (!isEdit) {
      payload.hotel_id = form.hotel_id;
    }

    onSubmit(payload);
  };

  return (
    <div className="rt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form
        className="rt-modal-content fs-modal-content"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        {/* Modal Header */}
        <div className="rt-modal-header fs-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon fs-modal-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">
                {isEdit ? 'Chỉnh sửa Flash Sale khách sạn' : 'Tạo chương trình Flash Sale mới ⚡'}
              </h2>
              <p className="rt-modal-subtitle">
                Khuyến mãi khung giờ vàng tự động áp dụng khi khách đặt phòng tại khách sạn của bạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rt-modal-close"
            onClick={onClose}
            aria-label="Đóng"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="rt-modal-body fs-modal-body">
          <div className="rt-modal-grid">
            {/* Cột 1: KHÁCH SẠN & MÃ KHUYẾN MÃI */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                </svg>
                Khách sạn &amp; Mã ưu đãi
              </h3>

              {/* Hotel Select */}
              <div className="rt-form-group">
                <label htmlFor="fs-hotel">
                  Khách sạn áp dụng <span className="req">*</span>
                </label>
                <select
                  id="fs-hotel"
                  className={`rt-select ${errors.hotel_id ? 'rt-input--error' : ''}`}
                  value={form.hotel_id}
                  onChange={(e) => handleChange('hotel_id', e.target.value)}
                  disabled={isEdit || loading || hotels.length <= 1}
                >
                  {hotels.length === 0 && <option value="">Đang tải khách sạn...</option>}
                  {hotels.map((h) => (
                    <option key={h.hotel_id} value={h.hotel_id}>
                      {h.name} ({getHotelPrefix(h.hotel_id)})
                    </option>
                  ))}
                </select>
                {errors.hotel_id && <span className="rt-field-error">{errors.hotel_id}</span>}
              </div>

              {/* Code Input with Attached Deterministic Prefix */}
              <div className="rt-form-group">
                <label htmlFor="fs-code-name">
                  Tên mã Flash Sale <span className="req">*</span>
                  <span className="rt-label-right">Tối đa 38 ký tự</span>
                </label>
                <div className="fs-code-input-wrapper">
                  <span className="fs-code-prefix-badge" title="Tiền tố khách sạn được sinh tự động theo quy định">
                    FS_{currentPrefix || 'HOTEL'}_
                  </span>
                  <input
                    id="fs-code-name"
                    className={`rt-input fs-code-input ${errors.code_name ? 'rt-input--error' : ''}`}
                    type="text"
                    placeholder="Ví dụ: FLASH30, HE2026, GOLDEN"
                    value={form.code_name}
                    onChange={(e) => handleCodeNameChange(e.target.value)}
                    disabled={loading}
                    autoFocus={!isEdit}
                  />
                </div>
                {errors.code_name && <span className="rt-field-error">{errors.code_name}</span>}

                {/* Live Preview Card */}
                <div className="fs-code-preview-card">
                  <span className="fs-code-preview-label">Mã hoàn chỉnh trên hệ thống:</span>
                  <div className="fs-code-preview-val">
                    <code>{fullPreviewCode}</code>
                    <span className="fs-code-length-tag">
                      {fullPreviewCode.length}/50 ký tự
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount Type: Cố định là % cho Flash Sale */}
              <div className="rt-form-group">
                <label>
                  Hình thức ưu đãi <span className="req">*</span>
                </label>
                <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontWeight: 700, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Giảm theo phần trăm (%) — Khung giờ vàng Flash Sale</span>
                </div>
              </div>

              {/* Discount Value */}
              <div className="rt-form-group">
                <label htmlFor="fs-discount-value">
                  Mức giảm ưu đãi (%) <span className="req">*</span>
                  <span className="rt-label-right">Tỷ lệ % (1-100)</span>
                </label>
                <input
                  id="fs-discount-value"
                  className={`rt-input ${errors.discount_value ? 'rt-input--error' : ''}`}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ví dụ: 15, 20, 30, 50..."
                  value={form.discount_value}
                  onChange={(e) => handleChange('discount_value', e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  disabled={loading}
                />
                {errors.discount_value && <span className="rt-field-error">{errors.discount_value}</span>}
              </div>

              {/* Max Discount Cap (for Percent) */}
              {['FLASH_PERCENT', 'PERCENT'].includes(form.discount_type) && (
                <div className="rt-form-group">
                  <label htmlFor="fs-max-discount">
                    Mức giảm tối đa (VNĐ trần)
                    <span className="rt-label-right">Khuyên dùng</span>
                  </label>
                  <input
                    id="fs-max-discount"
                    className={`rt-input ${errors.max_discount_amount ? 'rt-input--error' : ''}`}
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Ví dụ: 300000 (Bỏ trống = không giới hạn trần)"
                    value={form.max_discount_amount}
                    onChange={(e) => handleChange('max_discount_amount', e.target.value)}
                    onInvalid={(e) => e.preventDefault()}
                    disabled={loading}
                  />
                  {errors.max_discount_amount && (
                    <span className="rt-field-error">{errors.max_discount_amount}</span>
                  )}
                </div>
              )}
            </div>

            {/* Cột 2: KHUNG GIỜ VÀNG & ĐIỀU KIỆN */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Khung giờ vàng &amp; Điều kiện
              </h3>

              {/* Golden Hours Notice */}
              <div className="fs-golden-notice">
                <span className="fs-golden-notice__icon">⚡</span>
                <span className="fs-golden-notice__text">
                  Khung giờ vàng quyết định thời điểm hệ thống tự động gắn huy hiệu Flash Sale và giảm giá trực tiếp khi khách thanh toán.
                </span>
              </div>

              {/* Valid From (datetime-local) */}
              <div className="rt-form-group">
                <label htmlFor="fs-valid-from">
                  Thời gian bắt đầu giờ vàng <span className="req">*</span>
                </label>
                <input
                  id="fs-valid-from"
                  className={`rt-input ${errors.valid_from ? 'rt-input--error' : ''}`}
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => handleChange('valid_from', e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  disabled={loading}
                />
                {errors.valid_from && <span className="rt-field-error">{errors.valid_from}</span>}
              </div>

              {/* Valid To (datetime-local) */}
              <div className="rt-form-group">
                <label htmlFor="fs-valid-to">
                  Thời gian kết thúc giờ vàng <span className="req">*</span>
                </label>
                <input
                  id="fs-valid-to"
                  className={`rt-input ${errors.valid_to ? 'rt-input--error' : ''}`}
                  type="datetime-local"
                  min={form.valid_from || undefined}
                  value={form.valid_to}
                  onChange={(e) => handleChange('valid_to', e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  disabled={loading}
                />
                {errors.valid_to && <span className="rt-field-error">{errors.valid_to}</span>}
              </div>

              {/* Min Order Amount */}
              <div className="rt-form-group">
                <label htmlFor="fs-min-order">
                  Giá trị đơn phòng tối thiểu (VNĐ)
                  <span className="rt-label-right">Tùy chọn</span>
                </label>
                <input
                  id="fs-min-order"
                  className={`rt-input ${errors.min_order_amount ? 'rt-input--error' : ''}`}
                  type="number"
                  min="0"
                  step="50000"
                  placeholder="Bỏ trống = Áp dụng mọi đơn"
                  value={form.min_order_amount}
                  onChange={(e) => handleChange('min_order_amount', e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  disabled={loading}
                />
                {errors.min_order_amount && (
                  <span className="rt-field-error">{errors.min_order_amount}</span>
                )}
              </div>

              {/* Usage Limit (Quota) */}
              <div className="rt-form-group">
                <label htmlFor="fs-usage-limit">
                  Giới hạn số lượt đặt (Quota)
                  <span className="rt-label-right">Tùy chọn</span>
                </label>
                <input
                  id="fs-usage-limit"
                  className={`rt-input ${errors.usage_limit ? 'rt-input--error' : ''}`}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Bỏ trống = Không giới hạn số lượt"
                  value={form.usage_limit}
                  onChange={(e) => handleChange('usage_limit', e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  disabled={loading}
                />
                {errors.usage_limit && (
                  <span className="rt-field-error">{errors.usage_limit}</span>
                )}
              </div>
            </div>
          </div>

          {/* Validation & Submit Errors matching RoomTypeFormModal */}
          {validationError && (
            <p className="rt-form-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{validationError}</span>
            </p>
          )}
          {submitError && (
            <p className="rt-form-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{submitError}</span>
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="rt-modal-footer fs-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="rt-btn rt-btn-primary fs-btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="rt-spinner-sm"></span>
                Đang lưu Flash Sale...
              </>
            ) : isEdit ? (
              'Lưu thay đổi ⚡'
            ) : (
              'Kích hoạt Flash Sale ⚡'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashSaleModal;
