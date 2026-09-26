import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchRoomTypeById,
  softDeleteRoomType,
} from './services/roomTypeApi';
import RoomTypeDeleteModal from './components/RoomTypeDeleteModal';
import './RoomTypeDetailPage.css';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

const RoomTypeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRoomTypeById(id);
        if (isMounted) {
          setRoomType(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải dữ liệu chi tiết hạng phòng.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadDetail();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDeleteRoomType = async () => {
    setDeleting(true);
    setActionError('');
    try {
      await softDeleteRoomType(id);
      navigate('/admin/room-types');
    } catch (err) {
      setActionError(err.message || 'Không thể xóa hạng phòng.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rtd-state-container">
        <div className="rtd-spinner"></div>
        <p className="rtd-state-text">Đang tải chi tiết hạng phòng từ hệ thống...</p>
      </div>
    );
  }

  if (error || !roomType) {
    return (
      <div className="rtd-state-container rtd-state-container--error">
        <div className="rtd-state-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 className="rtd-state-title">Không thể tải dữ liệu</h3>
        <p className="rtd-state-desc">{error || 'Không tìm thấy hạng phòng yêu cầu.'}</p>
        <button
          className="rtd-back-btn"
          onClick={() => navigate('/admin/room-types')}
        >
          ← Quay lại danh mục hạng phòng
        </button>
      </div>
    );
  }

  const hotel = roomType.m_hotel;
  const rooms = roomType.rooms || [];
  const facilities = roomType.facilities || [];
  const inventory = roomType.inventory || [];

  return (
    <div className="rtd-page">
      {/* Breadcrumb Navigation */}
      <nav className="rtd-breadcrumb">
        <Link to="/admin" className="rtd-breadcrumb__link">
          Tổng quan
        </Link>
        <span className="rtd-breadcrumb__sep">/</span>
        <Link to="/admin/room-types" className="rtd-breadcrumb__link">
          Quản lý loại phòng
        </Link>
        <span className="rtd-breadcrumb__sep">/</span>
        <span className="rtd-breadcrumb__current">{roomType.type_name}</span>
      </nav>

      {/* Header bar */}
      <div className="rtd-header">
        <div className="rtd-header__left">
          <button
            className="rtd-back-nav-btn"
            onClick={() => navigate('/admin/room-types')}
            title="Quay lại danh sách"
          >
            ←
          </button>
          <div>
            <div className="rtd-header__title-row">
              <h1 className="rtd-header__title">{roomType.type_name}</h1>
              <span className="rtd-badge rtd-badge--active">
                {roomType.is_deleted ? 'Đã dừng bán' : 'Đang mở bán'}
              </span>
              <span className="rtd-badge rtd-badge--sku">{roomType.sku}</span>
            </div>
            {hotel && (
              <p className="rtd-header__subtitle">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: '-1px' }}>
                  <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                </svg>
                Cơ sở: <strong>{hotel.name}</strong> •{' '}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: '-1px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {hotel.address}
              </p>
            )}
          </div>
        </div>

        <div className="rtd-header__actions">
          <RoomTypeDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteRoomType}
            roomTypeName={roomType.type_name}
            deleting={deleting}
            error={actionError}
          />
        </div>
      </div>

      {/* Main Content 2-Columns Grid */}
      <div className="rtd-grid">
        {/* LEFT COLUMN: Thông tin cơ bản & Tiện nghi */}
        <div className="rtd-col rtd-col--left">
          {/* Card: Thông số kỹ thuật & Giá */}
          <section className="rtd-card">
            <h2 className="rtd-card__title">Thông số kỹ thuật & Cấu hình giá</h2>
            <div className="rtd-spec-grid">
              <div className="rtd-spec-item">
                <span className="rtd-spec-label">Giá niêm yết tiêu chuẩn</span>
                <span className="rtd-spec-val rtd-spec-val--price">
                  {formatCurrency(roomType.default_price)}
                </span>
                <span className="rtd-spec-sub">Đã gồm thuế VAT & phí dịch vụ</span>
              </div>

              <div className="rtd-spec-item">
                <span className="rtd-spec-label">Diện tích sàn</span>
                <span className="rtd-spec-val">{roomType.room_size || '35 m²'}</span>
                <span className="rtd-spec-sub">Không gian thông thủy</span>
              </div>

              <div className="rtd-spec-item">
                <span className="rtd-spec-label">Cấu trúc giường</span>
                <span className="rtd-spec-val">{roomType.bed_type || '1 King Bed'}</span>
                <span className="rtd-spec-sub">Đệm lò xo túi cao cấp</span>
              </div>

              <div className="rtd-spec-item">
                <span className="rtd-spec-label">Sức chứa tối đa</span>
                <span className="rtd-spec-val">
                  {roomType.max_adults} Người lớn, {roomType.max_children} Trẻ em
                </span>
                <span className="rtd-spec-sub">Phù hợp kỳ nghỉ gia đình & cặp đôi</span>
              </div>
            </div>

            <div className="rtd-policy-box">
              <h4 className="rtd-policy-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: '-1px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Chính sách Extra-bed & Giường phụ:
              </h4>
              <p className="rtd-policy-text">
                {roomType.max_adults >= 2
                  ? 'Cho phép kê thêm 01 giường phụ (Extra-bed) với phụ phí niêm yết tại quầy lễ tân.'
                  : 'Hạng phòng tiêu chuẩn không áp dụng chính sách giường phụ bổ sung.'}
              </p>
            </div>
          </section>

          {/* Card: Tiện nghi đặc quyền */}
          <section className="rtd-card">
            <div className="rtd-card__header-flex">
              <h2 className="rtd-card__title">Tiện nghi & Dịch vụ liên kết</h2>
              <span className="rtd-tag-count">{facilities.length} tiện nghi</span>
            </div>
            {facilities.length > 0 ? (
              <div className="rtd-facilities-list">
                {facilities.map((fac) => (
                  <div key={fac.facility_id} className="rtd-facility-chip">
                    <span className="rtd-facility-chip__icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </span>
                    <span className="rtd-facility-chip__name">{fac.facility_name}</span>
                    <span className="rtd-facility-chip__type">{fac.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rtd-empty-text">
                Chưa có tiện nghi được gán.
              </div>
            )}
          </section>

          {/* Card: Cơ sở lưu trú quản lý */}
          {hotel && (
            <section className="rtd-card">
              <h2 className="rtd-card__title">Khách sạn quản lý</h2>
              <div className="rtd-hotel-card-preview">
                <img
                  src={roomType.hotel_image_url}
                  alt={hotel.name}
                  className="rtd-hotel-card-img"
                />
                <span className="rtd-hotel-card-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: '-1px' }}>
                    <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                  </svg>
                  Ảnh cơ sở lưu trú
                </span>
              </div>
              <div className="rtd-hotel-info">
                <h3 className="rtd-hotel-name">{hotel.name}</h3>
                <p className="rtd-hotel-rating">
                  {Array.from({ length: Math.round(hotel.star_rating || 5) }).map((_, i) => (
                    <span key={i} style={{ color: '#f59e0b', marginRight: '2px' }}>★</span>
                  ))}
                  {' '}({hotel.star_rating} sao tiêu chuẩn)
                </p>
                <p className="rtd-hotel-address">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: '-1px' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {hotel.address}
                </p>
                {hotel.description && (
                  <p className="rtd-hotel-desc">{hotel.description}</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Buồng phòng vật lý & Tồn kho */}
        <div className="rtd-col rtd-col--right">
          {/* Card: Danh sách buồng phòng vật lý (m_room) */}
          <section className="rtd-card">
            <div className="rtd-card__header-flex">
              <h2 className="rtd-card__title">Buồng phòng thực tế liên kết </h2>
              <span className="rtd-tag-count">{rooms.length} buồng</span>
            </div>
            {rooms.length > 0 ? (
              <div className="rtd-rooms-table-wrap">
                <table className="rtd-subtable">
                  <thead>
                    <tr>
                      <th>Số phòng</th>
                      <th>Vị trí tầng</th>
                      <th>Trạng thái buồng</th>
                      <th>Ngày cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr key={r.room_id}>
                        <td className="rtd-room-num">Phòng {r.room_number}</td>
                        <td>{r.floor || 'Tầng 1'}</td>
                        <td>
                          <span
                            className={`rtd-room-status ${r.status_cd === 'AVAILABLE'
                              ? 'rtd-room-status--avail'
                              : 'rtd-room-status--busy'
                              }`}
                          >
                            {r.status_cd === 'AVAILABLE' ? 'Sẵn sàng đón khách' : r.status_cd}
                          </span>
                        </td>
                        <td className="rtd-date-cell">
                          {new Date(r.updated_at || r.created_at).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rtd-empty-text">
                Chưa có buồng phòng vật lý nào được liên kết trong cơ sở dữ liệu.
              </div>
            )}
          </section>

          {/* Card: Tồn kho & Giá theo ngày  */}
          <section className="rtd-card">
            <div className="rtd-card__header-flex">
              <h2 className="rtd-card__title">Lịch tồn kho & Giá theo ngày</h2>
              <span className="rtd-tag-count">{inventory.length} bản ghi</span>
            </div>
            {inventory.length > 0 ? (
              <div className="rtd-inventory-table-wrap">
                <table className="rtd-subtable">
                  <thead>
                    <tr>
                      <th>Ngày áp dụng</th>
                      <th>Phòng trống</th>
                      <th>Đã khóa</th>
                      <th>Giá theo ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((inv) => (
                      <tr key={inv.inventory_id}>
                        <td>{inv.target_date}</td>
                        <td className="rtd-num-avail">{inv.available_rooms}</td>
                        <td>{inv.locked_rooms}</td>
                        <td className="rtd-num-price">{formatCurrency(inv.current_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rtd-empty-text">
                Chưa có cấu hình tồn kho theo ngày. Hạng phòng đang áp dụng giá niêm yết mặc định.
              </div>
            )}
          </section>

          {/* Card: Thông tin cơ sở dữ liệu & Kiểm toán */}
          <section className="rtd-card rtd-card--muted">
            <h2 className="rtd-card__title">Thông tin hệ thống & Kiểm toán</h2>
            <div className="rtd-audit-list">

              <div className="rtd-audit-item">
                <span className="rtd-audit-label">Ngày khởi tạo:</span>
                <span>{new Date(roomType.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="rtd-audit-item">
                <span className="rtd-audit-label">Cập nhật lần cuối:</span>
                <span>{new Date(roomType.updated_at).toLocaleString('vi-VN')}</span>
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RoomTypeDetailPage;
