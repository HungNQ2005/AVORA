import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Dialog from '../../../common/components/Dialog';
import HotelDeleteOtpModal from '../components/hotelDeleteOtpModal';
import { useAuth } from '../../../context/AuthContext';
import { approveHotel, deleteHotel, getHotel, getVendors, requestHotelDeleteOtp, updateHotel } from '../../../services/hotelManagementService';
import './hotelDetailPage.css';

const toHotelForm = (hotel) => ({
  name: hotel.name || '',
  description: hotel.description || '',
  address: hotel.address || '',
  city_id: hotel.city_id || '',
  district_id: hotel.district_id || '',
  ward_id: hotel.ward_id || '',
  star_rating: hotel.star_rating ?? '',
  lat: hotel.lat ?? '',
  lng: hotel.lng ?? '',
  owner_id: hotel.owner_id || '',
});

const HotelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorsError, setVendorsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [otpDeleteOpen, setOtpDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');
  const role = String(user?.role_code_name || user?.role_cd || '').trim().toUpperCase();
  const isVendor = ['VEN', 'VENDOR'].includes(role);
  const canApprove = ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN', 'BMR', 'BUSINESS_MANAGER'].includes(role);

  useEffect(() => {
    if (!canApprove) return;
    let active = true;
    getVendors()
      .then((records) => { if (active) setVendors(records); })
      .catch((err) => { if (active) setVendorsError(err.response?.data?.message || 'Could not load Vendor accounts.'); });
    return () => { active = false; };
  }, [canApprove]);

  useEffect(() => {
    let active = true;
    getHotel(id)
      .then((result) => {
        if (!active) return;
        setHotel(result);
        setForm(toHotelForm(result));
      })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Could not load this hotel.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form?.name.trim() || !form?.address.trim()) {
      setError('Hotel name and address are required.');
      return;
    }

    const latitude = form.lat === '' ? undefined : Number(form.lat);
    const longitude = form.lng === '' ? undefined : Number(form.lng);
    const stars = Number(form.star_rating);
    if ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
      || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      setError('Enter valid coordinates when provided and a whole-number star rating from 1 to 5.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city_id: form.city_id.trim() || null,
        district_id: form.district_id.trim() || null,
        ward_id: form.ward_id.trim() || null,
        star_rating: stars,
      };
      if (latitude !== undefined) payload.lat = latitude;
      if (longitude !== undefined) payload.lng = longitude;
      if (canApprove && form.owner_id !== hotel.owner_id && form.owner_id) payload.owner_id = form.owner_id;

      const updated = await updateHotel(id, payload);
      setHotel(updated);
      setForm(toHotelForm(updated));
      setToast('Hotel details saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save hotel details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelChanges = () => {
    setForm(toHotelForm(hotel));
    setError('');
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const restored = await approveHotel(id);
      setHotel(restored);
      setForm(toHotelForm(restored));
      setToast('Hotel approved/restored.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve or restore this hotel.');
    } finally {
      setActionLoading(false);
    }
  };

  const requestDelete = async () => {
    setError('');
    if (isVendor) {
      setActionLoading(true);
      try {
        await requestHotelDeleteOtp(id);
        setOtpDeleteOpen(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not send the deletion OTP.');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    setDeleteOpen(true);
  };

  const handleDelete = async (otp) => {
    setActionLoading(true);
    try {
      await deleteHotel(id, otp);
      navigate('/hotel-management', { replace: true, state: { notice: 'Hotel removed.' } });
    } catch (err) {
      if (isVendor) throw err;
      setError(err.response?.data?.message || 'Hotel could not be deleted.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="hotel-detail-state" role="status"><span className="hotel-spinner" />Loading hotel details</div>;
  if (error && !hotel) {
    return <section className="hotel-detail-state hotel-detail-state--error"><p role="alert">{error}</p><Link to="/hotel-management">Back to hotels</Link></section>;
  }
  if (!hotel) return null;

  const status = hotel.is_deleted ? 'Pending Approval / Soft Deleted' : 'Active';
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
          {canApprove && hotel.is_deleted && <button type="button" className="hotel-button hotel-button--primary" onClick={handleApprove} disabled={actionLoading}>{actionLoading ? 'Approving…' : 'Approve / Restore'}</button>}
          {!hotel.is_deleted && <button type="button" className="hotel-button hotel-button--danger" onClick={requestDelete} disabled={actionLoading}>Delete</button>}
        </div>
      </header>

      <div className="hotel-detail__status-line">
        <span className={`hotel-detail__status hotel-detail__status--${hotel.is_deleted ? 'pending-approval' : 'active'}`}>{status}</span>
        <span className="hotel-detail__rating"><b aria-hidden="true">{'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_rating) || 0)))}</b> {hotel.star_rating || '—'} star rating</span>
      </div>

      <form className="hotel-detail__form" onSubmit={handleSave}>
        <div className="hotel-detail__columns">
          <section className="hotel-detail__panel hotel-detail__overview">
            <h2>Property information</h2>
            <div className="hotel-detail__field-grid">
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Hotel name</span>
                <input name="name" value={form?.name || ''} onChange={updateField} required maxLength={200} />
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Address</span>
                <input name="address" value={form?.address || ''} onChange={updateField} required maxLength={500} />
              </label>
              <label className="hotel-detail__field">
                <span>City ID</span>
                <input name="city_id" value={form?.city_id || ''} onChange={updateField} />
              </label>
              <label className="hotel-detail__field">
                <span>District ID</span>
                <input name="district_id" value={form?.district_id || ''} onChange={updateField} />
              </label>
              <label className="hotel-detail__field">
                <span>Ward ID</span>
                <input name="ward_id" value={form?.ward_id || ''} onChange={updateField} />
              </label>
              <label className="hotel-detail__field">
                <span>Star quality</span>
                <select name="star_rating" value={form?.star_rating ?? ''} onChange={updateField} required>
                  <option value="">Select rating</option>
                  {[1, 2, 3, 4, 5].map((stars) => <option value={stars} key={stars}>{stars} star{stars === 1 ? '' : 's'}</option>)}
                </select>
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Description</span>
                <textarea name="description" rows={4} value={form?.description || ''} onChange={updateField} maxLength={10000} />
              </label>
            </div>
          </section>

          <section className="hotel-detail__panel hotel-detail__coordinates">
            <h2>Location & ownership</h2>
            <div className="hotel-detail__field-grid">
              <label className="hotel-detail__field">
                <span>Latitude</span>
                <input name="lat" type="number" min="-90" max="90" step="any" value={form?.lat ?? ''} onChange={updateField} required />
              </label>
              <label className="hotel-detail__field">
                <span>Longitude</span>
                <input name="lng" type="number" min="-180" max="180" step="any" value={form?.lng ?? ''} onChange={updateField} required />
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Owner</span>
                {canApprove ? (
                  <select name="owner_id" value={form?.owner_id || ''} onChange={updateField}>
                    <option value="">Select Vendor</option>
                    {hotel.owner_id && !vendors.some((vendor) => vendor.user_id === hotel.owner_id) && (
                      <option value={hotel.owner_id}>{hotel.owner?.full_name || 'Current owner'} (current assignment)</option>
                    )}
                    {vendors.map((vendor) => <option key={vendor.user_id} value={vendor.user_id}>{vendor.full_name} · {vendor.email}</option>)}
                  </select>
                ) : (
                  <input value={hotel.owner?.full_name || hotel.owner_name || 'Unassigned'} readOnly />
                )}
              </label>
            </div>
            {vendorsError && <p className="hotel-detail__inline-error" role="alert">{vendorsError}</p>}
            {canApprove && hotel.owner && <p className="hotel-detail__owner-contact">Current owner: {hotel.owner.full_name} · {hotel.owner.phone || 'No phone'} · {hotel.owner.email}</p>}
            <p className="hotel-detail__room-total"><strong>{hotel.total_rooms ?? hotel.room_count ?? 0}</strong> physical rooms · <strong>{hotel.total_room_types ?? 0}</strong> room types</p>
            <a href={`https://www.google.com/maps?q=${encodeURIComponent(`${form?.lat},${form?.lng}`)}`} target="_blank" rel="noreferrer">Open coordinates in map ↗</a>
          </section>
        </div>

        {error && <p className="hotel-detail__form-error" role="alert">{error}</p>}
        <footer className="hotel-detail__form-actions">
          <span>Hotel ID: <code>{hotel.hotel_id}</code></span>
          <div>
            <button type="button" className="hotel-button hotel-button--quiet" onClick={handleCancelChanges} disabled={actionLoading}>Cancel</button>
            <button type="submit" className="hotel-button hotel-button--primary" disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save changes'}</button>
          </div>
        </footer>
      </form>

      {toast && <div className="hotel-toast" role="status">{toast}</div>}
      {otpDeleteOpen && <HotelDeleteOtpModal hotel={hotel} onClose={() => setOtpDeleteOpen(false)} onConfirm={handleDelete} />}
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
