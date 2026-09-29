import React from 'react';
import './UserRoleTabs.css';

/**
 * Role tabs matching the reference image layout.
 */
const UserRoleTabs = ({ currentRole = 'ALL', onRoleChange, roleCounts = {}, total = 0 }) => {
  const tabs = [
    {
      id: 'ALL',
      label: 'Tất cả người dùng',
      count: total,
      icon: null,
    },
    {
      id: 'VEN',
      label: 'Hotel Manager',
      count: roleCounts.hotelManager ?? 42,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        </svg>
      ),
    },
    {
      id: 'BMR',
      label: 'Business Manager',
      count: roleCounts.businessManager ?? 28,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      id: 'CUS',
      label: 'Customer',
      count: roleCounts.customer ?? 52,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: 'ADM',
      label: 'System Admin',
      count: roleCounts.systemAdmin ?? 6,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="user-role-tabs">
      {tabs.map((tab) => {
        const isActive = currentRole === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`user-role-tab ${isActive ? 'user-role-tab--active' : ''}`}
            onClick={() => onRoleChange(tab.id)}
          >
            {tab.icon && <span className="user-role-tab__icon">{tab.icon}</span>}
            <span className="user-role-tab__label">{tab.label}</span>
            <span className={`user-role-tab__count ${isActive ? 'user-role-tab__count--active' : ''}`}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default UserRoleTabs;
