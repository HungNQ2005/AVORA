import React from 'react';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const WalletBalanceCards = ({ availableBalance = 0, pendingBalance = 0 }) => {
  return (
    <div className="hw-cards-grid">
      <div className="hw-balance-card hw-balance-card--available">
        <span className="hw-balance-card__label">Số dư khả dụng</span>
        <span className="hw-balance-card__amount">
          {formatCurrency(availableBalance)}
        </span>
        <p className="hw-balance-card__hint">Số tiền đã hoàn tất đối soát có thể rút</p>
      </div>

      <div className="hw-balance-card hw-balance-card--pending">
        <span className="hw-balance-card__label">Số dư chờ đối soát</span>
        <span className="hw-balance-card__amount">
          {formatCurrency(pendingBalance)}
        </span>
        <p className="hw-balance-card__hint">Doanh thu từ các đơn đặt phòng đang lưu trú</p>
      </div>
    </div>
  );
};

export default WalletBalanceCards;

