import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../contexts/AuthContext";
import { signupUser, loginUser } from "../services/api";

const Registro = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);
  const { login } = useAuth();

  const [nombreError, setNombreError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

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
    if (password.length < 8) return "Debe tener al menos 8 caracteres.";
    if (!/[A-ZÁÉÍÓÚÜÑ]/.test(password)) return "Debe incluir al menos una letra mayúscula.";
    if (!/[a-záéíóúüñ]/.test(password)) return "Debe incluir al menos una letra minúscula.";
    if (!/\d/.test(password)) return "Debe incluir al menos un número.";
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`¡¿]/.test(password))
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

    if (nombreErr || emailErr || passwordErr) return;

  try {
  // 1️⃣ Registro
  const signupData = await signupUser({
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
}
  };  
  return (
    <div className="bg-light d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: "800px", width: "100%" }}>
        <div className="row g-0">
          {/* Columna izquierda: Logo y título */}
          <div className="col-md-5 d-flex flex-column justify-content-center align-items-center p-4">
            <img src="/logo.png" alt="Examline" className="mb-4" style={{ width: "150px", height: "auto" }} />
            <h2 className="fw-bold text-primary text-center">Registro</h2>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="col-md-7 p-5 bg-light">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre */}
              <div className="mb-3 text-start">
                <input
                  type="text"
                  className={`form-control ${nombreError ? "is-invalid" : ""}`}
                  id="nombre"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setNombreError(validateName(e.target.value));
                  }}
                />
                <div className="form-text text-primary">
                  Solo letras, letras con tildes, espacios y caracteres como ñ, apóstrofes o guiones.
                </div>
                {nombreError && <div className="invalid-feedback">{nombreError}</div>}
              </div>

              {/* Email */}
              <div className="mb-3 text-start">
                <input
                  type="email"
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  id="email"
                  placeholder="Email"
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
                <input
                  type="password"
                  className={`form-control ${passwordError ? "is-invalid" : ""}`}
                  id="password"
                  placeholder="Contraseña"
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

              {/* Switch de rol */}
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
    </div>
  );
};

export default Registro;
