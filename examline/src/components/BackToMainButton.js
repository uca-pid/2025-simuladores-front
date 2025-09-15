import React from "react";
import { useNavigate } from "react-router-dom";

const BackToMainButton = ({ className = "btn btn-outline-secondary" }) => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("rol");

  const handleBackToMain = () => {
    if (userRole === "professor") {
      navigate("/principal");
    } else {
      navigate("/student-exam");
    }
  };

  const getButtonText = () => {
    if (userRole === "professor") {
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