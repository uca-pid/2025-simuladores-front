import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSEB } from "../hooks";
import { loginUser } from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 🔹 agregado
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isInSEB: isSEB, closeSEB } = useSEB();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (isLoading || isOnCooldown) return;

    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await loginUser({ email, password });
      login(data.token, data.user);

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
      setIsOnCooldown(true);
      setTimeout(() => setIsOnCooldown(false), 1000);
    }
  };

  if (isSEB) {
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          className="modern-card text-center p-5"
          style={{ maxWidth: "420px", width: "100%" }}
        >
          <img
            src="/logo.png"
            alt="ExamLine"
            className="mb-3"
            style={{ width: "120px", height: "auto" }}
          />
          <h2 className="mb-3 text-dark">Examen finalizado</h2>
          <p className="text-muted mb-4">
            Podés salir de Safe Exam Browser haciendo clic en el siguiente botón.
          </p>
          <button
            onClick={() => closeSEB()}
            className="btn btn-danger w-100 py-2"
          >
            <i className="fas fa-sign-out-alt me-2"></i>
            Salir de SEB
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-3"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        className="modern-card login-card"
        style={{ maxWidth: "420px", width: "100%" }}
      >
        <div className="modern-card-body p-5 text-center">
          <div className="mb-4">
            <img
              src="/logo.png"
              alt="ExamLine"
              className="mb-3"
              style={{ width: "120px", height: "auto" }}
            />
            <h1 className="page-title mb-2">Bienvenido</h1>
            <p className="page-subtitle">Ingresa a tu cuenta de Examline</p>
          </div>

          {error && (
            <div className="error-message mb-4">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
            {/* Email */}
            <div className="mb-4 text-start">
              <label
                htmlFor="email"
                className="form-label d-flex align-items-center gap-2"
              >
                <i className="fas fa-envelope text-muted"></i>
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu email"
                disabled={isLoading || isOnCooldown}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
              <div className="invalid-feedback">Ingrese un email válido</div>
            </div>

            {/* Contraseña con toggle arriba a la derecha */}
            <div className="mb-4 text-start d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label
                  htmlFor="password"
                  className="form-label d-flex align-items-center gap-2 mb-0"
                >
                  <i className="fas fa-lock text-muted"></i>
                  Contraseña
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn btn-link p-0"
                  disabled={isLoading || isOnCooldown}
                  style={{
                    fontSize: "0.9rem",
                    pointerEvents: isLoading || isOnCooldown ? "none" : "auto",
                    opacity: isLoading || isOnCooldown ? 0.6 : 1,
                  }}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} me-1`}></i>
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>

              </div>

              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={isLoading || isOnCooldown}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
              <div className="invalid-feedback">Ingrese su contraseña</div>
            </div>

            {/* Botón de login */}
            <div className="d-grid mb-4">
              <button
                type="submit"
                className="modern-btn modern-btn-primary modern-btn-lg login-submit-btn"
                disabled={isLoading || isOnCooldown}
                style={{ padding: "0.875rem 2rem" }}
              >
                {isLoading ? (
                  <>
                    <div
                      className="modern-spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "0.5rem",
                      }}
                    ></div>
                    <span className="btn-text">Ingresando...</span>
                  </>
                ) : isOnCooldown ? (
                  <>
                    <i className="fas fa-clock me-2"></i>
                    <span className="btn-text">Espera...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt me-2"></i>
                    <span className="btn-text">Ingresar</span>
                  </>
                )}
              </button>
            </div>

            <p className="mb-0" style={{ color: "var(--text-color-1)" }}>
              ¿No tenés cuenta?{" "}
              <Link
                to="/registro"
                onClick={(e) => {
                  if (isLoading || isOnCooldown) e.preventDefault();
                }}
                style={{
                  color: isLoading || isOnCooldown ? "gray" : "var(--primary-color)",
                  textDecoration: "none",
                  fontWeight: "500",
                  cursor: isLoading || isOnCooldown ? "not-allowed" : "pointer",
                }}
              >
                Regístrate aquí
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;


