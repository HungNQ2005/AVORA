import React, { useRef, useState } from 'react';
import HotelThumb from './hotelThumb';
import {
  deleteHotelImage,
  HOTEL_IMAGE_ACCEPTED_TYPES,
  HOTEL_IMAGE_MAX_COUNT,
  setHotelImageThumbnail,
  uploadHotelImage,
} from '../../../services/hotelManagementService';
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
  const imageCount = images.length;
  const imageLimitReached = imageCount >= HOTEL_IMAGE_MAX_COUNT;

  const handleUploadClick = () => {
    if (imageLimitReached) {
      setError(`Mỗi khách sạn chỉ được tải lên tối đa ${HOTEL_IMAGE_MAX_COUNT} hình ảnh.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (imageLimitReached) {
      setError(`Mỗi khách sạn chỉ được tải lên tối đa ${HOTEL_IMAGE_MAX_COUNT} hình ảnh.`);
      return;
    }
    setUploading(true);
    try {
      const image = await uploadHotelImage(hotelId, file, imageCount);
      onImagesChange([...images, image]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải ảnh lên.');
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
          <button type="button" className="hotel-button hotel-button--primary" onClick={handleUploadClick} disabled={uploading || imageLimitReached}>
            {uploading ? 'Đang tải lên…' : '+ Tải ảnh lên'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={HOTEL_IMAGE_ACCEPTED_TYPES.join(',')}
          hidden
          disabled={uploading || imageLimitReached}
          onChange={handleFileChange}
        />
      </div>
      <div className="hotel-image-manager__quota">
        <div className="hotel-image-manager__quota-copy">
          <strong>{imageCount} / {HOTEL_IMAGE_MAX_COUNT} ảnh</strong>
          <span>{imageLimitReached ? 'Đã đạt giới hạn ảnh cho khách sạn này.' : `Còn có thể thêm ${HOTEL_IMAGE_MAX_COUNT - imageCount} ảnh.`}</span>
        </div>
        <div
          className="hotel-image-manager__progress"
          role="progressbar"
          aria-label="Số lượng hình ảnh khách sạn"
          aria-valuemin={0}
          aria-valuemax={HOTEL_IMAGE_MAX_COUNT}
          aria-valuenow={Math.min(imageCount, HOTEL_IMAGE_MAX_COUNT)}
        >
          <span style={{ width: `${Math.min((imageCount / HOTEL_IMAGE_MAX_COUNT) * 100, 100)}%` }} />
        </div>
        <p className="hotel-image-manager__help">JPG, PNG, WEBP hoặc GIF · tối đa 2 MB mỗi ảnh</p>
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
        <p className="hotel-image-manager__empty">Chưa có hình ảnh nào. Hãy tải ảnh đầu tiên để giới thiệu khách sạn với khách hàng.</p>
      )}
    </section>
  );
};

export default HotelImageManager;
