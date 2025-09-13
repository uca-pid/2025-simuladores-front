import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    setEmailError("");
    setPasswordError("");

    // Validación de campos vacíos
    if (email.trim() === "") {
      setEmailError("Debe ingresar un email.");
      return;
    }
    if (password.trim() === "") {
      setPasswordError("Debe ingresar una contraseña.");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Login exitoso
        localStorage.setItem("name", data.nombre);
        localStorage.setItem("userId", data.userId);
        setEmail("");
        setPassword("");
        navigate("/principal");
      } else if (res.status === 404) {
        setEmailError("El email no está registrado");
      } else if (res.status === 401) {
        setPasswordError("Contraseña incorrecta");
      } else {
        alert(data.error || "Hubo un problema al iniciar sesión");
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="bg-light d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="card-body p-5 text-center">
          <img src="/logo.png" alt="Examline" className="mb-4" style={{ width: "150px", height: "auto" }} />
          <h2 className="mb-4 fw-bold text-primary">Login</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-start">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className={`form-control ${emailError ? "is-invalid" : ""}`}
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
              />
              <div className="invalid-feedback">{emailError}</div>
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                type="password"
                className={`form-control ${passwordError ? "is-invalid" : ""}`}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
              />
              <div className="invalid-feedback">{passwordError}</div>
            </div>

            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary btn-lg">Ingresar</button>
            </div>

            <p className="mb-1">
              ¿No tenés cuenta? <Link to="/registro">Regístrate</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;



