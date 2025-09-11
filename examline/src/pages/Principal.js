import React from "react";
import { useNavigate } from "react-router-dom";

const Principal = () => {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("profesorNombre") || "Usuario";

  const handleLogout = () => {
    // Limpiar información del usuario
    localStorage.removeItem("profesorNombre");
    localStorage.removeItem("userId");

    // Redirigir al login
    navigate("/login");
  };

  return (
    <div className="container text-center mt-5">
      <h1>Bienvenido, {nombre} 🎉</h1>
      <p>Esta es la página principal de tu aplicación.</p>

      <button
        className="btn btn-danger mt-4"
        onClick={handleLogout}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default Principal;
