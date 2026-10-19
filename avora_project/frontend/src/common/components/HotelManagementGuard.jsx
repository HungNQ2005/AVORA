import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getRole = (user) => String(user?.role_code_name || '').trim().toUpperCase();

const HotelManagementGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="hotel-detail-state" role="status">Đang kiểm tra quyền truy cập…</div>;
  const role = getRole(user);
  if (role !== 'ADM' && role !== 'BMR' && role !== 'VEN') return <Navigate to="/" replace />;
  return children;
};

export default HotelManagementGuard;
