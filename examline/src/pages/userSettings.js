import { useEffect, useState } from 'react';

export default function UserSettingsPage({ userId }) {
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:4000';
  // Validación inicial
  useEffect(() => {
    if (!userId) {
      alert('Usuario no identificado');
      setLoading(false);
      return;
    }

    const fetchUrl = `${API_URL}/users/${userId}`;
    console.log('Cargando usuario desde:', fetchUrl);

    fetch(fetchUrl)
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) throw new Error('Error al cargar usuario');
        return res.json();
      })
      .then(data => {
        console.log('Usuario cargado:', data);
        setFormData({ nombre: data.nombre, email: data.email, password: '' });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando usuario', err);
        alert('No se pudieron cargar los datos del usuario');
        setLoading(false);
      });
  }, [userId, API_URL]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.nombre || !formData.email) {
      alert('Nombre y email son obligatorios');
      return;
    }

    // No enviar password si está vacía
    const submitData = { nombre: formData.nombre, email: formData.email };
    if (formData.password.trim() !== '') submitData.password = formData.password;

    console.log('Enviando datos al backend:', submitData);

    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error actualizando usuario');
      }

      const updatedUser = await res.json();
      console.log('Usuario actualizado:', updatedUser);
      alert('Usuario actualizado correctamente');

      setFormData(prev => ({ ...prev, password: '' })); // limpiar password
    } catch (err) {
      console.error('Error actualizando usuario', err);
      alert(err.message);
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Configuración de Usuario</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="border rounded w-full p-2"
          />
        </div>

        <div>
          <label className="block">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="border rounded w-full p-2"
          />
        </div>

        <div>
          <label className="block">Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Dejar en blanco para no cambiar"
            className="border rounded w-full p-2"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
