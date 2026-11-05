import React, { useEffect, useRef, useState } from 'react';
import {
  CloseIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../../common/components/icons';
import {
  fetchDisbursementPaymentQr,
  fetchDisbursementPaymentStatus,
} from '../../../services/disbursementApi';

const POLL_INTERVAL_MS = 3000;
const POLL_FAILURE_WARN_THRESHOLD = 3;

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const raw = String(value);
  // DB trả timestamp không có múi giờ (UTC) -> ép UTC để hiển thị đúng giờ địa phương.
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = String(text);
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
};

const CopyRow = ({ label, value, copyValue, copyKey, copiedKey, onCopy, emphasize }) => (
  <div className="disbursement-qr-row">
    <span className="disbursement-preview-label">{label}</span>
    <span className="disbursement-qr-row__value">
      <strong
        className={`disbursement-mono${emphasize ? ' disbursement-qr-row__value--emphasis' : ''}`}
      >
        {value}
      </strong>
      {copyKey && (
        <button
          type="button"
          className="disbursement-copy-btn"
          onClick={() => onCopy(copyKey, copyValue ?? value)}
        >
          {copiedKey === copyKey ? 'Đã chép' : 'Sao chép'}
        </button>
      )}
    </span>
  </div>
);

/**
 * Modal chi trả giải ngân cho Vendor:
 *  - Hiển thị thông tin chuyển khoản + VietQR để BM quét bằng tài khoản công ty.
 *  - Tự động polling; khi SePay xác nhận tiền ra -> hiển thị thành công.
 *  - Phương án dự phòng: xác nhận thủ công (bắt buộc mã tham chiếu ngân hàng).
 */
