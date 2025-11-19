import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

const ExamRanking = () => {
  const { windowId } = useParams();
  const { token, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState(null);
  const [error, setError] = useState(null);
  const [tipoRanking, setTipoRanking] = useState('puntaje'); // 'puntaje' o 'tiempo'

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
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
          // Si el ranking de puntaje está vacío pero hay datos de tiempo, cambiar a tiempo
          if (data.rankingPorPuntaje?.length === 0 && data.rankingPorTiempo?.length > 0) {
            setTipoRanking('tiempo');
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error cargando ranking');
        }
      } catch (err) {
        console.error('Error fetching ranking:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    if (token && windowId) {
      fetchRanking();
    }
  }, [windowId, token]);

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

  if (loading) {
    return (
      <div className="container-fluid container-lg py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando ranking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid container-lg py-5">
        <div className="modern-card">
          <div className="modern-card-body">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
            <BackToMainButton className="mt-3" />
          </div>
        </div>
      </div>
    );
  }

  const rankingActual = tipoRanking === 'puntaje' ? rankingData?.rankingPorPuntaje : rankingData?.rankingPorTiempo;
  const estadisticasActual = tipoRanking === 'puntaje' ? rankingData?.estadisticasPuntaje : rankingData?.estadisticasTiempo;
  const posicionActual = tipoRanking === 'puntaje' ? rankingData?.posicionUsuarioPuntaje : rankingData?.posicionUsuarioTiempo;

  // Mostrar "sin datos" solo si AMBOS rankings están vacíos
  const sinDatos = !rankingData || 
    ((rankingData.rankingPorPuntaje?.length === 0 || !rankingData.rankingPorPuntaje) && 
     (rankingData.rankingPorTiempo?.length === 0 || !rankingData.rankingPorTiempo));

  if (sinDatos) {
    return (
      <div className="container-fluid container-lg py-5">
        <div className="modern-card">
          <div className="modern-card-body">
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h4 className="empty-title">Sin datos de ranking</h4>
              <p className="empty-subtitle">
                Aún no hay estudiantes que hayan completado este examen.
              </p>
              <BackToMainButton className="mt-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { examWindow, totalParticipantes } = rankingData;
  const ranking = rankingActual || [];

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1 className="page-title mb-1" style={{ color: 'white' }}>
                <i className="fas fa-trophy me-2"></i>
                Ranking del Examen
              </h1>
              <p className="mb-0" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {examWindow.titulo}
              </p>
            </div>
            <BackToMainButton className="modern-btn modern-btn-secondary modern-btn-sm" />
          </div>
        </div>
      </div>

      {/* Tabs para elegir tipo de ranking */}
      <div className="modern-card mb-4">
        <div className="modern-card-body p-0">
          <div className="d-flex" style={{ borderBottom: '2px solid #e5e7eb' }}>
            <button
              className={`flex-fill py-3 px-4 ${tipoRanking === 'puntaje' ? 'bg-primary text-white' : 'bg-white text-dark'}`}
              style={{
                border: 'none',
                fontWeight: '600',
                borderRadius: '8px 0 0 0',
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
                borderRadius: '0 8px 0 0',
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
      </div>

      {/* Posición del usuario (si es estudiante) */}
      {user?.rol === 'student' && posicionActual && (
        <div className="modern-card mb-4" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '2px solid var(--primary-color)'
        }}>
          <div className="modern-card-body">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <h5 className="mb-1" style={{ color: 'var(--primary-color)' }}>
                  <i className="fas fa-user-circle me-2"></i>
                  Tu Posición {tipoRanking === 'puntaje' ? '(por Puntaje)' : '(por Tiempo)'}
                </h5>
                <p className="mb-0 text-muted">
                  Estás en el puesto {getMedalEmoji(posicionActual)} de {totalParticipantes} participantes
                </p>
              </div>
              <div className="text-end">
                {tipoRanking === 'puntaje' && ranking.find(r => r.esUsuarioActual)?.puntaje !== null && (
                  <div>
                    <small className="text-muted d-block">Tu Puntaje</small>
                    <strong style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>
                      <i className="fas fa-star me-2"></i>
                      {ranking.find(r => r.esUsuarioActual)?.puntaje?.toFixed(1)}%
                    </strong>
                  </div>
                )}
                {tipoRanking === 'tiempo' && (
                  <div>
                    <small className="text-muted d-block">Tu Tiempo</small>
                    <strong style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>
                      <i className="fas fa-stopwatch me-2"></i>
                      {ranking.find(r => r.esUsuarioActual)?.tiempoFormateado}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              <small className="text-muted">Participantes en este Ranking</small>
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
                    {estadisticasActual?.mejorPuntaje !== null ? `${estadisticasActual?.mejorPuntaje?.toFixed(1)}%` : 'N/A'}
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
                    {estadisticasActual?.peorPuntaje !== null ? `${estadisticasActual?.peorPuntaje?.toFixed(1)}%` : 'N/A'}
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
                    {estadisticasActual?.promedioPuntaje !== null ? `${estadisticasActual?.promedioPuntaje?.toFixed(1)}%` : 'N/A'}
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
                    {estadisticasActual?.mejorTiempoFormateado || 'N/A'}
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
                    {estadisticasActual?.peorTiempoFormateado || 'N/A'}
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
                    {estadisticasActual?.promedioTiempoFormateado || 'N/A'}
                  </h3>
                  <small className="text-muted">Tiempo Promedio</small>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabla de ranking */}
      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-list-ol me-2"></i>
            Clasificación General
          </h3>
        </div>
        <div className="modern-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                borderBottom: '2px solid var(--primary-color)'
              }}>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Posición</th>
                  <th>Estudiante</th>
                  {user?.rol === 'professor' && <th>Email</th>}
                  {tipoRanking === 'puntaje' && (
                    <th style={{ width: '150px', textAlign: 'center' }}>
                      <i className="fas fa-star me-2"></i>
                      Puntaje
                    </th>
                  )}
                  <th style={{ width: '200px', textAlign: 'center' }}>
                    <i className="fas fa-stopwatch me-2"></i>
                    Tiempo de Realización
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
                    className={`${getPosicionClass(tipoRanking === 'puntaje' ? item.posicionPuntaje : item.posicionTiempo)} ${item.esUsuarioActual ? 'table-primary' : ''}`}
                    style={{
                      backgroundColor: item.esUsuarioActual ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      fontWeight: item.esUsuarioActual ? '600' : 'normal'
                    }}
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
                        <div>
                          {item.nombreEstudiante}
                          {item.esUsuarioActual && (
                            <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>Tú</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {user?.rol === 'professor' && (
                      <td style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {item.email}
                      </td>
                    )}
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
                            {item.puntaje !== null ? `${item.puntaje.toFixed(1)}%` : 'N/A'}
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
        </div>
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
    </div>
  );
};

export default ExamRanking;
