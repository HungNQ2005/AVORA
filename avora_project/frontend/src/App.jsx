import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import AdminLayout from './common/components/AdminLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import SignUpPage from './features/auth/pages/SignUpPage';
import SignInPage from './features/auth/pages/SignInPage';
import MyAccountPage from './features/account/pages/MyAccountPage';
import { AuthProvider } from './context/AuthContext';

import RoomTypeManagementPage from './features/room_types/pages/RoomTypeManagementPage';
import RoomTypeDetailPage from './features/room_types/pages/RoomTypeDetailPage';
import AmenityManagementPage from './features/amenities/pages/AmenityManagementPage';
import { useAuth } from './context/AuthContext';

const VenueManagerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role_code_name !== 'VEN') return <Navigate to="/" replace />;

  return children;
};

/**
 * Root application component.
 * Configures routing for public/test views and the admin management portal.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — no MainLayout (standalone full-page) */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />

          {/* Public & Test pages — wrapped in MainLayout */}
          <Route
            path="/"
            element={
              <MainLayout>
                <HomePage />
              </MainLayout>
            }
          />
          <Route
            path="/system_codes"
            element={
              <MainLayout>
                <TestConnectionPage />
              </MainLayout>
            }
          />
          <Route
            path="/myaccount"
            element={
              <MainLayout>
                <MyAccountPage />
              </MainLayout>
            }
          />

          {/* Admin Portal with dedicated AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/room-types" replace />} />
            <Route path="room-types" element={<VenueManagerRoute><RoomTypeManagementPage /></VenueManagerRoute>} />
            <Route path="room-types/:id" element={<VenueManagerRoute><RoomTypeDetailPage /></VenueManagerRoute>} />
            <Route path="amenities" element={<VenueManagerRoute><AmenityManagementPage /></VenueManagerRoute>} />
            <Route path="facilities" element={<VenueManagerRoute><AmenityManagementPage /></VenueManagerRoute>} />
          </Route>

          {/* Friendly redirect aliases */}
          <Route path="/room-types" element={<Navigate to="/admin/room-types" replace />} />
          <Route path="/amenities" element={<Navigate to="/admin/amenities" replace />} />
          <Route path="/facilities" element={<Navigate to="/admin/facilities" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;