import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LogoutButton = ({ className = "btn btn-outline-danger", children = "Cerrar Sesión" }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <button 
      className={className} 
      onClick={handleLogout}
      type="button"
    >
      {children}
    </button>
  );
};

export const UserInfo = ({ className = "" }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={`d-flex align-items-center ${className}`}>
      <span className="me-3">
        <strong>{user.nombre}</strong>
        <small className="text-muted d-block">{user.rol}</small>
      </span>
      <LogoutButton />
    </div>
  );
};