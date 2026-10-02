import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import SignUpPage from './features/auth/pages/SignUpPage';
import SignInPage from './features/auth/pages/SignInPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import MyAccountPage from './features/account/pages/MyAccountPage';
import FavoritesPage from './features/account/pages/FavoritesPage';
import HotelSearchPage from './features/hotels/HotelSearchPage';
import CustomerHotelDetailPage from './features/hotels/HotelDetailPage';
import RoomTypeManagementPage from './features/room_types/pages/RoomTypeManagementPage';
import RoomTypeDetailPage from './features/room_types/pages/RoomTypeDetailPage';
import AmenityManagementPage from './features/amenities/pages/AmenityManagementPage';
import UserManagementPage from './features/users/pages/UserManagementPage';
import CouponManagementPage from './features/coupons/pages/CouponManagementPage';
import CouponDetailPage from './features/coupons/pages/CouponDetailPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import HotelManagementGuard from './common/components/HotelManagementGuard';
import DashboardPage from './features/dashboard/pages/dashboardPage';
import HotelManagementPage from './features/hotel_management/pages/hotelManagementPage';
import HotelManagementDetailPage from './features/hotel_management/pages/hotelDetailPage';

/**
 * Automatically scrolls the window to the top whenever navigation occurs.
 */
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return null;
}

/**
 * Guard route for Venue Managers (role_code_name === 'VEN').
 */
const VenueManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (roleCd !== '1') return <Navigate to="/" replace />;

  return children;
};

/**
 * Guard route for system admins only.
 */
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role_code_name !== 'ADM') return <Navigate to="/" replace />;

  return children;
};

/**
 * Guard coupon management routes for Business Managers only.
 */
const BusinessManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role_code_name !== 'BMR') return <Navigate to="/" replace />;

  return children;
};

/**
 * Layout wrapper for public/customer-facing routes with Header & Footer.
 */
function CustomerLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

/**
 * Root application component.
 * Configures routing for customer-facing views and the Dashboard (Vendor / System Admin / Business Manager).
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public & Customer Pages (wrapped in MainLayout: Header + Footer) */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/system_codes" element={<TestConnectionPage />} />
            <Route path="/myaccount" element={<MyAccountPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/saved" element={<FavoritesPage />} />
            <Route path="/hotels" element={<HotelSearchPage />} />
            <Route path="/hotels/:id" element={<CustomerHotelDetailPage />} />
            <Route path="/hotel/:id" element={<CustomerHotelDetailPage />} />
            <Route path="/hotel-detail" element={<CustomerHotelDetailPage />} />
            <Route path="/hotel-detail/:id" element={<CustomerHotelDetailPage />} />
            <Route path="/search" element={<HotelSearchPage />} />
            <Route path="/forbidden" element={<section style={{ padding: '3rem 1rem', textAlign: 'center' }}><h1>403 - Truy cập bị từ chối</h1><p>Tài khoản của bạn không có quyền truy cập trang quản lý này.</p></section>} />
          </Route>

          {/* Dashboard (dashboardPage.jsx: Header + dashboardNav.jsx + content). Vendor / System Admin / Business Manager only — Customer/guest get 403. */}
          <Route
            path="/dashboard"
            element={
              <HotelManagementGuard>
                <DashboardPage />
              </HotelManagementGuard>
            }
          >
            <Route index element={<Navigate to="/dashboard/hotel-management" replace />} />
            <Route path="hotel-management" element={<HotelManagementPage />} />
            <Route path="hotel-management/:id" element={<HotelManagementDetailPage />} />
            <Route
              path="room-types"
              element={
                <VenueManagerRoute>
                  <RoomTypeManagementPage />
                </VenueManagerRoute>
              }
            />
            <Route
              path="room-types/:id"
              element={
                <VenueManagerRoute>
                  <RoomTypeDetailPage />
                </VenueManagerRoute>
              }
            />
            <Route
              path="amenities"
              element={
                <VenueManagerRoute>
                  <AmenityManagementPage />
                </VenueManagerRoute>
              }
            />
            <Route
              path="facilities"
              element={
                <VenueManagerRoute>
                  <AmenityManagementPage />
                </VenueManagerRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <BusinessManagerRoute>
                  <CouponManagementPage />
                </BusinessManagerRoute>
              }
            />
            <Route
              path="coupons/:id"
              element={
                <BusinessManagerRoute>
                  <CouponDetailPage />
                </BusinessManagerRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              }
            />
          </Route>

          {/* Friendly redirect aliases for the old /admin and top-level paths */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/room-types" element={<Navigate to="/dashboard/room-types" replace />} />
          <Route path="/admin/room-types/:id" element={<Navigate to="/dashboard/room-types" replace />} />
          <Route path="/admin/amenities" element={<Navigate to="/dashboard/amenities" replace />} />
          <Route path="/admin/facilities" element={<Navigate to="/dashboard/facilities" replace />} />
          <Route path="/admin/hotel-management" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/admin/hotel-management/:id" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/admin/coupons" element={<Navigate to="/dashboard/coupons" replace />} />
          <Route path="/admin/coupons/:id" element={<Navigate to="/dashboard/coupons" replace />} />
          <Route path="/admin/users" element={<Navigate to="/dashboard/users" replace />} />
          <Route path="/room-types" element={<Navigate to="/dashboard/room-types" replace />} />
          <Route path="/amenities" element={<Navigate to="/dashboard/amenities" replace />} />
          <Route path="/facilities" element={<Navigate to="/dashboard/facilities" replace />} />
          <Route path="/hotel-management" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/hotel-management/:id" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/coupons" element={<Navigate to="/dashboard/coupons" replace />} />
          <Route path="/users" element={<Navigate to="/dashboard/users" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;