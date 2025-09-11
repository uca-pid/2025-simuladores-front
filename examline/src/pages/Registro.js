// src/pages/Registro.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  const form = e.currentTarget;

  if (!form.checkValidity()) {
    setValidated(true);
    return;
  }

  try {
    // 1️⃣ Crear el usuario
    const signupRes = await fetch("http://localhost:4000/users/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password }),
    });

    const signupData = await signupRes.json();

    if (!signupRes.ok) {
      setError(signupData.error || "Error en el registro");
      return;
    }

    // 2️⃣ Si el registro fue exitoso, loguear al usuario
    const loginRes = await fetch("http://localhost:4000/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      setError(loginData.error || "Error al iniciar sesión después del registro");
      return;
    }

    // 3️⃣ Guardar sesión y redirigir
    localStorage.setItem("userId", loginData.userId);
    localStorage.setItem("nombre", loginData.nombre);

    navigate("/principal");
  } catch (err) {
    console.error(err);
    setError("Error al conectar con el servidor");
  }
};


  return (
    <div className="bg-light d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="card-body p-5 text-center">
          <img src="/logo.png" alt="Examline" className="mb-4" style={{ width: "150px", height: "auto" }} />
          <h2 className="mb-4 fw-bold text-primary">Registro</h2>

          {error && <div className="alert alert-danger">{error}</div>}

          <form noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
            <div className="mb-3 text-start">
              <label htmlFor="nombre" className="form-label">Nombre</label>
              <input
                type="text"
                className="form-control"
                id="nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <div className="invalid-feedback">Ingrese su nombre</div>
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="invalid-feedback">Ingrese un email válido</div>
            </div>

            <div className="mb-3 text-start">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="invalid-feedback">Ingrese su contraseña</div>
            </div>

            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary btn-lg">Registrarse</button>
            </div>

            <p className="mb-0">
              ¿Ya tenés cuenta? <Link to="/login">Inicia sesión</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Registro;

