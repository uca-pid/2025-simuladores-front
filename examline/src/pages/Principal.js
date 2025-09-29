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
    <div className="container py-5">
      <UserHeader />
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="page-title mb-0">Panel de Profesor</h1>
            <div className="d-flex gap-2">
              <button 
                className="modern-btn modern-btn-secondary" 
                onClick={() => navigate("/exam-windows")}
              >
                <i className="fas fa-calendar-alt"></i>
                Ventanas de Examen
              </button>
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={handleCrearExamen}
              >
                <i className="fas fa-plus"></i>
                Crear Examen
              </button>
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
            <div className="row g-4">
              {(Array.isArray(exams) ? exams : []).map((exam, index) => (
                <div key={exam.id} className="col-lg-6 col-xl-4">
                  <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="exam-card-header">
                      <h5 className="exam-title">{exam.titulo}</h5>
                      <span className="exam-badge">
                        <i className="fas fa-check-circle"></i>
                        Activo
                      </span>
                    </div>
                    <div className="exam-card-body">
                      <div className="exam-info">
                        <div className="exam-info-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Código: {exam.id}</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-question-circle"></i>
                          <span>Preguntas: {exam.preguntas?.length || 0}</span>
                        </div>
                      </div>
                      <button
                        className="modern-btn modern-btn-primary w-100"
                        onClick={() => handleVerExamen(exam.id)}
                      >
                        <i className="fas fa-eye"></i>
                        Ver preguntas
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



