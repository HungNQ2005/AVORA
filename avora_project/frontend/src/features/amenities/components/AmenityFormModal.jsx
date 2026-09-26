import React, { useState, useEffect } from 'react';
import AmenityIconRenderer from './AmenityIconRenderer';
import './AmenityFormModal.css';

const FACILITY_TYPES = [
  { value: 'INTERNET', label: 'INTERNET (Internet / Wi-Fi)' },
  { value: 'POOL', label: 'POOL (Hồ bơi)' },
  { value: 'FOOD', label: 'FOOD (Bữa sáng / Ẩm thực)' },
  { value: 'PARKING', label: 'PARKING (Bãi đỗ xe)' },
  { value: 'SERVICE', label: 'SERVICE (Dịch vụ / Lễ tân 24/7)' },
  { value: 'GYM', label: 'GYM (Thể hình / Fitness)' },
  { value: 'RESTAURANT', label: 'RESTAURANT (Nhà hàng)' },
  { value: 'SPA', label: 'SPA (Spa & Chăm sóc)' },
];

const FACILITY_ICONS = [
  { value: 'wifi-icon', label: 'wifi-icon (Wi-Fi / Internet)' },
  { value: 'pool-icon', label: 'pool-icon (Hồ bơi)' },
  { value: 'breakfast-icon', label: 'breakfast-icon (Bữa sáng / Ẩm thực)' },
  { value: 'parking-icon', label: 'parking-icon (Bãi đỗ xe)' },
  { value: 'reception-icon', label: 'reception-icon (Lễ tân 24/7)' },
  { value: 'gym-icon', label: 'gym-icon (Phòng Gym)' },
  { value: 'restaurant-icon', label: 'restaurant-icon (Nhà hàng)' },
  { value: 'spa-icon', label: 'spa-icon (Spa / Bồn tắm)' },
];

const AmenityFormModal = ({
  isOpen,
  onClose,
  onSave,
  amenity = null,
  saving = false,
  error = '',
}) => {
  const isEdit = Boolean(amenity && amenity.facility_id);

  const [formData, setFormData] = useState({
    facility_name: '',
    type: 'INTERNET',
    icon: 'wifi-icon',
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (amenity) {
      setFormData({
        facility_name: amenity.name_vi || amenity.facility_name || '',
        type: amenity.type || 'INTERNET',
        icon: amenity.icon || 'wifi-icon',
      });
    } else {
      setFormData({
        facility_name: '',
        type: 'INTERNET',
        icon: 'wifi-icon',
      });
    }
    setValidationError('');
  }, [amenity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = formData.facility_name.trim();

    if (!name) {
      setValidationError('Vui lòng nhập tên tiện nghi.');
      return;
    }

    setValidationError('');
    onSave({
      facility_name: name,
      name_vi: name,
      type: formData.type,
      icon: formData.icon,
    });
  };

  return (
    <div className="rt-modal-overlay">
      <form className="rt-modal-content" onSubmit={handleSubmit}>
        {/* Modal Header */}
        <div className="rt-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">
                {isEdit ? 'Chỉnh sửa tiện ích' : 'Thêm tiện nghi'}
              </h2>
              <p className="rt-modal-subtitle">
                Thông tin được lưu trực tiếp vào cơ sở dữ liệu tiện ích.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rt-modal-close"
            onClick={onClose}
            aria-label="Đóng"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="rt-modal-body">
          <div className="rt-modal-grid">
            {/* Cột 1: THÔNG TIN TIỆN NGHI */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Thông tin tiện nghi</h3>

              <div className="rt-form-group">
                <label htmlFor="amenity-name">
                  Tên tiện nghi <span className="req">*</span>
                </label>
                <input
                  id="amenity-name"
                  className="rt-input"
                  type="text"
                  placeholder="Ví dụ: Wi-Fi Tốc độ cao, Hồ bơi vô cực..."
                  value={formData.facility_name}
                  onChange={(e) => {
                    setFormData({ ...formData, facility_name: e.target.value });
                    setValidationError('');
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="rt-form-group">
                <label htmlFor="amenity-type">
                  Loại tiện ích (Type) <span className="req">*</span>
                </label>
                <select
                  id="amenity-type"
                  className="rt-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {FACILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cột 2: BIỂU TƯỢNG & HIỂN THỊ */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Biểu tượng & hiển thị</h3>

              <div className="rt-form-group">
                <label htmlFor="amenity-icon">
                  Biểu tượng (Icon) <span className="req">*</span>
                </label>
                <select
                  id="amenity-icon"
                  className="rt-select"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                >
                  {FACILITY_ICONS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="amenity-rt-preview-box">
                <div className="amenity-rt-preview-icon">
                  <AmenityIconRenderer
                    name={formData.facility_name}
                    type={formData.type}
                    icon={formData.icon}
                    size={24}
                  />
                </div>
                <div className="amenity-rt-preview-info">
                  <span className="amenity-rt-preview-name">
                    {formData.facility_name || 'Tên tiện nghi sẽ hiển thị'}
                  </span>
                  <span className="amenity-rt-preview-meta">
                    Loại: {formData.type} • Icon: {formData.icon}
                  </span>
                </div>
              </div>

              {/* <div className="amenity-rt-notice">
                Mã ID (<strong>facility_id</strong>) sẽ do cơ sở dữ liệu PostgreSQL tự động sinh (UUID).
              </div> */}
            </div>
          </div>

          {validationError && (
            <p className="rt-form-error" role="alert">{validationError}</p>
          )}
          {error && (
            <p className="rt-form-error" role="alert">{error}</p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="rt-modal-footer">
          <button
            type="button"
            className="rt-btn rt-btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Hủy bỏ
          </button>
          <div className="rt-modal-footer-right">
            <button
              type="submit"
              className="rt-btn rt-btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm tiện nghi'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AmenityFormModal;
