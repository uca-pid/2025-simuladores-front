import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);

  const [nombreError, setNombreError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ---------------- Validaciones ----------------
  const validateName = (name) => {
    if (!name.trim()) return "Debe ingresar un nombre.";
    if (!/^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(name))
      return "Solo se permiten letras, espacios y caracteres como tildes, ñ, apóstrofes o guiones.";
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
  if (password.length < 8) return "Debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe incluir al menos una letra mayúscula.";
  if (!/[a-z]/.test(password)) return "Debe incluir al menos una letra minúscula.";
  if (!/\d/.test(password)) return "Debe incluir al menos un número.";
  if (!/[@$!%*?&#+^()_={}[\]<>|~]/.test(password)) 
    return "Debe incluir al menos un carácter especial.";
  if (/\s/.test(password)) return "No se permiten espacios en blanco.";
  return "";
};


  // ---------------- Submit ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombreErr = validateName(nombre);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setNombreError(nombreErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (nombreErr || emailErr || passwordErr) return; // No enviar si hay errores

    try {
      // 1️⃣ Registro
      const signupRes = await fetch("http://localhost:4000/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          password,
          rol: isProfessor ? "professor" : "student",
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        setError(signupData.error || "Error en el registro");
        return;
      }

      // 2️⃣ Login automático
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
      localStorage.setItem("name", loginData.nombre);
      localStorage.setItem("rol", loginData.rol);

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

          <form onSubmit={handleSubmit} noValidate>
            {/* Nombre */}
            <div className="mb-3 text-start">
              <label htmlFor="nombre" className="form-label">Nombre</label>
              <input
                type="text"
                className={`form-control ${nombreError ? "is-invalid" : ""}`}
                id="nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setNombreError(validateName(e.target.value));
                }}
              />
              <div className="form-text text-primary">
                Solo letras, espacios y caracteres como tildes, ñ, apóstrofes o guiones.
              </div>
              {nombreError && <div className="invalid-feedback">{nombreError}</div>}
            </div>

            {/* Email */}
            <div className="mb-3 text-start">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className={`form-control ${emailError ? "is-invalid" : ""}`}
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(validateEmail(e.target.value));
                }}
              />
              <div className="form-text text-primary">Debe tener formato ejemplo@dominio.com</div>
              {emailError && <div className="invalid-feedback">{emailError}</div>}
            </div>

            {/* Contraseña */}
            <div className="mb-3 text-start">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                type="password"
                className={`form-control ${passwordError ? "is-invalid" : ""}`}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(validatePassword(e.target.value));
                }}
              />
              <div className="form-text text-primary">
                Debe incluir al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial. No se permiten espacios.
              </div>
              {passwordError && <div className="invalid-feedback">{passwordError}</div>}
            </div>

            {/* Checkbox de rol */}
            <div className="form-check form-switch mb-3 text-start">
              <input
                className="form-check-input"
                type="checkbox"
                id="isProfessor"
                checked={isProfessor}
                onChange={() => setIsProfessor(!isProfessor)}
              />
              <label className="form-check-label" htmlFor="isProfessor">
                Registrarme como profesor
              </label>
            </div>

            {/* Botón */}
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

