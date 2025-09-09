import { useState } from "react";
import { signupUser } from "./services/api"; // Asegurate que la ruta sea correcta

function App() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await signupUser({ nombre, email });
      setMessage(`Usuario creado: ${user.name} (${user.email})`);
      setNombre("");
      setEmail("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Crear Usuario</h1>
      <form onSubmit={handleSubmit} style={{ display: "inline-block", textAlign: "left" }}>
        <div>
          <label>Nombre:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: "10px" }}>Crear Usuario</button>
      </form>

      {message && <p style={{ marginTop: "20px" }}>{message}</p>}
    </div>
  );
}

export default App;
