import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route Guard for Hotel Managers (role_code_name === 'VEN' or role_cd === '4')
 * and System Admins (role_code_name === 'ADM' or role_cd === '1').
 * All other roles (Business Managers, Customers, Guests) are denied access.
 */
const HotelManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="room-auth-checking" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div className="room-loading-spinner" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Đang xác thực quyền Hotel Manager...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');

  const isHotelManager = roleCode === 'VEN' || roleCd === '4';

  if (!isHotelManager) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default HotelManagerRoute;
