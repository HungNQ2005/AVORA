import React, { useState } from 'react';
import './RoomTypeFormModal.css';

const bedTypes = [
  { value: 'Single Bed', label: 'Giường đơn (Single Bed)', aliases: ['single', 'single beds'] },
  { value: 'Double Bed', label: 'Giường đôi (Double Bed)', aliases: ['double', 'double beds'] },
  { value: 'Queen Size Bed', label: 'Giường Queen Size (Queen Size Bed)', aliases: ['queen bed', 'queen beds', 'queen size'] },
  { value: 'King Size Bed', label: 'Giường King Size (King Size Bed)', aliases: ['king bed', 'king beds', 'king size'] },
  { value: 'Super King Size Bed', label: 'Giường Super King Size (Super King Size Bed)', aliases: ['super king bed', 'super king size'] },
  { value: 'Triple Bed', label: 'Giường ba người (Triple Bed)', aliases: ['triple beds', 'triple'] },
  { value: 'Twin Bed', label: 'Hai giường đơn (Twin Bed)', aliases: ['twin beds', 'twin'] },
];

const getInitialBedDetails = (bedType) => {
  const match = typeof bedType === 'string'
    ? bedType.match(/^\s*(\d+)\s*(?:x\s*)?(.+?)\s*$/i)
    : null;
  if (!match) {
    return { bed_count: '', bed_type: '' };
  }

  const storedType = match[2].trim().toLowerCase();
  const normalizedType = bedTypes.find((type) => (
    type.value.toLowerCase() === storedType
    || type.aliases.includes(storedType)
  ));

  return normalizedType
    ? { bed_count: match[1], bed_type: normalizedType.value }
    : { bed_count: '', bed_type: '' };
};

const getInitialRoomSize = (roomSize) => (
  typeof roomSize === 'string'
    ? roomSize.replace(/\s*m(?:²|2)\s*$/i, '').trim()
    : ''
);

const createInitialFormData = (roomType, defaultHotelId) => ({
  hotel_id: roomType?.hotel_id || defaultHotelId || '',
  type_name: roomType?.type_name || '',
  max_adults: roomType?.max_adults ?? 2,
  max_children: roomType?.max_children ?? 0,
  ...getInitialBedDetails(roomType?.bed_type),
  room_size: getInitialRoomSize(roomType?.room_size),
  default_price: roomType?.default_price ?? '',
  is_deleted: roomType?.is_deleted ?? false,
  facility_ids: roomType?.facilities?.map((facility) => facility.facility_id) || [],
});

const RoomTypeFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenDeleteModal,
  initialData,
  hotels,
  facilities = [],
  facilitiesError = '',
  facilitiesLoading = false,
  onRetryFacilities,
  defaultHotelId,
  saving = false,
  submitError = '',
}) => {
  const [formData, setFormData] = useState(() => createInitialFormData(initialData, defaultHotelId));
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const typeName = formData.type_name.trim();
    const maxAdults = Number(formData.max_adults);
    const maxChildren = Number(formData.max_children);
    const price = Number(formData.default_price);
    const bedCount = Number(formData.bed_count);

    if (!typeName) {
      setValidationError('Vui lòng nhập tên hạng phòng.');
      return;
    }
    if (!Number.isInteger(maxAdults) || maxAdults < 1) {
      setValidationError('Số người lớn phải là số nguyên lớn hơn 0.');
      return;
    }
    if (!Number.isInteger(maxChildren) || maxChildren < 0) {
      setValidationError('Số trẻ em phải là số nguyên không âm.');
      return;
    }
    if (formData.default_price === '' || !Number.isFinite(price) || price < 0) {
      setValidationError('Giá niêm yết phải là số không âm.');
      return;
    }
    if (formData.bed_count === '' || !Number.isSafeInteger(bedCount) || bedCount < 1) {
      setValidationError('Số lượng giường phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    if (!bedTypes.some((type) => type.value === formData.bed_type)) {
      setValidationError('Vui lòng chọn loại giường trong danh sách.');
      return;
    }
    if (formData.room_size.trim().length + (formData.room_size.trim() ? 3 : 0) > 50) {
      setValidationError('Diện tích tối đa 50 ký tự.');
      return;
    }

    const payload = {
      hotel_id: formData.hotel_id || null,
      type_name: typeName,
      max_adults: maxAdults,
      max_children: maxChildren,
      bed_type: `${bedCount} x ${formData.bed_type}`,
      room_size: formData.room_size.trim() ? `${formData.room_size.trim()} m²` : null,
      default_price: price,
      is_deleted: formData.is_deleted,
      facility_ids: formData.facility_ids,
    };

    await onSubmit(payload);
  };

  return (
    <div className="rt-modal-overlay">
      <form className="rt-modal-content" onSubmit={handleSubmit}>
        <div className="rt-modal-header">
          <div className="rt-modal-header-info">
            <div className="rt-modal-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M3 10h18M8 3v7m8-7v7"></path>
              </svg>
            </div>
            <div>
              <h2 className="rt-modal-title">
                {initialData ? 'Chỉnh sửa hạng phòng' : 'Thêm hạng phòng'}
              </h2>
              <p className="rt-modal-subtitle">
                Thông tin được lưu trực tiếp vào cơ sở dữ liệu hạng phòng.
              </p>
            </div>
          </div>
          <button type="button" className="rt-modal-close" onClick={onClose} aria-label="Đóng" disabled={saving}>
            ×
          </button>
        </div>

        <div className="rt-modal-body">
          <div className="rt-modal-grid">
            <div className="rt-modal-col">
              <h3 className="rt-section-title">Thông tin hạng phòng</h3>

              <div className="rt-form-group">
                <label htmlFor="room-type-hotel">Khách sạn</label>
                <select
                  id="room-type-hotel"
                  className="rt-select"
                  name="hotel_id"
                  value={formData.hotel_id}
                  onChange={updateField}
                >
                  <option value="">Chưa gán khách sạn</option>
                  {hotels.map((hotel) => (
                    <option key={hotel.hotel_id} value={hotel.hotel_id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rt-form-group">
                <label htmlFor="room-type-name">Tên hạng phòng <span className="req">*</span></label>
                <input
                  id="room-type-name"
                  className="rt-input"
                  name="type_name"
                  value={formData.type_name}
                  onChange={updateField}
                  maxLength={255}
                />
              </div>

              <div className="rt-form-group">
                <label htmlFor="room-type-bed-count">Loại giường <span className="req">*</span></label>
                <div className="rt-bed-input-row">
                  <input
                    id="room-type-bed-count"
                    className="rt-input"
                    type="number"
                    name="bed_count"
                    min="1"
                    step="1"
                    value={formData.bed_count}
                    onChange={updateField}
                    placeholder="Số giường"
                    required
                  />
                  <select
                    id="room-type-bed-type"
                    className="rt-select"
                    name="bed_type"
                    value={formData.bed_type}
                    onChange={updateField}
                    required
                  >
                    <option value="">Chọn loại giường</option>
                    {bedTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rt-form-group">
                <label htmlFor="room-type-size">Diện tích</label>
                <div className="rt-input-suffix">
                  <input
                    id="room-type-size"
                    className="rt-input"
                    type="number"
                    name="room_size"
                    min="0"
                    step="any"
                    value={formData.room_size}
                    onChange={updateField}
                    placeholder="Ví dụ: 35"
                  />
                  <span aria-hidden="true">m²</span>
                </div>
              </div>
            </div>

            <div className="rt-modal-col">
              <div className="rt-form-group">
                <label htmlFor="room-type-facilities">Tiện ích phòng</label>
                <details className="rt-facility-dropdown">
                  <summary id="room-type-facilities">
                    {formData.facility_ids.length > 0
                      ? `Đã chọn ${formData.facility_ids.length} tiện ích`
                      : 'Chọn tiện ích có sẵn'}
                  </summary>
                  <div className="rt-facility-options">
                    {facilities.map((facility) => (
                      <label key={facility.facility_id} className="rt-facility-option">
                        <input
                          type="checkbox"
                          checked={formData.facility_ids.includes(facility.facility_id)}
                          onChange={(event) => {
                            setFormData((current) => ({
                              ...current,
                              facility_ids: event.target.checked
                                ? [...current.facility_ids, facility.facility_id]
                                : current.facility_ids.filter((id) => id !== facility.facility_id),
                            }));
                            setValidationError('');
                          }}
                        />
                        <span>{facility.facility_name}</span>
                      </label>
                    ))}
                    {facilitiesLoading && (
                      <p className="rt-facility-empty" role="status">Đang tải danh sách tiện ích...</p>
                    )}
                    {facilities.length === 0 && !facilitiesError && !facilitiesLoading && (
                      <p className="rt-facility-empty">Chưa có tiện ích. Vui lòng thêm trong mục quản lý tiện ích.</p>
                    )}
                  </div>
                </details>
                {facilitiesError && (
                  <div className="rt-facility-load-error">
                    <p className="rt-form-error" role="alert">{facilitiesError}</p>
                    <button
                      type="button"
                      className="rt-facility-retry"
                      onClick={onRetryFacilities}
                      disabled={facilitiesLoading}
                    >
                      {facilitiesLoading ? 'Đang tải...' : 'Tải lại tiện ích'}
                    </button>
                  </div>
                )}
              </div>

              <h3 className="rt-section-title">Sức chứa & giá niêm yết</h3>

              <div className="rt-form-row-2">
                <div className="rt-form-group">
                  <label htmlFor="room-type-adults">Người lớn <span className="req">*</span></label>
                  <input
                    id="room-type-adults"
                    className="rt-input"
                    type="number"
                    name="max_adults"
                    step="any"
                    value={formData.max_adults}
                    onChange={updateField}
                  />
                </div>
                <div className="rt-form-group">
                  <label htmlFor="room-type-children">Trẻ em <span className="req">*</span></label>
                  <input
                    id="room-type-children"
                    className="rt-input"
                    type="number"
                    name="max_children"
                    step="any"
                    value={formData.max_children}
                    onChange={updateField}
                  />
                </div>
              </div>

              <div className="rt-form-group">
                <label htmlFor="room-type-price">Giá niêm yết (VND) <span className="req">*</span></label>
                <input
                  id="room-type-price"
                  className="rt-input"
                  type="number"
                  name="default_price"
                  step="any"
                  value={formData.default_price}
                  onChange={updateField}
                />
              </div>

              <label className="rt-checkbox-label rt-extra-bed">
                <input
                  type="checkbox"
                  name="is_deleted"
                  checked={!formData.is_deleted}
                  onChange={(event) => {
                    setFormData((current) => ({ ...current, is_deleted: !event.target.checked }));
                    setValidationError('');
                  }}
                />
                <span>Đang mở bán</span>
              </label>
            </div>
          </div>

          {validationError && (
            <p className="rt-form-error" role="alert">{validationError}</p>
          )}
          {submitError && (
            <p className="rt-form-error" role="alert">{submitError}</p>
          )}
        </div>

        <div className="rt-modal-footer">
          <button type="button" className="rt-btn rt-btn-cancel" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </button>
          <div className="rt-modal-footer-right">
            {initialData && (
              <button
                type="button"
                className="rt-btn rt-btn-danger-outline"
                onClick={onOpenDeleteModal}
                disabled={saving}
              >
                Xóa hạng phòng
              </button>
            )}
            <button type="submit" className="rt-btn rt-btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : initialData ? 'Lưu thay đổi' : 'Thêm hạng phòng'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RoomTypeFormModal;
