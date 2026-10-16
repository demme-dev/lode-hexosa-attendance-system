import React, { useEffect, useMemo, useState } from 'react';
import { attendanceApi } from '../services/api';

const STATUS_SERIES = [
  { key: 'present_count', label: 'Present', color: 'present' },
  { key: 'absent_count', label: 'Absent', color: 'absent' },
  { key: 'late_count', label: 'Late', color: 'late' },
  { key: 'leave_count', label: 'Leave', color: 'leave' }
];

const getTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateString, offset) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!dateString) return '—';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', options);
};

const buildWeeklyTrend = (records, dates) => dates.map((date) => {
  const uniqueEmployees = new Map();
  records.forEach((record) => {
    if (record.attendance_date === date && !uniqueEmployees.has(record.employee_id)) {
      uniqueEmployees.set(record.employee_id, record.status);
    }
  });

  const counts = Object.fromEntries(STATUS_SERIES.map(({ key }) => [key, 0]));
  uniqueEmployees.forEach((status) => {
    const item = STATUS_SERIES.find((series) => series.label === status);
    if (item) counts[item.key] += 1;
  });

  return {
    date,
    label: formatDate(date, { weekday: 'short' }),
    day: formatDate(date, { month: 'short', day: 'numeric' }),
    counts,
    total: uniqueEmployees.size
  };
});

const StatCard = ({ label, value, color }) => (
  <article className="dashboard-metric">
    <span className="dashboard-metric-label">{label}</span>
    <strong className={`dashboard-metric-value dashboard-metric-${color}`}>{value}</strong>
  </article>
);

