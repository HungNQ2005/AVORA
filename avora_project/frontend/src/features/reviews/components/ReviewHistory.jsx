import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyReviews } from '../../../services/reviewApi';
import ReviewedCard from './ReviewedCard';
import '../pages/ReviewPage.css';

const ReviewHistory = () => {
	const navigate = useNavigate();
	const [reviews, setReviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [month, setMonth] = useState('all');
	const [year, setYear] = useState('all');
	const [hotelId, setHotelId] = useState('all');

	useEffect(() => {
		let isCurrent = true;
		getMyReviews()
			.then((data) => {
				if (isCurrent) setReviews(Array.isArray(data) ? data : []);
			})
			.catch((requestError) => {
				if (isCurrent) setError(requestError.message || 'Không thể tải lịch sử đánh giá.');
			})
			.finally(() => {
				if (isCurrent) setLoading(false);
			});
		return () => { isCurrent = false; };
	}, []);

	const years = useMemo(() => [...new Set(reviews
		.map((review) => new Date(review.created_at).getFullYear())
		.filter(Number.isFinite))].sort((a, b) => b - a), [reviews]);

	const hotels = useMemo(() => {
		const uniqueHotels = new Map();
		reviews.forEach((review) => uniqueHotels.set(review.hotel_id, review.hotel_name));
		return [...uniqueHotels].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
	}, [reviews]);

	const filteredReviews = useMemo(() => reviews.filter((review) => {
		const date = new Date(review.created_at);
		return (month === 'all' || date.getMonth() + 1 === Number(month))
			&& (year === 'all' || date.getFullYear() === Number(year))
			&& (hotelId === 'all' || review.hotel_id === hotelId);
	}), [reviews, month, year, hotelId]);

	const clearFilters = () => {
		setMonth('all');
		setYear('all');
		setHotelId('all');
	};

	return (
		<section className="review-history-page review-history-page--embedded">
			<div className="review-history-page__container">
				<header className="review-history-header">
					<div>
						<p className="review-history-eyebrow">AVORA · TRẢI NGHIỆM CỦA BẠN</p>
						<h2>Lịch sử đánh giá</h2>
						<p className="review-history-intro">Những nhận xét bạn đã chia sẻ sau mỗi kỳ lưu trú.</p>
					</div>
				</header>

				<section className="review-history-filters" aria-label="Lọc lịch sử đánh giá">
					<label>
						<span>Tháng</span>
						<select value={month} onChange={(event) => setMonth(event.target.value)}>
							<option value="all">Tất cả tháng</option>
							{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>Tháng {value}</option>)}
						</select>
					</label>
					<label>
						<span>Năm</span>
						<select value={year} onChange={(event) => setYear(event.target.value)}>
							<option value="all">Tất cả năm</option>
							{years.map((value) => <option key={value} value={value}>{value}</option>)}
						</select>
					</label>
					<label className="review-history-filters__hotel">
						<span>Khách sạn</span>
						<select value={hotelId} onChange={(event) => setHotelId(event.target.value)}>
							<option value="all">Tất cả khách sạn đang hoạt động</option>
							{hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
						</select>
					</label>
					<button type="button" className="review-history-clear" onClick={clearFilters} disabled={month === 'all' && year === 'all' && hotelId === 'all'}>Xóa bộ lọc</button>
				</section>

				<div className="review-history-results-heading">
					<h2>Đánh giá của bạn</h2>
					{!loading && <span>{filteredReviews.length} đánh giá</span>}
				</div>

				{loading ? (
					<div className="review-history-state" role="status">Đang tải lịch sử đánh giá...</div>
				) : error ? (
					<div className="review-history-state review-history-state--error" role="alert"><p>{error}</p><Link to="/signin">Đăng nhập để xem đánh giá</Link></div>
				) : filteredReviews.length ? (
					<div className="review-history-list">
						{filteredReviews.map((review) => <ReviewedCard key={review.review_id} review={review} onClick={() => navigate(`/hotels/${review.hotel_id}`)} />)}
					</div>
				) : (
					<div className="review-history-state">
						<span className="review-history-state__mark" aria-hidden="true">✦</span>
						<h3>{reviews.length ? 'Không tìm thấy đánh giá phù hợp' : 'Bạn chưa có đánh giá nào'}</h3>
						<p>{reviews.length ? 'Thử thay đổi tháng, năm hoặc khách sạn.' : 'Đánh giá sau kỳ lưu trú sẽ được lưu tại đây.'}</p>
						{reviews.length > 0 && <button type="button" className="review-history-clear review-history-clear--empty" onClick={clearFilters}>Xóa bộ lọc</button>}
					</div>
				)}
			</div>
		</section>
	);
};

export default ReviewHistory;
