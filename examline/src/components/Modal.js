import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

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
    const iconStyle = { fontSize: '4rem', marginBottom: '1rem' };
    
    switch (type) {
      case 'success':
        return <div style={{...iconStyle, color: '#198754'}}>✓</div>;
      case 'error':
        return <div style={{...iconStyle, color: '#dc3545'}}>✕</div>;
      case 'warning':
        return <div style={{...iconStyle, color: '#ffc107'}}>⚠</div>;
      case 'confirm':
        return <div style={{...iconStyle, color: '#0d6efd'}}>?</div>;
      default:
        return <div style={{...iconStyle, color: '#0dcaf0'}}>ℹ</div>;
    }
  };

  const getHeaderClass = () => {
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

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content shadow-lg border-0 rounded-4 ${getHeaderClass()} border-3 border-top`}>
          <div className="modal-body text-center p-4">
            {getModalIcon()}
            {title && <h5 className="modal-title mb-3 fw-bold text-dark">{title}</h5>}
            <p className="mb-4 text-muted">{message}</p>
            
            <div className="d-flex gap-2 justify-content-center">
              {showCancel && (
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4"
                  onClick={onClose}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                className={`btn px-4 ${
                  type === 'error' ? 'btn-danger' :
                  type === 'success' ? 'btn-success' :
                  type === 'warning' ? 'btn-warning' :
                  'btn-primary'
                }`}
                onClick={onConfirm || onClose}
                autoFocus
              >
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