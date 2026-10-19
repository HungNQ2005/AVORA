import React, { useState, useEffect } from 'react';
import { fetchRoomTypesForHotel } from '../../../services/roomApi';
import './RoomFormModal.css';

const COMMON_FLOORS = [
  'Tầng 1',
  'Tầng 2',
  'Tầng 3',
  'Tầng 4',
  'Tầng 5',
  'Tầng 6',
  'Tầng 7',
  'Tầng 8',
  'Tầng 9',
  'Tầng 10',
  'Tầng Áp Mái (Penthouse)',
];

const RoomFormModal = ({
  isOpen,
  onClose,
  initialData = null,
  hotels = [],
  roomTypes = [],
  defaultHotelId = '',
  saving = false,
  error = '',
  onSubmit,
}) => {
  const isEdit = Boolean(initialData);
  const resolvedDefaultHotelId =
    defaultHotelId && defaultHotelId !== 'ALL' ? defaultHotelId : '';

  const initialStatus = initialData?.is_deleted
    ? 'LOCKED'
    : initialData?.status_cd === 'BOOKED'
      ? 'OCCUPIED'
      : (initialData?.status_cd || 'AVAILABLE');

  const [hotelId, setHotelId] = useState(
    initialData?.hotel_id || resolvedDefaultHotelId || (hotels[0]?.hotel_id || '')
  );
  const [roomTypeId, setRoomTypeId] = useState(
    initialData?.room_type_id || (roomTypes[0]?.room_type_id || '')
  );
  const [roomNumber, setRoomNumber] = useState(initialData?.room_number || '');
  const [floor, setFloor] = useState(initialData?.floor || 'Tầng 1');
  const [statusCd, setStatusCd] = useState(initialStatus);

  const [fetchedRoomTypes, setFetchedRoomTypes] = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const selectedHotelId =
    hotelId && hotelId !== 'ALL'
      ? hotelId
      : (initialData?.hotel_id || resolvedDefaultHotelId || hotels[0]?.hotel_id || '');

  const baseRoomTypes = fetchedRoomTypes.length > 0 ? fetchedRoomTypes : roomTypes;
  const availableRoomTypes =
    initialData?.room_type_id &&
    initialData?.m_room_type &&
    !baseRoomTypes.some((rt) => rt.room_type_id === initialData.room_type_id)
      ? [{ ...initialData.m_room_type, room_type_id: initialData.room_type_id }, ...baseRoomTypes]
      : baseRoomTypes;

  const selectedRoomTypeId =
    roomTypeId && availableRoomTypes.some((rt) => rt.room_type_id === roomTypeId)
      ? roomTypeId
      : (initialData?.room_type_id || availableRoomTypes[0]?.room_type_id || '');

  const selectedRoomTypeObj = availableRoomTypes.find(
    (rt) => rt.room_type_id === selectedRoomTypeId
  );

  const floorOptions =
    floor && !COMMON_FLOORS.includes(floor)
      ? [floor, ...COMMON_FLOORS]
      : COMMON_FLOORS;

  // Load existing room types for dropdown
  useEffect(() => {
    let active = true;
    fetchRoomTypesForHotel(selectedHotelId)
      .then((types) => {
        if (active && Array.isArray(types)) {
          setFetchedRoomTypes(types);
          setRoomTypeId((prevId) => {
            if (prevId && types.some((t) => t.room_type_id === prevId)) {
              return prevId;
            }
            if (initialData?.room_type_id) {
              return initialData.room_type_id;
            }
            return types[0]?.room_type_id || '';
          });
        }
      })
      .catch((err) => {
        console.error('Lỗi tải hạng phòng:', err);
      })
      .finally(() => {
        if (active) setRoomTypesLoading(false);
      });
    return () => { active = false; };
  }, [selectedHotelId, initialData?.room_type_id]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedHotelId || selectedHotelId === 'ALL') {
      setValidationError('Vui lòng chọn cơ sở khách sạn.');
      return;
    }
    if (!selectedRoomTypeId) {
      setValidationError('Vui lòng chọn hạng phòng.');
      return;
    }
    if (!String(roomNumber).trim()) {
      setValidationError('Vui lòng nhập số phòng (ví dụ: 101, 201).');
      return;
    }

    const payload = {
      hotel_id: selectedHotelId,
      room_type_id: selectedRoomTypeId,
      room_number: String(roomNumber).trim(),
      floor: String(floor).trim() || 'Tầng 1',
      status_cd: statusCd,
    };

    if (isEdit) {
      payload.is_deleted = false;
    }

    onSubmit(payload);
  };

  return (
    <div className="room-form-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="room-form-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="room-form-modal__header">
          <div>
            <h3 className="room-form-modal__title">
              {isEdit ? `Chỉnh sửa buồng phòng ${initialData?.room_number || ''}` : 'Thêm buồng phòng mới'}
            </h3>
            <p className="room-form-modal__sub">
              {isEdit
                ? 'Cập nhật số phòng, tầng bố trí và trạng thái vận hành của phòng'
                : 'Khai báo thông số phòng thực tế theo đúng cơ cấu hạng phòng đã thiết lập'}
            </p>
          </div>
          <button type="button" className="room-form-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="room-form-modal__body">
          {/* Error Alert */}
          {(validationError || error) && (
            <div className="room-form-alert room-form-alert--error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Hotel field */}
          <div className="room-form-group">
            <label className="room-form-label">
              Cơ sở khách sạn <span className="room-form-req">*</span>
            </label>
            <select
              className="room-form-input"
              value={selectedHotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              <option value="" disabled>-- Chọn cơ sở lưu trú --</option>
              {hotels.map((h) => (
                <option key={h.hotel_id} value={h.hotel_id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type field */}
          <div className="room-form-group">
            <label className="room-form-label">
              Hạng phòng tương ứng <span className="room-form-req">*</span>
            </label>
            <select
              className="room-form-input"
              value={selectedRoomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={roomTypesLoading && availableRoomTypes.length === 0}
            >
              <option value="" disabled>
                {roomTypesLoading && availableRoomTypes.length === 0
                  ? 'Đang tải hạng phòng...'
                  : '-- Chọn hạng phòng --'}
              </option>
              {availableRoomTypes.map((rt) => (
                <option key={rt.room_type_id} value={rt.room_type_id}>
                  {rt.type_name} ({Number(rt.default_price || 0).toLocaleString('vi-VN')} đ)
                </option>
              ))}
            </select>
            {selectedRoomTypeObj && (
              <span className="room-form-hint">
                Giá: {Number(selectedRoomTypeObj.default_price || 0).toLocaleString('vi-VN')} đ/đêm
                {selectedRoomTypeObj.bed_type ? ` • Giường: ${selectedRoomTypeObj.bed_type}` : ''}
                {selectedRoomTypeObj.room_size ? ` • Diện tích: ${selectedRoomTypeObj.room_size}` : ''}
                {selectedRoomTypeObj.max_adults
                  ? ` • Sức chứa: ${selectedRoomTypeObj.max_adults} người lớn, ${selectedRoomTypeObj.max_children || 0} trẻ em`
                  : ''}
              </span>
            )}
          </div>

          {/* Row: Room Number & Floor */}
          <div className="room-form-row">
            <div className="room-form-group">
              <label className="room-form-label">
                Số phòng <span className="room-form-req">*</span>
              </label>
              <input
                type="text"
                className="room-form-input"
                placeholder="VD: 101, 202, VIP-01"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                maxLength="20"
              />
            </div>

            <div className="room-form-group">
              <label className="room-form-label">
                Vị trí tầng <span className="room-form-req">*</span>
              </label>
              <select
                className="room-form-input"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              >
                {floorOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Field */}
          <div className="room-form-group">
            <label className="room-form-label">
              Trạng thái vận hành <span className="room-form-req">*</span>
            </label>
            <div className="room-status-radios">
              <label className="room-radio-card">
                <input
                  type="radio"
                  name="status_cd"
                  value="AVAILABLE"
                  checked={statusCd === 'AVAILABLE'}
                  onChange={(e) => setStatusCd(e.target.value)}
                />
                <span className="room-radio-card__body">
                  <span className="room-radio-card__title">Đang mở bán</span>
                  <span className="room-radio-card__desc">Khả dụng, sẵn sàng đón khách đặt qua OTA</span>
                </span>
              </label>

              <label className="room-radio-card">
                <input
                  type="radio"
                  name="status_cd"
                  value="OCCUPIED"
                  checked={statusCd === 'OCCUPIED'}
                  onChange={(e) => setStatusCd(e.target.value)}
                />
                <span className="room-radio-card__body">
                  <span className="room-radio-card__title">Đang có khách</span>
                  <span className="room-radio-card__desc">Phòng hiện đang có khách lưu trú</span>
                </span>
              </label>

              <label className="room-radio-card">
                <input
                  type="radio"
                  name="status_cd"
                  value="MAINTENANCE"
                  checked={statusCd === 'MAINTENANCE'}
                  onChange={(e) => setStatusCd(e.target.value)}
                />
                <span className="room-radio-card__body">
                  <span className="room-radio-card__title">Bảo trì kỹ thuật</span>
                  <span className="room-radio-card__desc">Tạm ngưng đón khách để sửa chữa / dọn dẹp</span>
                </span>
              </label>

              <label className="room-radio-card">
                <input
                  type="radio"
                  name="status_cd"
                  value="LOCKED"
                  checked={statusCd === 'LOCKED'}
                  onChange={(e) => setStatusCd(e.target.value)}
                />
                <span className="room-radio-card__body">
                  <span className="room-radio-card__title">Tạm khóa</span>
                  <span className="room-radio-card__desc">Khóa bán theo chỉ đạo quản lý</span>
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="room-form-modal__footer">
            <button
              type="button"
              className="room-form-btn room-form-btn--cancel"
              onClick={onClose}
              disabled={saving}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="room-form-btn room-form-btn--submit"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Thêm phòng mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomFormModal;
