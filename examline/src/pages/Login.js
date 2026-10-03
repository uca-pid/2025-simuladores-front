import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSEB } from "../hooks";
import { loginUser } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/shared.css";

const EMAIL_REGEX = /^[A-Za-zÑñ0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-zÑñ0-9-]+(\.[A-Za-zÑñ0-9-]+)+$/;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isInSEB: isSEB, closeSEB } = useSEB();

  const validateEmail = (value) => {
    if (!value.trim()) return "Debe ingresar un email.";
    if (!EMAIL_REGEX.test(value)) return "El email no es válido.";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Debe ingresar su contraseña.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (isLoading || isOnCooldown) return;

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (!form.checkValidity() || emailErr || passwordErr) {
      setValidated(true);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Limpiar cualquier sesión anterior antes de hacer login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const data = await loginUser({ email, password });
      login(data.token, data.user);

      if (data.user.rol === "professor") {
        navigate("/principal");
      } else {
        navigate("/student-exam");
      }
    } catch (err) {
      console.error(err);
      // Mostrar mensaje específico para error 401
      if (err.status === 401) {
        // Mensaje genérico: no revelar si falló el email o la contraseña
        setError("Email o contraseña incorrectos");
      } else {
        setError(err.message || "Error al iniciar sesión");
      }
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
          background: "linear-gradient(135deg, #1E2955 0%, #172147 50%, #020617 100%)",
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
        background: "linear-gradient(135deg, #1E2955 0%, #172147 50%, #020617 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-120px",
          left: "-120px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          filter: "blur(80px)",
          background: "rgba(59,130,246,0.15)",
          pointerEvents: "none",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          bottom: "-140px",
          right: "-140px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          filter: "blur(80px)",
          background: "rgba(245,158,11,0.1)",
          pointerEvents: "none",
        }}
      ></div>
      <div
        className="modern-card login-card"
        style={{ maxWidth: "420px", width: "100%", position: "relative", zIndex: 1 }}
      >
        <div className="modern-card-body p-4 text-center">
          <div className="mb-3">
            <img
              src="/logo.png"
              alt="ExamLine"
              className="mb-2"
              style={{ width: "100px", height: "auto" }}
            />
            <h1 className="page-title mb-2">Bienvenido</h1>
            <p className="page-subtitle">Ingresa a tu cuenta de Examline</p>
          </div>

          {error && (
            <div className="error-message mb-3">
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
            <div className="mb-3 text-start">
              <label
                htmlFor="email"
                className="form-label d-flex align-items-center gap-2"
              >
                <i className="fas fa-envelope text-muted"></i>
                Email
              </label>
              <input
                type="email"
                className={`form-control ${validated && emailError ? "is-invalid" : ""}`}
                id="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validated) setEmailError(validateEmail(e.target.value));
                }}
                placeholder="Ingresa tu email"
                disabled={isLoading || isOnCooldown}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  backgroundColor: isLoading ? '#e9ecef' : 'white',
                  cursor: isLoading ? 'not-allowed' : 'text',
                  opacity: isLoading ? 0.7 : 1,
                }}
              />
              {validated && emailError && (
                <div className="invalid-feedback d-block">{emailError}</div>
              )}
            </div>

            {/* Contraseña */}
            <div className="mb-2 text-start d-flex flex-column">
              <PasswordInput
                id="password"
                label="Contraseña"
                required
                className={validated && passwordError ? "is-invalid" : ""}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validated) setPasswordError(validatePassword(e.target.value));
                }}
                placeholder="Ingresa tu contraseña"
                disabled={isLoading || isOnCooldown}
                inputStyle={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  backgroundColor: isLoading ? '#e9ecef' : 'white',
                  cursor: isLoading ? 'not-allowed' : 'text',
                  opacity: isLoading ? 0.7 : 1,
                }}
              />
              {validated && passwordError && (
                <div className="invalid-feedback d-block">{passwordError}</div>
              )}
            </div>

            <div className="mb-3 text-end">
              <Link
                to="/forgot-password"
                onClick={(e) => {
                  if (isLoading || isOnCooldown) e.preventDefault();
                }}
                style={{
                  color: isLoading || isOnCooldown ? "gray" : "var(--primary-color)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  cursor: isLoading || isOnCooldown ? "not-allowed" : "pointer",
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Botón de login */}
            <div className="d-grid mb-3">
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