export default function DashboardOverview() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const weekDates = useMemo(
    () => selectedDate ? Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 6)) : [],
    [selectedDate]
  );
  const weeklyTrend = useMemo(() => buildWeeklyTrend(records, weekDates), [records, weekDates]);
  const maxDailyStatusCount = Math.max(1, ...STATUS_SERIES.map(({ key }) => Number(summary?.[key] || 0)));
  const maxWeeklyStatusCount = Math.max(1, ...weeklyTrend.flatMap((day) =>
    STATUS_SERIES.map(({ key }) => day.counts[key])
  ));

  useEffect(() => {
    if (!selectedDate) {
      setError('Choose a date to view attendance.');
      setSummary(null);
      setRecords([]);
      setIsLoading(false);
      return undefined;
    }

    let isCurrentRequest = true;
    const startDate = addDays(selectedDate, -6);
    setIsLoading(true);
    setError('');
    setSummary(null);
    setRecords([]);

    Promise.all([
      attendanceApi.getSummary(selectedDate),
      attendanceApi.getAll({ startDate, endDate: selectedDate })
    ])
      .then(([summaryResponse, recordsResponse]) => {
        if (!summaryResponse?.success || !summaryResponse.data
            || !recordsResponse?.success || !Array.isArray(recordsResponse.data)) {
          throw new Error('The attendance service returned an incomplete dashboard response.');
        }
        if (isCurrentRequest) {
          setSummary(summaryResponse.data);
          setRecords(recordsResponse.data);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setSummary(null);
          setRecords([]);
          setError(requestError.message || 'Unable to load dashboard attendance.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedDate, reloadKey]);

  const dailyTotal = Number(summary?.total_records || 0);
  const dailyCards = [
    { label: 'Active Employees', value: summary?.total_active_employees, color: 'active' },
    { label: 'Present', value: summary?.present_count, color: 'present' },
    { label: 'Absent', value: summary?.absent_count, color: 'absent' },
    { label: 'Late', value: summary?.late_count, color: 'late' },
    { label: 'On Leave', value: summary?.leave_count, color: 'leave' },
    { label: 'Not Yet Recorded', value: summary?.not_yet_recorded_count, color: 'unrecorded' }
  ];

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview-heading">
        <div className="page-intro">
          <h2>System Overview</h2>
          <p>Attendance totals and activity across the selected date.</p>
        </div>
        <label className="dashboard-date-field">
          <span>Dashboard date</span>
          <input
            aria-label="Dashboard date"
            type="date"
            required
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <div className="dashboard-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-metrics" aria-label={`Attendance statistics for ${formatDate(selectedDate)}`} aria-live="polite">
        {dailyCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={isLoading ? '…' : Number(card.value || 0)}
            color={card.color}
          />
        ))}
      </section>

      <section className="dashboard-chart-grid">
        <article className="dashboard-chart-panel">
          <header className="dashboard-chart-header">
            <div>
              <h3>Attendance Overview</h3>
              <p>{formatDate(selectedDate)}</p>
            </div>
            <span className="dashboard-chart-total">{isLoading ? '…' : dailyTotal} records</span>
          </header>
          <div className="status-chart" role="img" aria-label={STATUS_SERIES.map(({ key, label }) => `${label}: ${Number(summary?.[key] || 0)}`).join(', ')}>
            {STATUS_SERIES.map((item) => {
              const value = Number(summary?.[item.key] || 0);
              const width = value ? Math.max((value / maxDailyStatusCount) * 100, 4) : 0;
              return (
                <div className="status-chart-row" key={item.key}>
                  <span className="status-chart-label">{item.label}</span>
                  <div className="status-chart-track">
                    <span className={`status-chart-fill status-chart-${item.color}`} style={{ width: `${width}%` }} />
                  </div>
                  <strong className="status-chart-value">{isLoading ? '…' : value}</strong>
                </div>
              );
            })}
          </div>
          {!isLoading && dailyTotal === 0 && !error && (
            <p className="dashboard-chart-empty">No attendance records exist for this date.</p>
          )}
        </article>

        <article className="dashboard-chart-panel dashboard-trend-panel">
          <header className="dashboard-chart-header">
            <div>
              <h3>Weekly Attendance Trend</h3>
              <p>{formatDate(weekDates[0])} – {formatDate(selectedDate)}</p>
            </div>
          </header>
          <div className="trend-legend" aria-label="Attendance status legend">
            {STATUS_SERIES.map((item) => (
              <span className="trend-legend-item" key={item.key}>
                <i className={`trend-legend-dot trend-dot-${item.color}`} />{item.label}
              </span>
            ))}
          </div>
          <div className="weekly-chart-scroll">
            <div className="weekly-chart" role="group" aria-label="Seven-day attendance trend">
              {weeklyTrend.map((day) => (
                <div className="weekly-chart-day" role="group" key={day.date} aria-label={`${day.label} ${day.day}: ${STATUS_SERIES.map((item) => `${item.label} ${day.counts[item.key]}`).join(', ')}`}>
                  <span className="weekly-chart-total">{isLoading ? '…' : day.total}</span>
                  <div className="weekly-chart-bars" aria-hidden="true">
                    {STATUS_SERIES.map((item) => {
                      const value = day.counts[item.key];
                      const height = value ? Math.max((value / maxWeeklyStatusCount) * 100, 4) : 0;
                      return (
                        <span className={`weekly-chart-bar weekly-bar-${item.color}`} key={item.key} style={{ height: `${height}%` }} />
                      );
                    })}
                  </div>
                  <span className="weekly-chart-day-label">{day.label}</span>
                  <span className="weekly-chart-date-label">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
          {!isLoading && weeklyTrend.every((day) => day.total === 0) && !error && (
            <p className="dashboard-chart-empty">No attendance records exist in this seven-day period.</p>
          )}
          {!isLoading && weeklyTrend.some((day) => day.total > 0) && (
            <div className="weekly-counts-table" role="group" aria-label="Weekly attendance record totals">
              {weeklyTrend.map((day) => (
                <span key={day.date} title={day.date}>
                  {day.label} {day.day}: {day.total} record{day.total === 1 ? '' : 's'}
                </span>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
