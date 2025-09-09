// Crear usuario
export const signupUser = async (user) => {
  const res = await fetch(`http://localhost:4000/users/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Error al crear usuario");
  }

  return res.json();
};