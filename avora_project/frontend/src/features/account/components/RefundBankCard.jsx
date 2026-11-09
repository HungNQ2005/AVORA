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

const RefundBankCard = ({ user, setUser }) => {
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankCd, setBankCd] = useState(user?.refund_bank_cd || '');
  const [accountNumber, setAccountNumber] = useState(user?.refund_account_number || '');
  const [accountHolder, setAccountHolder] = useState(user?.refund_account_holder || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    setBankCd(user?.refund_bank_cd || '');
    setAccountNumber(user?.refund_account_number || '');
    setAccountHolder(user?.refund_account_holder || '');
  }, [user]);

  useEffect(() => {
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
  }, []);

  const hasRefundBank = Boolean(
    user?.refund_bank_cd && user?.refund_account_number && user?.refund_account_holder
  );

  const resolvedBankDisplay = (() => {
    if (!user?.refund_bank_cd) return 'Chưa thiết lập';
    const found = banks.find(
      (b) => String(b.bank_cd || b.code_cd) === String(user.refund_bank_cd)
    );
    if (found) {
      return found.short_name && found.name && found.short_name !== found.name
        ? `${found.short_name} - ${found.name}`
        : found.name || found.short_name || found.code_name;
    }
    if (user?.refund_bank_name) {
      return codeNameParser(user.refund_bank_name) || user.refund_bank_name;
    }
    return `Mã NH: ${user.refund_bank_cd}`;
  })();

  const handleOpenEdit = () => {
    setBankCd(user?.refund_bank_cd || '');
    setAccountNumber(user?.refund_account_number || '');
    setAccountHolder(
      user?.refund_account_holder ||
        removeVietnameseDiacritics(user?.full_name || '').toUpperCase()
    );
    setFeedback({ type: '', text: '' });
    setIsEditingBank(true);
  };

  const handleCancel = () => {
    setBankCd(user?.refund_bank_cd || '');
    setAccountNumber(user?.refund_account_number || '');
    setAccountHolder(user?.refund_account_holder || '');
    setFeedback({ type: '', text: '' });
    setIsEditingBank(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    const cleanBankCd = String(bankCd || '').trim();
    const cleanAccNum = String(accountNumber || '').replace(/\s+/g, '').trim();
    const cleanHolder = removeVietnameseDiacritics(accountHolder)
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanBankCd) {
      setFeedback({ type: 'error', text: 'Vui lòng chọn ngân hàng thụ hưởng.' });
      return;
    }
    if (!/^[0-9A-Za-z]{6,25}$/.test(cleanAccNum)) {
      setFeedback({
        type: 'error',
        text: 'Số tài khoản hoàn tiền phải gồm từ 6 đến 25 ký tự chữ hoặc số.',
      });
      return;
    }
    if (cleanHolder.length < 2 || cleanHolder.length > 100) {
      setFeedback({
        type: 'error',
        text: 'Tên chủ tài khoản phải từ 2 đến 100 ký tự.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        refund_bank_cd: cleanBankCd,
        refund_account_number: cleanAccNum,
        refund_account_holder: cleanHolder,
      });
      const freshRes = await getProfile();
      if (freshRes?.data) {
        setUser(freshRes.data);
      }
      setFeedback({
        type: 'success',
        text: 'Đã cập nhật tài khoản ngân hàng nhận hoàn tiền thành công!',
      });
      setIsEditingBank(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err?.response?.data?.message ||
          err?.message ||
          'Cập nhật tài khoản hoàn tiền thất bại. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-card profile-info-card" style={{ marginTop: 24 }}>
      <div className="profile-card__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="profile-card__title" style={{ margin: 0 }}>
              Tài khoản ngân hàng nhận hoàn tiền
            </h2>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: hasRefundBank ? '#dcfce7' : '#fef3c7',
                color: hasRefundBank ? '#15803d' : '#b45309',
              }}
            >
              {hasRefundBank ? '✓ Đã thiết lập' : 'Chưa thiết lập'}
            </span>
          </div>
          <p className="profile-card__subtitle" style={{ marginTop: 6 }}>
            Tài khoản mặc định dùng để nhận tiền hoàn tự động khi bạn hủy đơn hợp lệ hoặc khi đơn thanh toán nhóm hết hạn.
          </p>
        </div>

        {!isEditingBank ? (
          <button type="button" className="profile-edit-btn" onClick={handleOpenEdit}>
            <span>{hasRefundBank ? 'Đổi tài khoản hoàn tiền' : 'Thiết lập tài khoản'}</span>
          </button>
        ) : (
          <div className="profile-edit-actions-top">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <span className="btn-spinner" /> : 'Lưu tài khoản'}
            </button>
          </div>
        )}
      </div>

      {feedback.text && (
        <div
          className={`profile-alert profile-alert--${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-form-grid profile-form-grid--3">
          <div className="profile-field-group">
            <div className="profile-field-label-row">
              <label htmlFor="profile-refund-bank" className="profile-field-label">
                Ngân hàng thụ hưởng <span className="required-star">*</span>
              </label>
            </div>
            {isEditingBank ? (
              <select
                id="profile-refund-bank"
                className="profile-input profile-input--editing"
                value={bankCd}
                onChange={(e) => setBankCd(e.target.value)}
                disabled={loadingBanks || saving}
              >
                <option value="">
                  {loadingBanks ? 'Đang tải ngân hàng...' : '-- Chọn ngân hàng --'}
                </option>
                {banks.map((b) => {
                  const cd = b.bank_cd || b.code_cd;
                  const label =
                    b.short_name && b.name && b.short_name !== b.name
                      ? `${b.short_name} - ${b.name}`
                      : b.name || b.short_name || b.code_name;
                  return (
                    <option key={cd} value={cd}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="profile-input profile-input--readonly">
                {resolvedBankDisplay}
              </div>
            )}
          </div>

          <div className="profile-field-group">
            <div className="profile-field-label-row">
              <label htmlFor="profile-refund-acc-num" className="profile-field-label">
                Số tài khoản nhận hoàn tiền <span className="required-star">*</span>
              </label>
            </div>
            {isEditingBank ? (
              <input
                id="profile-refund-acc-num"
                type="text"
                className="profile-input profile-input--editing"
                placeholder="Nhập số tài khoản ngân hàng"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ''))
                }
                disabled={saving}
              />
            ) : (
              <div className="profile-input profile-input--readonly" style={{ fontFamily: 'monospace' }}>
                {user?.refund_account_number || 'Chưa thiết lập'}
              </div>
            )}
          </div>

          <div className="profile-field-group">
            <div className="profile-field-label-row">
              <label htmlFor="profile-refund-acc-holder" className="profile-field-label">
                Tên chủ tài khoản (Không dấu) <span className="required-star">*</span>
              </label>
            </div>
            {isEditingBank ? (
              <input
                id="profile-refund-acc-holder"
                type="text"
                className="profile-input profile-input--editing"
                placeholder="VD: NGUYEN VAN A"
                value={accountHolder}
                onChange={(e) =>
                  setAccountHolder(removeVietnameseDiacritics(e.target.value).toUpperCase())
                }
                disabled={saving}
              />
            ) : (
              <div className="profile-input profile-input--readonly">
                {user?.refund_account_holder || 'Chưa thiết lập'}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default RefundBankCard;

