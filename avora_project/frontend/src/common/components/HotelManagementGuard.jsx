import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getRole = (user) => String(user?.role_code_name || '').trim().toUpperCase();

const HotelManagementGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="hotel-detail-state" role="status">Checking access…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />;
  const role = getRole(user);
  if (role !== 'ADM' && role !== 'BMR' && role !== 'VEN') return <Navigate to="/forbidden" replace />;
  return children;
};

export default HotelManagementGuard;
