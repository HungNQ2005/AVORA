import React from 'react';

const formatCurrency = (val) => {
  const num = Math.round(Number(val) || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const VenueWalletKpiCards = ({ balances = {}, summary = {}, policies = {} }) => {
  const available = Number(balances.available_balance || 0);
  const pending = Number(balances.pending_balance || 0);
  const totalInflowNet = Number(summary.total_inflow_net || 0);
  const totalInflowCount = Number(summary.total_inflow_count || 0);
  const totalCommission = Number(summary.total_commission_deducted || 0);
  const totalOutflowDeducted = Number(summary.total_outflow_deducted || 0);
  const totalOutflowCount = Number(summary.total_outflow_count || 0);
  const pendingRefund = Number(summary.pending_refund_amount || 0);
  const commRate = policies.commission_policy?.commission_rate ?? 0;

  return (
    <div className="vw-stats-grid">
      {/* 1. SỐ DƯ KHẢ DỤNG */}
      <div className="vw-stat-card">
        <div className="vw-stat-card__header">
          <span className="vw-stat-card__title">SỐ DƯ KHẢ DỤNG</span>
          <div className="vw-stat-card__icon-box vw-stat-card__icon-box--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <div className="vw-stat-card__value-row">
          <span className="vw-stat-card__main-value vw-text-green">
            {formatCurrency(available)}
          </span>
        </div>
        <div className="vw-stat-card__footer">
          <span className="vw-stat-card__footer-left">Sẵn sàng rút tiền</span>
          <span className="vw-stat-badge vw-stat-badge--green">Đã đối soát</span>
        </div>
      </div>

      {/* 2. SỐ DƯ CHỜ ĐỐI SOÁT */}
      <div className="vw-stat-card">
        <div className="vw-stat-card__header">
          <span className="vw-stat-card__title">SỐ DƯ CHỜ ĐỐI SOÁT</span>
          <div className="vw-stat-card__icon-box vw-stat-card__icon-box--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div className="vw-stat-card__value-row">
          <span className="vw-stat-card__main-value vw-text-amber">
            {formatCurrency(pending)}
          </span>
        </div>
        <div className="vw-stat-card__footer">
          <span className="vw-stat-card__footer-left">Đơn đang lưu trú</span>
          <span className="vw-stat-badge vw-stat-badge--amber">Chờ checkout</span>
        </div>
      </div>

      {/* 3. TỔNG TIỀN VÀO */}
      <div className="vw-stat-card">
        <div className="vw-stat-card__header">
          <span className="vw-stat-card__title">DOANH THU THỰC NHẬN</span>
          <div className="vw-stat-card__icon-box vw-stat-card__icon-box--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>
        <div className="vw-stat-card__value-row">
          <span className="vw-stat-card__main-value vw-text-blue">
            +{formatCurrency(totalInflowNet)}
          </span>
        </div>
        <div className="vw-stat-card__footer">
          <span className="vw-stat-card__footer-left">{totalInflowCount} đơn hoàn tất</span>
          <span className="vw-stat-badge vw-stat-badge--blue">
            Sàn: -{formatCurrency(totalCommission)} ({commRate}%)
          </span>
        </div>
      </div>

      {/* 4. TỔNG TIỀN RA */}
      <div className="vw-stat-card">
        <div className="vw-stat-card__header">
          <span className="vw-stat-card__title">TỔNG TIỀN RA ĐÃ TRỪ VÍ</span>
          <div className="vw-stat-card__icon-box vw-stat-card__icon-box--rose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>
        <div className="vw-stat-card__value-row">
          <span className="vw-stat-card__main-value vw-text-rose">
            -{formatCurrency(totalOutflowDeducted)}
          </span>
        </div>
        <div className="vw-stat-card__footer">
          <span className="vw-stat-card__footer-left">{totalOutflowCount} khoản hoàn/rút</span>
          <span className="vw-stat-badge vw-stat-badge--rose">
            {pendingRefund > 0 ? `Chờ duyệt: ${formatCurrency(pendingRefund)}` : 'Đã thanh quyết'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VenueWalletKpiCards;
