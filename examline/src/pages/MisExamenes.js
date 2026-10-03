import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../contexts/AuthContext";
import { getExams, deleteExam } from "../services/api";
import { useModal } from "../hooks";
import Modal from "../components/Modal";

const MisExamenes = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modal, showModal, closeModal } = useModal();
  const [deletingId, setDeletingId] = useState(null);

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
  const handleEditarExamen = (examId) => navigate(`/exam-creator?editId=${examId}`);

  const handleEliminarExamen = (exam) => {
    showModal(
      'confirm',
      'Eliminar Examen',
      `¿Estás seguro de que deseas eliminar el examen "${exam.titulo}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          setDeletingId(exam.id);
          await deleteExam(exam.id);
          setExams((prev) => prev.filter((e) => e.id !== exam.id));
          closeModal();
        } catch (err) {
          console.error("Error deleting exam:", err);
          showModal('error', 'Error', err.message || 'Error al eliminar el examen', null, false);
        } finally {
          setDeletingId(null);
        }
      },
      true,
      'Eliminar'
    );
  };

  // Filtrar exámenes
  const filteredExams = exams.filter((exam) =>
    exam.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Búsqueda */}
      <div className="modern-card mb-4">
        <div className="modern-card-body">
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
                {searchTerm
                  ? "No se encontraron exámenes"
                  : "No hay exámenes creados"}
              </h4>
              <p className="empty-subtitle">
                {searchTerm
                  ? "Intenta ajustar la búsqueda"
                  : "Comienza creando tu primer examen"}
              </p>
              {!searchTerm && (
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
                      {exam.partes?.length > 1 ? (
                        <span className="exam-badge badge-multiple">
                          <i className="fas fa-layer-group me-1"></i>
                          <span className="badge-text">Multiparte ({exam.partes.length})</span>
                        </span>
                      ) : (
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
                      )}

                    </div>
                    <div className="exam-card-body">
                      <div className="exam-info">
                        <div className="exam-info-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Código: {exam.id}</span>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="modern-btn modern-btn-primary modern-btn-sm flex-fill view-exam-btn"
                          onClick={() => handleVerExamen(exam.id)}
                        >
                          <i className="fas fa-eye me-2"></i>
                          <span className="btn-text">Ver</span>
                        </button>
                        <button
                          className="modern-btn modern-btn-secondary modern-btn-sm flex-fill"
                          onClick={() => handleEditarExamen(exam.id)}
                        >
                          <i className="fas fa-edit me-2"></i>
                          <span className="btn-text">Editar</span>
                        </button>
                        <button
                          className="modern-btn modern-btn-danger modern-btn-sm flex-fill"
                          onClick={() => handleEliminarExamen(exam)}
                          disabled={deletingId === exam.id}
                        >
                          <i className="fas fa-trash me-2"></i>
                          <span className="btn-text">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.confirmText || ((modal.type === 'warning') ? 'Confirmar' : 'Entendido')}
        cancelText="Cancelar"
      />
    </div>
  );
};

export default MisExamenes;
