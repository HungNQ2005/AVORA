import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Dialog from '../../../common/components/Dialog';
import EditHotelPopup from '../components/editHotelPopup';
import { deleteHotel, getHotel, publishHotel, updateHotel } from '../../../services/hotelManagementService';
import './hotelDetailPage.css';

const HotelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    getHotel(id)
      .then((result) => { if (active) setHotel(result); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Could not load this hotel.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleUpdate = async (payload) => {
    const updated = await updateHotel(id, payload);
    setHotel(updated);
    setEditOpen(false);
    setToast('Hotel details saved.');
  };

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      const published = await publishHotel(id);
      setHotel(published);
      setToast('Hotel published.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not publish this hotel.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteHotel(id);
      navigate('/hotel-management', { replace: true, state: { notice: 'Hotel removed.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Hotel could not be deleted.');
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="hotel-detail-state" role="status"><span className="hotel-spinner" />Loading hotel details</div>;
  if (error && !hotel) {
    return <section className="hotel-detail-state hotel-detail-state--error"><p role="alert">{error}</p><Link to="/hotel-management">Back to hotels</Link></section>;
  }
  if (!hotel) return null;

  const status = String(hotel.status_name || hotel.status_cd || 'Unknown').replaceAll('_', ' ');
  const addressParts = [hotel.address, hotel.ward_name, hotel.district_name, hotel.city_name].filter(Boolean);

  return (
    <section className="hotel-detail">
      <Link className="hotel-detail__back" to="/hotel-management">← All hotels</Link>
      {error && <div className="hotel-notice hotel-notice--error" role="alert">{error}</div>}
      <header className="hotel-detail__header">
        <div>
          <p className="hotel-detail__eyebrow">HOTEL ID · {hotel.hotel_id}</p>
          <h1>{hotel.name}</h1>
          <p className="hotel-detail__location">{addressParts.join(', ') || 'Location not set'}</p>
        </div>
        <div className="hotel-detail__actions">
          {hotel.status_cd === 'DRAFT' && <button type="button" className="hotel-button hotel-button--primary" onClick={handlePublish} disabled={actionLoading}>{actionLoading ? 'Publishing…' : 'Publish hotel'}</button>}
          <button type="button" className="hotel-button hotel-button--quiet" onClick={() => setEditOpen(true)}>Edit</button>
          <button type="button" className="hotel-button hotel-button--danger" onClick={() => setDeleteOpen(true)}>Delete</button>
        </div>
      </header>

      <div className="hotel-detail__status-line">
        <span className={`hotel-detail__status hotel-detail__status--${String(hotel.status_cd || '').toLowerCase()}`}>{status}</span>
        <span className="hotel-detail__rating"><b aria-hidden="true">{'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_rating) || 0)))}</b> {hotel.star_rating || '—'} star rating</span>
      </div>

      <div className="hotel-detail__columns">
        <section className="hotel-detail__panel hotel-detail__overview">
          <h2>Property information</h2>
          <dl>
            <div><dt>Hotel ID</dt><dd>{hotel.hotel_id}</dd></div>
            <div><dt>Address</dt><dd>{addressParts.join(', ') || 'Not provided'}</dd></div>
            <div><dt>City ID</dt><dd>{hotel.city_id || '—'}</dd></div>
            <div><dt>District ID</dt><dd>{hotel.district_id || '—'}</dd></div>
            <div><dt>Ward ID</dt><dd>{hotel.ward_id || '—'}</dd></div>
            <div><dt>Room inventory</dt><dd>{hotel.room_count ?? 0} rooms</dd></div>
          </dl>
        </section>
        <section className="hotel-detail__panel hotel-detail__coordinates">
          <h2>Coordinates</h2>
          <div className="hotel-detail__coordinate-grid">
            <div><span>LATITUDE</span><strong>{hotel.lat ?? '—'}</strong></div>
            <div><span>LONGITUDE</span><strong>{hotel.lng ?? '—'}</strong></div>
          </div>
          <a href={`https://www.google.com/maps?q=${encodeURIComponent(`${hotel.lat},${hotel.lng}`)}`} target="_blank" rel="noreferrer">Open coordinates in map ↗</a>
        </section>
        <section className="hotel-detail__panel hotel-detail__description">
          <h2>Description</h2>
          <p>{hotel.description || 'No description provided.'}</p>
        </section>
      </div>

      {toast && <div className="hotel-toast" role="status">{toast}</div>}
      {editOpen && <EditHotelPopup isOpen mode="edit" hotel={hotel} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} />}
      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this hotel?"
        message={error || `“${hotel.name}” will be soft-deleted. Hotels with active bookings or occupied/reserved rooms cannot be deleted.`}
        variant="confirm"
        confirmLabel={actionLoading ? 'Deleting…' : 'Delete hotel'}
      />
    </section>
  );
};

export default HotelDetailPage;
