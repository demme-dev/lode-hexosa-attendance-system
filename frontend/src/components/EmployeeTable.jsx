import React from 'react';
import { 
  IconSearch, 
  IconFilter, 
  IconEdit, 
  IconPower, 
  IconMail, 
  IconPhone, 
  IconCalendar,
  IconUsers,
  IconUserPlus,
  IconRefresh
} from './Icons';

export default function EmployeeTable({
  employees = [],
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedDepartment,
  setSelectedDepartment,
  selectedStatus,
  setSelectedStatus,
  onEditEmployee,
  onRequestStatusToggle,
  onOpenAddModal,
  onViewProfile,
  departments = [],
  onClearFilters,
  canManage = true
}) {
  // Helper to generate consistent initials from employee name
  const getInitials = (firstName = '', lastName = '') => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || 'EM';
  };

  // Helper to format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return dateStr;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const hasActiveFilters = Boolean(searchQuery || selectedDepartment || selectedStatus);

  return (
    <div className="table-card">
      {/* Table Controls / Filter Toolbar */}
      <div className="table-toolbar">
        {/* Search Input */}
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            id="employee-search"
            type="text"
            className="search-input"
            aria-label="Search employees by ID, name, email, or position"
            autoComplete="off"
            maxLength={120}
            placeholder="Search by ID, name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button"
              className="search-clear-btn" 
              onClick={() => setSearchQuery('')}
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="filter-group">
          {/* Department Filter */}
          <div className="select-wrapper">
            <IconFilter size={15} className="select-icon" />
            <select
              className="filter-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="select-wrapper">
            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Clear Filters Button if any filter active */}
          {hasActiveFilters && (
            <button 
              type="button"
              className="btn-text-secondary" 
              onClick={onClearFilters}
              title="Reset search and filters"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Results Count Bar */}
      <div className="table-status-bar">
        <span className="results-count">
          Showing <strong>{employees.length}</strong> {employees.length === 1 ? 'employee' : 'employees'}
          {hasActiveFilters ? ' (filtered)' : ''}
        </span>
      </div>

      {/* Main Table Responsive Container */}
      <div className="table-responsive-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Full Name</th>
              <th>Department & Role</th>
              <th>Contact Info</th>
              <th>Hire Date</th>
              <th>Status</th>
              {canManage && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading Skeleton State
              <tr>
                <td colSpan={canManage ? '7' : '6'} className="table-cell-loading">
                  <div className="loading-state-box">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading employee records from MySQL database...</p>
                  </div>
                </td>
              </tr>
            ) : employees.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={canManage ? '7' : '6'} className="table-cell-empty">
                  <div className="empty-state-box">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">No employees found</h3>
                    <p className="empty-state-desc">
                      {hasActiveFilters 
                        ? "No employee records match your search or selected filters." 
                        : "There are currently no employee records registered in the system."}
                    </p>
                    {hasActiveFilters ? (
                      <button className="btn-secondary" onClick={onClearFilters}>
                        Clear Search & Filters
                      </button>
                    ) : canManage ? (
                      <button className="btn-primary" onClick={onOpenAddModal}>
                        <IconUserPlus size={16} />
                        <span>Add First Employee</span>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              // Employee Rows
              employees.map((emp) => {
                const isActive = emp.status === 'Active';
                return (
                  <tr key={emp.id} className={`table-row ${!isActive ? 'row-inactive' : ''}`}>
                    {/* Employee ID */}
                    <td className="cell-id">
                      <span className="id-badge">{emp.employee_id}</span>
                    </td>

                    {/* Employee Name & Avatar */}
                    <td className="cell-name">
                      <div className="employee-profile-cell">
                        <div className={`employee-avatar ${isActive ? 'avatar-active' : 'avatar-inactive'}`}>
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div className="employee-name-meta">
                          <span className="employee-full-name">
                            {emp.first_name} {emp.last_name}
                          </span>
                          {emp.gender && (
                            <span className="employee-gender-tag">{emp.gender}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="cell-dept">
                      <div className="dept-cell-content">
                        <span className="dept-name">
                          {emp.department || <span className="text-muted">Unassigned</span>}
                        </span>
                        <span className="position-title">
                          {emp.position || <span className="text-muted">No position specified</span>}
                        </span>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="cell-contact">
                      <div className="contact-list">
                        {emp.email ? (
                          <a href={`mailto:${emp.email}`} className="contact-item" title={emp.email}>
                            <IconMail size={14} className="contact-icon" />
                            <span className="contact-text">{emp.email}</span>
                          </a>
                        ) : (
                          <span className="contact-item contact-empty">—</span>
                        )}
                        {emp.phone && (
                          <a href={`tel:${emp.phone}`} className="contact-item" title={emp.phone}>
                            <IconPhone size={14} className="contact-icon" />
                            <span className="contact-text">{emp.phone}</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Hire Date */}
                    <td className="cell-date">
                      <div className="date-badge">
                        <IconCalendar size={13} className="date-icon" />
                        <span>{formatDate(emp.hire_date)}</span>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="cell-status">
                      <span className={`status-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
                        <span className="status-dot"></span>
                        {emp.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    {canManage && <td className="cell-actions text-right">
                      <div className="action-buttons-group">
                        <button
                          className="btn-action btn-action-edit"
                          onClick={() => onViewProfile?.(emp)}
                          title="View employee profile and attendance history"
                          aria-label={`View profile for ${emp.first_name} ${emp.last_name}`}
                        >
                          <IconUsers size={16} />
                          <span className="action-label">Profile</span>
                        </button>
                        <button
                          className="btn-action btn-action-edit"
                          onClick={() => onEditEmployee(emp)}
                          title="Edit employee details"
                          aria-label={`Edit ${emp.first_name} ${emp.last_name}`}
                        >
                          <IconEdit size={16} />
                          <span className="action-label">Edit</span>
                        </button>

                        <button
                          className={`btn-action ${isActive ? 'btn-action-deactivate' : 'btn-action-activate'}`}
                          onClick={() => onRequestStatusToggle(emp)}
                          title={isActive ? 'Deactivate employee' : 'Activate employee'}
                          aria-label={isActive ? `Deactivate ${emp.first_name}` : `Activate ${emp.first_name}`}
                        >
                          <IconPower size={15} />
                          <span className="action-label">{isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
