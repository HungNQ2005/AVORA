import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route Guard for Hotel Managers (role_code_name === 'VEN' or role_cd === '4')
 * and System Admins (role_code_name === 'ADM' or role_cd === '1').
 * Can optionally accept `allowedRoles` (e.g. ['VEN']) to restrict to specific subsets.
 * All other roles (Business Managers, Customers, Guests) are denied access.
 */
const HotelManagerRoute = ({ children, allowedRoles }) => {
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

  const roleCode = String(user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '')
    .trim().toUpperCase().replace(/[ -]+/g, '_');
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some((role) => {
      const target = String(role).trim().toUpperCase();
      if (target === 'VEN' || target === 'VENDOR') {
        return ['VEN', 'VENDOR'].includes(roleCode) || roleCd === '4';
      }
      if (target === 'ADM' || target === 'ADMIN') {
        return ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) || roleCd === '1';
      }
      if (target === 'BMR') {
        return ['BMR', 'BUSINESS_MANAGER'].includes(roleCode) || roleCd === '3';
      }
      return roleCode === target || roleCd === target;
    });

    if (!isAllowed) {
      return <Navigate to="/forbidden" replace />;
    }

    return children;
  }

  const isHotelManager =
    roleCode === 'VEN' ||
    roleCd === '4' ||
    ['ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN'].includes(roleCode) ||
    roleCd === '1';

  if (!isHotelManager) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default HotelManagerRoute;
