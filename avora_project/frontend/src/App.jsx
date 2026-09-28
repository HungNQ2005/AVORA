import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import SignUpPage from './features/auth/pages/SignUpPage';
import SignInPage from './features/auth/pages/SignInPage';
import MyAccountPage from './features/account/pages/MyAccountPage';
import { AuthProvider } from './context/AuthContext';
import HotelManagementGuard from './common/components/HotelManagementGuard';
import HotelManagementPage from './features/hotel_management/pages/hotelManagementPage';
import HotelDetailPage from './features/hotel_management/pages/hotelDetailPage';

/**
 * Root application component.
 * Configures routing and wraps everything in AuthProvider + MainLayout.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — no MainLayout (standalone full-page) */}
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />

          {/* Protected & main pages — wrapped in MainLayout */}
          <Route
            path="/*"
            element={
              <MainLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/system_codes" element={<TestConnectionPage />} />
                  <Route path="/myaccount" element={<MyAccountPage />} />
                  <Route path="/hotel-management" element={<HotelManagementGuard><HotelManagementPage /></HotelManagementGuard>} />
                  <Route path="/hotel-management/:id" element={<HotelManagementGuard><HotelDetailPage /></HotelManagementGuard>} />
                  <Route path="/forbidden" element={<section style={{ padding: '3rem 1rem', textAlign: 'center' }}><h1>Access denied</h1><p>Your account does not have permission to manage hotels.</p></section>} />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
