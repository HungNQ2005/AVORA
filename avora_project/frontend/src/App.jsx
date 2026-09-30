import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import AdminLayout from './common/components/AdminLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import SignUpPage from './features/auth/pages/SignUpPage';
import SignInPage from './features/auth/pages/SignInPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import MyAccountPage from './features/account/pages/MyAccountPage';
import FavoritesPage from './features/account/pages/FavoritesPage';
import HotelSearchPage from './features/hotels/HotelSearchPage';
import HotelDetailPage from './features/hotels/HotelDetailPage';
import RoomTypeManagementPage from './features/room_types/pages/RoomTypeManagementPage';
import RoomTypeDetailPage from './features/room_types/pages/RoomTypeDetailPage';
import AmenityManagementPage from './features/amenities/pages/AmenityManagementPage';
import CouponManagementPage from './features/coupons/pages/CouponManagementPage';
import CouponDetailPage from './features/coupons/pages/CouponDetailPage';
import UserManagementPage from './features/users/pages/UserManagementPage';
import { AuthProvider, useAuth } from './context/AuthContext';

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

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (!['VEN', 'ADM'].includes(user.role_code_name)) return <Navigate to="/" replace />;

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
 * Configures routing for customer-facing views and the admin management portal.
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
            <Route path="/hotels/:id" element={<HotelDetailPage />} />
            <Route path="/hotel/:id" element={<HotelDetailPage />} />
            <Route path="/hotel-detail" element={<HotelDetailPage />} />
            <Route path="/hotel-detail/:id" element={<HotelDetailPage />} />
            <Route path="/search" element={<HotelSearchPage />} />
          </Route>

          {/* Admin Management Portal (wrapped in AdminLayout with Sidebar) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/room-types" replace />} />
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
                <VenueManagerRoute>
                  <UserManagementPage />
                </VenueManagerRoute>

              }
            />
          </Route>

          {/* Friendly redirect aliases for admin paths */}
          <Route path="/room-types" element={<Navigate to="/admin/room-types" replace />} />
          <Route path="/amenities" element={<Navigate to="/admin/amenities" replace />} />
          <Route path="/facilities" element={<Navigate to="/admin/facilities" replace />} />
          <Route path="/coupons" element={<Navigate to="/admin/coupons" replace />} />
          <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;