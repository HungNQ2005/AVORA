import React, { useState, useEffect } from 'react';
import './CommissionPolicyFormModal.css';

const EMPTY_FORM = {
  policy_name: '',
  scope_type: 'SYSTEM', // SYSTEM | STAR | HOTEL
  hotel_id: '',
  star_quality: '',
  commission_rate: 12.0,
  priority_level: 0,
  valid_from: '',
  valid_to: '',
  is_active: true,
};

const CommissionPolicyFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  hotels = [],
  loading = false,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let detectedScope = 'SYSTEM';
        if (initialData.hotel_id) {
          detectedScope = 'HOTEL';
        } else if (initialData.star_quality) {
          detectedScope = 'STAR';
        }

        setForm({
          policy_name: initialData.policy_name || '',
          scope_type: detectedScope,
          hotel_id: initialData.hotel_id || '',
          star_quality: initialData.star_quality ? String(initialData.star_quality) : '',
          commission_rate:
            initialData.commission_rate !== undefined ? initialData.commission_rate : 12.0,
          priority_level:
            initialData.priority_level !== undefined ? initialData.priority_level : 0,
          valid_from: initialData.valid_from ? initialData.valid_from.substring(0, 10) : '',
          valid_to: initialData.valid_to ? initialData.valid_to.substring(0, 10) : '',
          is_active: initialData.is_active !== undefined ? Boolean(initialData.is_active) : true,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleScopeChange = (scope) => {
    let newPriority = 0;
    if (scope === 'HOTEL') newPriority = 3;
    else if (scope === 'STAR') newPriority = 2;
    else newPriority = 0;

    setForm((prev) => ({
      ...prev,
      scope_type: scope,
      hotel_id: scope === 'HOTEL' ? prev.hotel_id : '',
      star_quality: scope === 'STAR' ? prev.star_quality : '',
      priority_level: newPriority,
    }));
  };

  const validate = () => {
    const errs = {};
    const cleanName = form.policy_name.trim();

    // 1. Tên chính sách phí hoa hồng (Bắt buộc cho cả tạo mới và cập nhật)
    if (!cleanName) {
      errs.policy_name = 'Vui lòng nhập tên chính sách phí hoa hồng.';
    } else if (cleanName.length > 255) {
      errs.policy_name = 'Tên chính sách không được vượt quá 255 ký tự.';
    } else if (!/[\p{L}\p{N}]/u.test(cleanName)) {
      errs.policy_name = 'Tên chính sách không được chỉ bao gồm ký tự đặc biệt (phải có ít nhất một chữ cái hoặc chữ số).';
    }

    const rate = Number(form.commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errs.commission_rate = 'Tỷ lệ hoa hồng phải từ 0% đến 100%.';
    }

    const priority = Number(form.priority_level);
    if (isNaN(priority) || priority < 0 || !Number.isInteger(priority)) {
      errs.priority_level = 'Mức độ ưu tiên phải là số nguyên không âm (>= 0).';
    }

    if (form.scope_type === 'HOTEL' && !form.hotel_id) {
      errs.hotel_id = 'Vui lòng chọn khách sạn áp dụng.';
    }

    if (form.scope_type === 'STAR' && !form.star_quality) {
      errs.star_quality = 'Vui lòng chọn phân khúc hạng sao áp dụng.';
    }

    if (form.valid_from && form.valid_to) {
      if (new Date(form.valid_to) < new Date(form.valid_from)) {
        errs.valid_to = 'Ngày kết thúc không được sớm hơn ngày bắt đầu.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate() || loading) return;

    const payload = {
      policy_name: form.policy_name.trim(),
      commission_rate: Number(form.commission_rate),
      priority_level: Number(form.priority_level),
      star_quality: form.scope_type === 'STAR' && form.star_quality ? Number(form.star_quality) : null,
      hotel_id: form.scope_type === 'HOTEL' && form.hotel_id ? form.hotel_id : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      is_active: isEdit ? Boolean(form.is_active) : true,
    };

    onSubmit(payload);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculation simulation
  const sampleAmount = 1000000; // 1,000,000 VND
  const rateNum = Number(form.commission_rate) || 0;
  const sampleCommission = Math.round((sampleAmount * rateNum) / 100);
  const sampleHostEarn = Math.max(0, sampleAmount - sampleCommission);

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <form
        className="cp-modal-content"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div className="cp-modal-header">
          <div className="cp-modal-header-info">
            <div className="cp-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <h3 className="cp-modal-title">
                {isEdit ? 'Chỉnh sửa chính sách phí hoa hồng' : 'Thiết lập chính sách phí hoa hồng mới'}
              </h3>
              <p className="cp-modal-subtitle">
                {isEdit
                  ? `Mã: ${initialData.policy_code || initialData.policy_id?.substring(0, 8)}`
                  : 'Cấu hình tỷ lệ hoa hồng thu từ đơn đặt phòng cho chuỗi khách sạn AVORA'}
              </p>
            </div>
          </div>
          <button type="button" className="cp-modal-close" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cp-modal-body">
          {/* Tên chính sách */}
          <div className="cp-form-group">
            <label className="cp-form-label">
              Tên chính sách phí hoa hồng <span className="cp-required">*</span>
            </label>
            <input
              type="text"
              className={`cp-form-input ${errors.policy_name ? 'cp-form-input--error' : ''}`}
              placeholder="Ví dụ: Chính sách hoa hồng 2026, [CP-VIP] Đối tác 5★ & Resort..."
              value={form.policy_name}
              onChange={(e) => handleChange('policy_name', e.target.value)}
              disabled={loading}
              autoFocus
            />
            {errors.policy_name && <span className="cp-form-error-msg">{errors.policy_name}</span>}
          </div>

          {/* Phạm vi áp dụng */}
          <div className="cp-form-group">
            <label className="cp-form-label">
              Phạm vi đối tượng áp dụng <span className="cp-required">*</span>
            </label>
            <div className="cp-scope-options">
              <div
                className={`cp-scope-btn ${form.scope_type === 'SYSTEM' ? 'cp-scope-btn--active' : ''}`}
                onClick={() => handleScopeChange('SYSTEM')}
              >
                <div className="cp-scope-btn__title">Toàn hệ thống</div>
                <div className="cp-scope-btn__desc">Mặc định chuỗi AVORA</div>
              </div>

              <div
                className={`cp-scope-btn ${form.scope_type === 'STAR' ? 'cp-scope-btn--active' : ''}`}
                onClick={() => handleScopeChange('STAR')}
              >
                <div className="cp-scope-btn__title">Phân khúc sao</div>
                <div className="cp-scope-btn__desc">Theo xếp hạng 1★ - 5★</div>
              </div>

              <div
                className={`cp-scope-btn ${form.scope_type === 'HOTEL' ? 'cp-scope-btn--active' : ''}`}
                onClick={() => handleScopeChange('HOTEL')}
              >
                <div className="cp-scope-btn__title">Khách sạn cụ thể</div>
                <div className="cp-scope-btn__desc">Hợp đồng đối tác riêng</div>
              </div>
            </div>
          </div>

          {/* Conditional Input based on Scope */}
          {form.scope_type === 'STAR' && (
            <div className="cp-form-group">
              <label className="cp-form-label">
                Chọn phân khúc hạng sao <span className="cp-required">*</span>
              </label>
              <select
                className={`cp-form-select ${errors.star_quality ? 'cp-form-select--error' : ''}`}
                value={form.star_quality}
                onChange={(e) => handleChange('star_quality', e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chọn hạng sao áp dụng --</option>
                <option value="5">Khách sạn 5 sao (Luxury / Resort đẳng cấp cao)</option>
                <option value="4">Khách sạn 4 sao (Cao cấp tiêu chuẩn)</option>
                <option value="3">Khách sạn 3 sao (Boutique & Phổ thông)</option>
                <option value="2">Khách sạn 2 sao (Kinh tế & Budget)</option>
                <option value="1">Khách sạn 1 sao (Tiết kiệm)</option>
              </select>
              {errors.star_quality && <span className="cp-form-error-msg">{errors.star_quality}</span>}
            </div>
          )}

          {form.scope_type === 'HOTEL' && (
            <div className="cp-form-group">
              <label className="cp-form-label">
                Chọn khách sạn áp dụng <span className="cp-required">*</span>
              </label>
              <select
                className={`cp-form-select ${errors.hotel_id ? 'cp-form-select--error' : ''}`}
                value={form.hotel_id}
                onChange={(e) => handleChange('hotel_id', e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chọn khách sạn cụ thể --</option>
                {hotels.map((h) => (
                  <option key={h.hotel_id} value={h.hotel_id}>
                    {h.name} {h.star_quality ? `(${h.star_quality}★)` : ''} - {h.address || 'Hệ thống'}
                  </option>
                ))}
              </select>
              {errors.hotel_id && <span className="cp-form-error-msg">{errors.hotel_id}</span>}
            </div>
          )}

          {/* Grid 2: Tỷ lệ hoa hồng & Mức độ ưu tiên */}
          <div className="cp-modal-grid-2">
            {/* Tỷ lệ hoa hồng */}
            <div className="cp-form-group">
              <label className="cp-form-label">
                Tỷ lệ hoa hồng (%) <span className="cp-required">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className={`cp-form-input ${errors.commission_rate ? 'cp-form-input--error' : ''}`}
                value={form.commission_rate}
                onChange={(e) => handleChange('commission_rate', e.target.value)}
                disabled={loading}
              />
              <div className="cp-quick-tags">
                {[8, 10, 12, 15, 18, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`cp-quick-tag ${Number(form.commission_rate) === rate ? 'cp-quick-tag--active' : ''}`}
                    onClick={() => handleChange('commission_rate', rate)}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              {errors.commission_rate && (
                <span className="cp-form-error-msg">{errors.commission_rate}</span>
              )}
            </div>

            {/* Mức độ ưu tiên */}
            <div className="cp-form-group">
              <label className="cp-form-label">
                Mức độ ưu tiên (Priority) <span className="cp-required">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className={`cp-form-input ${errors.priority_level ? 'cp-form-input--error' : ''}`}
                value={form.priority_level}
                onChange={(e) => handleChange('priority_level', e.target.value)}
                disabled={loading}
              />
              <span className="cp-form-hint">
                Mức cao hơn sẽ ghi đè mức thấp hơn khi quyết toán đơn đặt phòng (Gợi ý: Khách sạn = 3, Sao = 2, Chuỗi = 0).
              </span>
              {errors.priority_level && (
                <span className="cp-form-error-msg">{errors.priority_level}</span>
              )}
            </div>
          </div>

          {/* Minh họa phân chia doanh thu */}
          <div className="cp-simulation-card">
            <div className="cp-simulation-icon">💡</div>
            <div className="cp-simulation-content">
              <strong>Mô phỏng quyết toán (Mỗi 1.000.000 VNĐ tiền phòng):</strong>
              <div>
                AVORA thu hoa hồng:{' '}
                <span className="cp-simulation-highlight">
                  {sampleCommission.toLocaleString('vi-VN')} VNĐ ({form.commission_rate}%)
                </span>
                {' '}&bull; Đối tác khách sạn nhận:{' '}
                <span className="cp-simulation-highlight">
                  {sampleHostEarn.toLocaleString('vi-VN')} VNĐ ({Math.max(0, 100 - Number(form.commission_rate || 0))}%)
                </span>
              </div>
            </div>
          </div>

          {/* Thời gian hiệu lực: Từ ngày -> Đến ngày */}
          <div className="cp-modal-grid-2">
            <div className="cp-form-group">
              <label className="cp-form-label">Hiệu lực từ ngày</label>
              <input
                type="date"
                className="cp-form-input"
                value={form.valid_from}
                onChange={(e) => handleChange('valid_from', e.target.value)}
                disabled={loading}
              />
              <span className="cp-form-hint">Để trống nếu áp dụng ngay lập tức</span>
            </div>

            <div className="cp-form-group">
              <label className="cp-form-label">Hiệu lực đến ngày</label>
              <input
                type="date"
                className={`cp-form-input ${errors.valid_to ? 'cp-form-input--error' : ''}`}
                value={form.valid_to}
                onChange={(e) => handleChange('valid_to', e.target.value)}
                disabled={loading}
              />
              {errors.valid_to ? (
                <span className="cp-form-error-msg">{errors.valid_to}</span>
              ) : (
                <span className="cp-form-hint">Để trống nếu áp dụng vô thời hạn</span>
              )}
            </div>
          </div>

          {/* Trạng thái hoạt động (is_active) - Khi tạo mới mặc định luôn là true, chỉ hiển thị chọn khi Chỉnh sửa */}
          {isEdit && (
            <div className="cp-form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  Kích hoạt chính sách (is_active)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {form.is_active ? 'Chính sách đang BẬT và sẵn sàng áp dụng tính hoa hồng' : 'Chính sách đang TẮT (vô hiệu hóa tạm thời)'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: form.is_active ? '#003580' : '#cbd5e1',
                  transition: '.25s',
                  borderRadius: 24,
                }}>
                  <span style={{
                    position: 'absolute',
                    height: 18,
                    width: 18,
                    left: form.is_active ? 23 : 3,
                    bottom: 3,
                    backgroundColor: '#ffffff',
                    transition: '.25s',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cp-modal-footer">
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

export default CommissionPolicyFormModal;
