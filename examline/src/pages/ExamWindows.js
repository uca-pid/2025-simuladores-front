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
  const [, setIsAutoUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para mostrar modal
  const showModal = useCallback((type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
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
        // Actualizar directamente sin modales de cambio de estado
        setExamWindows(windowsData);
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
  }, [token, navigate, showModal]);

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
          // 🚀 CONFIGURACIÓN ULTRA-RÁPIDA (solo WebSocket)
          transports: ['websocket'], // Solo WebSocket para máxima velocidad
          upgrade: true,
          rememberUpgrade: true
        });

        // 🚀 Variables para medición de latencia
        let latencyStats = { min: Infinity, max: 0, avg: 0, measurements: [] };

        socket.on('connect', () => {
          console.log('� Conectado a WebSocket MILISEGUNDOS para tiempo real');
          setIsAutoUpdating(false);
          
          // Unirse a la sala del profesor
          socket.emit('join_professor_room');
          
          // Indicador de sistema de milisegundos activo
          console.log('⚡ Sistema MILISEGUNDOS: Latencia < 10ms activada');
        });

        socket.on('disconnect', () => {
          console.log('🔴 Desconectado de WebSocket');
        });

        // 🚀 Handler para payload optimizado (milisegundos)
        const triggerSilentRefresh = () => {
          // Pequeño guard para evitar muchas llamadas concurrentes
          if (triggerSilentRefresh.lock) return;
          triggerSilentRefresh.lock = true;
          Promise.resolve(loadData(true)).finally(() => {
            triggerSilentRefresh.lock = false;
          });
        };
        socket.on('su', (data) => { // 'su' = statusUpdate optimizado
          const receiveTime = Date.now();
          const latency = receiveTime - data.ts; // Calcular latencia real
          
          // Actualizar estadísticas de latencia
          if (latency < latencyStats.min) latencyStats.min = latency;
          if (latency > latencyStats.max) latencyStats.max = latency;
          latencyStats.measurements.push(latency);
          if (latencyStats.measurements.length > 10) {
            latencyStats.measurements.shift(); // Mantener solo últimas 10 mediciones
          }
          latencyStats.avg = latencyStats.measurements.reduce((a, b) => a + b, 0) / latencyStats.measurements.length;
          
          console.log(`⚡ CAMBIO MILISEGUNDOS recibido en ${latency}ms (promedio: ${latencyStats.avg.toFixed(1)}ms)`);
          
          if (data.t === 'sc' && data.c.length > 0) { // t=type, c=changes optimizado
            // Actualización ultra-optimizada con requestAnimationFrame
            requestAnimationFrame(() => {
              setExamWindows(prevWindows => {
                const updatedWindows = prevWindows.map(window => {
                  const change = data.c.find(c => c.i === window.id); // i=id optimizado
                  if (change) {
                    console.log(`🔄 Actualizando ventana ${window.id} → ${change.s} (${latency}ms)`);
                    return { ...window, estado: change.s }; // s=estado optimizado
                  }
                  return window;
                });
                return updatedWindows;
              });
            });

            // Notificaciones visuales desactivadas para cambios de estado automáticos
            setLastUpdate(new Date());
            // Refrescar en background para sincronizar conteos de inscripciones
            triggerSilentRefresh();
          }
        });

        // Mantener compatibilidad con formato anterior también
        socket.on('statusUpdate', (data) => {
          const receiveTime = Date.now();
          const latency = receiveTime - (data.ts || receiveTime); // Calcular latencia para formato legacy
          console.log('⚡ CAMBIO recibido (formato legacy):', data);
          
          if (data.type === 'status_change' && data.changes.length > 0) {
            // 🚀 Actualizar estados con rendering ultra-optimizado
            requestAnimationFrame(() => {
              setExamWindows(prevWindows => {
                const updatedWindows = prevWindows.map(window => {
                  const change = data.c.find(c => c.i === window.id); // i=id optimizado
                  if (change) {
                    console.log(`🔄 Actualizando ventana ${window.id} → ${change.s} (${latency}ms)`);
                    return { ...window, estado: change.s }; // s=estado optimizado
                  }
                  return window;
                });
                return updatedWindows;
              });
            });

            // Notificaciones visuales desactivadas para cambios de estado automáticos
            setLastUpdate(new Date());
            // Refrescar en background para sincronizar conteos de inscripciones
            triggerSilentRefresh();
          }
        });

        // 📣 Actualizaciones de inscripciones/cancelaciones (varios nombres posibles)
        const applyEnrollmentUpdate = (payload) => {
          const windowId = payload.windowId || payload.window_id || payload.id || payload.i;
          if (!windowId) return;
          requestAnimationFrame(() => {
            setExamWindows(prev => prev.map(w => {
              if (w.id !== windowId) return w;
              const updated = { ...w };
              if (Array.isArray(payload.inscripciones)) {
                updated.inscripciones = payload.inscripciones;
              } else {
                const count = payload.count ?? payload.inscritos ?? payload.inscritosCount ?? payload.enrolled;
                if (typeof count === 'number') updated.inscritosCount = count;
              }
              if (payload.estado) updated.estado = payload.estado;
              return updated;
            }));
          });
          setLastUpdate(new Date());
        };

        socket.on('inscriptions_changed', applyEnrollmentUpdate);
        socket.on('inscription_update', applyEnrollmentUpdate);
        socket.on('inscriptions_update', applyEnrollmentUpdate);
        socket.on('enrollment_update', applyEnrollmentUpdate);
        socket.on('iu', applyEnrollmentUpdate);
        socket.on('inscription_cancelled', applyEnrollmentUpdate);
        socket.on('enrollment_cancelled', applyEnrollmentUpdate);
        socket.on('ic', applyEnrollmentUpdate);

        // 🚀 Sistema de medición de latencia en tiempo real
        socket.on('latency_ping', (serverTime) => {
          // Responder inmediatamente para medir latencia
          socket.emit('ping', serverTime);
        });

        socket.on('pong', (data) => {
          const roundTripTime = Date.now() - data.clientTimestamp;
          console.log(`📊 Latencia RTT: ${roundTripTime}ms | Procesamiento servidor: ${data.processingTime.toFixed(2)}ms`);
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

  // Función auxiliar para convertir fecha a formato datetime-local manteniendo zona horaria local
  const formatDateTimeLocal = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditWindow = (window) => {
    setFormData({
      examId: window.examId,
      fechaInicio: formatDateTimeLocal(window.fechaInicio),
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
    
    // Si se está editando, el cupo no puede ser menor a los inscriptos activos actuales
    if (editingWindow) {
      const currentActive = typeof editingWindow?.inscritosCount === 'number'
        ? editingWindow.inscritosCount
        : (Array.isArray(editingWindow?.inscripciones)
            ? editingWindow.inscripciones.filter(i => i && (i.cancelledAt == null && i.canceledAt == null)).length
            : 0);
      const desiredCupo = typeof formData.cupoMaximo === 'number' ? formData.cupoMaximo : parseInt(formData.cupoMaximo, 10);
      if (!Number.isNaN(desiredCupo) && desiredCupo < currentActive) {
        errors.push(`El cupo máximo no puede ser menor que los inscriptos actuales (${currentActive}).`);
        fieldErrors.cupoMaximo = true;
      }
    }
    
    // Validar que la fecha no sea en el pasado
    if (formData.fechaInicio) {
      const fechaInicio = new Date(formData.fechaInicio);
      const ahora = new Date();
      // Permitir fecha pasada cuando se está editando una ventana EN CURSO
      const isEditingEnCurso = !!editingWindow && editingWindow.estado === 'en_curso';
      if (!isEditingEnCurso && fechaInicio <= ahora) {
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
      // Blindaje: si está en curso, no permitir modificar modalidad, cupo, hora de inicio
      const isEditingEnCurso = !!editingWindow && editingWindow.estado === 'en_curso';
      const payload = { ...formData };
      if (isEditingEnCurso) {
        payload.modalidad = editingWindow.modalidad;
        payload.cupoMaximo = editingWindow.cupoMaximo;
        // Mantener el mismo formato que el input (YYYY-MM-DDTHH:mm)
        payload.fechaInicio = formatDateTimeLocal(editingWindow.fechaInicio);
      }

      // Si se está editando y el nuevo cupo es exactamente igual a los inscriptos activos actuales,
      // cerrar inscripciones automáticamente (estado = cerrada_inscripciones)
      if (editingWindow && !isEditingEnCurso) {
        const currentActive = typeof editingWindow?.inscritosCount === 'number'
          ? editingWindow.inscritosCount
          : (Array.isArray(editingWindow?.inscripciones)
              ? editingWindow.inscripciones.filter(i => i && (i.cancelledAt == null && i.canceledAt == null)).length
              : 0);
        const desiredCupo = typeof payload.cupoMaximo === 'number' ? payload.cupoMaximo : parseInt(payload.cupoMaximo, 10);
        const startsAt = new Date(payload.fechaInicio);
        const now = new Date();
        if (!Number.isNaN(desiredCupo) && desiredCupo === currentActive) {
          payload.estado = 'cerrada_inscripciones';
        } else if (
          !Number.isNaN(desiredCupo) &&
          desiredCupo > currentActive &&
          editingWindow.estado === 'cerrada_inscripciones' &&
          now < startsAt
        ) {
          // Reabrir inscripciones si había estado cerrada, ampliaste cupo y aún no comenzó
          payload.estado = 'programada';
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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

  // Eliminado: handleDeleteWindow (se quitó el botón Eliminar de las cards)

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

  // Conteo robusto de inscriptos: prioriza 'inscritosCount' del backend o filtra inscripciones activas
  const getInscritosCount = (w) => {
    if (typeof w?.inscritosCount === 'number') return w.inscritosCount;
    if (Array.isArray(w?.inscripciones)) {
      return w.inscripciones.filter((i) => i && (i.cancelledAt == null && i.canceledAt == null)).length;
    }
    return 0;
  };

  // Tarjeta reutilizable para una ventana
  const renderWindowCard = (window, index) => (
    <div key={window.id} className="col-12 col-md-6 col-lg-6 col-xl-4 d-flex">
      {(() => {
        const statusStyles = {
          programada: {
            solid: 'var(--primary-color)',
            a: 'rgba(99, 102, 241, 0.12)',
            b: 'rgba(139, 92, 246, 0.18)'
          },
          cerrada_inscripciones: {
            solid: 'var(--warning-color)',
            a: 'rgba(245, 158, 11, 0.12)',
            b: 'rgba(245, 158, 11, 0.20)'
          },
          en_curso: {
            solid: 'var(--success-color)',
            a: 'rgba(16, 185, 129, 0.12)',
            b: 'rgba(16, 185, 129, 0.20)'
          },
          finalizada: {
            solid: '#cbd5e1',
            a: 'rgba(148, 163, 184, 0.10)',
            b: 'rgba(148, 163, 184, 0.18)'
          }
        };
        const st = statusStyles[window.estado] || statusStyles.programada;
        return (
          <div 
            className={`exam-card fade-in-up w-100`} 
            style={{
              animationDelay: `${index * 0.1}s`,
              minHeight: '520px',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: `4px solid ${st.solid}`
            }}
          >
            <div 
              className="exam-card-header"
              style={{
                background: `linear-gradient(135deg, ${st.a}, ${st.b})`
              }}
            >
            <h5 className="exam-title">
              {window.exam.titulo}
              {window.estado === 'en_curso' && <span className="status-pulse" />}
            </h5>
          {getStatusBadge(window.estado)}
            </div>
        <div className="exam-card-body" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div className="exam-info" style={{ flex: '1' }}>
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
            <div className="exam-info-item">
              <i className="fas fa-laptop"></i>
                <span><strong>Modalidad:</strong> {window.modalidad ? window.modalidad.charAt(0).toUpperCase() + window.modalidad.slice(1) : ''}</span>
            </div>
            <div className="exam-info-item">
              <i className="fas fa-users"></i>
                <span><strong>Inscritos:</strong> {getInscritosCount(window)}/{window.cupoMaximo}</span>
            </div>
            <div className="exam-info-item">
              <i className="fas fa-sticky-note"></i>
                <span className="me-2"><strong>Notas:</strong></span>
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
          <div className="exam-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {window.estado !== 'finalizada' && (
              <button 
                className="modern-btn modern-btn-secondary modern-btn-sm w-100"
                onClick={() => handleEditWindow(window)}
              >
                <i className="fas fa-edit"></i>
                Editar
              </button>
            )}
            <button 
              className="modern-btn modern-btn-secondary modern-btn-sm w-100"
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
          {/* Botón Eliminar removido según solicitud */}
            </div>
          </div>
        );
      })()}
    </div>
  );



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
              </h1>
              <p className="page-subtitle mb-0">
                Gestiona los horarios y modalidades de tus exámenes
                {lastUpdate && (
                  <span className="ms-2 text-muted" style={{ fontSize: '0.85em' }}>
                    • Última actualización: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="col-12 col-lg-4">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                <button 
                  className="modern-btn modern-btn-primary flex-fill flex-sm-grow-0" 
                  onClick={handleCreateWindow}
                  disabled={exams.length === 0}
                  style={
                    exams.length === 0
                      ? {
                          minWidth: '140px',
                          background: '#d1d5db',
                          borderColor: '#d1d5db',
                          color: '#6b7280',
                          cursor: 'not-allowed',
                          boxShadow: 'none',
                        }
                      : { minWidth: '140px' }
                  }
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

      {/* Aviso cuando no hay exámenes creados */}
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
                <small className="text-muted">Cerrada a inscripciones</small>
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
        </div>
      </div>

      {/* Secciones agrupadas */}
      {(() => {
        const enCurso = examWindows.filter(w => w.estado === 'en_curso');
        const programadasYCerradas = examWindows.filter(w => w.estado === 'programada' || w.estado === 'cerrada_inscripciones');
        const finalizadas = examWindows.filter(w => w.estado === 'finalizada');

        const total = examWindows.length;

        if (total === 0) {
          return (
            <div className="modern-card">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-window-restore me-2"></i>
                  Ventanas
                </h3>
              </div>
              <div className="modern-card-body">
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-calendar-plus"></i>
                  </div>
                  <h4 className="empty-title">No hay ventanas</h4>
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
              </div>
            </div>
          );
        }

        return (
          <>
            {/* En curso */}
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-play-circle me-2" style={{ color: 'var(--success-color)' }}></i>
                  En curso ({enCurso.length})
                </h3>
              </div>
              <div className="modern-card-body">
                {enCurso.length === 0 ? (
                  <p className="text-muted mb-0">No hay ventanas en curso.</p>
                ) : (
                  <div className="row g-4" style={{ alignItems: 'stretch' }}>
                    {enCurso.map((w, idx) => renderWindowCard(w, idx))}
                  </div>
                )}
              </div>
            </div>

            {/* Programadas y cerradas */}
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-calendar-check me-2" style={{ color: 'var(--primary-color)' }}></i>
                  Programadas y cerradas ({programadasYCerradas.length})
                </h3>
              </div>
              <div className="modern-card-body">
                {programadasYCerradas.length === 0 ? (
                  <p className="text-muted mb-0">No hay ventanas programadas o cerradas.</p>
                ) : (
                  <div className="row g-4" style={{ alignItems: 'stretch' }}>
                    {programadasYCerradas.map((w, idx) => renderWindowCard(w, idx))}
                  </div>
                )}
              </div>
            </div>

            {/* Finalizadas */}
            <div className="modern-card">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-flag-checkered me-2" style={{ color: 'var(--text-color-3)' }}></i>
                  Finalizadas ({finalizadas.length})
                </h3>
              </div>
              <div className="modern-card-body">
                {finalizadas.length === 0 ? (
                  <p className="text-muted mb-0">No hay ventanas finalizadas.</p>
                ) : (
                  <div className="row g-4" style={{ alignItems: 'stretch' }}>
                    {finalizadas.map((w, idx) => renderWindowCard(w, idx))}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

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
                        disabled={!!editingWindow && editingWindow.estado === 'en_curso'}
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
                        min={editingWindow
                          ? (typeof editingWindow?.inscritosCount === 'number'
                              ? editingWindow.inscritosCount
                              : (Array.isArray(editingWindow?.inscripciones)
                                  ? editingWindow.inscripciones.filter(i => i && (i.cancelledAt == null && i.canceledAt == null)).length
                                  : 1))
                          : 1}
                        required
                        disabled={!!editingWindow && editingWindow.estado === 'en_curso'}
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
                        disabled={!!editingWindow && editingWindow.estado === 'en_curso'}
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
  confirmText={'Aceptar'}
        cancelText="Cancelar"
      />
    </div>
  );
}


