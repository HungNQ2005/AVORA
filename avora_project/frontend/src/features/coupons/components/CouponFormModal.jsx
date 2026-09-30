import React, { useState, useEffect } from 'react';
import './CouponFormModal.css';

const EMPTY_FORM = {
  code: '',
  discount_type: 'PERCENT',
  discount_value: '',
  max_discount_amount: '',
  min_order_amount: '',
  usage_limit: '',
  valid_from: '',
  valid_to: '',
};

const CouponFormModal = ({ isOpen, onClose, onSubmit, initialData = null, loading = false }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEdit = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          code: initialData.code || '',
          discount_type: initialData.discount_type || 'PERCENT',
          discount_value: initialData.discount_value ?? '',
          max_discount_amount: initialData.max_discount_amount ?? '',
          min_order_amount: initialData.min_order_amount ?? '',
          usage_limit: initialData.usage_limit ?? '',
          valid_from: initialData.valid_from ? initialData.valid_from.substring(0, 10) : '',
          valid_to: initialData.valid_to ? initialData.valid_to.substring(0, 10) : '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'Vui lòng nhập mã coupon';
    else if (!/^[A-Z0-9_-]+$/i.test(form.code.trim())) errs.code = 'Mã chỉ gồm chữ, số, gạch ngang, gạch dưới';
    if (!form.discount_value || Number(form.discount_value) <= 0) errs.discount_value = 'Giá trị phải lớn hơn 0';
    if (form.discount_type === 'PERCENT' && Number(form.discount_value) > 100) errs.discount_value = 'Phần trăm tối đa 100%';
    if (form.max_discount_amount && Number(form.max_discount_amount) < 0) errs.max_discount_amount = 'Không hợp lệ';
    if (form.min_order_amount && Number(form.min_order_amount) < 0) errs.min_order_amount = 'Không hợp lệ';
    if (form.usage_limit && (!Number.isInteger(Number(form.usage_limit)) || Number(form.usage_limit) <= 0)) errs.usage_limit = 'Phải là số nguyên dương';
    if (!form.valid_from) errs.valid_from = 'Vui lòng chọn ngày bắt đầu';
    if (!form.valid_to) errs.valid_to = 'Vui lòng chọn ngày kết thúc';
    if (form.valid_from && form.valid_to && new Date(form.valid_to) <= new Date(form.valid_from)) errs.valid_to = 'Ngày kết thúc phải sau ngày bắt đầu';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      code: form.code.trim().toUpperCase(),
      discount_value: Number(form.discount_value),
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="rt-modal-overlay" onClick={onClose}>
      <form
        className="rt-modal-content coupon-modal-content"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Dark Blue #1e3a8a) */}
        <div className="rt-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">
                {isEdit ? 'Chỉnh sửa coupon' : 'Thêm coupon'}
              </h2>
              <p className="rt-modal-subtitle">
                Thông tin được lưu trực tiếp vào danh sách coupons.
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
        <div className="rt-modal-body">
          <div className="rt-modal-grid">
            {/* Cột 1: THÔNG TIN MÃ & ƯU ĐÃI */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="6" y1="8" x2="10" y2="8" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                  <line x1="6" y1="16" x2="14" y2="16" />
                </svg>
                Thông tin mã &amp; Ưu đãi
              </h3>

              {/* Code */}
              <div className="rt-form-group">
                <label htmlFor="coupon-code">
                  Mã Coupon <span className="req">*</span>
                </label>
                <input
                  id="coupon-code"
                  className={`rt-input ${errors.code ? 'rt-input--error' : ''}`}
                  type="text"
                  placeholder="Ví dụ: SUMMER2024, AVORA50"
                  value={form.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                {errors.code && <span className="rt-field-error">{errors.code}</span>}
              </div>

              {/* Discount Type */}
              <div className="rt-form-group">
                <label htmlFor="coupon-discount-type">
                  Loại giảm giá <span className="req">*</span>
                </label>
                <select
                  id="coupon-discount-type"
                  className="rt-select"
                  value={form.discount_type}
                  onChange={(e) => handleChange('discount_type', e.target.value)}
                  disabled={loading}
                >
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="FIXED">Số tiền cố định (VNĐ)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div className="rt-form-group">
                <label htmlFor="coupon-discount-val">
                  Giá trị ưu đãi <span className="req">*</span>
                  <span className="rt-label-right">
                    {form.discount_type === 'PERCENT' ? 'Đơn vị: %' : 'Đơn vị: VNĐ'}
                  </span>
                </label>
                <input
                  id="coupon-discount-val"
                  className={`rt-input ${errors.discount_value ? 'rt-input--error' : ''}`}
                  type="number"
                  min="0"
                  step={form.discount_type === 'PERCENT' ? '1' : '1000'}
                  placeholder={form.discount_type === 'PERCENT' ? 'Ví dụ: 15, 20...' : 'Ví dụ: 100000, 200000...'}
                  value={form.discount_value}
                  onChange={(e) => handleChange('discount_value', e.target.value)}
                  disabled={loading}
                />
                {errors.discount_value && <span className="rt-field-error">{errors.discount_value}</span>}
              </div>

              {/* Max Discount */}
              <div className="rt-form-group">
                <label htmlFor="coupon-max-discount">
                  Giảm tối đa (VNĐ)
                  <span className="rt-label-right">Tùy chọn</span>
                </label>
                <input
                  id="coupon-max-discount"
                  className={`rt-input ${errors.max_discount_amount ? 'rt-input--error' : ''}`}
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Bỏ trống = Không giới hạn trần"
                  value={form.max_discount_amount}
                  onChange={(e) => handleChange('max_discount_amount', e.target.value)}
                  disabled={loading}
                />
                {errors.max_discount_amount && <span className="rt-field-error">{errors.max_discount_amount}</span>}
              </div>
            </div>

            {/* Cột 2: ĐIỀU KIỆN & THỜI HẠN */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Điều kiện &amp; Thời hạn
              </h3>

              {/* Min Order */}
              <div className="rt-form-group">
                <label htmlFor="coupon-min-order">
                  Đơn hàng tối thiểu (VNĐ)
                  <span className="rt-label-right">Tùy chọn</span>
                </label>
                <input
                  id="coupon-min-order"
                  className={`rt-input ${errors.min_order_amount ? 'rt-input--error' : ''}`}
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Bỏ trống = Không áp dụng"
                  value={form.min_order_amount}
                  onChange={(e) => handleChange('min_order_amount', e.target.value)}
                  disabled={loading}
                />
                {errors.min_order_amount && <span className="rt-field-error">{errors.min_order_amount}</span>}
              </div>

              {/* Usage Limit */}
              <div className="rt-form-group">
                <label htmlFor="coupon-usage-limit">
                  Giới hạn lượt dùng
                  <span className="rt-label-right">Tùy chọn</span>
                </label>
                <input
                  id="coupon-usage-limit"
                  className={`rt-input ${errors.usage_limit ? 'rt-input--error' : ''}`}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Bỏ trống = Không giới hạn"
                  value={form.usage_limit}
                  onChange={(e) => handleChange('usage_limit', e.target.value)}
                  disabled={loading}
                />
                {errors.usage_limit && <span className="rt-field-error">{errors.usage_limit}</span>}
              </div>

              {/* Valid From */}
              <div className="rt-form-group">
                <label htmlFor="coupon-valid-from">
                  Ngày bắt đầu hiệu lực <span className="req">*</span>
                </label>
                <input
                  id="coupon-valid-from"
                  className={`rt-input ${errors.valid_from ? 'rt-input--error' : ''}`}
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => handleChange('valid_from', e.target.value)}
                  disabled={loading}
                />
                {errors.valid_from && <span className="rt-field-error">{errors.valid_from}</span>}
              </div>

              {/* Valid To */}
              <div className="rt-form-group">
                <label htmlFor="coupon-valid-to">
                  Ngày kết thúc hiệu lực <span className="req">*</span>
                </label>
                <input
                  id="coupon-valid-to"
                  className={`rt-input ${errors.valid_to ? 'rt-input--error' : ''}`}
                  type="date"
                  value={form.valid_to}
                  min={form.valid_from || undefined}
                  onChange={(e) => handleChange('valid_to', e.target.value)}
                  disabled={loading}
                />
                {errors.valid_to && <span className="rt-field-error">{errors.valid_to}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="rt-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <div className="rt-modal-footer-right">
            <button
              type="submit"
              className="rt-btn rt-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="rt-spinner-sm"></span>
                  Đang xử lý...
                </>
              ) : isEdit ? (
                'Lưu thay đổi'
              ) : (
                'Thêm coupon'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CouponFormModal;
