import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { employeeApi, attendanceApi, authApi } from './services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardStats from './components/DashboardStats';
import DashboardOverview from './components/DashboardOverview';
import EmployeeTable from './components/EmployeeTable';
import EmployeeProfile from './components/EmployeeProfile';
import EmployeeModal from './components/EmployeeModal';
import StatusConfirmModal from './components/StatusConfirmModal';
import AttendanceStats from './components/AttendanceStats';
import AttendanceTable from './components/AttendanceTable';
import AttendanceModal from './components/AttendanceModal';
import AttendanceDeleteModal from './components/AttendanceDeleteModal';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Toast from './components/Toast';
import { 
  IconUsers, 
  IconCalendar, 
  IconBuilding, 
  IconSettings, 
  IconAlert, 
  IconRefresh, 
  IconCheckCircle, 
  IconUserPlus,
  IconLogIn,
  IconLogOut,
  IconClock
} from './components/Icons';
import './App.css';

export default function App() {
  const getTodayDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('employees');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Employee Data state
  const [allEmployees, setAllEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Employee Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Employee Modals state
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'add',
    initialData: null
  });

  const [statusModalState, setStatusModalState] = useState({
    isOpen: false,
    employee: null
  });

  // Attendance Data & Filters state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(getTodayDateString());
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('');

  // Attendance Modals state
  const [attendanceModal, setAttendanceModal] = useState({
    isOpen: false,
    mode: 'check-in', // 'check-in' | 'check-out' | 'record' | 'edit'
    initialData: null
  });

  const [attendanceDeleteModal, setAttendanceDeleteModal] = useState({
    isOpen: false,
    record: null
  });

  // Notification Toast state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  useEffect(() => {
    authApi.getCurrentUser()
      .then((response) => {
        setSessionUser(response.user);
        setActiveTab(response.user.role === 'Administrator' ? 'employees' : 'attendance');
      })
      .catch(() => setSessionUser(null))
      .finally(() => setIsAuthLoading(false));
  }, []);

  const handleLogin = async (credentials) => {
    const response = await authApi.login(credentials);
    setSessionUser(response.user);
    setActiveTab(response.user.role === 'Administrator' ? 'employees' : 'attendance');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setSessionUser(null);
    setAllEmployees([]);
    setAttendanceRecords([]);
    setAttendanceSummary({});
    setActiveTab('attendance');
  };

  // Fetch employees from backend API
  const fetchEmployees = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setApiError(null);

    try {
      const res = await employeeApi.getAll();
      if (res && res.success && Array.isArray(res.data)) {
        setAllEmployees(res.data);
      } else {
        setAllEmployees([]);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
      const friendlyMsg = err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
        ? 'Cannot connect to backend server at http://localhost:5000. Please ensure the backend is running.'
        : `Error loading employees: ${err.message}`;
      setApiError(friendlyMsg);
      showToast(friendlyMsg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch attendance records & daily summary from backend API
  const fetchAttendance = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsAttendanceLoading(true);

    try {
      const [recordsRes, summaryRes] = await Promise.all([
        attendanceApi.getAll({
          date: attendanceDateFilter,
          status: attendanceStatusFilter,
          search: attendanceSearchQuery
        }),
        attendanceApi.getSummary(attendanceDateFilter || getTodayDateString())
      ]);

      if (recordsRes && recordsRes.success && Array.isArray(recordsRes.data)) {
        setAttendanceRecords(recordsRes.data);
      } else {
        setAttendanceRecords([]);
      }

      if (summaryRes && summaryRes.success && summaryRes.data) {
        setAttendanceSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
      if (!isSilent) {
        const errorMsg = err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
          ? 'Cannot connect to backend server at http://localhost:5000 for attendance records.'
          : `Error loading attendance: ${err.message}`;
        showToast(errorMsg, 'error');
      }
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [attendanceDateFilter, attendanceStatusFilter, attendanceSearchQuery]);

  // Initial load on mount
  useEffect(() => {
    if (!sessionUser) return;
    fetchEmployees();
    fetchAttendance();
  }, [fetchEmployees, fetchAttendance, sessionUser]);

  // Refresh both employees and attendance
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchEmployees(true), fetchAttendance(true)]);
    showToast('Database records synchronized successfully.', 'info');
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (modalState.isOpen) setModalState({ isOpen: false, mode: 'add', initialData: null });
        if (statusModalState.isOpen) setStatusModalState({ isOpen: false, employee: null });
        if (attendanceModal.isOpen) setAttendanceModal({ isOpen: false, mode: 'check-in', initialData: null });
        if (attendanceDeleteModal.isOpen) setAttendanceDeleteModal({ isOpen: false, record: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, statusModalState.isOpen, attendanceModal.isOpen, attendanceDeleteModal.isOpen]);

  // Extract unique departments for dropdown
  const departmentList = useMemo(() => {
    const set = new Set();
    allEmployees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        set.add(emp.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [allEmployees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const empId = (emp.employee_id || '').toLowerCase();
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const position = (emp.position || '').toLowerCase();

        const matches = empId.includes(query) || 
                        fullName.includes(query) || 
                        email.includes(query) || 
                        position.includes(query);
        if (!matches) return false;
      }

      if (selectedDepartment && emp.department !== selectedDepartment) {
        return false;
      }

      if (selectedStatus && emp.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [allEmployees, searchQuery, selectedDepartment, selectedStatus]);

  // Employee Modal Handlers
  const openAddModal = () => {
    setModalState({
      isOpen: true,
      mode: 'add',
      initialData: null
    });
  };

  const openEditModal = (emp) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      initialData: emp
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      mode: 'add',
      initialData: null
    });
  };

  const handleSaveEmployee = async (formData, id) => {
    if (modalState.mode === 'add') {
      const res = await employeeApi.create(formData);
      showToast(`Employee ${formData.first_name} ${formData.last_name} created successfully!`, 'success');
      await fetchEmployees(true);
      return res;
    } else {
      const res = await employeeApi.update(id, formData);
      showToast(`Employee ${formData.first_name} ${formData.last_name} updated successfully!`, 'success');
      await fetchEmployees(true);
      return res;
    }
  };

  const openStatusConfirmModal = (emp) => {
    setStatusModalState({
      isOpen: true,
      employee: emp
    });
  };

  const closeStatusConfirmModal = () => {
    setStatusModalState({
      isOpen: false,
      employee: null
    });
  };

  const handleConfirmStatusChange = async (id, targetStatus) => {
    const res = await employeeApi.updateStatus(id, targetStatus);
    showToast(`Employee status changed to ${targetStatus}.`, 'success');
    await fetchEmployees(true);
    return res;
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('');
    setSelectedStatus('');
  };

  // Attendance Handlers
  const openAttendanceModal = (mode = 'check-in', initialData = null) => {
    setAttendanceModal({
      isOpen: true,
      mode,
      initialData
    });
  };

  const closeAttendanceModal = () => {
    setAttendanceModal({
      isOpen: false,
      mode: 'check-in',
      initialData: null
    });
  };

  const handleAttendanceSubmit = async (data, mode, id) => {
    if (mode === 'check-in') {
      const res = await attendanceApi.checkIn(data);
      showToast(res.message || 'Check-in recorded successfully!', 'success');
    } else if (mode === 'check-out') {
      const res = await attendanceApi.checkOut(data);
      showToast(res.message || 'Check-out recorded successfully!', 'success');
    } else if (mode === 'edit') {
      const res = await attendanceApi.update(id, data);
      showToast(res.message || 'Attendance record updated successfully!', 'success');
    } else {
      const res = await attendanceApi.create(data);
      showToast(res.message || 'Attendance record saved successfully!', 'success');
    }
    await fetchAttendance(true);
  };

  const handleQuickCheckOut = async (record) => {
    try {
      const res = await attendanceApi.checkOut({
        employee_id: record.employee_id,
        date: record.attendance_date
      });
      showToast(res.message || `Check-out recorded for ${record.employee_name}!`, 'success');
      await fetchAttendance(true);
    } catch (err) {
      showToast(err.message || 'Failed to record check-out.', 'error');
    }
  };

  const handleDeleteAttendance = async (id) => {
    try {
      const res = await attendanceApi.delete(id);
      showToast(res.message || 'Attendance record deleted successfully.', 'info');
      setAttendanceDeleteModal({ isOpen: false, record: null });
      await fetchAttendance(true);
    } catch (err) {
      showToast(err.message || 'Failed to delete attendance record.', 'error');
    }
  };

  const handleClearAttendanceFilters = () => {
    setAttendanceSearchQuery('');
    setAttendanceDateFilter('');
    setAttendanceStatusFilter('');
  };

  if (isAuthLoading) {
    return <main className="auth-loading" aria-live="polite">Checking your session…</main>;
  }

  if (!sessionUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        role={sessionUser.role}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          onOpenAddModal={openAddModal}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          totalCount={allEmployees.length}
          activeTab={activeTab}
          user={sessionUser}
          onLogout={handleLogout}
        />

        <main className="content-container">
          {/* Friendly Backend Error Banner if API connection fails */}
          {apiError && (
            <div className="api-error-banner">
              <div className="api-error-content">
                <IconAlert size={22} className="api-error-icon" />
                <div>
                  <h4 className="api-error-title">Backend Connection Notice</h4>
                  <p className="api-error-text">{apiError}</p>
                </div>
              </div>
              <button 
                className="btn-retry" 
                onClick={() => handleRefresh()}
              >
                <IconRefresh size={16} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Render Active View based on selected tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-dashboard-view">
              <DashboardOverview />

              <div className="dashboard-grid-two-column">
                <div className="preview-card">
                  <div className="preview-header">
                    <h3>Recent Employees</h3>
                    <button 
                      className="btn-text" 
                      onClick={() => setActiveTab('employees')}
                    >
                      View All Roster →
                    </button>
                  </div>
                  <div className="recent-list">
                    {allEmployees.slice(0, 5).map((emp) => (
                      <div key={emp.id} className="recent-item">
                        <div className="recent-avatar">
                          {(emp.first_name?.[0] || 'E') + (emp.last_name?.[0] || 'M')}
                        </div>
                        <div className="recent-info">
                          <span className="recent-name">{emp.first_name} {emp.last_name}</span>
                          <span className="recent-role">{emp.position || emp.department || 'Staff'}</span>
                        </div>
                        <span className={`status-pill ${emp.status === 'Active' ? 'pill-active' : 'pill-inactive'}`}>
                          {emp.status}
                        </span>
                      </div>
                    ))}
                    {allEmployees.length === 0 && (
                      <p className="text-muted p-4 text-center">No employee records found.</p>
                    )}
                  </div>
                </div>

                <div className="preview-card">
                  <div className="preview-header">
                    <h3>Attendance Quick Actions</h3>
                    <button 
                      className="btn-text" 
                      onClick={() => setActiveTab('attendance')}
                    >
                      View Attendance Logs →
                    </button>
                  </div>
                  <div className="quick-actions-box">
                    <p className="text-muted mb-4">
                      All employee attendance logs are synchronised with MySQL backend. Use the shortcuts below to record logs or manage staff.
                    </p>
                    <div className="quick-actions-btns">
                      <button 
                        className="btn-primary w-full" 
                        onClick={() => openAttendanceModal('check-in')}
                      >
                        <IconLogIn size={18} />
                        <span>Record Employee Check-In</span>
                      </button>

                      <button 
                        className="btn-secondary w-full" 
                        onClick={() => openAttendanceModal('check-out')}
                      >
                        <IconLogOut size={18} />
                        <span>Record Employee Check-Out</span>
                      </button>

                      <button 
                        className="btn-secondary w-full" 
                        onClick={() => setActiveTab('attendance')}
                      >
                        <IconCalendar size={18} />
                        <span>View Daily Attendance Board</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            sessionUser.role === 'Administrator' && (
            <div className="tab-employees-view">
              <DashboardStats employees={allEmployees} />

              <EmployeeTable
                employees={filteredEmployees}
                isLoading={isLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                onEditEmployee={openEditModal}
                onRequestStatusToggle={openStatusConfirmModal}
                onOpenAddModal={openAddModal}
                departments={departmentList}
                onClearFilters={handleClearFilters}
                canManage={sessionUser.role === 'Administrator'}
                onViewProfile={(employee) => {
                  setSelectedEmployeeId(employee.id);
                  setActiveTab('employee-profile');
                }}
              />
            </div>
            )
          )}

          {activeTab === 'employee-profile' && sessionUser.role === 'Administrator' && (
            <EmployeeProfile
              key={selectedEmployeeId}
              employeeId={selectedEmployeeId}
              onBack={() => setActiveTab('employees')}
            />
          )}

          {activeTab === 'attendance' && (
            <div className="tab-attendance-view">
              <div className="page-intro">
                <h2>Employee Attendance Management</h2>
                <p>Track daily arrival times, departures, and approved leaves for all active employees.</p>
              </div>

              {/* Attendance Statistics Cards */}
              <AttendanceStats 
  summary={attendanceSummary} 
  totalEmployees={
    allEmployees.filter((employee) => employee.status === 'Active').length
  }
  selectedDate={attendanceDateFilter}
/>
              {/* Attendance Records Table */}
              <AttendanceTable
                records={attendanceRecords}
                isLoading={isAttendanceLoading}
                searchQuery={attendanceSearchQuery}
                setSearchQuery={setAttendanceSearchQuery}
                selectedDate={attendanceDateFilter}
                setSelectedDate={setAttendanceDateFilter}
                selectedStatus={attendanceStatusFilter}
                setSelectedStatus={setAttendanceStatusFilter}
                onOpenCheckInModal={() => openAttendanceModal('check-in')}
                onOpenCheckOutModal={() => openAttendanceModal('check-out')}
                onOpenRecordModal={() => openAttendanceModal('record')}
                onOpenEditModal={(rec) => openAttendanceModal('edit', rec)}
                onQuickCheckOut={handleQuickCheckOut}
                onDeleteRecord={(rec) => setAttendanceDeleteModal({ isOpen: true, record: rec })}
                onClearFilters={handleClearAttendanceFilters}
                onRefresh={() => fetchAttendance(true)}
                isRefreshing={isAttendanceLoading}
                userRole={sessionUser.role}
              />
            </div>
          )}

          {activeTab === 'reports' && <Reports />}

          {activeTab === 'users' && sessionUser.role === 'Administrator' && <UserManagement />}

          {activeTab === 'departments' && sessionUser.role === 'Administrator' && (
            <div className="tab-departments-view">
              <div className="page-intro">
                <h2>Company Departments</h2>
                <p>Overview of organizational units and headcount across Lode Hexosa.</p>
              </div>
              <div className="departments-grid">
                {departmentList.map((dept) => {
                  const deptStaff = allEmployees.filter(e => e.department === dept);
                  const activeStaff = deptStaff.filter(e => e.status === 'Active');
                  return (
                    <div key={dept} className="department-card">
                      <div className="dept-header">
                        <IconBuilding size={24} className="dept-card-icon" />
                        <span className="dept-count-badge">{deptStaff.length} Member{deptStaff.length !== 1 ? 's' : ''}</span>
                      </div>
                      <h3 className="dept-title">{dept}</h3>
                      <p className="dept-stats-sub">{activeStaff.length} active on duty</p>
                      <button 
                        className="btn-text mt-3"
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setActiveTab('employees');
                        }}
                      >
                        Filter Employees in {dept} →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && sessionUser.role === 'Administrator' && (
            <div className="tab-placeholder-view">
              <div className="placeholder-card">
                <div className="placeholder-icon-box">
                  <IconSettings size={36} />
                </div>
                <h2>System Configuration</h2>
                <p>
                  Lode Hexosa Administration System is connected to MySQL database on backend <code>http://localhost:5000</code>.
                </p>
                <div className="settings-specs-box">
                  <div><strong>Backend Employees API:</strong> <code>http://localhost:5000/api/employees</code></div>
                  <div><strong>Backend Attendance API:</strong> <code>http://localhost:5000/api/attendance</code></div>
                  <div><strong>Database Engine:</strong> MySQL 8.0+ (utf8mb4)</div>
                  <div><strong>Frontend Stack:</strong> React + Vite</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.initialData}
        onClose={closeModal}
        onSave={handleSaveEmployee}
      />

      {/* Status Activate/Deactivate Confirmation Modal */}
      <StatusConfirmModal
        isOpen={statusModalState.isOpen}
        employee={statusModalState.employee}
        onClose={closeStatusConfirmModal}
        onConfirm={handleConfirmStatusChange}
      />

      {/* Attendance Check-In / Check-Out / Log Modal */}
      <AttendanceModal
        isOpen={attendanceModal.isOpen}
        mode={attendanceModal.mode}
        initialData={attendanceModal.initialData}
        employees={allEmployees.filter(e => e.status === 'Active')}
        userRole={sessionUser.role}
        onClose={closeAttendanceModal}
        onSubmit={handleAttendanceSubmit}
      />

      {/* Attendance Delete Confirmation Modal */}
      <AttendanceDeleteModal
        isOpen={attendanceDeleteModal.isOpen}
        record={attendanceDeleteModal.record}
        onClose={() => setAttendanceDeleteModal({ isOpen: false, record: null })}
        onConfirm={handleDeleteAttendance}
      />

      {/* Floating Feedback Toast Notification */}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
