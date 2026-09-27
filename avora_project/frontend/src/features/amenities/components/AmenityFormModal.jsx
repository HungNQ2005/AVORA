import React, { useState, useEffect } from 'react';
import './AmenityFormModal.css';

const FACILITY_TYPES = ['INTERNET', 'POOL', 'FOOD', 'PARKING', 'SERVICE', 'GYM', 'RESTAURANT', 'SPA'];
const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code <= 0x1f || code === 0x7f;
});

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
    const type = formData.type.trim();
    const icon = formData.icon.trim();

    if (!name || !type || !icon) {
      setValidationError('Vui lòng nhập đầy đủ tên, loại và biểu tượng tiện ích.');
      return;
    }
    if (name.length > 255 || type.length > 100 || icon.length > 100) {
      setValidationError('Tên tiện ích tối đa 255 ký tự; loại và biểu tượng tối đa 100 ký tự.');
      return;
    }
    if ([name, type, icon].some(hasControlCharacters)) {
      setValidationError('Thông tin tiện ích chứa ký tự không hợp lệ.');
      return;
    }

    setValidationError('');
    onSave({
      facility_name: name,
      name_vi: name,
      type: type.toUpperCase(),
      icon,
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
                  maxLength={255}
                  autoFocus
                  required
                />
              </div>

              <div className="rt-form-group">
                <label htmlFor="amenity-type">
                  Loại tiện ích (Type) <span className="req">*</span>
                </label>
                <input
                  id="amenity-type"
                  className="rt-input"
                  type="text"
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value });
                    setValidationError('');
                  }}
                  maxLength={100}
                  required
                />
              </div>
            </div>

            {/* Cột 2: BIỂU TƯỢNG & HIỂN THỊ */}
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Biểu tượng & hiển thị</h3>

              <div className="rt-form-group">
                <label htmlFor="amenity-icon">
                  Biểu tượng (Icon) <span className="req">*</span>
                </label>
                <input
                  id="amenity-icon"
                  className="rt-input"
                  type="text"
                  value={formData.icon}
                  onChange={(e) => {
                    setFormData({ ...formData, icon: e.target.value });
                    setValidationError('');
                  }}
                  maxLength={100}
                  required
                />
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
