import React from 'react';
import { codeNameParser } from '../../../utils/codeNameParser';

const LinkedBankCard = ({ linkedBank, banks = [], onChangeClick }) => {
  if (!linkedBank) return null;

  const foundBank = banks.find((b) => String(b.bank_cd) === String(linkedBank.bank_cd));
  const bankDisplayName = foundBank?.code_name || codeNameParser(linkedBank.bank_cd);

  return (
    <div className="hw-card-display">
      <div className="hw-card-visual">
        <div className="hw-card-visual__top">
          <span className="hw-card-visual__bank">{codeNameParser(bankDisplayName)}</span>
          <div className="hw-card-visual__chip" />
        </div>
        <div className="hw-card-visual__number">
          {linkedBank.account_number}
        </div>
        <div className="hw-card-visual__bottom">
          <div>
            <div className="hw-card-visual__holder-label">Chủ tài khoản</div>
            <div className="hw-card-visual__holder">{linkedBank.account_holder}</div>
          </div>
          {linkedBank.bank_branch && (
            <div className="hw-card-visual__branch">{linkedBank.bank_branch}</div>
          )}
        </div>
      </div>

      <div className="hw-card-info-pane">
        <div className="hw-info-row">
          <span>Ngân hàng</span>
          <span>{codeNameParser(bankDisplayName)}</span>
        </div>
        {linkedBank.bin_code && (
          <div className="hw-info-row">
            <span>Mã BIN Napas</span>
            <span>{linkedBank.bin_code}</span>
          </div>
        )}
        <div className="hw-info-row">
          <span>Số tài khoản</span>
          <span>{linkedBank.account_number}</span>
        </div>
        <div className="hw-info-row">
          <span>Chủ tài khoản</span>
          <span>{linkedBank.account_holder}</span>
        </div>
        {linkedBank.bank_branch && (
          <div className="hw-info-row">
            <span>Chi nhánh</span>
            <span>{linkedBank.bank_branch}</span>
          </div>
        )}
        <div className="hw-info-row">
          <span>Trạng thái xác thực</span>
          <span style={{ color: '#059669' }}>Đã xác minh (Active)</span>
        </div>

        <div className="hw-locked-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Mỗi khách sạn chỉ được liên kết 1 tài khoản ngân hàng duy nhất và đã được cố định với ví. Nếu cần đổi tài khoản thụ hưởng thì phải tạo ticket.</span>
        </div>

        {/* Nút yêu cầu đổi tài khoản qua ticket */}
        <div className="hw-card-actions">
          <button
            type="button"
            className="hw-btn-change"
            onClick={onChangeClick}
            title="Tạo ticket yêu cầu đổi tài khoản thụ hưởng"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Tạo ticket đổi tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedBankCard;
