import React, { useState } from 'react';
import { IconPower, IconClose, IconAlert } from './Icons';

export default function StatusConfirmModal({
  isOpen,
  employee,
  onClose,
  onConfirm
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !employee) return null;

  const currentStatus = employee.status;
  const targetStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  const isDeactivating = targetStatus === 'Inactive';

  const handleConfirm = async () => {
    setIsUpdating(true);
    setErrorMsg('');
    try {
      await onConfirm(employee.id, targetStatus);
      onClose();
    } catch (err) {
      console.error('Failed to change status:', err);
      setErrorMsg(err.message || 'Failed to update employee status.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container modal-container-sm" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="status-modal-title-row">
            <div className={`status-badge-icon ${isDeactivating ? 'badge-icon-danger' : 'badge-icon-success'}`}>
              <IconPower size={22} />
            </div>
            <div>
              <h3 className="modal-title">
                {isDeactivating ? 'Deactivate Employee' : 'Activate Employee'}
              </h3>
              <p className="modal-subtitle">Confirm status modification</p>
            </div>
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

        {errorMsg && (
          <div className="modal-error-banner">
            <IconAlert size={18} className="error-icon" />
            <span className="error-text">{errorMsg}</span>
          </div>
        )}

        <div className="modal-body-content">
          <p className="confirm-text">
            Are you sure you want to change the status of{' '}
            <strong>
              {employee.first_name} {employee.last_name}
            </strong>{' '}
            (<code>{employee.employee_id}</code>) to{' '}
            <span className={`status-pill ${isDeactivating ? 'pill-inactive' : 'pill-active'}`}>
              {targetStatus}
            </span>?
          </p>
          <p className="confirm-hint">
            {isDeactivating
              ? 'Deactivated employees will be marked inactive and prevented from recording live daily attendance until reactivated.'
              : 'Activated employees are cleared for daily attendance logging and active duty reporting.'}
          </p>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            type="button"
            className={isDeactivating ? 'btn-danger' : 'btn-success'}
            onClick={handleConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <div className="btn-spinner"></div>
                <span>Updating...</span>
              </>
            ) : (
              <span>Confirm {isDeactivating ? 'Deactivation' : 'Activation'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
