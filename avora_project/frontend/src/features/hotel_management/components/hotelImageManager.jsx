import React, { useRef, useState } from 'react';
import HotelThumb from './hotelThumb';
import { deleteHotelImage, setHotelImageThumbnail, uploadHotelImage } from '../../../services/hotelManagementService';
import './hotelImageManager.css';

/**
 * Image CRUD panel for hotelDetailPage.jsx: upload, view, set-thumbnail, delete.
 * Every thumbnail falls back to the default hotel icon via HotelThumb on load failure.
 */
const HotelImageManager = ({ hotelId, images, onImagesChange, canManage }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [busyImageId, setBusyImageId] = useState(null);
  const [error, setError] = useState('');

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const image = await uploadHotelImage(hotelId, file);
      onImagesChange([...images, image]);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    setError('');
    setBusyImageId(imageId);
    try {
      await deleteHotelImage(hotelId, imageId);
      onImagesChange(images.filter((img) => img.image_id !== imageId));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa ảnh này.');
    } finally {
      setBusyImageId(null);
    }
  };

  const handleSetThumbnail = async (imageId) => {
    setError('');
    setBusyImageId(imageId);
    try {
      await setHotelImageThumbnail(hotelId, imageId);
      onImagesChange(images.map((img) => ({ ...img, is_thumbnail: img.image_id === imageId })));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt ảnh đại diện.');
    } finally {
      setBusyImageId(null);
    }
  };

  return (
    <section className="hotel-detail__panel hotel-image-manager">
      <div className="hotel-image-manager__header">
        <h2>Hình ảnh khách sạn</h2>
        {canManage && (
          <button type="button" className="hotel-button hotel-button--primary" onClick={handleUploadClick} disabled={uploading}>
            {uploading ? 'Đang tải lên…' : '+ Tải ảnh lên'}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </div>
      {error && <p className="hotel-detail__inline-error" role="alert">{error}</p>}
      {images.length ? (
        <div className="hotel-image-manager__grid">
          {images.map((image) => (
            <figure key={image.image_id} className="hotel-image-manager__item">
              <HotelThumb src={image.image_url} alt="Ảnh khách sạn" className="hotel-image-manager__thumb" iconSize={26} />
              {image.is_thumbnail && <span className="hotel-image-manager__badge">Ảnh đại diện</span>}
              {canManage && (
                <div className="hotel-image-manager__item-actions">
                  {!image.is_thumbnail && (
                    <button type="button" onClick={() => handleSetThumbnail(image.image_id)} disabled={busyImageId === image.image_id}>
                      Đặt làm đại diện
                    </button>
                  )}
                  <button type="button" className="hotel-image-manager__delete" onClick={() => handleDelete(image.image_id)} disabled={busyImageId === image.image_id}>
                    Xóa
                  </button>
                </div>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <p className="hotel-image-manager__empty">Chưa có hình ảnh nào. Tải ảnh lên để hiển thị cho khách hàng.</p>
      )}
    </section>
  );
};

export default HotelImageManager;
