// src/pages/ExamCreator.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";

const ExamCreator = () => {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [preguntas, setPreguntas] = useState([]);
  const [textoPregunta, setTextoPregunta] = useState("");
  const [opciones, setOpciones] = useState(["", "", "", ""]);
  const [correcta, setCorrecta] = useState(0);
  const [error, setError] = useState("");

  // Agregar pregunta al listado
  const handleAgregarPregunta = () => {
    if (!textoPregunta || opciones.some(o => !o)) {
      setError("Complete la pregunta y todas las opciones");
      return;
    }

    setPreguntas([
      ...preguntas,
      { texto: textoPregunta, opciones: [...opciones], correcta }
    ]);

    // Limpiar inputs
    setTextoPregunta("");
    setOpciones(["", "", "", ""]);
    setCorrecta(0);
    setError("");
  };

  // Publicar examen
  const handlePublicarExamen = async () => {
    if (!titulo) {
      setError("Ingrese un título para el examen");
      return;
    }
    if (preguntas.length === 0) {
      setError("Agregue al menos una pregunta");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/exams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          profesorId: Number(localStorage.getItem("userId")),
          preguntas
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear examen");

      // Volver a la Página Principal
      navigate("/principal");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Crear Examen</h1>
        <BackToMainButton />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <h3>Título del examen</h3>
        <input
          type="text"
          className="form-control"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </div>

      <hr />

      <h3>Agregar Pregunta</h3>
      <div className="mb-3">
        <label className="form-label">Texto de la pregunta</label>
        <input
          type="text"
          className="form-control"
          value={textoPregunta}
          onChange={(e) => setTextoPregunta(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Opciones</label>
        {opciones.map((op, i) => (
          <input
            key={i}
            type="text"
            className="form-control mb-1"
            placeholder={`Opción ${i + 1}`}
            value={op}
            onChange={(e) => {
              const nuevasOpciones = [...opciones];
              nuevasOpciones[i] = e.target.value;
              setOpciones(nuevasOpciones);
            }}
          />
        ))}
      </div>

      <div className="mb-3">
        <label className="form-label">Opción correcta</label>
        <select
          className="form-select"
          value={correcta}
          onChange={(e) => setCorrecta(Number(e.target.value))}
        >
          {opciones.map((_, i) => (
            <option key={i} value={i}>
              Opción {i + 1}
            </option>
          ))}
        </select>
      </div>

      <button className="btn btn-secondary me-2" onClick={handleAgregarPregunta}>
        Agregar Pregunta
      </button>
      <button className="btn btn-primary" onClick={handlePublicarExamen}>
        Publicar Examen
      </button>

      <hr />
      <h3>Preguntas agregadas:</h3>
      {preguntas.length === 0 && <p>No hay preguntas aún.</p>}
      {preguntas.map((p, idx) => (
        <div key={idx} className="mb-3 border p-3 rounded">
          <strong>{idx + 1}. {p.texto}</strong>
          <ul>
            {p.opciones.map((o, i) => (
              <li key={i}>
                {o} {i === p.correcta && <span className="badge bg-success">Correcta</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ExamCreator;
