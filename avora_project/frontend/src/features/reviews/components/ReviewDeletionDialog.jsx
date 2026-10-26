import { useEffect, useState } from 'react';
import './ReviewDeletionDialog.css';

const REASONS = [
  { code: 'VIOLENCE', label: 'Nội dung có yếu tố bạo lực' },
  { code: 'DEFAMATION', label: 'Nội dung phỉ báng hoặc không chính xác' },
  { code: 'SEXUAL_CONTENT', label: 'Nội dung không phù hợp hoặc gợi dục' },
  { code: 'POLITICAL_CONTENT', label: 'Nội dung chính trị không cần thiết' },
  { code: 'OTHER', label: 'Lý do khác' },
];

const ReviewDeletionDialog = ({ onCancel, onConfirm, busy = false, error = '' }) => {
  const [reasonCode, setReasonCode] = useState('VIOLENCE');
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm({ reason_code: reasonCode, reason_text: reasonCode === 'OTHER' ? reasonText.trim() : null });
  };

  return (
    <div className="review-delete-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="review-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="review-delete-title">
        <header className="review-delete-dialog__header">
          <span className="review-delete-dialog__mark" aria-hidden="true">!</span>
          <div>
            <p>KIỂM DUYỆT ĐÁNH GIÁ</p>
            <h2 id="review-delete-title">Gỡ đánh giá này?</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Đóng">×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="review-delete-dialog__body">
            <p>Chọn lý do gỡ. Tác giả sẽ nhận được thông báo và lý do này sẽ được lưu trong lịch sử kiểm duyệt.</p>
            <label htmlFor="review-delete-reason">Lý do gỡ</label>
            <select id="review-delete-reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={busy}>
              {REASONS.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
            </select>
            {reasonCode === 'OTHER' && (
              <label className="review-delete-dialog__other" htmlFor="review-delete-reason-text">
                Lý do cụ thể
                <textarea id="review-delete-reason-text" value={reasonText} onChange={(event) => setReasonText(event.target.value)} maxLength={1000} rows={3} required disabled={busy} />
              </label>
            )}
            {error && <p className="review-delete-dialog__error" role="alert">{error}</p>}
          </div>
          <footer className="review-delete-dialog__footer">
            <button type="button" className="review-delete-dialog__cancel" onClick={onCancel} disabled={busy}>Hủy</button>
            <button type="submit" className="review-delete-dialog__confirm" disabled={busy || (reasonCode === 'OTHER' && !reasonText.trim())}>
              {busy ? 'Đang xử lý...' : 'Gỡ đánh giá'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default ReviewDeletionDialog;