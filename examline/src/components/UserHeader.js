import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";

const UserHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleUserSettings = () => navigate("/user-settings");
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userName = user?.nombre || "Usuario";

  return (
    <header className="modern-card mb-4">
      <div className="modern-card-body">
        {/* Desktop Layout */}
        <div className="d-none d-md-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div className="user-avatar" style={{ 
              width: '50px', 
              height: '50px',
              fontSize: '1.2rem'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="mb-1" style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600',
                color: 'var(--text-color-2)'
              }}>
                Bienvenido, {userName}
              </h2>
              <p className="mb-0" style={{ 
                color: 'var(--text-color-1)', 
                fontSize: '0.9rem' 
              }}>
                {user?.rol === 'professor' ? 'Profesor' : 'Estudiante'} • {user?.email}
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="modern-btn modern-btn-secondary"
              onClick={handleUserSettings}
            >
              <i className="fas fa-cog me-2"></i>
              Configuración
            </button>
            <button
              className="modern-btn modern-btn-danger"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="d-md-none">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="user-avatar" style={{ 
              width: '40px', 
              height: '40px',
              fontSize: '1rem'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow-1">
              <h2 className="mb-1" style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600',
                color: 'var(--text-color-2)'
              }}>
                {userName}
              </h2>
              <p className="mb-0" style={{ 
                color: 'var(--text-color-1)', 
                fontSize: '0.8rem' 
              }}>
                {user?.rol === 'professor' ? 'Profesor' : 'Estudiante'}
              </p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="modern-btn modern-btn-secondary modern-btn-sm flex-grow-1"
              onClick={handleUserSettings}
            >
              <i className="fas fa-cog me-1"></i>
              <span className="d-none d-sm-inline">Configuración</span>
              <span className="d-sm-none">Config</span>
            </button>
            <button
              className="modern-btn modern-btn-danger modern-btn-sm flex-grow-1"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              <span className="d-none d-sm-inline">Cerrar Sesión</span>
              <span className="d-sm-none">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;

