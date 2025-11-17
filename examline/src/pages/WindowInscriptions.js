import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import MoodleIntegration from '../components/MoodleIntegration';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

// Función auxiliar para convertir fechas del servidor a zona horaria local automáticamente
// eslint-disable-next-line no-unused-vars
const adjustDateFromServer = (serverDateString) => {
  // JavaScript maneja automáticamente la conversión de UTC a zona horaria local
  return new Date(serverDateString);
};

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function WindowInscriptionsPage() {
  const { windowId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [examWindow, setExamWindow] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoodleModal, setShowMoodleModal] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  // Verificar que es profesor
  useEffect(() => {
    if (!user || user.rol !== 'professor') {
      navigate('/');
      return;
    }

    const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar información de la ventana
      const windowResponse = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (windowResponse.ok) {
        const windows = await windowResponse.json();
        const window = windows.find(w => w.id === parseInt(windowId));
        if (window) {
          setExamWindow(window);
        } else {
          navigate('/exam-windows');
          return;
        }
      }

      // Cargar inscripciones
      const inscriptionsResponse = await fetch(`${API_BASE_URL}/inscriptions/ventana/${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (inscriptionsResponse.ok) {
        const inscriptionsData = await inscriptionsResponse.json();
        setInscriptions(inscriptionsData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showModal('error', 'Error', 'Error cargando los datos');
    } finally {
      setLoading(false);
    }
    };

    loadData();
  }, [user, navigate, windowId, token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        console.error('No token available in loadData');
        navigate('/login');
        return;
      }
      
      // Cargar información de la ventana
      const windowResponse = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (windowResponse.status === 401) {
        console.error('Token expirado en loadData');
        navigate('/login');
        return;
      }
      
      if (windowResponse.ok) {
        const windows = await windowResponse.json();
        const window = windows.find(w => w.id === parseInt(windowId));
        if (window) {
          setExamWindow(window);
        } else {
          navigate('/exam-windows');
          return;
        }
      }

      // Cargar inscripciones
      const inscriptionsResponse = await fetch(`${API_BASE_URL}/inscriptions/ventana/${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (inscriptionsResponse.status === 401) {
        console.error('Token expirado al cargar inscripciones');
        navigate('/login');
        return;
      }
      
      if (inscriptionsResponse.ok) {
        const inscriptionsData = await inscriptionsResponse.json();
        setInscriptions(inscriptionsData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  const handleAttendanceToggle = async (inscriptionId, currentPresente) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inscriptions/${inscriptionId}/asistencia`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ presente: !currentPresente })
      });

      if (response.ok) {
        loadData(); // Recargar datos
      } else {
        showModal('error', 'Error', 'Error al cambiar asistencia');
      }
    } catch (error) {
      console.error('Error cambiando asistencia:', error);
      showModal('error', 'Error', 'Error de conexión');
    }
  };

  const markAllPresent = () => {
    showModal(
      'confirm',
      'Marcar todos como presentes',
      '¿Deseas marcar a todos los estudiantes inscriptos como presentes? Esto los habilitará para rendir el examen.',
      async () => {
        try {
          const updates = inscriptions
            .filter(inscription => inscription.presente !== true)
            .map(inscription => 
              fetch(`${API_BASE_URL}/inscriptions/${inscription.id}/asistencia`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ presente: true })
              })
            );

          await Promise.all(updates);
          showModal('success', '¡Éxito!', 'Todos los estudiantes han sido marcados como presentes');
          loadData();
        } catch (error) {
          console.error('Error marcando asistencias:', error);
          showModal('error', 'Error', 'Error al marcar asistencias');
        }
        closeModal();
      },
      true
    );
  };

  const togglePresentismo = () => {
    const requierePresente = examWindow.requierePresente === true;
    const action = requierePresente ? 'desactivar' : 'activar';
    const message = requierePresente 
      ? '¿Deseas desactivar el sistema de presentismo? Los estudiantes podrán acceder al examen sin necesidad de ser marcados como presentes.'
      : '¿Deseas activar el sistema de presentismo? Los estudiantes deberán ser marcados como presentes para poder acceder al examen.';
    
    showModal(
      'confirm',
      `${action.charAt(0).toUpperCase() + action.slice(1)} presentismo`,
      message,
      async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/toggle-presentismo`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            showModal('success', '¡Éxito!', result.message);
            loadData(); // Recargar datos
          } else {
            showModal('error', 'Error', 'Error al cambiar el sistema de presentismo');
          }
        } catch (error) {
          console.error('Error cambiando presentismo:', error);
          showModal('error', 'Error', 'Error de conexión');
        }
        closeModal();
      },
      true
    );
  };

  const canManageAttendance = () => {
    if (!examWindow) return false;
    
    // Si no requiere presentismo, no se puede gestionar asistencia
    // Ser defensivo: si requierePresente es null/undefined, asumir false
    const requierePresente = examWindow.requierePresente === true;
    if (!requierePresente) return false;
    
    const now = new Date();
    const start = new Date(examWindow.fechaInicio);
    const end = new Date(start.getTime() + (examWindow.duracion * 60 * 1000));
    
    // Permitir gestionar asistencia desde 30 minutos antes hasta el final
    const canManageFrom = new Date(start.getTime() - (30 * 60 * 1000));
    
    return now >= canManageFrom && now <= end;
  };

  const isExamFinished = () => {
    if (!examWindow) return false;
    
    const now = new Date();
    const start = new Date(examWindow.fechaInicio);
    const end = new Date(start.getTime() + (examWindow.duracion * 60 * 1000));
    
    return now > end;
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="window-inscriptions-loading-state">
          <div className="loading-container">
            <div className="modern-spinner"></div>
            <p>Cargando inscripciones...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!examWindow) {
    return (
      <div className="container py-5">
        <div className="window-inscriptions-error-state">
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h4 className="empty-title">Ventana no encontrada</h4>
            <p className="empty-subtitle">
              La ventana de examen solicitada no existe o no tienes permisos para verla.
            </p>
            <BackToMainButton />
          </div>
        </div>
      </div>
    );
  }

  const canManage = canManageAttendance();
  const isFinished = isExamFinished();

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="window-inscriptions-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-users me-2 me-lg-3"></i>
                <span className="title-text">
                  <span className="d-none d-sm-inline">Inscripciones - </span>
                  <span className="exam-title-text">{examWindow.exam.titulo}</span>
                </span>
              </h1>
            </div>
            <div className="header-actions-section">
              <div className="header-actions">
                <button 
                  className="modern-btn compact-btn me-3" 
                  onClick={() => setShowMoodleModal(true)}
                  title="Sincronizar calificaciones con Moodle"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <i className="fas fa-graduation-cap me-2"></i>
                  <span className="btn-text">
                    <span className="d-none d-lg-inline">Sincronizar Moodle</span>
                    <span className="d-lg-none">Moodle</span>
                  </span>
                </button>
                <button 
                  className="modern-btn modern-btn-primary compact-btn me-3" 
                  onClick={() => navigate(`/ranking/window/${windowId}`)}
                  title="Ver Ranking de este Examen"
                >
                  <i className="fas fa-trophy me-2"></i>
                  <span className="btn-text">
                    <span className="d-none d-lg-inline">Ver Ranking</span>
                    <span className="d-lg-none">Ranking</span>
                  </span>
                </button>
                <button 
                  className="modern-btn modern-btn-secondary compact-btn" 
                  onClick={() => navigate('/exam-windows')}
                  title="Volver a Ventanas de Examen"
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  <span className="btn-text">
                    <span className="d-none d-lg-inline">Ventanas de Examen</span>
                    <span className="d-lg-none">Ventanas</span>
                  </span>
                </button>
                <BackToMainButton />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información de la ventana */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-info-circle me-2"></i>
            Información de la Ventana
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="window-inscriptions-info-grid">
            <div className="info-section">
              <div className="exam-info">
                <div className="exam-info-item">
                  <i className="fas fa-calendar"></i>
                  <span><strong>Fecha:</strong> <span className="info-value">{new Date(examWindow.fechaInicio).toLocaleDateString()}</span></span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-clock"></i>
                  <span><strong>Hora de inicio:</strong> <span className="info-value">{new Date(examWindow.fechaInicio).toLocaleTimeString()}</span></span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-hourglass-half"></i>
                  <span><strong>Duración:</strong> <span className="info-value">{examWindow.duracion} minutos</span></span>
                </div>
              </div>
            </div>
            <div className="info-section">
              <div className="exam-info">
                <div className="exam-info-item">
                  <i className="fas fa-laptop"></i>
                  <span><strong>Modalidad:</strong> <span className="info-value">{examWindow.modalidad?.charAt(0).toUpperCase() + examWindow.modalidad?.slice(1).toLowerCase()}</span></span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-users"></i>
                  <span><strong>Inscritos:</strong> <span className="info-value">{inscriptions.length}/{examWindow.cupoMaximo}</span></span>
                </div>
              </div>
            </div>
          </div>
          {examWindow.notas && (
            <div className="alert alert-light mt-3">
              <i className="fas fa-sticky-note me-2"></i>
              <strong>Notas:</strong> {examWindow.notas}
            </div>
          )}
        </div>
      </div>

      {/* Controles de gestión */}
      {!isFinished && inscriptions.length > 0 && (
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-cog me-2"></i>
              Configuración de Presentismo
            </h3>
          </div>
          <div className="modern-card-body">
            <div className="attendance-management-section">
              <div className="presentismo-toggle-section mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap">
                  <div className="presentismo-info">
                    <h6 className="mb-1">
                      <i className={`fas ${examWindow.requierePresente === true ? 'fa-user-check text-success' : 'fa-user-slash text-muted'} me-2`}></i>
                      Sistema de Presentismo: {examWindow.requierePresente === true ? 'Activado' : 'Desactivado'}
                    </h6>
                    <p className="text-muted mb-0 small">
                      {examWindow.requierePresente === true 
                        ? 'Los estudiantes deben ser marcados como presentes para acceder al examen'
                        : 'Los estudiantes pueden acceder al examen libremente sin control de asistencia'
                      }
                    </p>
                  </div>
                  <button 
                    className={`modern-btn ${examWindow.requierePresente === true ? 'modern-btn-danger' : 'modern-btn-success'} ms-2`}
                    onClick={togglePresentismo}
                  >
                    <i className={`fas ${examWindow.requierePresente === true ? 'fa-toggle-off' : 'fa-toggle-on'} me-2`}></i>
                    {examWindow.requierePresente === true ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>

              {examWindow.requierePresente === true && canManage && (
                <div className="attendance-controls-section">
                  <hr className="my-3" />
                  <p className="attendance-description text-muted mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    <span className="description-text">Marca a los estudiantes como presentes para habilitarlos a rendir el examen.</span>
                  </p>
                  <div className="attendance-actions">
                    <button 
                      className="modern-btn modern-btn-primary attendance-btn"
                      onClick={markAllPresent}
                      disabled={inscriptions.every(i => i.presente === true)}
                    >
                      <i className="fas fa-user-check me-2"></i>
                      <span className="btn-text">Marcar Todos como Presentes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de inscripciones */}
      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-user-graduate me-2"></i>
            Estudiantes Inscriptos ({inscriptions.length})
          </h3>
        </div>
        <div className="modern-card-body">
          {inscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-user-slash"></i>
              </div>
              <h4 className="empty-title">Sin inscripciones</h4>
              <p className="empty-subtitle">
                No hay estudiantes inscriptos en esta ventana de examen.
              </p>
            </div>
          ) : (
            <div className="window-inscriptions-compact-list">
              {inscriptions.map((inscription, index) => (
                <div key={inscription.id} className={`inscription-compact-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="student-info-section">
                    <div className="student-details">
                      <h6 className="student-name mb-1">{inscription.user.nombre}</h6>
                      <div className="student-meta">
                        <span className="student-email text-muted">
                          <i className="fas fa-envelope me-1"></i>
                          {inscription.user.email}
                        </span>
                        <span className="inscription-date text-muted d-none d-sm-inline">
                          <i className="fas fa-calendar-plus me-1"></i>
                          {new Date(inscription.inscribedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="attendance-controls-section">
                    {examWindow.requierePresente === true && canManage && (
                      <div className="attendance-toggle-group">
                        <button 
                          className={`attendance-toggle-btn present-btn ${
                            inscription.presente === true ? 'active' : ''
                          }`}
                          onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                          disabled={inscription.presente === true}
                          title="Marcar como presente"
                        >
                          <i className="fas fa-check"></i>
                          <span className="toggle-label">Presente</span>
                        </button>
                        <button 
                          className={`attendance-toggle-btn absent-btn ${
                            inscription.presente === false ? 'active' : ''
                          }`}
                          onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                          disabled={inscription.presente === false}
                          title="Marcar como ausente"
                        >
                          <i className="fas fa-times"></i>
                          <span className="toggle-label">Ausente</span>
                        </button>
                      </div>
                    )}
                    
                    {examWindow.requierePresente === true && (isFinished || !canManage) && (
                      <div className="attendance-status-display">
                        <span className={`status-indicator ${
                          inscription.presente === true ? 'present' : 
                          inscription.presente === false ? 'absent' : 
                          'unknown'
                        }`}>
                          <i className={`fas ${
                            inscription.presente === true ? 'fa-check-circle' : 
                            inscription.presente === false ? 'fa-times-circle' : 
                            'fa-question-circle'
                          }`}></i>
                          <span className="status-text">
                            {inscription.presente === true ? 'Presente' : 
                             inscription.presente === false ? 'Ausente' : 
                             'Sin registrar'}
                          </span>
                        </span>
                      </div>
                    )}

                    {examWindow.requierePresente !== true && (
                      <div className="attendance-status-display">
                        <span className="status-indicator present">
                          <i className="fas fa-unlock"></i>
                          <span className="status-text">Acceso libre</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
        cancelText="Cancelar"
      />

      {/* Moodle Integration Modal */}
      {showMoodleModal && (
        <>
          <div 
            onClick={() => setShowMoodleModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
          />
          <MoodleIntegration 
            windowId={parseInt(windowId)}
            onClose={() => setShowMoodleModal(false)}
          />
        </>
      )}
    </div>
  );
}