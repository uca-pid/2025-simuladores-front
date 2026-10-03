import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/shared.css";
import { useAuth } from "../contexts/AuthContext";
import { signupUser, loginUser } from "../services/api";
import { validatePasswordStrength } from "../utils/password";
import PasswordInput from "../components/PasswordInput";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);
  const { login } = useAuth();

  const [nombreError, setNombreError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const navigate = useNavigate();

  // ---------------- Validaciones ----------------
  const validateName = (name) => {
    if (!name.trim()) return "Debe ingresar un nombre.";
    if (!/^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(name))
      return "Solo se permiten letras, letras con tildes, espacios y caracteres como ñ, apóstrofes o guiones.";
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) return "Debe ingresar un email.";
    if (!/^[A-Za-zÑñ0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-zÑñ0-9-]+(\.[A-Za-zÑñ0-9-]+)+$/.test(email))
      return "El email no es válido.";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Debe ingresar una contraseña.";

    const validation = validatePasswordStrength(password);
    return validation.isValid ? "" : validation.message;
  };

  const validateConfirmPassword = (value, original) => {
    if (!value) return "Debe confirmar la contraseña.";
    if (value !== original) return "Las contraseñas no coinciden.";
    return "";
  };

  // ---------------- Submit ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission if already loading or on cooldown
    if (isLoading || isOnCooldown) {
      return;
    }

    const nombreErr = validateName(nombre);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword, password);

    setNombreError(nombreErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    if (nombreErr || emailErr || passwordErr || confirmPasswordErr) return;

    setIsLoading(true);
    setError("");

  try {
  // 1️⃣ Registro
  await signupUser({
    nombre,
    email,
    password,
    rol: isProfessor ? "professor" : "student",
  });

  // 2️⃣ Login automático
  const loginData = await loginUser({ email, password });

  // 3️⃣ Usar contexto de autenticación
  login(loginData.token, loginData.user);

  // 4️⃣ Redirigir según rol
  if (loginData.user.rol === "professor") {
    navigate("/principal");
  } else {
    navigate("/student-exam");
  }

} catch (err) {
  console.error("Error en registro:", err);

  if (err.status === 400) {
    setError(err.message || "El email ya está registrado.");
  } else if (err.status === 429) {
    setError(err.message || "Demasiados intentos. Intentá de nuevo en unos minutos.");
  } else if (err.status === 500) {
    setError("Error en el servidor. Inténtalo más tarde.");
  } else if (err.status) {
    setError(err.message || "Error desconocido al registrarse.");
  } else {
    setError("No se pudo conectar al servidor. Revisa tu conexión.");
  }
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
      <div className="modern-card registro-card" style={{ maxWidth: "800px", width: "100%", position: "relative", zIndex: 1 }}>
        <div className="row g-0">
          {/* Columna izquierda: Logo y título */}
          <div className="col-md-4 d-flex flex-row flex-md-column justify-content-center align-items-center gap-3 gap-md-0 p-3 p-md-4" style={{ background: 'white' }}>
            <img src="/logo.png" alt="ExamLine" className="d-md-none" style={{ width: "48px", height: "auto" }} />
            <img src="/logo.png" alt="ExamLine" className="mb-3 d-none d-md-block" style={{ width: "120px", height: "auto" }} />
            <div className="d-md-none">
              <h3 className="fw-bold mb-0" style={{ fontSize: '1.1rem' }}>Crea tu cuenta de Examline</h3>
            </div>
            <h3 className="fw-bold text-center mb-0 d-none d-md-block" style={{ fontSize: '1.4rem' }}>Crea tu cuenta de Examline</h3>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="col-md-8 p-3" style={{ background: '#f8fafc' }}>
            {error && (
              <div className="error-message mb-4">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre */}
              <div className="mb-2 text-start">
                <label htmlFor="nombre" className="form-label d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <i className="fas fa-user text-muted"></i>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  className={`form-control ${nombreError ? "is-invalid" : ""}`}
                  id="nombre"
                  autoComplete="name"
                  placeholder="Ingresa tu nombre completo"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setNombreError(validateName(e.target.value));
                  }}
                  disabled={isLoading || isOnCooldown}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    backgroundColor: isLoading ? '#e9ecef' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'text',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
                <div className="form-text" style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Solo letras, tildes, espacios, ñ, apóstrofes o guiones.
                </div>
                {nombreError && <div className="invalid-feedback">{nombreError}</div>}
              </div>

              {/* Email */}
              <div className="mb-2 text-start">
                <label htmlFor="email" className="form-label d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <i className="fas fa-envelope text-muted"></i>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  id="email"
                  autoComplete="email"
                  placeholder="ejemplo@dominio.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(validateEmail(e.target.value));
                  }}
                  disabled={isLoading || isOnCooldown}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    backgroundColor: isLoading ? '#e9ecef' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'text',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
                <div className="form-text" style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Formato: ejemplo@dominio.com
                </div>
                {emailError && <div className="invalid-feedback">{emailError}</div>}
              </div>

              {/* Contraseña */}
              <div className="mb-2 text-start d-flex flex-column">
                <PasswordInput
                  id="password"
                  label="Contraseña"
                  autoComplete="new-password"
                  labelStyle={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}
                  className={passwordError ? "is-invalid" : ""}
                  placeholder="Crea una contraseña segura"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                    if (confirmPassword) {
                      setConfirmPasswordError(validateConfirmPassword(confirmPassword, e.target.value));
                    }
                  }}
                  disabled={isLoading || isOnCooldown}
                  inputStyle={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    backgroundColor: isLoading ? '#e9ecef' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'text',
                    opacity: isLoading ? 0.7 : 1,
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

              {/* Confirmar Contraseña */}
              <div className="mb-2 text-start d-flex flex-column">
                <PasswordInput
                  id="confirmPassword"
                  label="Confirmar Contraseña"
                  autoComplete="new-password"
                  labelStyle={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}
                  className={confirmPasswordError ? "is-invalid" : ""}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError(validateConfirmPassword(e.target.value, password));
                  }}
                  disabled={isLoading || isOnCooldown}
                  inputStyle={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    backgroundColor: isLoading ? '#e9ecef' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'text',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                />
                {confirmPasswordError && <div className="invalid-feedback d-block">{confirmPasswordError}</div>}
              </div>


              {/* Selector de rol */}
              <div className="mb-2 text-start">
                <label className="form-label d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <i className="fas fa-id-badge text-muted"></i>
                  ¿Cómo vas a usar Examline?
                </label>
                <div className="d-flex gap-2" role="radiogroup" aria-label="Rol de usuario">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!isProfessor}
                    onClick={() => setIsProfessor(false)}
                    disabled={isLoading || isOnCooldown}
                    className="flex-fill text-start p-2"
                    style={{
                      background: !isProfessor ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                      border: '1.5px solid ' + (!isProfessor ? 'var(--primary-color)' : 'var(--border-color)'),
                      borderRadius: '8px',
                      cursor: isLoading || isOnCooldown ? 'not-allowed' : 'pointer',
                      color: !isProfessor ? 'var(--primary-color)' : 'var(--text-color-3)',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      <i className="fas fa-user-graduate"></i>
                      Estudiante
                    </div>
                    <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Rendir exámenes</small>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={isProfessor}
                    onClick={() => setIsProfessor(true)}
                    disabled={isLoading || isOnCooldown}
                    className="flex-fill text-start p-2"
                    style={{
                      background: isProfessor ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                      border: '1.5px solid ' + (isProfessor ? 'var(--primary-color)' : 'var(--border-color)'),
                      borderRadius: '8px',
                      cursor: isLoading || isOnCooldown ? 'not-allowed' : 'pointer',
                      color: isProfessor ? 'var(--primary-color)' : 'var(--text-color-3)',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      <i className="fas fa-chalkboard-teacher"></i>
                      Profesor
                    </div>
                    <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Crear y corregir exámenes</small>
                  </button>
                </div>
              </div>

              {/* Botón */}
              <div className="d-grid mb-3">
                <button 
                  type="submit" 
                  className="modern-btn modern-btn-primary registro-submit-btn"
                  disabled={isLoading || isOnCooldown}
                  style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}
                >
                  {isLoading ? (
                    <>
                      <div className="modern-spinner" style={{ width: '14px', height: '14px', marginRight: '0.4rem' }}></div>
                      <span className="btn-text">Registrando...</span>
                    </>
                  ) : isOnCooldown ? (
                    <>
                      <i className="fas fa-clock me-2"></i>
                      <span className="btn-text">Espera...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus me-2"></i>
                      <span className="btn-text">Crear Cuenta</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mb-0 text-center" style={{ color: 'var(--text-color-1)', fontSize: '0.85rem' }}>
                ¿Ya tenés cuenta?{" "}
                {isLoading || isOnCooldown ? (
                  <span style={{ color: 'gray', cursor: 'not-allowed', fontWeight: '500' }}>
                    Inicia sesión aquí
                  </span>
                ) : (
                  <Link 
                    to="/login" 
                    style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}
                  >
                    Inicia sesión aquí
                  </Link>
                )}
              </p>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registro;
