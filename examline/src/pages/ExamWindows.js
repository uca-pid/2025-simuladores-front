import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks';
import { getExams, getExamWindowsProfesor, createExamWindow, updateExamWindow, toggleExamWindowActive } from '../services/api';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../button-styles.css';
import './ExamWindows.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

const WINDOW_STATUS_STYLES = {
  programada: { solid: 'var(--primary-color)', a: 'rgba(99, 102, 241, 0.12)', b: 'rgba(139, 92, 246, 0.18)' },
  cerrada_inscripciones: { solid: 'var(--warning-color)', a: 'rgba(245, 158, 11, 0.12)', b: 'rgba(245, 158, 11, 0.20)' },
  en_curso: { solid: 'var(--success-color)', a: 'rgba(16, 185, 129, 0.12)', b: 'rgba(16, 185, 129, 0.20)' },
  finalizada: { solid: '#cbd5e1', a: 'rgba(148, 163, 184, 0.10)', b: 'rgba(148, 163, 184, 0.18)' }
};

function getEffectiveState(window) {
  return (window.sinTiempo && window.estado === 'programada') ? 'en_curso' : window.estado;
}

export default function ExamWindowsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopedExamId = searchParams.get('examId');
  const openCreateOnLoad = searchParams.get('openCreate') === '1';
  const { modal, showModal, closeModal } = useModal();
  const [examWindows, setExamWindows] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWindow, setEditingWindow] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [examFilterIds, setExamFilterIds] = useState(() => scopedExamId ? [scopedExamId] : []);
  const [examSearchInput, setExamSearchInput] = useState('');
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('week');
  const [formData, setFormData] = useState({
    examId: '',
    nombre: '',
    fechaInicio: '',
    duracion: 120,
    modalidad: 'remoto',
    cupoMaximo: 30,
    notas: '',
    usaSEB: false,
    kioskMode: 0,
    sinTiempo: false,
    requierePresente: false,
    // SEB Configuración
    sebKioskMode: 0,
    sebShowTaskBar: false,
    sebBrowserViewMode: 0,
    sebAllowAddressBar: false,
    sebEnableBrowserWindowToolbar: false,
    sebAllowQuit: true,
    sebAllowReload: true,
    sebAllowBrowsingBackForward: false,
    sebEnableEsc: false,
    sebEnableAltTab: false,
    sebEnableAltEsc: false,
    sebEnableAltF4: false,
    sebEnableStartMenu: false,
    sebEnableRightMouse: true,
    sebEnablePrintScreen: true,
    sebEnableFunctionKeys: true,
    sebEnableCtrlEsc: false,
    sebClipboardPolicy: 2,
    sebCreateNewDesktop: true,
    sebLockOnMessageSocketClose: true,
    sebAllowSwitchToApplications: false,
    sebAllowDeveloperConsole: false,
    sebAllowDownloads: true,
    sebAllowUploads: false,
    sebQuitUrl: 'https://ferocarcineto.com.ar/',
    sebQuitPassword: '12345',
    sebSettingsPassword: '12345'
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSavingWindow, setIsSavingWindow] = useState(false);
  const [, setIsAutoUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

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
      
      const examsData = await getExams();
      setExams(examsData);

      const windowsData = await getExamWindowsProfesor();
      setExamWindows(windowsData);
      setLastUpdate(new Date());
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

  useEffect(() => {
    if (!user || user.rol !== 'professor') {
      navigate('/');
      return;
    }
    loadData(false);
  }, [user, navigate, loadData]);

  // Atajo "Crear ventana de este examen" desde Mis Exámenes
  useEffect(() => {
    if (openCreateOnLoad && !loading && scopedExamId) {
      resetForm(scopedExamId);
      setShowCreateModal(true);
      searchParams.delete('openCreate');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateOnLoad, loading, scopedExamId]);

  // Auto-refresh periódico (reemplaza WebSocket eliminado)
  useEffect(() => {
    if (!user || user.rol !== 'professor' || !token) {
      return;
    }

    const interval = setInterval(() => {
      loadData(true);
    }, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, [user, token, loadData]);

  useEffect(() => {
    if (showCreateModal && editingWindow) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea[name="notas"]');
        adjustTextareaHeight(textarea);
      }, 100);
    }
  }, [showCreateModal, editingWindow]);

  // Bloquea el scroll de la página de fondo mientras el modal está abierto,
  // para que la rueda del mouse solo scrollee el contenido del modal
  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showCreateModal]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: inputValue }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const resetForm = (presetExamId = '') => {
    setFormData({
      examId: presetExamId,
      nombre: '',
      fechaInicio: '',
      duracion: 120,
      modalidad: 'remoto',
      cupoMaximo: 30,
      notas: '',
      usaSEB: false,
      kioskMode: 0,
      sinTiempo: false,
      requierePresente: false,
      // SEB Configuración
      sebKioskMode: 0,
      sebShowTaskBar: false,
      sebBrowserViewMode: 0,
      sebAllowAddressBar: false,
      sebEnableBrowserWindowToolbar: false,
      sebAllowQuit: true,
      sebAllowReload: true,
      sebAllowBrowsingBackForward: false,
      sebEnableEsc: false,
      sebEnableAltTab: false,
      sebEnableAltEsc: false,
      sebEnableAltF4: false,
      sebEnableStartMenu: false,
      sebEnableRightMouse: true,
      sebEnablePrintScreen: true,
      sebEnableFunctionKeys: true,
      sebEnableCtrlEsc: false,
      sebClipboardPolicy: 2,
      sebCreateNewDesktop: true,
      sebLockOnMessageSocketClose: true,
      sebAllowSwitchToApplications: false,
      sebAllowDeveloperConsole: false,
      sebAllowDownloads: true,
      sebAllowUploads: false,
      sebQuitUrl: 'https://ferocarcineto.com.ar/',
      sebQuitPassword: '12345',
      sebSettingsPassword: '12345'
    });
    setEditingWindow(null);
    setValidationErrors({});
    setIsSavingWindow(false);
  };

  const handleCreateWindow = () => {
    const presetExamId = examFilterIds.length === 1 ? examFilterIds[0] : (scopedExamId || '');
    resetForm(presetExamId);
    setShowCreateModal(true);
  };

  const handleSelectSlot = (slotInfo) => {
    if (exams.length === 0) return;
    resetForm(examFilterIds.length === 1 ? examFilterIds[0] : '');
    setFormData(prev => ({ ...prev, fechaInicio: formatDateTimeLocal(slotInfo.start) }));
    setShowCreateModal(true);
  };

  const handleSelectEvent = (event) => {
    handleEditWindow(event.resource);
  };

  const addExamFilter = (examId) => {
    setExamFilterIds(prev => prev.includes(String(examId)) ? prev : [...prev, String(examId)]);
  };

  const removeExamFilter = (examId) => {
    setExamFilterIds(prev => prev.filter(id => id !== String(examId)));
  };

  const filteredWindows = useMemo(() => {
    return examWindows
      .filter(w => examFilterIds.length === 0 || examFilterIds.includes(String(w.examId)))
      .filter(w => statusFilter.length === 0 || statusFilter.includes(getEffectiveState(w)));
  }, [examWindows, examFilterIds, statusFilter]);

  const toggleStatusFilter = (estado) => {
    setStatusFilter(prev => prev.includes(estado) ? prev.filter(s => s !== estado) : [...prev, estado]);
  };

  const STATUS_OPTIONS = [
    { key: 'programada', label: '📅 Programada', badgeClass: 'bg-primary' },
    { key: 'cerrada_inscripciones', label: '🔒 Cerrada', badgeClass: 'bg-warning text-dark' },
    { key: 'en_curso', label: '▶️ En Curso', badgeClass: 'bg-success' },
    { key: 'finalizada', label: '✅ Finalizada', badgeClass: 'bg-secondary' }
  ];

  const calendarEvents = useMemo(() => {
    return filteredWindows
      .filter(w => !w.sinTiempo && w.fechaInicio)
      .map(w => {
        const start = new Date(w.fechaInicio);
        const end = new Date(start.getTime() + ((w.duracion || 0) * 60 * 1000));
        return { id: w.id, title: `${w.nombre} · ${w.exam?.titulo || ''}`, start, end, resource: w };
      });
  }, [filteredWindows]);

  const sinTiempoWindows = useMemo(
    () => filteredWindows.filter(w => w.sinTiempo),
    [filteredWindows]
  );

  const pendingCorrectionWindows = useMemo(
    () => examWindows.filter(w => (w.pendientesCorreccionCount || 0) > 0),
    [examWindows]
  );

  const eventPropGetter = (event) => {
    const st = WINDOW_STATUS_STYLES[getEffectiveState(event.resource)] || WINDOW_STATUS_STYLES.programada;
    return {
      style: {
        backgroundColor: st.solid,
        borderColor: st.solid,
        borderRadius: '6px',
        color: '#fff'
      }
    };
  };

  const dayPreviewEvents = useMemo(() => {
    if (!formData.fechaInicio) return [];
    const selectedDay = new Date(formData.fechaInicio);
    const sameDay = (d) =>
      d.getFullYear() === selectedDay.getFullYear() &&
      d.getMonth() === selectedDay.getMonth() &&
      d.getDate() === selectedDay.getDate();

    const others = examWindows
      .filter(w => !w.sinTiempo && w.fechaInicio && (!editingWindow || w.id !== editingWindow.id))
      .filter(w => sameDay(new Date(w.fechaInicio)))
      .map(w => {
        const start = new Date(w.fechaInicio);
        const end = new Date(start.getTime() + ((w.duracion || 0) * 60 * 1000));
        return { id: w.id, title: `${w.nombre} · ${w.exam?.titulo || ''}`, start, end, isDraft: false };
      });

    const draftStart = selectedDay;
    const draftEnd = new Date(draftStart.getTime() + ((parseInt(formData.duracion, 10) || 0) * 60 * 1000));
    const draft = {
      id: 'draft',
      title: formData.nombre ? `${formData.nombre} (nueva)` : 'Nueva ventana',
      start: draftStart,
      end: draftEnd,
      isDraft: true
    };

    return [...others, draft];
  }, [formData.fechaInicio, formData.duracion, formData.nombre, examWindows, editingWindow]);

  const dayPreviewEventPropGetter = (event) => ({
    style: {
      backgroundColor: event.isDraft ? 'var(--primary-color)' : '#94a3b8',
      borderColor: event.isDraft ? 'var(--primary-color)' : '#94a3b8',
      borderRadius: '6px',
      color: '#fff',
      opacity: event.isDraft ? 1 : 0.75
    }
  });

  const formatDateTimeLocal = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const calculateEndTime = (startTime, duration) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (duration * 60 * 1000));
    return end.toLocaleTimeString();
  };

  const validateEndTimeNotPast = (startTime, duration) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (duration * 60 * 1000));
    const now = new Date();
    return end > now;
  };

  const handleEditWindow = (window) => {
    const isInfinite = window.sinTiempo || false;
    setFormData({
      examId: window.examId,
      nombre: window.nombre || '',
      fechaInicio: window.fechaInicio ? formatDateTimeLocal(window.fechaInicio) : '',
      duracion: window.duracion || 120,
      modalidad: window.modalidad,
      cupoMaximo: window.cupoMaximo,
      notas: window.notas || '',
      usaSEB: window.usaSEB || false,
      kioskMode: window.kioskMode || 0,
      sinTiempo: isInfinite,
      requierePresente: isInfinite ? false : (window.requierePresente || false),
      // SEB Configuración
      sebKioskMode: window.sebKioskMode ?? 0,
      sebShowTaskBar: window.sebShowTaskBar ?? false,
      sebBrowserViewMode: window.sebBrowserViewMode ?? 0,
      sebAllowAddressBar: window.sebAllowAddressBar ?? false,
      sebEnableBrowserWindowToolbar: window.sebEnableBrowserWindowToolbar ?? false,
      sebAllowQuit: window.sebAllowQuit ?? true,
      sebAllowReload: window.sebAllowReload ?? true,
      sebAllowBrowsingBackForward: window.sebAllowBrowsingBackForward ?? false,
      sebEnableEsc: window.sebEnableEsc ?? false,
      sebEnableAltTab: window.sebEnableAltTab ?? false,
      sebEnableAltEsc: window.sebEnableAltEsc ?? false,
      sebEnableAltF4: window.sebEnableAltF4 ?? false,
      sebEnableStartMenu: window.sebEnableStartMenu ?? false,
      sebEnableRightMouse: window.sebEnableRightMouse ?? true,
      sebEnablePrintScreen: window.sebEnablePrintScreen ?? true,
      sebEnableFunctionKeys: window.sebEnableFunctionKeys ?? true,
      sebEnableCtrlEsc: window.sebEnableCtrlEsc ?? false,
      sebClipboardPolicy: window.sebClipboardPolicy ?? 2,
      sebCreateNewDesktop: window.sebCreateNewDesktop ?? true,
      sebLockOnMessageSocketClose: window.sebLockOnMessageSocketClose ?? true,
      sebAllowSwitchToApplications: window.sebAllowSwitchToApplications ?? false,
      sebAllowDeveloperConsole: window.sebAllowDeveloperConsole ?? false,
      sebAllowDownloads: window.sebAllowDownloads ?? true,
      sebAllowUploads: window.sebAllowUploads ?? false,
      sebQuitUrl: window.sebQuitUrl ?? 'https://ferocarcineto.com.ar/',
      sebQuitPassword: window.sebQuitPassword ?? '12345',
      sebSettingsPassword: window.sebSettingsPassword ?? '12345'
    });
    setEditingWindow(window);
    setShowCreateModal(true);
  };

  const validateForm = () => {
    const errors = [];
    const fieldErrors = {};
    
    if (!formData.nombre || formData.nombre.trim() === '') {
      errors.push('Debe ingresar un nombre para la ventana');
      fieldErrors.nombre = true;
    }
    
    if (!formData.examId) {
      errors.push('Debe seleccionar un examen');
      fieldErrors.examId = true;
    }
    
    if (!formData.sinTiempo) {
      if (!formData.fechaInicio) {
        errors.push('Debe seleccionar una fecha y hora de inicio');
        fieldErrors.fechaInicio = true;
      }
      
      if (!formData.duracion || formData.duracion <= 0) {
        errors.push('La duración debe ser mayor a 0 minutos');
        fieldErrors.duracion = true;
      } else if (formData.duracion > 9999) {
        errors.push('La duración no puede ser mayor a 9999 minutos');
        fieldErrors.duracion = true;
      }
    }
    
    if (!formData.modalidad) {
      errors.push('Debe seleccionar una modalidad');
      fieldErrors.modalidad = true;
    }
    
    if (!formData.cupoMaximo || formData.cupoMaximo <= 0) {
      errors.push('El cupo máximo debe ser mayor a 0');
      fieldErrors.cupoMaximo = true;
    } else if (formData.cupoMaximo > 9999) {
      errors.push('El cupo máximo no puede ser mayor a 9999');
      fieldErrors.cupoMaximo = true;
    }
    
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
    
    if (!formData.sinTiempo && formData.fechaInicio) {
      const fechaInicio = new Date(formData.fechaInicio);
      const ahora = new Date();
      const isEditingEnCurso = !!editingWindow && editingWindow.estado === 'en_curso';
      if (!isEditingEnCurso && fechaInicio <= ahora) {
        errors.push('La fecha y hora de inicio debe ser en el futuro');
        fieldErrors.fechaInicio = true;
      }
      
      if (isEditingEnCurso && formData.duracion > 0) {
        if (!validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion)) {
          errors.push('La nueva duración resultaría en una hora de finalización que ya pasó');
          fieldErrors.duracion = true;
        }
      }
    }
    
    setValidationErrors(fieldErrors);
    return errors;
  };

  const handleSaveWindow = async (e) => {
    e.preventDefault();
    
    if (isSavingWindow) return;
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      showModal('error', 'Datos inválidos', validationErrors.join('\n'));
      return;
    }
    
    setIsSavingWindow(true);
    try {
      const isEditingEnCurso = !!editingWindow && editingWindow.estado === 'en_curso';
      const payload = { ...formData };
      
      if (isEditingEnCurso) {
        payload.modalidad = editingWindow.modalidad;
        payload.cupoMaximo = editingWindow.cupoMaximo;
        payload.fechaInicio = editingWindow.fechaInicio;
      }

      if (editingWindow && !isEditingEnCurso) {
        const currentActive = typeof editingWindow?.inscritosCount === 'number'
          ? editingWindow.inscritosCount
          : (Array.isArray(editingWindow?.inscripciones)
              ? editingWindow.inscripciones.filter(i => i && (i.cancelledAt == null && i.canceledAt == null)).length
              : 0);
        const desiredCupo = typeof payload.cupoMaximo === 'number' ? payload.cupoMaximo : parseInt(payload.cupoMaximo, 10);
        const startsAt = new Date(formData.fechaInicio);
        const now = new Date();
        if (!Number.isNaN(desiredCupo) && desiredCupo === currentActive) {
          payload.estado = 'cerrada_inscripciones';
        } else if (
          !Number.isNaN(desiredCupo) &&
          desiredCupo > currentActive &&
          editingWindow.estado === 'cerrada_inscripciones' &&
          (editingWindow.sinTiempo || now < startsAt)
        ) {
          payload.estado = 'programada';
        }

      }

      if (editingWindow) {
        await updateExamWindow(editingWindow.id, payload);
      } else {
        await createExamWindow(payload);
      }

      showModal('success', '¡Éxito!',
        `Ventana ${editingWindow ? 'actualizada' : 'creada'} correctamente`);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando ventana:', error);
      showModal('error', 'Error', error.message || 'Error de conexión');
    } finally {
      setIsSavingWindow(false);
    }
  };

  const handleToggleActive = async (windowId, currentActive) => {
    const action = currentActive ? 'desactivar' : 'activar';
    
    // Actualización optimista: actualiza UI inmediatamente
    setExamWindows(prev => prev.map(window => 
      window.id === windowId 
        ? { ...window, activa: !currentActive }
        : window
    ));
    
    try {
      const result = await toggleExamWindowActive(windowId);
      // Confirma el cambio con los datos del servidor
      setExamWindows(prev => prev.map(window =>
        window.id === windowId
          ? { ...window, activa: result.window.activa }
          : window
      ));
    } catch (error) {
      // Revierte el cambio optimista si hay error
      setExamWindows(prev => prev.map(window => 
        window.id === windowId 
          ? { ...window, activa: currentActive }
          : window
      ));
      console.error(`Error ${action}ndo ventana:`, error);
      showModal('error', 'Error', 'Error de conexión');
    }
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

  const getInscritosCount = (w) => {
    if (typeof w?.inscritosCount === 'number') return w.inscritosCount;
    if (Array.isArray(w?.inscripciones)) {
      return w.inscripciones.filter((i) => i && (i.cancelledAt == null && i.canceledAt == null)).length;
    }
    return 0;
  };

  const handleCopyCode = async (windowId, codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedCodeId(windowId);
      setTimeout(() => setCopiedCodeId((current) => (current === windowId ? null : current)), 1500);
    } catch (error) {
      console.error('No se pudo copiar el código:', error);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando ventanas de examen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-windows-header">
            <div className="header-content-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-calendar-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Ventanas de Examen</span>
              </h1>
              <p className="page-subtitle mb-0">
                Gestiona los horarios y modalidades de tus exámenes
                {lastUpdate && (
                  <span className="ms-2 text-muted update-time">
                    • Última actualización: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="header-actions-section">
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                <button
                  className="modern-btn modern-btn-primary modern-btn-sm"
                  onClick={handleCreateWindow}
                  disabled={exams.length === 0}
                  style={
                    exams.length === 0
                      ? {
                          background: '#d1d5db',
                          borderColor: '#d1d5db',
                          color: '#6b7280',
                          cursor: 'not-allowed',
                          boxShadow: 'none',
                        }
                      : {}
                  }
                >
                  <i className="fas fa-plus me-2"></i>
                  <span className="btn-text">Nueva Ventana</span>
                </button>
                <BackToMainButton className="modern-btn modern-btn-secondary modern-btn-sm" />
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

      {pendingCorrectionWindows.length > 0 && (
        <div className="modern-card mb-4" style={{ borderLeft: '4px solid var(--warning-color)' }}>
          <div className="modern-card-body d-flex flex-wrap align-items-center gap-3">
            <div style={{ fontSize: '1.5rem', color: 'var(--warning-color)' }}>
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="flex-grow-1">
              <strong>Pendientes de corrección ({pendingCorrectionWindows.length})</strong>
              <div className="d-flex flex-wrap gap-2 mt-2">
                {pendingCorrectionWindows.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className="modern-btn modern-btn-secondary modern-btn-sm"
                    onClick={() => navigate(`/exam-windows/${w.id}/results`)}
                  >
                    {w.nombre} · {w.exam?.titulo}
                    <span className="badge bg-warning text-dark ms-2">{w.pendientesCorreccionCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="modern-card mb-4 filter-bar-card">
        <div className="modern-card-body">
          <div className="row g-3 align-items-start">
            <div className="col-md-7">
              <h6 className="panel-title mb-2">
                <i className="fas fa-filter me-2" style={{ color: 'var(--primary-color)' }}></i>
                Exámenes
              </h6>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="form-control modern-input filter-dropdown-toggle d-flex justify-content-between align-items-center"
                  style={{ borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', background: 'white' }}
                  onClick={() => setExamDropdownOpen(prev => !prev)}
                >
                  <span className="text-truncate">
                    {examFilterIds.length === 0
                      ? 'Todos los exámenes'
                      : examFilterIds.length === 1
                        ? (exams.find(e => String(e.id) === String(examFilterIds[0]))?.titulo || '1 examen')
                        : `${examFilterIds.length} exámenes seleccionados`}
                  </span>
                  <i className={`fas fa-chevron-${examDropdownOpen ? 'up' : 'down'} ms-2`}></i>
                </button>
                {examDropdownOpen && (
                  <>
                  <div
                    onClick={() => setExamDropdownOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                  />
                  <div
                    className="modern-card"
                    style={{
                      position: 'absolute', top: 'calc(100% + 0.25rem)', left: 0, right: 0, zIndex: 10,
                      border: '1px solid var(--border-color)',
                      transition: 'none',
                      transform: 'none'
                    }}
                  >
                    <div className="p-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        autoFocus
                        className="form-control form-control-sm"
                        placeholder="Buscar examen..."
                        value={examSearchInput}
                        onChange={(e) => setExamSearchInput(e.target.value)}
                      />
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {examFilterIds.length > 0 && (
                        <button
                          type="button"
                          className="w-100 text-start"
                          style={{ background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: '600' }}
                          onClick={() => setExamFilterIds([])}
                        >
                          <i className="fas fa-times me-2"></i>
                          Ver todos
                        </button>
                      )}
                      {exams
                        .filter(e => e.titulo.toLowerCase().includes(examSearchInput.trim().toLowerCase()))
                        .map(exam => {
                          const checked = examFilterIds.includes(String(exam.id));
                          return (
                            <button
                              key={exam.id}
                              type="button"
                              className="w-100 text-start d-flex align-items-center gap-2 filter-dropdown-option"
                              style={{ background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}
                              onClick={() => checked ? removeExamFilter(exam.id) : addExamFilter(exam.id)}
                            >
                              <input type="checkbox" readOnly checked={checked} />
                              <span>{exam.titulo}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-md-5">
              <h6 className="panel-title mb-2">
                <i className="fas fa-info-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
                Estados
              </h6>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="form-control modern-input filter-dropdown-toggle d-flex justify-content-between align-items-center"
                  style={{ borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', background: 'white' }}
                  onClick={() => setStatusDropdownOpen(prev => !prev)}
                >
                  <span className="text-truncate">
                    {statusFilter.length === 0
                      ? 'Todos los estados'
                      : `${statusFilter.length} estado(s) seleccionados`}
                  </span>
                  <i className={`fas fa-chevron-${statusDropdownOpen ? 'up' : 'down'} ms-2`}></i>
                </button>
                {statusDropdownOpen && (
                  <>
                  <div
                    onClick={() => setStatusDropdownOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                  />
                  <div
                    className="modern-card"
                    style={{
                      position: 'absolute', top: 'calc(100% + 0.25rem)', left: 0, right: 0, zIndex: 10,
                      border: '1px solid var(--border-color)',
                      transition: 'none',
                      transform: 'none'
                    }}
                  >
                    {statusFilter.length > 0 && (
                      <button
                        type="button"
                        className="w-100 text-start"
                        style={{ background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: '600' }}
                        onClick={() => setStatusFilter([])}
                      >
                        <i className="fas fa-times me-2"></i>
                        Ver todos
                      </button>
                    )}
                    {STATUS_OPTIONS.map(opt => {
                      const checked = statusFilter.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className="w-100 text-start d-flex align-items-center gap-2 filter-dropdown-option"
                          style={{ background: 'none', border: 'none', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
                          onClick={() => toggleStatusFilter(opt.key)}
                        >
                          <input type="checkbox" readOnly checked={checked} />
                          <span className={`badge ${opt.badgeClass}`}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-3">
          <div className="modern-card h-100">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-infinity me-2" style={{ color: 'var(--primary-color)' }}></i>
                Sin horario fijo ({sinTiempoWindows.length})
              </h3>
            </div>
            <div className="modern-card-body">
              {sinTiempoWindows.length === 0 ? (
                <small className="text-muted">No hay ventanas sin horario fijo.</small>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '580px', overflowY: 'auto' }}>
                  {sinTiempoWindows.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      className="w-100 text-start"
                      style={{
                        background: 'none',
                        border: `1px solid ${WINDOW_STATUS_STYLES[getEffectiveState(w)].solid}`,
                        borderRadius: '8px',
                        padding: '0.5rem 0.65rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleEditWindow(w)}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{w.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{w.exam?.titulo}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="modern-card">
            <div className="modern-card-body" style={{ height: '650px' }}>
              <Calendar
                localizer={localizer}
                culture="es"
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                date={calendarDate}
                onNavigate={setCalendarDate}
                view={calendarView}
                onView={setCalendarView}
                views={['month', 'week', 'day']}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
                style={{ height: '100%' }}
                messages={{
                  next: 'Sig.',
                  previous: 'Ant.',
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  noEventsInRange: 'No hay ventanas en este rango de fechas.'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div 
          className="modal-backdrop-fade"
        >
          <div className="modal show" style={{ display: 'block' }}>
            <div
              className="modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ margin: '1rem auto', maxWidth: '900px', width: '90vw', maxHeight: 'calc(100vh - 2rem)' }}
            >
              <div
                className="modern-card"
                style={{ border: 'none', borderRadius: '16px', maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modern-card-header" style={{
                  background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
                  borderRadius: '16px 16px 0 0',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0
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
                <form onSubmit={handleSaveWindow} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                  <div className="modern-card-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    
                    {/* Nombre de la Ventana */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <label className="form-label" style={{ 
                          fontWeight: '600', 
                          color: 'var(--text-color-2)', 
                          marginBottom: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem'
                        }}>
                          <i className="fas fa-tag text-primary"></i>
                          Nombre de la Ventana *
                        </label>
                        <input 
                          type="text" 
                          className="form-control modern-input"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          placeholder="Ej: Turno Mañana, Grupo A, Recuperatorio, 1er Parcial, etc."
                          required
                          disabled={isSavingWindow}
                          style={{
                            borderRadius: '8px',
                            border: `1px solid ${validationErrors.nombre ? '#dc3545' : 'var(--border-color)'}`,
                            padding: '0.6rem',
                            fontSize: '0.9rem',
                            boxShadow: validationErrors.nombre ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                          }}
                        />
                        <small className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-info-circle me-1"></i>
                          Nombre descriptivo para identificar esta ventana de examen
                        </small>
                      </div>
                    </div>

                    {/* Selección de Examen */}
                    <div className="row mb-4">
                      <div className="col-12">
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
                          disabled={editingWindow || isSavingWindow || !!scopedExamId}
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
                            <option key={exam.id} value={exam.id}>{exam.titulo} (ID: {exam.id})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Selector de seguridad SEB */}
                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-color-2)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Seguridad de la ventana
                      </label>
                      <div className="d-flex gap-2" role="radiogroup" aria-label="Seguridad de la ventana">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!formData.usaSEB}
                          onClick={() => setFormData(prev => ({ ...prev, usaSEB: false, kioskMode: 0 }))}
                          disabled={isSavingWindow || (!!editingWindow && editingWindow.estado === 'en_curso')}
                          className="flex-fill text-start p-2"
                          style={{
                            background: !formData.usaSEB ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                            border: '1.5px solid ' + (!formData.usaSEB ? 'var(--primary-color)' : 'var(--border-color)'),
                            borderRadius: '8px',
                            cursor: isSavingWindow ? 'not-allowed' : 'pointer',
                            color: !formData.usaSEB ? 'var(--primary-color)' : 'var(--text-color-3)',
                          }}
                        >
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            <i className="fas fa-globe"></i>
                            Estándar
                          </div>
                          <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Cualquier navegador web</small>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={formData.usaSEB}
                          onClick={() => setFormData(prev => ({ ...prev, usaSEB: true, kioskMode: 1 }))}
                          disabled={isSavingWindow || (!!editingWindow && editingWindow.estado === 'en_curso')}
                          className="flex-fill text-start p-2"
                          style={{
                            background: formData.usaSEB ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                            border: '1.5px solid ' + (formData.usaSEB ? 'var(--primary-color)' : 'var(--border-color)'),
                            borderRadius: '8px',
                            cursor: isSavingWindow ? 'not-allowed' : 'pointer',
                            color: formData.usaSEB ? 'var(--primary-color)' : 'var(--text-color-3)',
                          }}
                        >
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            <i className="fas fa-shield-alt"></i>
                            Con SEB
                          </div>
                          <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Requiere Safe Exam Browser instalado</small>
                        </button>
                      </div>
                    </div>

                    {/* Selector de modo kiosco - Solo visible cuando SEB está activado */}
                    {formData.usaSEB && (
                      <div className="mb-4">
                        <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-color-2)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                          Modo de pantalla
                        </label>
                        <div className="d-flex gap-2" role="radiogroup" aria-label="Modo de pantalla">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={!formData.kioskMode}
                            onClick={() => setFormData(prev => ({ ...prev, kioskMode: 0 }))}
                            disabled={!!editingWindow && editingWindow.estado === 'en_curso'}
                            className="flex-fill text-start p-2"
                            style={{
                              background: !formData.kioskMode ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                              border: '1.5px solid ' + (!formData.kioskMode ? 'var(--primary-color)' : 'var(--border-color)'),
                              borderRadius: '8px',
                              cursor: 'pointer',
                              color: !formData.kioskMode ? 'var(--primary-color)' : 'var(--text-color-3)',
                            }}
                          >
                            <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                              <i className="fas fa-laptop"></i>
                              Normal
                            </div>
                            <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>El alumno ve la barra de tareas</small>
                          </button>

                          <button
                            type="button"
                            role="radio"
                            aria-checked={!!formData.kioskMode}
                            onClick={() => setFormData(prev => ({ ...prev, kioskMode: 1 }))}
                            disabled={!!editingWindow && editingWindow.estado === 'en_curso'}
                            className="flex-fill text-start p-2"
                            style={{
                              background: formData.kioskMode ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                              border: '1.5px solid ' + (formData.kioskMode ? 'var(--primary-color)' : 'var(--border-color)'),
                              borderRadius: '8px',
                              cursor: 'pointer',
                              color: formData.kioskMode ? 'var(--primary-color)' : 'var(--text-color-3)',
                            }}
                          >
                            <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                              <i className="fas fa-desktop"></i>
                              Pantalla Completa
                            </div>
                            <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Sin barra de tareas</small>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Configuración avanzada de SEB */}
                    {formData.usaSEB && (
                      <div className="mb-4">
                        <div className="card" style={{ 
                          backgroundColor: '#f8f9fa', 
                          borderColor: '#e9ecef',
                          borderWidth: '2px'
                        }}>
                          <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div>
                                <label className="form-check-label mb-0" style={{ fontWeight: '600', fontSize: '1rem' }}>
                                  <i className="fas fa-cogs text-primary me-2"></i>
                                  Configuración Avanzada de SEB
                                </label>
                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>
                                  Opciones adicionales de seguridad y comportamiento
                                </div>
                              </div>
                              <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>
                                <i className="fas fa-sliders-h"></i>
                              </div>
                            </div>

                            {/* Navegación */}
                            <div className="mb-3">
                              <h6 style={{ color: 'var(--text-color-2)', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                <i className="fas fa-share-alt me-2"></i>Navegación
                              </h6>
                              <div className="row">
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowQuit" name="sebAllowQuit" checked={formData.sebAllowQuit} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowQuit">Permitir salir de SEB</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowReload" name="sebAllowReload" checked={formData.sebAllowReload} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowReload">Permitir recargar página</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowBrowsingBackForward" name="sebAllowBrowsingBackForward" checked={formData.sebAllowBrowsingBackForward} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowBrowsingBackForward">Permitir atrás/adelante</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowAddressBar" name="sebAllowAddressBar" checked={formData.sebAllowAddressBar} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowAddressBar">Mostrar barra de direcciones</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Teclado */}
                            <div className="mb-3">
                              <h6 style={{ color: 'var(--text-color-2)', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                <i className="fas fa-keyboard me-2"></i>Teclado
                              </h6>
                              <div className="row">
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableEsc" name="sebEnableEsc" checked={formData.sebEnableEsc} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableEsc">Habilitar Esc</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableAltTab" name="sebEnableAltTab" checked={formData.sebEnableAltTab} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableAltTab">Habilitar Alt+Tab</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableAltEsc" name="sebEnableAltEsc" checked={formData.sebEnableAltEsc} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableAltEsc">Habilitar Alt+Esc</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableAltF4" name="sebEnableAltF4" checked={formData.sebEnableAltF4} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableAltF4">Habilitar Alt+F4</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableStartMenu" name="sebEnableStartMenu" checked={formData.sebEnableStartMenu} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableStartMenu">Habilitar menú inicio</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableCtrlEsc" name="sebEnableCtrlEsc" checked={formData.sebEnableCtrlEsc} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableCtrlEsc">Habilitar Ctrl+Esc</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableRightMouse" name="sebEnableRightMouse" checked={formData.sebEnableRightMouse} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableRightMouse">Habilitar clic derecho</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnablePrintScreen" name="sebEnablePrintScreen" checked={formData.sebEnablePrintScreen} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnablePrintScreen">Habilitar Print Screen</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebEnableFunctionKeys" name="sebEnableFunctionKeys" checked={formData.sebEnableFunctionKeys} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebEnableFunctionKeys">Habilitar teclas F1-F12</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Seguridad */}
                            <div className="mb-3">
                              <h6 style={{ color: 'var(--text-color-2)', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                <i className="fas fa-shield-alt me-2"></i>Seguridad
                              </h6>
                              <div className="row">
                                <div className="col-md-6 mb-2">
                                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Política de portapapeles</label>
                                  <select className="form-select form-select-sm" name="sebClipboardPolicy" value={formData.sebClipboardPolicy} onChange={handleInputChange}>
                                    <option value={0}>Permitir todo</option>
                                    <option value={1}>Bloquear entrada</option>
                                    <option value={2}>Bloquear todo</option>
                                  </select>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check mt-4">
                                    <input className="form-check-input" type="checkbox" id="sebCreateNewDesktop" name="sebCreateNewDesktop" checked={formData.sebCreateNewDesktop} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebCreateNewDesktop">Crear nuevo escritorio</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebLockOnMessageSocketClose" name="sebLockOnMessageSocketClose" checked={formData.sebLockOnMessageSocketClose} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebLockOnMessageSocketClose">Bloquear al cerrar conexión</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowSwitchToApplications" name="sebAllowSwitchToApplications" checked={formData.sebAllowSwitchToApplications} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowSwitchToApplications">Permitir cambiar aplicaciones</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowDeveloperConsole" name="sebAllowDeveloperConsole" checked={formData.sebAllowDeveloperConsole} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowDeveloperConsole">Permitir consola de desarrollo</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Archivos */}
                            <div className="mb-3">
                              <h6 style={{ color: 'var(--text-color-2)', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                <i className="fas fa-file-alt me-2"></i>Archivos
                              </h6>
                              <div className="row">
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowDownloads" name="sebAllowDownloads" checked={formData.sebAllowDownloads} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowDownloads">Permitir descargas</label>
                                  </div>
                                </div>
                                <div className="col-md-6 mb-2">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="sebAllowUploads" name="sebAllowUploads" checked={formData.sebAllowUploads} onChange={handleInputChange} />
                                    <label className="form-check-label" htmlFor="sebAllowUploads">Permitir subir archivos</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* URLs y contraseñas */}
                            <div className="mb-2">
                              <h6 style={{ color: 'var(--text-color-2)', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>
                                <i className="fas fa-link me-2"></i>URLs y Contraseñas
                              </h6>
                              <div className="row">
                                <div className="col-12 mb-2">
                                  <label className="form-label" style={{ fontSize: '0.85rem' }}>URL de salida (al salir de SEB)</label>
                                  <input type="text" className="form-control form-control-sm" name="sebQuitUrl" value={formData.sebQuitUrl} onChange={handleInputChange} placeholder="https://..." />
                                </div>
                                <div className="col-md-6 mb-2">
                                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Contraseña de salida</label>
                                  <input type="text" className="form-control form-control-sm" name="sebQuitPassword" value={formData.sebQuitPassword} onChange={handleInputChange} />
                                </div>
                                <div className="col-md-6 mb-2">
                                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Contraseña de configuración</label>
                                  <input type="text" className="form-control form-control-sm" name="sebSettingsPassword" value={formData.sebSettingsPassword} onChange={handleInputChange} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selector de tipo de ventana */}
                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-color-2)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Tipo de ventana
                      </label>
                      <div className="d-flex gap-2" role="radiogroup" aria-label="Tipo de ventana">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!formData.sinTiempo}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, sinTiempo: false }));
                            setValidationErrors(prev => ({ ...prev, sinTiempo: false, fechaInicio: false, duracion: false }));
                          }}
                          disabled={isSavingWindow || (!!editingWindow && (editingWindow.estado === 'en_curso' || editingWindow.estado === 'finalizada'))}
                          className="flex-fill text-start p-2"
                          style={{
                            background: !formData.sinTiempo ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                            border: '1.5px solid ' + (!formData.sinTiempo ? 'var(--primary-color)' : 'var(--border-color)'),
                            borderRadius: '8px',
                            cursor: isSavingWindow ? 'not-allowed' : 'pointer',
                            color: !formData.sinTiempo ? 'var(--primary-color)' : 'var(--text-color-3)',
                          }}
                        >
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            <i className="fas fa-clock"></i>
                            Horario específico
                          </div>
                          <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Fecha, hora y duración definidas</small>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={formData.sinTiempo}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, sinTiempo: true }));
                            setValidationErrors(prev => ({ ...prev, sinTiempo: false, fechaInicio: false, duracion: false }));
                          }}
                          disabled={isSavingWindow || (!!editingWindow && (editingWindow.estado === 'en_curso' || editingWindow.estado === 'finalizada'))}
                          className="flex-fill text-start p-2"
                          style={{
                            background: formData.sinTiempo ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                            border: '1.5px solid ' + (formData.sinTiempo ? 'var(--primary-color)' : 'var(--border-color)'),
                            borderRadius: '8px',
                            cursor: isSavingWindow ? 'not-allowed' : 'pointer',
                            color: formData.sinTiempo ? 'var(--primary-color)' : 'var(--text-color-3)',
                          }}
                        >
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                            <i className="fas fa-infinity"></i>
                            Sin límite de tiempo
                          </div>
                          <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>Activa sin horarios específicos</small>
                        </button>
                      </div>
                    </div>

                    {/* Configuración de horarios */}
                    {!formData.sinTiempo && (
                      <div className="mb-4">
                        <h6 style={{ color: 'var(--text-color-2)', marginBottom: '1rem', fontWeight: '600' }}>
                          <i className="fas fa-clock text-primary me-2"></i>
                          Configuración de Horarios
                        </h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
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
                              required={!formData.sinTiempo}
                              disabled={isSavingWindow || (!!editingWindow && editingWindow.estado === 'en_curso')}
                              style={{
                                borderRadius: '8px',
                                border: `1px solid ${validationErrors.fechaInicio ? '#dc3545' : 'var(--border-color)'}`,
                                padding: '0.6rem',
                                fontSize: '0.9rem',
                                boxShadow: validationErrors.fechaInicio ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                              }}
                            />
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label" style={{ 
                              fontWeight: '600', 
                              color: 'var(--text-color-2)', 
                              marginBottom: '0.4rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.9rem'
                            }}>
                              <i className="fas fa-hourglass-half text-primary"></i>
                              Duración (minutos) *
                            </label>
                            <input 
                              type="number" 
                              className="form-control modern-input"
                              name="duracion"
                              value={formData.duracion}
                              onChange={handleInputChange}
                              min="1"
                              max="9999"
                              required={!formData.sinTiempo}
                              disabled={isSavingWindow}
                              style={{
                                borderRadius: '8px',
                                border: `1px solid ${validationErrors.duracion ? '#dc3545' : 'var(--border-color)'}`,
                                padding: '0.6rem',
                                boxShadow: validationErrors.duracion ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                                fontSize: '0.9rem'
                              }}
                            />
                            {editingWindow && editingWindow.estado === 'en_curso' && formData.duracion && (
                              <div className="mt-2 p-2" style={{
                                backgroundColor: validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion) ? '#e3f2fd' : '#ffebee',
                                borderRadius: '6px',
                                border: `1px solid ${validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion) ? '#2196f3' : '#f44336'}`
                              }}>
                                <small style={{ color: validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion) ? '#1565c0' : '#c62828' }}>
                                  <i className={`fas me-1 ${validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion) ? 'fa-info-circle' : 'fa-exclamation-triangle'}`}></i>
                                  <strong>
                                    {validateEndTimeNotPast(editingWindow.fechaInicio, formData.duracion) 
                                      ? 'Nueva hora de finalización:' 
                                      : 'ADVERTENCIA - Hora ya pasada:'}
                                  </strong> {calculateEndTime(editingWindow.fechaInicio, formData.duracion)}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>

                        {formData.fechaInicio && (
                          <div className="mt-3">
                            <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-color-2)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                              <i className="fas fa-calendar-day text-primary me-2"></i>
                              Vista del día
                            </label>
                            <div className="modern-card" style={{ height: '220px', padding: '0.5rem' }}>
                              <Calendar
                                localizer={localizer}
                                culture="es"
                                events={dayPreviewEvents}
                                startAccessor="start"
                                endAccessor="end"
                                date={new Date(formData.fechaInicio)}
                                view="day"
                                toolbar={false}
                                eventPropGetter={dayPreviewEventPropGetter}
                                style={{ height: '100%' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Configuración general */}
                    <div className="mb-4">
                      <h6 style={{ color: 'var(--text-color-2)', marginBottom: '1rem', fontWeight: '600' }}>
                        <i className="fas fa-cog text-primary me-2"></i>
                        Configuración General
                      </h6>
                      <div className="row">
                        <div className="col-md-6 mb-3">
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
                            max="9999"
                            required
                            disabled={isSavingWindow || (!!editingWindow && editingWindow.estado === 'en_curso')}
                            style={{
                              borderRadius: '8px',
                              border: `1px solid ${validationErrors.cupoMaximo ? '#dc3545' : 'var(--border-color)'}`,
                              padding: '0.6rem',
                              boxShadow: validationErrors.cupoMaximo ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
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
                            disabled={isSavingWindow || (!!editingWindow && editingWindow.estado === 'en_curso')}
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
                    </div>

                    {/* Notas adicionales */}
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
                        Notas/Instrucciones Adicionales
                      </label>
                      <textarea 
                        className="form-control modern-input"
                        name="notas"
                        value={formData.notas}
                        onChange={(e) => {
                          handleInputChange(e);
                          adjustTextareaHeight(e.target);
                        }}
                        rows="3"
                        placeholder={formData.sinTiempo 
                          ? "Instrucciones especiales para la ventana sin tiempo (opcional)..." 
                          : "Instrucciones adicionales para los estudiantes (opcional)..."
                        }
                        disabled={isSavingWindow}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
                          fontSize: '0.9rem',
                          resize: 'none',
                          minHeight: '80px',
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
                    justifyContent: 'flex-end',
                    flexShrink: 0
                  }}>
                    {editingWindow && (
                      <button
                        type="button"
                        className="modern-btn modern-btn-secondary"
                        onClick={() => navigate(`/exam-windows/${editingWindow.id}/results`)}
                      >
                        <i className="fas fa-trophy me-2"></i>
                        Ver Resultados / Corregir
                      </button>
                    )}
                    <button
                      type="submit"
                      className="modern-btn modern-btn-primary"
                      style={{ minWidth: '120px' }}
                      disabled={isSavingWindow}
                    >
                      {isSavingWindow ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                          <span>{editingWindow ? 'Actualizando...' : 'Creando...'}</span>
                        </>
                      ) : (
                        <>
                          <i className={`fas ${editingWindow ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                          {editingWindow ? 'Actualizar' : 'Crear'} Ventana
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

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