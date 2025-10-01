import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import '../modern-examline.css';

const BackToMainButton = ({ className = "modern-btn modern-btn-secondary" }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToMain = () => {
    if (user?.rol === "professor") {
      navigate("/principal");
    } else {
      navigate("/student-exam");
    }
  };

  const getButtonContent = () => {
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
    <button className={className} onClick={handleBackToMain}>
      {getButtonContent()}
    </button>
  );
};

export default BackToMainButton;