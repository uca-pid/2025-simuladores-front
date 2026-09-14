import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../contexts/AuthContext";
import { signupUser, loginUser } from "../services/api";
import { validatePasswordStrength } from "../utils/password";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const [nombreError, setNombreError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

    setNombreError(nombreErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (nombreErr || emailErr || passwordErr) return;

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

  // ✅ si usás fetch + la solución que te pasé en api.js
  if (err.status === 400) {
    setError(err.data?.error || "El email ya está registrado.");
  } else if (err.status === 500) {
    setError("Error en el servidor. Inténtalo más tarde.");
  } else if (err.status) {
    setError("Error desconocido al registrarse.");
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
    <div className="d-flex align-items-center justify-content-center min-vh-100 py-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="modern-card registro-card" style={{ maxWidth: "800px", width: "100%" }}>
        <div className="row g-0">
          {/* Columna izquierda: Logo y título */}
          <div className="col-md-4 d-flex flex-column justify-content-center align-items-center p-4" style={{ background: 'white' }}>
            <img src="/logo.png" alt="ExamLine" className="mb-3" style={{ width: "120px", height: "auto" }} />
            <h3 className="fw-bold text-center mb-2" style={{ fontSize: '1.4rem' }}>Únete a Examline</h3>
            <p className="text-center px-2" style={{ fontSize: '0.9rem', color: 'var(--text-color-1)' }}>Crea tu cuenta y gestiona exámenes</p>
            <div className="mt-3">
              <div className="d-flex align-items-center gap-2 mb-1" style={{ color: 'var(--success-color)' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '0.8rem' }}></i>
                <small style={{ fontSize: '0.8rem' }}>Gestión de exámenes</small>
              </div>
              <div className="d-flex align-items-center gap-2 mb-1" style={{ color: 'var(--success-color)' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '0.8rem' }}></i>
                <small style={{ fontSize: '0.8rem' }}>Interfaz moderna</small>
              </div>
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--success-color)' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '0.8rem' }}></i>
                <small style={{ fontSize: '0.8rem' }}>Para profes y estudiantes</small>
              </div>
            </div>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="col-md-8 p-4" style={{ background: '#f8fafc' }}>
            {error && (
              <div className="error-message mb-4">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre */}
              <div className="mb-3 text-start">
                <label htmlFor="nombre" className="form-label d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <i className="fas fa-user text-muted"></i>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  className={`form-control ${nombreError ? "is-invalid" : ""}`}
                  id="nombre"
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
                    fontSize: '0.9rem'
                  }}
                />
                <div className="form-text" style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Solo letras, tildes, espacios, ñ, apóstrofes o guiones.
                </div>
                {nombreError && <div className="invalid-feedback">{nombreError}</div>}
              </div>

              {/* Email */}
              <div className="mb-3 text-start">
                <label htmlFor="email" className="form-label d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <i className="fas fa-envelope text-muted"></i>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  id="email"
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
                    fontSize: '0.9rem'
                  }}
                />
                <div className="form-text" style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Formato: ejemplo@dominio.com
                </div>
                {emailError && <div className="invalid-feedback">{emailError}</div>}
              </div>

              {/* Contraseña */}
              <div className="mb-3 text-start d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label
                    htmlFor="password"
                    className="form-label d-flex align-items-center gap-2 mb-0"
                    style={{ fontSize: '0.9rem' }}
                  >
                    <i className="fas fa-lock text-muted"></i>
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn btn-link p-0"
                    disabled={isLoading || isOnCooldown}
                    style={{ fontSize: '0.85rem', pointerEvents: isLoading || isOnCooldown ? 'none' : 'auto', opacity: isLoading || isOnCooldown ? 0.6 : 1 }}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} me-1`}></i>
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${passwordError ? "is-invalid" : ""}`}
                  id="password"
                  placeholder="Crea una contraseña segura"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                  }}
                  disabled={isLoading || isOnCooldown}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
                <div
                  className="form-text"
                  style={{ color: 'var(--text-color-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}
                >
                  8+ caracteres, mayúscula, minúscula, número y carácter especial.
                </div>
                {passwordError && <div className="invalid-feedback">{passwordError}</div>}
              </div>


              {/* Switch de rol */}
              <div className="mb-3">
                <div className="d-flex align-items-center gap-2 p-2" style={{ 
                  background: isProfessor ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid ' + (isProfessor ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
                  borderRadius: '6px',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="d-flex align-items-center" style={{ color: isProfessor ? 'var(--primary-color)' : 'var(--success-color)' }}>
                    <i className={isProfessor ? "fas fa-chalkboard-teacher" : "fas fa-user-graduate"} style={{ fontSize: '1rem' }}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isProfessor"
                        checked={isProfessor}
                        onChange={() => setIsProfessor(!isProfessor)}
                        disabled={isLoading || isOnCooldown}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      <label className="form-check-label" htmlFor="isProfessor" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                        {isProfessor ? "Profesor" : "Estudiante"}
                      </label>
                    </div>
                    <small style={{ color: 'var(--text-color-3)', fontSize: '0.75rem' }}>
                      {isProfessor 
                        ? "Crear y gestionar exámenes" 
                        : "Tomar exámenes asignados"
                      }
                    </small>
                  </div>
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
