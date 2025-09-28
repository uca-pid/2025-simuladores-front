import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Prevent submission if already loading or on cooldown
    if (isLoading || isOnCooldown) {
      return;
    }

    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Use the API service which handles password hashing
      const data = await loginUser({ email, password });

      // Use the new auth context to handle login
      login(data.token, data.user);

      // Redirigir según rol
      if (data.user.rol === "professor") {
        navigate("/principal");
      } else {
        navigate("/student-exam");
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
      // Start cooldown period
      setIsOnCooldown(true);
      setTimeout(() => {
        setIsOnCooldown(false);
      }, 1000); // 1 second cooldown
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
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={isLoading || isOnCooldown}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Ingresando...
                  </>
                ) : isOnCooldown ? (
                  "Espera..."
                ) : (
                  "Ingresar"
                )}
              </button>
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
