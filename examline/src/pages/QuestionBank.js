import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import QuestionCreator from "../components/QuestionCreator";
import TagInput from "../components/TagInput";
import { autoTitulo, displayTitulo } from "../utils/questionTitle";
import Modal from "../components/Modal";
import { useModal } from "../hooks";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

const TIPO_META = {
  multiple_choice: { label: "Opción Múltiple", color: "#007bff", icon: "fa-list-ul" },
  multiple_response: { label: "Selección Múltiple", color: "#6610f2", icon: "fa-check-square" },
  true_false: { label: "Verdadero/Falso", color: "#28a745", icon: "fa-check-double" },
  fill_in_blank: { label: "Completar", color: "#ffc107", icon: "fa-fill-drip" },
  matching: { label: "Emparejar", color: "#9c27b0", icon: "fa-arrows-alt-h" },
  short_answer: { label: "Respuesta Corta", color: "#17a2b8", icon: "fa-font" },
  numeric: { label: "Numérica", color: "#fd7e14", icon: "fa-calculator" },
  essay: { label: "Desarrollo", color: "#6c757d", icon: "fa-pen-fancy" },
  file_upload: { label: "Adjuntar Archivo", color: "#20c997", icon: "fa-paperclip" },
};

const DIFICULTAD_META = {
  facil: { label: "Fácil", color: "#28a745" },
  media: { label: "Media", color: "#fd7e14" },
  dificil: { label: "Difícil", color: "#dc3545" },
};

