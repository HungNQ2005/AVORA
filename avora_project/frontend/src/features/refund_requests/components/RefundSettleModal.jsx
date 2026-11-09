import React, { useEffect, useRef, useState } from 'react';
import {
  CloseIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../../common/components/icons';
import {
  fetchRefundPaymentQr,
  fetchRefundPaymentStatus,
} from '../../../services/refundRequestApi';

const POLL_INTERVAL_MS = 3000;
const POLL_FAILURE_WARN_THRESHOLD = 3;

const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VND`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const raw = String(value);
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
 * Modal chi trả hoàn tiền cho Khách hàng (mã AVRRF + 8 số):
 *  - Hiển thị VietQR + thông tin chuyển khoản để Business Manager quét bằng tài khoản công ty.
 *  - Tự động polling mỗi 3 giây; khi SePay xác nhận tiền ra (transferType = 'out') khớp mã AVRRF -> chuyển sang Đã hoàn tiền.
 *  - Phương án dự phòng: xác nhận thủ công bằng mã giao dịch ngân hàng (FT...).
 */
const RefundSettleModalContent = ({
  onClose,
  onConfirm,
  onSettled,
  onNeedBankUpdate,
  request,
  loading,
}) => {
  const refundId = request.refund_id;

  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState('');
  const [qrErrorCode, setQrErrorCode] = useState('');
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [settledInfo, setSettledInfo] = useState(null);
  const [pollFailures, setPollFailures] = useState(0);
  const [copiedKey, setCopiedKey] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [manualOpen, setManualOpen] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [note, setNote] = useState('');
  const [manualAck, setManualAck] = useState(false);

  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  // 1) Tải VietQR hoàn tiền (sinh idempotent mã AVRRFxxxxxxxx)
  useEffect(() => {
    const controller = new AbortController();

    fetchRefundPaymentQr(refundId, { signal: controller.signal })
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
        setQrError(err.message || 'Không thể tạo mã VietQR hoàn tiền.');
        setQrErrorCode(err.code || '');
      })
      .finally(() => {
        if (!controller.signal.aborted) setQrLoading(false);
      });

    return () => controller.abort();
  }, [refundId, reloadTick]);

  // 2) Polling trạng thái cho tới khi SePay báo tiền ra khớp AVRRFxxxxxxxx
  useEffect(() => {
    if (!qr || settledInfo) return undefined;

    let cancelled = false;
    let inFlight = false;
    const controller = new AbortController();

    const tick = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const status = await fetchRefundPaymentStatus(refundId, { signal: controller.signal });
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
  }, [refundId, qr, settledInfo]);

  const handleRetry = () => {
    setQrError('');
    setQrErrorCode('');
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
    onConfirm({ gateway_refund_ref: refCode.trim(), note: note.trim() });
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
      aria-labelledby="refund-settle-modal-title"
    >
      <div className="disbursement-modal" style={{ maxWidth: '760px' }}>
        <div
          className="disbursement-modal__header"
          style={{
            background: headerBackground,
            borderBottom: '2px solid rgba(255,255,255,0.25)',
          }}
        >
          <div className="disbursement-modal__header-info">
            <div
              className="disbursement-modal__icon"
              style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}
            >
              <CreditCardIcon size={20} />
            </div>
            <div>
              <h2 id="refund-settle-modal-title" className="disbursement-modal__title">
                {settledInfo ? 'Hoàn tiền thành công' : 'Thanh toán hoàn tiền khách hàng (VietQR)'}
              </h2>
              <p className="disbursement-modal__subtitle" style={{ color: '#E0F2FE' }}>
                {request.customer_name} · {formatCurrency(request.refund_amount)}
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
              Đang khởi tạo mã VietQR hoàn tiền (AVRRF)...
            </div>
          )}

          {!qrLoading && qrError && (
            <div className="disbursement-qr-banner disbursement-qr-banner--error" role="alert">
              <AlertTriangleIcon size={16} />
              <div>
                <strong>Không thể tạo mã VietQR hoàn tiền</strong>
                <div>{qrError}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                  {qrErrorCode === 'MISSING_BANK_INFO' && onNeedBankUpdate && (
                    <button
                      type="button"
                      className="disbursement-btn disbursement-btn--primary"
                      onClick={() => {
                        onClose();
                        onNeedBankUpdate(request);
                      }}
                    >
                      Cập nhật Ngân hàng & STK cho khách
                    </button>
                  )}
                  <button
                    type="button"
                    className="disbursement-btn disbursement-btn--outline"
                    onClick={handleRetry}
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {settledInfo && (
            <div className="disbursement-qr-success" role="status">
              <CheckCircleIcon size={56} />
              <h3>Đã xác nhận hoàn tiền thành công</h3>
              <p>
                Khoản hoàn {formatCurrency(request.refund_amount)} cho khách hàng{' '}
                <strong>{request.customer_name}</strong> đã được ghi nhận
                {settledInfo.settlement_source === 'MANUAL'
                  ? ' (xác nhận thủ công).'
                  : ' tự động qua SePay.'}
              </p>
              {settledInfo.gateway_refund_ref && (
                <p className="disbursement-qr-success__ref">
                  Mã giao dịch ngân hàng:{' '}
                  <span className="disbursement-mono">{settledInfo.gateway_refund_ref}</span>
                </p>
              )}
              {settledInfo.paid_at && <p>Thời gian hoàn tất: {formatDateTime(settledInfo.paid_at)}</p>}
            </div>
          )}

          {qr && !settledInfo && (
            <>
              <div className="disbursement-qr-banner disbursement-qr-banner--info">
                <AlertTriangleIcon size={16} />
                <div>
                  Quét mã VietQR bằng ứng dụng ngân hàng của{' '}
                  <strong>tài khoản công ty đã liên kết SePay</strong>. Giữ nguyên{' '}
                  <strong>số tiền</strong> và <strong>nội dung chuyển khoản ({qr.payment_code})</strong>{' '}
                  — khi tiền ra khớp cả hai, hệ thống sẽ tự động cập nhật sang Đã hoàn tiền.
                </div>
              </div>

              <div className="disbursement-qr-layout">
                <div className="disbursement-qr-image-box">
                  {qrImageFailed ? (
                    <div className="disbursement-qr-image-fallback">
                      Không tải được ảnh VietQR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
                    </div>
                  ) : (
                    <img
                      src={qr.qr_url}
                      alt={`Mã VietQR hoàn tiền ${formatCurrency(qr.amount)} cho ${qr.customer_name}`}
                      className="disbursement-qr-image"
                      onError={() => setQrImageFailed(true)}
                    />
                  )}
                </div>

                <div className="disbursement-preview-box">
                  <CopyRow label="Khách hàng" value={qr.customer_name} />
                  {qr.booking_code && <CopyRow label="Mã đơn đặt phòng" value={qr.booking_code} />}
                  <CopyRow label="Ngân hàng nhận" value={qr.bank.bank_name} />
                  <CopyRow
                    label="Số tài khoản"
                    value={qr.bank.account_number}
                    copyKey="account"
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                  <CopyRow label="Chủ tài khoản" value={qr.bank.account_holder} />
                  <CopyRow
                    label="Số tiền hoàn"
                    value={formatCurrency(qr.amount)}
                    copyValue={qr.amount}
                    copyKey="amount"
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                    emphasize
                  />
                  <CopyRow
                    label="Nội dung CK (AVRRF)"
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
                  : 'Đang chờ giao dịch tiền ra từ tài khoản công ty (SePay Webhook)... Bạn có thể đóng cửa sổ này, hệ thống vẫn tự xác nhận khi nhận được giao dịch.'}
              </div>

              <div className="disbursement-qr-manual">
                {!manualOpen ? (
                  <button
                    type="button"
                    className="disbursement-qr-link"
                    onClick={() => setManualOpen(true)}
                  >
                    Đã chuyển khoản nhưng hệ thống chưa tự xác nhận? Xác nhận thủ công bằng mã FT
                  </button>
                ) : (
                  <form onSubmit={handleManualSubmit} className="disbursement-qr-manual__form">
                    <div className="disbursement-form-group">
                      <label htmlFor="refund-settle-ref" className="disbursement-form-label">
                        Mã tham chiếu ngân hàng / Biên nhận chuyển khoản (bắt buộc)
                      </label>
                      <input
                        id="refund-settle-ref"
                        type="text"
                        className="disbursement-form-input"
                        placeholder="VD: FT26310987654"
                        maxLength={100}
                        value={refCode}
                        onChange={(e) => setRefCode(e.target.value)}
                      />
                    </div>
                    <div className="disbursement-form-group">
                      <label htmlFor="refund-settle-note" className="disbursement-form-label">
                        Ghi chú đối soát nội bộ (tùy chọn)
                      </label>
                      <textarea
                        id="refund-settle-note"
                        className="disbursement-form-textarea"
                        rows={2}
                        maxLength={500}
                        placeholder="VD: Đã chuyển khoản hoàn tiền cho khách qua TK dự phòng..."
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
                        {qr.bank.account_number} ({qr.bank.account_holder}). Hành động này không thể
                        hoàn tác.
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
                        <span>{loading ? 'Đang xác nhận...' : 'Xác nhận đã hoàn tiền'}</span>
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

const RefundSettleModal = ({ isOpen, request, ...rest }) => {
  if (!isOpen || !request) return null;
  return <RefundSettleModalContent key={request.refund_id} request={request} {...rest} />;
};

export default RefundSettleModal;

