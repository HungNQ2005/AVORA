import { useEffect, useMemo, useState } from 'react';
import { adminSoftDeleteReview, getAdminReviews } from '../../../services/reviewApi';
import './AdminReviewManagementPage.css';

const AdminReviewManagementPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState('all');
  const [hotelId, setHotelId] = useState('all');
  const [status, setStatus] = useState('all');
  const [busyReviewId, setBusyReviewId] = useState(null);

  useEffect(() => {
    let current = true;
    getAdminReviews()
      .then((data) => { if (current) setReviews(Array.isArray(data) ? data : []); })
      .catch((requestError) => { if (current) setError(requestError.message || 'Không thể tải đánh giá.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const years = useMemo(() => [...new Set(reviews
    .map((review) => new Date(review.created_at).getFullYear())
    .filter(Number.isFinite))].sort((a, b) => b - a), [reviews]);

  const hotels = useMemo(() => {
    const uniqueHotels = new Map();
    reviews.forEach((review) => uniqueHotels.set(review.hotel_id || review.hotel_name, review.hotel_name));
    return [...uniqueHotels].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return reviews.filter((review) => {
      const date = new Date(review.created_at);
      const matchesText = !term || [review.comment, review.author_name, review.hotel_name]
        .some((value) => String(value || '').toLocaleLowerCase().includes(term));
      const matchesMonth = month === 'all' || date.getMonth() + 1 === Number(month);
      const matchesYear = year === 'all' || date.getFullYear() === Number(year);
      const matchesHotel = hotelId === 'all' || (review.hotel_id || review.hotel_name) === hotelId;
      const matchesStatus = status === 'all' || (status === 'deleted' ? review.is_deleted : !review.is_deleted);
      return matchesText && matchesMonth && matchesYear && matchesHotel && matchesStatus;
    });
  }, [reviews, search, month, year, hotelId, status]);

  const clearFilters = () => {
    setSearch('');
    setMonth('all');
    setYear('all');
    setHotelId('all');
    setStatus('all');
  };

  const handleSoftDelete = async (review) => {
    if (review.is_deleted || !window.confirm('Ẩn đánh giá này? Đánh giá đã ẩn không thể khôi phục trong hệ thống.')) return;
    setBusyReviewId(review.review_id);
    setError('');
    try {
      await adminSoftDeleteReview(review.review_id);
      setReviews((current) => current.map((item) => item.review_id === review.review_id
        ? { ...item, is_deleted: true, updated_at: new Date().toISOString() }
        : item));
    } catch (requestError) {
      setError(requestError.message || 'Không thể ẩn đánh giá này.');
    } finally {
      setBusyReviewId(null);
    }
  };

  return (
    <section className="admin-reviews-page">
      <header className="admin-reviews-page__header">
        <div>
          <p>HỆ THỐNG / KIỂM DUYỆT NỘI DUNG</p>
          <h1>Quản lý đánh giá</h1>
          <span>Đánh giá được giữ trong danh sách kể cả khi đã ẩn hoặc khách sạn ngừng hoạt động.</span>
        </div>
        <div className="admin-reviews-page__total"><strong>{filteredReviews.length}</strong><span>kết quả</span></div>
      </header>

      <section className="admin-reviews-filters" aria-label="Bộ lọc đánh giá">
        <label className="admin-reviews-filters__search">
          <span>Tìm kiếm</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nội dung, tác giả hoặc khách sạn" />
        </label>
        <label><span>Tháng</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">Tất cả</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>Tháng {value}</option>)}</select></label>
        <label><span>Năm</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">Tất cả</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="admin-reviews-filters__hotel"><span>Khách sạn</span><select value={hotelId} onChange={(event) => setHotelId(event.target.value)}><option value="all">Tất cả khách sạn</option>{hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></label>
        <label><span>Trạng thái đánh giá</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tất cả</option><option value="active">Đang hiển thị</option><option value="deleted">Đã ẩn</option></select></label>
        <button type="button" className="admin-reviews-filters__clear" onClick={clearFilters} disabled={!search && month === 'all' && year === 'all' && hotelId === 'all' && status === 'all'}>Xóa lọc</button>
      </section>

      {error && <p className="admin-reviews-error" role="alert">{error}</p>}
      {loading ? (
        <div className="admin-reviews-state" role="status">Đang tải đánh giá...</div>
      ) : filteredReviews.length ? (
        <div className="admin-reviews-list">
          {filteredReviews.map((review) => (
            <article key={review.review_id} className={`admin-review-row ${review.is_deleted ? 'admin-review-row--deleted' : ''}`}>
              <div className="admin-review-row__score"><strong>{review.rating_score}</strong><span>/10</span></div>
              <div className="admin-review-row__body">
                <div className="admin-review-row__heading">
                  <h2>{review.hotel_name}</h2>
                  <span className={`admin-review-status ${review.is_deleted ? 'admin-review-status--deleted' : 'admin-review-status--active'}`}>{review.is_deleted ? 'Đã ẩn' : 'Đang hiển thị'}</span>
                  <span className={`admin-review-hotel-status ${review.hotel_status === 'ACTIVE' && !review.hotel_is_deleted ? '' : 'admin-review-hotel-status--inactive'}`}>{review.hotel_is_deleted ? 'Khách sạn đã xóa' : review.hotel_status === 'ACTIVE' ? 'Khách sạn hoạt động' : `Khách sạn ${review.hotel_status.toLowerCase()}`}</span>
                </div>
                <p className="admin-review-row__comment">{review.comment || 'Không có nội dung nhận xét.'}</p>
                <div className="admin-review-row__meta">
                  <span><strong>{review.author_name}</strong></span>
                  <time dateTime={review.created_at}>{review.created_at ? new Date(review.created_at).toLocaleString('vi-VN') : 'Thời gian không xác định'}</time>
                  {review.updated_at && review.updated_at !== review.created_at && <span>Cập nhật: {new Date(review.updated_at).toLocaleString('vi-VN')}</span>}
                </div>
              </div>
              <button type="button" className="admin-review-row__delete" onClick={() => handleSoftDelete(review)} disabled={review.is_deleted || busyReviewId === review.review_id}>
                {review.is_deleted ? 'Đã ẩn vĩnh viễn' : busyReviewId === review.review_id ? 'Đang ẩn...' : 'Ẩn đánh giá'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-reviews-state">Không tìm thấy đánh giá phù hợp với bộ lọc.</div>
      )}
    </section>
  );
};

export default AdminReviewManagementPage;