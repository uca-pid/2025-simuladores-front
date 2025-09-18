import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { getUserById, updateUser } from "../services/api";

export default function UserSettingsPage() {
  const { user, logout, login, token } = useAuth();
  const [formData, setFormData] = useState({ nombre: "", email: "", password: "" });
  const [nombreError, setNombreError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
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
      showCancel
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

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
    if (password.trim() === "") return ""; // Permitir dejar en blanco si no quiere cambiar
    if (password.length < 8) return "Debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(password)) return "Debe incluir al menos una letra mayúscula.";
    if (!/[a-z]/.test(password)) return "Debe incluir al menos una letra minúscula.";
    if (!/\d/.test(password)) return "Debe incluir al menos un número.";
    if (!/[@$!%*?&#+^()_={}[\]<>|~]/.test(password)) return "Debe incluir al menos un carácter especial.";
    if (/\s/.test(password)) return "No se permiten espacios en blanco.";
    return "";
  };

  // ---------------- Cargar usuario ----------------
  useEffect(() => {
    if (!user) {
      showModal('error', 'Error', 'Usuario no identificado');
      setLoading(false);
      return;
    }

    setFormData({ nombre: "", email: "", password: "" });
    setLoading(true);

    getUserById(user.userId)
      .then((data) => {
        setFormData({ nombre: data.nombre, email: data.email, password: "" });
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
    if (name === "email") setEmailError(validateEmail(value));
    if (name === "password") setPasswordError(validatePassword(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones finales antes de enviar
    const nombreErr = validateName(formData.nombre);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);

    setNombreError(nombreErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (nombreErr || emailErr || passwordErr) return;

    // Preparar datos para enviar
    const submitData = { nombre: formData.nombre, email: formData.email };
    if (formData.password.trim() !== "") submitData.password = formData.password;

    try {
      const updatedUser = await updateUser(user.userId, submitData);

      // Update the auth context with the new user data
      const updatedUserData = {
        ...user,
        nombre: updatedUser.nombre,
        email: updatedUser.email
      };
      login(token, updatedUserData);

      showModal('success', '¡Éxito!', 'Usuario actualizado correctamente');
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      console.error("Error actualizando usuario", err);
      if (err.message && err.message.includes("email")) {
        setEmailError(err.message);
      } else {
        showModal('error', 'Error', err.message || 'Error actualizando usuario');
      }
    }
  };

  const handleDelete = async () => {
    showModal(
      'confirm',
      'Confirmar eliminación',
      '¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
      async () => {
        closeModal();
        try {
          const res = await fetch(`http://localhost:4000/users/${user.userId}`, { 
            method: "DELETE",
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!res.ok) throw new Error("Error eliminando usuario");

          showModal('success', '¡Cuenta eliminada!', 'Cuenta eliminada correctamente', () => {
            logout();
            navigate("/login");
            closeModal();
          });
        } catch (err) {
          console.error("Error eliminando usuario", err);
          showModal('error', 'Error', err.message);
        }
      },
      true
    );
  };

  if (loading) return <p className="text-center mt-5">Cargando...</p>;

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary flex-grow-1 me-3" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Configuración de Usuario
        </h1>
        <div className="d-flex gap-2">
          <BackToMainButton />
          <button className="btn btn-outline-danger" onClick={handleDelete}>Eliminar cuenta</button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Nombre */}
            <div className="mb-3">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`form-control ${nombreError ? "is-invalid" : ""}`}
              />
              {nombreError && <div className="invalid-feedback">{nombreError}</div>}
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-control ${emailError ? "is-invalid" : ""}`}
              />
              {emailError && <div className="invalid-feedback">{emailError}</div>}
            </div>

            {/* Contraseña */}
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Dejar en blanco para no cambiar"
                className={`form-control ${passwordError ? "is-invalid" : ""}`}
              />
              {passwordError && <div className="invalid-feedback">{passwordError}</div>}
            </div>

            <button type="submit" className="btn btn-success w-100">Guardar cambios</button>
          </form>
        </div>
      </div>

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.type === 'confirm' ? 'Eliminar' : 'Aceptar'}
        cancelText="Cancelar"
      />
    </div>
  );
}
