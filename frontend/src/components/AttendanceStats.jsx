import React from 'react';
import { 
  IconCheckCircle, 
  IconClock, 
  IconXCircle, 
  IconCalendar,
  IconLogIn,
  IconAlert
} from './Icons';

export default function AttendanceStats({ summary = {}, totalEmployees = 0, selectedDate = '' }) {
  const presentCount = summary.present_count || 0;
  const lateCount = summary.late_count || 0;
  const absentCount = summary.absent_count || 0;
  const leaveCount = summary.leave_count || 0;
  const checkedInCount = summary.checked_in_count || 0;
  const currentlyWorking = summary.currently_working_count || 0;
  const checkedOutCount = summary.checked_out_count || 0;
  const notYetRecordedCount = summary.not_yet_recorded_count || 0;

  const totalAttendanceRecorded = summary.total_records || 0;

  const statCards = [
    {
      id: 'present',
      title: 'Present On-Time',
      value: presentCount,
      caption: `${totalAttendanceRecorded > 0 ? Math.round((presentCount / totalAttendanceRecorded) * 100) : 0}% of logs today`,
      icon: IconCheckCircle,
      color: 'emerald'
    },
    {
      id: 'late',
      title: 'Late Arrivals',
      value: lateCount,
      caption: 'Checked in after 09:15',
      icon: IconClock,
      color: 'accent'
    },
    {
      id: 'working',
      title: 'Currently On-Site',
      value: currentlyWorking,
      caption: `${checkedOutCount} already checked out`,
      icon: IconLogIn,
      color: 'blue'
    },
    {
      id: 'leave_absent',
      title: 'Absent / On Leave',
      value: absentCount + leaveCount,
      caption: `${leaveCount} approved leave, ${absentCount} absent`,
      icon: IconCalendar,
      color: 'purple'
    },
    {
      id: 'not_yet_recorded',
      title: 'Not Yet Recorded',
      value: notYetRecordedCount,
      caption: 'No attendance record for this date',
      icon: IconAlert,
      color: 'rose'
    }
  ];

  return (
    <div className="dashboard-stats-grid attendance-stats-grid mb-6">
      {statCards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div key={card.id} className={`stat-card stat-card-${card.color}`}>
            <div className="stat-card-header">
              <span className="stat-card-title">{card.title}</span>
              <div className={`stat-icon-wrapper stat-icon-${card.color}`}>
                <IconComponent size={22} />
              </div>
            </div>
            <div className="stat-card-body">
              <span className="stat-card-value">{card.value}</span>
              <span className="stat-card-caption">{card.caption}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
