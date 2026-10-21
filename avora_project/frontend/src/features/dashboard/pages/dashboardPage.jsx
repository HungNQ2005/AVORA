import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNav from '../components/dashboardNav';
import DashboardHeader from '../components/dashboardHeader';
import './dashboardPage.css';

const DashboardPage = ({ children }) => {
  return (
    <div className="dashboard-page">
      <DashboardNav />
      <div className="dashboard-page__main">
        <DashboardHeader />
        <main className="dashboard-page__content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;

