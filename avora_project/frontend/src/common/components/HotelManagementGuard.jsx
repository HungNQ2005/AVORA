import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ALLOWED_ROLES = new Set([
  'ADM', 'ADMIN', 'ADMINISTRATOR', 'SYSTEM_ADMIN', 'SYSTEM ADMIN',
  'BMR', 'BUSINESS_MANAGER', 'BUSINESS MANAGER',
  'VEN', 'VENDOR',
]);

const getRole = (user) => String(
  user?.role_code_name || user?.role_name || user?.role || user?.role_cd || '',
).trim().toUpperCase().replace(/[ -]+/g, '_');

const HotelManagementGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="hotel-detail-state" role="status">Checking access…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  if (!ALLOWED_ROLES.has(getRole(user))) return <Navigate to="/forbidden" replace />;
  return children;
};

export default HotelManagementGuard;
