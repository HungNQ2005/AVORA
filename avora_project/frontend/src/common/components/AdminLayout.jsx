import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

/**
 * AdminLayout — wraps admin portal pages with Sidebar.
 * Compatible with nested React Router routes or direct children.
 */
const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-layout__main">
        <main className="admin-layout__content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
