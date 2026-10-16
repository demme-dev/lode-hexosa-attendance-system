import React from 'react';
import { 
  IconDashboard, 
  IconUsers, 
  IconCalendar, 
  IconBuilding, 
  IconSettings, 
  IconShield,
  IconClose,
  IconFileText
} from './Icons';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, role }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
    { id: 'employees', label: 'Employees', icon: IconUsers, badge: 'Active' },
    { id: 'attendance', label: 'Attendance', icon: IconCalendar },
    { id: 'reports', label: 'Reports', icon: IconFileText },
    { id: 'users', label: 'User Accounts', icon: IconShield },
    { id: 'departments', label: 'Departments', icon: IconBuilding },
    { id: 'settings', label: 'Settings', icon: IconSettings }
  ];
  const visibleNavItems = role === 'Administrator'
    ? navItems
    : navItems.filter((item) => !['employees', 'users', 'departments', 'settings'].includes(item.id));

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsOpen(false)} 
          aria-hidden="true" 
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Header / Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-logo-emblem">LH</div>
            <div className="brand-text">
              <span className="brand-name">Lode Hexosa</span>
              <span className="brand-subtitle">Administration System</span>
            </div>
          </div>
          <button 
            className="sidebar-close-btn" 
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation sidebar"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">MAIN MENU</div>
          <ul className="nav-list">
            {visibleNavItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id
                || (activeTab === 'employee-profile' && item.id === 'employees');
              return (
                <li key={item.id} className="nav-item">
                  <button
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                  >
                    <IconComponent size={20} className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer System Status */}
        <div className="sidebar-footer">
          <div className="system-status-card">
            <div className="status-indicator-row">
              <span className="status-beacon"></span>
              <span className="status-title">Backend Status</span>
            </div>
            <div className="status-detail">
              <IconShield size={14} className="status-icon" />
              <span>API: Port 5000</span>
            </div>
            <div className="status-badge-live">MySQL Online</div>
          </div>
        </div>
      </aside>
    </>
  );
}
