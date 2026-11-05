import React, { useState, useEffect } from 'react';
import { codeNameParser } from '../../../utils/codeNameParser';
import { extractBrandGradient } from '../../../utils/extractLogoColor';
import './VirtualBankCard.css';

// Default Avora luxury navy theme when no logo is available
const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, #07152b 0%, #0e2a56 50%, #1e40af 100%)',
  accent: '#93c5fd',
  glow: 'rgba(30, 64, 175, 0.35)',
};

/**
 * Format account number into groups of 4 for luxury credit/debit card appearance
 */
const formatCardNumber = (num) => {
  if (!num) return '••••  ••••  ••••  ••••';
  const clean = String(num).replace(/\s+/g, '');
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join('  ') : clean;
};

const VirtualBankCard = ({
  bankCd,
  codeName,
  bankDisplayName,
  logoUrl,
  logoBase64,
  accountNumber,
  accountHolder,
  bankBranch,
  binCode,
  isPreview = false,
}) => {
  const [dynamicTheme, setDynamicTheme] = useState(null);

  // Automatically extract dominant brand gradient from the official bank logo (Zero hardcoded themes!)
  useEffect(() => {
    let active = true;
    const sourceImage = logoBase64 || logoUrl;

    if (!sourceImage) {
      setDynamicTheme(null);
      return;
    }

    extractBrandGradient(sourceImage).then((theme) => {
      if (active) {
        setDynamicTheme(theme);
      }
    });

    return () => {
      active = false;
    };
  }, [logoBase64, logoUrl]);

  const activeTheme = dynamicTheme || DEFAULT_THEME;
  const displayName = bankDisplayName || (codeName ? codeNameParser(codeName) : 'Ngân hàng');
  const watermarkText = codeName || (bankCd ? `BANK ${bankCd}` : 'AVORA');

  return (
    <div
      className={`virtual-bank-card ${isPreview ? 'virtual-bank-card--preview' : ''}`}
      style={{
        background: activeTheme.gradient,
        boxShadow: `0 14px 28px -6px ${activeTheme.glow}, 0 2px 6px rgba(0, 0, 0, 0.12)`,
      }}
    >
      {/* Background Watermark & Radial Glow */}
      <div
        className="virtual-bank-card__glow"
        style={{
          background: `radial-gradient(circle at 85% 15%, ${activeTheme.glow} 0%, transparent 60%)`,
        }}
      />
      <div className="virtual-bank-card__watermark">{watermarkText}</div>

      {/* Top Bar: Bank Logo & Name + EMV Contactless Icon */}
      <div className="virtual-bank-card__top">
        <div className="virtual-bank-card__bank-group">
          {logoUrl || logoBase64 ? (
            <div className="virtual-bank-card__logo-wrapper">
              <img
                src={logoBase64 || logoUrl}
                alt={displayName}
                className="virtual-bank-card__logo"
              />
            </div>
          ) : (
            <div className="virtual-bank-card__logo-fallback">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          )}
          <div className="virtual-bank-card__bank-names">
            <span className="virtual-bank-card__bank-title">{displayName}</span>
            {binCode && (
              <span className="virtual-bank-card__bin-badge">BIN: {binCode}</span>
            )}
          </div>
        </div>

        {/* Contactless Wave Icon */}
        <div className="virtual-bank-card__contactless" title="Thẻ thanh toán không tiếp xúc (Contactless)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8.5 16.5a5 5 0 0 1 0-7" />
            <path d="M12 19a8.5 8.5 0 0 0 0-14" />
            <path d="M15.5 21.5a12 12 0 0 0 0-19" />
          </svg>
        </div>
      </div>

      {/* Middle Row: Gold EMV Chip */}
      <div className="virtual-bank-card__middle">
        <div className="virtual-bank-card__chip">
          <div className="virtual-bank-card__chip-inner">
            <span className="virtual-bank-card__chip-line" />
            <span className="virtual-bank-card__chip-line" />
            <span className="virtual-bank-card__chip-line" />
          </div>
        </div>
        {isPreview && (
          <span className="virtual-bank-card__preview-tag">Bản xem trước thẻ thực tế</span>
        )}
      </div>

      {/* Account Number */}
      <div className="virtual-bank-card__number">
        {formatCardNumber(accountNumber)}
      </div>

      {/* Bottom Row: Account Holder, Branch & NAPAS Logo */}
      <div className="virtual-bank-card__bottom">
        <div className="virtual-bank-card__holder-box">
          <span className="virtual-bank-card__label" style={{ color: activeTheme.accent }}>
            Chủ tài khoản
          </span>
          <span className="virtual-bank-card__holder">
            {accountHolder?.trim() || 'HỌ VÀ TÊN CHỦ THẺ'}
          </span>
          {bankBranch && (
            <span className="virtual-bank-card__branch" title={bankBranch}>
              CN: {bankBranch}
            </span>
          )}
        </div>

        {/* National Payment Switch (NAPAS) Badge */}
        <div className="virtual-bank-card__napas-badge" title="Chuyển tiền nhanh liên ngân hàng NAPAS 247">
          <span className="virtual-bank-card__napas-text">napas</span>
          <span className="virtual-bank-card__napas-sub">247</span>
        </div>
      </div>
    </div>
  );
};

export default VirtualBankCard;
