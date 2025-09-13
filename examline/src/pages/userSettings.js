import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

export default function UserSettingsPage() {
  const userId = Number(localStorage.getItem("userId"));
  const [formData, setFormData] = useState({ nombre: "", email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = "http://localhost:4000";

  useEffect(() => {
    if (!userId) {
      alert("Usuario no identificado");
      setLoading(false);
      return;
    }

    // Limpiar datos del usuario anterior
    setFormData({ nombre: "", email: "", password: "" });
    setLoading(true);

    fetch(`${API_URL}/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar usuario");
        return res.json();
      })
      .then((data) => {
        setFormData({ nombre: data.nombre, email: data.email, password: "" });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando usuario", err);
        alert("No se pudieron cargar los datos del usuario");
        setLoading(false);
      });
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { nombre: formData.nombre, email: formData.email };
    if (formData.password.trim() !== "") submitData.password = formData.password;

    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error actualizando usuario");
      }

      const updatedUser = await res.json();
      console.log("Usuario actualizado:", updatedUser);
      alert("Usuario actualizado correctamente");
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      console.error("Error actualizando usuario", err);
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.")) return;

    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error eliminando usuario");

      alert("Cuenta eliminada correctamente");
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error("Error eliminando usuario", err);
      alert(err.message);
    }
  };

  if (loading) return <p className="text-center mt-5">Cargando...</p>;

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Configuración de Usuario</h1>
        <button className="btn btn-outline-danger" onClick={handleDelete}>
          Eliminar cuenta
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Dejar en blanco para no cambiar"
                className="form-control"
              />
            </div>

            <button type="submit" className="btn btn-success">
              Guardar cambios
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
