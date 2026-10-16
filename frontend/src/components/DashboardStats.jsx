import React from 'react';
import { 
  IconUsers, 
  IconCheckCircle, 
  IconXCircle, 
  IconBuilding 
} from './Icons';

export default function DashboardStats({ employees = [] }) {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const inactiveEmployees = employees.filter(e => e.status === 'Inactive').length;

  // Extract unique departments
  const uniqueDepartments = Array.from(
    new Set(employees.map(e => e.department).filter(Boolean))
  );
  const departmentCount = uniqueDepartments.length;

  const activePercentage = totalEmployees > 0 
    ? Math.round((activeEmployees / totalEmployees) * 100) 
    : 0;

  const statCards = [
    {
      id: 'total',
      title: 'Total Employees',
      value: totalEmployees,
      caption: 'Registered in database',
      icon: IconUsers,
      color: 'blue'
    },
    {
      id: 'active',
      title: 'Active Employees',
      value: activeEmployees,
      caption: `${activePercentage}% active roster rate`,
      icon: IconCheckCircle,
      color: 'emerald'
    },
    {
      id: 'inactive',
      title: 'Inactive / On Leave',
      value: inactiveEmployees,
      caption: 'Suspended or off-duty',
      icon: IconXCircle,
      color: 'rose'
    },
    {
      id: 'departments',
      title: 'Departments',
      value: departmentCount,
      caption: `${departmentCount} operating branch${departmentCount === 1 ? '' : 'es'}`,
      icon: IconBuilding,
      color: 'purple'
    }
  ];

  return (
    <div className="dashboard-stats-grid">
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
