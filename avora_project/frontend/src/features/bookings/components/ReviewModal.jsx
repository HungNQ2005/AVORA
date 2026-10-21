import { useEffect, useState } from 'react';
import { createReview, deleteReview, getBookingReview, updateReview } from '../../../services/reviewApi';
import ReviewDeletionDialog from '../../reviews/components/ReviewDeletionDialog';
import './ReviewModal.css';

const isConfirmedBooking = (statusCode) => ['2', 'CFM'].includes(String(statusCode ?? '').trim().toUpperCase());

const ReviewModal = ({ booking, onClose, onSaved, onDeleted }) => {
    const [review, setReview] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [ratingScore, setRatingScore] = useState(8);
    const [comment, setComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let isCurrent = true;

        getBookingReview(booking.booking_id)
            .then((data) => {
                if (!isCurrent) return;
                const canCreateReview = !data.review && !data.unavailable
                    && (data.can_create === true || isConfirmedBooking(booking.booking_status_cd));
                setReview(data.review || null);
                setCanCreate(canCreateReview);
                setUnavailable(Boolean(data.unavailable));
                setRatingScore(data.review?.rating_score || 8);
                setComment(data.review?.comment || '');
                setIsEditing(canCreateReview);
            })
            .catch((requestError) => {
                if (isCurrent) setError(requestError.message);
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });

        return () => { isCurrent = false; };
    }, [booking.booking_id, booking.booking_status_cd]);

    const canEdit = Boolean(review?.can_edit);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const payload = { rating_score: Number(ratingScore), comment: comment.trim() || null };
            const result = review
                ? await updateReview(review.review_id, payload)
                : await createReview(booking.booking_id, payload);
            setReview(result.review || null);
            setCanCreate(false);
            setIsEditing(false);
            setRatingScore(result.review?.rating_score || Number(ratingScore));
            setComment(result.review?.comment || comment);
            onSaved?.(result);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (reason) => {
        setIsSaving(true);
        setError('');
        try {
            await deleteReview(review.review_id, reason);
            onDeleted?.(booking.booking_id);
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const isReadOnly = Boolean(review && !canEdit);
    const isFormDisabled = isSaving || isLoading || (!isEditing && Boolean(review));

    return (
        <div className="review-modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) onClose();
        }}>
            <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
                <header className="review-modal__header">
                    <div>
                        <span className="review-modal__eyebrow">AVORA · MY BOOKINGS</span>
                        <h2 id="review-modal-title">Đánh giá kỳ nghỉ</h2>
                        <p>{booking.hotel?.name || 'Khách sạn'} · Mã đặt chỗ {booking.booking_code}</p>
                    </div>
                    <button type="button" className="review-modal__close" onClick={onClose} aria-label="Đóng" disabled={isSaving}>
                        ×
                    </button>
                </header>

                <div className="review-modal__body">
                    {isLoading ? (
                        <div className="review-modal__status" role="status">Đang tải đánh giá...</div>
                    ) : unavailable ? (
                        <div className="review-modal__notice">Đánh giá chỉ khả dụng khi khách sạn đang hoạt động.</div>
                    ) : error && !review && !canCreate ? (
                        <div className="review-modal__error" role="alert">{error}</div>
                    ) : (
                        <>
                            {isReadOnly && (
                                <div className="review-modal__notice">
                                    Đã quá 30 ngày kể từ khi đánh giá được tạo. Nội dung này chỉ có thể xem.
                                </div>
                            )}
                            {review && !isReadOnly && !isEditing && (
                                <div className="review-modal__notice">Bạn có thể chỉnh sửa hoặc xóa đánh giá trong vòng 30 ngày kể từ ngày tạo.</div>
                            )}

                            <form className="review-modal__form" onSubmit={handleSubmit}>
                                <div className="review-modal__rating-heading">
                                    <label htmlFor="review-rating">Mức độ hài lòng</label>
                                    <output htmlFor="review-rating" className="review-modal__rating-value">{ratingScore}<span>/10</span></output>
                                </div>
                                <input
                                    id="review-rating"
                                    className="review-modal__slider"
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={ratingScore}
                                    onChange={(event) => setRatingScore(Number(event.target.value))}
                                    disabled={isFormDisabled || isReadOnly}
                                    style={{ '--review-progress': `${((ratingScore - 1) / 9) * 100}%` }}
                                />
                                <div className="review-modal__slider-labels"><span>Chưa hài lòng</span><span>Rất hài lòng</span></div>

                                <label className="review-modal__comment-label" htmlFor="review-comment">Nhận xét về khách sạn</label>
                                <textarea
                                    id="review-comment"
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    maxLength={2000}
                                    placeholder="Chia sẻ trải nghiệm lưu trú của bạn..."
                                    readOnly={isReadOnly || !isEditing}
                                    disabled={isFormDisabled}
                                    rows={5}
                                />
                                <div className="review-modal__comment-count">{comment.length}/2000</div>

                                {error && <p className="review-modal__error" role="alert">{error}</p>}

                                <footer className="review-modal__actions">
                                    {review && canEdit && !isEditing && (
                                        <>
                                            <button type="button" className="review-modal__button review-modal__button--danger" onClick={() => setDeleteDialogOpen(true)} disabled={isSaving}>
                                                Xóa đánh giá
                                            </button>
                                            <button type="button" className="review-modal__button review-modal__button--primary" onClick={() => setIsEditing(true)}>
                                                Chỉnh sửa
                                            </button>
                                        </>
                                    )}
                                    {isEditing && (
                                        <>
                                            {review && <button type="button" className="review-modal__button" onClick={() => {
                                                setRatingScore(review.rating_score);
                                                setComment(review.comment || '');
                                                setIsEditing(false);
                                                setError('');
                                            }} disabled={isSaving}>Hủy</button>}
                                            <button type="submit" className="review-modal__button review-modal__button--primary" disabled={isSaving || isLoading}>
                                                {isSaving ? 'Đang lưu...' : review ? 'Lưu thay đổi' : 'Gửi đánh giá'}
                                            </button>
                                        </>
                                    )}
                                    {(!review || isReadOnly || (!canEdit && review)) && (
                                        <button type="button" className="review-modal__button review-modal__button--primary" onClick={onClose}>Đóng</button>
                                    )}
                                    {!review && !canCreate && !unavailable && (
                                        <span className="review-modal__small-note">Chưa thể tạo đánh giá cho đặt phòng này.</span>
                                    )}
                                </footer>
                            </form>
                        </>
                    )}
                </div>
            </section>
            {deleteDialogOpen && <ReviewDeletionDialog onCancel={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} busy={isSaving} error={error} />}
        </div>
    );
};

export default ReviewModal;
