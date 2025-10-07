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
  const [isInSEB, setIsInSEB] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

  // Detectar si estamos en SEB
  useEffect(() => {
    const checkSEB = () => {
      const userAgent = navigator.userAgent || '';
      return userAgent.includes('SEB') || 
             userAgent.includes('SafeExamBrowser') || 
             window.SafeExamBrowser !== undefined;
    };
    
    const inSEB = checkSEB();
    setIsInSEB(inSEB);
    console.log('Ejecutando en SEB:', inSEB);
  }, []);

  // Modal helper functions
  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  // 🚪 Función para cerrar SEB
const closeSEB = () => {
  try {
    console.log('Intentando cerrar SEB - Método 1: seb://quit');
    window.location.href = 'seb://quit';
    
    // Método alternativo después de 500ms
    setTimeout(() => {
      console.log('Intentando cerrar SEB - Método 2: sebs://quit');
      window.location.href = 'sebs://quit';
    }, 500);
    
    // Método 3: Usar el API de SEB si está disponible
    setTimeout(() => {
      if (window.SafeExamBrowser && window.SafeExamBrowser.security) {
        console.log('Intentando cerrar SEB - Método 3: SafeExamBrowser API');
        window.SafeExamBrowser.security.closeApplication();
      }
    }, 1000);
    
    // Método 4: Ctrl+Q programático
    setTimeout(() => {
      console.log('Intentando cerrar SEB - Método 4: KeyboardEvent');
      const event = new KeyboardEvent('keydown', {
        key: 'q',
        code: 'KeyQ',
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(event);
    }, 1500);
    
  } catch (error) {
    console.log('Error al cerrar SEB:', error);
  }
};

  // 🔒 Validación inicial de seguridad para estudiantes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    
    if (tokenFromUrl) {
      console.log('Token recibido desde URL, guardando en localStorage');
      localStorage.setItem('token', tokenFromUrl);
    }

    const token = localStorage.getItem('token');
    if (token && !propExamId) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.rol === 'student' && !windowId && !tokenFromUrl) {
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
    if (isInSEB) {
      closeSEB();
      setTimeout(() => {
        if (onBack) {
          onBack();
        } else {
          navigate('/student-exam');
        }
      }, 1000);
    } else {
      if (onBack) {
        onBack();
      } else {
        navigate('/student-exam');
      }
    }
  };

  // Handle exam completion - finish attempt and return
  const handleExamCompletion = () => {
    if (!attempt) {
      if (isInSEB) {
        closeSEB();
        setTimeout(() => {
          if (onBack) {
            onBack();
          } else {
            navigate('/student-exam');
          }
        }, 1000);
      } else {
        if (onBack) {
          onBack();
        } else {
          navigate('/student-exam');
        }
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
            const successMessage = isInSEB 
              ? 'Has terminado el examen exitosamente. SEB se cerrará automáticamente.'
              : 'Has terminado el examen exitosamente.';

            showModal('success', '¡Intento Finalizado!', successMessage, () => {
              closeModal();
              
              if (isInSEB) {
                // Cerrar SEB después de 1.5 segundos
                setTimeout(() => {
                  closeSEB();
                  
                  // Fallback si no cierra
                  setTimeout(() => {
                    if (onBack) {
                      onBack();
                    } else {
                      navigate('/student-exam');
                    }
                  }, 1000);
                }, 1500);
              } else {
                // Navegación normal si no está en SEB
                if (onBack) {
                  onBack();
                } else {
                  navigate('/student-exam');
                }
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
        
        if (isInSEB) {
          closeSEB();
          setTimeout(() => {
            if (onBack) {
              onBack();
            } else {
              navigate('/student-exam');
            }
          }, 1000);
        } else {
          if (onBack) {
            onBack();
          } else {
            navigate('/student-exam');
          }
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
    if (!exam || error || propExamId) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '¿Estás seguro de que quieres salir del examen? Se perderá tu progreso.';
      return e.returnValue;
    };

    const handlePopState = (e) => {
      e.preventDefault();
      showModal(
        'warning',
        'Salir del Examen',
        '¿Estás seguro de que quieres salir del examen? Se perderá todo tu progreso.',
        () => {
          closeModal();
          window.history.back();
        },
        true
      );
      
      window.history.pushState(null, '', window.location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
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
              {isInSEB && (
                <span className="badge bg-success ms-2">
                  <i className="fas fa-lock me-1"></i>
                  Modo Seguro (SEB)
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
                ¿Terminaste el examen?
              </h5>
              <p className="text-muted mb-4">
                Una vez que finalices el intento, no podrás volver a entrar al examen. Asegúrate de haber respondido todas las preguntas.
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <button 
                  className="modern-btn modern-btn-primary modern-btn-lg" 
                  onClick={handleExamCompletion}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Finalizar Intento
                    </>
                  )}
                </button>
                {!propExamId && (
                  <button className="modern-btn modern-btn-outline-danger modern-btn-lg" onClick={handleLeaveExam}>
                    <i className="fas fa-times me-2"></i>
                    Salir sin finalizar
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
        confirmText={modal.type === 'warning' ? 'Salir del Examen' : modal.type === 'confirm' ? 'Finalizar' : 'Aceptar'}
        cancelText={modal.type === 'confirm' ? 'Cancelar' : 'Continuar Examen'}
      />
    </div>
  );
};

export default ExamAttempt;