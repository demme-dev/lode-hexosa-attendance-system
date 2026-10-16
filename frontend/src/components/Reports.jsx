import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../services/api';
import { IconDownload } from './Icons';

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRangeForPeriod = (period, dateString) => {
  if (!dateString) return { startDate: '', endDate: '' };
  const date = new Date(`${dateString}T00:00:00`);
  if (period === 'daily') return { startDate: dateString, endDate: dateString };

  if (period === 'weekly') {
    const mondayOffset = (date.getDay() + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toDateString(monday), endDate: toDateString(sunday) };
  }

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startDate: toDateString(firstDay), endDate: toDateString(lastDay) };
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (time) => time ? String(time).slice(0, 5) : '—';

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === '') return '—';
  const totalMinutes = Number(minutes);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
};

const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

export default function Reports() {
  const today = toDateString(new Date());
  const [period, setPeriod] = useState('daily');
  const [anchorDate, setAnchorDate] = useState(today);
  const [range, setRange] = useState(() => getRangeForPeriod('daily', today));
  const [report, setReport] = useState({ summary: null, records: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextRange = getRangeForPeriod(period, anchorDate);
    setRange(nextRange);
  }, [period, anchorDate]);

  useEffect(() => {
    if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
      setError('Choose a valid date range.');
      setReport({ summary: null, records: [] });
      setIsLoading(false);
      return undefined;
    }

    let isCurrentRequest = true;
    setIsLoading(true);
    setError('');

    attendanceApi.getReport(range)
      .then((response) => {
        if (isCurrentRequest && response.success) {
          setReport(response.data);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setReport({ summary: null, records: [] });
          setError(requestError.message || 'Unable to load attendance report.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [range.startDate, range.endDate]);

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod);
  };

  const handleExport = () => {
    const columns = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Check-In', 'Check-Out', 'Duration', 'Status'];
    const rows = report.records.map((record) => [
      record.employee_id,
      record.employee_name,
      record.department,
      record.attendance_date,
      record.check_in,
      record.check_out,
      formatDuration(record.duration_minutes),
      record.status
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const file = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `attendance-report-${range.startDate}-to-${range.endDate}.csv`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const summary = report.summary || {};
  const statCards = [
    { label: 'Active Employees', value: summary.total_active_employees },
    { label: 'Present', value: summary.present_count },
    { label: 'Late', value: summary.late_count },
    { label: 'Absent', value: summary.absent_count },
    { label: 'Approved Leave', value: summary.leave_count },
    { label: 'Checked In', value: summary.checked_in_count },
    { label: 'Checked Out', value: summary.checked_out_count },
    { label: 'Not Yet Recorded', value: summary.not_yet_recorded_count }
  ];

  return (
    <div className="tab-reports-view">
      <div className="page-intro">
        <h2>Attendance Reports</h2>
        <p>Review attendance records and totals for a selected reporting period.</p>
      </div>

      <section className="report-controls table-card" aria-label="Report date range">
        <div className="report-period-control" role="group" aria-label="Report period">
          {['daily', 'weekly', 'monthly'].map((option) => (
            <button
              key={option}
              type="button"
              className={`report-period-button ${period === option ? 'report-period-button-active' : ''}`}
              aria-pressed={period === option}
              onClick={() => handlePeriodChange(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>

        <label className="report-date-field">
          <span>Period date</span>
          <input
            type="date"
            className="filter-date-input"
            value={anchorDate}
            onChange={(event) => setAnchorDate(event.target.value)}
          />
        </label>
        <label className="report-date-field">
          <span>Start date</span>
          <input
            type="date"
            className="filter-date-input"
            value={range.startDate}
            onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
          />
        </label>
        <label className="report-date-field">
          <span>End date</span>
          <input
            type="date"
            className="filter-date-input"
            value={range.endDate}
            onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
          />
        </label>

        <button
          className="btn-secondary report-export-button"
          type="button"
          onClick={handleExport}
          disabled={isLoading || report.records.length === 0}
          title="Export attendance rows as CSV"
        >
          <IconDownload size={18} />
          <span>Export CSV</span>
        </button>
      </section>

      {error && <div className="report-error" role="alert">{error}</div>}

      <div className="report-summary-grid" aria-live="polite">
        {statCards.map((card) => (
          <div className="report-summary-item" key={card.label}>
            <span className="report-summary-label">{card.label}</span>
            <strong className="report-summary-value">{isLoading ? '…' : Number(card.value || 0)}</strong>
          </div>
        ))}
      </div>

      <section className="table-card report-records-card">
        <div className="report-records-header">
          <div>
            <h3>Attendance Records</h3>
            <p>{formatDate(range.startDate)} – {formatDate(range.endDate)}</p>
          </div>
          <span className="report-record-count">{report.records.length} records</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="employee-table report-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.records.map((record, index) => (
                <tr key={`${record.employee_id}-${record.attendance_date}-${index}`}>
                  <td>{record.employee_id}</td>
                  <td>{record.employee_name || '—'}</td>
                  <td>{record.department || '—'}</td>
                  <td>{formatDate(record.attendance_date)}</td>
                  <td>{formatTime(record.check_in)}</td>
                  <td>{formatTime(record.check_out)}</td>
                  <td>{formatDuration(record.duration_minutes)}</td>
                  <td><span className={`report-status report-status-${String(record.status || '').toLowerCase()}`}>{record.status}</span></td>
                </tr>
              ))}
              {!isLoading && report.records.length === 0 && (
                <tr>
                  <td className="report-empty-state" colSpan="8">No attendance records exist for this date range.</td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td className="report-empty-state" colSpan="8">Loading attendance report…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
