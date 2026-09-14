import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../contexts/AuthContext";
import { getExams } from "../services/api";

const MisExamenes = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, multiple_choice, programming
  const [searchTerm, setSearchTerm] = useState("");
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
        setExams([]);
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

  // Filtrar exámenes
  const filteredExams = exams.filter((exam) => {
    const matchesType = filterType === "all" || exam.tipo === filterType;
    const matchesSearch = exam.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      {/* Header con título y botones */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-windows-header">
            <div className="header-content-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-folder-open me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Mis Exámenes</span>
              </h1>
              <p className="page-subtitle mb-0">
                Gestiona todos tus exámenes desde aquí
              </p>
            </div>
            <div className="header-actions-section">
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                <button 
                  className="modern-btn modern-btn-primary modern-btn-sm" 
                  onClick={handleCrearExamen}
                >
                  <i className="fas fa-plus me-2"></i>
                  <span className="btn-text">Crear Nuevo Examen</span>
                </button>
                <button
                  className="modern-btn modern-btn-secondary modern-btn-sm"
                  onClick={() => navigate("/principal")}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  <span className="btn-text">Volver a Principal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="modern-card mb-4">
        <div className="modern-card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar examen por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los tipos</option>
                <option value="multiple_choice">Múltiple Choice</option>
                <option value="programming">Programación</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Listado de exámenes */}
      <div className="modern-card">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="modern-card-title mb-0">
              {filteredExams.length} examen{filteredExams.length !== 1 ? "es" : ""} encontrado{filteredExams.length !== 1 ? "s" : ""}
            </h3>
          </div>
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
          ) : filteredExams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-file-alt"></i>
              </div>
              <h4 className="empty-title">
                {searchTerm || filterType !== "all" 
                  ? "No se encontraron exámenes" 
                  : "No hay exámenes creados"}
              </h4>
              <p className="empty-subtitle">
                {searchTerm || filterType !== "all"
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Comienza creando tu primer examen"}
              </p>
              {!searchTerm && filterType === "all" && (
                <button 
                  className="modern-btn modern-btn-primary"
                  onClick={handleCrearExamen}
                >
                  <i className="fas fa-plus me-2"></i>
                  Crear mi primer examen
                </button>
              )}
            </div>
          ) : (
            <div className="exams-grid">
              {filteredExams.map((exam, index) => (
                <div key={exam.id} className="exam-grid-item">
                  <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="exam-card-header">
                      <h5 className="exam-title">{exam.titulo}</h5>
                      <span
  className={`exam-badge ${
    exam.tipo === "programming"
      ? "badge-programming"
      : "badge-multiple"
  }`}
>
  <i
    className={`fas ${
      exam.tipo === "programming" ? "fa-code" : "fa-list-ul"
    } me-1`}
  ></i>
  <span className="badge-text">
    {exam.tipo === "programming"
      ? "Programación"
      : "Múltiple Choice"}
  </span>
</span>

                    </div>
                    <div className="exam-card-body">
                      <div className="exam-info">
                        <div className="exam-info-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Código: {exam.id}</span>
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

export default MisExamenes;
