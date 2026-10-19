import { useState } from 'react';
import { deleteReview, updateReview } from '../../../services/reviewApi';

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const ReviewCard = ({ review, onUpdated, onDeleted }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [ratingScore, setRatingScore] = useState(review.rating_score);
	const [comment, setComment] = useState(review.comment || '');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const reviewAge = Date.now() - Date.parse(review.created_at);
	const canManage = review.can_manage && Number.isFinite(reviewAge)
		&& reviewAge >= 0 && reviewAge <= EDIT_WINDOW_MS;

	const handleUpdate = async (event) => {
		event.preventDefault();
		setIsSaving(true);
		setError('');
		try {
			const result = await updateReview(review.review_id, {
				rating_score: Number(ratingScore),
				comment: comment.trim() || null,
			});
			onUpdated(result);
			setIsEditing(false);
		} catch (requestError) {
			setError(requestError.message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
		setIsSaving(true);
		setError('');
		try {
			const result = await deleteReview(review.review_id);
			onDeleted(result);
		} catch (requestError) {
			setError(requestError.message);
			setIsSaving(false);
		}
	};

	return (
		<article className="customer-review-card">
			<div className="customer-review-header">
				<div className="customer-author-info">
					<div className="customer-avatar">
						{(review.reviewer_name || 'K').charAt(0).toUpperCase()}
					</div>
					<div>
						<div className="customer-name">{review.reviewer_name || 'Khách hàng Avora'}</div>
						<div className="customer-trip-type">
							{review.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN') : 'Khách đã lưu trú'}
						</div>
					</div>
				</div>
				<span className="customer-score-tag">{review.rating_score} / 10</span>
			</div>

			{isEditing ? (
				<form className="review-edit-form" onSubmit={handleUpdate}>
					<label>
						Điểm đánh giá
						<select value={ratingScore} onChange={(event) => setRatingScore(event.target.value)}>
							{Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
								<option key={score} value={score}>{score} / 10</option>
							))}
						</select>
					</label>
					<label>
						Nhận xét
						<textarea value={comment} maxLength={2000} onChange={(event) => setComment(event.target.value)} />
					</label>
					{error && <p className="review-card-error" role="alert">{error}</p>}
					<div className="review-card-actions">
						<button type="button" className="review-action-button" onClick={() => setIsEditing(false)} disabled={isSaving}>
							Hủy
						</button>
						<button type="submit" className="review-action-button review-action-button--primary" disabled={isSaving}>
							{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
						</button>
					</div>
				</form>
			) : (
				<>
					<p className="customer-comment">{review.comment || 'Khách hàng không để lại nhận xét.'}</p>
					{error && <p className="review-card-error" role="alert">{error}</p>}
					{canManage && (
						<div className="review-card-actions">
							<button type="button" className="review-action-button" onClick={() => setIsEditing(true)} disabled={isSaving}>
								Chỉnh sửa
							</button>
							<button type="button" className="review-action-button review-action-button--danger" onClick={handleDelete} disabled={isSaving}>
								{isSaving ? 'Đang xóa...' : 'Xóa'}
							</button>
						</div>
					)}
				</>
			)}
		</article>
	);
};

export default ReviewCard;
