import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState(""); // para mostrar errores del backend
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    try {
      // Llamada al endpoint de login
      const res = await fetch("http://localhost:4000/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      // Guardar info del usuario
      localStorage.setItem("profesorNombre", data.nombre);
      localStorage.setItem("userId", data.userId);

      // Redirigir a página principal
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
          <h2 className="mb-4 fw-bold text-primary">Login</h2>

          {error && <div className="alert alert-danger">{error}</div>}

          <form noValidate className={validated ? "was-validated" : ""} onSubmit={handleSubmit}>
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



