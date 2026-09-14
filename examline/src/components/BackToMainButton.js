import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import '../modern-examline.css';

const BackToMainButton = ({ className = "modern-btn modern-btn-secondary", customPath = null, customLabel = null, disabled = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToMain = () => {
    if (disabled) return;
    if (customPath) {
      navigate(customPath);
    } else if (user?.rol === "professor") {
      navigate("/principal");
    } else {
      navigate("/student-exam");
    }
  };

  const getButtonContent = () => {
    if (customLabel) {
      return customLabel;
    }
    
    if (user?.rol === "professor") {
      return (
        <>
          <i className="fas fa-chalkboard-teacher me-2"></i>
          Volver a Principal
        </>
      );
    } else {
      return (
        <>
          <i className="fas fa-home me-2"></i>
          Volver al Inicio
        </>
      );
    }
  };

  return (
    <button className={className} onClick={handleBackToMain} disabled={disabled} style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.6 : 1 }}>
      {getButtonContent()}
    </button>
  );
};

export default BackToMainButton;