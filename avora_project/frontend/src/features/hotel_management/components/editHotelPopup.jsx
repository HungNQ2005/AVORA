import React, { useState } from 'react';
import LocationSelect from './locationSelect';
import { getDefaultCoordsForCity } from '../../../utils/vnCityCoords';
import './editHotelPopup.css';

const emptyForm = {
  name: '', description: '', address: '', city_id: '', district_id: '', ward_id: '',
  lat: '', lng: '', star_quality: '',
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
  star_quality: hotel.star_quality ?? '',
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

  const updateLocation = (patch) => {
    setForm((current) => {
      const next = { ...current, city_id: patch.city_id, district_id: patch.district_id, ward_id: patch.ward_id };
      // Auto-assign a sensible default lat/lng once a City is chosen, if not set yet.
      if (patch.city_name && (current.lat === '' || current.lng === '')) {
        const defaults = getDefaultCoordsForCity(patch.city_name);
        if (defaults) {
          next.lat = defaults.lat;
          next.lng = defaults.lng;
        }
      }
      return next;
    });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.city_id || form.star_quality === '') {
      setError('Vui lòng nhập tên, địa chỉ, tỉnh/thành phố và hạng sao.');
      return;
    }
    const latitude = Number(form.lat);
    const longitude = Number(form.lng);
    const stars = Number(form.star_quality);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Vĩ độ phải trong khoảng -90 đến 90 và kinh độ trong khoảng -180 đến 180.');
      return;
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      setError('Hạng sao phải là số nguyên từ 1 đến 5.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim(),
      city_id: form.city_id || null,
      district_id: form.district_id || null,
      ward_id: form.ward_id || null,
      lat: latitude,
      lng: longitude,
      star_quality: stars,
    };
    setLoading(true);
    setError('');
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu thông tin khách sạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hotel-modal__overlay" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <section className="hotel-modal" role="dialog" aria-modal="true" aria-labelledby="hotel-modal-title">
        <header className="hotel-modal__header">
          <div>
            <p>HỒ SƠ KHÁCH SẠN</p>
            <h2 id="hotel-modal-title">{isEdit ? 'Chỉnh sửa khách sạn' : 'Tạo khách sạn mới'}</h2>
          </div>
          <button type="button" className="hotel-modal__close" onClick={onClose} disabled={loading} aria-label="Đóng hộp thoại">×</button>
        </header>
        <form className="hotel-modal__form" onSubmit={handleSubmit}>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Tên khách sạn <b>*</b></span>
            <input name="name" value={form.name} onChange={updateField} maxLength={200} required autoFocus />
          </label>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Địa chỉ <b>*</b></span>
            <input name="address" value={form.address} onChange={updateField} maxLength={500} required />
          </label>
          <label className="hotel-modal__field hotel-modal__field--wide">
            <span>Mô tả</span>
            <textarea name="description" value={form.description} onChange={updateField} maxLength={10000} rows={3} />
          </label>
          <LocationSelect cityId={form.city_id} districtId={form.district_id} wardId={form.ward_id} onChange={updateLocation} disabled={loading} />
          <label className="hotel-modal__field">
            <span>Hạng sao <b>*</b></span>
            <select name="star_quality" value={form.star_quality} onChange={updateField} required>
              <option value="">Chọn hạng sao</option>
              {[1, 2, 3, 4, 5].map((stars) => <option value={stars} key={stars}>{stars} sao</option>)}
            </select>
          </label>
          <label className="hotel-modal__field">
            <span>Vĩ độ (Latitude) <b>*</b></span>
            <input name="lat" type="number" min="-90" max="90" step="any" value={form.lat} onChange={updateField} required />
          </label>
          <label className="hotel-modal__field">
            <span>Kinh độ (Longitude) <b>*</b></span>
            <input name="lng" type="number" min="-180" max="180" step="any" value={form.lng} onChange={updateField} required />
          </label>
          {error && <p className="hotel-modal__error" role="alert">{error}</p>}
          <footer className="hotel-modal__actions">
            <button type="button" className="hotel-button hotel-button--quiet" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="hotel-button hotel-button--primary" disabled={loading}>
              {loading ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : (submitLabel || 'Tạo khách sạn')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default EditHotelPopup;

