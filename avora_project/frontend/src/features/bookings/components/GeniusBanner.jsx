import React from 'react';


const GeniusBanner = ({ user }) => {
  return (
    <div className="genius-banner">
      <h4>Xin chào, {user?.full_name || 'bạn'}</h4>
    </div>
  );
};

export default GeniusBanner;
