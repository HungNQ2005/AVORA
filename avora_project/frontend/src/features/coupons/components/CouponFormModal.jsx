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

const PromotionFormModal = ({ isOpen, onClose, onSubmit, initialData = null, loading = false }) => {
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
    <div className="pfm-overlay" onClick={onClose}>
      <div className="pfm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pfm-header">
          <h2 className="pfm-title">{isEdit ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi mới'}</h2>
          <button className="pfm-close-btn" onClick={onClose} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="pfm-form" onSubmit={handleSubmit}>
          <div className="pfm-grid">
            {/* Code */}
            <div className="pfm-field pfm-field--full">
              <label className="pfm-label">Mã Coupon <span className="pfm-required">*</span></label>
              <input
                className={`pfm-input ${errors.code ? 'pfm-input--error' : ''}`}
                type="text"
                placeholder="VD: SUMMER2024"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                disabled={loading}
              />
              {errors.code && <span className="pfm-error">{errors.code}</span>}
            </div>

            {/* Discount Type */}
            <div className="pfm-field">
              <label className="pfm-label">Loại giảm giá <span className="pfm-required">*</span></label>
              <select
                className="pfm-input"
                value={form.discount_type}
                onChange={(e) => handleChange('discount_type', e.target.value)}
                disabled={loading}
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VNĐ)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div className="pfm-field">
              <label className="pfm-label">
                Giá trị ưu đãi <span className="pfm-required">*</span>
                {form.discount_type === 'PERCENT' ? '(%)' : '(VNĐ)'}
              </label>
              <input
                className={`pfm-input ${errors.discount_value ? 'pfm-input--error' : ''}`}
                type="number"
                min="0"
                step={form.discount_type === 'PERCENT' ? '1' : '1000'}
                placeholder={form.discount_type === 'PERCENT' ? 'VD: 20' : 'VD: 100000'}
                value={form.discount_value}
                onChange={(e) => handleChange('discount_value', e.target.value)}
                disabled={loading}
              />
              {errors.discount_value && <span className="pfm-error">{errors.discount_value}</span>}
            </div>

            {/* Max Discount */}
            <div className="pfm-field">
              <label className="pfm-label">Giảm tối đa (VNĐ)</label>
              <input
                className={`pfm-input ${errors.max_discount_amount ? 'pfm-input--error' : ''}`}
                type="number"
                min="0"
                step="1000"
                placeholder="Bỏ trống = không giới hạn"
                value={form.max_discount_amount}
                onChange={(e) => handleChange('max_discount_amount', e.target.value)}
                disabled={loading}
              />
              {errors.max_discount_amount && <span className="pfm-error">{errors.max_discount_amount}</span>}
            </div>

            {/* Min Order */}
            <div className="pfm-field">
              <label className="pfm-label">Đơn hàng tối thiểu (VNĐ)</label>
              <input
                className={`pfm-input ${errors.min_order_amount ? 'pfm-input--error' : ''}`}
                type="number"
                min="0"
                step="1000"
                placeholder="Bỏ trống = không giới hạn"
                value={form.min_order_amount}
                onChange={(e) => handleChange('min_order_amount', e.target.value)}
                disabled={loading}
              />
              {errors.min_order_amount && <span className="pfm-error">{errors.min_order_amount}</span>}
            </div>

            {/* Usage Limit */}
            <div className="pfm-field">
              <label className="pfm-label">Giới hạn sử dụng (lượt)</label>
              <input
                className={`pfm-input ${errors.usage_limit ? 'pfm-input--error' : ''}`}
                type="number"
                min="1"
                step="1"
                placeholder="Bỏ trống = không giới hạn"
                value={form.usage_limit}
                onChange={(e) => handleChange('usage_limit', e.target.value)}
                disabled={loading}
              />
              {errors.usage_limit && <span className="pfm-error">{errors.usage_limit}</span>}
            </div>

            {/* Valid From */}
            <div className="pfm-field">
              <label className="pfm-label">Ngày bắt đầu <span className="pfm-required">*</span></label>
              <input
                className={`pfm-input ${errors.valid_from ? 'pfm-input--error' : ''}`}
                type="date"
                value={form.valid_from}
                onChange={(e) => handleChange('valid_from', e.target.value)}
                disabled={loading}
              />
              {errors.valid_from && <span className="pfm-error">{errors.valid_from}</span>}
            </div>

            {/* Valid To */}
            <div className="pfm-field">
              <label className="pfm-label">Ngày kết thúc <span className="pfm-required">*</span></label>
              <input
                className={`pfm-input ${errors.valid_to ? 'pfm-input--error' : ''}`}
                type="date"
                value={form.valid_to}
                min={form.valid_from || undefined}
                onChange={(e) => handleChange('valid_to', e.target.value)}
                disabled={loading}
              />
              {errors.valid_to && <span className="pfm-error">{errors.valid_to}</span>}
            </div>
          </div>

          <div className="pfm-actions">
            <button type="button" className="pfm-btn pfm-btn--cancel" onClick={onClose} disabled={loading}>
              Hủy bỏ
            </button>
            <button type="submit" className="pfm-btn pfm-btn--submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="pfm-spinner"></span>
                  Đang xử lý...
                </>
              ) : isEdit ? 'Lưu thay đổi' : 'Tạo mã khuyến mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromotionFormModal;
