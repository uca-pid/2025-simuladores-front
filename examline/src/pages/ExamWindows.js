import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
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
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
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
        setExamWindows(windowsData);
      } else {
        console.error('Error cargando ventanas:', windowsRes.status, await windowsRes.text());
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showModal('error', 'Error', 'Error cargando los datos');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSaveWindow = async (e) => {
    e.preventDefault();
    
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
      cerrada_inscripciones: 'bg-warning',
      en_curso: 'bg-success',
      finalizada: 'bg-secondary'
    };
    
    const labels = {
      programada: 'Programada',
      cerrada_inscripciones: 'Cerrada',
      en_curso: 'En Curso',
      finalizada: 'Finalizada'
    };

    return (
      <span className={`badge ${badges[estado] || 'bg-secondary'}`}>
        {labels[estado] || estado}
      </span>
    );
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
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="page-title mb-1">
                <i className="fas fa-calendar-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                Ventanas de Examen
              </h1>
              <p className="page-subtitle mb-0">Gestiona los horarios y modalidades de tus exámenes</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={handleCreateWindow}
                disabled={exams.length === 0}
              >
                <i className="fas fa-plus me-2"></i>
                Nueva Ventana
              </button>
              <BackToMainButton />
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
            <div className="row g-4">
              {examWindows.map((window, index) => (
                <div key={window.id} className="col-lg-6 col-xl-4">
                  <div className={`exam-card fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="exam-card-header">
                      <h5 className="exam-title">{window.exam.titulo}</h5>
                      {getStatusBadge(window.estado)}
                    </div>
                    <div className="exam-card-body">
                      <div className="exam-info">
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
                        {window.notas && (
                          <div className="exam-info-item">
                            <i className="fas fa-sticky-note"></i>
                            <span>{window.notas}</span>
                          </div>
                        )}
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
                          <i className="fas fa-users"></i>
                          Inscripciones ({window.inscripciones.length})
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
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
                          fontSize: '0.9rem'
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
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
                          fontSize: '0.9rem'
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
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
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
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
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
                          border: '1px solid var(--border-color)',
                          padding: '0.6rem',
                          fontSize: '0.9rem'
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
                        // Auto-resize del textarea hasta el máximo, luego scroll
                        const maxHeight = 200;
                        e.target.style.height = 'auto';
                        const newHeight = Math.max(60, Math.min(maxHeight, e.target.scrollHeight));
                        e.target.style.height = newHeight + 'px';
                        e.target.style.overflowY = e.target.scrollHeight > maxHeight ? 'auto' : 'hidden';
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


