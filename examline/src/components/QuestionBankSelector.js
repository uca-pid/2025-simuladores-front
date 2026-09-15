import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

const QuestionBankSelector = ({ show, onClose, onSelectQuestions }) => {
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      loadQuestions();
      setSelectedIds([]);
      setSearchFilter("");
    }
  }, [show]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/question-bank`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al cargar preguntas");
      }

      const data = await response.json();
      setQuestions(data);
    } catch (err) {
      setError(err.message || "Error al cargar las preguntas del banco");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    if (!searchFilter.trim()) return true;
    
    const searchTerm = searchFilter.toLowerCase();
    const titleMatch = question.titulo?.toLowerCase().includes(searchTerm);
    const textMatch = question.texto?.toLowerCase().includes(searchTerm);
    const tagsMatch = Array.isArray(question.tags) && 
      question.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    
    return titleMatch || textMatch || tagsMatch;
  });

  const handleToggleQuestion = (questionId) => {
    if (selectedIds.includes(questionId)) {
      setSelectedIds(selectedIds.filter(id => id !== questionId));
    } else {
      setSelectedIds([...selectedIds, questionId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map(q => q.id));
    }
  };

  const handleConfirm = () => {
    const selectedQuestions = questions
      .filter(q => selectedIds.includes(q.id))
      .map(q => ({
        tipo: q.tipo || "multiple_choice",
        texto: q.texto,
        opciones: q.opciones,
        correcta: q.correcta
      }));
    
    onSelectQuestions(selectedQuestions);
    onClose();
  };

  if (!show) return null;

  return (
    <div 
      className="modal show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content" style={{ maxHeight: '90vh' }}>
          <div className="modal-header" style={{ borderBottom: '2px solid var(--primary-color)' }}>
            <h5 className="modal-title">
              <i className="fas fa-database me-2" style={{ color: 'var(--primary-color)' }}></i>
              Seleccionar Preguntas del Banco
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            ></button>
          </div>
          
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {/* Barra de búsqueda */}
            <div className="mb-4">
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
              
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="text-muted small">
                  <i className="fas fa-info-circle me-1"></i>
                  {searchFilter ? `${filteredQuestions.length} de ${questions.length} preguntas` : `${questions.length} preguntas disponibles`}
                </div>
                {filteredQuestions.length > 0 && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleSelectAll}
                  >
                    <i className={`fas fa-${selectedIds.length === filteredQuestions.length ? 'times' : 'check-double'} me-1`}></i>
                    {selectedIds.length === filteredQuestions.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                )}
              </div>
            </div>

            {/* Lista de preguntas */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize: '3rem', color: '#dee2e6', marginBottom: '1rem' }}>
                  <i className="fas fa-search"></i>
                </div>
                <h5 className="text-muted">
                  {searchFilter ? 'No se encontraron preguntas' : 'No hay preguntas en el banco'}
                </h5>
                {searchFilter && (
                  <button
                    className="btn btn-outline-primary mt-3"
                    onClick={() => setSearchFilter('')}
                  >
                    <i className="fas fa-times me-2"></i>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="row g-3">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="col-12">
                    <div 
                      className={`card h-100 ${selectedIds.includes(question.id) ? 'border-primary' : ''}`}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: selectedIds.includes(question.id) ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onClick={() => handleToggleQuestion(question.id)}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-3">
                          <div className="form-check" style={{ marginTop: '0.25rem' }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedIds.includes(question.id)}
                              onChange={() => handleToggleQuestion(question.id)}
                              style={{ 
                                width: '1.25rem', 
                                height: '1.25rem',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                          
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <h6 className="mb-0">
                                <i className="fas fa-question-circle me-2 text-primary"></i>
                                {question.titulo || "Sin título"}
                              </h6>
                              <span 
                                className="badge"
                                style={{
                                  backgroundColor: question.tipo === 'true_false' ? '#28a745' : question.tipo === 'fill_in_blank' ? '#ffc107' : question.tipo === 'matching' ? '#9c27b0' : '#007bff',
                                  color: 'white',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.7rem',
                                  borderRadius: '4px'
                                }}
                              >
                                <i className={`fas ${question.tipo === 'true_false' ? 'fa-check-double' : question.tipo === 'fill_in_blank' ? 'fa-fill-drip' : question.tipo === 'matching' ? 'fa-arrows-alt-h' : 'fa-list-ul'} me-1`}></i>
                                {question.tipo === 'true_false' ? 'V/F' : question.tipo === 'fill_in_blank' ? 'Completar' : question.tipo === 'matching' ? 'Unir' : 'Múltiple'}
                              </span>
                            </div>
                            
                            <p className="mb-2" style={{ fontSize: '0.95rem' }}>
                              <strong>Pregunta:</strong> {question.texto}
                            </p>
                            
                            {question.tags && Array.isArray(question.tags) && question.tags.length > 0 && (
                              <div className="mb-2">
                                <div className="d-flex flex-wrap gap-1">
                                  {question.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="badge"
                                      style={{
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <i className="fas fa-tag me-1"></i>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-2">
                              <small className="text-muted">
                                <strong>{question.tipo === 'fill_in_blank' ? 'Respuestas correctas (en orden):' : question.tipo === 'matching' ? 'Pares correctos:' : 'Opciones:'}</strong>
                              </small>
                              {question.tipo === 'matching' ? (
                                <div className="ms-3 mt-1" style={{ fontSize: '0.85rem' }}>
                                  {Array.isArray(question.opciones) && question.opciones.slice(0, question.correcta).map((concepto, i) => {
                                    const respuesta = question.opciones[question.correcta + i];
                                    return (
                                      <div key={i} className="d-flex align-items-center gap-2 mb-1">
                                        <span className="badge bg-primary" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                          {i + 1}
                                        </span>
                                        <span style={{ fontSize: '0.85rem' }}>{concepto}</span>
                                        <i className="fas fa-arrow-right text-primary" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="badge bg-success" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                          {String.fromCharCode(65 + i)}
                                        </span>
                                        <span style={{ fontSize: '0.85rem' }}>{respuesta}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : question.tipo === 'fill_in_blank' ? (
                                <ul className="list-unstyled mb-0 ms-3" style={{ fontSize: '0.85rem' }}>
                                  {Array.isArray(question.opciones) && question.opciones.slice(0, question.correcta).map((opcion, i) => (
                                    <li key={i} className="mb-1">
                                      <span className="badge bg-success me-2" style={{ fontSize: '0.7rem' }}>{i + 1}</span>
                                      <span className="text-success fw-bold">{opcion}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <ul className="list-unstyled mb-0 ms-3" style={{ fontSize: '0.85rem' }}>
                                  {Array.isArray(question.opciones) && question.opciones.map((opcion, i) => (
                                    <li key={i} className="mb-1">
                                      {i === question.correcta && (
                                        <i className="fas fa-check-circle text-success me-1"></i>
                                      )}
                                      <span className={i === question.correcta ? "text-success fw-bold" : ""}>
                                        {opcion}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: '#f8f9fa' }}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div>
                <strong className="text-primary">
                  <i className="fas fa-check-circle me-2"></i>
                  {selectedIds.length} pregunta{selectedIds.length !== 1 ? 's' : ''} seleccionada{selectedIds.length !== 1 ? 's' : ''}
                </strong>
              </div>
              <div className="d-flex gap-2">
                <button 
                  type="button" 
                  className="modern-btn modern-btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times me-2"></i>
                  <span className="button-text">Cancelar</span>
                </button>
                <button 
                  type="button" 
                  className="modern-btn modern-btn-primary"
                  onClick={handleConfirm}
                  disabled={selectedIds.length === 0}
                >
                  <i className="fas fa-plus me-2"></i>
                  <span className="button-text">Agregar Seleccionadas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankSelector;
