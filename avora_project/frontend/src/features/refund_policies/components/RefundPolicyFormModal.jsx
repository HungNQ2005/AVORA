import React, { useState, useEffect } from 'react';
import './RefundPolicyFormModal.css';

const EMPTY_FORM = {
  policy_name: '',
  hotel_id: '',
  refund_percentage: 100,
  minimum_cancellation_hours: 24,
  refund_conditions: '',
  description: '',
  effective_from: '',
  effective_to: '',
  status: 'ACTIVE',
};

const stripMeta = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\[.*?\]\s*/g, '')
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
          policy_name: stripMeta(initialData.policy_name) || initialData.policy_name || '',
          hotel_id: initialData.hotel_id || '',
          refund_percentage: initialData.refund_percentage !== undefined ? initialData.refund_percentage : 100,
          minimum_cancellation_hours:
            initialData.minimum_cancellation_hours !== undefined
              ? initialData.minimum_cancellation_hours
              : initialData.free_cancel_before_hours !== undefined
              ? initialData.free_cancel_before_hours
              : 24,
          refund_conditions: stripMeta(initialData.refund_conditions),
          description: stripMeta(initialData.description),
          effective_from: initialData.effective_from ? initialData.effective_from.substring(0, 10) : '',
          effective_to: initialData.effective_to ? initialData.effective_to.substring(0, 10) : '',
          status: initialData.status || 'ACTIVE',
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

    // 1. Tên chính sách
    if (!cleanName) {
      errs.policy_name = 'Vui lòng nhập tên chính sách hoàn tiền.';
    } else if (cleanName.length < 3) {
      errs.policy_name = 'Tên chính sách phải có ít nhất 3 ký tự.';
    } else if (cleanName.length > 200) {
      errs.policy_name = 'Tên chính sách không được vượt quá 200 ký tự.';
    } else if (!/^[\p{L}0-9]/u.test(cleanName)) {
      errs.policy_name = 'Tên chính sách phải bắt đầu bằng chữ cái hoặc chữ số, không được bắt đầu bằng ký tự đặc biệt.';
    } else if (!/[\p{L}]/u.test(cleanName)) {
      errs.policy_name = 'Tên chính sách phải chứa chữ cái, không được chỉ chứa toàn bộ ký tự đặc biệt hoặc chữ số.';
    } else if (/[@#$^&*~`<>\[\]{}|\\_;=!]/.test(cleanName)) {
      errs.policy_name = 'Tên chính sách chứa ký tự đặc biệt không hợp lệ (@, #, $, ^, &, *, ~, <, >, [, ], {, }, |, \\, _, ;, =). Chỉ cho phép chữ cái, chữ số, dấu cách và (- , ( ) % / . ,).';
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

    // 4. Điều kiện & Mô tả
    if (form.refund_conditions) {
      const cleanCond = form.refund_conditions.trim();
      if (cleanCond.length > 1000) {
        errs.refund_conditions = `Điều kiện hoàn tiền không vượt quá 1.000 ký tự (hiện có: ${cleanCond.length}).`;
      } else if (cleanCond && !/[\p{L}0-9]/u.test(cleanCond)) {
        errs.refund_conditions = 'Điều kiện hoàn tiền phải chứa chữ cái hoặc chữ số, không được chỉ chứa ký tự đặc biệt.';
      }
    }
    if (form.description) {
      const cleanDesc = form.description.trim();
      if (cleanDesc.length > 1000) {
        errs.description = `Mô tả chính sách không vượt quá 1.000 ký tự (hiện có: ${cleanDesc.length}).`;
      } else if (cleanDesc && !/[\p{L}0-9]/u.test(cleanDesc)) {
        errs.description = 'Mô tả chính sách phải chứa chữ cái hoặc chữ số, không được chỉ chứa ký tự đặc biệt.';
      }
    }

    // 5. Ngày hiệu lực
    if (form.effective_from && form.effective_to) {
      if (new Date(form.effective_to) < new Date(form.effective_from)) {
        errs.effective_to = 'Ngày kết thúc hiệu lực không được sớm hơn ngày bắt đầu hiệu lực.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate() || loading) return;

    onSubmit({
      policy_name: form.policy_name.trim(),
      hotel_id: form.hotel_id ? form.hotel_id : null,
      refund_percentage: Number(form.refund_percentage),
      minimum_cancellation_hours: Number(form.minimum_cancellation_hours),
      refund_conditions: form.refund_conditions.trim() || undefined,
      description: form.description.trim() || undefined,
      effective_from: form.effective_from ? new Date(form.effective_from).toISOString() : null,
      effective_to: form.effective_to ? new Date(form.effective_to).toISOString() : null,
      status: form.status,
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

          {/* Tên chính sách */}
          <div className="rp-form-group">
            <label className="rp-form-label">
              Tên chính sách hoàn tiền <span className="rp-required">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              className={`rp-form-input ${errors.policy_name ? 'rp-form-input--error' : ''}`}
              placeholder="Ví dụ: Chính sách hoàn tiền linh hoạt 24h, Hoàn tiền 100% mùa cao điểm..."
              value={form.policy_name}
              onChange={(e) => handleChange('policy_name', e.target.value)}
              disabled={loading}
              autoFocus
            />
            {errors.policy_name && <span className="rp-form-error-msg">{errors.policy_name}</span>}
          </div>

          {/* Grid: Khách sạn áp dụng & Trạng thái */}
          <div className="rp-modal-grid-2">
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
                Chọn cụ thể khách sạn hoặc áp dụng chung toàn bộ hệ thống
              </span>
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Trạng thái chính sách</label>
              <select
                className="rp-form-select"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={loading}
              >
                <option value="ACTIVE">Đang áp dụng (ACTIVE)</option>
                <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
              </select>
              <span className="rp-form-hint">
                Chính sách đang áp dụng sẽ tự động tính toán khi khách hủy phòng
              </span>
            </div>
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

          {/* Điều kiện hoàn tiền */}
          <div className="rp-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="rp-form-label">Điều kiện &amp; Quy định hoàn tiền chi tiết</label>
              <span style={{ fontSize: '0.75rem', color: (form.refund_conditions?.length || 0) > 950 ? '#dc2626' : '#94a3b8' }}>
                {form.refund_conditions?.length || 0} / 1000
              </span>
            </div>
            <input
              type="text"
              maxLength={1000}
              className={`rp-form-input ${errors.refund_conditions ? 'rp-form-input--error' : ''}`}
              placeholder="Ví dụ: Miễn phí hủy trước thời hạn, sau thời hạn phạt phần tiền phòng đêm đầu tiên..."
              value={form.refund_conditions}
              onChange={(e) => handleChange('refund_conditions', e.target.value)}
              disabled={loading}
            />
            {errors.refund_conditions && (
              <span className="rp-form-error-msg">{errors.refund_conditions}</span>
            )}
          </div>

          {/* Mô tả chính sách */}
          <div className="rp-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="rp-form-label">Mô tả chính sách (Ghi chú nội bộ / hiển thị khách sạn)</label>
              <span style={{ fontSize: '0.75rem', color: (form.description?.length || 0) > 950 ? '#dc2626' : '#94a3b8' }}>
                {form.description?.length || 0} / 1000
              </span>
            </div>
            <textarea
              className={`rp-form-textarea ${errors.description ? 'rp-form-textarea--error' : ''}`}
              rows="2"
              maxLength={1000}
              placeholder="Mô tả bổ sung về chính sách hoàn tiền này..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={loading}
            ></textarea>
            {errors.description && (
              <span className="rp-form-error-msg">{errors.description}</span>
            )}
          </div>

          {/* Thời gian hiệu lực: Từ ngày -> Đến ngày */}
          <div className="rp-modal-grid-2">
            <div className="rp-form-group">
              <label className="rp-form-label">Hiệu lực từ ngày</label>
              <input
                type="date"
                className="rp-form-input"
                value={form.effective_from}
                onChange={(e) => handleChange('effective_from', e.target.value)}
                disabled={loading}
              />
              <span className="rp-form-hint">Để trống nếu có hiệu lực ngay lập tức</span>
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Hiệu lực đến ngày</label>
              <input
                type="date"
                className={`rp-form-input ${errors.effective_to ? 'rp-form-input--error' : ''}`}
                value={form.effective_to}
                onChange={(e) => handleChange('effective_to', e.target.value)}
                disabled={loading}
              />
              {errors.effective_to ? (
                <span className="rp-form-error-msg">{errors.effective_to}</span>
              ) : (
                <span className="rp-form-hint">Để trống nếu không giới hạn ngày kết thúc</span>
              )}
            </div>
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

