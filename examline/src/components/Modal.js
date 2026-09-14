import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import './Modal.css';

const Modal = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  type = "info", // 'success', 'error', 'warning', 'confirm', 'info'
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  showCancel = false,
  isProcessing = false // Nuevo prop para deshabilitar botones durante el procesamiento
}) => {
  if (!show) return null;

  const getModalIcon = () => {
    const iconClass = "fas";
    const iconStyle = { fontSize: '2.5rem', marginBottom: '0' };
    
    switch (type) {
      case 'success':
        return <i className={`${iconClass} fa-check-circle`} style={{...iconStyle, color: 'var(--success-color)'}}></i>;
      case 'error':
        return <i className={`${iconClass} fa-times-circle`} style={{...iconStyle, color: 'var(--danger-color)'}}></i>;
      case 'warning':
        return <i className={`${iconClass} fa-exclamation-triangle`} style={{...iconStyle, color: 'var(--warning-color)'}}></i>;
      case 'confirm':
        return <i className={`${iconClass} fa-question-circle`} style={{...iconStyle, color: '#667eea'}}></i>;
      default:
        return <i className={`${iconClass} fa-info-circle`} style={{...iconStyle, color: 'var(--info-color)'}}></i>;
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
        return 'border-confirm';
      default:
        return 'border-info';
    }
  };

  const handleBackdropClick = (e) => {
  e.stopPropagation();
  return;
  };


  return (
    <>
      <div 
        className="responsive-modal-backdrop"
        onClick={handleBackdropClick}
      >
        <div className="responsive-modal-container">
          <div className={`responsive-modal-content ${getGradientClass()}`}>
            <div className="responsive-modal-body">
              <div className="responsive-modal-icon">
                {getModalIcon()}
              </div>
              {title && (
                <h4 className="responsive-modal-title">
                  {title}
                </h4>
              )}
              <p className="responsive-modal-message">
                {message}
              </p>
              
              <div className="responsive-modal-buttons">
                {showCancel && (
                  <button
                    type="button"
                    className="responsive-btn responsive-btn-secondary"
                    onClick={onClose}
                    disabled={isProcessing}
                  >
                    <i className="fas fa-times me-2"></i>
                    <span>{cancelText}</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`responsive-btn ${
                    type === 'error' ? 'responsive-btn-danger' :
                    type === 'success' ? 'responsive-btn-primary' :
                    type === 'warning' ? 'responsive-btn-primary' :
                    type === 'confirm' ? 'responsive-btn-confirm' :
                    'responsive-btn-primary'
                  }`}
                  onClick={onConfirm || onClose}
                  disabled={isProcessing}
                  autoFocus
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <i className={`fas me-2 ${
                        type === 'error' ? 'fa-trash' :
                        type === 'success' ? 'fa-check' :
                        type === 'warning' ? 'fa-check' :
                        type === 'confirm' ? 'fa-check' :
                        'fa-info'
                      }`}></i>
                      <span>{confirmText}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;