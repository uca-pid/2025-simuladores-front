import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";
import { getExamById } from "../services/api";

const ExamView = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const examId = propExamId || routeExamId;
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await getExamById(examId);
        setExam(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setExam(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, user?.userId]);

  if (loading) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="modern-card">
          <div className="modern-card-body text-center">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error || "Examen no encontrado."}
            </div>
            {propExamId && (
              <button className="modern-btn modern-btn-secondary mt-3" onClick={onBack}>
                <i className="fas fa-arrow-left me-2"></i>
                Volver
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-view-header">
            <div className="header-content-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-file-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">{exam.titulo || "Sin título"}</span>
              </h1>
              <p className="page-subtitle mb-0">Visualización detallada del examen</p>
            </div>
            <div className="header-button-section">
              {propExamId ? (
                <button className="modern-btn modern-btn-secondary modern-btn-sm" onClick={onBack}>
                  <i className="fas fa-arrow-left me-2"></i>
                  <span className="btn-text">Volver</span>
                </button>
              ) : (
                <BackToMainButton className="modern-btn modern-btn-secondary modern-btn-sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información del tipo de examen */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-info-circle me-2"></i>
            Información del Examen
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="exam-info-item">
                <i className="fas fa-tag text-primary me-2"></i>
                <strong>Tipo:</strong> 
                <span className={`ms-2 badge ${exam.tipo === 'programming' ? 'bg-primary' : 'bg-secondary'}`}>
                  {exam.tipo === 'programming' ? 'Programación' : 'Múltiple Choice'}
                </span>
              </div>
            </div>
            {exam.tipo === 'programming' && (
              <>
                <div className="col-md-6 mb-3">
                  <div className="exam-info-item">
                    <i className="fas fa-code text-success me-2"></i>
                    <strong>Lenguaje:</strong> 
                    <span className="ms-2 badge bg-success">
                      {exam.lenguajeProgramacion === 'python' ? 'Python' : 'JavaScript'}
                    </span>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="exam-info-item">
                    <i className="fas fa-lightbulb text-warning me-2"></i>
                    <strong>Intellisense:</strong> 
                    <span className={`ms-2 badge ${exam.intellisenseHabilitado ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {exam.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenido del examen según el tipo */}
      {exam.tipo === 'programming' ? (
        /* Vista para exámenes de programación */
        <div>
          {/* Enunciado del problema */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-file-alt me-2"></i>
                Enunciado del Problema
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="programming-statement">
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.5rem',
                  border: '1px solid #dee2e6'
                }}>
                  {exam.enunciadoProgramacion || 'No hay enunciado definido'}
                </pre>
              </div>
            </div>
          </div>

          {/* Código inicial */}
          {exam.codigoInicial && (
            <div className="modern-card">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-code me-2"></i>
                  Código Inicial
                </h3>
              </div>
              <div className="modern-card-body">
                <div className="code-preview">
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    margin: 0,
                    padding: '1rem',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    borderRadius: '0.5rem',
                    border: '1px solid #333',
                    overflow: 'auto'
                  }}>
                    {exam.codigoInicial}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Vista para exámenes de múltiple choice */
        <div className="modern-card">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-question-circle me-2"></i>
              Preguntas del Examen ({exam.preguntas?.length || 0})
            </h3>
          </div>
          <div className="modern-card-body">
            {!exam.preguntas || exam.preguntas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
                <h4 className="empty-title">No hay preguntas</h4>
                <p className="empty-subtitle">
                  Este examen no tiene preguntas agregadas aún
                </p>
              </div>
            ) : (
              <div className="exam-questions-grid">
                {exam.preguntas.map((p, i) => (
                  <div key={i} className="exam-question-card-wrapper">
                    <div className="exam-card fade-in-up" style={{animationDelay: `${i * 0.1}s`}}>
                      <div className="exam-card-header">
                        <h5 className="exam-title">
                          Pregunta {i + 1}
                        </h5>
                        <span className="exam-badge">
                          <i className="fas fa-check-circle"></i>
                          <span className="badge-text">{p.opciones?.length || 0} opciones</span>
                        </span>
                      </div>
                      <div className="exam-card-body">
                        <div className="question-text">
                          <strong>{p.texto || "Sin texto"}</strong>
                        </div>
                        <div className="exam-info">
                          {p.opciones?.map((o, j) => (
                            <div key={j} className="exam-info-item option-item">
                              <i className={
                                j === p.correcta 
                                  ? "fas fa-check-circle text-success" 
                                  : "fas fa-circle text-muted"
                              }></i>
                              <span className={`option-text ${j === p.correcta ? "fw-bold text-success" : ""}`}>
                                {o || "Opción vacía"}
                                {j === p.correcta && (
                                  <span className="correct-badge">
                                    Correcta
                                  </span>
                                )}
                              </span>
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
    </div>
  );
};

export default ExamView;





