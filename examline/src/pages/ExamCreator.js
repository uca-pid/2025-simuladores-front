// src/pages/ExamCreator.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { createExam } from "../services/api";

const ExamCreator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [tipoExamen, setTipoExamen] = useState("multiple_choice"); // "multiple_choice" | "programming"
  
  // Estados para exámenes de multiple choice
  const [preguntas, setPreguntas] = useState([]);
  const [textoPregunta, setTextoPregunta] = useState("");
  const [opciones, setOpciones] = useState(["", ""]);
  const [correcta, setCorrecta] = useState(0);
  
  // Estados para exámenes de programación
  const [lenguajeProgramacion, setLenguajeProgramacion] = useState("python");
  const [intellisenseHabilitado, setIntellisenseHabilitado] = useState(false);
  const [enunciadoProgramacion, setEnunciadoProgramacion] = useState("");
  const [codigoInicial, setCodigoInicial] = useState("");
  const [testCases, setTestCases] = useState([
    { description: "", input: "", expectedOutput: "", puntos: 25 }
  ]);
  
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  // Función para mostrar modal
  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  // Función para cerrar modal
  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  // Agregar opción nueva
  const handleAgregarOpcion = () => {
    if (opciones.length < 10) { // Máximo 10 opciones
      setOpciones([...opciones, ""]);
    }
  };

  // Eliminar opción
  const handleEliminarOpcion = (index) => {
    if (opciones.length > 2) { // Mínimo 2 opciones
      const nuevasOpciones = opciones.filter((_, i) => i !== index);
      setOpciones(nuevasOpciones);
      // Ajustar la respuesta correcta si es necesario
      if (correcta >= nuevasOpciones.length) {
        setCorrecta(nuevasOpciones.length - 1);
      }
    }
  };

  // Agregar pregunta al listado
  const handleAgregarPregunta = () => {
    if (!textoPregunta.trim()) {
      setError("Ingrese el texto de la pregunta");
      return;
    }
    
    if (opciones.length < 2) {
      setError("La pregunta debe tener al menos 2 opciones");
      return;
    }
    
    if (opciones.some(o => !o.trim())) {
      setError("Complete todas las opciones antes de agregar la pregunta");
      return;
    }

    setPreguntas([
      ...preguntas,
      { texto: textoPregunta, opciones: [...opciones], correcta }
    ]);

    // Limpiar inputs
    setTextoPregunta("");
    setOpciones(["", ""]);
    setCorrecta(0);
    setError("");
  };

  // Funciones para manejar test cases
  const handleAddTestCase = () => {
    setTestCases([...testCases, { description: "", input: "", expectedOutput: "", puntos: 25 }]);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...testCases];
    updatedTestCases[index][field] = value;
    setTestCases(updatedTestCases);
  };

  // Función que realmente publica el examen
  const proceedWithPublishing = async () => {
    setIsPublishing(true);
    try {
      const examData = {
        titulo,
        tipo: tipoExamen
      };

      // Agregar datos específicos según el tipo
      if (tipoExamen === "multiple_choice") {
        examData.preguntas = preguntas;
      } else if (tipoExamen === "programming") {
        examData.lenguajeProgramacion = lenguajeProgramacion;
        examData.intellisenseHabilitado = intellisenseHabilitado;
        examData.enunciadoProgramacion = enunciadoProgramacion;
        examData.codigoInicial = codigoInicial;
        examData.testCases = testCases;
      }

      const data = await createExam(examData);
      
      // Volver a la Página Principal
      navigate("/principal");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Publicar examen
  const handlePublicarExamen = async () => {
    if (isPublishing) return; // Prevenir múltiples clicks
    
    if (!titulo) {
      setError("Ingrese un título para el examen");
      return;
    }

    // Validaciones específicas según el tipo
    if (tipoExamen === "multiple_choice") {
      if (preguntas.length === 0) {
        showModal(
          'warning',
          '⚠️ No se puede publicar el examen',
          'No se puede publicar un examen sin preguntas. Por favor, agrega al menos una pregunta antes de continuar.',
          null,
          false
        );
        return;
      }
    } else if (tipoExamen === "programming") {
      if (!enunciadoProgramacion.trim()) {
        showModal(
          'warning',
          '⚠️ No se puede publicar el examen',
          'No se puede publicar un examen de programación sin consigna. Por favor, ingresa el enunciado del problema antes de continuar.',
          null,
          false
        );
        return;
      }
    }

    // Si llegamos aquí, todo está bien, publicar directamente
    proceedWithPublishing();
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-creator-header">
            <div className="exam-creator-title-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-plus-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Crear Examen</span>
              </h1>
              <p className="page-subtitle mb-0">Diseña un nuevo examen con preguntas personalizadas</p>
            </div>
            <div className="exam-creator-actions">
              <BackToMainButton />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message mb-4">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}


        {/* Información del examen */}
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-edit me-2"></i>
              Información del Examen
            </h3>
          </div>
          <div className="modern-card-body">
            <div className="mb-3">
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
            
            <div className="mb-0">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-clipboard-list text-muted"></i>
                Tipo de Examen
              </label>
              <select
                className="form-select"
                value={tipoExamen}
                onChange={(e) => setTipoExamen(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="multiple_choice">Múltiple Choice</option>
                <option value="programming">Programación</option>
              </select>
            </div>
          </div>
        </div>

        {/* Configuración de examen de programación */}
        {tipoExamen === "programming" && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-code me-2"></i>
                Configuración de Programación
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    <i className="fas fa-terminal text-muted"></i>
                    Lenguaje de Programación
                  </label>
                  <select
                    className="form-select"
                    value={lenguajeProgramacion}
                    onChange={(e) => setLenguajeProgramacion(e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    <i className="fas fa-lightbulb text-muted"></i>
                    Intellisense y Autocompletado
                  </label>
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="intellisenseSwitch"
                      checked={intellisenseHabilitado}
                      onChange={(e) => setIntellisenseHabilitado(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="intellisenseSwitch">
                      {intellisenseHabilitado ? "Habilitado" : "Deshabilitado"}
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-file-alt text-muted"></i>
                  Enunciado del Problema
                </label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder="Describe detalladamente el problema que deben resolver los estudiantes..."
                  value={enunciadoProgramacion}
                  onChange={(e) => setEnunciadoProgramacion(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              
              <div className="mb-0">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-code text-muted"></i>
                  Código Inicial (Opcional)
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder={`Código inicial para ${lenguajeProgramacion}...`}
                  value={codigoInicial}
                  onChange={(e) => setCodigoInicial(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    backgroundColor: '#f8f9fa'
                  }}
                />
                <small className="form-text text-muted">
                  Código que aparecerá precargado en el editor del estudiante
                </small>
              </div>
            </div>
          </div>
        )}

        {/* Test Cases para exámenes de programación */}
        {tipoExamen === "programming" && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-vial me-2"></i>
                Test Cases (Evaluación Automática)
              </h3>
            </div>
            <div className="modern-card-body">
              <p className="text-muted mb-3">
                <i className="fas fa-info-circle me-2"></i>
                Define los casos de prueba que se ejecutarán automáticamente para calificar el código del estudiante.
                Los test cases NO son visibles para los estudiantes.
              </p>

              {testCases.map((testCase, index) => (
                <div key={index} className="card mb-3" style={{ border: '1px solid var(--border-color)' }}>
                  <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                    <strong>
                      <i className="fas fa-flask me-2"></i>
                      Test Case {index + 1}
                    </strong>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveTestCase(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Descripción del Test</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Suma de números positivos"
                        value={testCase.description}
                        onChange={(e) => handleTestCaseChange(index, 'description', e.target.value)}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Input (una línea por entrada)</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="2&#10;3"
                          value={testCase.input}
                          onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                          style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                        <small className="form-text text-muted">
                          Cada línea será una entrada separada
                        </small>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Output Esperado</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="5"
                          value={testCase.expectedOutput}
                          onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                          style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                        <small className="form-text text-muted">
                          Resultado que debe producir el código
                        </small>
                      </div>
                    </div>

                    <div className="mb-0">
                      <label className="form-label">Puntos (de 100 total)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={testCase.puntos}
                        onChange={(e) => handleTestCaseChange(index, 'puntos', parseInt(e.target.value) || 0)}
                        style={{ maxWidth: '150px' }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleAddTestCase}
              >
                <i className="fas fa-plus me-2"></i>
                Agregar Test Case
              </button>

              <div className="alert alert-info mt-3 mb-0">
                <i className="fas fa-calculator me-2"></i>
                <strong>Puntos totales: {testCases.reduce((sum, tc) => sum + (tc.puntos || 0), 0)}/100</strong>
                <br/>
                <small>Asegúrate de que los puntos sumen 100 para una evaluación balanceada.</small>
              </div>
            </div>
          </div>
        )}

        {/* Agregar pregunta - Solo para múltiple choice */}
        {tipoExamen === "multiple_choice" && (
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
              Opciones de respuesta (mínimo 2, máximo 10)
            </label>
            <div className="exam-creator-options-list">
              {opciones.map((op, i) => (
                <div key={i} className="exam-creator-option-item mb-2 d-flex gap-2">
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
                  {opciones.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleEliminarOpcion(i)}
                      title="Eliminar opción"
                      style={{ minWidth: '40px' }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {opciones.length < 10 && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm mt-2"
                onClick={handleAgregarOpcion}
              >
                <i className="fas fa-plus me-2"></i>
                Agregar opción
              </button>
            )}
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

          <div className="exam-creator-buttons">
            <button 
              className="modern-btn modern-btn-secondary"
              onClick={handleAgregarPregunta}
            >
              <i className="fas fa-plus me-2"></i>
              <span className="button-text">Agregar Pregunta</span>
            </button>
          </div>
        </div>
      </div>
        )}

      {/* Lista de preguntas - Solo para múltiple choice */}
      {tipoExamen === "multiple_choice" && (
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
            <div className="exam-creator-questions-grid">
              {preguntas.map((p, idx) => (
                <div key={idx} className="exam-creator-question-card">
                  <div className="exam-card">
                    <div className="exam-card-header">
                      <h5 className="exam-title">
                        <span className="question-number">Pregunta {idx + 1}</span>
                      </h5>
                      <span className="exam-badge">
                        <i className="fas fa-check-circle"></i>
                        <span className="badge-text">Lista</span>
                      </span>
                    </div>
                    <div className="exam-card-body">
                      <div className="question-text mb-3">
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
      )}

      {/* Botón de publicar examen - al final */}
      <div className="modern-card">
        <div className="modern-card-body">
          <div className="text-center">
            <button 
              className="modern-btn modern-btn-primary"
              onClick={handlePublicarExamen}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span className="button-text">Publicando...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  <span className="button-text">Publicar Examen</span>
                </>
              )}
            </button>
          </div>
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
        confirmText={(modal.type === 'warning') ? 'Confirmar' : 'Entendido'}
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ExamCreator;
