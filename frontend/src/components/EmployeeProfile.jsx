import React, { useEffect, useState } from 'react';
import { attendanceApi, employeeApi } from '../services/api';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (time) => time ? String(time).slice(0, 5) : '—';

export default function EmployeeProfile({ employeeId, onBack }) {
  const [employee, setEmployee] = useState(null);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState('');
  const [profileReload, setProfileReload] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedRange, setAppliedRange] = useState({ startDate: '', endDate: '' });
  const [rangeError, setRangeError] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceReload, setAttendanceReload] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;
    setIsEmployeeLoading(true);
    setEmployeeError('');
    setEmployee(null);

    employeeApi.getById(employeeId)
      .then((response) => {
        if (!response?.success || !response.data) throw new Error('Employee profile was not found.');
        if (isCurrentRequest) setEmployee(response.data);
      })
      .catch((error) => {
        if (isCurrentRequest) setEmployeeError(error.message || 'Unable to load this employee profile.');
      })
      .finally(() => {
        if (isCurrentRequest) setIsEmployeeLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [employeeId, profileReload]);

  useEffect(() => {
    if (!employee?.employee_id) return undefined;

    let isCurrentRequest = true;
    setIsAttendanceLoading(true);
    setAttendanceError('');
    setAttendanceRecords([]);

    attendanceApi.getAll({
      employeeId: employee.employee_id,
      startDate: appliedRange.startDate,
      endDate: appliedRange.endDate
    })
      .then((response) => {
        if (!response?.success || !Array.isArray(response.data)) {
          throw new Error('Attendance history could not be loaded.');
        }
        if (isCurrentRequest) setAttendanceRecords(response.data);
      })
      .catch((error) => {
        if (isCurrentRequest) {
          setAttendanceRecords([]);
          setAttendanceError(error.message || 'Unable to load attendance history.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsAttendanceLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [employee?.employee_id, appliedRange.startDate, appliedRange.endDate, attendanceReload]);

  const handleApplyRange = (event) => {
    event.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setRangeError('Start date must be on or before the end date.');
      return;
    }
    setRangeError('');
    setAppliedRange({ startDate, endDate });
  };

  const handleClearRange = () => {
    setStartDate('');
    setEndDate('');
    setRangeError('');
    setAppliedRange({ startDate: '', endDate: '' });
  };

  const fullName = employee
    ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
    : '';
  const initials = employee
    ? `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase() || 'EM'
    : 'EM';
  const statusClass = employee?.status === 'Active' ? 'pill-active' : 'pill-inactive';
  const profileFields = employee ? [
    ['Employee ID', employee.employee_id],
    ['Full name', fullName],
    ['Gender', employee.gender],
    ['Department', employee.department],
    ['Position', employee.position],
    ['Status', employee.status],
    ['Email', employee.email],
    ['Phone', employee.phone],
    ['Hire date', formatDate(employee.hire_date)]
  ] : [];

  return (
    <div className="employee-profile-view">
      <button className="btn-text-secondary employee-profile-back" type="button" onClick={onBack}>
        Back to Employees
      </button>

      <div className="page-intro">
        <h2>Employee Profile</h2>
        <p>Employee details and attendance history.</p>
      </div>

      {employeeError && (
        <div className="employee-profile-error" role="alert">
          <span>{employeeError}</span>
          <button className="btn-secondary" type="button" onClick={() => setProfileReload((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}

      {isEmployeeLoading ? (
        <section className="table-card employee-profile-empty" aria-live="polite">Loading employee profile…</section>
      ) : employee && (
        <section className="table-card employee-profile-card" aria-label="Employee details">
          <div className="employee-profile-heading">
            <div className="employee-avatar avatar-active" aria-hidden="true">{initials}</div>
            <div>
              <h3>{fullName || 'Employee'}</h3>
              <p>{employee.employee_id || '—'}</p>
            </div>
          </div>
          <dl className="employee-profile-grid">
            {profileFields.map(([label, value]) => (
              <div className="employee-profile-field" key={label}>
                <dt>{label}</dt>
                <dd>
                  {label === 'Status' && value
                    ? <span className={`status-pill ${statusClass}`}><span className="status-dot" />{value}</span>
                    : value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {employee && (
        <section className="table-card employee-history-card" aria-label="Employee attendance history">
          <div className="table-toolbar employee-history-toolbar">
            <div>
              <h3>Attendance History</h3>
              <p>Check-in, check-out, and status records for this employee.</p>
            </div>
            <form className="employee-history-filter" onSubmit={handleApplyRange}>
              <label className="report-date-field">
                <span>From</span>
                <input className="filter-date-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label className="report-date-field">
                <span>To</span>
                <input className="filter-date-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
              <div className="employee-history-actions">
                <button className="btn-secondary" type="submit">Apply</button>
                {(startDate || endDate || appliedRange.startDate || appliedRange.endDate) && (
                  <button className="btn-text-secondary" type="button" onClick={handleClearRange}>Clear</button>
                )}
              </div>
            </form>
          </div>

          {rangeError && <p className="employee-profile-error" role="alert">{rangeError}</p>}
          {attendanceError && (
            <div className="employee-profile-error" role="alert">
              <span>{attendanceError}</span>
              <button className="btn-secondary" type="button" onClick={() => setAttendanceReload((value) => value + 1)}>
                Retry
              </button>
            </div>
          )}
          <div className="employee-history-count" aria-live="polite">
            {isAttendanceLoading ? 'Loading attendance history…' : `${attendanceRecords.length} attendance record${attendanceRecords.length === 1 ? '' : 's'}`}
          </div>
          <div className="table-responsive-wrapper">
            <table className="employee-table employee-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isAttendanceLoading && (
                  <tr><td className="employee-profile-empty" colSpan="4">Loading attendance history…</td></tr>
                )}
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.attendance_date)}</td>
                    <td>{formatTime(record.check_in)}</td>
                    <td>{formatTime(record.check_out)}</td>
                    <td>
                      <span className={`report-status report-status-${String(record.status || '').toLowerCase()}`}>
                        {record.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!isAttendanceLoading && !attendanceError && attendanceRecords.length === 0 && (
                  <tr><td className="employee-profile-empty" colSpan="4">No attendance records found for this employee and date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
