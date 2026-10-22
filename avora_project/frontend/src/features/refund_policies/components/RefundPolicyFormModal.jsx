import React, { useState, useEffect } from 'react';
import './RefundPolicyFormModal.css';

const EMPTY_FORM = {
  policy_name: '',
  hotel_id: '',
  refund_percentage: 100,
  minimum_cancellation_hours: 24,
  description: '',
};

const stripMeta = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/(?:\r?\n)?Điều kiện:\s*[\s\S]*$/i, '')
    .trim();
};

const RefundPolicyFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  hotels = [],
  loading = false,
  serverError = null,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          policy_name: stripMeta(initialData.policy_name) || '',
          hotel_id: initialData.hotel_id || '',
          refund_percentage: initialData.refund_percentage !== undefined ? initialData.refund_percentage : 100,
          minimum_cancellation_hours:
            initialData.minimum_cancellation_hours !== undefined
              ? initialData.minimum_cancellation_hours
              : initialData.free_cancel_before_hours !== undefined
              ? initialData.free_cancel_before_hours
              : 24,
          description: stripMeta(initialData.description),
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
    const cleanName = form.policy_name.trim();

    // 1. Tên chính sách (nếu có nhập)
    if (cleanName && cleanName.length > 200) {
      errs.policy_name = 'Tên chính sách không được vượt quá 200 ký tự.';
    }

    // 2. Tỷ lệ hoàn tiền
    if (form.refund_percentage === '' || form.refund_percentage === null || form.refund_percentage === undefined) {
      errs.refund_percentage = 'Vui lòng nhập tỷ lệ hoàn tiền.';
    } else {
      const rate = Number(form.refund_percentage);
      if (isNaN(rate) || !Number.isFinite(rate)) {
        errs.refund_percentage = 'Tỷ lệ hoàn tiền phải là số hợp lệ.';
      } else if (rate < 0 || rate > 100) {
        errs.refund_percentage = 'Tỷ lệ hoàn tiền phải nằm trong khoảng từ 0% đến 100%.';
      }
    }

    // 3. Số giờ hủy tối thiểu
    if (form.minimum_cancellation_hours === '' || form.minimum_cancellation_hours === null || form.minimum_cancellation_hours === undefined) {
      errs.minimum_cancellation_hours = 'Vui lòng nhập số giờ hủy tối thiểu.';
    } else {
      const hours = Number(form.minimum_cancellation_hours);
      if (isNaN(hours) || !Number.isFinite(hours) || !Number.isInteger(hours) || hours < 0) {
        errs.minimum_cancellation_hours = 'Số giờ tối thiểu phải là số nguyên không âm (>= 0).';
      } else if (hours > 8760) {
        errs.minimum_cancellation_hours = 'Số giờ hủy tối đa không vượt quá 8.760 giờ (1 năm).';
      }
    }

    // 4. Mô tả chính sách
    if (form.description) {
      const cleanDesc = form.description.trim();
      if (cleanDesc.length > 1000) {
        errs.description = `Mô tả chính sách không vượt quá 1.000 ký tự (hiện có: ${cleanDesc.length}).`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate() || loading) return;

    onSubmit({
      policy_name: form.policy_name.trim() || undefined,
      hotel_id: form.hotel_id ? form.hotel_id : null,
      refund_percentage: Number(form.refund_percentage),
      minimum_cancellation_hours: Number(form.minimum_cancellation_hours),
      free_cancel_before_hours: Number(form.minimum_cancellation_hours),
      description: form.description.trim() || '',
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="rp-modal-overlay" onClick={onClose}>
      <form
        className="rp-modal-content"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div className="rp-modal-header">
          <div className="rp-modal-header-info">
            <div className="rp-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <div>
              <h3 className="rp-modal-title">
                {isEdit ? 'Chỉnh sửa chính sách hoàn tiền' : 'Tạo mới chính sách hoàn tiền'}
              </h3>
              <p className="rp-modal-subtitle">
                {isEdit
                  ? `Mã chính sách: ${initialData.policy_code || initialData.policy_id?.substring(0, 8)}`
                  : 'Thiết lập quy định tỷ lệ hoàn và thời hạn hủy phòng cho khách hàng'}
              </p>
            </div>
          </div>
          <button type="button" className="rp-modal-close" onClick={onClose} title="Đóng" disabled={loading}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="rp-modal-body">
          {/* Server Error Alert Banner */}
          {serverError && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.86rem',
              lineHeight: 1.45,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
              <div>
                <strong>Lỗi từ hệ thống: </strong>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* Phạm vi áp dụng (Khách sạn) */}
          <div className="rp-form-group">
            <label className="rp-form-label">Phạm vi áp dụng (Khách sạn)</label>
            <select
              className="rp-form-select"
              value={form.hotel_id}
              onChange={(e) => handleChange('hotel_id', e.target.value)}
              disabled={loading}
            >
              <option value="">Toàn hệ thống AVORA (Mặc định)</option>
              {hotels.map((h) => (
                <option key={h.hotel_id} value={h.hotel_id}>
                  {h.name} {h.address ? `(${h.address})` : ''}
                </option>
              ))}
            </select>
            <span className="rp-form-hint">
              Chọn cơ sở khách sạn cụ thể hoặc áp dụng chung toàn bộ hệ thống AVORA
            </span>
          </div>

          {/* Grid: Tỷ lệ hoàn tiền & Giờ hủy tối thiểu */}
          <div className="rp-modal-grid-2">
            <div className="rp-form-group">
              <label className="rp-form-label">
                Tỷ lệ hoàn tiền (%) <span className="rp-required">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={`rp-form-input ${errors.refund_percentage ? 'rp-form-input--error' : ''}`}
                value={form.refund_percentage}
                onChange={(e) => handleChange('refund_percentage', e.target.value)}
                disabled={loading}
              />
              <div className="rp-quick-tags">
                {[100, 80, 70, 50, 0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`rp-quick-tag ${Number(form.refund_percentage) === rate ? 'rp-quick-tag--active' : ''}`}
                    onClick={() => handleChange('refund_percentage', rate)}
                    disabled={loading}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              {errors.refund_percentage && (
                <span className="rp-form-error-msg">{errors.refund_percentage}</span>
              )}
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">
                Số giờ hủy tối thiểu trước check-in <span className="rp-required">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="8760"
                step="1"
                className={`rp-form-input ${errors.minimum_cancellation_hours ? 'rp-form-input--error' : ''}`}
                value={form.minimum_cancellation_hours}
                onChange={(e) => handleChange('minimum_cancellation_hours', e.target.value)}
                disabled={loading}
              />
              <div className="rp-quick-tags">
                {[
                  { h: 0, label: '0h (Trước check-in)' },
                  { h: 24, label: '24h (1 ngày)' },
                  { h: 48, label: '48h (2 ngày)' },
                  { h: 72, label: '72h (3 ngày)' },
                ].map(({ h, label }) => (
                  <button
                    key={h}
                    type="button"
                    className={`rp-quick-tag ${Number(form.minimum_cancellation_hours) === h ? 'rp-quick-tag--active' : ''}`}
                    onClick={() => handleChange('minimum_cancellation_hours', h)}
                    disabled={loading}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {errors.minimum_cancellation_hours && (
                <span className="rp-form-error-msg">{errors.minimum_cancellation_hours}</span>
              )}
            </div>
          </div>

          {/* Quick Summary Callout */}
          <div className="rp-policy-preview-box">
            <span className="rp-preview-badge">Hoàn {form.refund_percentage || 0}%</span>
            <div className="rp-preview-text">
              <strong>Tóm tắt quy tắc:</strong> Hủy trước{' '}
              <strong>
                {form.minimum_cancellation_hours > 0
                  ? `${form.minimum_cancellation_hours} giờ`
                  : 'thời điểm nhận phòng'}
              </strong>{' '}
              sẽ được hoàn tiền mức <strong>{form.refund_percentage || 0}%</strong> tổng giá trị đơn đặt
              phòng (phí phạt:{' '}
              <strong>{Math.max(0, 100 - Number(form.refund_percentage || 0))}%</strong>).
            </div>
          </div>

          {/* Mô tả chính sách */}
          <div className="rp-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="rp-form-label">Mô tả quy định hủy &amp; hoàn tiền (description)</label>
              <span style={{ fontSize: '0.75rem', color: (form.description?.length || 0) > 950 ? '#dc2626' : '#94a3b8' }}>
                {form.description?.length || 0} / 1000
              </span>
            </div>
            <textarea
              className={`rp-form-textarea ${errors.description ? 'rp-form-textarea--error' : ''}`}
              rows="3"
              maxLength={1000}
              placeholder="Nhập nội dung mô tả chi tiết chính sách hoàn tiền..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={loading}
            ></textarea>
            <span className="rp-form-hint">
              Nội dung mô tả quy định được lưu trực tiếp vào cơ sở dữ liệu, không chèn metadata hay ghép cột khác.
            </span>
            {errors.description && (
              <span className="rp-form-error-msg">{errors.description}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="rp-modal-footer">
          <button
            type="button"
            className="rp-btn rp-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button type="submit" className="rp-btn rp-btn--primary" disabled={loading}>
            {loading && <span className="rp-btn-spinner"></span>}
            {isEdit ? 'Lưu thay đổi' : 'Tạo chính sách'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RefundPolicyFormModal;

