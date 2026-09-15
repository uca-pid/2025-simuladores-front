import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import QuestionCreator from "../components/QuestionCreator";
import Modal from "../components/Modal";
import { useModal } from "../hooks";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

const QuestionBank = () => {
  const { modal, showModal, closeModal, setModalProcessing } = useModal();
  const [questions, setQuestions] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ titulo: "", texto: "", opciones: [], correcta: 0, tags: [] });
  const [tagInput, setTagInput] = useState("");
  const [newQuestionTitulo, setNewQuestionTitulo] = useState("");
  const [newQuestionTags, setNewQuestionTags] = useState([]);
  const [newQuestionTagInput, setNewQuestionTagInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

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
  const filteredQuestions = questions.filter((question) => {
    if (!searchFilter.trim()) return true;
    
    const searchTerm = searchFilter.toLowerCase();
    const titleMatch = question.titulo?.toLowerCase().includes(searchTerm);
    const textMatch = question.texto?.toLowerCase().includes(searchTerm);
    const tagsMatch = Array.isArray(question.tags) && 
      question.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    
    return titleMatch || textMatch || tagsMatch;
  });

  const handleAddQuestion = async (questionData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/question-bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...questionData,
          titulo: newQuestionTitulo.trim() || "Sin título",
          tags: newQuestionTags
        }),
      });

      if (!response.ok) {
        throw new Error("Error al guardar pregunta");
      }

      const newQuestion = await response.json();
      setQuestions([newQuestion, ...questions]);
      setSuccessMessage("Pregunta guardada exitosamente");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Limpiar campos adicionales
      setNewQuestionTitulo("");
      setNewQuestionTags([]);
      setNewQuestionTagInput("");
    } catch (err) {
      setError(err.message || "Error al guardar la pregunta");
      console.error(err);
    }
  };

  const handleAddNewQuestionTag = () => {
    if (newQuestionTagInput.trim() && !newQuestionTags.includes(newQuestionTagInput.trim())) {
      setNewQuestionTags([...newQuestionTags, newQuestionTagInput.trim()]);
      setNewQuestionTagInput("");
    }
  };

  const handleRemoveNewQuestionTag = (tagToRemove) => {
    setNewQuestionTags(newQuestionTags.filter(tag => tag !== tagToRemove));
  };

  const handleNewQuestionTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewQuestionTag();
    }
  };

  const handleEditQuestion = (question) => {
    setEditingId(question.id);
    setEditData({
      titulo: question.titulo || "",
      texto: question.texto,
      opciones: [...question.opciones],
      correcta: question.correcta,
      tags: Array.isArray(question.tags) ? [...question.tags] : []
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ titulo: "", texto: "", opciones: [], correcta: 0, tags: [] });
    setTagInput("");
  };

  const handleSaveEdit = async (questionId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/question-bank/${questionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar pregunta");
      }

      const updatedQuestion = await response.json();
      setQuestions(questions.map((q) => (q.id === questionId ? updatedQuestion : q)));
      setSuccessMessage("Pregunta actualizada exitosamente");
      setTimeout(() => setSuccessMessage(""), 3000);
      handleCancelEdit();
    } catch (err) {
      setError("Error al actualizar la pregunta");
      console.error(err);
    }
  };

  const handleAddOption = () => {
    if (editData.opciones.length < 10) {
      setEditData({ ...editData, opciones: [...editData.opciones, ""] });
    }
  };

  const handleRemoveOption = (index) => {
    if (editData.opciones.length > 2) {
      const newOpciones = editData.opciones.filter((_, i) => i !== index);
      setEditData({
        ...editData,
        opciones: newOpciones,
        correcta: editData.correcta >= newOpciones.length ? newOpciones.length - 1 : editData.correcta
      });
    }
  };

  const handleAddEditTag = () => {
    if (tagInput.trim() && !editData.tags.includes(tagInput.trim())) {
      setEditData({ ...editData, tags: [...editData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveEditTag = (tagToRemove) => {
    setEditData({ ...editData, tags: editData.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleEditTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEditTag();
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

      {/* Menú desplegable para crear preguntas */}
      <div className="modern-card mb-4">
        <div className="modern-card-header" style={{ cursor: 'pointer' }} onClick={() => setShowCreator(!showCreator)}>
          <h3 className="modern-card-title d-flex justify-content-between align-items-center">
            <span>
              <i className="fas fa-plus-circle me-2"></i>
              {showCreator ? 'Ocultar' : 'Crear'} Nueva Pregunta
            </span>
            <i className={`fas fa-chevron-${showCreator ? 'up' : 'down'}`}></i>
          </h3>
        </div>
        {showCreator && (
          <div className="modern-card-body">
            {/* Campos adicionales para el banco de preguntas */}
            <div className="mb-4">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-heading text-muted"></i>
                Título de la pregunta (opcional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Pregunta sobre matemáticas básicas"
                value={newQuestionTitulo}
                onChange={(e) => setNewQuestionTitulo(e.target.value)}
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
                <i className="fas fa-tags text-muted"></i>
                Etiquetas (opcional)
              </label>
              <div className="d-flex gap-2 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Agregar etiqueta (presiona Enter)"
                  value={newQuestionTagInput}
                  onChange={(e) => setNewQuestionTagInput(e.target.value)}
                  onKeyPress={handleNewQuestionTagInputKeyPress}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleAddNewQuestionTag}
                  style={{ minWidth: '100px' }}
                >
                  <i className="fas fa-plus me-2"></i>
                  Agregar
                </button>
              </div>
              {newQuestionTags.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {newQuestionTags.map((tag, index) => (
                    <span
                      key={index}
                      className="badge"
                      style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      {tag}
                      <i
                        className="fas fa-times"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveNewQuestionTag(tag)}
                      ></i>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <QuestionCreator onAddQuestion={handleAddQuestion} />
          </div>
        )}
      </div>

      {/* Lista de Preguntas Guardadas */}
      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-list me-2"></i>
            Mis Preguntas Guardadas ({questions.length})
          </h3>
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
              placeholder="Buscar por título, texto o etiquetas..."
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
          {searchFilter && (
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
                Crea tu primera pregunta usando el formulario de arriba
              </p>
            </div>
          ) : filteredQuestions.length === 0 && searchFilter ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-search"></i>
              </div>
              <h4 className="empty-title">No se encontraron preguntas</h4>
              <p className="empty-subtitle">
                No hay preguntas que coincidan con "<strong>{searchFilter}</strong>"
              </p>
              <button
                className="btn btn-outline-primary mt-3"
                onClick={() => setSearchFilter('')}
              >
                <i className="fas fa-times me-2"></i>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="questions-list">
              {filteredQuestions.map((question, index) => (
                <div key={question.id} className="modern-card mb-3" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div className="modern-card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-2">
                          <i className="fas fa-question-circle me-2 text-primary"></i>
                          {question.titulo || `Pregunta #${index + 1}`}
                        </h5>
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: question.tipo === 'true_false' ? '#28a745' : question.tipo === 'fill_in_blank' ? '#ffc107' : question.tipo === 'matching' ? '#9c27b0' : '#007bff',
                            color: 'white',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px'
                          }}
                        >
                          <i className={`fas ${question.tipo === 'true_false' ? 'fa-check-double' : question.tipo === 'fill_in_blank' ? 'fa-fill-drip' : question.tipo === 'matching' ? 'fa-arrows-alt-h' : 'fa-list-ul'} me-1`}></i>
                          {question.tipo === 'true_false' ? 'Verdadero/Falso' : question.tipo === 'fill_in_blank' ? 'Completar' : question.tipo === 'matching' ? 'Unir con Flechas' : 'Opción Múltiple'}
                        </span>
                      </div>
                      {editingId !== question.id ? (
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
                      ) : (
                        <div className="d-flex gap-2">
                          <button
                            className="modern-btn modern-btn-primary"
                            onClick={() => handleSaveEdit(question.id)}
                            title="Guardar cambios"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                          >
                            <i className="fas fa-save me-1"></i>
                            <span className="button-text">Guardar</span>
                          </button>
                          <button
                            className="modern-btn modern-btn-secondary"
                            onClick={handleCancelEdit}
                            title="Cancelar edición"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                          >
                            <i className="fas fa-times me-1"></i>
                            <span className="button-text">Cancelar</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === question.id ? (
                      // Modo de edición
                      <>
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="fas fa-heading text-muted me-2"></i>
                            Título de la pregunta
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editData.titulo}
                            onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                            style={{
                              padding: '0.75rem 1rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            <i className="fas fa-tags text-muted me-2"></i>
                            Etiquetas
                          </label>
                          <div className="d-flex gap-2 mb-2">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Agregar etiqueta (presiona Enter)"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyPress={handleEditTagInputKeyPress}
                              style={{
                                padding: '0.75rem 1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px'
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={handleAddEditTag}
                              style={{ minWidth: '80px' }}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Agregar
                            </button>
                          </div>
                          {editData.tags && editData.tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {editData.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="badge"
                                  style={{
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    borderRadius: '6px'
                                  }}
                                >
                                  {tag}
                                  <i
                                    className="fas fa-times"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleRemoveEditTag(tag)}
                                  ></i>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            <i className="fas fa-comment-alt text-muted me-2"></i>
                            Texto de la pregunta
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editData.texto}
                            onChange={(e) => setEditData({ ...editData, texto: e.target.value })}
                            style={{
                              padding: '0.75rem 1rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            <i className="fas fa-list text-muted me-2"></i>
                            Opciones de respuesta
                          </label>
                          {editData.opciones.map((opcion, i) => (
                            <div key={i} className="d-flex gap-2 mb-2">
                              <input
                                type="text"
                                className="form-control"
                                placeholder={`Opción ${i + 1}`}
                                value={opcion}
                                onChange={(e) => {
                                  const newOpciones = [...editData.opciones];
                                  newOpciones[i] = e.target.value;
                                  setEditData({ ...editData, opciones: newOpciones });
                                }}
                                style={{
                                  padding: '0.6rem 0.8rem',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px'
                                }}
                              />
                              {editData.opciones.length > 2 && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRemoveOption(i)}
                                  style={{ minWidth: '40px' }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          ))}
                          {editData.opciones.length < 10 && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm mt-2"
                              onClick={handleAddOption}
                            >
                              <i className="fas fa-plus me-2"></i>
                              Agregar opción
                            </button>
                          )}
                        </div>

                        <div className="mb-3">
                          <label className="form-label">
                            <i className="fas fa-check-circle text-muted me-2"></i>
                            Respuesta correcta
                          </label>
                          <select
                            className="form-select"
                            value={editData.correcta}
                            onChange={(e) => setEditData({ ...editData, correcta: Number(e.target.value) })}
                            style={{
                              padding: '0.75rem 1rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          >
                            {editData.opciones.map((_, i) => (
                              <option key={i} value={i}>
                                Opción {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      // Modo de visualización
                      <>
                        <p className="mb-3" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                          {question.texto}
                        </p>
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
                          <strong className="text-muted">{question.tipo === 'fill_in_blank' ? 'Respuestas:' : question.tipo === 'matching' ? 'Pares correctos:' : 'Opciones:'}</strong>
                        </div>
                        {question.tipo === 'matching' ? (
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
