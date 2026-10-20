import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Guard route for general Dashboard access.
 * Only internal staff roles (ADM, VEN, BMR) can access the Dashboard shell.
 * Specific modules within Dashboard are protected by their respective route guards.
 */
const HotelManagementGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="hotel-detail-state" role="status">Đang kiểm tra quyền truy cập…</div>;
  if (!user) return <Navigate to="/signin" replace />;

  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');

  const isStaff =
    roleCode === 'ADM' || roleCd === '1' ||
    roleCode === 'VEN' || roleCd === '4' ||
    roleCode === 'BMR' || roleCd === '3';

  if (!isStaff) return <Navigate to="/" replace />;
  return children;
};

export default HotelManagementGuard;
