import React from 'react';
import { Link } from 'react-router-dom';
import './hotelCard.css';

const HotelCard = ({ hotel, onEdit, onDelete, onApprove, canApprove }) => {
  const location = [hotel.city_name, hotel.ward_name].filter(Boolean).join(' · ') || hotel.address;
  const status = String(hotel.status_name || hotel.status_cd || 'Unknown');
  const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ownerName = hotel.owner?.full_name || hotel.owner_name || 'Unassigned';
  const ownerPhone = hotel.owner?.phone || hotel.owner_phone || 'No phone';
  const ownerEmail = hotel.owner?.email || hotel.owner_email || 'No email';

  return (
    <article className="hotel-card">
      <div className="hotel-card__topline">
        <span className="hotel-card__id">ID {hotel.hotel_id}</span>
        <span className={`hotel-card__status hotel-card__status--${statusClass}`}>{status.replaceAll('_', ' ')}</span>
      </div>
      <Link className="hotel-card__title" to={`/hotel-management/${encodeURIComponent(hotel.hotel_id)}`}>
        {hotel.name}
      </Link>
      <p className="hotel-card__location"><span aria-hidden="true">⌖</span>{location}</p>
      <div className="hotel-card__facts">
        <span className="hotel-card__stars" aria-label={`${hotel.star_rating || 0} star rating`}>
          {'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_rating) || 0)))}
          <span>{hotel.star_rating || '—'} stars</span>
        </span>
        <span>{hotel.total_rooms ?? hotel.room_count ?? 0} rooms</span>
      </div>
      <div className="hotel-card__owner">
        <span className="hotel-card__owner-label">OWNER</span>
        <strong>{ownerName}</strong>
        <span>{ownerPhone}</span>
        <span className="hotel-card__owner-email" title={ownerEmail}>{ownerEmail}</span>
      </div>
      <div className="hotel-card__actions">
        <Link to={`/hotel-management/${encodeURIComponent(hotel.hotel_id)}`} className="hotel-card__details">View details <span aria-hidden="true">→</span></Link>
        {canApprove && hotel.is_deleted ? (
          <button type="button" className="hotel-card__approve" onClick={onApprove} aria-label={`Approve or restore ${hotel.name}`}>Approve / Restore</button>
        ) : (
          <>
            <button type="button" onClick={onEdit} aria-label={`Edit ${hotel.name}`}>Edit</button>
            <button type="button" className="hotel-card__delete" onClick={onDelete} aria-label={`Delete ${hotel.name}`}>Delete</button>
          </>
        )}
      </div>
    </article>
  );
};

export default HotelCard;