const QuestionBank = () => {
  const { modal, showModal, closeModal, setModalProcessing } = useModal();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formTags, setFormTags] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Cargar preguntas del banco al montar el componente
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(""); // Limpiar errores previos
      const token = localStorage.getItem("token");
      
      console.log("🔍 Cargando preguntas desde:", `${API_BASE_URL}/question-bank`);
      console.log("🔑 Token:", token ? "presente" : "ausente");
      
      const response = await fetch(`${API_BASE_URL}/question-bank`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📡 Respuesta del servidor:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Error del servidor:", errorData);
        throw new Error(errorData.error || "Error al cargar preguntas");
      }

      const data = await response.json();
      console.log("✅ Preguntas cargadas:", data);
      setQuestions(data);
    } catch (err) {
      const errorMessage = err.message || "Error al cargar las preguntas del banco";
      setError(errorMessage);
      console.error("❌ Error completo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar preguntas basándose en el texto o tags
  const allTags = [...new Set(questions.flatMap((q) => (Array.isArray(q.tags) ? q.tags : [])))].sort((a, b) =>
    a.localeCompare(b)
  );

  const filteredQuestions = questions.filter((question) => {
    if (tagFilter && !(Array.isArray(question.tags) && question.tags.includes(tagFilter))) return false;
    if (!searchFilter.trim()) return true;
    
    const searchTerm = searchFilter.toLowerCase();
    const titleMatch = question.titulo?.toLowerCase().includes(searchTerm);
    const textMatch = question.texto?.toLowerCase().includes(searchTerm);
    const tagsMatch = Array.isArray(question.tags) && 
      question.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    
    return titleMatch || textMatch || tagsMatch;
  });

  const handleOpenNewQuestion = () => {
    setEditingQuestion(null);
    setFormTags([]);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setFormTags(Array.isArray(question.tags) ? [...question.tags] : []);
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setEditingQuestion(null);
    setFormTags([]);
  };

  // El título se genera del texto. Al editar se conserva el que ya tenía,
  // salvo que fuera el generado automáticamente (en ese caso sigue al texto).
  const resolveTitulo = (texto) => {
    if (!editingQuestion) return autoTitulo(texto);
    const actual = editingQuestion.titulo;
    if (!actual || actual === autoTitulo(editingQuestion.texto) || actual === "Sin título") {
      return autoTitulo(texto);
    }
    return actual;
  };

  const handleSaveQuestion = async (questionData) => {
    const isEditing = editingQuestion != null;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/question-bank${isEditing ? `/${editingQuestion.id}` : ""}`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...questionData,
            titulo: resolveTitulo(questionData.texto),
            tags: formTags,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(isEditing ? "Error al actualizar pregunta" : "Error al guardar pregunta");
      }

      const saved = await response.json();
      setQuestions(
        isEditing
          ? questions.map((q) => (q.id === saved.id ? saved : q))
          : [saved, ...questions]
      );
      setSuccessMessage(isEditing ? "Pregunta actualizada exitosamente" : "Pregunta guardada exitosamente");
      setTimeout(() => setSuccessMessage(""), 3000);
      handleCloseQuestionModal();
    } catch (err) {
      setError(err.message || "Error al guardar la pregunta");
      console.error(err);
      handleCloseQuestionModal();
    }
  };

  const handleDeleteQuestion = (questionId) => {
    showModal(
      "error",
      "Eliminar Pregunta",
      "¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.",
      async () => {
        try {
          // Activar el estado de procesamiento
          setModalProcessing(true);
          
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE_URL}/question-bank/${questionId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error("Error al eliminar pregunta");
          }

          setQuestions(questions.filter((q) => q.id !== questionId));
          setSuccessMessage("Pregunta eliminada exitosamente");
          setTimeout(() => setSuccessMessage(""), 3000);
          closeModal();
        } catch (err) {
          setError("Error al eliminar la pregunta");
          console.error(err);
          closeModal();
        }
      },
      true
    );
  };

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-creator-header">
            <div className="exam-creator-title-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-database me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Banco de Preguntas</span>
              </h1>
              <p className="page-subtitle mb-0">Gestiona y reutiliza preguntas para tus exámenes</p>
            </div>
            <div className="exam-creator-actions">
              <BackToMainButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage("")}
          ></button>
        </div>
      )}

      {/* Lista de Preguntas Guardadas */}
      <div className="modern-card">
        <div className="modern-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h3 className="modern-card-title mb-0">
            <i className="fas fa-list me-2"></i>
            Mis Preguntas Guardadas ({questions.length})
          </h3>
          <button
            type="button"
            className="modern-btn modern-btn-primary modern-btn-sm"
            onClick={handleOpenNewQuestion}
          >
            <i className="fas fa-plus me-2"></i>
            <span className="button-text">Agregar Pregunta</span>
          </button>
        </div>
        
        {/* Barra de búsqueda */}
        <div className="modern-card-body" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div className="input-group">
            <span className="input-group-text" style={{ backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
              <i className="fas fa-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por texto o etiquetas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderLeft: 'none',
                fontSize: '1rem'
              }}
            />
            {searchFilter && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSearchFilter('')}
                title="Limpiar búsqueda"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
              <span className="text-muted small">
                <i className="fas fa-tags me-1"></i>
                Etiquetas:
              </span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`btn btn-sm ${tagFilter === tag ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  style={{ borderRadius: '999px', padding: '0.15rem 0.7rem', fontSize: '0.8rem' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {(searchFilter || tagFilter) && (
            <div className="mt-2 text-muted small">
              <i className="fas fa-info-circle me-1"></i>
              Mostrando {filteredQuestions.length} de {questions.length} preguntas
            </div>
          )}
        </div>
        <div className="modern-card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-database"></i>
              </div>
              <h4 className="empty-title">No hay preguntas guardadas</h4>
              <p className="empty-subtitle">
                Crea tu primera pregunta con el botón "Agregar Pregunta"
              </p>
            </div>
          ) : filteredQuestions.length === 0 && (searchFilter || tagFilter) ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-search"></i>
              </div>
              <h4 className="empty-title">No se encontraron preguntas</h4>
              <p className="empty-subtitle">
                No hay preguntas que coincidan con los filtros aplicados
              </p>
              <button
                className="btn btn-outline-primary mt-3"
                onClick={() => { setSearchFilter(''); setTagFilter(''); }}
              >
                <i className="fas fa-times me-2"></i>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="questions-list">
              {filteredQuestions.map((question) => (
                <div key={question.id} className="modern-card mb-3" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div className="modern-card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-2">
                          <i className="fas fa-question-circle me-2 text-primary"></i>
                          {displayTitulo(question)}
                        </h5>
                        <span
                          className="badge me-2"
                          style={{
                            backgroundColor: (TIPO_META[question.tipo] || TIPO_META.multiple_choice).color,
                            color: 'white',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px'
                          }}
                        >
                          <i className={`fas ${(TIPO_META[question.tipo] || TIPO_META.multiple_choice).icon} me-1`}></i>
                          {(TIPO_META[question.tipo] || TIPO_META.multiple_choice).label}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: (DIFICULTAD_META[question.dificultad] || DIFICULTAD_META.media).color,
                            color: 'white',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px'
                          }}
                        >
                          <i className="fas fa-signal me-1"></i>
                          {(DIFICULTAD_META[question.dificultad] || DIFICULTAD_META.media).label}
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleEditQuestion(question)}
                          title="Editar pregunta"
                        >
                          <i className="fas fa-edit me-1"></i>
                          Editar
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          title="Eliminar pregunta"
                        >
                          <i className="fas fa-trash me-1"></i>
                          Eliminar
                        </button>
                      </div>
                    </div>

                      <p className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                        {question.texto}
                      </p>
                      {question.imagenUrl && (
                        <img
                          src={question.imagenUrl}
                          alt="Imagen de la pregunta"
                          className="mb-3"
                          style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                      )}
                      {question.tags && Array.isArray(question.tags) && question.tags.length > 0 && (
                        <div className="mb-3">
                          <strong className="text-muted me-2">Etiquetas:</strong>
                          <div className="d-flex flex-wrap gap-2 mt-1">
                            {question.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="badge"
                                style={{
                                  backgroundColor: 'var(--primary-color)',
                                  color: 'white',
                                  padding: '0.4rem 0.65rem',
                                  fontSize: '0.8rem',
                                  borderRadius: '6px'
                                }}
                              >
                                <i className="fas fa-tag me-1"></i>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mb-2">
                        <strong className="text-muted">
                          {question.tipo === 'fill_in_blank' ? 'Respuestas:'
                            : question.tipo === 'matching' ? 'Pares correctos:'
                            : question.tipo === 'short_answer' ? 'Respuestas aceptadas:'
                            : question.tipo === 'multiple_response' ? 'Opciones (correctas marcadas):'
                            : question.tipo === 'numeric' ? 'Valor correcto:'
                            : question.tipo === 'essay' || question.tipo === 'file_upload' ? 'Corrección:'
                            : 'Opciones:'}
                        </strong>
                      </div>
                      {question.tipo === 'short_answer' ? (
                        <ul className="list-group mb-3">
                          {Array.isArray(question.opciones) && question.opciones.map((opcion, i) => (
                            <li key={i} className="list-group-item list-group-item-success">
                              <i className="fas fa-check-circle me-2 text-success"></i>
                              {opcion}
                            </li>
                          ))}
                        </ul>
                      ) : question.tipo === 'multiple_response' ? (
                        <ul className="list-group mb-3">
                          {Array.isArray(question.opciones) && question.opciones.map((opcion, i) => {
                            const esCorrecta = Array.isArray(question.correctas) && question.correctas.includes(i);
                            return (
                              <li key={i} className={`list-group-item ${esCorrecta ? 'list-group-item-success' : ''}`}>
                                {esCorrecta && <i className="fas fa-check-circle me-2 text-success"></i>}
                                {opcion}
                              </li>
                            );
                          })}
                        </ul>
                      ) : question.tipo === 'numeric' ? (
                        <div className="mb-3">
                          <span className="badge bg-success me-2" style={{ fontSize: '0.85rem' }}>
                            {question.opciones?.[0]}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                            ± {question.opciones?.[1] || 0} de tolerancia
                          </span>
                        </div>
                      ) : question.tipo === 'essay' || question.tipo === 'file_upload' ? (
                        <div className="alert alert-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                          <i className="fas fa-user-check me-2"></i>
                          Se corrige manualmente al revisar el examen.
                        </div>
                      ) : question.tipo === 'matching' ? (
                        <div className="list-group mb-3">
                          {Array.isArray(question.opciones) && question.opciones.slice(0, question.correcta).map((concepto, i) => {
                            const respuesta = question.opciones[question.correcta + i];
                            return (
                              <div key={i} className="list-group-item d-flex align-items-center gap-2">
                                <span className="badge bg-primary" style={{ fontSize: '0.85rem', minWidth: '30px' }}>
                                  {i + 1}
                                </span>
                                <span style={{ fontSize: '0.9rem' }}>{concepto}</span>
                                <i className="fas fa-arrow-right text-primary mx-1"></i>
                                <span className="badge bg-success" style={{ fontSize: '0.85rem', minWidth: '30px' }}>
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span style={{ fontSize: '0.9rem' }}>{respuesta}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : question.tipo === 'fill_in_blank' ? (
                        <>
                          <div className="mb-2">
                            <small className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i>Respuestas correctas (en orden):</small>
                          </div>
                          <ul className="list-group mb-2">
                            {Array.isArray(question.opciones) && question.opciones.slice(0, question.correcta).map((opcion, i) => (
                              <li key={i} className="list-group-item list-group-item-success">
                                <span className="badge bg-success me-2">{i + 1}</span>
                                {opcion}
                              </li>
                            ))}
                          </ul>
                          {question.opciones.length > question.correcta && (
                            <>
                              <div className="mb-2">
                                <small className="text-danger fw-bold"><i className="fas fa-times-circle me-1"></i>Distractores:</small>
                              </div>
                              <ul className="list-group mb-3">
                                {question.opciones.slice(question.correcta).map((opcion, i) => (
                                  <li key={i} className="list-group-item">
                                    <i className="fas fa-times text-danger me-2"></i>
                                    {opcion}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </>
                      ) : (
                        <ul className="list-group mb-3">
                          {Array.isArray(question.opciones) ? (
                            question.opciones.map((opcion, i) => (
                              <li
                                key={i}
                                className={`list-group-item ${
                                  i === question.correcta ? 'list-group-item-success' : ''
                                }`}
                              >
                                {i === question.correcta && (
                                  <i className="fas fa-check-circle me-2 text-success"></i>
                                )}
                                <strong>Opción {i + 1}:</strong> {opcion}
                              </li>
                            ))
                          ) : (
                            <li className="list-group-item">Error: formato de opciones inválido</li>
                          )}
                        </ul>
                      )}
                      <div className="text-muted small">
                        <i className="fas fa-calendar me-2"></i>
                        Creada: {new Date(question.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showQuestionModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseQuestionModal}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'transparent' }}>
              <div className="modal-body p-0">
                <div className="modern-card mb-4">
                  <div className="modern-card-header">
                    <h3 className="modern-card-title">
                      <i className="fas fa-database me-2"></i>
                      Datos del banco
                    </h3>
                  </div>
                  <div className="modern-card-body">
                    <div>
                      <label className="form-label d-flex align-items-center gap-2">
                        <i className="fas fa-tags text-muted"></i>
                        Etiquetas
                      </label>
                      <TagInput tags={formTags} onChange={setFormTags} suggestions={allTags} />
                    </div>
                  </div>
                </div>
                <QuestionCreator
                  editingQuestion={editingQuestion}
                  onSave={handleSaveQuestion}
                  onCancel={handleCloseQuestionModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        showCancel={modal.showCancel}
        isProcessing={modal.isProcessing}
      />
    </div>
  );
};

export default QuestionBank;
