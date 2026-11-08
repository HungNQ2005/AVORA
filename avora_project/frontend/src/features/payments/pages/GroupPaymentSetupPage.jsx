import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchBookingById } from '../../../services/bookingApi';
import {
  createOrUpdatePaymentGroup,
  fetchPaymentGroupByBooking,
} from '../../../services/paymentApi';
import './payment.css';

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 10;
const MIN_MEMBER_AMOUNT = 10000;

const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

const buildEqualSplitAmounts = (totalAmount, count) => {
  const total = Math.round(Number(totalAmount || 0));
  const n = Math.max(MIN_MEMBERS, Math.min(MAX_MEMBERS, Number(count) || 2));
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, idx) => (idx < remainder ? base + 1 : base));
};

const GroupPaymentSetupPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState(null);
  const [existingGroup, setExistingGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [splitMode, setSplitMode] = useState('EQUAL'); // 'EQUAL' | 'CUSTOM'
  const [memberCount, setMemberCount] = useState(2);
  const [members, setMembers] = useState([]);

  const initMembers = useCallback(
    (totalAmount, count, currentMembers = [], hostUser = null) => {
      const equalAmounts = buildEqualSplitAmounts(totalAmount, count);
      return Array.from({ length: count }, (_, idx) => {
        const existing = currentMembers[idx];
        const isHostSlot = idx === 0;
        return {
          member_name:
            existing?.member_name ??
            (isHostSlot
              ? hostUser?.full_name || 'Trưởng nhóm'
              : `Thành viên #${idx + 1}`),
          phone:
            existing?.phone ??
            (isHostSlot ? hostUser?.phone || '' : ''),
          user_id: isHostSlot ? hostUser?.user_id || null : existing?.user_id || null,
          amount_assigned: equalAmounts[idx] || 0,
        };
      });
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/signin');
      return;
    }

    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [bookingData, groupData] = await Promise.all([
          fetchBookingById(bookingId),
          fetchPaymentGroupByBooking(bookingId).catch(() => null),
        ]);
        if (cancelled) return;

        if (groupData && !groupData.can_edit_split) {
          // Đã có người đóng tiền hoặc nhóm đã hoàn tất -> chuyển thẳng sang phòng thanh toán nhóm
          navigate(`/payment/group/${groupData.invite_link_hash}`, { replace: true });
          return;
        }

        setBooking(bookingData);
        setExistingGroup(groupData);

        const total = Math.round(Number(bookingData?.total_amount || 0));
        if (groupData && Array.isArray(groupData.members) && groupData.members.length >= MIN_MEMBERS) {
          const loadedMembers = groupData.members.map((m) => ({
            member_name: m.member_name || '',
            phone: m.phone || '',
            user_id: m.user_id || null,
            amount_assigned: Math.round(Number(m.amount_assigned || 0)),
          }));
          setMemberCount(loadedMembers.length);
          setMembers(loadedMembers);
          const equalCheck = buildEqualSplitAmounts(total, loadedMembers.length);
          const isEqual = loadedMembers.every((m, idx) => m.amount_assigned === equalCheck[idx]);
          setSplitMode(isEqual ? 'EQUAL' : 'CUSTOM');
        } else {
          const initialList = initMembers(total, 2, [], user);
          setMemberCount(2);
          setMembers(initialList);
          setSplitMode('EQUAL');
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Không thể tải thông tin đơn đặt phòng.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, bookingId, navigate, initMembers]);

  const totalAmount = useMemo(
    () => Math.round(Number(booking?.total_amount || 0)),
    [booking]
  );

  const handleMemberCountChange = (newCountRaw) => {
    const count = Math.max(MIN_MEMBERS, Math.min(MAX_MEMBERS, Number(newCountRaw) || 2));
    setMemberCount(count);
    const equalAmounts = buildEqualSplitAmounts(totalAmount, count);
    setMembers((prev) =>
      Array.from({ length: count }, (_, idx) => {
        const cur = prev[idx];
        const isHostSlot = idx === 0;
        return {
          member_name:
            cur?.member_name ??
            (isHostSlot ? user?.full_name || 'Trưởng nhóm' : `Thành viên #${idx + 1}`),
          phone: cur?.phone ?? (isHostSlot ? user?.phone || '' : ''),
          user_id: isHostSlot ? user?.user_id || null : cur?.user_id || null,
          amount_assigned:
            splitMode === 'EQUAL'
              ? equalAmounts[idx]
              : cur?.amount_assigned ?? equalAmounts[idx],
        };
      })
    );
  };

  const handleSwitchSplitMode = (mode) => {
    setSplitMode(mode);
    if (mode === 'EQUAL') {
      const equalAmounts = buildEqualSplitAmounts(totalAmount, memberCount);
      setMembers((prev) =>
        prev.map((m, idx) => ({
          ...m,
          amount_assigned: equalAmounts[idx],
        }))
      );
    }
  };

  const handleMemberFieldChange = (index, field, value) => {
    setMembers((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'amount_assigned') {
          const digits = String(value).replace(/[^\d]/g, '');
          return { ...item, amount_assigned: digits ? Number(digits) : 0 };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const allocatedSum = useMemo(
    () => members.reduce((sum, m) => sum + Math.round(Number(m.amount_assigned || 0)), 0),
    [members]
  );
  const diffAmount = totalAmount - allocatedSum;

  const validationError = useMemo(() => {
    if (!totalAmount) return null;
    if (members.length < MIN_MEMBERS || members.length > MAX_MEMBERS) {
      return `Số lượng thành viên phải từ ${MIN_MEMBERS} đến ${MAX_MEMBERS} người.`;
    }
    for (let i = 0; i < members.length; i += 1) {
      const amt = Math.round(Number(members[i].amount_assigned || 0));
      if (!Number.isSafeInteger(amt) || amt < MIN_MEMBER_AMOUNT) {
        return `Số tiền của Thành viên #${i + 1} phải tối thiểu ${formatVnd(MIN_MEMBER_AMOUNT)}.`;
      }
    }
    if (allocatedSum !== totalAmount) {
      return `Tổng tiền các thành viên (${formatVnd(allocatedSum)}) chưa khớp với tổng đơn hàng (${formatVnd(totalAmount)}).`;
    }
    return null;
  }, [totalAmount, members, allocatedSum]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        booking_id: bookingId,
        split_mode: splitMode,
        member_count: memberCount,
        members: members.map((m, idx) => ({
          member_name: String(m.member_name || '').trim() || `Thành viên #${idx + 1}`,
          phone: String(m.phone || '').trim() || null,
          user_id: m.user_id || null,
          amount_assigned: Math.round(Number(m.amount_assigned || 0)),
        })),
      };
      const group = await createOrUpdatePaymentGroup(payload);
      navigate(`/payment/group/${group.invite_link_hash}`);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể khởi tạo nhóm thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="pay-page">
        <div className="pay-container" style={{ textAlign: 'center', padding: '60px 16px' }}>
          <div className="pay-spinner" style={{ margin: '0 auto 14px' }} />
          <p>Đang chuẩn bị cấu hình chia tiền thanh toán nhóm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <div className="pay-container" style={{ maxWidth: 880 }}>
        <header className="pay-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="pay-back-btn"
              onClick={() => navigate(`/payment/${bookingId}`)}
              aria-label="Quay lại thanh toán 1 mình"
            >
              ‹
            </button>
            <div>
              <h1 className="pay-title" style={{ margin: 0 }}>
                {existingGroup ? 'Chỉnh sửa chia tiền thanh toán nhóm' : 'Thiết lập chia tiền thanh toán nhóm'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748b' }}>
                Hệ thống tự động giữ phòng <strong>2 giờ</strong> để các thành viên trong nhóm quét mã VietQR đóng tiền.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="pay-btn pay-btn--ghost"
            onClick={() => navigate(`/payment/${bookingId}`)}
          >
            Chuyển về Thanh toán 1 mình
          </button>
        </header>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 18,
              fontSize: 14,
            }}
          >
            {errorMsg}
          </div>
        )}

        {booking && (
          <form onSubmit={handleSubmit}>
            {/* Summary banner */}
            <section
              className="pay-card"
              style={{
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                background: 'linear-gradient(135deg, #003580 0%, #1e40af 100%)',
                color: '#fff',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Đơn đặt phòng #{String(booking.booking_id || '').slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  {booking.m_hotel?.name || 'Khách sạn Avora'}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                  Khách đại diện: <strong>{booking.guest_name}</strong> ({booking.guest_phone})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12.5, opacity: 0.85 }}>Tổng số tiền cần chia</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fde047' }}>
                  {formatVnd(totalAmount)}
                </div>
              </div>
            </section>

            {/* Configuration controls */}
            <section className="pay-card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <label
                    htmlFor="group-member-count"
                    style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}
                  >
                    Số lượng thành viên chia tiền (2 – 10 người)
                  </label>
                  <select
                    id="group-member-count"
                    value={memberCount}
                    onChange={(e) => handleMemberCountChange(e.target.value)}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14.5,
                      fontWeight: 600,
                    }}
                  >
                    {Array.from({ length: MAX_MEMBERS - MIN_MEMBERS + 1 }, (_, i) => i + MIN_MEMBERS).map(
                      (num) => (
                        <option key={num} value={num}>
                          {num} thành viên ({formatVnd(Math.floor(totalAmount / num))} / người)
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                    Hình thức phân bổ số tiền
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('EQUAL')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: splitMode === 'EQUAL' ? '2px solid #003580' : '1px solid #cbd5e1',
                        background: splitMode === 'EQUAL' ? '#eff6ff' : '#fff',
                        color: splitMode === 'EQUAL' ? '#003580' : '#475569',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer',
                      }}
                    >
                      Chia đều tự động
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('CUSTOM')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: splitMode === 'CUSTOM' ? '2px solid #003580' : '1px solid #cbd5e1',
                        background: splitMode === 'CUSTOM' ? '#eff6ff' : '#fff',
                        color: splitMode === 'CUSTOM' ? '#003580' : '#475569',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer',
                      }}
                    >
                      Tự nhập từng người
                    </button>
                  </div>
                </div>
              </div>

              {/* Member rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map((member, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '42px 1.3fr 1fr 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: idx === 0 ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      background: idx === 0 ? '#f8fafc' : '#fff',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: idx === 0 ? '#003580' : '#e2e8f0',
                        color: idx === 0 ? '#fff' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      #{idx + 1}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>
                        {idx === 0 ? 'Tên trưởng nhóm (Bạn)' : `Tên thành viên #${idx + 1} (Không bắt buộc)`}
                      </label>
                      <input
                        type="text"
                        value={member.member_name}
                        onChange={(e) => handleMemberFieldChange(idx, 'member_name', e.target.value)}
                        placeholder={`Thành viên #${idx + 1}`}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13.5,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>
                        Số điện thoại (Tùy chọn)
                      </label>
                      <input
                        type="tel"
                        value={member.phone}
                        onChange={(e) => handleMemberFieldChange(idx, 'phone', e.target.value)}
                        placeholder="Bạn bè tự điền sau cũng được"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13.5,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>
                        Số tiền cần đóng (VNĐ)
                      </label>
                      <input
                        type="text"
                        value={Number(member.amount_assigned || 0).toLocaleString('vi-VN')}
                        onChange={(e) => handleMemberFieldChange(idx, 'amount_assigned', e.target.value)}
                        readOnly={splitMode === 'EQUAL'}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#003580',
                          background: splitMode === 'EQUAL' ? '#f1f5f9' : '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Allocation check bar */}
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: diffAmount === 0 ? '#f0fdf4' : '#fef2f2',
                  border: diffAmount === 0 ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13.5, color: diffAmount === 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
                  {diffAmount === 0
                    ? '✓ Tổng số tiền các thành viên đã khớp 100% với tổng giá trị đơn hàng.'
                    : diffAmount > 0
                      ? `Còn thiếu ${formatVnd(diffAmount)} chưa được phân bổ.`
                      : `Đang vượt quá tổng đơn hàng ${formatVnd(Math.abs(diffAmount))}.`}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  Đã chia: {formatVnd(allocatedSum)} / {formatVnd(totalAmount)}
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="pay-btn pay-btn--ghost"
                onClick={() =>
                  existingGroup
                    ? navigate(`/payment/group/${existingGroup.invite_link_hash}`)
                    : navigate(`/payment/${bookingId}`)
                }
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="pay-btn pay-btn--primary"
                disabled={submitting || Boolean(validationError)}
              >
                {submitting
                  ? 'Đang khởi tạo...'
                  : existingGroup
                    ? 'Lưu thay đổi chia tiền'
                    : 'Tạo phòng & Lấy link chia tiền'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GroupPaymentSetupPage;
