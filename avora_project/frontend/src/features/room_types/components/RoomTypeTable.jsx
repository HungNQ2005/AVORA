import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomTypeTable.css';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

// Compute dynamic tag
const getCategoryTag = (rt) => {
  const name = rt?.type_name?.toLowerCase() || '';
  if (name.includes('president')) {
    return { text: 'PRESIDENTIAL', className: 'tag--presidential' };
  }
  if (name.includes('suite') || name.includes('executive')) {
    return { text: 'EXECUTIVE', className: 'tag--executive' };
  }
  if (name.includes('villa') || rt.booking_count > 0) {
    return { text: 'BEST SELLER', className: 'tag--bestseller' };
  }
  return null;
};

const RoomTypeTable = ({
  roomTypes,
  onToggleStatus,
  onEditClick,
  onDeleteClick,
}) => {
  const navigate = useNavigate();

  if (!roomTypes || roomTypes.length === 0) {
    return (
      <div className="rt-table-empty">
        <div className="rt-table-empty__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path>
          </svg>
        </div>
        <h3 className="rt-table-empty__title">Chưa có loại phòng nào phù hợp</h3>
        <p className="rt-table-empty__desc">
          Vui lòng thử thay đổi từ khóa tìm kiếm hoặc cơ sở lưu trú được chọn.
        </p>
      </div>
    );
  }

  return (
    <div className="rt-table-container">
      <table className="rt-table">
        <thead>
          <tr>
            <th className="col-room">HẠNG PHÒNG & HÌNH ẢNH</th>
            <th className="col-size">DIỆN TÍCH & CẤU TRÚC</th>
            <th className="col-capacity">SỨC CHỨA & GIƯỜNG</th>
            <th className="col-count">SỐ BUỒNG</th>
            <th className="col-price">GIÁ NIÊM YẾT / ĐÊM</th>
            <th className="col-amenities">TIỆN NGHI ĐẶC QUYỀN</th>
            {/* // <th className="col-status">TRẠNG THÁI</th> */}
            <th className="col-actions">THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          {roomTypes.map((rt) => {
            const tag = getCategoryTag(rt);
            const image = rt.hotel_image_url;
            const isAvailable = rt.available_rooms > 0;
            // const extraBedAllowed = rt.max_adults >= 2;

            return (
              <tr
                key={rt.room_type_id}
                className="rt-table__row"
                onClick={() => navigate(`/admin/room-types/${rt.room_type_id}`)}
                title="Nhấp để xem chi tiết hạng phòng"
              >
                {/* 1. HẠNG PHÒNG & HÌNH ẢNH */}
                <td className="col-room">
                  <div className="rt-room-cell">
                    <div className="rt-room-thumb">
                      {image && (
                        <img
                          src={image}
                          alt={rt.type_name}
                          loading="lazy"
                        />
                      )}
                      <span className="rt-room-thumb__badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px', verticalAlign: '-1px' }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        Khách sạn
                      </span>
                    </div>
                    <div className="rt-room-meta">
                      {tag && (
                        <span className={`rt-category-tag ${tag.className}`}>
                          {tag.text}
                        </span>
                      )}
                      <h4 className="rt-room-name">{rt.type_name}</h4>
                      <span className="rt-room-sku">{rt.sku}</span>
                      {rt.m_hotel?.name && (
                        <span className="rt-room-hotel">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: '-1px' }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {rt.m_hotel.name}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* 2. DIỆN TÍCH & CẤU TRÚC */}
                <td className="col-size">
                  <div className="rt-size-cell">
                    <span className="rt-size-val">{rt.room_size || 'Chưa cập nhật'}</span>
                    <span className="rt-size-sub">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rt-cell-icon" style={{ marginRight: '4px', verticalAlign: '-1px', color: '#0ea5e9' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      Diện tích phòng
                    </span>
                    {/* <span className="rt-size-detail">Tầng 2 - 5 tòa tháp</span> */}
                  </div>
                </td>

                {/* 3. SỨC CHỨA & GIƯỜNG */}
                <td className="col-capacity">
                  <div className="rt-capacity-cell">
                    <span className="rt-capacity-people">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rt-cell-icon">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <span>{rt.max_adults} Người lớn • {rt.max_children} Trẻ em</span>
                    </span>
                    <span className="rt-capacity-bed">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rt-cell-icon">
                        <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path>
                      </svg>
                      <span>{rt.bed_type || 'Chưa cập nhật'}</span>
                    </span>
                    {/* {extraBedAllowed ? (
                      <span className="rt-extra-bed rt-extra-bed--allowed">
                        • Cho phép kê 1 Extra-bed
                      </span>
                    ) : (
                      <span className="rt-extra-bed rt-extra-bed--none">
                        Không hỗ trợ extra-bed
                      </span>
                    )} */}
                  </div>
                </td>

                {/* 4. SỐ BUỒNG */}
                <td className="col-count">
                  <div className="rt-count-cell">
                    <span className="rt-count-val">
                      {rt.room_count < 10 ? `0${rt.room_count}` : rt.room_count}
                    </span>
                    <span
                      className={`rt-count-sub ${isAvailable ? 'rt-count-sub--green' : 'rt-count-sub--occupied'
                        }`}
                    >
                      {`${rt.available_rooms || 0} phòng trống`}
                    </span>
                  </div>
                </td>

                {/* 5. GIÁ NIÊM YẾT / ĐÊM */}
                <td className="col-price">
                  <div className="rt-price-cell">
                    <span className="rt-price-val">
                      {formatCurrency(rt.default_price)}
                    </span>

                  </div>
                </td>

                {/* 6. TIỆN NGHI ĐẶC QUYỀN */}
                <td className="col-amenities">
                  <div className="rt-amenities-cell">
                    {rt.facilities && rt.facilities.length > 0 ? (
                      rt.facilities.slice(0, 3).map((f, idx) => (
                        <span key={idx} className="rt-amenity-tag">
                          {f.facility_name}
                        </span>
                      ))
                    ) : (
                      <span className="rt-amenity-tag">Chưa có tiện nghi</span>
                    )}
                    {rt.facilities?.length > 3 && (
                      <span className="rt-amenity-tag rt-amenity-tag--more">
                        +{rt.facilities.length - 3} tiện nghi
                      </span>
                    )}
                  </div>
                </td>

                {/* 7. TRẠNG THÁI */}
                {/* <td
                  className="col-status"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rt-status-cell">
                    <label className="rt-switch" title="Chuyển đổi trạng thái mở bán">
                      <input
                        type="checkbox"
                        checked={!rt.is_deleted}
                        onChange={() => onToggleStatus && onToggleStatus(rt)}
                      />
                      <span className="rt-slider round"></span>
                    </label>
                    <span className="rt-status-label">
                      {!rt.is_deleted ? 'Đang mở bán' : 'Đã dừng bán'}
                    </span>
                  </div>
                </td> */}

                {/* 8. THAO TÁC */}
                <td
                  className="col-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rt-actions-cell">
                    <button
                      className="rt-action-btn rt-action-btn--edit"
                      onClick={() => onEditClick && onEditClick(rt)}
                      title="Chỉnh sửa hạng phòng"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="rt-action-btn rt-action-btn--view"
                      onClick={() => navigate(`/admin/room-types/${rt.room_type_id}`)}
                      title="Xem chi tiết & Cấu hình hạng phòng"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button
                      className="rt-action-btn rt-action-btn--delete"
                      onClick={() => onDeleteClick && onDeleteClick(rt)}
                      title="Xóa / Lưu trữ"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RoomTypeTable;
