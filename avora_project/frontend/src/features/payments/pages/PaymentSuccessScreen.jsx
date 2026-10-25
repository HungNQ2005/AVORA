import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchPaymentStatus } from '../../../services/paymentApi';
import './payment.css';

/**
 * Trang xác nhận thanh toán thành công. Xác minh lại trạng thái với server
 * để tránh truy cập trực tiếp bằng URL khi đơn chưa được thanh toán.
 */
const PaymentSuccessScreen = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState('checking'); // checking | paid | unpaid | error

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/signin', { replace: true });
      return;
    }
    let cancelled = false;
    fetchPaymentStatus(bookingId)
      .then((status) => {
        if (cancelled) return;
        setState(status.is_paid ? 'paid' : 'unpaid');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => { cancelled = true; };
  }, [authLoading, user, bookingId, navigate]);

  if (state === 'checking') {
    return (
      <div className="pay-page">
        <div className="pay-state-card" role="status">
          <div className="pay-spinner" style={{ margin: '0 auto 12px' }} />
          <p>Đang xác minh thanh toán...</p>
        </div>
      </div>
    );
  }

  if (state !== 'paid') {
    return (
      <div className="pay-page">
        <section className="pay-state-card" role="alert">
          <h1>{state === 'unpaid' ? 'Đơn hàng chưa được thanh toán' : 'Không thể xác minh thanh toán'}</h1>
          <p>
            {state === 'unpaid'
              ? 'Hệ thống chưa ghi nhận thanh toán cho đơn này.'
              : 'Vui lòng kiểm tra lại trong mục đơn đặt phòng của bạn.'}
          </p>
          <div className="pay-actions-row">
            {state === 'unpaid' && (
              <button type="button" className="pay-btn pay-btn--primary" onClick={() => navigate(`/payment/${bookingId}`)}>
                Quay lại thanh toán
              </button>
            )}
            <button type="button" className="pay-btn pay-btn--ghost" onClick={() => navigate('/my-bookings')}>
              Đơn của tôi
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <section className="pay-state-card pay-state-card--success" role="status">
        <svg className="pay-success-check" viewBox="0 0 52 52" aria-hidden="true">
          <circle className="pay-success-circle" cx="26" cy="26" r="24" fill="none" />
          <path className="pay-success-tick" fill="none" d="M14 27l8 8 16-17" />
        </svg>
        <h1>Thanh toán thành công</h1>
        <p>
          Đơn đặt phòng <b className="pay-mono">#{String(bookingId).split('-')[0].toUpperCase()}</b> đã được xác nhận.
          Cảm ơn bạn đã tin tưởng AVORA!
        </p>
        <div className="pay-actions-row">
          <button type="button" className="pay-btn pay-btn--primary" onClick={() => navigate('/my-bookings')}>
            Xem đơn đặt chỗ của tôi
          </button>
          <button type="button" className="pay-btn pay-btn--ghost" onClick={() => navigate('/')}>
            Về trang chủ
          </button>
        </div>
      </section>
    </div>
  );
};

export default PaymentSuccessScreen;
