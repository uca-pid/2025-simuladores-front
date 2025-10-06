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

      {/* Contenido del examen */}
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
    </div>
  );
};

export default ExamView;





