import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import { getExams } from "../services/api";

const Principal = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInstructivo, setShowInstructivo] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getExams();
        setExams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching exams:", err);
        setError(err.message || "Error al cargar los exámenes");
        setExams([]); // Ensure it's always an array
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchExams();
    }
  }, [user]);

  const handleCrearExamen = () => navigate("/exam-creator");
  const handleVerExamen = (examId) => navigate(`/examen/${examId}`);

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      <UserHeader />

      {/* Instructivo colapsable */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="instructivo-header">
            <h3 className="modern-card-title mb-0">
              <i className="fas fa-info-circle me-2"></i>
              <span className="title-text">Instructivo de Uso</span>
            </h3>
            <button
              className="modern-btn modern-btn-secondary modern-btn-sm"
              onClick={() => setShowInstructivo(!showInstructivo)}
            >
              <i className={`fas fa-chevron-${showInstructivo ? 'up' : 'down'}`}></i>
              <span className="btn-text">{showInstructivo ? 'Ocultar' : 'Ver instructivo'}</span>
            </button>
          </div>
        </div>
        {showInstructivo && (
          <div className="modern-card-body">
            <div className="system-explanation">
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-plus-circle text-primary"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">1. Crear Exámenes</h5>
                      <p className="step-description">
                        Haz clic en "Crear Examen" para diseñar evaluaciones. Puedes crear dos tipos: 
                        <strong>Múltiple Choice</strong> (agrega preguntas con 4 opciones y marca la correcta) o 
                        <strong>Programación</strong> (define un problema, selecciona el lenguaje Python/JavaScript y configura intellisense).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-calendar-alt text-success"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">2. Programar Ventanas</h5>
                      <p className="step-description">
                        Ve a "Ventanas de Examen" para crear fechas específicas. Selecciona un examen, define fecha y hora de inicio/fin, establece el cupo máximo de estudiantes y guarda. Los estudiantes podrán inscribirse según disponibilidad.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-user-check text-warning"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">3. Habilitar y Evaluar</h5>
                      <p className="step-description">
                        En cada ventana de examen, revisa las inscripciones y habilita a los estudiantes marcando "Presente". Solo estudiantes habilitados pueden rendir en el horario programado. Consulta resultados una vez finalizados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="profesor-panel-header">
            <div className="panel-title-section">
              <h2 className="page-title mb-0">
                <i className="fas fa-chalkboard-teacher me-2"></i>
                <span className="title-text">Panel de Profesor</span>
              </h2>
            </div>
            <div className="panel-actions-section">
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                <button 
                  className="modern-btn modern-btn-secondary modern-btn-sm" 
                  onClick={() => navigate("/exam-windows")}
                >
                  <i className="fas fa-calendar-alt me-2"></i>
                  <span className="btn-text">Ventanas de Examen</span>
                </button>
                <button 
                  className="modern-btn modern-btn-primary modern-btn-sm" 
                  onClick={handleCrearExamen}
                >
                  <i className="fas fa-plus me-2"></i>
                  <span className="btn-text">Crear Examen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">Exámenes Creados</h3>
        </div>
        <div className="modern-card-body">
          {loading ? (
            <div className="loading-container">
              <div className="modern-spinner"></div>
              <p>Cargando exámenes...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          ) : exams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-file-alt"></i>
              </div>
              <h4 className="empty-title">No hay exámenes creados</h4>
              <p className="empty-subtitle">
                Comienza creando tu primer examen para gestionar evaluaciones
              </p>
              <button 
                className="modern-btn modern-btn-primary"
                onClick={handleCrearExamen}
              >
                <i className="fas fa-plus"></i>
                Crear mi primer examen
              </button>
            </div>
          ) : (
            <div className="exams-grid">
              {(Array.isArray(exams) ? exams : []).map((exam, index) => (
                <div key={exam.id} className="exam-grid-item">
                  <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="exam-card-header">
                      <h5 className="exam-title">{exam.titulo}</h5>
                      <span className="exam-badge">
                        <i className="fas fa-check-circle"></i>
                        <span className="badge-text">Activo</span>
                      </span>
                    </div>
                    <div className="exam-card-body">
                      <div className="exam-info">
                        <div className="exam-info-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Código: {exam.id}</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-tag"></i>
                          <span>Tipo: {exam.tipo === 'programming' ? 'Programación' : 'Múltiple Choice'}</span>
                        </div>
                        {exam.tipo === 'programming' ? (
                          <div className="exam-info-item">
                            <i className="fas fa-code"></i>
                            <span>Lenguaje: {exam.lenguajeProgramacion === 'python' ? 'Python' : 'JavaScript'}</span>
                          </div>
                        ) : (
                          <div className="exam-info-item">
                            <i className="fas fa-question-circle"></i>
                            <span>Preguntas: {exam.preguntas?.length || 0}</span>
                          </div>
                        )}
                      </div>
                      <button
                        className="modern-btn modern-btn-primary w-100 view-exam-btn"
                        onClick={() => handleVerExamen(exam.id)}
                      >
                        <i className="fas fa-eye me-2"></i>
                        <span className="btn-text">
                          {exam.tipo === 'programming' ? 'Ver examen' : 'Ver preguntas'}
                        </span>
                      </button>
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

export default Principal;



