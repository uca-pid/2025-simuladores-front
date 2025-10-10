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
    if (e.target === e.currentTarget) {
      onClose();
    }
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
                  autoFocus
                >
                  <i className={`fas me-2 ${
                    type === 'error' ? 'fa-trash' :
                    type === 'success' ? 'fa-check' :
                    type === 'warning' ? 'fa-exclamation' :
                    type === 'confirm' ? 'fa-check' :
                    'fa-info'
                  }`}></i>
                  <span>{confirmText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .responsive-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
          padding: 1rem;
          box-sizing: border-box;
        }

        .responsive-modal-container {
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .responsive-modal-content {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 100%;
          border-top: 4px solid;
        }

        .responsive-modal-content.border-primary {
          border-top-color: var(--primary-color, #007bff);
        }

        .responsive-modal-content.border-success {
          border-top-color: var(--success-color, #28a745);
        }

        .responsive-modal-content.border-danger {
          border-top-color: var(--danger-color, #dc3545);
        }

        .responsive-modal-content.border-warning {
          border-top-color: var(--warning-color, #ffc107);
        }

        .responsive-modal-content.border-info {
          border-top-color: var(--info-color, #17a2b8);
        }

        .responsive-modal-content.border-confirm {
          border-top-color: #667eea;
        }

        .responsive-modal-body {
          padding: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }

        .responsive-modal-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .responsive-modal-title {
          color: var(--text-color-2, #2d3748);
          font-size: 1.3rem;
          font-weight: bold;
          margin: 0 0 1rem 0;
          line-height: 1.3;
        }

        .responsive-modal-message {
          color: var(--text-color-1, #4a5568);
          font-size: 1rem;
          line-height: 1.5;
          margin: 0 0 1.5rem 0;
          text-align: center;
        }

        .responsive-modal-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: auto;
        }

        .responsive-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          text-decoration: none;
        }

        .responsive-btn span {
          white-space: nowrap;
        }

        .responsive-btn-primary {
          background: linear-gradient(45deg, #007bff, #0056b3);
          color: white;
        }

        .responsive-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
        }

        .responsive-btn-secondary {
          background: linear-gradient(45deg, #6c757d, #545b62);
          color: white;
        }

        .responsive-btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
        }

        .responsive-btn-danger {
          background: linear-gradient(45deg, #dc3545, #c82333);
          color: white;
        }

        .responsive-btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }

        .responsive-btn-confirm {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
        }

        .responsive-btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        /* Tablet styles */
        @media (max-width: 768px) {
          .responsive-modal-backdrop {
            padding: 0.75rem;
          }

          .responsive-modal-container {
            max-width: 420px;
          }

          .responsive-modal-body {
            padding: 1.5rem;
          }

          .responsive-modal-icon {
            font-size: 2.2rem;
            margin-bottom: 0.8rem;
          }

          .responsive-modal-title {
            font-size: 1.2rem;
            margin-bottom: 0.8rem;
          }

          .responsive-modal-message {
            font-size: 0.95rem;
            margin-bottom: 1.2rem;
          }

          .responsive-btn {
            padding: 0.7rem 1.3rem;
            font-size: 0.9rem;
            min-width: 110px;
          }
        }

        /* Mobile styles */
        @media (max-width: 480px) {
          .responsive-modal-backdrop {
            padding: 0.5rem;
          }

          .responsive-modal-container {
            max-width: 100%;
            width: 100%;
          }

          .responsive-modal-content {
            border-radius: 12px;
          }

          .responsive-modal-body {
            padding: 1.25rem;
          }

          .responsive-modal-icon {
            font-size: 2rem;
            margin-bottom: 0.75rem;
          }

          .responsive-modal-title {
            font-size: 1.1rem;
            margin-bottom: 0.75rem;
          }

          .responsive-modal-message {
            font-size: 0.9rem;
            line-height: 1.4;
            margin-bottom: 1rem;
          }

          .responsive-modal-buttons {
            gap: 0.5rem;
            flex-direction: column;
          }

          .responsive-btn {
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
            width: 100%;
            min-width: auto;
          }

          .responsive-btn span {
            font-size: 0.85rem;
          }
        }

        /* Extra small mobile */
        @media (max-width: 360px) {
          .responsive-modal-backdrop {
            padding: 0.25rem;
          }

          .responsive-modal-body {
            padding: 1rem;
          }

          .responsive-modal-icon {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }

          .responsive-modal-title {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .responsive-modal-message {
            font-size: 0.85rem;
            margin-bottom: 0.8rem;
          }

          .responsive-btn {
            padding: 0.7rem 0.8rem;
            font-size: 0.85rem;
          }
        }

        /* Landscape mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .responsive-modal-container {
            max-height: 95vh;
          }

          .responsive-modal-body {
            padding: 1rem;
          }

          .responsive-modal-icon {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }

          .responsive-modal-title {
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          .responsive-modal-message {
            font-size: 0.85rem;
            margin-bottom: 0.8rem;
          }

          .responsive-modal-buttons {
            flex-direction: row;
            gap: 0.5rem;
          }

          .responsive-btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </>
  );
};

export default Modal;