import React, { useState } from 'react';
import './editHotelPopup.css';

const emptyForm = {
  name: '', description: '', address: '', city_id: '', district_id: '', ward_id: '',
  lat: '', lng: '', star_rating: '',
};

const initialForm = (hotel) => hotel ? {
  name: hotel.name || '',
  description: hotel.description || '',
  address: hotel.address || '',
  city_id: hotel.city_id || '',
  district_id: hotel.district_id || '',
  ward_id: hotel.ward_id || '',
  lat: hotel.lat ?? '',
  lng: hotel.lng ?? '',
  star_rating: hotel.star_rating ?? '',
} : emptyForm;

const EditHotelPopup = ({ isOpen, mode, hotel, onClose, onSubmit, submitLabel }) => {
  const [form, setForm] = useState(() => initialForm(hotel));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = mode === 'edit';

  if (!isOpen) return null;

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim() || form.lat === '' || form.lng === '' || form.star_rating === '') {
      setError('Name, address, coordinates, and star rating are required.');
      return;
    }
    const latitude = Number(form.lat);
    const longitude = Number(form.lng);
    const stars = Number(form.star_rating);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      setError('Star rating must be between 1 and 5.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim(),
      city_id: form.city_id.trim() || null,
      district_id: form.district_id.trim() || null,
      ward_id: form.ward_id.trim() || null,
      lat: latitude,
      lng: longitude,
      star_rating: stars,
    };
    setLoading(true);
    setError('');
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save hotel details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hotel-modal__overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <section className="hotel-modal" role="dialog" aria-modal="true" aria-labelledby="hotel-modal-title">
        <header className="hotel-modal__header">
          <div>
            <p>HOTEL RECORD</p>
            <h2 id="hotel-modal-title">{isEdit ? 'Edit hotel' : 'Create a hotel'}</h2>
          </div>
          <button type="button" className="hotel-modal__close" onClick={onClose} disabled={loading} aria-label="Close dialog">×</button>
        </header>
        <form className="hotel-modal__form" onSubmit={handleSubmit}>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Hotel name <b>*</b></span>
            <input name="name" value={form.name} onChange={updateField} maxLength={200} required autoFocus />
          </label>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Address <b>*</b></span>
            <input name="address" value={form.address} onChange={updateField} maxLength={500} required />
          </label>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Description</span>
            <textarea name="description" value={form.description} onChange={updateField} maxLength={10000} rows={3} />
          </label>
          <label className="hotel-modal__field">
            <span>City ID</span>
            <input name="city_id" value={form.city_id} onChange={updateField} />
          </label>
          <label className="hotel-modal__field">
            <span>District ID</span>
            <input name="district_id" value={form.district_id} onChange={updateField} />
          </label>
          <label className="hotel-modal__field">
            <span>Ward ID</span>
            <input name="ward_id" value={form.ward_id} onChange={updateField} />
          </label>
          <label className="hotel-modal__field">
            <span>Star rating <b>*</b></span>
            <select name="star_rating" value={form.star_rating} onChange={updateField} required>
              <option value="">Select rating</option>
              {[1, 2, 3, 4, 5].map((stars) => <option value={stars} key={stars}>{stars} star{stars === 1 ? '' : 's'}</option>)}
            </select>
          </label>
          <label className="hotel-modal__field">
            <span>Latitude <b>*</b></span>
            <input name="lat" type="number" min="-90" max="90" step="any" value={form.lat} onChange={updateField} required />
          </label>
          <label className="hotel-modal__field">
            <span>Longitude <b>*</b></span>
            <input name="lng" type="number" min="-180" max="180" step="any" value={form.lng} onChange={updateField} required />
          </label>
          {error && <p className="hotel-modal__error" role="alert">{error}</p>}
          <footer className="hotel-modal__actions">
            <button type="button" className="hotel-button hotel-button--quiet" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="hotel-button hotel-button--primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : (submitLabel || 'Create hotel')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default EditHotelPopup;
