import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Dialog from '../../../common/components/Dialog';
import LocationSelect from '../components/locationSelect';
import HotelThumb from '../components/hotelThumb';
import HotelImageManager from '../components/hotelImageManager';
import { useAuth } from '../../../context/AuthContext';
import { approveHotel, deleteHotel, getHotel, updateHotel } from '../../../services/hotelManagementService';
import '../components/hotelThumb.css';
import './hotelDetailPage.css';

const toHotelForm = (hotel) => ({
  name: hotel.name || '',
  description: hotel.description || '',
  address: hotel.address || '',
  city_id: hotel.city_id || '',
  district_id: hotel.district_id || '',
  ward_id: hotel.ward_id || '',
  star_quality: hotel.star_quality ?? '',
  lat: hotel.lat ?? '',
  lng: hotel.lng ?? '',
});

const HotelDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');
  const role = String(user?.role_code_name || '').trim().toUpperCase();
  const isVendor = role === 'VEN';
  const canApprove = role === 'ADM' || role === 'BMR';
  const [images, setImages] = useState([]);

  useEffect(() => {
    let active = true;
    getHotel(id)
      .then((result) => {
        if (!active) return;
        setHotel(result);
        setForm(toHotelForm(result));
        setImages(result.images || []);
      })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Không thể tải thông tin khách sạn này.'); })
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

  const updateLocation = (patch) => {
    setForm((current) => ({ ...current, city_id: patch.city_id, district_id: patch.district_id, ward_id: patch.ward_id }));
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isVendor) return;
    if (isVendor && (!form?.name.trim() || !form?.address.trim())) {
      setError('Tên khách sạn và địa chỉ là bắt buộc.');
      return;
    }

    const latitude = form.lat === '' ? undefined : Number(form.lat);
    const longitude = form.lng === '' ? undefined : Number(form.lng);
    const stars = Number(form.star_quality);
    if (isVendor && ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
      || !Number.isInteger(stars) || stars < 1 || stars > 5)) {
      setError('Nhập tọa độ hợp lệ (nếu có) và hạng sao là số nguyên từ 1 đến 5.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city_id: form.city_id || null,
        district_id: form.district_id || null,
        ward_id: form.ward_id || null,
        star_quality: stars,
        ...(latitude !== undefined ? { lat: latitude } : {}),
        ...(longitude !== undefined ? { lng: longitude } : {}),
      };

      const updated = await updateHotel(id, payload);
      setHotel(updated);
      setForm(toHotelForm(updated));
      setToast('Đã lưu thông tin khách sạn.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu thông tin khách sạn.');
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
      const approved = await approveHotel(id);
      setHotel(approved);
      setForm(toHotelForm(approved));
      setToast('Khách sạn đã được phê duyệt.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể phê duyệt khách sạn này.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      const reopened = await updateHotel(id, { hotel_status: 'PENDING' });
      setHotel(reopened);
      setForm(toHotelForm(reopened));
      setToast('Yêu cầu mở lại đã được gửi để phê duyệt.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu mở lại khách sạn này.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetStatus = async (hotelStatus) => {
    setActionLoading(true);
    try {
      const updated = await updateHotel(id, { hotel_status: hotelStatus });
      setHotel(updated);
      setForm(toHotelForm(updated));
      setToast('Trạng thái khách sạn đã được cập nhật.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật trạng thái khách sạn.');
    } finally {
      setActionLoading(false);
    }
  };

  const requestDelete = () => {
    setError('');
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const deactivated = await deleteHotel(id);
      setHotel(deactivated);
      setForm(toHotelForm(deactivated));
      setDeleteOpen(false);
      setToast('Khách sạn đã ngừng hoạt động.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể ngừng hoạt động khách sạn này.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="hotel-detail-state" role="status"><span className="hotel-spinner" />Đang tải thông tin khách sạn</div>;
  if (error && !hotel) {
    return <section className="hotel-detail-state hotel-detail-state--error"><p role="alert">{error}</p><Link to="/dashboard/hotel-management">Quay lại danh sách khách sạn</Link></section>;
  }
  if (!hotel) return null;

  const isPending = hotel.status_cd === 'PENDING';
  const isInactive = hotel.status_cd === 'INACTIVE';
  const status = hotel.is_deleted ? 'Lịch sử đã xóa' : (hotel.status_name || (isPending ? 'Chờ duyệt' : 'Đang hoạt động'));
  const addressParts = [hotel.address, hotel.ward_name, hotel.district_name, hotel.city_name].filter(Boolean);
  const vendorCanDeactivate = isVendor && !hotel.is_deleted && !isInactive;
  const staffCanDeactivate = canApprove && !hotel.is_deleted && !isInactive;

  return (
    <section className="hotel-detail">
      <Link className="hotel-detail__back" to="/dashboard/hotel-management">← Tất cả khách sạn</Link>
      {error && <div className="hotel-notice hotel-notice--error" role="alert">{error}</div>}
      <header className="hotel-detail__header">
        <HotelThumb src={hotel.thumbnail_url} alt={hotel.name} className="hotel-detail__thumb" iconSize={30} />
        <div>
          <p className="hotel-detail__eyebrow">MÃ KHÁCH SẠN · {hotel.hotel_id}</p>
          <h1>{hotel.name}</h1>
          <p className="hotel-detail__location">{addressParts.join(', ') || 'Chưa có vị trí'}</p>
        </div>
        <div className="hotel-detail__actions">
          {canApprove && !hotel.is_deleted && isPending && <button type="button" className="hotel-button hotel-button--primary" onClick={handleApprove} disabled={actionLoading}>{actionLoading ? 'Đang duyệt…' : 'Phê duyệt'}</button>}
          {isVendor && !hotel.is_deleted && isInactive && <button type="button" className="hotel-button hotel-button--primary" onClick={handleReactivate} disabled={actionLoading}>Yêu cầu mở lại</button>}
          {staffCanDeactivate && <button type="button" className="hotel-button hotel-button--danger" onClick={() => handleSetStatus('INACTIVE')} disabled={actionLoading}>Ngừng hoạt động</button>}
          {vendorCanDeactivate && <button type="button" className="hotel-button hotel-button--danger" onClick={requestDelete} disabled={actionLoading}>Ngừng hoạt động</button>}
        </div>
      </header>

      <div className="hotel-detail__status-line">
        <span className={`hotel-detail__status hotel-detail__status--${hotel.is_deleted ? 'deleted' : (isInactive ? 'inactive' : (isPending ? 'pending' : 'active'))}`}>{status}</span>
        <span className="hotel-detail__rating"><b aria-hidden="true">{'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_quality) || 0)))}</b> Hạng {hotel.star_quality || '—'} sao</span>
      </div>

      <form className="hotel-detail__form" onSubmit={handleSave}>
        <div className="hotel-detail__columns">
          <section className="hotel-detail__panel hotel-detail__overview">
            <h2>Thông tin khách sạn</h2>
            <div className="hotel-detail__field-grid">
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Tên khách sạn</span>
                <input name="name" value={form?.name || ''} onChange={updateField} readOnly={!isVendor} required={isVendor} maxLength={200} />
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Địa chỉ</span>
                <input name="address" value={form?.address || ''} onChange={updateField} readOnly={!isVendor} required={isVendor} maxLength={500} />
              </label>
              <LocationSelect cityId={form?.city_id} districtId={form?.district_id} wardId={form?.ward_id} onChange={updateLocation} disabled={!isVendor || actionLoading} />
              <label className="hotel-detail__field">
                <span>Hạng sao</span>
                <select name="star_quality" value={form?.star_quality ?? ''} onChange={updateField} disabled={!isVendor} required>
                  <option value="">Chọn hạng sao</option>
                  {[1, 2, 3, 4, 5].map((stars) => <option value={stars} key={stars}>{stars} sao</option>)}
                </select>
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Mô tả</span>
                <textarea name="description" rows={4} value={form?.description || ''} onChange={updateField} readOnly={!isVendor} maxLength={10000} />
              </label>
            </div>
          </section>

          <section className="hotel-detail__panel hotel-detail__coordinates">
            <h2>Vị trí & chủ sở hữu</h2>
            <div className="hotel-detail__field-grid">
              <label className="hotel-detail__field">
                <span>Vĩ độ</span>
                <input name="lat" type="number" min="-90" max="90" step="any" value={form?.lat ?? ''} onChange={updateField} readOnly={!isVendor} required={isVendor} />
              </label>
              <label className="hotel-detail__field">
                <span>Kinh độ</span>
                <input name="lng" type="number" min="-180" max="180" step="any" value={form?.lng ?? ''} onChange={updateField} readOnly={!isVendor} required={isVendor} />
              </label>
              <label className="hotel-detail__field hotel-detail__field--wide">
                <span>Chủ sở hữu</span>
                <input value={hotel.owner?.full_name || hotel.owner_name || 'Chưa gán'} readOnly />
              </label>
            </div>
            {canApprove && hotel.owner && <p className="hotel-detail__owner-contact">Chủ sở hữu hiện tại: {hotel.owner.full_name} · {hotel.owner.phone || 'Chưa có số điện thoại'} · {hotel.owner.email}</p>}
            <p className="hotel-detail__room-total"><strong>{hotel.total_rooms ?? hotel.room_count ?? 0}</strong> phòng thực tế · <strong>{hotel.total_room_types ?? 0}</strong> loại phòng</p>
            <a href={`https://www.google.com/maps?q=${encodeURIComponent(`${form?.lat},${form?.lng}`)}`} target="_blank" rel="noreferrer">Xem tọa độ trên bản đồ ↗</a>
          </section>
        </div>

        {error && <p className="hotel-detail__form-error" role="alert">{error}</p>}
        <footer className="hotel-detail__form-actions">
          <span>Mã khách sạn: <code>{hotel.hotel_id}</code></span>
          {isVendor && <div>
            <button type="button" className="hotel-button hotel-button--quiet" onClick={handleCancelChanges} disabled={actionLoading}>Hủy</button>
            <button type="submit" className="hotel-button hotel-button--primary" disabled={actionLoading}>{actionLoading ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          </div>}
        </footer>
      </form>

      <HotelImageManager hotelId={hotel.hotel_id} images={images} onImagesChange={setImages} canManage={isVendor} />

      {toast && <div className="hotel-toast" role="status">{toast}</div>}
      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Ngừng hoạt động khách sạn này?"
        message={error || `"${hotel.name}" sẽ chuyển sang trạng thái Ngừng hoạt động. Khách sạn sẽ không bị xóa khỏi dữ liệu.`}
        variant="confirm"
        confirmLabel={actionLoading ? 'Đang cập nhật…' : 'Ngừng hoạt động'}
      />
    </section>
  );
};

export default HotelDetailPage;

