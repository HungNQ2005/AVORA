import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './common/components/MainLayout';
import HomePage from './features/home/HomePage';
import TestConnectionPage from './features/connection_test/TestConnectionPage';

/**
 * Root application component.
 * Configures routing and wraps everything in MainLayout.
 */
function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/system_codes" element={<TestConnectionPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
