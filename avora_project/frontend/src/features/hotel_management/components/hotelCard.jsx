import React from 'react';
import { Link } from 'react-router-dom';
import { codeNameParser } from '../../../utils/codeNameParser';
import HotelThumb from './hotelThumb';
import './hotelThumb.css';
import './hotelCard.css';

const HotelCard = ({ hotel, onEdit, onDelete, onApprove, onReactivate, canApprove, canEdit, isVendor }) => {
  const location = [hotel.city_name, hotel.ward_name].filter(Boolean).join(' · ') || hotel.address;
  const isPending = hotel.status_cd === 'PENDING';
  const isInactive = hotel.status_cd === 'INACTIVE';
  const status = hotel.is_deleted
    ? 'Lịch sử đã xóa'
    : (hotel.status_name || ({ PENDING: 'Chờ duyệt', ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động' }[hotel.status_cd] || codeNameParser(hotel.status_cd)));
  const statusClass = hotel.is_deleted ? 'deleted' : (isInactive ? 'inactive' : (isPending ? 'pending' : 'active'));
  const ownerName = hotel.owner?.full_name || hotel.owner_name || 'Chưa gán';
  const ownerPhone = hotel.owner?.phone || hotel.owner_phone || 'Chưa có số điện thoại';
  const ownerEmail = hotel.owner?.email || hotel.owner_email || 'Chưa có email';
  const vendorCanDeactivate = isVendor && !hotel.is_deleted && !isInactive;
  const detailHref = `/dashboard/hotel-management/${encodeURIComponent(hotel.hotel_id)}`;

  return (
    <article className="hotel-card hotel-card--row">
      <Link to={detailHref} className="hotel-card__thumb-link" aria-label={`Xem chi tiết ${hotel.name}`}>
        <HotelThumb src={hotel.thumbnail_url} alt={hotel.name} className="hotel-card__row-thumb" iconSize={34} />
      </Link>

      <div className="hotel-card__body">
        <div className="hotel-card__topline">
          <span className="hotel-card__id">Mã {hotel.hotel_id}</span>
          <span className={`hotel-card__status hotel-card__status--${statusClass}`}>{status}</span>
        </div>
        <Link className="hotel-card__title" to={detailHref}>{hotel.name}</Link>
        <p className="hotel-card__location"><span aria-hidden="true">⌖</span>{location}</p>
        <div className="hotel-card__facts">
          <span className="hotel-card__stars" aria-label={`Hạng ${hotel.star_quality || 0} sao`}>
            {'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_quality) || 0)))}
            <span>{hotel.star_quality || '—'} sao</span>
          </span>
          <span>{hotel.total_rooms ?? hotel.room_count ?? 0} phòng</span>
        </div>
        <div className="hotel-card__owner hotel-card__owner--inline">
          <span className="hotel-card__owner-label">CHỦ SỞ HỮU</span>
          <strong>{ownerName}</strong>
          <span>{ownerPhone}</span>
          <span className="hotel-card__owner-email" title={ownerEmail}>{ownerEmail}</span>
        </div>
      </div>

      <div className="hotel-card__actions hotel-card__actions--column">
        <Link to={detailHref} className="hotel-card__details">Xem chi tiết <span aria-hidden="true">→</span></Link>
        {canApprove && !hotel.is_deleted && isPending && (
          <button type="button" className="hotel-card__approve" onClick={onApprove} aria-label={`Duyệt ${hotel.name}`}>Phê duyệt</button>
        )}
        {isVendor && !hotel.is_deleted && isInactive && (
          <button type="button" className="hotel-card__approve" onClick={onReactivate} aria-label={`Yêu cầu mở lại ${hotel.name}`}>Yêu cầu mở lại</button>
        )}
        {canEdit && !hotel.is_deleted && (
          <button type="button" onClick={onEdit} aria-label={`Sửa ${hotel.name}`}>Sửa</button>
        )}
        {vendorCanDeactivate && (
          <button type="button" className="hotel-card__delete" onClick={onDelete} aria-label={`Ngừng hoạt động ${hotel.name}`}>Ngừng hoạt động</button>
        )}
      </div>
    </article>
  );
};

export default HotelCard;


