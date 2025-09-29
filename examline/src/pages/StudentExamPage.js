import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ExamView from "./ExamView"; // muestra respuestas correctas
import ExamViewStudent from "./ExamAttempt"; // muestra sin respuestas
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import { getExamHistory } from "../services/api";

const StudentExamPage = () => {
  const [examId, setExamId] = useState("");
  const [submittedId, setSubmittedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [fromHistory, setFromHistory] = useState(false); // saber si viene de historial
  const { user, isLoading } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (examId.trim()) {
      setSubmittedId(examId.trim());
      setFromHistory(false); // ID ingresado directamente
    }
  };

  // 🔹 Traer historial
  useEffect(() => {
    if (!user?.userId) return; // Make sure user and userId exist

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const data = await getExamHistory(user.userId);
        setHistory(Array.isArray(data) ? data : []); // Ensure it's always an array
      } catch (err) {
        console.error("Error al cargar historial:", err);
        setHistoryError(err.message || "Error al cargar el historial");
        setHistory([]); // Set empty array on error
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [user, submittedId]); // refresca después de abrir un examen

  return (
    <div className="container py-5">
      {!submittedId && <UserHeader />}

      {!submittedId && (
        <>
          {/* Header */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="page-title mb-1">
                    <i className="fas fa-user-graduate me-2" style={{ color: 'var(--primary-color)' }}></i>
                    Panel de Estudiante
                  </h1>
                  <p className="page-subtitle mb-0">Accede a tus exámenes y revisa tu historial</p>
                </div>
                <button 
                  className="modern-btn modern-btn-secondary"
                  onClick={() => window.location.href = '/student-inscriptions'}
                >
                  <i className="fas fa-clipboard-list me-2"></i>
                  Mis Inscripciones
                </button>
              </div>
            </div>
          </div>

          {/* Ingresar por código */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-key me-2"></i>
                Acceder por Código
              </h3>
            </div>
            <div className="modern-card-body">
              <form onSubmit={handleSubmit} className="d-flex gap-3">
                <div className="flex-grow-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ingresa el ID del examen"
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <button type="submit" className="modern-btn modern-btn-primary">
                  <i className="fas fa-search me-2"></i>
                  Buscar Examen
                </button>
              </form>
            </div>
          </div>

          {/* Historial */}
          <div className="modern-card">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-history me-2"></i>
                Historial de Exámenes ({history.length})
              </h3>
            </div>
            <div className="modern-card-body">
              {isLoading ? (
                <div className="loading-container">
                  <div className="modern-spinner"></div>
                  <p>Cargando usuario...</p>
                </div>
              ) : historyLoading ? (
                <div className="loading-container">
                  <div className="modern-spinner"></div>
                  <p>Cargando historial...</p>
                </div>
              ) : historyError ? (
                <div className="error-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <h4 className="empty-title">No hay exámenes en el historial</h4>
                  <p className="empty-subtitle">
                    Una vez que tomes un examen, aparecerá aquí para futuras consultas
                  </p>
                </div>
              ) : (
                <div className="row g-3">
                  {history.map((h, index) => (
                    <div key={h.id} className="col-lg-6">
                      <div 
                        className={`exam-card fade-in-up`} 
                        style={{ cursor: "pointer", animationDelay: `${index * 0.1}s` }}
                        onClick={() => {
                          setSubmittedId(h.exam.id);
                          setFromHistory(true);
                        }}
                      >
                        <div className="exam-card-header">
                          <h5 className="exam-title">{h.exam.titulo}</h5>
                          <span className="exam-badge">
                            <i className="fas fa-eye"></i>
                            Visto
                          </span>
                        </div>
                        <div className="exam-card-body">
                          <div className="exam-info">
                            <div className="exam-info-item">
                              <i className="fas fa-calendar"></i>
                              <span>{new Date(h.viewedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="exam-info-item">
                              <i className="fas fa-clock"></i>
                              <span>{new Date(h.viewedAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="exam-info-item">
                              <i className="fas fa-hashtag"></i>
                              <span>ID: {h.exam.id}</span>
                            </div>
                          </div>
                          <button className="modern-btn modern-btn-secondary modern-btn-sm w-100 mt-2">
                            <i className="fas fa-eye me-2"></i>
                            Ver Examen Nuevamente
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {submittedId && (
        <>
          {fromHistory ? (
            <ExamView examId={submittedId} onBack={() => setSubmittedId(null)} />
          ) : (
            <ExamViewStudent examId={submittedId} onBack={() => setSubmittedId(null)} />
          )}
        </>
      )}
    </div>
  );
};

export default StudentExamPage;




