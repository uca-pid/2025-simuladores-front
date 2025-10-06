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
            <p className="exam-results-description text-muted mb-0">
              <i className="fas fa-info-circle me-2"></i>
              <span className="description-text">Respuestas correctas del examen</span>
            </p>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-clipboard-list me-2"></i>
            Respuestas Correctas
          </h3>
        </div>
        <div className="modern-card-body">
          {attempt.exam.preguntas.length === 0 ? (
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


    </div>
  );
};

export default ExamResults;