import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/api";
import { validatePasswordStrength } from "../utils/password";
import PasswordInput from "../components/PasswordInput";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/shared.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (value) => {
    if (!value) return "Debe ingresar una contraseña.";
    const validation = validatePasswordStrength(value);
    return validation.isValid ? "" : validation.message;
  };

  const validateConfirm = (value, original) => {
    if (!value) return "Debe confirmar la contraseña.";
    if (value !== original) return "Las contraseñas no coinciden.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirm(confirmPassword, password);

    setPasswordError(passwordErr);
    setConfirmError(confirmErr);

    if (passwordErr || confirmErr || !email) {
      if (!email) setError("Ingresá tu email para confirmar el cambio.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await resetPassword({ token, password, email });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || "El link de recuperación es inválido o expiró.");
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="modern-card-body p-5 text-center">
          <div className="mb-4">
            <img
              src="/logo.png"
              alt="ExamLine"
              className="mb-3"
              style={{ width: "120px", height: "auto" }}
            />
            <h1 className="page-title mb-2">Restablecer contraseña</h1>
            <p className="page-subtitle">
              {success ? "¡Listo! Ya podés iniciar sesión" : "Creá tu nueva contraseña"}
            </p>
          </div>

          {error && (
            <div className="error-message mb-4">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {success ? (
            <div className="mb-4" style={{ color: "var(--success-color)" }}>
              <i className="fas fa-circle-check" style={{ fontSize: "2.5rem" }}></i>
              <p className="mt-3" style={{ color: "var(--text-color-1)" }}>
                Te vamos a redirigir al login en unos segundos...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
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
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Confirmá tu email"
                  disabled={isLoading}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <div className="mb-3 text-start d-flex flex-column">
                <PasswordInput
                  id="password"
                  label="Nueva contraseña"
                  className={passwordError ? "is-invalid" : ""}
                  placeholder="Creá una contraseña segura"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                    if (confirmPassword) {
                      setConfirmError(validateConfirm(confirmPassword, e.target.value));
                    }
                  }}
                  disabled={isLoading}
                  inputStyle={{
                    padding: "0.75rem 1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "1rem",
                  }}
                />
                <div
                  className="form-text"
                  style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}
                >
                  8+ caracteres, mayúscula, minúscula, número y carácter especial.
                </div>
                {passwordError && <div className="invalid-feedback d-block">{passwordError}</div>}
              </div>

              <div className="mb-4 text-start d-flex flex-column">
                <PasswordInput
                  id="confirmPassword"
                  label="Confirmar contraseña"
                  className={confirmError ? "is-invalid" : ""}
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError(validateConfirm(e.target.value, password));
                  }}
                  disabled={isLoading}
                  inputStyle={{
                    padding: "0.75rem 1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    fontSize: "1rem",
                  }}
                />
                {confirmError && <div className="invalid-feedback d-block">{confirmError}</div>}
              </div>

              <div className="d-grid mb-4">
                <button
                  type="submit"
                  className="modern-btn modern-btn-primary modern-btn-lg login-submit-btn"
                  disabled={isLoading}
                  style={{ padding: "0.875rem 2rem" }}
                >
                  {isLoading ? (
                    <>
                      <div
                        className="modern-spinner"
                        style={{ width: "16px", height: "16px", marginRight: "0.5rem" }}
                      ></div>
                      <span className="btn-text">Guardando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      <span className="btn-text">Restablecer contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <p className="mb-0" style={{ color: "var(--text-color-1)" }}>
              <Link
                to="/login"
                style={{ color: "var(--primary-color)", textDecoration: "none", fontWeight: "500" }}
              >
                <i className="fas fa-arrow-left me-1"></i>
                Volver a iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
