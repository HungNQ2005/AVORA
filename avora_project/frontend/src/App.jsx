import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, useParams } from 'react-router-dom';
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
import RoleManagementPage from './features/users/pages/RoleManagementPage';
import CouponManagementPage from './features/coupons/pages/CouponManagementPage';
import CouponDetailPage from './features/coupons/pages/CouponDetailPage';
import RefundPolicyManagementPage from './features/refund_policies/pages/RefundPolicyManagementPage';
import RefundPolicyDetailPage from './features/refund_policies/pages/RefundPolicyDetailPage';
import CommissionPolicyManagementPage from './features/commission_policies/pages/CommissionPolicyManagementPage';
import CommissionPolicyDetailPage from './features/commission_policies/pages/CommissionPolicyDetailPage';
import StatisticsPage from './features/statistics/pages/StatisticsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import HotelManagementGuard from './common/components/HotelManagementGuard';
import HotelManagerRoute from './common/components/HotelManagerRoute';
import NotFoundNotice from './common/components/NotFoundNotice';
import DashboardPage from './features/dashboard/pages/dashboardPage';
import HotelManagementPage from './features/hotel_management/pages/hotelManagementPage';
import HotelManagementDetailPage from './features/hotel_management/pages/hotelDetailPage';
import RoomManagementPage from './features/rooms/pages/RoomManagementPage';
import AIChatWidget from './features/chatbot/AIChatWidget';
import BookingPage from './features/bookings/pages/BookingPage';
import MyBookingsPage from './features/bookings/pages/MyBookingsPage';
import ReviewPage from './features/reviews/pages/ReviewPage';
import AdminReviewManagementPage from './features/reviews/pages/AdminReviewManagementPage';

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
 * Guard route for Venue Managers (role_code_name === 'VEN' or role_cd === '4')
 * and System Admins (role_code_name === 'ADM' or role_cd === '1').
 */
const VenueManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isVenueManager = roleCode === 'VEN' || roleCd === '4' || roleCode === 'ADM' || roleCd === '1';

  if (!isVenueManager) return <Navigate to="/forbidden" replace />;

  return children;
};

/**
 * Guard route for system admins only.
 */
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  if (roleCode !== 'ADM' && roleCd !== '1') return <Navigate to="/forbidden" replace />;

  return children;
};

/**
 * Guard coupon management routes for Business Managers only (strictly BMR).
 */
const CouponManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isBmr = roleCode === 'BMR' || roleCd === '3';
  if (!isBmr) return <Navigate to="/forbidden" replace />;

  return children;
};

/**
 * Guard policy management routes (refund policies, commission policies) for BMR and ADM.
 */
const BusinessPolicyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isAllowed = roleCode === 'BMR' || roleCd === '3' || roleCode === 'ADM' || roleCd === '1';
  if (!isAllowed) return <Navigate to="/forbidden" replace />;

  return children;
};

/**
 * Guard route for Vendors (role_code_name === 'VEN' or role_cd === '4')
 * and System Admins (role_code_name === 'ADM' or role_cd === '1') for hotel statistics.
 */
const VendorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  const isVendor = roleCode === 'VEN' || roleCd === '4' || roleCode === 'ADM' || roleCd === '1';
  if (!isVendor) return <Navigate to="/forbidden" replace />;

  return children;
};

/**
 * Redirect /admin to the appropriate dashboard based on the logged-in role.
 */
const AdminDashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  if (roleCode === 'BMR' || roleCd === '3') return <Navigate to="/dashboard/coupons" replace />;
  if (roleCode === 'VEN' || roleCd === '4') return <Navigate to="/dashboard/statistics" replace />;
  if (roleCode === 'ADM' || roleCd === '1') return <Navigate to="/dashboard/statistics" replace />;

  return <Navigate to="/" replace />;
};

/**
 * Redirect /dashboard index to the appropriate initial dashboard page based on role.
 * Vendors and Admins land directly on the Statistics dashboard (Bảng thống kê).
 */
const DashboardIndexRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  const roleCode = String(user?.role_code_name || '').trim().toUpperCase();
  const roleCd = String(user?.role_cd ?? '').trim().replace(/^0+(?=\d)/, '');
  if (roleCode === 'BMR' || roleCd === '3') return <Navigate to="/dashboard/coupons" replace />;
  if (roleCode === 'VEN' || roleCd === '4' || roleCode === 'ADM' || roleCd === '1') {
    return <Navigate to="/dashboard/statistics" replace />;
  }
  return <Navigate to="/" replace />;
};

/**
 * Layout wrapper for public/customer-facing routes with Header & Footer.
 */
function CustomerLayout() {
  return (
    <MainLayout>
      <Outlet />
      <AIChatWidget />
    </MainLayout>
  );
}

/**
 * Helper to preserve :id parameter when redirecting from alias routes
 */
