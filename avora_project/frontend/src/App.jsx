import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import SignUpPage from './features/auth/pages/SignUpPage';
import SignInPage from './features/auth/pages/SignInPage';
import MyAccountPage from './features/account/pages/MyAccountPage';
import { AuthProvider } from './context/AuthContext';
import HotelSearchPage from './features/hotels/HotelSearchPage';
import HotelDetailPage from './features/hotels/HotelDetailPage';

/**
 * Root application component.
 * Configures routing and wraps everything in AuthProvider + MainLayout.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/system_codes" element={<TestConnectionPage />} />
            <Route path="/myaccount" element={<MyAccountPage />} />
            <Route path="/hotels" element={<HotelSearchPage />} />
            <Route path="/hotels/:id" element={<HotelDetailPage />} />
            <Route path="/search" element={<HotelSearchPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
