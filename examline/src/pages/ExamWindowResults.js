import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import MoodleIntegration from '../components/MoodleIntegration';
import ManualGradingModal from '../components/ManualGradingModal';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function ExamWindowResultsPage() {
  const { windowId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [examWindow, setExamWindow] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoodleModal, setShowMoodleModal] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showOnlyGrades, setShowOnlyGrades] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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

        // Cargar inscripciones para contar los inscritos
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

  // Cargar intentos de la ventana
  const loadAttempts = useCallback(async () => {
    try {
      setAttemptsLoading(true);
      const response = await fetch(`${API_BASE_URL}/exam-attempts/window/${windowId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttempts(data);
      } else {
        console.error('Error response:', response.status);
        setAttempts([]);
      }
    } catch (err) {
      console.error('Error fetching attempts:', err);
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
      setAttemptsLoaded(true);
    }
  }, [windowId, token]);

  // Cargar intentos automáticamente
  useEffect(() => {
    if (examWindow && !attemptsLoading && !attemptsLoaded) {
      loadAttempts();
    }
  }, [examWindow, attemptsLoading, attemptsLoaded, loadAttempts]);

  const handleOpenGrading = (attemptId) => {
    setSelectedAttemptId(attemptId);
    setShowGradingModal(true);
  };

  const handleCloseGrading = () => {
    setShowGradingModal(false);
    setSelectedAttemptId(null);
  };

  const handleSaveGrade = async () => {
    // Recargar datos después de guardar
    await loadAttempts();
  };

  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  const handlePublicarNotas = async (publicar) => {
    if (isPublishing) return; // Evitar spam
    
    try {
      setIsPublishing(true);
      // Si no hay pendientes o si está ocultando, proceder directamente
      await confirmarPublicacion(publicar);
    } catch (error) {
      console.error('Error:', error);
      showModal('error', 'Error', 'No se pudo actualizar la publicación de las notas');
    } finally {
      setIsPublishing(false);
    }
  };

  const confirmarPublicacion = async (publicar) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/publicar-notas`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notasPublicadas: publicar })
      });

      if (response.ok) {
        const data = await response.json();
        setExamWindow({ ...examWindow, notasPublicadas: data.notasPublicadas });
        showModal(
          'success',
          'Éxito',
          publicar ? 'Las notas han sido publicadas y son visibles para los estudiantes' : 'Las notas han sido ocultadas y no son visibles para los estudiantes'
        );
      } else {
        throw new Error('Error al actualizar publicación de notas');
      }
    } catch (error) {
      throw error;
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

  if (!examWindow) {
    return (
      <div className="container py-5">
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
    );
  }

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="window-inscriptions-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-trophy me-2 me-lg-3"></i>
                <span className="title-text">
                  <span className="d-none d-sm-inline">Resultados - </span>
                  <span className="exam-title-text">{examWindow.nombre}</span>
                </span>
              </h1>
            </div>
            <div className="header-actions-section">
              <div className="header-actions">
                <button 
                  className="modern-btn modern-btn-secondary compact-btn me-3" 
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
                  <span><strong>Fecha:</strong> <span className="info-value">
                    {examWindow.sinTiempo || !examWindow.fechaInicio 
                      ? 'Sin límite de tiempo' 
                      : new Date(examWindow.fechaInicio).toLocaleDateString()}
                  </span></span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-clock"></i>
                  <span><strong>Hora de inicio:</strong> <span className="info-value">
                    {examWindow.sinTiempo || !examWindow.fechaInicio 
                      ? 'Disponible siempre' 
                      : new Date(examWindow.fechaInicio).toLocaleTimeString()}
                  </span></span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-hourglass-half"></i>
                  <span><strong>Duración:</strong> <span className="info-value">
                    {examWindow.sinTiempo || !examWindow.duracion 
                      ? 'Sin límite' 
                      : `${examWindow.duracion} minutos`}
                  </span></span>
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

      {/* Sección de Intentos y Calificaciones */}
      <div className="modern-card mb-4">
        <div className="modern-card-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <h3 className="modern-card-title mb-0" style={{ color: 'white' }}>
            <i className="fas fa-user-graduate me-2"></i>
            Intentos de Estudiantes
          </h3>
        </div>
        <div className="modern-card-body">
          {attemptsLoading ? (
            <div className="loading-container">
              <div className="modern-spinner"></div>
              <p>Cargando intentos...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <h4 className="empty-title">Sin intentos finalizados</h4>
              <p className="empty-subtitle">
                Aún no hay estudiantes que hayan completado este examen.
              </p>
            </div>
          ) : (
            <>
              {/* Leyenda de colores */}
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <div className="d-flex gap-3 align-items-center" style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <span style={{ fontWeight: '600', color: '#495057' }}>
                    <i className="fas fa-info-circle me-2"></i>
                    Leyenda:
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '0.9rem', color: '#495057' }}>
                      <i className="fas fa-check-circle me-1" style={{ color: '#28a745' }}></i>
                      Corregido manualmente
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '0.9rem', color: '#495057' }}>
                      <i className="fas fa-clock me-1" style={{ color: '#ffc107' }}></i>
                      Pendiente de corrección
                    </span>
                  </div>
                </div>

                {/* Toggle vista simplificada */}
                <div className="form-check form-switch d-flex align-items-center">
                  <input
                    className="form-check-input me-2"
                    type="checkbox"
                    id="toggle-simple-view"
                    checked={showOnlyGrades}
                    onChange={(e) => setShowOnlyGrades(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label" htmlFor="toggle-simple-view" style={{ 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#495057',
                    userSelect: 'none'
                  }}>
                    Ver solo estudiantes y sus notas de corrección manual
                  </label>
                </div>
              </div>
              
              <div className="table-responsive">
              <table className="table mb-0 attempts-table">
                <thead style={{ 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderBottom: '2px solid var(--primary-color)'
                }}>
                  <tr>
                    <th>Estudiante</th>
                    {!showOnlyGrades && <th>Email</th>}
                    {!showOnlyGrades && (
                      <th style={{ textAlign: 'center' }}>
                        <i className="fas fa-robot me-2"></i>
                        Puntaje Automático
                      </th>
                    )}
                    <th style={{ textAlign: 'center' }}>
                      <i className="fas fa-user-check me-2"></i>
                      Calificación Manual
                    </th>
                    {!showOnlyGrades && (
                      <th style={{ textAlign: 'center' }}>
                        <i className="fas fa-calendar me-2"></i>
                        Finalizado
                      </th>
                    )}
                    <th style={{ textAlign: 'center', width: '150px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => {
                    const isManuallyGraded = attempt.calificacionManual !== null && attempt.calificacionManual !== undefined;
                    
                    return (
                      <tr key={attempt.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="user-avatar me-2" style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isManuallyGraded 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Verde para corregidos
                                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Naranja para pendientes
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {attempt.user.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="d-flex align-items-center">
                              {attempt.user.nombre}
                              {isManuallyGraded && (
                                <i className="fas fa-check-circle ms-2" style={{ color: '#28a745' }} title="Corregido manualmente"></i>
                              )}
                              {!isManuallyGraded && (
                                <i className="fas fa-clock ms-2" style={{ color: '#ffc107' }} title="Pendiente de corrección"></i>
                              )}
                            </div>
                          </div>
                        </td>
                        {!showOnlyGrades && (
                          <td style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {attempt.user.email}
                          </td>
                        )}
                        {!showOnlyGrades && (
                          <td style={{ textAlign: 'center' }}>
                            {attempt.puntaje !== null ? (
                              <span className={`badge ${
                                attempt.puntaje >= 70 ? 'bg-success' :
                                attempt.puntaje >= 40 ? 'bg-warning' :
                                'bg-danger'
                              }`}>
                                {attempt.puntaje.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          {isManuallyGraded ? (
                            <span className="badge bg-success" style={{ fontSize: '1rem' }}>
                              {attempt.calificacionManual}
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              <i className="fas fa-exclamation-triangle me-1"></i>
                              Pendiente
                            </span>
                          )}
                        </td>
                        {!showOnlyGrades && (
                          <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                            {new Date(attempt.finishedAt).toLocaleString()}
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={`modern-btn modern-btn-sm ${isManuallyGraded ? 'modern-btn-secondary' : 'modern-btn-primary'}`}
                            onClick={() => handleOpenGrading(attempt.id)}
                            title={isManuallyGraded ? "Editar calificación" : "Corregir manualmente"}
                          >
                            <i className={`fas ${isManuallyGraded ? 'fa-pencil-alt' : 'fa-edit'} me-1`}></i>
                            {isManuallyGraded ? 'Editar' : 'Corregir'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* Acciones de Gestión de Notas */}
      <div className="row mb-4">
        {/* Publicación de Notas */}
        <div className="col-lg-6 mb-3 mb-lg-0">
          {(() => {
            const intentosFinalizados = attempts.filter(a => a.estado === 'finalizado' || a.finishedAt);
            const sinCorregir = intentosFinalizados.filter(a => a.calificacionManual === null || a.calificacionManual === undefined);
            const tienePendientes = sinCorregir.length > 0;
            const noHayIntentos = intentosFinalizados.length === 0;
            const puedePublicar = examWindow?.notasPublicadas || (!tienePendientes && !noHayIntentos);
            
            return (
              <div className="modern-card h-100" style={{
                border: examWindow?.notasPublicadas ? '2px solid #ffc107' : ((tienePendientes || noHayIntentos) ? '2px solid #dc3545' : '2px solid #198754'),
                background: examWindow?.notasPublicadas 
                  ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)'
                  : ((tienePendientes || noHayIntentos)
                    ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(25, 135, 84, 0.05) 0%, rgba(25, 135, 84, 0.02) 100%)')
              }}>
                <div className="modern-card-body d-flex flex-column justify-content-between">
                  <div className="mb-3">
                    <h5 className="mb-2" style={{ 
                      color: examWindow?.notasPublicadas ? '#f57c00' : ((tienePendientes || noHayIntentos) ? '#dc3545' : '#198754'),
                      fontWeight: '600'
                    }}>
                      <i className={`fas ${examWindow?.notasPublicadas ? 'fa-eye' : 'fa-eye-slash'} me-2`}></i>
                      Publicación de Notas
                    </h5>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      {examWindow?.notasPublicadas 
                        ? '✓ Las notas están visibles para los estudiantes'
                        : (noHayIntentos 
                          ? '⚠️ No hay exámenes finalizados'
                          : (tienePendientes 
                            ? `⚠️ ${sinCorregir.length} examen(es) sin corregir`
                            : '✗ Las notas están ocultas para los estudiantes'))
                      }
                    </p>
                  </div>
                  <button 
                    className={`modern-btn ${
                      examWindow?.notasPublicadas ? 'modern-btn-warning' : 'modern-btn-success'
                    } modern-btn-lg w-100`}
                    onClick={() => handlePublicarNotas(!examWindow?.notasPublicadas)}
                    title={examWindow?.notasPublicadas ? 'Ocultar notas' : (noHayIntentos ? 'No hay exámenes finalizados para publicar' : (tienePendientes ? 'Debes corregir todos los exámenes antes de publicar' : 'Publicar notas'))}
                    style={{ padding: '12px 24px' }}
                    disabled={!puedePublicar || isPublishing}
                  >
                    {isPublishing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {examWindow?.notasPublicadas ? 'Ocultando...' : 'Publicando...'}
                      </>
                    ) : (
                      <>
                        <i className={`fas ${examWindow?.notasPublicadas ? 'fa-eye-slash' : 'fa-eye'} me-2`}></i>
                        {examWindow?.notasPublicadas ? 'Ocultar Notas' : 'Publicar Notas'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sincronización con Moodle */}
        <div className="col-lg-6">
          {(() => {
            const intentosFinalizados = attempts.filter(a => a.estado === 'finalizado' || a.finishedAt);
            const sinCorregir = intentosFinalizados.filter(a => a.calificacionManual === null || a.calificacionManual === undefined);
            const tienePendientes = sinCorregir.length > 0;
            const noHayIntentos = intentosFinalizados.length === 0;
            const puedesincronizar = !tienePendientes && !noHayIntentos;
            
            return (
              <div className="modern-card h-100" style={{
                border: (tienePendientes || noHayIntentos) ? '2px solid #dc3545' : '2px solid #0d6efd',
                background: (tienePendientes || noHayIntentos)
                  ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 110, 253, 0.02) 100%)'
              }}>
                <div className="modern-card-body d-flex flex-column justify-content-between">
                  <div className="mb-3">
                    <h5 className="mb-2" style={{ color: (tienePendientes || noHayIntentos) ? '#dc3545' : '#0d6efd', fontWeight: '600' }}>
                      <i className="fas fa-graduation-cap me-2"></i>
                      Sincronización con Moodle
                    </h5>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      {noHayIntentos 
                        ? '⚠️ No hay exámenes finalizados'
                        : (tienePendientes 
                          ? `⚠️ ${sinCorregir.length} examen(es) sin corregir`
                          : 'Exporta las calificaciones de los estudiantes a tu curso de Moodle')
                      }
                    </p>
                  </div>
                  <button 
                    className="modern-btn modern-btn-primary modern-btn-lg w-100" 
                    onClick={() => setShowMoodleModal(true)}
                    title={noHayIntentos ? 'No hay exámenes finalizados para sincronizar' : (tienePendientes ? 'Debes corregir todos los exámenes antes de sincronizar' : 'Sincronizar calificaciones con Moodle')}
                    style={{ padding: '12px 24px' }}
                    disabled={!puedesincronizar || isPublishing}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    Sincronizar con Moodle
                  </button>
                </div>
              </div>
            );
          })()}
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
          <div style={{
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

      {/* Manual Grading Modal */}
      {showGradingModal && selectedAttemptId && (
        <ManualGradingModal
          attemptId={selectedAttemptId}
          onClose={handleCloseGrading}
          onSave={handleSaveGrade}
        />
      )}
    </div>
  );
}
