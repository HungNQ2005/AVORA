import React from 'react';
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
              Phòng {room.room_number} • {rt.type_name || 'Phòng tiêu chuẩn'}
            </h3>
            <span className="room-detail-modal__sku">{room.sku || `SKU-${room.room_number}`}</span>
          </div>
          <button type="button" className="room-detail-modal__close" onClick={onClose}>
            ×
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
              <span className="room-detail-val">{rt.room_size || '35 m²'}</span>
            </div>

            <div className="room-detail-item">
              <span className="room-detail-label">Sức chứa tối đa</span>
              <span className="room-detail-val">
                {rt.max_adults || 2} Người lớn • {rt.max_children || 0} Trẻ em
              </span>
            </div>

            <div className="room-detail-item room-detail-item--full">
              <span className="room-detail-label">Quy cách giường ngủ</span>
              <span className="room-detail-val">{rt.bed_type || '1 x King Size Bed'}</span>
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Chỉnh sửa buồng phòng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
