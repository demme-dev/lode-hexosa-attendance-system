import React from 'react';
import { 
  IconUserPlus, 
  IconRefresh,
  IconLogOut
} from './Icons';

export default function Header({ 
  onOpenAddModal, 
  onRefresh, 
  isRefreshing, 
  onToggleSidebar, 
  totalCount,
  activeTab,
  user,
  onLogout
}) {
  const getTabTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'employees': return 'Employee Directory & Attendance';
      case 'employee-profile': return 'Employee Profile';
      case 'attendance': return 'Daily Attendance Logs';
      case 'reports': return 'Attendance Reports';
      case 'users': return 'User Accounts';
      case 'departments': return 'Department Units';
      case 'settings': return 'System Settings';
      default: return 'Administration Dashboard';
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="mobile-menu-toggle" 
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-title-box">
          <h1 className="header-page-title">{getTabTitle()}</h1>
          <p className="header-page-subtitle">
            Lode Hexosa Administration • {totalCount} Registered Employee{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="header-right">
        {/* Sync / Refresh Button */}
        <button 
          className={`btn-icon-secondary ${isRefreshing ? 'is-spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh employees list from MySQL"
          disabled={isRefreshing}
          aria-label="Refresh employees list"
        >
          <IconRefresh size={18} />
        </button>

        {/* Add Employee CTA */}
        {user?.role === 'Administrator' && activeTab !== 'employee-profile' && <button 
          className="btn-primary" 
          onClick={onOpenAddModal}
        >
          <IconUserPlus size={18} />
          <span>Add Employee</span>
        </button>}

        {/* User Profile Avatar */}
        <div className="admin-profile">
          <div className="admin-avatar">DH</div>
          <div className="admin-info">
            <span className="admin-name">{user?.full_name}</span>
            <span className="admin-role">{user?.role}</span>
          </div>
        </div>
        <button className="btn-icon-secondary" onClick={onLogout} title="Sign out" aria-label="Sign out">
          <IconLogOut size={18} />
        </button>
      </div>
    </header>
  );
}
