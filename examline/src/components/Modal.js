import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';

const Modal = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  type = "info", // 'success', 'error', 'warning', 'confirm', 'info'
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  showCancel = false
}) => {
  if (!show) return null;

  const getModalIcon = () => {
    const iconClass = "fas";
    const iconStyle = { fontSize: '3.5rem', marginBottom: '1.5rem' };
    
    switch (type) {
      case 'success':
        return <div style={{...iconStyle, color: 'var(--success-color)'}}><i className={`${iconClass} fa-check-circle`}></i></div>;
      case 'error':
        return <div style={{...iconStyle, color: 'var(--danger-color)'}}><i className={`${iconClass} fa-times-circle`}></i></div>;
      case 'warning':
        return <div style={{...iconStyle, color: 'var(--warning-color)'}}><i className={`${iconClass} fa-exclamation-triangle`}></i></div>;
      case 'confirm':
        return <div style={{...iconStyle, color: 'var(--primary-color)'}}><i className={`${iconClass} fa-question-circle`}></i></div>;
      default:
        return <div style={{...iconStyle, color: 'var(--info-color)'}}><i className={`${iconClass} fa-info-circle`}></i></div>;
    }
  };

  const getGradientClass = () => {
    switch (type) {
      case 'success':
        return 'border-success';
      case 'error':
        return 'border-danger';
      case 'warning':
        return 'border-warning';
      case 'confirm':
        return 'border-primary';
      default:
        return 'border-info';
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop-fade"
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
        <div className={`modern-card border-0 ${getGradientClass()} border-3 border-top`} style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="modal-body text-center p-5">
            {getModalIcon()}
            {title && (
              <h4 className="modal-title mb-3 fw-bold" style={{ color: 'var(--text-color-2)' }}>
                {title}
              </h4>
            )}
            <p className="mb-4" style={{ color: 'var(--text-color-1)', fontSize: '1.1rem', lineHeight: '1.6' }}>
              {message}
            </p>
            
            <div className="d-flex gap-3 justify-content-center">
              {showCancel && (
                <button
                  type="button"
                  className="modern-btn modern-btn-secondary modern-btn-lg"
                  onClick={onClose}
                >
                  <i className="fas fa-times me-2"></i>
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                className={`modern-btn modern-btn-lg ${
                  type === 'error' ? 'modern-btn-danger' :
                  type === 'success' ? 'modern-btn-primary' :
                  type === 'warning' ? 'modern-btn-primary' :
                  'modern-btn-primary'
                }`}
                onClick={onConfirm || onClose}
                autoFocus
              >
                <i className={`fas me-2 ${
                  type === 'error' ? 'fa-trash' :
                  type === 'success' ? 'fa-check' :
                  type === 'warning' ? 'fa-exclamation' :
                  type === 'confirm' ? 'fa-check' :
                  'fa-info'
                }`}></i>
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;