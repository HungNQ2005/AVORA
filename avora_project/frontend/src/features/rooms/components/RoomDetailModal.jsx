import React from 'react';
import { CloseIcon, CheckIcon, TrashIcon, EditIcon } from '../../../common/components/icons';
import './RoomDetailModal.css';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString('vi-VN')} đ`;
};

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RoomDetailModal = ({
  isOpen,
  onClose,
  room = null,
  onEditClick,
  onDeleteClick,
}) => {
  if (!isOpen || !room) return null;

  const rt = room.m_room_type || {};
  const hotel = room.m_hotel || {};
  const isAvailable = !room.is_deleted && room.status_cd === 'AVAILABLE';

  return (
    <div className="room-detail-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="room-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="room-detail-modal__header">
          <div className="room-detail-modal__title-group">
            <span className="room-detail-modal__badge">CHI TIẾT BUỒNG PHÒNG</span>
            <h3 className="room-detail-modal__title">
              Phòng {room.room_number} • {rt.type_name || 'Chưa cập nhật'}
            </h3>
            <span className="room-detail-modal__sku">{room.sku || `SKU-${room.room_number}`}</span>
          </div>
          <button type="button" className="room-detail-modal__close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="room-detail-modal__body">
          {/* Main highlights grid */}
          <div className="room-detail-grid">
            <div className="room-detail-item">
              <span className="room-detail-label">Cơ sở khách sạn</span>
              <span className="room-detail-val room-detail-val--hotel">{hotel.name || '—'}</span>
              <span className="room-detail-hint">{hotel.address || '—'}</span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Vị trí tầng</span>
              <span className="room-detail-val">{room.floor || 'Tầng 1'}</span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Trạng thái vận hành</span>
              <span className={`room-detail-status ${isAvailable ? 'room-detail-status--available' : 'room-detail-status--locked'}`}>
                <span className="room-detail-dot"></span>
                {room.is_deleted || room.status_cd === 'LOCKED'
                  ? 'Đang tạm khóa'
                  : room.status_cd === 'OCCUPIED'
                  ? 'Đang có khách'
                  : room.status_cd === 'MAINTENANCE'
                  ? 'Đang bảo trì'
                  : 'Đang mở bán (Khả dụng)'}
              </span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Giá niêm yết tiêu chuẩn</span>
              <span className="room-detail-val room-detail-val--price">
                {formatCurrency(rt.default_price)}
                <span className="room-detail-price-note"> / đêm</span>
              </span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Diện tích không gian</span>
              <span className="room-detail-val">
                {rt.room_size
                  ? (rt.room_size.replace(/(?:\s*m(?:²|2))+\s*$/gi, '').trim()
                      ? `${rt.room_size.replace(/(?:\s*m(?:²|2))+\s*$/gi, '').trim()} m²`
                      : rt.room_size)
                  : 'Chưa cập nhật'}
              </span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Sức chứa tối đa</span>
              <span className="room-detail-val">
                {(rt.max_adults !== undefined && rt.max_adults !== null)
                  ? `${rt.max_adults} Người lớn • ${rt.max_children ?? 0} Trẻ em`
                  : 'Chưa cập nhật'}
              </span>
            </div>

            <div className="room-detail-item room-detail-item--full">
              <span className="room-detail-label">Quy cách giường ngủ</span>
              <span className="room-detail-val">{rt.bed_type || 'Chưa cập nhật'}</span>
              <span className="room-detail-hint">Hỗ trợ kê thêm tối đa 01 Extra-bed theo quy chuẩn khách sạn</span>
            </div>
          </div>

          {/* Facilities Section */}
          <div className="room-detail-facs">
            <h4 className="room-detail-section-title">Tiện nghi &amp; Trang thiết bị buồng phòng</h4>
            <div className="room-detail-facs-list">
              {room.facilities && room.facilities.length > 0 ? (
                room.facilities.map((f) => (
                  <span key={f.facility_id} className="room-detail-fac-pill">
                    <CheckIcon size={12} strokeWidth={2.5} />
                    {f.facility_name}
                  </span>
                ))
              ) : (
                <span className="room-detail-hint">Đầy đủ trang thiết bị tiện nghi theo tiêu chuẩn hạng phòng</span>
              )}
            </div>
          </div>

          {/* Meta timestamps */}
          <div className="room-detail-meta">
            <span>Ngày tạo phòng: {formatDate(room.created_at)}</span>
            <span>•</span>
            <span>Cập nhật lần cuối: {formatDate(room.updated_at)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="room-detail-modal__footer">
          <button
            type="button"
            className="room-detail-btn room-detail-btn--close"
            onClick={onClose}
          >
            Đóng
          </button>
          {onDeleteClick && (
            <button
              type="button"
              className="room-detail-btn"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                onClose();
                onDeleteClick(room);
              }}
            >
              <TrashIcon size={14} />
              Xóa phòng
            </button>
          )}
          {onEditClick && (
            <button
              type="button"
              className="room-detail-btn room-detail-btn--edit"
              onClick={() => {
                onClose();
                onEditClick(room);
              }}
            >
              <EditIcon size={14} />
              Chỉnh sửa buồng phòng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
