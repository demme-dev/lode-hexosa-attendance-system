import React, { useState, useEffect } from 'react';
import { 
  IconClose, 
  IconLogIn, 
  IconLogOut, 
  IconCalendar, 
  IconClock, 
  IconAlert, 
  IconCheckCircle 
} from './Icons';

export default function AttendanceModal({
  isOpen,
  mode = 'check-in', // 'check-in' | 'check-out' | 'record' | 'edit'
  userRole = 'HR Staff',
  initialData = null,
  employees = [],
  onClose,
  onSubmit
}) {
  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getCurrentTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  };

  const [formData, setFormData] = useState({
    employee_id: '',
    attendance_date: getTodayDate(),
    time: getCurrentTime(),
    check_in: getCurrentTime(),
    check_out: '',
    status: 'Present',
    notes: '',
    reason: ''
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialData) {
        setFormData({
          employee_id: initialData.employee_id || '',
          attendance_date: initialData.attendance_date || getTodayDate(),
          time: initialData.check_out || initialData.check_in || getCurrentTime(),
          check_in: initialData.check_in ? initialData.check_in.substring(0, 5) : '',
          check_out: initialData.check_out ? initialData.check_out.substring(0, 5) : '',
          status: initialData.status || 'Present',
          notes: initialData.notes || '',
          reason: ''
        });
      } else {
        // Default for new entry
        setFormData({
          employee_id: employees.length > 0 ? employees[0].employee_id : '',
          attendance_date: getTodayDate(),
          time: getCurrentTime(),
          check_in: getCurrentTime(),
          check_out: '',
          status: mode === 'check-in' ? 'Present' : (mode === 'record' ? 'Present' : ''),
          notes: '',
          reason: ''
        });
      }
    }
  }, [isOpen, initialData, mode, employees]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.employee_id) {
      setError('Please select an employee.');
      return;
    }

    if (!formData.attendance_date) {
      setError('Please select a date.');
      return;
    }

    if (mode === 'edit' && userRole === 'HR Staff' && !formData.reason.trim()) {
      setError('Please provide a reason for this attendance edit.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'check-in') {
        await onSubmit({
          employee_id: formData.employee_id,
          date: formData.attendance_date,
          time: formData.time ? `${formData.time}:00` : undefined,
          status: formData.status || undefined,
          notes: formData.notes
        }, 'check-in');
      } else if (mode === 'check-out') {
        await onSubmit({
          employee_id: formData.employee_id,
          date: formData.attendance_date,
          time: formData.time ? `${formData.time}:00` : undefined,
          notes: formData.notes
        }, 'check-out');
      } else if (mode === 'edit') {
        await onSubmit({
          attendance_date: formData.attendance_date,
          check_in: formData.check_in ? `${formData.check_in}:00` : null,
          check_out: formData.check_out ? `${formData.check_out}:00` : null,
          status: formData.status,
          notes: formData.notes,
          reason: formData.reason.trim() || null
        }, 'edit', initialData.id);
      } else {
        // mode === 'record'
        await onSubmit({
          employee_id: formData.employee_id,
          attendance_date: formData.attendance_date,
          check_in: formData.check_in ? `${formData.check_in}:00` : null,
          check_out: formData.check_out ? `${formData.check_out}:00` : null,
          status: formData.status,
          notes: formData.notes
        }, 'record');
      }
      onClose();
    } catch (err) {
      console.error('Attendance modal submission error:', err);
      setError(err.message || 'Operation failed. Please check the provided information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'check-in':
        return 'Record Employee Check-In';
      case 'check-out':
        return 'Record Employee Check-Out';
      case 'edit':
        return `Edit Attendance Record #${initialData?.id || ''}`;
      default:
        return 'Log Attendance / Leave';
    }
  };

  const getSubmitButtonLabel = () => {
    if (isSubmitting) return 'Saving...';
    switch (mode) {
      case 'check-in':
        return 'Record Check-In';
      case 'check-out':
        return 'Record Check-Out';
      case 'edit':
        return 'Update Record';
      default:
        return 'Save Attendance Record';
    }
  };

  const selectedEmployeeObj = employees.find(e => e.employee_id === formData.employee_id);

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className={`modal-icon-badge ${mode === 'check-out' ? 'badge-rose' : 'badge-primary'}`}>
              {mode === 'check-out' ? <IconLogOut size={20} /> : <IconLogIn size={20} />}
            </div>
            <div>
              <h3 className="modal-title">{getModalTitle()}</h3>
              <p className="modal-subtitle">
                {mode === 'check-in' && 'Log morning arrival time. Prevents duplicate check-ins on the same date.'}
                {mode === 'check-out' && 'Log employee departure time for today.'}
                {mode === 'edit' && `Modifying attendance entry for ${initialData?.employee_name || initialData?.employee_id}.`}
                {mode === 'record' && 'Manually record attendance status, full shift, or approved leave.'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <IconClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error-alert" role="alert">
              <IconAlert size={18} className="form-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div className="form-group">
            <label className="form-label">
              Employee <span className="text-danger">*</span>
            </label>
            {mode === 'edit' ? (
              <div className="readonly-box">
                <strong>{initialData?.employee_name || formData.employee_id}</strong>
                <span className="text-muted ml-2">({formData.employee_id})</span>
              </div>
            ) : (
              <select
                name="employee_id"
                className="form-select"
                value={formData.employee_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_id} - {emp.first_name} {emp.last_name} ({emp.department || 'General'})
                  </option>
                ))}
              </select>
            )}
            {selectedEmployeeObj && mode !== 'edit' && (
              <span className="form-hint">
                Position: {selectedEmployeeObj.position || 'Staff'} • Department: {selectedEmployeeObj.department || 'General'}
              </span>
            )}
          </div>

          {/* Date & Time Row */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">
                Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                name="attendance_date"
                className="form-input"
                value={formData.attendance_date}
                onChange={handleChange}
                required
              />
            </div>

            {(mode === 'check-in' || mode === 'check-out') && (
              <div className="form-group flex-1">
                <label className="form-label">
                  {mode === 'check-in' ? 'Check-In Time' : 'Check-Out Time'} <span className="text-danger">*</span>
                </label>
                <input
                  type="time"
                  step="1"
                  name="time"
                  className="form-input"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
          </div>

          {/* Detailed Times for record and edit modes */}
          {(mode === 'record' || mode === 'edit') && (
            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Check-In Time</label>
                <input
                  type="time"
                  name="check_in"
                  className="form-input"
                  value={formData.check_in}
                  onChange={handleChange}
                />
                <span className="form-hint">Leave blank if Absent/Leave</span>
              </div>

              <div className="form-group flex-1">
                <label className="form-label">Check-Out Time</label>
                <input
                  type="time"
                  name="check_out"
                  className="form-input"
                  value={formData.check_out}
                  onChange={handleChange}
                />
                <span className="form-hint">Leave blank if currently working</span>
              </div>
            </div>
          )}

          {/* Status Selection */}
          {(mode === 'check-in' || mode === 'record' || mode === 'edit') && (
            <div className="form-group">
              <label className="form-label">Attendance Status</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Present">Present (Standard on-time)</option>
                <option value="Late">Late (Arrived after 09:15)</option>
                {(mode === 'record' || mode === 'edit') && (
                  <>
                    <option value="Absent">Absent (Unexcused)</option>
                    <option value="Leave">Leave (Approved Paid/Sick)</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Notes */}
          {mode === 'edit' && (
            <div className="form-group">
              <label className="form-label" htmlFor="attendance-edit-reason">
                Reason for edit{userRole === 'HR Staff' ? ' *' : ' (optional)'}
              </label>
              <textarea
                id="attendance-edit-reason"
                name="reason"
                className="form-textarea"
                rows="2"
                maxLength={2000}
                required={userRole === 'HR Staff'}
                value={formData.reason}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Remarks</label>
            <textarea
              name="notes"
              className="form-textarea"
              rows="2"
              placeholder="e.g. Approved medical leave, remote work, or traffic delay..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* Action Buttons */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary ${mode === 'check-out' ? 'btn-danger-action' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {mode === 'check-out' ? <IconLogOut size={16} /> : <IconLogIn size={16} />}
                  <span>{getSubmitButtonLabel()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
