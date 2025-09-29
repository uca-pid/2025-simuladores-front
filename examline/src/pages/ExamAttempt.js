import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import { getExamById } from "../services/api";

const ExamAttempt = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const examId = propExamId || routeExamId;

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
  }, [examId]);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }
  if (error || !exam) {
    return (
      <div className="container py-5">
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h4 className="empty-title">Error al cargar examen</h4>
          <p className="empty-subtitle">
            {error || "El examen solicitado no existe o no tienes permisos para acceder."}
          </p>
          {propExamId && (
            <button className="modern-btn modern-btn-secondary" onClick={onBack}>
              <i className="fas fa-arrow-left me-2"></i>
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="page-title mb-0">
              <i className="fas fa-clipboard-list me-3"></i>
              {exam.titulo || "Sin título"}
            </h1>
            <span className="badge badge-primary">
              <i className="fas fa-question-circle me-2"></i>
              {exam.preguntas?.length || 0} preguntas
            </span>
          </div>
        </div>
      </div>

      {!exam.preguntas || exam.preguntas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-question-circle"></i>
          </div>
          <h4 className="empty-title">Sin preguntas</h4>
          <p className="empty-subtitle">
            Este examen no tiene preguntas configuradas aún.
          </p>
          {propExamId && (
            <button className="modern-btn modern-btn-primary" onClick={onBack}>
              <i className="fas fa-arrow-left me-2"></i>
              Volver al inicio
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="row g-4">
            {exam.preguntas.map((p, i) => (
              <div key={i} className="col-lg-6">
                <div className={`exam-card fade-in-up`} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="exam-card-header">
                    <h5 className="exam-title">
                      <span className="badge badge-primary me-3">{i + 1}</span>
                      {p.texto || "Sin texto"}
                    </h5>
                  </div>
                  <div className="exam-card-body">
                    <div className="exam-info">
                      <h6 className="mb-3">
                        <i className="fas fa-list-ul me-2"></i>
                        Opciones de respuesta:
                      </h6>
                      {p.opciones?.map((o, j) => (
                        <div key={j} className="exam-info-item">
                          <i className="fas fa-circle me-2" style={{fontSize: '8px'}}></i>
                          <span>{o || "Opción vacía"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Terminar intento */}
          <div className="modern-card mt-4">
            <div className="modern-card-body text-center">
              <h5 className="mb-3">
                <i className="fas fa-flag-checkered me-2"></i>
                ¿Terminaste de revisar el examen?
              </h5>
              <p className="text-muted mb-4">
                Una vez que termines, podrás volver al panel principal.
              </p>
              <button className="modern-btn modern-btn-primary modern-btn-lg" onClick={onBack}>
                <i className="fas fa-check me-2"></i>
                Terminar intento
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamAttempt;
