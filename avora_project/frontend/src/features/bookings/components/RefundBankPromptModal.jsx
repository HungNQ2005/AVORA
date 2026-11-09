import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../../../constants/apiEndpoints';
import { getProfile, updateProfile } from '../../../services/authService';
import { codeNameParser } from '../../../utils/codeNameParser';

const removeVietnameseDiacritics = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

/**
 * Modal nhắc khách hàng cập nhật STK hoàn tiền mặc định (m_user) trước khi tạo booking
 * nếu 3 trường refund_bank_cd, refund_account_number, refund_account_holder đang NULL.
 * Cho phép lưu vào hồ sơ hoặc Bỏ qua kèm cảnh báo liên hệ CSKH qua Support Ticket.
 */
const RefundBankPromptModal = ({
  isOpen,
  user,
  onClose,
  onSkipAndContinue,
  onSavedAndContinue,
}) => {
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankCd, setBankCd] = useState(user?.refund_bank_cd || '');
  const [accountNumber, setAccountNumber] = useState(user?.refund_account_number || '');
  const [accountHolder, setAccountHolder] = useState(user?.refund_account_holder || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBankCd(user?.refund_bank_cd || '');
    setAccountNumber(user?.refund_account_number || '');
    setAccountHolder(
      user?.refund_account_holder ||
        removeVietnameseDiacritics(user?.full_name || '').toUpperCase()
    );
    setErrorMsg('');

    let cancelled = false;
    const loadBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch(API_ENDPOINTS.BOOKING_BANKS);
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled && list.length > 0) {
          setBanks(list);
          setLoadingBanks(false);
          return;
        }
      } catch {
        // Fallback to SYSTEM_CODES
      }

      try {
        const res = await fetch(`${API_ENDPOINTS.SYSTEM_CODES}?business_cd=BANK_CD`);
        const json = await res.json();
        const rawList = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setBanks(
            rawList.map((b) => ({
              bank_cd: b.code_cd,
              code_cd: b.code_cd,
              code_name: b.code_name,
              short_name: codeNameParser(b.code_name) || b.code_name,
              name: codeNameParser(b.code_name) || b.code_name,
            }))
          );
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setLoadingBanks(false);
      }
    };

    loadBanks();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveAndContinue = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanBankCd = String(bankCd || '').trim();
    const cleanAccNum = String(accountNumber || '').replace(/\s+/g, '').trim();
    const cleanHolder = removeVietnameseDiacritics(accountHolder)
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanBankCd) {
      setErrorMsg('Vui lòng chọn ngân hàng thụ hưởng.');
      return;
    }
    if (!/^[0-9A-Za-z]{6,25}$/.test(cleanAccNum)) {
      setErrorMsg('Số tài khoản hoàn tiền phải gồm từ 6 đến 25 ký tự chữ hoặc số.');
      return;
    }
    if (cleanHolder.length < 2 || cleanHolder.length > 100) {
      setErrorMsg('Tên chủ tài khoản phải từ 2 đến 100 ký tự.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        refund_bank_cd: cleanBankCd,
        refund_account_number: cleanAccNum,
        refund_account_holder: cleanHolder,
      });
      let updatedUser = null;
      try {
        const fresh = await getProfile();
        updatedUser = fresh?.data || null;
      } catch {
        updatedUser = {
          ...(user || {}),
          refund_bank_cd: cleanBankCd,
          refund_account_number: cleanAccNum,
          refund_account_holder: cleanHolder,
        };
      }
      onSavedAndContinue(updatedUser);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể lưu tài khoản ngân hàng hoàn tiền. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="booking-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-bank-prompt-title"
      style={{ zIndex: 1200 }}
    >
      <div
        className="booking-modal-box"
        style={{ maxWidth: 520, width: '94%', textAlign: 'left', padding: '28px 26px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Bảo vệ quyền lợi hoàn tiền
            </span>
            <h3
              id="refund-bank-prompt-title"
              className="booking-modal-title"
              style={{ textAlign: 'left', margin: '0 0 6px 0', fontSize: 20 }}
            >
              Tài khoản ngân hàng nhận hoàn tiền
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              color: '#64748b',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: '0 0 16px 0' }}>
          Hồ sơ của bạn chưa có thông tin tài khoản nhận hoàn tiền. Vui lòng thiết lập để hệ thống tự động
          hoàn tiền nhanh chóng nếu đơn đặt phòng hủy hợp lệ hoặc thanh toán nhóm hết hạn.
        </p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSaveAndContinue}>
          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="prompt-refund-bank"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 5 }}
            >
              Ngân hàng thụ hưởng <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="prompt-refund-bank"
              value={bankCd}
              onChange={(e) => setBankCd(e.target.value)}
              disabled={loadingBanks || saving}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                background: '#fff',
              }}
            >
              <option value="">
                {loadingBanks ? 'Đang tải danh sách ngân hàng...' : '-- Chọn ngân hàng nhận hoàn tiền --'}
              </option>
              {banks.map((b) => {
                const cd = b.bank_cd || b.code_cd;
                const label = b.short_name && b.name && b.short_name !== b.name
                  ? `${b.short_name} - ${b.name}`
                  : b.name || b.short_name || b.code_name;
                return (
                  <option key={cd} value={cd}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="prompt-refund-acc-num"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 5 }}
            >
              Số tài khoản ngân hàng <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="prompt-refund-acc-num"
              type="text"
              placeholder="Ví dụ: 070138212457"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="prompt-refund-acc-holder"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 5 }}
            >
              Tên chủ tài khoản (In hoa không dấu) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="prompt-refund-acc-holder"
              type="text"
              placeholder="Ví dụ: NGUYEN VAN A"
              value={accountHolder}
              onChange={(e) =>
                setAccountHolder(removeVietnameseDiacritics(e.target.value).toUpperCase())
              }
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 14,
                textTransform: 'uppercase',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12.5,
              color: '#92400e',
              lineHeight: 1.5,
              marginBottom: 18,
            }}
          >
            <strong>Lưu ý khi chọn Bỏ qua:</strong> Bạn vẫn có thể đặt phòng bình thường, nhưng nếu đơn hàng
            phát sinh hoàn tiền, bạn sẽ cần trao đổi trực tiếp với <strong>CSKH qua Support Ticket</strong> để
            cung cấp và xác minh tài khoản nhận tiền hoàn.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onSkipAndContinue}
              disabled={saving}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Bỏ qua &amp; Tiếp tục đặt phòng
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#003580',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu STK & Đặt phòng ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundBankPromptModal;

