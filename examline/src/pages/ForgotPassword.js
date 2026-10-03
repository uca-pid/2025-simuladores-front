import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/shared.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (isLoading) return;

    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Hubo un problema al procesar la solicitud.");
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
            <h1 className="page-title mb-2">Recuperar contraseña</h1>
            <p className="page-subtitle">
              {sent
                ? "Revisá tu email para continuar"
                : "Ingresá tu email y te enviamos un link para restablecerla"}
            </p>
          </div>

          {error && (
            <div className="error-message mb-4">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {sent ? (
            <div>
              <div className="mb-4" style={{ color: "var(--success-color)" }}>
                <i className="fas fa-envelope-circle-check" style={{ fontSize: "2.5rem" }}></i>
              </div>
              <p style={{ color: "var(--text-color-1)" }}>
                Si <strong>{email}</strong> está registrado, vas a recibir un email con instrucciones
                para restablecer tu contraseña. El link expira en 1 hora.
              </p>
            </div>
          ) : (
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
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu email"
                  disabled={isLoading}
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
                <div className="invalid-feedback">Ingrese un email válido</div>
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
                      <span className="btn-text">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      <span className="btn-text">Enviar link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="mb-0" style={{ color: "var(--text-color-1)" }}>
            <Link
              to="/login"
              style={{
                color: "var(--primary-color)",
                textDecoration: "none",
                fontWeight: "500",
              }}
            >
              <i className="fas fa-arrow-left me-1"></i>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
