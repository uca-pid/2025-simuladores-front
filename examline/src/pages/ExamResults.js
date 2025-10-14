import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

const ExamResults = ({ attemptId: propAttemptId, onBack }) => {
  const { attemptId: routeAttemptId } = useParams();
  const navigate = useNavigate();
  const attemptId = propAttemptId || routeAttemptId;
  const { user, token } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId || !token) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAttempt(data);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error cargando resultados');
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, token]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/student-exam');
    }
  };



  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="container py-5">
        <div className="modern-card">
          <div className="modern-card-body text-center">
            <div className="exam-results-error-state">
              <div className="empty-icon text-danger mb-3">
                <i className="fas fa-exclamation-triangle fa-3x"></i>
              </div>
              <h4 className="empty-title">{error || 'Resultados no disponibles'}</h4>
              <p className="empty-subtitle mb-4">
                No se pudieron cargar los resultados del examen.
              </p>
              <button className="modern-btn modern-btn-primary" onClick={handleBack}>
                <i className="fas fa-arrow-left me-2"></i>
                <span className="btn-text">Volver al inicio</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-results-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-chart-bar me-3"></i>
                <span className="title-text">Resultados del Examen</span>
              </h1>
            </div>
            <div className="header-actions-section">
              {!propAttemptId && <BackToMainButton />}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Info */}
      <div className="modern-card mb-4">
        <div className="modern-card-body">
          <div className="exam-results-info">
            <h2 className="exam-results-title mb-2">{attempt.exam.titulo}</h2>
            <div className="d-flex align-items-center gap-3 mb-2">
              <span className={`badge ${attempt.exam.tipo === 'programming' ? 'bg-primary' : 'bg-secondary'}`}>
                {attempt.exam.tipo === 'programming' ? 'Examen de Programación' : 'Examen Múltiple Choice'}
              </span>
              {attempt.exam.tipo === 'programming' && (
                <span className="badge bg-info">
                  {attempt.exam.lenguajeProgramacion === 'python' ? '🐍 Python' : '⚡ JavaScript'}
                </span>
              )}
            </div>
            <p className="exam-results-description text-muted mb-0">
              <i className="fas fa-info-circle me-2"></i>
              <span className="description-text">
                {attempt.exam.tipo === 'programming' 
                  ? 'Tu solución al problema de programación'
                  : 'Respuestas correctas del examen'
                }
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Contenido según el tipo de examen */}
      {attempt.exam.tipo === 'programming' ? (
        /* Vista para exámenes de programación */
        <div>
          {/* Enunciado del problema */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-puzzle-piece me-2"></i>
                Enunciado del Problema
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="problem-statement">
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  margin: 0,
                  padding: '1.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.5rem',
                  border: '1px solid #dee2e6'
                }}>
                  {attempt.exam.enunciadoProgramacion || 'No hay enunciado definido'}
                </pre>
              </div>
            </div>
          </div>

          {/* Archivos guardados del estudiante */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-folder-open me-2"></i>
                Archivos de tu Solución
              </h3>
            </div>
            <div className="modern-card-body">
              {attempt.examFiles && attempt.examFiles.length > 0 ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="mb-3" style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(13, 110, 253, 0.1)',
                    border: '1px solid rgba(13, 110, 253, 0.2)',
                    borderRadius: '0.5rem'
                  }}>
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Se encontraron {attempt.examFiles.length} archivo{attempt.examFiles.length !== 1 ? 's' : ''} guardado{attempt.examFiles.length !== 1 ? 's' : ''}
                    </small>
                  </div>
                  
                  {attempt.examFiles.map((file, index) => (
                    <div key={file.id} className="mb-4" style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        background: '#f8f9fa',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        <div>
                          <h5 style={{
                            color: '#2d3748',
                            fontWeight: '600',
                            fontSize: '1.1rem',
                            margin: '0 0 0.25rem 0'
                          }}>
                            <i className="fas fa-file-code me-2"></i>
                            {file.filename}
                          </h5>
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            Última modificación: {new Date(file.updatedAt).toLocaleString()}
                          </small>
                        </div>
                        <div>
                          <span className="badge bg-primary" style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem'
                          }}>
                            Archivo {index + 1}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ padding: 0 }}>
                        {file.content ? (
                          <pre style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                            fontSize: '0.85rem',
                            lineHeight: '1.4',
                            margin: 0,
                            padding: '1.25rem',
                            backgroundColor: '#1e1e1e',
                            color: '#d4d4d4',
                            borderRadius: 0,
                            border: 'none',
                            overflow: 'auto',
                            maxHeight: '400px'
                          }}>
                            {file.content}
                          </pre>
                        ) : (
                          <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            background: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontStyle: 'italic'
                          }}>
                            <i className="fas fa-file-alt text-muted"></i>
                            <span className="text-muted ms-2">Archivo vacío</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : attempt.codigoProgramacion ? (
                /* Fallback al código antiguo si no hay archivos guardados */
                <div className="code-solution">
                  <div className="code-header mb-2">
                    <small className="text-muted">
                      <i className="fas fa-file-code me-1"></i>
                      Código Final (método anterior)
                    </small>
                  </div>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    margin: 0,
                    padding: '1.5rem',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    borderRadius: '0.5rem',
                    border: '1px solid #333',
                    overflow: 'auto',
                    maxHeight: '500px'
                  }}>
                    {attempt.codigoProgramacion}
                  </pre>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-code"></i>
                  </div>
                  <h4 className="empty-title">Sin archivos</h4>
                  <p className="empty-subtitle">
                    No se encontraron archivos guardados para este intento
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="modern-card">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-info-circle me-2"></i>
                Información del Intento
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-calendar me-2 text-primary"></i>
                    <strong>Iniciado:</strong> {new Date(attempt.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-flag-checkered me-2 text-success"></i>
                    <strong>Finalizado:</strong> {attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleString() : 'En progreso'}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-lightbulb me-2 text-warning"></i>
                    <strong>Intellisense:</strong> {attempt.exam.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-check-circle me-2 text-info"></i>
                    <strong>Estado:</strong> 
                    <span className={`ms-2 badge ${attempt.estado === 'finalizado' ? 'bg-success' : 'bg-warning'}`}>
                      {attempt.estado === 'finalizado' ? 'Completado' : 'En progreso'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista para exámenes de múltiple choice */
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-clipboard-list me-2"></i>
              Respuestas Correctas
            </h3>
          </div>
          <div className="modern-card-body">
            {!attempt.exam.preguntas || attempt.exam.preguntas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
                <h4 className="empty-title">No hay preguntas</h4>
                <p className="empty-subtitle">
                  Este examen no tiene preguntas
                </p>
              </div>
            ) : (
              <div className="exam-results-questions-grid">
                {attempt.exam.preguntas.map((question, index) => (
                  <div key={index} className="exam-results-question-card">
                    <div className="exam-card fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="exam-card-header">
                        <h5 className="exam-title">
                          <span className="badge badge-primary me-3">{index + 1}</span>
                          <span className="question-text">{question.texto || "Sin texto"}</span>
                        </h5>
                      </div>
                      <div className="exam-card-body">
                        <div className="exam-info">
                          <h6 className="mb-3">
                            <i className="fas fa-list-ul me-2"></i>
                            <span className="options-label">Opciones de respuesta:</span>
                          </h6>
                          <div className="exam-results-options-list">
                            {question.opciones?.map((option, optionIndex) => {
                              const isCorrect = optionIndex === question.correcta;
                              
                              return (
                                <div key={optionIndex} className={`exam-info-item ${isCorrect ? 'bg-success bg-opacity-10 border-success rounded p-2 mb-2' : ''}`}>
                                  <i className={isCorrect ? "fas fa-check-circle me-2 text-success" : "fas fa-circle me-2 text-muted"} 
                                     style={{fontSize: isCorrect ? '14px' : '8px'}}></i>
                                  <span className={isCorrect ? "fw-bold text-success" : ""}>
                                    {option || "Opción vacía"}
                                    {isCorrect && (
                                      <span className="ms-2 badge bg-success text-white correct-badge">
                                        <span className="badge-text">Respuesta Correcta</span>
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
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

    </div>
  );
};

export default ExamResults;