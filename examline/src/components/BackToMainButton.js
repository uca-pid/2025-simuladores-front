import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const BackToMainButton = ({ className = "btn btn-outline-secondary" }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToMain = () => {
    if (user?.rol === "professor") {
      navigate("/principal");
    } else {
      navigate("/student-exam");
    }
  };

  const getButtonText = () => {
    if (user?.rol === "professor") {
      return "Volver a Principal";
    } else {
      return "Volver al Inicio";
    }
  };

  return (
    <button className={className} onClick={handleBackToMain}>
      {getButtonText()}
    </button>
  );
};

export default BackToMainButton;