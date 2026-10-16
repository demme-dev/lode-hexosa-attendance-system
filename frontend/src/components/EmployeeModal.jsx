import React, { useState, useEffect } from 'react';
import { IconClose, IconAlert, IconCheck } from './Icons';

const DEPARTMENT_SUGGESTIONS = [
  'HR & Operations',
  'Finance',
  'Engineering',
  'Marketing',
  'Sales',
  'Administration',
  'Customer Support',
  'Legal & Compliance'
];

export default function EmployeeModal({
  isOpen,
  mode = 'add', // 'add' or 'edit'
  initialData = null,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    gender: '',
    department: '',
    position: '',
    phone: '',
    email: '',
    hire_date: '',
    status: 'Active'
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          employee_id: initialData.employee_id || '',
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          gender: initialData.gender || '',
          department: initialData.department || '',
          position: initialData.position || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          hire_date: initialData.hire_date || '',
          status: initialData.status || 'Active'
        });
      } else {
        // Default values for new employee
        setFormData({
          employee_id: '',
          first_name: '',
          last_name: '',
          gender: '',
          department: '',
          position: '',
          phone: '',
          email: '',
          hire_date: new Date().toISOString().split('T')[0], // today's date default
          status: 'Active'
        });
      }
      setValidationErrors({});
      setServerError('');
      setIsSubmitting(false);
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific validation error on change
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.employee_id.trim()) {
      errors.employee_id = 'Employee ID is required (e.g. EMP003)';
    }
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (formData.gender && !['Male', 'Female', 'Other'].includes(formData.gender)) {
      errors.gender = 'Gender must be Male, Female, or Other';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      // Prepare payload: nullify empty optional strings to match backend cleaner
      const payload = {
        employee_id: formData.employee_id.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender.trim() || null,
        department: formData.department.trim() || null,
        position: formData.position.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        hire_date: formData.hire_date ? formData.hire_date.trim() : null,
        status: formData.status
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err) {
      console.error('Modal submit error:', err);
      setServerError(err.message || 'An error occurred while saving employee details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">
              {mode === 'add' ? 'Register New Employee' : `Edit Employee Details`}
            </h2>
            <p className="modal-subtitle">
              {mode === 'add' 
                ? 'Fill in employee details to record them into the administration system.' 
                : `Updating record for ${initialData?.first_name} ${initialData?.last_name} (${initialData?.employee_id})`}
            </p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="modal-error-banner">
            <IconAlert size={18} className="error-icon" />
            <span className="error-text">{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            {/* Employee ID */}
            <div className="form-group">
              <label htmlFor="employee_id" className="form-label">
                Employee ID <span className="required-star">*</span>
              </label>
              <input
                id="employee_id"
                name="employee_id"
                type="text"
                placeholder="e.g. EMP003"
                value={formData.employee_id}
                onChange={handleChange}
                className={`form-input ${validationErrors.employee_id ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {validationErrors.employee_id && (
                <span className="field-error-msg">{validationErrors.employee_id}</span>
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Employment Status <span className="required-star">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-select"
                disabled={isSubmitting}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* First Name */}
            <div className="form-group">
              <label htmlFor="first_name" className="form-label">
                First Name <span className="required-star">*</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="e.g. Michael"
                value={formData.first_name}
                onChange={handleChange}
                className={`form-input ${validationErrors.first_name ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {validationErrors.first_name && (
                <span className="field-error-msg">{validationErrors.first_name}</span>
              )}
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="last_name" className="form-label">
                Last Name <span className="required-star">*</span>
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="e.g. Corleone"
                value={formData.last_name}
                onChange={handleChange}
                className={`form-input ${validationErrors.last_name ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {validationErrors.last_name && (
                <span className="field-error-msg">{validationErrors.last_name}</span>
              )}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label htmlFor="gender" className="form-label">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`form-select ${validationErrors.gender ? 'input-error' : ''}`}
                disabled={isSubmitting}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {validationErrors.gender && (
                <span className="field-error-msg">{validationErrors.gender}</span>
              )}
            </div>

            {/* Department */}
            <div className="form-group">
              <label htmlFor="department" className="form-label">Department</label>
              <input
                id="department"
                name="department"
                type="text"
                list="dept-list"
                placeholder="e.g. Finance, Operations..."
                value={formData.department}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
              />
              <datalist id="dept-list">
                {DEPARTMENT_SUGGESTIONS.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>

            {/* Position / Job Title */}
            <div className="form-group">
              <label htmlFor="position" className="form-label">Position / Job Title</label>
              <input
                id="position"
                name="position"
                type="text"
                placeholder="e.g. Financial Analyst"
                value={formData.position}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Hire Date */}
            <div className="form-group">
              <label htmlFor="hire_date" className="form-label">Hire Date</label>
              <input
                id="hire_date"
                name="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. name@lodehexosa.com"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${validationErrors.email ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {validationErrors.email && (
                <span className="field-error-msg">{validationErrors.email}</span>
              )}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="e.g. +1 555-123-4567"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
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
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  <span>{mode === 'add' ? 'Save Employee' : 'Update Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
