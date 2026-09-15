import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks';
import { API_BASE_URL } from '../services/api';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

export default function StudentInscriptionsPage({ 
  embedded = false, 
  showHeader = true 
}) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { modal, showModal, closeModal, setModalProcessing } = useModal();
  const [availableWindows, setAvailableWindows] = useState([]);
  const [myInscriptions, setMyInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isOnFilterCooldown, setIsOnFilterCooldown] = useState(false);
  const [filteredAvailableWindows, setFilteredAvailableWindows] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Recuperar la pestaña del localStorage o usar 'available' por defecto
    return localStorage.getItem('studentInscriptions_activeTab') || 'available';
  });
  const [filters, setFilters] = useState({
    materia: '',
    profesor: '',
    fecha: '',
    windowId: ''
  });
  const [myInscriptionsFilters, setMyInscriptionsFilters] = useState({
    materia: '',
    profesor: '',
    fecha: '',
    windowId: ''
  });
  const [filteredInscriptions, setFilteredInscriptions] = useState([]);

  const loadAvailableWindows = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-windows/disponibles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableWindows(data);
        setFilteredAvailableWindows(data);
      }
    } catch (error) {
      console.error('Error cargando ventanas disponibles:', error);
    }
  }, [token]);

  useEffect(() => {
    let filtered = [...availableWindows];

    if (filters.materia) {
      filtered = filtered.filter(window =>
        window.nombre.toLowerCase().includes(filters.materia.toLowerCase())
      );
    }

    if (filters.profesor) {
      filtered = filtered.filter(window =>
        window.exam.profesor.nombre.toLowerCase().includes(filters.profesor.toLowerCase())
      );
    }

    if (filters.fecha) {
      filtered = filtered.filter(window => {
        const windowDate = new Date(window.fechaInicio).toISOString().split('T')[0];
        return windowDate === filters.fecha;
      });
    }

    if (filters.windowId) {
      filtered = filtered.filter(window =>
        window.id.toString().includes(filters.windowId)
      );
    }

    setFilteredAvailableWindows(filtered);
  }, [availableWindows, filters]);

  const loadMyInscriptions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inscriptions/mis-inscripciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Para cada inscripción, verificar si tiene un intento completado
        const inscriptionsWithAttempts = await Promise.all(
          data.map(async (inscription) => {
            try {
              const attemptResponse = await fetch(`${API_BASE_URL}/exam-attempts/check/${inscription.examWindow.examId}?windowId=${inscription.examWindow.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (attemptResponse.ok) {
                const attemptData = await attemptResponse.json();
                return {
                  ...inscription,
                  hasCompletedAttempt: attemptData.hasAttempt && attemptData.attempt?.estado === 'finalizado',
                  attemptId: attemptData.hasAttempt ? attemptData.attempt?.id : null,
                  attempt: attemptData.hasAttempt ? attemptData.attempt : null
                };
              }
            } catch (error) {
              console.error('Error checking attempt for inscription:', inscription.id);
            }
            
            return { ...inscription, hasCompletedAttempt: false, attemptId: null, attempt: null };
          })
        );
        
        setMyInscriptions(inscriptionsWithAttempts);
        setFilteredInscriptions(inscriptionsWithAttempts);
      }
    } catch (error) {
      console.error('Error cargando mis inscripciones:', error);
    }
  }, [token]);

 useEffect(() => {
    let filtered = [...myInscriptions];

    if (myInscriptionsFilters.materia) {
      filtered = filtered.filter(inscription =>
        inscription.examWindow.nombre.toLowerCase().includes(myInscriptionsFilters.materia.toLowerCase())
      );
    }

    if (myInscriptionsFilters.profesor) {
      filtered = filtered.filter(inscription =>
        inscription.examWindow.exam.profesor.nombre.toLowerCase().includes(myInscriptionsFilters.profesor.toLowerCase())
      );
    }

    if (myInscriptionsFilters.fecha) {
      filtered = filtered.filter(inscription => {
        const inscriptionDate = new Date(inscription.examWindow.fechaInicio).toISOString().split('T')[0];
        return inscriptionDate === myInscriptionsFilters.fecha;
      });
    }

    if (myInscriptionsFilters.windowId) {
      filtered = filtered.filter(inscription =>
        inscription.examWindow.id.toString().includes(myInscriptionsFilters.windowId)
      );
    }

    setFilteredInscriptions(filtered);
  }, [myInscriptions, myInscriptionsFilters]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadAvailableWindows(), loadMyInscriptions()]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showModal('error', 'Error', 'Error cargando los datos');
    } finally {
      setLoading(false);
    }
  }, [loadAvailableWindows, loadMyInscriptions, showModal]);

  // Guardar la pestaña activa en localStorage
  useEffect(() => {
    localStorage.setItem('studentInscriptions_activeTab', activeTab);
  }, [activeTab]);

  // Actualizar ventanas filtradas cuando cambian las ventanas disponibles
  useEffect(() => {
    if (availableWindows.length > 0 && filteredAvailableWindows.length === 0 && 
        !filters.materia && !filters.profesor && !filters.fecha && !filters.windowId) {
      setFilteredAvailableWindows(availableWindows);
    }
  }, [availableWindows, filteredAvailableWindows.length, filters]);

  // Actualizar inscripciones filtradas cuando cambian las inscripciones
  useEffect(() => {
    if (myInscriptions.length > 0 && filteredInscriptions.length === 0 && 
        !myInscriptionsFilters.materia && !myInscriptionsFilters.profesor && 
        !myInscriptionsFilters.fecha && !myInscriptionsFilters.windowId) {
      setFilteredInscriptions(myInscriptions);
    }
  }, [myInscriptions, filteredInscriptions.length, myInscriptionsFilters]);

  // Guardar la posición de scroll
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('studentInscriptions_scrollPosition', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restaurar la posición de scroll después de cargar los datos
  useEffect(() => {
    if (!loading) {
      const savedScrollPosition = sessionStorage.getItem('studentInscriptions_scrollPosition');
      if (savedScrollPosition) {
        // Usar requestAnimationFrame para asegurar que el DOM esté renderizado
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10));
        });
      }
    }
  }, [loading]);

  // Verificar que es estudiante
  useEffect(() => {
    if (!user || user.rol !== 'student') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (sessionStorage.getItem('openedSEB') === 'true') {
        sessionStorage.removeItem('openedSEB'); // limpiamos la bandera
        window.location.reload();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);

const isRunningSEB = () => {
  // Método 1: Verificar el User Agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (userAgent.includes('SEB')) {
    return true;
  }
  
  // Método 2: Verificar variables globales de SEB
  if (window.SafeExamBrowser) {
    return true;
  }
  
  // Método 3: Verificar propiedades específicas de SEB
  if (navigator.userAgent.includes('SafeExamBrowser')) {
    return true;
  }
  
  return false;
};

const openExam = async (examId, windowId, token, window) => {
  const requiresSEB = window?.usaSEB || false;
  const examType = window?.exam?.tipo || "normal";
  const params = `windowId=${windowId}`;

  const goToExam = () => {
    if (examType === "programming") {
      navigate(`/programming-exam/${examId}?${params}`);
    } else {
      navigate(`/exam-attempt/${examId}?${params}`);
    }
  };

  if (!requiresSEB) {
    // Si no requiere SEB
    goToExam();
    return;
  }

  // Si requiere SEB pero ya está corriendo en SEB, ir directo al examen
  if (isRunningSEB()) {
    goToExam();
    return;
  }

  // Si requiere SEB y NO está en SEB, redirigir a la página intermedia
  navigate(`/seb-exam-launcher?examId=${examId}&windowId=${windowId}&examType=${examType}`);
};



  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    if (isClearing || isOnFilterCooldown) return;
    
    setIsClearing(true);
    setFilters({ materia: '', profesor: '', fecha: '', windowId: '' });
    setFilteredAvailableWindows(availableWindows);
    setTimeout(() => {
      setIsClearing(false);
      setIsOnFilterCooldown(true);
      setTimeout(() => setIsOnFilterCooldown(false), 800);
    }, 100);
  };

  const handleMyInscriptionsFilterChange = (e) => {
    const { name, value } = e.target;
    setMyInscriptionsFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearMyInscriptionsFilters = () => {
    if (isClearing || isOnFilterCooldown) return;
    
    setIsClearing(true);
    setMyInscriptionsFilters({ materia: '', profesor: '', fecha: '', windowId: '' });
    setFilteredInscriptions(myInscriptions);
    setTimeout(() => {
      setIsClearing(false);
      setIsOnFilterCooldown(true);
      setTimeout(() => setIsOnFilterCooldown(false), 800);
    }, 100);
  };

const handleInscription = (window) => {
  const mensaje = window.sinTiempo 
    ? `¿Deseas inscribirte al examen "${window.nombre}"? Esta ventana está disponible permanentemente.`
    : `¿Deseas inscribirte al examen "${window.nombre}" programado para el ${new Date(window.fechaInicio).toLocaleString()}?`;

  showModal(
    'confirm',
    'Confirmar Inscripción',
    mensaje,
    async () => {
      try {
        setModalProcessing(true);

        const response = await fetch(`${API_BASE_URL}/inscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ examWindowId: window.id })
        });

        const data = await response.json();

        if (!response.ok) {
          // 🔴 ERROR → mostrar modal y NO cerrar
          showModal('error', 'Error', data.error || 'Error al inscribirse');
          return;
        }

        // ✅ ÉXITO
        showModal('success', '¡Éxito!', 'Te has inscrito correctamente al examen');
        loadData();
        closeModal(); // ✅ solo en éxito

      } catch (error) {
        console.error('Error en inscripción:', error);
        showModal('error', 'Error', 'Error de conexión');
      } finally {
        setModalProcessing(false);
      }
    },
    true
  );
};


  const handleCancelInscription = (inscription) => {
    const windowStart = new Date(inscription.examWindow.fechaInicio);
    const now = new Date();
    
    if (now >= windowStart) {
      showModal('error', 'Error', 'No puedes cancelar la inscripción después de que haya comenzado el examen');
      return;
    }

    showModal(
      'confirm',
      'Cancelar Inscripción',
      `¿Seguro que deseas cancelar tu inscripción al examen "${inscription.examWindow.exam.titulo}"?`,
      async () => {
        try {
          setModalProcessing(true);
          const response = await fetch(`${API_BASE_URL}/inscriptions/${inscription.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            showModal('success', '¡Éxito!', 'Inscripción cancelada correctamente');
            loadData(); // Recargar ambas listas
          } else {
            const errorData = await response.json();
            showModal('error', 'Error', errorData.error || 'Error al cancelar inscripción');
          }
        } catch (error) {
          console.error('Error cancelando inscripción:', error);
          showModal('error', 'Error', 'Error de conexión');
        } finally {
          setModalProcessing(false);
        }
        closeModal();
      },
      true
    );
  };

  const canTakeExam = (inscription) => {
    const window = inscription.examWindow;
    const now = new Date();
    
    // Si es una ventana infinita (sin tiempo), solo verificar que esté activa/programada
    if (window.sinTiempo) {
      return (window.estado === 'programada' || window.estado === 'en_curso');
    }
    
    // Para ventanas con tiempo, lógica original
    const windowStart = new Date(window.fechaInicio);
    const windowEnd = new Date(windowStart.getTime() + (window.duracion * 60 * 1000));
    
    return now >= windowStart && now <= windowEnd && 
           window.estado === 'en_curso';
  };

  const getTimeStatus = (fechaInicio, duracion, sinTiempo) => {
    // Si es una ventana infinita (sin tiempo)
    if (sinTiempo) {
      return { text: 'Disponible', class: 'text-success' };
    }
    
    const now = new Date();
    const start = new Date(fechaInicio);
    const end = new Date(start.getTime() + (duracion * 60 * 1000));
    
    if (now < start) {
      const diff = Math.floor((start - now) / (1000 * 60 * 60));
      if (diff > 24) {
        return { text: `En ${Math.floor(diff / 24)} días`, class: 'text-primary' };
      } else if (diff > 0) {
        return { text: `En ${diff} horas`, class: 'text-warning' };
      } else {
        const minutes = Math.floor((start - now) / (1000 * 60));
        return { text: `En ${minutes} minutos`, class: 'text-warning' };
      }
    } else if (now <= end) {
      return { text: 'En curso', class: 'text-success' };
    } else {
      return { text: 'Finalizado', class: 'text-secondary' };
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando inscripciones...</p>
        </div>
      </div>
    );
  }

  const containerClass = embedded ? "" : "container-fluid container-lg py-5 px-3 px-md-4";
  
  return (
    <div className={containerClass}>
      {showHeader && !embedded && (
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="page-title mb-0">Inscripciones a Exámenes</h1>
              <BackToMainButton />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="modern-card mb-4">
        <div className="modern-card-body p-0">
          <div className="student-exam-tabs">
            <button 
              className={`student-tab-button ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <i className="fas fa-calendar-check me-2"></i>
              <span className="tab-text">Exámenes Disponibles</span>
              <span className="tab-count">({availableWindows.length})</span>
            </button>
            <button 
              className={`student-tab-button ${activeTab === 'myInscriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('myInscriptions')}
            >
              <i className="fas fa-user-graduate me-2"></i>
              <span className="tab-text">Mis Inscripciones</span>
              <span className="tab-count">({myInscriptions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'available' && (
        <div>
          {/* Filtros */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h5 className="modern-card-title">
                <i className="fas fa-filter me-2"></i>
                Filtros de Búsqueda
              </h5>
            </div>
            <div className="modern-card-body">
              <div className="row g-3">
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Nombre</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="materia"
                    value={filters.materia}
                    onChange={handleFilterChange}
                    placeholder="Buscar por nombre"
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Profesor</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="profesor"
                    value={filters.profesor}
                    onChange={handleFilterChange}
                    placeholder="Buscar por profesor"
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Fecha</label>
                  <input 
                    type="date" 
                    className="form-control modern-input"
                    name="fecha"
                    value={filters.fecha}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">ID Ventana</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="windowId"
                    value={filters.windowId}
                    onChange={handleFilterChange}
                    placeholder="Buscar por ID"
                  />
                </div>
                <div className="col-lg-4 col-md-12 d-flex align-items-end gap-2 student-filters-actions">
                  <button
                    className="modern-btn modern-btn-secondary flex-fill"
                    onClick={() => setFilters({ materia: '', profesor: '', fecha: '', windowId: '' })}
                  >
                    <i className="fas fa-times me-2"></i>
                    Limpiar Filtros
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* Lista de exámenes disponibles */}
          {availableWindows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-calendar-times"></i>
              </div>
              <h4 className="empty-title">No hay exámenes disponibles</h4>
              <p className="empty-subtitle">
                No hay exámenes disponibles para inscripción en este momento.
              </p>
            </div>
          ) : filteredAvailableWindows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-search"></i>
              </div>
              <h4 className="empty-title">No se encontraron exámenes</h4>
              <p className="empty-subtitle">
                No hay exámenes que coincidan con los filtros aplicados.
              </p>
              <button 
                className="modern-btn modern-btn-primary"
                onClick={clearFilters}
                disabled={isClearing || isOnFilterCooldown}
              >
                <i className="fas fa-times me-2"></i>
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {filteredAvailableWindows.map((window, index) => {
                const timeStatus = getTimeStatus(window.fechaInicio, window.duracion, window.sinTiempo);
                return (
                  <div key={window.id} className="col-md-6 col-lg-4">
                    <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="exam-card-header">
                        <h5 className="exam-title">
                          {window.nombre}
                        </h5>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="exam-badge">
                            Prof. {window.exam.profesor.nombre}
                          </span>
                          <span className="exam-badge" style={{backgroundColor: '#6c757d'}}>
                            ID: {window.id}
                          </span>
                        </div>
                      </div>
                      <div className="exam-card-body">
                        <div className="exam-info">
                          {window.sinTiempo ? (
                            <div className="exam-info-item">
                              <i className="fas fa-infinity text-success"></i>
                              <span><strong>Ventana:</strong> 
                                <span className="ms-1 badge bg-success text-white">
                                  🕐 Disponible siempre
                                </span>
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="exam-info-item">
                                <i className="fas fa-calendar"></i>
                                <span><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</span>
                              </div>
                              <div className="exam-info-item">
                                <i className="fas fa-clock"></i>
                                <span><strong>Hora de inicio:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</span>
                              </div>
                              <div className="exam-info-item">
                                <i className="fas fa-hourglass-half"></i>
                                <span><strong>Duración:</strong> {window.duracion} min</span>
                              </div>
                            </>
                          )}
                          <div className="exam-info-item">
                            <i className="fas fa-laptop"></i>
                            <span><strong>Modalidad:</strong> {window.modalidad ? window.modalidad.charAt(0).toUpperCase() + window.modalidad.slice(1) : ''}</span>
                          </div>
                          {window.usaSEB && (
                            <div className="exam-info-item">
                              <i className="fas fa-shield-alt text-warning"></i>
                              <span><strong>Seguridad:</strong> 
                                <span className="ms-1 badge text-white" style={{
                                  backgroundColor: '#ff8c00',
                                  fontWeight: 'bold',
                                  padding: '0.35rem 0.6rem',
                                  fontSize: '0.75rem'
                                }}>
                                  🔒 Requiere Safe Exam Browser
                                </span>
                              </span>
                            </div>
                          )}
                          <div className="exam-info-item">
                            <i className="fas fa-users"></i>
                            <span><strong>Inscritos:</strong> {window.cupoMaximo - window.cupoDisponible}/{window.cupoMaximo}</span>
                          </div>
                          <div className={`exam-info-item ${timeStatus.class}`}>
                            <i className="fas fa-info-circle"></i>
                            <strong>{timeStatus.text}</strong>
                          </div>
                        </div>
                          {window.notas && (
                            <div className="exam-info-item">
                              <i className="fas fa-sticky-note"></i>
                              <span className="me-2"><strong>Notas:</strong></span>
                              <span 
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxHeight: '3.75em',
                                  lineHeight: '1.25em',
                                  fontStyle: !window.notas ? 'italic' : 'normal',
                                  color: !window.notas ? '#6c757d' : 'inherit',
                                  fontSize: '0.9em'
                                }}
                              >
                                {window.notas || 'Sin notas adicionales'}
                              </span>
                            </div>
                          )}
                        <div className="mt-3">
                          {window.yaInscrito ? (
                            <button className="modern-btn modern-btn-secondary w-100" disabled>
                              <i className="fas fa-check me-2"></i>
                              Ya inscrito
                            </button>
                          ) : window.cupoDisponible === 0 ? (
                            <button className="modern-btn modern-btn-secondary w-100" disabled>
                              <i className="fas fa-users-slash me-2"></i>
                              Completo
                            </button>
                          ) : (
                            <button 
                              className="modern-btn modern-btn-primary w-100"
                              onClick={() => handleInscription(window)}
                            >
                              <i className="fas fa-user-plus me-2"></i>
                              Inscribirse
                              {window.usaSEB && <i className="fas fa-shield-alt ms-2"></i>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'myInscriptions' && (
        <div>
          {/* Filtros para Mis Inscripciones */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h5 className="modern-card-title">
                <i className="fas fa-filter me-2"></i>
                Filtros de Búsqueda
              </h5>
            </div>
            <div className="modern-card-body">
              <div className="row g-3">
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Nombre</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="materia"
                    value={myInscriptionsFilters.materia}
                    onChange={handleMyInscriptionsFilterChange}
                    placeholder="Buscar por nombre"
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Profesor</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="profesor"
                    value={myInscriptionsFilters.profesor}
                    onChange={handleMyInscriptionsFilterChange}
                    placeholder="Buscar por profesor"
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">Fecha</label>
                  <input 
                    type="date" 
                    className="form-control modern-input"
                    name="fecha"
                    value={myInscriptionsFilters.fecha}
                    onChange={handleMyInscriptionsFilterChange}
                  />
                </div>
                <div className="col-lg-2 col-md-6">
                  <label className="form-label fw-semibold">ID Ventana</label>
                  <input 
                    type="text" 
                    className="form-control modern-input"
                    name="windowId"
                    value={myInscriptionsFilters.windowId}
                    onChange={handleMyInscriptionsFilterChange}
                    placeholder="Buscar por ID"
                  />
                </div>
                <div className="col-lg-4 col-md-12 d-flex align-items-end gap-2 student-filters-actions">
                  <button
                    className="modern-btn modern-btn-secondary flex-fill"
                    onClick={() =>
                      setMyInscriptionsFilters({ materia: '', profesor: '', fecha: '', windowId: '' })
                    }
                  >
                    <i className="fas fa-times me-2"></i>
                    Limpiar Filtros
                  </button>

                </div>
              </div>
            </div>
          </div>

          {myInscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h4 className="empty-title">No tienes inscripciones</h4>
              <p className="empty-subtitle">
                No tienes inscripciones activas. Ve a la pestaña "Exámenes Disponibles" para inscribirte.
              </p>
              <button 
                className="modern-btn modern-btn-primary"
                onClick={() => setActiveTab('available')}
              >
                <i className="fas fa-search me-2"></i>
                Ver exámenes disponibles
              </button>
            </div>
          ) : filteredInscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-search"></i>
              </div>
              <h4 className="empty-title">No se encontraron inscripciones</h4>
              <p className="empty-subtitle">
                No hay inscripciones que coincidan con los filtros aplicados.
              </p>
              <button 
                className="modern-btn modern-btn-primary"
                onClick={clearMyInscriptionsFilters}
                disabled={isClearing || isOnFilterCooldown}
              >
                <i className="fas fa-times me-2"></i>
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {filteredInscriptions.map((inscription, index) => {
                const window = inscription.examWindow;
                const timeStatus = getTimeStatus(window.fechaInicio, window.duracion, window.sinTiempo);
                const canTake = canTakeExam(inscription);
                
                return (
                  <div key={inscription.id} className="col-md-6 col-lg-4">
                    <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="exam-card-header">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="exam-title">
                              {window.nombre}
                            </h5>
                            <div className="d-flex flex-wrap gap-2">
                              <span className="exam-badge">
                                Prof. {window.exam.profesor.nombre}
                              </span>
                              <span className="exam-badge" style={{backgroundColor: '#6c757d'}}>
                                ID: {window.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="exam-card-body">
                        <div className="exam-info">
                          {window.sinTiempo ? (
                            <div className="exam-info-item">
                              <i className="fas fa-infinity text-success"></i>
                              <span><strong>Ventana:</strong> 
                                <span className="ms-1 badge bg-success text-white">
                                  🕐 Disponible siempre
                                </span>
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="exam-info-item">
                                <i className="fas fa-calendar"></i>
                                <span><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</span>
                              </div>
                              <div className="exam-info-item">
                                <i className="fas fa-clock"></i>
                                <span><strong>Hora de inicio:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</span>
                              </div>
                              <div className="exam-info-item">
                                <i className="fas fa-hourglass-half"></i>
                                <span><strong>Duración:</strong> {window.duracion} min</span>
                              </div>
                            </>
                          )}
                          <div className="exam-info-item">
                            <i className="fas fa-laptop"></i>
                            <span><strong>Modalidad:</strong> {window.modalidad ? window.modalidad.charAt(0).toUpperCase() + window.modalidad.slice(1) : ''}</span>
                          </div>
                          <div className={`exam-info-item ${timeStatus.class}`}>
                            <i className="fas fa-info-circle"></i>
                            <strong>{timeStatus.text}</strong>
                          </div>
                          <div className="exam-info-item">
                            <i className="fas fa-user-check"></i>
                            <span><strong>Inscrito:</strong> {new Date(inscription.inscribedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          {inscription.hasCompletedAttempt ? (
                            <div className="d-grid gap-2">
                              <button className="modern-btn modern-btn-success" disabled>
                                <i className="fas fa-check-circle me-2"></i>
                                Examen Completado
                              </button>
                              {inscription.examWindow?.notasPublicadas && 
                              inscription.attempt?.calificacionManual !== null && 
                              inscription.attempt?.calificacionManual !== undefined && (
                                <div className="alert alert-info d-flex align-items-center justify-content-center" style={{
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  border: '2px solid #0dcaf0',
                                  backgroundColor: '#cff4fc',
                                  borderRadius: '8px',
                                  margin: '0'
                                }}>
                                  <i className="fas fa-graduation-cap me-2" style={{ fontSize: '1.3rem' }}></i>
                                  <span>Nota: {inscription.attempt.calificacionManual.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          ) : window.sinTiempo ? (
                            // Ventana sin tiempo → siempre disponible
                            <div className="d-grid gap-2">
                              <button 
                                className="modern-btn modern-btn-primary w-100"
                                onClick={() => openExam(window.examId, window.id, token, window)}
                              >
                                <i className="fas fa-play me-2"></i>
                                {window.exam.tipo === 'programming' ? 'Programar' : 'Rendir Examen'}
                              </button>
                            </div>
                          ) : canTake ? (
                            <div className="d-grid gap-2">
                              {window.usaSEB && (
                                <div className="alert alert-warning d-flex align-items-center p-2 mb-2" style={{
                                  fontSize: '0.85rem',
                                  border: '1px solid #ffc107',
                                  backgroundColor: '#fff3cd',
                                  borderRadius: '8px'
                                }}>
                                  <i className="fas fa-shield-alt text-warning me-2" style={{ fontSize: '1.1rem' }}></i>
                                  <div>
                                    <strong>⚠️ Requiere Safe Exam Browser</strong>
                                    <br />
                                    <small>Este examen se abrirá automáticamente en SEB para mayor seguridad.</small>
                                  </div>
                                </div>
                              )}
                              <button 
                                className="modern-btn modern-btn-primary w-100"
                                onClick={() => openExam(window.examId, window.id, token, window)}
                              >
                                <i className="fas fa-play me-2"></i>
                                {window.exam.tipo === 'programming' ? 'Programar' : 'Rendir Examen'}
                                {window.usaSEB && <i className="fas fa-shield-alt ms-2"></i>}
                              </button>
                            </div>
                          ) : timeStatus.text === 'Finalizado' ? (
                            <button className="modern-btn modern-btn-secondary w-100" disabled>
                              <i className="fas fa-flag-checkered me-2"></i>
                              Ventana Finalizada
                            </button>
                          ) : timeStatus.text === 'En curso' ? (
                            <button className="modern-btn modern-btn-warning w-100" disabled>
                              <i className="fas fa-clock me-2"></i>
                              En Curso
                            </button>
                          ) : (
                            <button 
                              className="modern-btn modern-btn-danger w-100"
                              onClick={() => handleCancelInscription(inscription)}
                              disabled={new Date() >= new Date(window.fechaInicio)}
                            >
                              <i className="fas fa-times me-2"></i>
                              Cancelar Inscripción
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
        isProcessing={modal.isProcessing}
        confirmText={modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
        cancelText="Cancelar"
      />
    </div>
  );
}