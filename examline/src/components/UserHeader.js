import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const UserHeader = () => {
  const navigate = useNavigate();

  const handleUserSettings = () => navigate("/user-settings");
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h1 className="text-primary">Bienvenido, {localStorage.getItem("name")}</h1>
      <div>
        <button className="btn btn-success me-2" onClick={handleUserSettings}>
          Configuración
        </button>
        <button className="btn btn-outline-danger" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default UserHeader;