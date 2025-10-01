import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import { getExamById } from "../services/api";
import Modal from "../components/Modal";

const ExamAttempt = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examId = propExamId || routeExamId;
  const windowId = searchParams.get('windowId');

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  // Modal helper functions
  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  // 🔒 Validación inicial de seguridad para estudiantes
  useEffect(() => {
    // Verificar que estudiantes tengan windowId
    const token = localStorage.getItem('token');
    if (token && !propExamId) { // Solo para acceso directo (no componente embebido)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.rol === 'student' && !windowId) {
          setError('Acceso no autorizado: Debes acceder desde tus inscripciones');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error validando token:', err);
      }
    }
  }, [windowId, propExamId]);

  // Handle back navigation for errors only
  const handleErrorBack = () => {
    if (onBack) {
      // When used as embedded component (from StudentExamPage)
      onBack();
    } else {
      // When accessed directly, go to student main page
      navigate('/student-exam');
    }
  };

  // Handle exam completion - always goes to student main page
  const handleExamCompletion = () => {
    if (onBack) {
      // When used as embedded component (from StudentExamPage)
      onBack();
    } else {
      // When accessed directly, go to student main page
      navigate('/student-exam');
    }
  };

  // Handle navigation away from exam with confirmation
  const handleLeaveExam = () => {
    showModal(
      'warning',
      'Salir del Examen',
      '¿Estás seguro de que quieres salir del examen? Se perderá todo tu progreso y no podrás volver a intentarlo.',
      () => {
        closeModal();
        if (onBack) {
          onBack();
        } else {
          navigate('/student-exam');
        }
      },
      true
    );
  };

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        
        // 🔒 Pasar windowId para validación de seguridad
        const data = await getExamById(examId, windowId);
        setExam(data);
        setError(null);
      } catch (err) {
        console.error('Error obteniendo examen:', err);
        setExam(null);
        
        // 🔒 Manejar errores específicos de seguridad
        if (err.code === 'WINDOW_ID_REQUIRED') {
          setError('Acceso no autorizado: Se requiere inscripción válida');
        } else if (err.code === 'NOT_ENROLLED') {
          setError('No estás inscrito en esta ventana de examen');
        } else if (err.code === 'NOT_ENABLED') {
          setError('No estás habilitado para rendir este examen');
        } else if (err.code === 'EXAM_NOT_AVAILABLE') {
          setError('El examen no está disponible en este momento');
        } else if (err.code === 'EXAM_MISMATCH') {
          setError('La ventana no corresponde a este examen');
        } else {
          setError(err.message || 'Error de acceso al examen');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, windowId]);

  // Add page leave confirmation for exam security
  useEffect(() => {
    if (!exam || error || propExamId) return; // Don't add for embedded mode or errors

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '¿Estás seguro de que quieres salir del examen? Se perderá tu progreso.';
      return e.returnValue;
    };

    const handlePopState = (e) => {
      e.preventDefault();
      // Show modal for back button press
      showModal(
        'warning',
        'Salir del Examen',
        '¿Estás seguro de que quieres salir del examen? Se perderá todo tu progreso.',
        () => {
          closeModal();
          // Allow navigation by going back
          window.history.back();
        },
        true
      );
      
      // Prevent the navigation initially
      window.history.pushState(null, '', window.location.pathname);
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state to handle back button
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [exam, error, propExamId]);

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
          <button className="modern-btn modern-btn-secondary" onClick={handleErrorBack}>
            <i className="fas fa-arrow-left me-2"></i>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <h1 className="page-title mb-0">
                <i className="fas fa-clipboard-list me-3"></i>
                {exam.titulo || "Sin título"}
              </h1>
              {!propExamId ? (
                <span className="badge bg-warning text-dark ms-3">
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  EXAMEN EN CURSO
                </span>
              ) : (
                <span className="badge bg-info text-white ms-3">
                  <i className="fas fa-eye me-1"></i>
                  VISTA PREVIA
                </span>
              )}
            </div>
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
          <button className="modern-btn modern-btn-primary" onClick={handleErrorBack}>
            <i className="fas fa-arrow-left me-2"></i>
            Volver al inicio
          </button>
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
                Una vez que termines, podrás volver al panel principal. Si necesitas salir antes de completar el examen, usa el botón "Salir sin terminar".
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <button className="modern-btn modern-btn-primary modern-btn-lg" onClick={handleExamCompletion}>
                  <i className="fas fa-check me-2"></i>
                  Terminar intento
                </button>
                {!propExamId && (
                  <button className="modern-btn modern-btn-outline-danger modern-btn-lg" onClick={handleLeaveExam}>
                    <i className="fas fa-times me-2"></i>
                    Salir sin terminar
                  </button>
                )}
                {propExamId && (
                  <button className="modern-btn modern-btn-secondary modern-btn-lg" onClick={handleExamCompletion}>
                    <i className="fas fa-arrow-left me-2"></i>
                    Volver al inicio
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.type === 'warning' ? 'Salir del Examen' : 'Aceptar'}
        cancelText="Continuar Examen"
      />
    </div>
  );
};

export default ExamAttempt;
