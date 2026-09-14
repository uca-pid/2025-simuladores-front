import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { getUserById, updateUser } from "../services/api";
import { validatePasswordStrength } from "../utils/password";

export default function UserSettingsPage() {
  const { user, logout, login, token } = useAuth();
  const [formData, setFormData] = useState({ nombre: "", email: "", password: "", currentPassword: "" });
  const [nombreError, setNombreError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false,
    isProcessing: false
  });
  const navigate = useNavigate();

  // ---------------- Modal helper ----------------
  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({
      show: true,
      type,
      title,
      message,
      onConfirm,
      showCancel,
      isProcessing: false
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false, isProcessing: false }));
  };

  // ---------------- Validaciones ----------------
  const validateName = (name) => {
    if (!name.trim()) return "Debe ingresar un nombre.";
    if (!/^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(name))
      return "Solo se permiten letras, espacios y caracteres como tildes, ñ, apóstrofes o guiones.";
    return "";
  };

  const validatePassword = (password) => {
    if (password.trim() === "") return ""; // Permitir dejar en blanco si no quiere cambiar
    
    const validation = validatePasswordStrength(password);
    return validation.isValid ? "" : validation.message;
  };

  // ---------------- Cargar usuario ----------------
  useEffect(() => {
    if (!user) {
      showModal('error', 'Error', 'Usuario no identificado');
      setLoading(false);
      return;
    }

    setFormData({ nombre: "", email: "", password: "", currentPassword: "" });
    setLoading(true);

    getUserById(user.userId)
      .then((data) => {
        setFormData({ nombre: data.nombre, email: data.email, password: "", currentPassword: "" });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando usuario", err);
        showModal('error', 'Error', 'No se pudieron cargar los datos del usuario');
        setLoading(false);
      });
  }, [user]);

  // ---------------- Handlers ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validaciones en tiempo real
    if (name === "nombre") setNombreError(validateName(value));
    if (name === "password") setPasswordError(validatePassword(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving || isOnCooldown) return;

    const nombreErr = validateName(formData.nombre);
    const passwordErr = validatePassword(formData.password);

    setNombreError(nombreErr);
    setPasswordError(passwordErr);

    // Validar que si quiere cambiar contraseña, ingrese la actual
    if (formData.password.trim() !== "" && !formData.currentPassword) {
      setPasswordError("Debe ingresar la contraseña actual para cambiarla");
      return;
    }

    if (nombreErr || passwordErr) return;

    // Preparar datos para enviar
    const submitData = { nombre: formData.nombre };
    if (formData.password.trim() !== "") {
      submitData.password = formData.password;
      submitData.currentPassword = formData.currentPassword;
    }

    setIsSaving(true);
    try {
      const updatedUser = await updateUser(user.userId, submitData);

      const updatedUserData = {
        ...user,
        nombre: updatedUser.nombre,
      };
      login(token, updatedUserData);

      showModal('success', '¡Éxito!', 'Usuario actualizado correctamente');
      setFormData((prev) => ({ ...prev, password: "", currentPassword: "" }));
    } catch (err) {
      console.error("Error actualizando usuario", err);
      showModal('error', 'Error', err.message || 'Error actualizando usuario');
    } finally {
      setIsSaving(false);
      setIsOnCooldown(true);
      setTimeout(() => setIsOnCooldown(false), 1000);
    }
  };

  const handleDelete = async () => {
    showModal(
      'error',
      'Confirmar eliminación',
      '¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
      async () => {
        // Prevenir múltiples ejecuciones
        if (isDeleting) return;
        
        try {
          setIsDeleting(true);
          setModal(prev => ({ ...prev, isProcessing: true }));
          
          const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';
          const res = await fetch(`${API_BASE_URL}/users/${user.userId}`, { 
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!res.ok) throw new Error("Error eliminando usuario");

          // MOSTRAR CARTEL DE ÉXITO
          showModal(
            'success',
            'Cuenta eliminada',
            'Tu cuenta fue eliminada correctamente.',
            () => {
              closeModal();
              logout();
              navigate('/login');
            }
          );
          
        } catch (err) {
          console.error("Error eliminando usuario", err);
          setModal(prev => ({ ...prev, isProcessing: false }));
          showModal('error', 'Error', err.message);
        } finally {
          setIsDeleting(false);
        }
      },
      true
    );
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="user-settings-header">
            <div className="header-title-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-user-cog me-3"></i>
                <span className="title-text">Configuración de Usuario</span>
              </h1>
            </div>
            <div className="header-actions-section">
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                <BackToMainButton
                  className="modern-btn modern-btn-secondary modern-btn-sm"
                  disabled={isSaving || isOnCooldown || isDeleting}
                  style={{
                    pointerEvents: isSaving || isOnCooldown || isDeleting ? 'none' : 'auto',
                    opacity: isSaving || isOnCooldown || isDeleting ? 0.6 : 1
                  }}
                />

                <button
                  className="modern-btn modern-btn-danger modern-btn-sm"
                  onClick={handleDelete}
                  disabled={isSaving || isOnCooldown || isDeleting}
                  style={{
                    pointerEvents: isSaving || isOnCooldown || isDeleting ? 'none' : 'auto',
                    opacity: isSaving || isOnCooldown || isDeleting ? 0.6 : 1
                  }}
                >
                  <i className="fas fa-trash me-2"></i>
                  Eliminar cuenta
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-edit me-2"></i>
            Datos Personales
          </h3>
        </div>
        <div className="modern-card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* Nombre */}
              <div className="col-lg-6 col-md-12">
                <label className="form-label fw-semibold">
                  <i className="fas fa-user me-2"></i>
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`form-control modern-input ${nombreError ? "is-invalid" : ""}`}
                  placeholder="Ingrese su nombre completo"
                  disabled={isSaving || isOnCooldown}
                />
                {nombreError && <div className="invalid-feedback">{nombreError}</div>}
              </div>

              {/* Email (solo lectura) */}
              <div className="col-lg-6 col-md-12">
                <label className="form-label fw-semibold">
                  <i className="fas fa-envelope me-2"></i>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  className="form-control modern-input"
                  disabled
                />
                <small className="text-muted">El email no se puede modificar</small>
              </div>

              {/* Contraseña actual */}
              <div className="col-lg-6 col-md-12">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-key me-2"></i>
                    Contraseña actual
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="btn btn-link p-0"
                    disabled={isSaving || isOnCooldown || isDeleting}
                    style={{
                      fontSize: '0.85rem',
                      pointerEvents: isSaving || isOnCooldown || isDeleting ? 'none' : 'auto',
                      opacity: isSaving || isOnCooldown || isDeleting ? 0.6 : 1
                    }}
                  >
                    <i className={`fas ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"} me-1`}></i>
                    {showCurrentPassword ? "Ocultar" : "Mostrar"}
                  </button>

                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="form-control modern-input"
                  placeholder="Contraseña actual"                  disabled={isSaving || isOnCooldown}                />
                <small className="text-muted">Requerida solo si desea cambiar la contraseña</small>
              </div>

              {/* Nueva contraseña */}
              <div className="col-lg-6 col-md-12">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-lock me-2"></i>
                    Nueva contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="btn btn-link p-0"
                    disabled={isSaving || isOnCooldown || isDeleting}
                    style={{
                      fontSize: '0.85rem',
                      pointerEvents: isSaving || isOnCooldown || isDeleting ? 'none' : 'auto',
                      opacity: isSaving || isOnCooldown || isDeleting ? 0.6 : 1
                    }}
                  >
                    <i className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"} me-1`}></i>
                    {showNewPassword ? "Ocultar" : "Mostrar"}
                  </button>

                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nueva contraseña"
                  className={`form-control modern-input ${passwordError ? "is-invalid" : ""}`}
                  disabled={isSaving || isOnCooldown}
                />
                {passwordError && <div className="invalid-feedback">{passwordError}</div>}
                <small className="text-muted">Dejar en blanco para mantener la actual</small>
              </div>
            </div>

            <div className="mt-4 d-flex justify-content-center justify-content-md-end">
              <button 
                type="submit" 
                className="modern-btn modern-btn-primary modern-btn-lg save-changes-btn"
                disabled={isSaving || isOnCooldown}
              >
                {isSaving ? (
                  <>
                    <div
                      className="modern-spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "0.5rem",
                      }}
                    ></div>
                    <span>Guardando...</span>
                  </>
                ) : isOnCooldown ? (
                  <>
                    <i className="fas fa-clock me-2"></i>
                    <span>Espera...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.type === 'error' ? 'Eliminar cuenta' : modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
        cancelText="Cancelar"
        isProcessing={modal.isProcessing}
      />
    </div>
  );
}

