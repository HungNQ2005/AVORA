import React from 'react';
import { CreditCardIcon, ShieldCheckIcon } from '../../../common/components/icons';
import './hotelBank.css';

const HotelBank = ({ bankAccount }) => (
  <section className="hotel-bank" aria-labelledby="hotel-bank-title">
    <header className="hotel-bank__header">
      <span className="hotel-bank__icon"><CreditCardIcon size={20} /></span>
      <div>
        <h2 id="hotel-bank-title">Tài khoản ngân hàng khách sạn</h2>
        <p>Chỉ hiển thị tài khoản đã được xác minh.</p>
      </div>
    </header>

    {bankAccount ? (
      <>
        <div className="hotel-bank__verified"><ShieldCheckIcon size={16} /> Đã xác minh</div>
        <dl className="hotel-bank__details">
          <div><dt>Ngân hàng</dt><dd>{bankAccount.bank_name}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>{bankAccount.account_holder}</dd></div>
          <div><dt>Số tài khoản</dt><dd>{bankAccount.account_number}</dd></div>
          <div><dt>Chi nhánh</dt><dd>{bankAccount.bank_branch || 'Chưa cập nhật'}</dd></div>
          <div><dt>Mã BIN</dt><dd>{bankAccount.bin_code || 'Chưa cập nhật'}</dd></div>
        </dl>
      </>
    ) : (
      <p className="hotel-bank__empty">Khách sạn chưa có tài khoản ngân hàng đã xác minh.</p>
    )}
  </section>
);

export default HotelBank;
