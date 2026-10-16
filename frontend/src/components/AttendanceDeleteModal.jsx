import React from 'react';
import { IconAlert, IconClose, IconTrash } from './Icons';

export default function AttendanceDeleteModal({
  isOpen,
  record,
  onClose,
  onConfirm
}) {
  if (!isOpen || !record) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-container modal-container-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge badge-rose">
              <IconTrash size={20} />
            </div>
            <div>
              <h3 className="modal-title">Delete Attendance Record</h3>
              <p className="modal-subtitle">Confirm record removal from database.</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body-content">
          <div className="warning-callout">
            <IconAlert size={20} className="warning-icon text-danger" />
            <div className="warning-text">
              <p>Are you sure you want to delete this attendance record?</p>
              <div className="record-details-card mt-3">
                <div><strong>Employee:</strong> {record.employee_name} ({record.employee_id})</div>
                <div><strong>Date:</strong> {record.attendance_date}</div>
                <div><strong>Status:</strong> {record.status}</div>
                {record.check_in && <div><strong>Check-In:</strong> {record.check_in}</div>}
                {record.check_out && <div><strong>Check-Out:</strong> {record.check_out}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-danger-action"
            onClick={() => onConfirm(record.id)}
          >
            <IconTrash size={16} />
            <span>Delete Record</span>
          </button>
        </div>
      </div>
    </div>
  );
}
