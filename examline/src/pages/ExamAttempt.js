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
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

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

  // Handle exam completion - finish attempt and return
  const handleExamCompletion = () => {
    if (!attempt) {
      // Si no hay intento, simplemente navegar de vuelta
      if (onBack) {
        onBack();
      } else {
        navigate('/student-exam');
      }
      return;
    }

    showModal(
      'confirm',
      'Terminar Intento',
      '¿Estás seguro de que quieres terminar el intento? Una vez finalizado no podrás volver a entrar al examen.',
      async () => {
        try {
          setSubmitting(true);
          const token = localStorage.getItem('token');

          const response = await fetch(`${API_BASE_URL}/exam-attempts/${attempt.id}/finish`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            showModal('success', '¡Intento Finalizado!', 'Has terminado el examen exitosamente.', () => {
              closeModal();
              if (onBack) {
                onBack();
              } else {
                navigate('/student-exam');
              }
            });
          } else {
            const errorData = await response.json();
            showModal('error', 'Error', errorData.error || 'Error al finalizar intento');
          }
        } catch (error) {
          console.error('Error finishing attempt:', error);
          showModal('error', 'Error', 'Error de conexión al finalizar intento');
        } finally {
          setSubmitting(false);
        }
      },
      true
    );
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

    const loadExamAndAttempt = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Primero verificar si ya existe un intento
        const checkResponse = await fetch(`${API_BASE_URL}/exam-attempts/check/${examId}?windowId=${windowId || ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (checkData.hasAttempt && checkData.attempt.estado === 'finalizado') {
            setError('Ya has completado este examen');
            setLoading(false);
            return;
          }
        }

        // Cargar examen para validaciones de seguridad
        const examData = await getExamById(examId, windowId);
        setExam(examData);

        // Redireccionar si es un examen de programación
        if (examData.tipo === 'programming') {
          const params = new URLSearchParams();
          if (windowId) params.append('windowId', windowId);
          navigate(`/programming-exam/${examId}?${params.toString()}`);
          return;
        }

        // Crear o obtener intento existente
        const attemptResponse = await fetch(`${API_BASE_URL}/exam-attempts/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            examId: parseInt(examId), 
            examWindowId: windowId ? parseInt(windowId) : null 
          })
        });

        if (attemptResponse.ok) {
          const attemptData = await attemptResponse.json();
          setAttempt(attemptData);
          
          if (attemptData.estado === 'finalizado') {
            setError('Ya has completado este examen');
            return;
          }
        } else {
          const errorData = await attemptResponse.json();
          setError(errorData.error || 'Error creando intento de examen');
        }

        setError(null);
      } catch (err) {
        console.error('Error cargando examen:', err);
        setExam(null);
        
        // Manejar errores específicos de seguridad
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

    loadExamAndAttempt();
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
          <div className="exam-attempt-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-clipboard-list me-3"></i>
                <span className="title-text">{exam.titulo || "Sin título"}</span>
              </h1>
              <div className="header-badges mt-2">
                {!propExamId ? (
                  <span className="badge bg-warning text-dark">
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    <span className="badge-text">EXAMEN EN CURSO</span>
                  </span>
                ) : (
                  <span className="badge bg-info text-white">
                    <i className="fas fa-eye me-1"></i>
                    <span className="badge-text">VISTA PREVIA</span>
                  </span>
                )}
                <span className="badge badge-primary">
                  <i className="fas fa-question-circle me-2"></i>
                  <span className="count-text">{exam.preguntas?.length || 0} preguntas</span>
                </span>
              </div>
            </div>
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
          <div className="exam-attempt-questions-grid">
            {exam.preguntas.map((p, i) => (
              <div key={i} className="exam-attempt-question-card">
                <div className={`exam-card fade-in-up`} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="exam-card-header">
                    <h5 className="exam-title">
                      <span className="badge badge-primary me-3">{i + 1}</span>
                      <span className="question-text">{p.texto || "Sin texto"}</span>
                    </h5>
                  </div>
                  <div className="exam-card-body">
                    <div className="exam-info">
                      <h6 className="mb-3">
                        <i className="fas fa-list-ul me-2"></i>
                        <span className="options-label">Opciones de respuesta:</span>
                      </h6>
                      <div className="exam-options-list">
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
              </div>
            ))}
          </div>

          {/* Botón Terminar intento */}
          <div className="modern-card mt-4">
            <div className="modern-card-body text-center">
              <div className="exam-completion-section">
                <h5 className="completion-title mb-3">
                  <i className="fas fa-flag-checkered me-2"></i>
                  <span className="completion-text">¿Terminaste el examen?</span>
                </h5>
                <p className="completion-description text-muted mb-4">
                  Una vez que finalices el intento, no podrás volver a entrar al examen. Asegúrate de haber respondido todas las preguntas.
                </p>
                <div className="exam-attempt-actions">
                  <button 
                    className="modern-btn modern-btn-primary modern-btn-lg" 
                    onClick={handleExamCompletion}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        <span className="btn-text">Finalizando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-2"></i>
                        <span className="btn-text">Finalizar Intento</span>
                      </>
                    )}
                  </button>
                  {!propExamId && (
                    <button className="modern-btn modern-btn-outline-danger modern-btn-lg" onClick={handleLeaveExam}>
                      <i className="fas fa-times me-2"></i>
                      <span className="btn-text">Salir sin finalizar</span>
                    </button>
                  )}
                  {propExamId && (
                    <button className="modern-btn modern-btn-secondary modern-btn-lg" onClick={handleExamCompletion}>
                      <i className="fas fa-arrow-left me-2"></i>
                      <span className="btn-text">Volver al inicio</span>
                    </button>
                  )}
                </div>
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
        confirmText={modal.type === 'warning' ? 'Salir del Examen' : modal.type === 'confirm' ? 'Finalizar' : 'Aceptar'}
        cancelText={modal.type === 'confirm' ? 'Cancelar' : 'Continuar Examen'}
      />
    </div>
  );
};

export default ExamAttempt;
