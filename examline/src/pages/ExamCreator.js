// src/pages/ExamCreator.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";
import { createExam } from "../services/api";

const ExamCreator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const data = await createExam({ titulo, preguntas });
      
      // Volver a la Página Principal
      navigate("/principal");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="page-title mb-1">
                <i className="fas fa-plus-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
                Crear Examen
              </h1>
              <p className="page-subtitle mb-0">Diseña un nuevo examen con preguntas personalizadas</p>
            </div>
            <BackToMainButton />
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message mb-4">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Título del examen */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-edit me-2"></i>
            Información del Examen
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="mb-0">
            <label className="form-label d-flex align-items-center gap-2">
              <i className="fas fa-heading text-muted"></i>
              Título del Examen
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Ingresa el título del examen"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Agregar pregunta */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-question-circle me-2"></i>
            Agregar Pregunta
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="mb-4">
            <label className="form-label d-flex align-items-center gap-2">
              <i className="fas fa-comment-alt text-muted"></i>
              Texto de la pregunta
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Escribe aquí tu pregunta"
              value={textoPregunta}
              onChange={(e) => setTextoPregunta(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div className="mb-4">
            <label className="form-label d-flex align-items-center gap-2">
              <i className="fas fa-list text-muted"></i>
              Opciones de respuesta
            </label>
            {opciones.map((op, i) => (
              <div key={i} className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Opción ${i + 1}`}
                  value={op}
                  onChange={(e) => {
                    const nuevasOpciones = [...opciones];
                    nuevasOpciones[i] = e.target.value;
                    setOpciones(nuevasOpciones);
                  }}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <label className="form-label d-flex align-items-center gap-2">
              <i className="fas fa-check-circle text-muted"></i>
              Respuesta correcta
            </label>
            <select
              className="form-select"
              value={correcta}
              onChange={(e) => setCorrecta(Number(e.target.value))}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              {opciones.map((_, i) => (
                <option key={i} value={i}>
                  Opción {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="d-flex gap-3">
            <button 
              className="modern-btn modern-btn-secondary"
              onClick={handleAgregarPregunta}
            >
              <i className="fas fa-plus me-2"></i>
              Agregar Pregunta
            </button>
            <button 
              className="modern-btn modern-btn-primary"
              onClick={handlePublicarExamen}
            >
              <i className="fas fa-paper-plane me-2"></i>
              Publicar Examen
            </button>
          </div>
        </div>
      </div>

      {/* Lista de preguntas */}
      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-clipboard-list me-2"></i>
            Preguntas Agregadas ({preguntas.length})
          </h3>
        </div>
        <div className="modern-card-body">
          {preguntas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-question-circle"></i>
              </div>
              <h4 className="empty-title">No hay preguntas aún</h4>
              <p className="empty-subtitle">
                Agrega tu primera pregunta usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {preguntas.map((p, idx) => (
                <div key={idx} className="col-12">
                  <div className="exam-card">
                    <div className="exam-card-header">
                      <h5 className="exam-title">
                        Pregunta {idx + 1}
                      </h5>
                      <span className="exam-badge">
                        <i className="fas fa-check-circle"></i>
                        Lista
                      </span>
                    </div>
                    <div className="exam-card-body">
                      <div className="mb-3">
                        <strong>{p.texto}</strong>
                      </div>
                      <div className="exam-info">
                        {p.opciones.map((o, i) => (
                          <div key={i} className="exam-info-item">
                            <i className={i === p.correcta ? "fas fa-check-circle text-success" : "fas fa-circle text-muted"}></i>
                            <span className={i === p.correcta ? "fw-bold text-success" : ""}>{o}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamCreator;
