import React, { useEffect } from 'react';
import { IconCheckCircle, IconXCircle, IconAlert, IconClose } from './Icons';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast || !toast.show) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast || !toast.show) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IconCheckCircle size={20} className="toast-icon toast-icon-success" />;
      case 'error':
        return <IconXCircle size={20} className="toast-icon toast-icon-error" />;
      case 'warning':
        return <IconAlert size={20} className="toast-icon toast-icon-warning" />;
      default:
        return <IconCheckCircle size={20} className="toast-icon toast-icon-info" />;
    }
  };

  return (
    <div className={`toast-container toast-${toast.type || 'info'}`} role="status">
      <div className="toast-content">
        {getIcon()}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button 
        type="button" 
        className="toast-close-btn" 
        onClick={onClose}
        aria-label="Close notification"
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}
