import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import AdminLayout from './common/components/AdminLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';
import RoomTypeManagementPage from './features/room_types/RoomTypeManagementPage';
import RoomTypeDetailPage from './features/room_types/RoomTypeDetailPage';
import AmenityManagementPage from './features/amenities/AmenityManagementPage';

/**
 * Root application component.
 * Configures routing for public/test views and the admin management portal.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public & Test pages with MainLayout */}
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

        {/* Admin Portal with dedicated AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/room-types" replace />} />
          <Route path="room-types" element={<RoomTypeManagementPage />} />
          <Route path="room-types/:id" element={<RoomTypeDetailPage />} />
          <Route path="amenities" element={<AmenityManagementPage />} />
          <Route path="facilities" element={<AmenityManagementPage />} />
        </Route>

        {/* Friendly redirect aliases */}
        <Route path="/room-types" element={<Navigate to="/admin/room-types" replace />} />
        <Route path="/amenities" element={<Navigate to="/admin/amenities" replace />} />
        <Route path="/facilities" element={<Navigate to="/admin/facilities" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
