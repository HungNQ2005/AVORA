/**
 * Maps numeric review score (0-10) to Vietnamese standard rating labels.
 * Booking.com standard:
 * >= 9.0: Tuyệt hảo (Superb / Exceptional)
 * >= 8.5: Tuyệt vời (Fabulous)
 * >= 8.0: Rất tốt (Very Good)
 * >= 7.0: Tốt (Good)
 * >= 6.0: Hài lòng (Pleasant)
 * >= 5.0: Trung bình (Fair / Average)
 * < 5.0: Kém (Poor)
 */
export const getScoreLabel = (score, fallbackLabel = null) => {
  const num = Number(score);
  if (!isNaN(num) && num > 0) {
    if (num >= 9.0) return 'Tuyệt hảo';
    if (num >= 8.5) return 'Tuyệt vời';
    if (num >= 8.0) return 'Rất tốt';
    if (num >= 7.0) return 'Tốt';
    if (num >= 6.0) return 'Hài lòng';
    if (num >= 5.0) return 'Trung bình';
    return 'Kém';
  }
  return fallbackLabel || 'Chưa có đánh giá';
};

export default getScoreLabel;

