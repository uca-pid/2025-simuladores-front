import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import MoodleIntegration from '../components/MoodleIntegration';
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
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [tipoRanking, setTipoRanking] = useState('puntaje');
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

  const loadRankingData = async () => {
    try {
      setRankingLoading(true);
      const response = await fetch(`${API_BASE_URL}/ranking/exam-window/${windowId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRankingData(data);
        
        // Auto-seleccionar el ranking que tenga datos
        if (data.rankingPorPuntaje?.length === 0 && data.rankingPorTiempo?.length > 0) {
          setTipoRanking('tiempo');
        }
      }
    } catch (err) {
      console.error('Error fetching ranking:', err);
    } finally {
      setRankingLoading(false);
    }
  };

  // Cargar ranking automáticamente al montar el componente
  useEffect(() => {
    if (examWindow && !rankingData && !rankingLoading) {
      loadRankingData();
    }
  }, [examWindow]);

  const getMedalEmoji = (posicion) => {
    switch(posicion) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${posicion}°`;
    }
  };

  const getPosicionClass = (posicion) => {
    switch(posicion) {
      case 1: return 'ranking-first';
      case 2: return 'ranking-second';
      case 3: return 'ranking-third';
      default: return '';
    }
  };

  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
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
                  <span className="exam-title-text">{examWindow.exam.titulo}</span>
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

      {/* Sección de Ranking */}
      <div className="modern-card mb-4 ranking-section">
        <div className="modern-card-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <h3 className="modern-card-title mb-0" style={{ color: 'white' }}>
            <i className="fas fa-trophy me-2"></i>
            Ranking del Examen
          </h3>
        </div>
        <div className="modern-card-body">
          {rankingLoading ? (
            <div className="loading-container">
              <div className="modern-spinner"></div>
              <p>Cargando ranking...</p>
            </div>
          ) : rankingData ? (
            <>
              {/* Tabs para elegir tipo de ranking */}
              <div className="mb-4">
                <div className="d-flex" style={{ borderBottom: '2px solid #e5e7eb', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
                  <button
                    className={`flex-fill py-3 px-4 ${tipoRanking === 'puntaje' ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                    style={{
                      border: 'none',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setTipoRanking('puntaje')}
                  >
                    <i className="fas fa-star me-2"></i>
                    Ranking por Puntaje
                    {rankingData?.rankingPorPuntaje?.length > 0 && (
                      <span className={`ms-2 badge ${tipoRanking === 'puntaje' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                        {rankingData.rankingPorPuntaje.length}
                      </span>
                    )}
                  </button>
                  <button
                    className={`flex-fill py-3 px-4 ${tipoRanking === 'tiempo' ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                    style={{
                      border: 'none',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setTipoRanking('tiempo')}
                  >
                    <i className="fas fa-stopwatch me-2"></i>
                    Ranking por Tiempo
                    {rankingData?.rankingPorTiempo?.length > 0 && (
                      <span className={`ms-2 badge ${tipoRanking === 'tiempo' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                        {rankingData.rankingPorTiempo.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {(() => {
                const rankingActual = tipoRanking === 'puntaje' ? rankingData?.rankingPorPuntaje : rankingData?.rankingPorTiempo;
                const estadisticasActual = tipoRanking === 'puntaje' ? rankingData?.estadisticasPuntaje : rankingData?.estadisticasTiempo;
                const ranking = rankingActual || [];
                
                const sinDatos = !rankingData || 
                  ((rankingData.rankingPorPuntaje?.length === 0 || !rankingData.rankingPorPuntaje) && 
                   (rankingData.rankingPorTiempo?.length === 0 || !rankingData.rankingPorTiempo));

                if (sinDatos) {
                  return (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <i className="fas fa-trophy"></i>
                      </div>
                      <h4 className="empty-title">Sin datos de ranking</h4>
                      <p className="empty-subtitle">
                        Aún no hay estudiantes que hayan completado este examen.
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Estadísticas generales */}
                    <div className="row mb-4">
                      <div className="col-md-3 col-sm-6 mb-3">
                        <div className="modern-card" style={{ height: '100%' }}>
                          <div className="modern-card-body text-center">
                            <div className="stat-icon mb-2" style={{ 
                              fontSize: '2rem', 
                              color: 'var(--primary-color)' 
                            }}>
                              <i className="fas fa-users"></i>
                            </div>
                            <h3 className="mb-1" style={{ color: 'var(--primary-color)', fontSize: '2rem' }}>
                              {ranking.length}
                            </h3>
                            <small className="text-muted">Participantes</small>
                          </div>
                        </div>
                      </div>
                      
                      {tipoRanking === 'puntaje' ? (
                        <>
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--success-color)' 
                                }}>
                                  <i className="fas fa-trophy"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--success-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.mejorPuntaje !== null ? `${estadisticasActual?.mejorPuntaje?.toFixed(1)}%` : '0.0%'}
                                </h3>
                                <small className="text-muted">Mejor Puntaje</small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--warning-color)' 
                                }}>
                                  <i className="fas fa-arrow-down"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--warning-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.peorPuntaje !== null ? `${estadisticasActual?.peorPuntaje?.toFixed(1)}%` : '0.0%'}
                                </h3>
                                <small className="text-muted">Puntaje Más Bajo</small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--info-color)' 
                                }}>
                                  <i className="fas fa-chart-bar"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--info-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.promedioPuntaje !== null ? `${estadisticasActual?.promedioPuntaje?.toFixed(1)}%` : '0.0%'}
                                </h3>
                                <small className="text-muted">Puntaje Promedio</small>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--success-color)' 
                                }}>
                                  <i className="fas fa-clock"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--success-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.mejorTiempoFormateado || '0.0%'}
                                </h3>
                                <small className="text-muted">Mejor Tiempo</small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--warning-color)' 
                                }}>
                                  <i className="fas fa-hourglass-end"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--warning-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.peorTiempoFormateado || '0.0%'}
                                </h3>
                                <small className="text-muted">Tiempo Más Lento</small>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-3 col-sm-6 mb-3">
                            <div className="modern-card" style={{ height: '100%' }}>
                              <div className="modern-card-body text-center">
                                <div className="stat-icon mb-2" style={{ 
                                  fontSize: '2rem', 
                                  color: 'var(--info-color)' 
                                }}>
                                  <i className="fas fa-chart-line"></i>
                                </div>
                                <h3 className="mb-1" style={{ color: 'var(--info-color)', fontSize: '2rem' }}>
                                  {estadisticasActual?.promedioTiempoFormateado || '0.0%'}
                                </h3>
                                <small className="text-muted">Tiempo Promedio</small>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tabla de ranking */}
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead style={{ 
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                          borderBottom: '2px solid var(--primary-color)'
                        }}>
                          <tr>
                            <th style={{ width: '100px', textAlign: 'center' }}>Posición</th>
                            <th>Estudiante</th>
                            <th>Email</th>
                            {tipoRanking === 'puntaje' && (
                              <th style={{ width: '150px', textAlign: 'center' }}>
                                <i className="fas fa-star me-2"></i>
                                Puntaje
                              </th>
                            )}
                            <th style={{ width: '200px', textAlign: 'center' }}>
                              <i className="fas fa-stopwatch me-2"></i>
                              Tiempo
                            </th>
                            <th style={{ width: '200px', textAlign: 'center' }}>
                              <i className="fas fa-calendar me-2"></i>
                              Fecha Finalización
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.map((item) => (
                            <tr 
                              key={item.userId}
                              className={getPosicionClass(tipoRanking === 'puntaje' ? item.posicionPuntaje : item.posicionTiempo)}
                            >
                              <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                                {getMedalEmoji(tipoRanking === 'puntaje' ? item.posicionPuntaje : item.posicionTiempo)}
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="user-avatar me-2" style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                  }}>
                                    {item.nombreEstudiante.charAt(0).toUpperCase()}
                                  </div>
                                  <div>{item.nombreEstudiante}</div>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                {item.email}
                              </td>
                              {tipoRanking === 'puntaje' && (
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: item.puntaje >= 70
                                      ? 'rgba(34, 197, 94, 0.1)'
                                      : item.puntaje >= 40
                                      ? 'rgba(251, 191, 36, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    fontSize: '1.2rem',
                                    fontWeight: '700'
                                  }}>
                                    <i className="fas fa-star" style={{ 
                                      color: item.puntaje >= 70 ? '#22c55e' : item.puntaje >= 40 ? '#fbbf24' : '#ef4444'
                                    }}></i>
                                    <span style={{ 
                                      color: item.puntaje >= 70 ? '#22c55e' : item.puntaje >= 40 ? '#fbbf24' : '#ef4444'
                                    }}>
                                      {item.puntaje !== null ? `${item.puntaje.toFixed(1)}%` : '0.0%'}
                                    </span>
                                  </div>
                                </td>
                              )}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  padding: '8px 16px',
                                  background: tipoRanking === 'tiempo' && (item.posicionTiempo || item.posicion) <= 3
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                                    : 'rgba(0,0,0,0.05)',
                                  borderRadius: '8px',
                                  fontFamily: 'monospace',
                                  fontSize: '1.1rem',
                                  fontWeight: '600'
                                }}>
                                  <i className="fas fa-stopwatch" style={{ 
                                    color: (tipoRanking === 'tiempo' && (
                                             (item.posicionTiempo || item.posicion) === 1 ? '#FFD700' : 
                                             (item.posicionTiempo || item.posicion) === 2 ? '#C0C0C0' : 
                                             (item.posicionTiempo || item.posicion) === 3 ? '#CD7F32' : 
                                             'var(--primary-color)'
                                           )) || '#6b7280'
                                  }}></i>
                                  <span style={{ 
                                    color: tipoRanking === 'tiempo' && (item.posicionTiempo || item.posicion) <= 3 ? 'var(--primary-color)' : '#374151' 
                                  }}>
                                    {item.tiempoFormateado}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                                <i className="fas fa-calendar-check me-2"></i>
                                {new Date(item.fechaFin).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <style>{`
                      .ranking-first td {
                        background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%) !important;
                        border-left: 4px solid #FFD700;
                      }

                      .ranking-second td {
                        background: linear-gradient(90deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.05) 100%) !important;
                        border-left: 4px solid #C0C0C0;
                      }

                      .ranking-third td {
                        background: linear-gradient(90deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.05) 100%) !important;
                        border-left: 4px solid #CD7F32;
                      }

                      .table-hover tbody tr:hover {
                        background-color: rgba(99, 102, 241, 0.05) !important;
                      }

                      @media (max-width: 768px) {
                        .table {
                          font-size: 0.85rem;
                        }
                        
                        .user-avatar {
                          width: 28px !important;
                          height: 28px !important;
                          font-size: 0.8rem !important;
                        }
                      }
                    `}</style>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h4 className="empty-title">Error cargando ranking</h4>
            </div>
          )}
        </div>
      </div>

      {/* Botón de sincronización con Moodle */}
      <div className="modern-card">
        <div className="modern-card-body text-center">
          <button 
            className="modern-btn modern-btn-primary modern-btn-lg" 
            onClick={() => setShowMoodleModal(true)}
            title="Sincronizar calificaciones con Moodle"
          >
            <i className="fas fa-graduation-cap me-2"></i>
            Sincronizar Notas con Moodle
          </button>
          <p className="text-muted mt-3 mb-0">
            <i className="fas fa-info-circle me-2"></i>
            Exporta las calificaciones de los estudiantes a tu curso de Moodle
          </p>
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