function DynamicParamRedirect({ toPrefix }) {
  const { id } = useParams();
  return <Navigate to={`${toPrefix}/${id || ''}`} replace />;
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
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking/:id" element={<BookingPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/myaccount/bookings" element={<MyBookingsPage />} />
            <Route path="/my-reviews" element={<ReviewPage />} />
            <Route path="/search" element={<HotelSearchPage />} />

            <Route path="/forbidden" element={<section style={{ padding: '3rem 1rem', textAlign: 'center' }}><h1>403 - Truy cập bị từ chối</h1><p>Tài khoản của bạn không có quyền truy cập trang quản lý này.</p></section>} />
            <Route path="*" element={<NotFoundNotice />} />
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
            <Route index element={<DashboardIndexRedirect />} />
            <Route
              path="reviews"
              element={
                <AdminRoute>
                  <AdminReviewManagementPage />
                </AdminRoute>
              }
            />
            <Route
              path="roles"
              element={
                <HotelManagerRoute>
                  <HotelManagementPage />
                </HotelManagerRoute>
              }
            />
            <Route
              path="hotel-management/:id"
              element={
                <HotelManagerRoute>
                  <HotelManagementDetailPage />
                </HotelManagerRoute>
              }
            />
            <Route
              path="rooms"
              element={
                <HotelManagerRoute>
                  <RoomManagementPage />
                </HotelManagerRoute>
              }
            />
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
              path="statistics"
              element={
                <VendorRoute>
                  <StatisticsPage />
                </VendorRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <CouponManagerRoute>
                  <CouponManagementPage />
                </CouponManagerRoute>
              }
            />
            <Route
              path="coupons/:id"
              element={
                <CouponManagerRoute>
                  <CouponDetailPage />
                </CouponManagerRoute>
              }
            />
            <Route
              path="refund-policies"
              element={
                <BusinessPolicyRoute>
                  <RefundPolicyManagementPage />
                </BusinessPolicyRoute>
              }
            />
            <Route
              path="refund-policies/:id"
              element={
                <BusinessPolicyRoute>
                  <RefundPolicyDetailPage />
                </BusinessPolicyRoute>
              }
            />
            <Route
              path="commission-policies"
              element={
                <BusinessPolicyRoute>
                  <CommissionPolicyManagementPage />
                </BusinessPolicyRoute>
              }
            />
            <Route
              path="commission-policies/:id"
              element={
                <BusinessPolicyRoute>
                  <CommissionPolicyDetailPage />
                </BusinessPolicyRoute>
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
            <Route
              path="roles"
              element={
                <AdminRoute>
                  <RoleManagementPage />
                </AdminRoute>
              }
            />
          </Route>

          {/* Friendly redirect aliases for the old /admin and top-level paths */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/rooms" element={<Navigate to="/dashboard/rooms" replace />} />
          <Route path="/rooms" element={<Navigate to="/dashboard/rooms" replace />} />
          <Route path="/admin/room-types" element={<Navigate to="/dashboard/room-types" replace />} />
          <Route path="/admin/room-types/:id" element={<DynamicParamRedirect toPrefix="/dashboard/room-types" />} />
          <Route path="/admin/amenities" element={<Navigate to="/dashboard/amenities" replace />} />
          <Route path="/admin/facilities" element={<Navigate to="/dashboard/facilities" replace />} />
          <Route path="/admin/hotel-management" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/admin/hotel-management/:id" element={<DynamicParamRedirect toPrefix="/dashboard/hotel-management" />} />
          <Route path="/admin/coupons" element={<Navigate to="/dashboard/coupons" replace />} />
          <Route path="/admin/coupons/:id" element={<DynamicParamRedirect toPrefix="/dashboard/coupons" />} />
          <Route path="/admin/refund-policies" element={<Navigate to="/dashboard/refund-policies" replace />} />
          <Route path="/admin/refund-policies/:id" element={<DynamicParamRedirect toPrefix="/dashboard/refund-policies" />} />
          <Route path="/admin/commission-policies" element={<Navigate to="/dashboard/commission-policies" replace />} />
          <Route path="/admin/commission-policies/:id" element={<DynamicParamRedirect toPrefix="/dashboard/commission-policies" />} />
          <Route path="/admin/statistics" element={<Navigate to="/dashboard/statistics" replace />} />
          <Route path="/statistics" element={<Navigate to="/dashboard/statistics" replace />} />
          <Route path="/admin/users" element={<Navigate to="/dashboard/users" replace />} />
          <Route path="/room-types" element={<Navigate to="/dashboard/room-types" replace />} />
          <Route path="/room-types/:id" element={<DynamicParamRedirect toPrefix="/dashboard/room-types" />} />
          <Route path="/amenities" element={<Navigate to="/dashboard/amenities" replace />} />
          <Route path="/facilities" element={<Navigate to="/dashboard/facilities" replace />} />
          <Route path="/hotel-management" element={<Navigate to="/dashboard/hotel-management" replace />} />
          <Route path="/hotel-management/:id" element={<DynamicParamRedirect toPrefix="/dashboard/hotel-management" />} />
          <Route path="/coupons" element={<Navigate to="/dashboard/coupons" replace />} />
          <Route path="/coupons/:id" element={<DynamicParamRedirect toPrefix="/dashboard/coupons" />} />
          <Route path="/refund-policies" element={<Navigate to="/dashboard/refund-policies" replace />} />
          <Route path="/refund-policies/:id" element={<DynamicParamRedirect toPrefix="/dashboard/refund-policies" />} />
          <Route path="/commission-policies" element={<Navigate to="/dashboard/commission-policies" replace />} />
          <Route path="/commission-policies/:id" element={<DynamicParamRedirect toPrefix="/dashboard/commission-policies" />} />
          <Route path="/users" element={<Navigate to="/dashboard/users" replace />} />
          <Route path="/roles" element={<Navigate to="/dashboard/roles" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
