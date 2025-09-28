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
      
      // Cargar exámenes del profesor
      const examsRes = await fetch(`${API_BASE_URL}/exams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData);
      }

      // Cargar ventanas de examen
      const windowsRes = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (windowsRes.ok) {
        const windowsData = await windowsRes.json();
        setExamWindows(windowsData);
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

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Ventanas de Examen</h1>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success" 
            onClick={handleCreateWindow}
            disabled={exams.length === 0}
          >
            + Nueva Ventana
          </button>
          <BackToMainButton />
        </div>
      </div>

      {exams.length === 0 && (
        <div className="alert alert-info">
          Necesitas crear al menos un examen antes de poder programar ventanas.
        </div>
      )}

      {examWindows.length === 0 ? (
        <div className="alert alert-secondary">
          No hay ventanas programadas. Crea tu primera ventana de examen.
        </div>
      ) : (
        <div className="row">
          {examWindows.map(window => (
            <div key={window.id} className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{window.exam.titulo}</h6>
                  {getStatusBadge(window.estado)}
                </div>
                <div className="card-body">
                  <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                  <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                  <p><strong>Duración:</strong> {window.duracion} minutos</p>
                  <p><strong>Modalidad:</strong> {window.modalidad}</p>
                  <p><strong>Cupo:</strong> {window.inscripciones.length}/{window.cupoMaximo}</p>
                  {window.notas && <p><strong>Notas:</strong> {window.notas}</p>}
                  
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={window.activa}
                      onChange={() => handleToggleWindow(window.id, window.activa)}
                      id={`active-${window.id}`}
                    />
                    <label className="form-check-label" htmlFor={`active-${window.id}`}>
                      Ventana activa
                    </label>
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between">
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleEditWindow(window)}
                  >
                    Editar
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-info"
                    onClick={() => navigate(`/exam-windows/${window.id}/inscriptions`)}
                  >
                    Ver Inscripciones ({window.inscripciones.length})
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteWindow(window)}
                    disabled={window.inscripciones.length > 0}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear/editar ventana */}
      {showCreateModal && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingWindow ? 'Editar Ventana' : 'Nueva Ventana de Examen'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveWindow}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Examen *</label>
                    <select 
                      className="form-select" 
                      name="examId" 
                      value={formData.examId}
                      onChange={handleInputChange}
                      required
                      disabled={editingWindow} // No permitir cambiar examen al editar
                    >
                      <option value="">Selecciona un examen</option>
                      {exams.map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Fecha y Hora de Inicio *</label>
                    <input 
                      type="datetime-local" 
                      className="form-control"
                      name="fechaInicio"
                      value={formData.fechaInicio}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Duración (minutos) *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        name="duracion"
                        value={formData.duracion}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Cupo Máximo *</label>
                      <input 
                        type="number" 
                        className="form-control"
                        name="cupoMaximo"
                        value={formData.cupoMaximo}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Modalidad *</label>
                    <select 
                      className="form-select" 
                      name="modalidad" 
                      value={formData.modalidad}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="remoto">Remoto</option>
                      <option value="presencial">Presencial</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notas/Instrucciones</label>
                    <textarea 
                      className="form-control"
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Instrucciones adicionales para los estudiantes"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingWindow ? 'Actualizar' : 'Crear'} Ventana
                  </button>
                </div>
              </form>
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


