import './ReviewedCard.css';

const ReviewedCard = ({ review, onClick }) => (
	<button
		type="button"
		className="reviewed-card"
		onClick={onClick}
		aria-label={`Mở trang khách sạn ${review.hotel_name}`}
	>
		<span className="reviewed-card__image-wrap">
			{review.hotel_thumbnail ? (
				<img className="reviewed-card__image" src={review.hotel_thumbnail} alt="" loading="lazy" />
			) : (
				<span className="reviewed-card__image-fallback" aria-hidden="true">AV</span>
			)}
		</span>
		<span className="reviewed-card__content">
			<span className="reviewed-card__topline">
				<span className="reviewed-card__hotel">{review.hotel_name}</span>
				<span className="reviewed-card__score" aria-label={`Điểm ${review.rating_score} trên 10`}>
					<span aria-hidden="true">★</span> {review.rating_score}<small>/10</small>
				</span>
			</span>
			{review.hotel_address && <span className="reviewed-card__address">{review.hotel_address}</span>}
			<span className="reviewed-card__comment">{review.comment || 'Bạn không để lại nhận xét.'}</span>
			<span className="reviewed-card__date">
				{review.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Ngày không xác định'}
			</span>
		</span>
		<span className="reviewed-card__arrow" aria-hidden="true">›</span>
	</button>
);

export default ReviewedCard;
