import React from 'react';
import Header from './Header';
import Footer from './Footer';
import './MainLayout.css';

/**
 * MainLayout — wraps all pages with Header + main content area + Footer.
 * @param {{ children: React.ReactNode }} props
 */
const MainLayout = ({ children }) => {
  return (
    <div className="avora-layout">
      <Header />
      <main className="avora-layout__main">
        <div className="avora-layout__container">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;