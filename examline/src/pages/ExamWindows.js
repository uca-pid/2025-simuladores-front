import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../button-styles.css';
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

export default function ExamWindowsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [examWindows, setExamWindows] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWindow, setEditingWindow] = useState(null);
  const [formData, setFormData] = useState({
    examId: '',
    fechaInicio: '',
    duracion: 120,
    modalidad: 'remoto',
    cupoMaximo: 30,
    notas: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para mostrar modal
  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  // Función para comparar estados y detectar cambios
  const checkForStatusChanges = useCallback((oldWindows, newWindows) => {
    const changes = [];
    
    newWindows.forEach(newWindow => {
      const oldWindow = oldWindows.find(w => w.id === newWindow.id);
      if (oldWindow && oldWindow.estado !== newWindow.estado) {
        changes.push({
          titulo: newWindow.exam.titulo,
          estadoAnterior: oldWindow.estado,
          estadoNuevo: newWindow.estado
        });
      }
    });
    
    if (changes.length > 0) {
      const changeDetails = changes.map(c => 
        `• ${c.titulo}: ${c.estadoAnterior} → ${c.estadoNuevo}`
      ).join('\n');
      
      showModal(
        'info',
        '🔄 Estados Actualizados Automáticamente',
        `Se detectaron cambios de estado:\n\n${changeDetails}`,
        null,
        false
      );
    }
  }, []);

  // Función para ajustar altura del textarea
  const adjustTextareaHeight = (textarea) => {
    if (!textarea) return;
    const maxHeight = 200;
    textarea.style.height = 'auto';
    const newHeight = Math.max(60, Math.min(maxHeight, textarea.scrollHeight));
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const loadData = useCallback(async (isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
      } else {
        setIsAutoUpdating(true);
      }
      
      if (!token) {
        console.error('No token available');
        navigate('/login');
        return;
      }
      
      // Cargar exámenes del profesor
      const examsRes = await fetch(`${API_BASE_URL}/exams`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (examsRes.status === 401) {
        console.error('Token expirado o inválido');
        navigate('/login');
        return;
      }
      
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData);
      } else {
        console.error('Error cargando exámenes:', examsRes.status, await examsRes.text());
      }

      // Cargar ventanas de examen
      const windowsRes = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (windowsRes.status === 401) {
        console.error('Token expirado o inválido al cargar ventanas');
        navigate('/login');
        return;
      }
      
      if (windowsRes.ok) {
        const windowsData = await windowsRes.json();
        
        // Solo mostrar notificación de cambios si es una actualización en segundo plano
        if (isBackgroundUpdate) {
          setExamWindows(prevWindows => {
            if (prevWindows.length > 0) {
              checkForStatusChanges(prevWindows, windowsData);
            }
            return windowsData;
          });
        } else {
          setExamWindows(windowsData);
        }
        
        setLastUpdate(new Date());
      } else {
        console.error('Error cargando ventanas:', windowsRes.status, await windowsRes.text());
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      if (!isBackgroundUpdate) {
        showModal('error', 'Error', 'Error cargando los datos');
      }
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
      } else {
        setIsAutoUpdating(false);
      }
    }
  }, [token, navigate, checkForStatusChanges]);

  // Verificar que es profesor y cargar datos iniciales
  useEffect(() => {
    if (!user || user.rol !== 'professor') {
      navigate('/');
      return;
    }
    loadData(false);
  }, [user, navigate, loadData]);

  // WebSocket para actualizaciones instantáneas en tiempo real
  useEffect(() => {
    if (!user || user.rol !== 'professor' || !token) {
      return;
    }

    let socket = null;
    let fallbackInterval = null;

    const initWebSocket = async () => {
      try {
        // Intentar importar socket.io-client dinámicamente
        const { io } = await import('socket.io-client');
        
        socket = io(API_BASE_URL, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
          console.log('🟢 Conectado a WebSocket para tiempo real');
          setIsAutoUpdating(false);
          
          // Unirse a la sala del profesor
          socket.emit('join_professor_room');
        });

        socket.on('disconnect', () => {
          console.log('🔴 Desconectado de WebSocket');
        });

        socket.on('statusUpdate', (data) => {
          console.log('⚡ CAMBIO INSTANTÁNEO recibido:', data);
          
          if (data.type === 'status_change' && data.changes.length > 0) {
            // Actualizar estados localmente de forma instantánea
            setExamWindows(prevWindows => {
              const updatedWindows = prevWindows.map(window => {
                const change = data.changes.find(c => c.id === window.id);
                if (change) {
                  console.log(`🔄 Actualizando ventana ${window.id}: ${change.estadoAnterior} → ${change.estadoNuevo}`);
                  return { ...window, estado: change.estadoNuevo };
                }
                return window;
              });
              return updatedWindows;
            });

            // Mostrar notificación
            const changeDetails = data.changes.map(c => 
              `• ${c.titulo}: ${c.estadoAnterior} → ${c.estadoNuevo}`
            ).join('\n');
            
            showModal(
              'success',
              '⚡ Estado Actualizado Instantáneamente',
              `Cambio automático en tiempo real:\n\n${changeDetails}`,
              null,
              false
            );
            
            setLastUpdate(new Date());
          }
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Error WebSocket:', error);
          startFallback();
        });

      } catch (error) {
        console.warn('⚠️ Socket.io-client no disponible, usando fallback');
        startFallback();
      }
    };

    const startFallback = () => {
      console.log('🔄 Iniciando modo fallback (polling cada 2 minutos)');
      setIsAutoUpdating(true);
      
      fallbackInterval = setInterval(() => {
        console.log('🔄 Fallback: verificando cambios...');
        loadData(true);
      }, 120000); // 2 minutos
    };

    // Inicializar WebSocket
    initWebSocket();

    // Cleanup
    return () => {
      if (socket) {
        console.log('🔌 Cerrando conexión WebSocket');
        socket.disconnect();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [user, token, loadData, showModal]);

  // Auto-actualización cada 30 segundos
  useEffect(() => {
    if (!user || user.rol !== 'professor' || !token) {
      return;
    }

    const interval = setInterval(() => {
      loadData(true); // Actualización en segundo plano
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [user, token, loadData]);

  // Ajustar textarea cuando se abre modal de edición
  useEffect(() => {
    if (showCreateModal && editingWindow) {
      // Usar setTimeout para asegurar que el DOM esté renderizado
      setTimeout(() => {
        const textarea = document.querySelector('textarea[name="notas"]');
        adjustTextareaHeight(textarea);
      }, 100);
    }
  }, [showCreateModal, editingWindow]);

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error de validación para este campo
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const resetForm = () => {
    setFormData({
      examId: '',
      fechaInicio: '',
      duracion: 120,
      modalidad: 'remoto',
      cupoMaximo: 30,
      notas: ''
    });
    setEditingWindow(null);
    setValidationErrors({});
  };

  const handleCreateWindow = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditWindow = (window) => {
    setFormData({
      examId: window.examId,
      fechaInicio: new Date(window.fechaInicio).toISOString().slice(0, 16),
      duracion: window.duracion,
      modalidad: window.modalidad,
      cupoMaximo: window.cupoMaximo,
      notas: window.notas || ''
    });
    setEditingWindow(window);
    setShowCreateModal(true);
  };

  const validateForm = () => {
    const errors = [];
    const fieldErrors = {};
    
    // Validar campos obligatorios
    if (!formData.examId) {
      errors.push('Debe seleccionar un examen');
      fieldErrors.examId = true;
    }
    
    if (!formData.fechaInicio) {
      errors.push('Debe seleccionar una fecha y hora de inicio');
      fieldErrors.fechaInicio = true;
    }
    
    if (!formData.duracion || formData.duracion <= 0) {
      errors.push('La duración debe ser mayor a 0 minutos');
      fieldErrors.duracion = true;
    }
    
    if (!formData.modalidad) {
      errors.push('Debe seleccionar una modalidad');
      fieldErrors.modalidad = true;
    }
    
    if (!formData.cupoMaximo || formData.cupoMaximo <= 0) {
      errors.push('El cupo máximo debe ser mayor a 0');
      fieldErrors.cupoMaximo = true;
    }
    
    // Validar que la fecha no sea en el pasado
    if (formData.fechaInicio) {
      const fechaInicio = new Date(formData.fechaInicio);
      const ahora = new Date();
      
      if (fechaInicio <= ahora) {
        errors.push('La fecha y hora de inicio debe ser en el futuro');
        fieldErrors.fechaInicio = true;
      }
    }
    
    setValidationErrors(fieldErrors);
    return errors;
  };

  const handleSaveWindow = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      showModal('error', 'Datos inválidos', validationErrors.join('\n'));
      return;
    }
    
    try {
      const url = editingWindow 
        ? `${API_BASE_URL}/exam-windows/${editingWindow.id}`
        : `${API_BASE_URL}/exam-windows`;
      
      const method = editingWindow ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showModal('success', '¡Éxito!', 
          `Ventana ${editingWindow ? 'actualizada' : 'creada'} correctamente`);
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        const errorData = await response.json();
        showModal('error', 'Error', errorData.error || 'Error al guardar la ventana');
      }
    } catch (error) {
      console.error('Error guardando ventana:', error);
      showModal('error', 'Error', 'Error de conexión');
    }
  };

  const handleToggleWindow = async (windowId, currentActive) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadData();
      } else {
        showModal('error', 'Error', 'Error al cambiar el estado de la ventana');
      }
    } catch (error) {
      console.error('Error en toggle:', error);
      showModal('error', 'Error', 'Error de conexión');
    }
  };

  const handleDeleteWindow = (window) => {
    showModal(
      'confirm',
      'Confirmar eliminación',
      `¿Seguro que deseas eliminar la ventana del ${new Date(window.fechaInicio).toLocaleString()}?`,
      async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/exam-windows/${window.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            showModal('success', '¡Éxito!', 'Ventana eliminada correctamente');
            loadData();
          } else {
            const errorData = await response.json();
            showModal('error', 'Error', errorData.error || 'Error al eliminar la ventana');
          }
        } catch (error) {
          console.error('Error eliminando ventana:', error);
          showModal('error', 'Error', 'Error de conexión');
        }
        closeModal();
      },
      true
    );
  };

  const getStatusBadge = (estado) => {
    const badges = {
      programada: 'bg-primary',
      cerrada_inscripciones: 'bg-warning text-dark',
      en_curso: 'bg-success',
      finalizada: 'bg-secondary'
    };
    
    const labels = {
      programada: '📅 Programada',
      cerrada_inscripciones: '🔒 Cerrada a Inscripciones',
      en_curso: '▶️ En Curso',
      finalizada: '✅ Finalizada'
    };

    return (
      <span className={`badge ${badges[estado] || 'bg-secondary'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  // Función para alternar inscripciones (abrir/cerrar)
  const handleToggleInscripciones = async (windowId, currentEstado) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/toggle-inscripciones`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        showModal('success', '¡Éxito!', result.message);
        loadData(); // Recargar datos
      } else {
        const errorData = await response.json();
        showModal('error', 'Error', errorData.error || 'Error al cambiar el estado de inscripciones');
      }
    } catch (error) {
      console.error('Error en toggle inscripciones:', error);
      showModal('error', 'Error', 'Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando ventanas de examen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="row align-items-center">
            <div className="col-12 col-lg-8 mb-3 mb-lg-0">
              <h1 className="page-title mb-1">
                <i className="fas fa-calendar-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                Ventanas de Examen
                {isAutoUpdating ? (
                  <span className="ms-2" style={{ fontSize: '0.6em' }}>
                    <i className="fas fa-exclamation-triangle text-warning" title="Modo fallback - Polling cada 2 min"></i>
                  </span>
                ) : (
                  <span className="ms-2" style={{ fontSize: '0.6em' }}>
                    <i className="fas fa-bolt text-success" title="⚡ Tiempo Real WebSocket"></i>
                  </span>
                )}
              </h1>
              <p className="page-subtitle mb-0">
                Gestiona los horarios y modalidades de tus exámenes
                <span className="ms-2 text-muted" style={{ fontSize: '0.85em' }}>
                  • {isAutoUpdating ? '🔄 Modo Fallback (Polling)' : '⚡ Tiempo Real Instantáneo'}
                  {lastUpdate && (
                    <span> • Última actualización: {lastUpdate.toLocaleTimeString()}</span>
                  )}
                </span>
              </p>
            </div>
            <div className="col-12 col-lg-4">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                <button 
                  className="modern-btn modern-btn-primary flex-fill flex-sm-grow-0" 
                  onClick={handleCreateWindow}
                  disabled={exams.length === 0}
                  style={{ minWidth: '140px' }}
                >
                  <i className="fas fa-plus me-2"></i>
                  Nueva Ventana
                </button>
                <div className="flex-fill flex-sm-grow-0">
                  <BackToMainButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {exams.length === 0 && (
        <div className="error-message mb-4">
          <i className="fas fa-info-circle"></i>
          Necesitas crear al menos un examen antes de poder programar ventanas.
        </div>
      )}

      {/* Panel informativo de estados */}
      <div className="modern-card mb-4">
        <div className="modern-card-body" style={{ padding: '1rem' }}>
          <h6 className="mb-3" style={{ color: 'var(--text-color-2)', fontWeight: '600' }}>
            <i className="fas fa-info-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
            Estados de las Ventanas de Examen
          </h6>
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-primary me-2">📅 Programada</span>
                <small className="text-muted">Abierta a inscripciones</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-warning text-dark me-2">🔒 Cerrada</span>
                <small className="text-muted">Sin nuevas inscripciones</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-success me-2">▶️ En Curso</span>
                <small className="text-muted">Examen en progreso</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-secondary me-2">✅ Finalizada</span>
                <small className="text-muted">Examen completado</small>
              </div>
            </div>
          </div>
          <div className="alert alert-light mt-3 mb-0" style={{ 
            fontSize: '0.85rem', 
            backgroundColor: 'rgba(13, 202, 240, 0.05)',
            border: '1px solid rgba(13, 202, 240, 0.1)',
            color: 'var(--text-color-2)'
          }}>
            <i className="fas fa-lightbulb me-2" style={{ color: 'var(--primary-color)' }}></i>
            <strong>Controles:</strong> Usa "Abrir/Cerrar" para controlar inscripciones manualmente.
            <br />
            <i className="fas fa-sync-alt me-2" style={{ color: 'var(--success-color)' }}></i>
            <strong>⚡ Tiempo Real:</strong> Los estados se actualizan instantáneamente via WebSocket cuando llegan a su fecha/hora programada. Sin esperas ni recargas manuales.
          </div>
        </div>
      </div>

      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-window-restore me-2"></i>
            Ventanas Programadas ({examWindows.length})
          </h3>
        </div>
        <div className="modern-card-body">
          {examWindows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-calendar-plus"></i>
              </div>
              <h4 className="empty-title">No hay ventanas programadas</h4>
              <p className="empty-subtitle">
                Crea tu primera ventana de examen para comenzar
              </p>
              {exams.length > 0 && (
                <button 
                  className="modern-btn modern-btn-primary"
                  onClick={handleCreateWindow}
                >
                  <i className="fas fa-plus me-2"></i>
                  Crear primera ventana
                </button>
              )}
            </div>
          ) : (
            <div className="row g-4" style={{ alignItems: 'stretch' }}>
              {examWindows.map((window, index) => (
                <div key={window.id} className="col-12 col-md-6 col-lg-6 col-xl-4 d-flex">
                  <div 
                    className={`exam-card fade-in-up w-100`} 
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      minHeight: '520px',
                      height: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div className="exam-card-header">
                      <h5 className="exam-title">{window.exam.titulo}</h5>
                      {getStatusBadge(window.estado)}
                    </div>
                    <div className="exam-card-body" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                      <div className="exam-info" style={{ flex: '1' }}>
                        <div className="exam-info-item">
                          <i className="fas fa-calendar"></i>
                          <span>{new Date(window.fechaInicio).toLocaleDateString()}</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-clock"></i>
                          <span>{new Date(window.fechaInicio).toLocaleTimeString()} - {window.duracion} min</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-laptop"></i>
                          <span>{window.modalidad}</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-users"></i>
                          <span>{window.inscripciones.length}/{window.cupoMaximo} inscritos</span>
                        </div>
                        <div className="exam-info-item">
                          <i className="fas fa-sticky-note"></i>
                          <span 
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxHeight: '5em',
                              lineHeight: '1.25em',
                              fontStyle: !window.notas ? 'italic' : 'normal',
                              color: !window.notas ? '#888' : 'inherit'
                            }}
                          >
                            {window.notas || 'No hay notas'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center justify-content-between mb-3 p-2" style={{ 
                        background: window.activa ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', 
                        border: '1px solid ' + (window.activa ? 'rgba(16, 185, 129, 0.2)' : 'rgba(156, 163, 175, 0.2)'),
                        borderRadius: '6px'
                      }}>
                        <div className="d-flex align-items-center gap-2">
                          <i className={window.activa ? "fas fa-toggle-on text-success" : "fas fa-toggle-off text-muted"}></i>
                          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                            {window.activa ? "Ventana Activa" : "Ventana Inactiva"}
                          </span>
                        </div>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={window.activa}
                            onChange={() => handleToggleWindow(window.id, window.activa)}
                            id={`active-${window.id}`}
                            style={{ transform: 'scale(1.1)' }}
                          />
                        </div>
                      </div>
                      
                      <div className="exam-actions">
                        {/* Botón para abrir/cerrar inscripciones - solo para estados programada/cerrada_inscripciones */}
                        {(['programada', 'cerrada_inscripciones'].includes(window.estado)) && (
                          <button 
                            className={`modern-btn modern-btn-sm ${
                              window.estado === 'programada' 
                                ? 'modern-btn-warning' 
                                : 'modern-btn-success'
                            }`}
                            onClick={() => handleToggleInscripciones(window.id, window.estado)}
                            title={
                              window.estado === 'programada' 
                                ? 'Cerrar inscripciones' 
                                : 'Abrir inscripciones'
                            }
                          >
                            <i className={`fas ${
                              window.estado === 'programada' 
                                ? 'fa-lock' 
                                : 'fa-unlock'
                            }`}></i>
                            {window.estado === 'programada' ? 'Cerrar' : 'Abrir'}
                          </button>
                        )}
                        
                        <button 
                          className="modern-btn modern-btn-secondary modern-btn-sm"
                          onClick={() => handleEditWindow(window)}
                        >
                          <i className="fas fa-edit"></i>
                          Editar
                        </button>
                        <button 
                          className="modern-btn modern-btn-secondary modern-btn-sm"
                          onClick={() => {
                            console.log('Navegando a inscripciones, windowId:', window.id);
                            console.log('Usuario actual:', user);
                            console.log('Token actual:', token ? 'exists' : 'missing');
                            navigate(`/exam-windows/${window.id}/inscriptions`);
                          }}
                        >
                          <i className="fas fa-info-circle"></i>
                          Información y Lista de Inscriptos
                        </button>
                      </div>
                      
                      <button 
                        className="modern-btn modern-btn-secondary modern-btn-sm w-100 mt-2"
                        onClick={() => handleDeleteWindow(window)}
                        disabled={window.inscripciones.length > 0}
                        style={{ 
                          color: 'var(--danger-color)', 
                          borderColor: 'var(--danger-color)',
                          opacity: window.inscripciones.length > 0 ? 0.5 : 1
                        }}
                      >
                        <i className="fas fa-trash"></i>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear/editar ventana */}
      {showCreateModal && (
        <div 
          className="modal-backdrop-fade" 
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal show" style={{ display: 'block' }}>
            <div 
              className="modal-dialog" 
              onClick={(e) => e.stopPropagation()}
              style={{ margin: '1rem auto', maxWidth: '900px', width: '90vw' }}
            >
              <div 
                className="modern-card" 
                style={{ border: 'none', borderRadius: '16px' }}
                onClick={(e) => e.stopPropagation()}
              >
              <div className="modern-card-header" style={{ 
                background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                borderRadius: '16px 16px 0 0',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h5 className="modern-card-title" style={{ color: 'white', margin: 0 }}>
                  <i className="fas fa-calendar-plus me-2"></i>
                  {editingWindow ? 'Editar Ventana' : 'Nueva Ventana de Examen'}
                </h5>
                <button 
                  type="button" 
                  className="modern-btn"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px'
                  }}
                  onClick={() => setShowCreateModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleSaveWindow} onClick={(e) => e.stopPropagation()}>
                <div className="modern-card-body" style={{ padding: '1.5rem' }}>
                  {/* Primera fila: Examen y Fecha */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-color-2)', 
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-file-alt text-primary"></i>
                        Examen *
                      </label>
                      <select 
                        className="form-select modern-input" 
                        name="examId" 
                        value={formData.examId}
                        onChange={handleInputChange}
                        required
                        disabled={editingWindow}
                        style={{
                          borderRadius: '8px',
                          border: `1px solid ${validationErrors.examId ? '#dc3545' : 'var(--border-color)'}`,
                          padding: '0.6rem',
                          fontSize: '0.9rem',
                          boxShadow: validationErrors.examId ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                        }}
                      >
                        <option value="">Selecciona un examen</option>
                        {exams.map(exam => (
                          <option key={exam.id} value={exam.id}>{exam.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-color-2)', 
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-calendar-day text-primary"></i>
                        Fecha y Hora de Inicio *
                      </label>
                      <input 
                        type="datetime-local" 
                        className="form-control modern-input"
                        name="fechaInicio"
                        value={formData.fechaInicio}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: '8px',
                          border: `1px solid ${validationErrors.fechaInicio ? '#dc3545' : 'var(--border-color)'}`,
                          padding: '0.6rem',
                          fontSize: '0.9rem',
                          boxShadow: validationErrors.fechaInicio ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Segunda fila: Duración, Cupo y Modalidad */}
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label" style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-color-2)', 
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-clock text-primary"></i>
                        Duración (min) *
                      </label>
                      <input 
                        type="number" 
                        className="form-control modern-input"
                        name="duracion"
                        value={formData.duracion}
                        onChange={handleInputChange}
                        min="1"
                        required
                        style={{
                          borderRadius: '8px',
                          border: `1px solid ${validationErrors.duracion ? '#dc3545' : 'var(--border-color)'}`,
                          padding: '0.6rem',
                          boxShadow: validationErrors.duracion ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-color-2)', 
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-users text-primary"></i>
                        Cupo Máximo *
                      </label>
                      <input 
                        type="number" 
                        className="form-control modern-input"
                        name="cupoMaximo"
                        value={formData.cupoMaximo}
                        onChange={handleInputChange}
                        min="1"
                        required
                        style={{
                          borderRadius: '8px',
                          border: `1px solid ${validationErrors.cupoMaximo ? '#dc3545' : 'var(--border-color)'}`,
                          padding: '0.6rem',
                          boxShadow: validationErrors.cupoMaximo ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-color-2)', 
                        marginBottom: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-laptop text-primary"></i>
                        Modalidad *
                      </label>
                      <select 
                        className="form-select modern-input" 
                        name="modalidad" 
                        value={formData.modalidad}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: '8px',
                          border: `1px solid ${validationErrors.modalidad ? '#dc3545' : 'var(--border-color)'}`,
                          padding: '0.6rem',
                          fontSize: '0.9rem',
                          boxShadow: validationErrors.modalidad ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                        }}
                      >
                        <option value="remoto">🌐 Remoto</option>
                        <option value="presencial">🏢 Presencial</option>
                      </select>
                    </div>
                  </div>

                  {/* Tercera fila: Notas */}
                  <div className="mb-3">
                    <label className="form-label" style={{ 
                      fontWeight: '600', 
                      color: 'var(--text-color-2)', 
                      marginBottom: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem'
                    }}>
                      <i className="fas fa-sticky-note text-primary"></i>
                      Notas/Instrucciones
                    </label>
                    <textarea 
                      className="form-control modern-input"
                      name="notas"
                      value={formData.notas}
                      onChange={(e) => {
                        handleInputChange(e);
                        adjustTextareaHeight(e.target);
                      }}
                      rows="2"
                      placeholder="Instrucciones adicionales para los estudiantes..."
                      style={{
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        resize: 'none',
                        minHeight: '60px',
                        maxHeight: '200px',
                        overflowY: 'hidden'
                      }}
                    />
                  </div>
                </div>
                <div className="modern-card-footer" style={{ 
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-color)',
                  background: '#fafbfc',
                  borderRadius: '0 0 16px 16px',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    type="button" 
                    className="modern-btn modern-btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                    style={{ minWidth: '120px' }}
                  >
                    <i className="fas fa-times me-2"></i>
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="modern-btn modern-btn-primary"
                    style={{ minWidth: '120px' }}
                  >
                    <i className={`fas ${editingWindow ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                    {editingWindow ? 'Actualizar' : 'Crear'} Ventana
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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
        confirmText={modal.type === 'confirm' ? 'Eliminar' : 'Aceptar'}
        cancelText="Cancelar"
      />
    </div>
  );
}


