import React from 'react';
import { 
  IconSearch, 
  IconFilter, 
  IconCalendar, 
  IconClock, 
  IconEdit, 
  IconTrash, 
  IconLogIn, 
  IconLogOut, 
  IconRefresh,
  IconCheckCircle
} from './Icons';

export default function AttendanceTable({
  records = [],
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedDate,
  setSelectedDate,
  selectedStatus,
  setSelectedStatus,
  onOpenCheckInModal,
  onOpenCheckOutModal,
  onOpenRecordModal,
  onOpenEditModal,
  onQuickCheckOut,
  onDeleteRecord,
  onClearFilters,
  onRefresh,
  isRefreshing,
  userRole = 'HR Staff'
}) {
  // Helper to generate initials from employee name
  const getInitials = (name = '') => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper to format date nicely (e.g. "Oct 14, 2026")
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper to format time (e.g. 08:45:00 -> 08:45 AM)
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    try {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        let hour = Number(parts[0]);
        const minute = parts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 becomes 12
        return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  // Helper to calculate duration between check-in and check-out
  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn) return '—';
    if (!checkOut) return 'In Progress';
    try {
      const inParts = checkIn.split(':').map(Number);
      const outParts = checkOut.split(':').map(Number);
      const inMinutes = inParts[0] * 60 + inParts[1];
      const outMinutes = outParts[0] * 60 + outParts[1];
      let diff = outMinutes - inMinutes;
      if (diff < 0) diff += 24 * 60; // Over midnight if applicable
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return `${hours}h ${minutes}m`;
    } catch {
      return '—';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present':
        return 'pill-active'; // Emerald green
      case 'Late':
        return 'pill-late'; // Amber / Orange
      case 'Absent':
        return 'pill-inactive'; // Red / Rose
      case 'Leave':
        return 'pill-leave'; // Purple / Indigo
      default:
        return 'pill-active';
    }
  };

  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hasActiveFilters = Boolean(searchQuery || selectedDate || selectedStatus);

  return (
    <div className="table-card">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        {/* Search Input */}
        <div className="search-box">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID, employee name, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="filter-group">
          {/* Date Picker Filter */}
          <div className="date-filter-wrapper">
            <IconCalendar size={15} className="select-icon" />
            <input
              type="date"
              className="filter-date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter records by date"
            />
            {selectedDate && (
              <button
                className="date-clear-pill"
                onClick={() => setSelectedDate('')}
                title="Clear date filter to show all dates"
              >
                All Dates
              </button>
            )}
            {!selectedDate && (
              <button
                className="date-today-pill"
                onClick={() => setSelectedDate(getTodayDate())}
                title="Filter for today's logs"
              >
                Today
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="select-wrapper">
            <IconFilter size={15} className="select-icon" />
            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by attendance status"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present Only</option>
              <option value="Late">Late Arrivals</option>
              <option value="Absent">Absent</option>
              <option value="Leave">On Leave</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              className="btn-text-secondary"
              onClick={onClearFilters}
              title="Reset all filters"
            >
              Reset Filters
            </button>
          )}

          {/* Action Buttons */}
          <div className="toolbar-actions">
            <button
              className={`btn-icon-secondary ${isRefreshing ? 'is-spinning' : ''}`}
              onClick={onRefresh}
              title="Refresh attendance records"
              disabled={isRefreshing}
            >
              <IconRefresh size={16} />
            </button>

            <button
              className="btn-primary btn-sm"
              onClick={onOpenCheckInModal}
              title="Record morning check-in for an employee"
            >
              <IconLogIn size={15} />
              <span>Check-In</span>
            </button>

            <button
              className="btn-secondary btn-sm"
              onClick={onOpenCheckOutModal}
              title="Record evening check-out for an employee"
            >
              <IconLogOut size={15} />
              <span>Check-Out</span>
            </button>

            {userRole === 'Administrator' && <button
              className="btn-text-secondary btn-sm"
              onClick={onOpenRecordModal}
              title="Add manual record or approved leave"
            >
              <span>+ Log Leave</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="table-status-bar">
        <span className="results-count">
          Showing <strong>{records.length}</strong> attendance record{records.length !== 1 ? 's' : ''}
          {selectedDate ? ` for ${formatDate(selectedDate)}` : ' (All Dates)'}
          {selectedStatus ? ` • Status: ${selectedStatus}` : ''}
          {hasActiveFilters ? ' • Filtered' : ''}
        </span>
      </div>

      {/* Table Container */}
      <div className="table-responsive-wrapper">
        <table className="employee-table attendance-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="table-cell-loading">
                  <div className="loading-state-box">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading attendance records from MySQL...</p>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-cell-empty">
                  <div className="empty-state-box">
                    <div className="empty-state-icon">⏱️</div>
                    <h3 className="empty-state-title">No attendance logs found</h3>
                    <p className="empty-state-desc">
                      {hasActiveFilters
                        ? "No attendance entries matched the selected date or filter criteria."
                        : "No attendance logs have been recorded yet. Click below to record check-in."}
                    </p>
                    {hasActiveFilters ? (
                      <button className="btn-secondary" onClick={onClearFilters}>
                        Clear Filters
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={onOpenCheckInModal}>
                        <IconLogIn size={16} />
                        <span>Record First Check-In</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              records.map((rec) => {
                const isWorking = rec.check_in && !rec.check_out;
                const formattedIn = formatTime(rec.check_in);
                const formattedOut = formatTime(rec.check_out);
                const duration = calculateDuration(rec.check_in, rec.check_out);

                return (
                  <tr key={rec.id} className="table-row">
                    {/* Employee ID */}
                    <td className="cell-id">
                      <span className="id-badge">{rec.employee_id}</span>
                    </td>

                    {/* Employee Name */}
                    <td className="cell-name">
                      <div className="employee-profile-cell">
                        <div className="employee-avatar avatar-active">
                          {getInitials(rec.employee_name)}
                        </div>
                        <div className="employee-name-details">
                          <span className="employee-fullname">
                            {rec.employee_name || 'Staff Member'}
                          </span>
                          <span className="employee-department">
                            {rec.department || rec.position || 'Employee'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Attendance Date */}
                    <td>
                      <div className="table-date-cell">
                        <IconCalendar size={14} className="cell-icon-muted" />
                        <span>{formatDate(rec.attendance_date)}</span>
                      </div>
                    </td>

                    {/* Check-In Time */}
                    <td>
                      {formattedIn ? (
                        <div className="time-badge in-time-badge" title={`Check-in: ${rec.check_in}`}>
                          <span className="time-dot green-dot"></span>
                          <span>{formattedIn}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Check-Out Time */}
                    <td>
                      {formattedOut ? (
                        <div className="time-badge out-time-badge" title={`Check-out: ${rec.check_out}`}>
                          <span className="time-dot blue-dot"></span>
                          <span>{formattedOut}</span>
                        </div>
                      ) : isWorking ? (
                        <span className="badge-working-pulse" title="Employee currently checked in">
                          ● On-Site
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Work Duration */}
                    <td>
                      <span className={`duration-badge ${isWorking ? 'duration-in-progress' : ''}`}>
                        {duration}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(rec.status)}`}>
                        {rec.status}
                      </span>
                      {rec.notes && (
                        <div className="table-note-preview" title={rec.notes}>
                          {rec.notes}
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="text-right">
                      <div className="action-buttons-group">
                        {/* One-Click Check-Out if employee is on-site */}
                        {isWorking && (
                          <button
                            className="btn-quick-checkout"
                            onClick={() => onQuickCheckOut(rec)}
                            title={`Check out ${rec.employee_name}`}
                          >
                            <IconLogOut size={14} />
                            <span>Check-Out</span>
                          </button>
                        )}

                        {/* Edit Record */}
                        <button
                          className="btn-action-icon"
                          onClick={() => onOpenEditModal(rec)}
                          title="Edit attendance entry"
                          aria-label="Edit attendance"
                        >
                          <IconEdit size={16} />
                        </button>

                        {/* Delete Record */}
                        {userRole === 'Administrator' && <button
                          className="btn-action-icon btn-action-delete"
                          onClick={() => onDeleteRecord(rec)}
                          title="Delete attendance record"
                          aria-label="Delete attendance"
                        >
                          <IconTrash size={16} />
                        </button>}
                      </div>
                    </td>
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
