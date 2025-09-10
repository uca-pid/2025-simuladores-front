export async function loginUser({ email, password }) {
  try {
    const res = await fetch(`http://localhost:3000/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error || "Error en el login");
      error.status = res.status;
      throw error;
    }

    return data; // data debe contener info del usuario: { userId, name, email, etc. }
  } catch (err) {
    throw err;
  }
}

export async function signupUser({ nombre, email }) {
  try {
    const res = await fetch(`http://localhost:3000/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error || "Error al crear usuario");
      error.status = res.status;
      throw error;
    }

    return data; // data con info del usuario creado
  } catch (err) {
    throw err;
  }
}
