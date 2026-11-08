import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  claimPaymentGroupMember,
  fetchPaymentGroupByHash,
  payRemainingGroupAmount,
} from '../../../services/paymentApi';
import './payment.css';

const POLL_INTERVAL_MS = 3000;

const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

const formatHmsCountdown = (totalSeconds) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const GroupPaymentRoomPage = () => {
  const { inviteHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [toast, setToast] = useState(null);

  // Active member slot modal for claiming & scanning QR
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [payingRemaining, setPayingRemaining] = useState(false);

  const deadlineRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadRoom = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await fetchPaymentGroupByHash(inviteHash);
        setGroup(data);
        setErrorMsg('');
        if (typeof data.remaining_seconds === 'number') {
          deadlineRef.current = Date.now() + data.remaining_seconds * 1000;
          setRemainingSeconds(data.remaining_seconds);
        }
      } catch (err) {
        if (!silent) {
          setErrorMsg(
            err.message || 'Không tìm thấy phòng thanh toán nhóm hoặc liên kết không hợp lệ.'
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [inviteHash]
  );

  useEffect(() => {
    loadRoom(false);
  }, [loadRoom]);

  // Countdown timer
  useEffect(() => {
    if (!group || group.is_completed || group.is_expired) return undefined;
    const tick = () => {
      if (!deadlineRef.current) return;
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(left);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [group]);

  // Real-time polling every 3s
  useEffect(() => {
    if (!group || group.is_completed || group.is_expired) return undefined;
    const timer = setInterval(() => {
      loadRoom(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [group, loadRoom]);

  const selectedMember = useMemo(() => {
    if (!group || !selectedMemberId) return null;
    return (group.members || []).find((m) => String(m.member_id) === String(selectedMemberId)) || null;
  }, [group, selectedMemberId]);

  const handleOpenMemberQr = (member) => {
    setSelectedMemberId(member.member_id);
    setClaimName(member.member_name || '');
    setClaimPhone(member.phone || '');
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!claimName.trim() || claimName.trim().length < 2) {
      showToast('Vui lòng nhập họ tên người đóng suất này (tối thiểu 2 ký tự).', 'error');
      return;
    }
    setClaiming(true);
    try {
      const updated = await claimPaymentGroupMember(inviteHash, selectedMember.member_id, {
        member_name: claimName.trim(),
        phone: claimPhone.trim() || null,
      });
      setGroup(updated);
      showToast('Đã cập nhật thông tin người đóng tiền cho suất này!', 'info');
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật thông tin suất đóng tiền.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleHostPayRemaining = async () => {
    if (!group) return;
    setPayingRemaining(true);
    try {
      const res = await payRemainingGroupAmount(group.group_id);
      if (res?.group) {
        setGroup(res.group);
      } else {
        await loadRoom(true);
      }
      if (res?.remaining_slot?.member_id) {
        setSelectedMemberId(res.remaining_slot.member_id);
        setClaimName(res.remaining_slot.member_name || user?.full_name || '');
        setClaimPhone(user?.phone || '');
      }
      showToast('Đã gom phần tiền còn thiếu vào 1 mã QR để bạn thanh toán nốt!', 'info');
    } catch (err) {
      showToast(err.message || 'Không thể gom phần tiền còn thiếu.', 'error');
    } finally {
      setPayingRemaining(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/payment/group/${inviteHash}`;
  }, [inviteHash]);

  const handleCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? '' : cur)), 1800);
    } catch {
      showToast('Không thể sao chép tự động. Vui lòng bôi đen để sao chép.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="pay-page">
        <div className="pay-container" style={{ textAlign: 'center', padding: '64px 16px' }}>
          <div className="pay-spinner" style={{ margin: '0 auto 14px' }} />
          <p>Đang tải phòng thanh toán nhóm...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !group) {
    return (
      <div className="pay-page">
        <div className="pay-container" style={{ maxWidth: 640 }}>
          <section className="pay-state-card" role="alert">
            <h2>Không tìm thấy phòng thanh toán nhóm</h2>
            <p>{errorMsg}</p>
            <button type="button" className="pay-btn pay-btn--primary" onClick={() => navigate('/')}>
              Về trang chủ Avora
            </button>
          </section>
        </div>
      </div>
    );
  }

  const isHost = Boolean(user && String(user.user_id) === String(group.host_user_id));
  const paidCount = (group.members || []).filter((m) => m.is_paid).length;
  const totalMembers = (group.members || []).length;
  const progressPct = Math.min(100, Number(group.progress_percent || 0));
  const isExpiredState =
    group.is_expired ||
    group.share_status_name === 'EXP' ||
    group.share_status_name === 'CAN' ||
    (remainingSeconds !== null && remainingSeconds <= 0 && !group.is_completed);

  return (
    <div className="pay-page">
      <div className="pay-container" style={{ maxWidth: 960 }}>
        {/* Top bar */}
        <header className="pay-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user && (
              <button
                type="button"
                className="pay-back-btn"
                onClick={() => navigate('/my-bookings')}
                aria-label="Đơn đặt chỗ của tôi"
              >
                ‹
              </button>
            )}
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                PHÒNG CHIA TIỀN THANH TOÁN NHÓM #{group.booking_code}
              </span>
              <h1 className="pay-title" style={{ margin: 0 }}>
                {group.hotel?.name || 'Khách sạn Avora'}
              </h1>
            </div>
          </div>

          {isHost && !group.is_completed && !isExpiredState && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {group.can_edit_split && (
                <button
                  type="button"
                  className="pay-btn pay-btn--ghost"
                  onClick={() => navigate(`/payment/group/setup/${group.booking_id}`)}
                >
                  Chỉnh sửa cách chia tiền
                </button>
              )}
              {group.total_collected > 0 && group.remaining_amount > 0 && (
                <button
                  type="button"
                  className="pay-btn pay-btn--primary"
                  onClick={handleHostPayRemaining}
                  disabled={payingRemaining}
                  style={{ background: '#059669' }}
                >
                  {payingRemaining
                    ? 'Đang gom phần còn lại...'
                    : `Đóng nốt phần còn thiếu (${formatVnd(group.remaining_amount)})`}
                </button>
              )}
            </div>
          )}
        </header>

        {/* Celebratory Banner when 100% Completed */}
        {group.is_completed && (
          <section
            className="pay-card"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#fff',
              marginBottom: 20,
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>
              Nhóm đã thanh toán đủ 100%! Đơn đặt phòng đã được xác nhận!
            </h2>
            <p style={{ margin: '0 0 16px', opacity: 0.95, fontSize: 14.5 }}>
              Tổng số tiền <strong>{formatVnd(group.total_collected)}</strong> đã được hệ thống ghi nhận đầy đủ.
              Chúc cả nhóm có một kỳ nghỉ tuyệt vời tại <strong>{group.hotel?.name}</strong>!
            </p>
            {user && (
              <button
                type="button"
                onClick={() => navigate('/my-bookings')}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#fff',
                  color: '#047857',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Xem đơn đặt chỗ đã xác nhận
              </button>
            )}
          </section>
        )}

        {/* Expired Banner */}
        {!group.is_completed && isExpiredState && (
          <section
            className="pay-card"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              marginBottom: 20,
              padding: '20px 24px',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>
              Phiên thanh toán nhóm 2 giờ đã kết thúc hoặc đơn đã hủy
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
              {group.total_collected > 0
                ? `Nhóm đã đóng được ${formatVnd(group.total_collected)} / ${formatVnd(group.total_required)} trước khi hết hạn. Hệ thống đã tự động tạo 1 yêu cầu hoàn trả toàn bộ ${formatVnd(group.total_collected)} về tài khoản ngân hàng của Trưởng nhóm (${group.host_name || group.guest_name}).`
                : 'Đơn đặt phòng đã hết thời gian giữ chỗ 2 giờ và đã được hệ thống tự động hủy.'}
            </p>
          </section>
        )}

        {/* Progress + Invite Link + Countdown */}
        <section className="pay-card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                Trưởng nhóm: <strong>{group.host_name || group.guest_name}</strong> • Lưu trú:{' '}
                <strong>
                  {group.stay?.check_in_date || '—'} → {group.stay?.check_out_date || '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#003580' }}>
                  {formatVnd(group.total_collected)}
                </span>
                <span style={{ fontSize: 14, color: '#64748b' }}>
                  / {formatVnd(group.total_required)} ({progressPct}%)
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  height: 12,
                  background: '#e2e8f0',
                  borderRadius: 999,
                  overflow: 'hidden',
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: group.is_completed ? '#059669' : '#003580',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  color: '#475569',
                  marginTop: 6,
                }}
              >
                <span>
                  Đã hoàn tất: <strong>{paidCount}/{totalMembers} suất</strong>
                </span>
                <span>
                  Còn thiếu: <strong>{formatVnd(group.remaining_amount)}</strong>
                </span>
              </div>
            </div>

            {/* Countdown + Share link */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              {!group.is_completed && !isExpiredState && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: '1px dashed #cbd5e1',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                    ⏳ Thời gian giữ phòng còn lại:
                  </span>
                  <strong
                    style={{
                      fontSize: 18,
                      fontFamily: 'monospace',
                      color: remainingSeconds !== null && remainingSeconds < 600 ? '#dc2626' : '#003580',
                    }}
                  >
                    {remainingSeconds === null ? '--:--:--' : formatHmsCountdown(remainingSeconds)}
                  </strong>
                </div>
              )}

              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Link mời bạn bè vào đóng tiền (Không cần tạo tài khoản):
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    background: '#fff',
                    color: '#1e293b',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCopy('share_url', shareUrl)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: copiedKey === 'share_url' ? '#059669' : '#003580',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedKey === 'share_url' ? '✓ Đã chép link' : 'Sao chép link'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Member slots list */}
        <section className="pay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="pay-card-title" style={{ margin: 0 }}>
              Danh sách các suất đóng tiền trong nhóm ({totalMembers} suất)
            </h2>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Tự động cập nhật trạng thái mỗi 3 giây
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {(group.members || []).map((member, idx) => {
              const isPaidSlot = Boolean(member.is_paid);
              return (
                <div
                  key={member.member_id}
                  style={{
                    borderRadius: 12,
                    border: isPaidSlot ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                    background: isPaidSlot ? '#f0fdf4' : '#fff',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: idx === 0 ? '#dbeafe' : '#f1f5f9',
                          color: idx === 0 ? '#1e40af' : '#475569',
                        }}
                      >
                        Suất #{idx + 1} {idx === 0 ? '• Trưởng nhóm' : ''}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: isPaidSlot ? '#16a34a' : '#fef3c7',
                          color: isPaidSlot ? '#fff' : '#b45309',
                        }}
                      >
                        {isPaidSlot ? '✓ Đã thanh toán' : 'Chờ đóng tiền'}
                      </span>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {member.member_name || `Thành viên #${idx + 1}`}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                      {member.phone ? `SĐT: ${member.phone}` : 'Chưa điền số điện thoại'}
                    </div>
                  </div>

                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>Số tiền suất này</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isPaidSlot ? '#15803d' : '#003580' }}>
                        {formatVnd(member.amount_assigned)}
                      </div>
                    </div>

                    {!isPaidSlot && !isExpiredState && !group.is_completed && (
                      <button
                        type="button"
                        onClick={() => handleOpenMemberQr(member)}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#003580',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Đóng suất này
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modal Quét QR & Cập nhật Tên/SĐT cho suất đã chọn */}
      {selectedMember && (
        <div
          className="booking-modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 540,
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1e40af',
                    background: '#dbeafe',
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  Mã thanh toán riêng: {selectedMember.payment_code}
                </span>
                <h3 style={{ margin: '6px 0 0', fontSize: 19, color: '#0f172a' }}>
                  Thanh toán phần của {selectedMember.member_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {selectedMember.is_paid ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#166534',
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 8 }}>✓</div>
                <h4 style={{ margin: '0 0 6px', fontSize: 18 }}>
                  Suất này đã được thanh toán thành công!
                </h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Hệ thống đã ghi nhận đủ <strong>{formatVnd(selectedMember.amount_assigned)}</strong> cho suất của{' '}
                  <strong>{selectedMember.member_name}</strong>.
                </p>
              </div>
            ) : (
              <>
                {/* Form xác nhận/cập nhật Tên & SĐT người đóng */}
                <form
                  onSubmit={handleClaimSubmit}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    1. Xác nhận tên &amp; số điện thoại của bạn trên suất này:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Họ và tên của bạn"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13.5,
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Số điện thoại"
                      value={claimPhone}
                      onChange={(e) => setClaimPhone(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13.5,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={claiming}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#003580',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {claiming ? 'Đang lưu...' : 'Lưu tên'}
                    </button>
                  </div>
                </form>

                {/* QR Image */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    2. Mở App Ngân hàng quét mã VietQR dưới đây:
                  </div>
                  {selectedMember.qr_url && (
                    <img
                      src={selectedMember.qr_url}
                      alt={`VietQR ${selectedMember.payment_code}`}
                      style={{
                        width: 240,
                        height: 240,
                        objectFit: 'contain',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 8,
                        background: '#fff',
                      }}
                    />
                  )}
                </div>

                {/* Manual transfer details */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13.5,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ color: '#64748b' }}>Ngân hàng nhận:</span>
                    <strong>{group.bank_info?.bank_code}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                    <strong>{group.bank_info?.account_holder}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                    <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontFamily: 'monospace' }}>{group.bank_info?.account_number}</strong>
                      <button
                        type="button"
                        onClick={() => handleCopy('acc', group.bank_info?.account_number)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11.5,
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === 'acc' ? '✓' : 'Chép'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                    <span style={{ color: '#64748b' }}>Số tiền cần chuyển:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: '#003580', fontSize: 15 }}>
                        {formatVnd(selectedMember.amount_assigned)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleCopy('amt', selectedMember.amount_assigned)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11.5,
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === 'amt' ? '✓' : 'Chép'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                    <span style={{ color: '#64748b' }}>Nội dung chuyển khoản:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong
                        style={{
                          fontFamily: 'monospace',
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {selectedMember.payment_code}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleCopy('code', selectedMember.payment_code)}
                        style={{
                          padding: '2px 8px',
                          fontSize: 11.5,
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === 'code' ? '✓' : 'Chép'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`pay-toast pay-toast--${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default GroupPaymentRoomPage;