const SettleModalContent = ({ onClose, onConfirm, onSettled, request, loading }) => {
  const requestId = request.withdrawal_id;

  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState('');
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [settledInfo, setSettledInfo] = useState(null);
  const [pollFailures, setPollFailures] = useState(0);
  const [copiedKey, setCopiedKey] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [manualOpen, setManualOpen] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [note, setNote] = useState('');
  const [manualAck, setManualAck] = useState(false);

  // Luôn gọi callback mới nhất mà không buộc effect chạy lại.
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  // 1) Tải thông tin QR mỗi lần mở modal (backend idempotent: cùng 1 mã cho cùng 1 yêu cầu).
  //    State được reset tự nhiên nhờ wrapper remount component theo withdrawal_id.
  useEffect(() => {
    const controller = new AbortController();

    fetchDisbursementPaymentQr(requestId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.is_settled) {
          setSettledInfo(data);
          onSettledRef.current?.(data);
        } else {
          setQr(data);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setQrError(err.message || 'Không thể tạo mã QR chi trả.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setQrLoading(false);
      });

    return () => controller.abort();
  }, [requestId, reloadTick]);

  // 2) Polling trạng thái cho tới khi SePay xác nhận (hoặc modal đóng).
  useEffect(() => {
    if (!qr || settledInfo) return undefined;

    let cancelled = false;
    let inFlight = false;
    const controller = new AbortController();

    const tick = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const status = await fetchDisbursementPaymentStatus(requestId, { signal: controller.signal });
        if (cancelled) return;
        setPollFailures(0);
        if (status.is_settled) {
          setSettledInfo(status);
          onSettledRef.current?.(status);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') setPollFailures((n) => n + 1);
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(tick, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [requestId, qr, settledInfo]);

  const handleRetry = () => {
    setQrError('');
    setQrLoading(true);
    setReloadTick((n) => n + 1);
  };

  const handleCopy = async (key, text) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedKey(key);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(''), 1500);
  };

  const canSubmitManual = refCode.trim().length > 0 && manualAck && !loading;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!canSubmitManual) return;
    onConfirm({ gateway_transaction_ref: refCode.trim(), note: note.trim() });
  };

  const headerBackground = settledInfo ? '#059669' : '#003580';

  return (
    <div
      className="disbursement-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-modal-title"
    >
      <div className="disbursement-modal" style={{ maxWidth: '760px' }}>
        <div
          className="disbursement-modal__header"
          style={{ background: headerBackground, borderBottom: '2px solid rgba(255,255,255,0.25)' }}
        >
          <div className="disbursement-modal__header-info">
            <div
              className="disbursement-modal__icon"
              style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}
            >
              <CreditCardIcon size={20} />
            </div>
            <div>
              <h2 id="settle-modal-title" className="disbursement-modal__title">
                {settledInfo ? 'Giải ngân thành công' : 'Chi trả giải ngân cho đối tác'}
              </h2>
              <p className="disbursement-modal__subtitle" style={{ color: '#E0F2FE' }}>
                {request.hotel_name} · {formatCurrency(request.amount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="disbursement-modal__close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="disbursement-modal__body">
          {qrLoading && (
            <div className="disbursement-qr-state" role="status">
              Đang tạo mã QR chi trả...
            </div>
          )}

          {!qrLoading && qrError && (
            <div className="disbursement-qr-banner disbursement-qr-banner--error" role="alert">
              <AlertTriangleIcon size={16} />
              <div>
                <strong>Không thể tạo mã QR chi trả</strong>
                <div>{qrError}</div>
                <button
                  type="button"
                  className="disbursement-btn disbursement-btn--outline"
                  style={{ marginTop: '0.6rem' }}
                  onClick={handleRetry}
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {settledInfo && (
            <div className="disbursement-qr-success" role="status">
              <CheckCircleIcon size={56} />
              <h3>Đã xác nhận giải ngân</h3>
              <p>
                Khoản chi {formatCurrency(request.amount)} cho <strong>{request.hotel_name}</strong> đã được ghi nhận
                {settledInfo.settlement_source === 'MANUAL' ? ' (xác nhận thủ công).' : ' tự động qua SePay.'}
              </p>
              {settledInfo.gateway_transaction_ref && (
                <p className="disbursement-qr-success__ref">
                  Mã giao dịch: <span className="disbursement-mono">{settledInfo.gateway_transaction_ref}</span>
                </p>
              )}
              {settledInfo.paid_at && <p>Thời gian: {formatDateTime(settledInfo.paid_at)}</p>}
            </div>
          )}

          {qr && !settledInfo && (
            <>
              <div className="disbursement-qr-banner disbursement-qr-banner--info">
                <AlertTriangleIcon size={16} />
                <div>
                  Quét mã bằng ứng dụng ngân hàng của <strong>tài khoản công ty đã liên kết SePay</strong>. Giữ
                  nguyên <strong>số tiền</strong> và <strong>nội dung chuyển khoản</strong> — sai một trong hai thì
                  hệ thống sẽ không tự xác nhận.
                </div>
              </div>

              {!qr.bank.is_verified && (
                <div className="disbursement-qr-banner disbursement-qr-banner--warn" role="alert">
                  <AlertTriangleIcon size={16} />
                  <div>
                    Tài khoản ngân hàng này <strong>chưa được xác minh</strong>. Hãy đối chiếu thông tin với đối
                    tác trước khi chuyển tiền.
                  </div>
                </div>
              )}

              <div className="disbursement-qr-layout">
                <div className="disbursement-qr-image-box">
                  {qrImageFailed ? (
                    <div className="disbursement-qr-image-fallback">
                      Không tải được ảnh QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
                    </div>
                  ) : (
                    <img
                      src={qr.qr_url}
                      alt={`Mã VietQR chi trả ${formatCurrency(qr.amount)} cho ${qr.hotel_name}`}
                      className="disbursement-qr-image"
                      onError={() => setQrImageFailed(true)}
                    />
                  )}
                </div>

                <div className="disbursement-preview-box">
                  <CopyRow label="Khách sạn" value={qr.hotel_name} />
                  <CopyRow label="Ngân hàng" value={qr.bank.bank_name} />
                  <CopyRow
                    label="Số tài khoản"
                    value={qr.bank.account_number}
                    copyKey="account"
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                  <CopyRow label="Chủ tài khoản" value={qr.bank.account_holder} />
                  <CopyRow
                    label="Số tiền"
                    value={formatCurrency(qr.amount)}
                    copyValue={qr.amount}
                    copyKey="amount"
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                    emphasize
                  />
                  <CopyRow
                    label="Nội dung CK"
                    value={qr.transfer_content}
                    copyKey="content"
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                    emphasize
                  />
                </div>
              </div>

              <div className="disbursement-qr-waiting" role="status" aria-live="polite">
                <span className="disbursement-qr-waiting__dot" aria-hidden="true" />
                {pollFailures >= POLL_FAILURE_WARN_THRESHOLD
                  ? 'Mất kết nối tới máy chủ, đang thử lại...'
                  : 'Đang chờ giao dịch từ tài khoản công ty... Bạn có thể đóng cửa sổ này, hệ thống vẫn tự xác nhận khi nhận được giao dịch.'}
              </div>

              <div className="disbursement-qr-manual">
                {!manualOpen ? (
                  <button
                    type="button"
                    className="disbursement-qr-link"
                    onClick={() => setManualOpen(true)}
                  >
                    Đã chuyển khoản nhưng hệ thống chưa tự xác nhận? Xác nhận thủ công
                  </button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="disbursement-qr-manual__form">
                    <div className="disbursement-form-group">
                      <label htmlFor="settle-ref" className="disbursement-form-label">
                        Mã tham chiếu ngân hàng / Biên nhận chuyển khoản (bắt buộc)
                      </label>
                      <input
                        id="settle-ref"
                        type="text"
                        className="disbursement-form-input"
                        placeholder="VD: FT26309123456"
                        maxLength={100}
                        value={refCode}
                        onChange={(e) => setRefCode(e.target.value)}
                      />
                    </div>
                    <div className="disbursement-form-group">
                      <label htmlFor="settle-note" className="disbursement-form-label">
                        Ghi chú nội bộ (tùy chọn)
                      </label>
                      <textarea
                        id="settle-note"
                        className="disbursement-form-textarea"
                        rows={2}
                        maxLength={500}
                        placeholder="VD: Chuyển bằng tài khoản dự phòng, đã đối soát sao kê..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    <label className="disbursement-qr-ack">
                      <input
                        type="checkbox"
                        checked={manualAck}
                        onChange={(e) => setManualAck(e.target.checked)}
                      />
                      <span>
                        Tôi xác nhận đã chuyển đúng {formatCurrency(qr.amount)} tới tài khoản{' '}
                        {qr.bank.account_number}. Hành động này không thể hoàn tác.
                      </span>
                    </label>
                    <div className="disbursement-qr-manual__actions">
                      <button
                        type="button"
                        className="disbursement-btn disbursement-btn--outline"
                        onClick={() => setManualOpen(false)}
                        disabled={loading}
                      >
                        Thu gọn
                      </button>
                      <button
                        type="submit"
                        className="disbursement-btn disbursement-btn--success"
                        disabled={!canSubmitManual}
                      >
                        <CreditCardIcon size={16} />
                        <span>{loading ? 'Đang xác nhận...' : 'Xác nhận đã chi trả'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        <div className="disbursement-modal__footer">
          <button
            type="button"
            className="disbursement-btn disbursement-btn--outline"
            onClick={onClose}
            disabled={loading}
          >
            {settledInfo ? 'Đóng' : 'Hủy bỏ'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DisbursementSettleModal = ({ isOpen, request, ...rest }) => {
  if (!isOpen || !request) return null;
  // key theo withdrawal_id: mở yêu cầu khác => remount, toàn bộ state (QR, polling, form thủ công) được reset.
  return <SettleModalContent key={request.withdrawal_id} request={request} {...rest} />;
};

export default DisbursementSettleModal;
