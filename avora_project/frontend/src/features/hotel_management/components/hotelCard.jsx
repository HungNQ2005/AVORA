import React from 'react';
import { Link } from 'react-router-dom';
import HotelThumb from './hotelThumb';
import './hotelThumb.css';
import './hotelCard.css';

const HotelCard = ({ hotel, onEdit, onDelete, onApprove, onRestore, canApprove, isVendor }) => {
  const location = [hotel.city_name, hotel.ward_name].filter(Boolean).join(' · ') || hotel.address;
  const isPending = hotel.status_cd === 'PENDING';
  const status = hotel.is_deleted ? 'Đã xóa' : (hotel.status_name || (isPending ? 'Chờ duyệt' : 'Đang hoạt động'));
  const statusClass = hotel.is_deleted ? 'deleted' : (isPending ? 'pending' : 'active');
  const ownerName = hotel.owner?.full_name || hotel.owner_name || 'Chưa gán';
  const ownerPhone = hotel.owner?.phone || hotel.owner_phone || 'Chưa có số điện thoại';
  const ownerEmail = hotel.owner?.email || hotel.owner_email || 'Chưa có email';
  const vendorCanDelete = isVendor && !hotel.is_deleted;
  const staffCanDelete = canApprove && !hotel.is_deleted;
  const detailHref = `/dashboard/hotel-management/${encodeURIComponent(hotel.hotel_id)}`;

  return (
    <article className="hotel-card hotel-card--row">
      <Link to={detailHref} className="hotel-card__thumb-link" aria-label={`Xem chi tiết ${hotel.name}`}>
        <HotelThumb src={hotel.thumbnail_url} alt={hotel.name} className="hotel-card__row-thumb" iconSize={34} />
      </Link>

      <div className="hotel-card__body">
        <div className="hotel-card__topline">
          <span className="hotel-card__id">ID {hotel.hotel_id}</span>
          <span className={`hotel-card__status hotel-card__status--${statusClass}`}>{status}</span>
        </div>
        <Link className="hotel-card__title" to={detailHref}>{hotel.name}</Link>
        <p className="hotel-card__location"><span aria-hidden="true">⌖</span>{location}</p>
        <div className="hotel-card__facts">
          <span className="hotel-card__stars" aria-label={`Hạng ${hotel.star_rating || 0} sao`}>
            {'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_rating) || 0)))}
            <span>{hotel.star_rating || '—'} sao</span>
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
        {canApprove && hotel.is_deleted && (
          <button type="button" className="hotel-card__approve" onClick={onRestore} aria-label={`Khôi phục ${hotel.name}`}>Khôi phục</button>
        )}
        {canApprove && !hotel.is_deleted && isPending && (
          <button type="button" className="hotel-card__approve" onClick={onApprove} aria-label={`Duyệt ${hotel.name}`}>Phê duyệt</button>
        )}
        {!hotel.is_deleted && (
          <button type="button" onClick={onEdit} aria-label={`Sửa ${hotel.name}`}>Sửa</button>
        )}
        {(vendorCanDelete || staffCanDelete) && (
          <button type="button" className="hotel-card__delete" onClick={onDelete} aria-label={`Xóa ${hotel.name}`}>Xóa</button>
        )}
      </div>
    </article>
  );
};

export default HotelCard;


