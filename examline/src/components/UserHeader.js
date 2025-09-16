import React from "react";
import { useNavigate } from "react-router-dom";
import { FiSettings, FiLogOut } from "react-icons/fi"; // tuerca y puerta
import "bootstrap/dist/css/bootstrap.min.css";

const UserHeader = () => {
  const navigate = useNavigate();

  const handleUserSettings = () => navigate("/user-settings");
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const userName = localStorage.getItem("name") || "Usuario";

  return (
    <header className="d-flex justify-content-between align-items-center mb-4 p-3 bg-primary text-white rounded shadow-sm">
      <div>
        <h2 className="m-0 fw-bold">Bienvenido, {userName}</h2>
      </div>
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-light d-flex align-items-center gap-1"
          onClick={handleUserSettings}
        >
          <FiSettings />
          Modificar datos
        </button>
        <button
          className="btn btn-danger d-flex align-items-center gap-1"
          onClick={handleLogout}
        >
          <FiLogOut />
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

export default UserHeader;

