import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createPaymentQr, fetchPaymentStatus } from '../../../services/paymentApi';
import './payment.css';

const POLL_INTERVAL_MS = 3000;
const REDIRECT_DELAY_MS = 2000;

const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

const formatCountdown = (totalSeconds) => {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/**
 * Màn hình thanh toán VietQR (SePay). Entry points:
 *  - Checkout (sau khi tạo đơn) → /payment/:bookingId
 *  - Lịch sử đơn hàng ("Thanh toán ngay") → /payment/:bookingId
 */
const PaymentQRScreen = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [toast, setToast] = useState(null);

  const deadlineRef = useRef(null);
  const toastTimerRef = useRef(null);
  const lastPollErrorRef = useRef(false);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type, id: Date.now() });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const goToSuccess = useCallback(() => {
    navigate(`/payment/success/${bookingId}`, { replace: true });
  }, [navigate, bookingId]);

  // ─── 1. Tạo QR khi vào màn hình ───────────────────────────────────────────
  const loadQr = useCallback(async () => {
    setIsLoading(true);
    setFatalError(null);
    setQrImageLoaded(false);
    try {
      const data = await createPaymentQr(bookingId);
      deadlineRef.current = Date.now() + data.remaining_time_seconds * 1000;
      setRemaining(data.remaining_time_seconds);
      setPaymentInfo(data);
      setIsExpired(data.remaining_time_seconds <= 0);
    } catch (err) {
      if (err.code === 'PAYMENT_EXPIRED') {
        setIsExpired(true);
      } else if (err.code === 'ALREADY_PAID') {
        setIsPaid(true);
      } else if (err.code === 'NOT_PENDING') {
        setIsExpired(true);
      } else {
        setFatalError(err.message || 'Không thể tạo mã QR thanh toán.');
        showToast(err.message || 'Không thể tạo mã QR thanh toán.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, showToast]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadQr();
  }, [authLoading, user, loadQr]);

  // ─── 2. Đếm ngược ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!paymentInfo || isPaid || isExpired) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setIsExpired(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [paymentInfo, isPaid, isExpired]);

  // ─── 3. Polling trạng thái mỗi 3 giây ──────────────────────────────────────
  useEffect(() => {
    if (!paymentInfo || isPaid || isExpired) return undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await fetchPaymentStatus(bookingId);
        if (cancelled) return;
        lastPollErrorRef.current = false;
        if (status.is_paid || status.status_code_name === 'CFM') {
          setIsPaid(true);
        } else if (status.status_code_name === 'CAN') {
          setIsExpired(true);
        }
      } catch (err) {
        if (cancelled) return;
        // Chỉ báo lỗi 1 lần cho mỗi chuỗi lỗi liên tiếp; polling vẫn tiếp tục.
        if (!lastPollErrorRef.current) {
          lastPollErrorRef.current = true;
          showToast('Mất kết nối khi kiểm tra thanh toán. Đang thử lại...');
        }
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [paymentInfo, isPaid, isExpired, bookingId, showToast]);

  // ─── 4. Thành công → hiệu ứng + tự chuyển trang sau 2s ─────────────────────
  useEffect(() => {
    if (!isPaid) return undefined;
    const timer = setTimeout(goToSuccess, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isPaid, goToSuccess]);

  const handleCopy = async (field, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedField(field);
      setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 1600);
    } catch {
      showToast('Không thể sao chép. Vui lòng sao chép thủ công.');
    }
  };

  // ─── Render guards ─────────────────────────────────────────────────────────
  if (authLoading) {
    return <div className="pay-page" role="status"><div className="pay-container">Đang kiểm tra đăng nhập...</div></div>;
  }

  if (!user) {
    return (
      <div className="pay-page">
        <section className="pay-state-card" role="status">
          <h1>Vui lòng đăng nhập để thanh toán</h1>
          <p>Bạn cần đăng nhập trước khi thanh toán đơn đặt phòng.</p>
          <button type="button" className="pay-btn pay-btn--primary" onClick={() => navigate('/signin')}>Đăng nhập</button>
        </section>
      </div>
    );
  }

  const manualRows = paymentInfo
    ? [
      { key: 'bank', label: 'Ngân hàng', value: paymentInfo.bank_code === 'MB' ? 'MB Bank (MB)' : paymentInfo.bank_code },
      { key: 'holder', label: 'Tên tài khoản', value: paymentInfo.account_holder },
      { key: 'account', label: 'Số tài khoản', value: paymentInfo.account_number, copy: paymentInfo.account_number },
      { key: 'amount', label: 'Số tiền', value: formatVnd(paymentInfo.amount), copy: paymentInfo.amount, strong: true },
      { key: 'content', label: 'Nội dung chuyển khoản', value: paymentInfo.payment_code, copy: paymentInfo.payment_code, highlight: true },
    ]
    : [];

  return (
    <div className="pay-page">
      <div className="pay-container">
        {/* Header */}
        <header className="pay-header">
          <button type="button" className="pay-back-btn" onClick={() => navigate(-1)} aria-label="Quay lại">
            <BackIcon />
          </button>
          <h1 className="pay-title">Thanh toán đơn hàng</h1>
        </header>

        {/* Expired state */}
        {isExpired && !isPaid && (
          <section className="pay-state-card pay-state-card--expired" role="alert">
            <div className="pay-state-icon pay-state-icon--expired"><ClockIcon /></div>
            <h2>Đơn hàng đã hết hạn thanh toán</h2>
            <p>Mã QR đã bị vô hiệu hóa. Nếu bạn đã chuyển khoản sau thời điểm này, hệ thống sẽ tự động tạo yêu cầu hoàn tiền.</p>
            <button type="button" className="pay-btn pay-btn--primary" onClick={() => navigate('/')}>Quay lại trang chủ</button>
          </section>
        )}

        {/* Fatal error */}
        {!isExpired && !isPaid && fatalError && !isLoading && (
          <section className="pay-state-card" role="alert">
            <h2>Không thể tải thông tin thanh toán</h2>
            <p>{fatalError}</p>
            <div className="pay-actions-row">
              <button type="button" className="pay-btn pay-btn--primary" onClick={loadQr}>Thử lại</button>
              <button type="button" className="pay-btn pay-btn--ghost" onClick={() => navigate('/my-bookings')}>Đơn của tôi</button>
            </div>
          </section>
        )}

        {/* Main content */}
        {!isExpired && !fatalError && (
          <div className="pay-layout">
            <div className="pay-col-left">
              {/* Khu vực 1: Order Summary */}
              <section className="pay-card" aria-label="Thông tin đơn hàng">
                <h2 className="pay-card-title">Thông tin đơn hàng</h2>
                {isLoading || !paymentInfo ? (
                  <div className="pay-skeleton-block">
                    <div className="pay-skeleton pay-skeleton--line" />
                    <div className="pay-skeleton pay-skeleton--line pay-skeleton--short" />
                    <div className="pay-skeleton pay-skeleton--amount" />
                  </div>
                ) : (
                  <>
                    <dl className="pay-summary-list">
                      <div className="pay-summary-row">
                        <dt>Khách sạn</dt>
                        <dd>{paymentInfo.hotel_name || '—'}</dd>
                      </div>
                      <div className="pay-summary-row">
                        <dt>Mã đơn hàng</dt>
                        <dd className="pay-mono">#{paymentInfo.booking_ref}</dd>
                      </div>
                    </dl>
                    <div className="pay-total">
                      <span className="pay-total-label">Tổng tiền thanh toán</span>
                      <span className="pay-total-amount">{formatVnd(paymentInfo.amount)}</span>
                    </div>
                  </>
                )}
              </section>

              {/* Khu vực 2: Countdown */}
              <section
                className={`pay-countdown ${remaining !== null && remaining <= 60 ? 'is-urgent' : ''}`}
                aria-live="polite"
              >
                <span className="pay-countdown-icon"><ClockIcon /></span>
                <div className="pay-countdown-text">
                  <span>Thời gian còn lại để thanh toán</span>
                  <strong className="pay-countdown-time">
                    {remaining === null ? '--:--' : formatCountdown(remaining)}
                  </strong>
                </div>
              </section>

              {/* Khu vực 4: Manual transfer */}
              <section className="pay-card" aria-label="Chuyển khoản thủ công">
                <h2 className="pay-card-title">Chuyển khoản thủ công</h2>
                <p className="pay-card-hint">Dùng khi bạn không quét được mã QR. Vui lòng nhập <b>chính xác</b> nội dung chuyển khoản.</p>
                {isLoading || !paymentInfo ? (
                  <div className="pay-skeleton-block">
                    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="pay-skeleton pay-skeleton--line" />)}
                  </div>
                ) : (
                  <ul className="pay-manual-list">
                    {manualRows.map((row) => (
                      <li key={row.key} className={`pay-manual-row ${row.highlight ? 'is-highlight' : ''}`}>
                        <span className="pay-manual-label">{row.label}</span>
                        <span className={`pay-manual-value ${row.strong ? 'is-strong' : ''} ${row.highlight ? 'pay-mono' : ''}`}>
                          {row.value}
                        </span>
                        {row.copy !== undefined ? (
                          <button
                            type="button"
                            className={`pay-copy-btn ${copiedField === row.key ? 'is-copied' : ''}`}
                            onClick={() => handleCopy(row.key, row.copy)}
                            aria-label={`Sao chép ${row.label}`}
                          >
                            {copiedField === row.key ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        ) : <span className="pay-copy-spacer" />}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Khu vực 3: QR */}
            <aside className="pay-col-right">
              <section className="pay-card pay-qr-card" aria-label="Mã QR thanh toán">
                <h2 className="pay-card-title pay-card-title--center">Quét mã QR để thanh toán</h2>
                <div className="pay-qr-frame">
                  {(isLoading || !paymentInfo || !qrImageLoaded) && (
                    <div className="pay-qr-loading" role="status" aria-label="Đang tải mã QR">
                      <div className="pay-spinner" />
                    </div>
                  )}
                  {paymentInfo && (
                    <img
                      src={paymentInfo.qr_url}
                      alt={`Mã QR VietQR thanh toán ${paymentInfo.payment_code}`}
                      className={`pay-qr-img ${qrImageLoaded ? 'is-visible' : ''}`}
                      onLoad={() => setQrImageLoaded(true)}
                      onError={() => showToast('Không tải được ảnh QR. Vui lòng dùng thông tin chuyển khoản thủ công.')}
                    />
                  )}
                </div>
                <p className="pay-qr-guide">Mở ứng dụng ngân hàng và quét mã QR</p>
                <div className="pay-waiting">
                  <span className="pay-waiting-dot" />
                  Đang chờ bạn thanh toán...
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>

      {/* Success overlay */}
      {isPaid && (
        <div className="pay-success-overlay" role="status" aria-live="assertive">
          <div className="pay-success-box">
            <svg className="pay-success-check" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="pay-success-circle" cx="26" cy="26" r="24" fill="none" />
              <path className="pay-success-tick" fill="none" d="M14 27l8 8 16-17" />
            </svg>
            <h2>Thanh toán thành công!</h2>
            <p>Đang chuyển đến trang xác nhận...</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div key={toast.id} className={`pay-toast pay-toast--${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PaymentQRScreen;
