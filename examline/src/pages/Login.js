import React, { useState, useEffect } from "react";
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
  const [isSEB, setIsSEB] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Detectar si se está dentro de Safe Exam Browser
  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      if (ua.includes("SEB") || ua.includes("SafeExamBrowser") || window.SafeExamBrowser) {
        setIsSEB(true);
      }
    } catch (err) {
      console.log("Error detectando SEB:", err);
    }
  }, []);

  // Función para cerrar/redirigir SEB
  const closeSEB = () => {
    try {
      console.log("Redirigiendo a ferrocarriloeste.com.ar al terminar el examen");
      window.location.href = "https://ferrocarriloeste.com.ar/";
    } catch (error) {
      console.log("Error al redireccionar:", error);
    }
  };

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

  // 🔹 Si está en SEB → mostrar solo el botón
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
            style={{ width: "80px", height: "auto" }}
          />
          <h2 className="mb-3 text-dark">Examen finalizado</h2>
          <p className="text-muted mb-4">
            Podés salir de Safe Exam Browser haciendo clic en el siguiente botón.
          </p>
          <button
            onClick={closeSEB}
            className="btn btn-danger w-100 py-2"
          >
            <i className="fas fa-sign-out-alt me-2"></i>
            Salir de SEB
          </button>
        </div>
      </div>
    );
  }

  // 🔹 Si NO está en SEB → mostrar el login normal
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
              style={{ width: "80px", height: "auto" }}
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
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
              <div className="invalid-feedback">Ingrese un email válido</div>
            </div>

            <div className="mb-4 text-start">
              <label
                htmlFor="password"
                className="form-label d-flex align-items-center gap-2"
              >
                <i className="fas fa-lock text-muted"></i>
                Contraseña
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
              <div className="invalid-feedback">Ingrese su contraseña</div>
            </div>

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
                style={{
                  color: "var(--primary-color)",
                  textDecoration: "none",
                  fontWeight: "500",
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

