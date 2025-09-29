import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

export default function StudentInscriptionsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [availableWindows, setAvailableWindows] = useState([]);
  const [myInscriptions, setMyInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available' o 'myInscriptions'
  const [filters, setFilters] = useState({
    materia: '',
    profesor: '',
    fecha: ''
  });
  const [modal, setModal] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  // Verificar que es estudiante
  useEffect(() => {
    if (!user || user.rol !== 'student') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAvailableWindows(), loadMyInscriptions()]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showModal('error', 'Error', 'Error cargando los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableWindows = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.materia) queryParams.append('materia', filters.materia);
      if (filters.profesor) queryParams.append('profesor', filters.profesor);
      if (filters.fecha) queryParams.append('fecha', filters.fecha);

      const response = await fetch(`${API_BASE_URL}/exam-windows/disponibles?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableWindows(data);
      }
    } catch (error) {
      console.error('Error cargando ventanas disponibles:', error);
    }
  };

  const loadMyInscriptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inscriptions/mis-inscripciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyInscriptions(data);
      }
    } catch (error) {
      console.error('Error cargando mis inscripciones:', error);
    }
  };

  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    loadAvailableWindows();
  };

  const clearFilters = () => {
    setFilters({ materia: '', profesor: '', fecha: '' });
    setTimeout(() => loadAvailableWindows(), 100);
  };

  const handleInscription = (window) => {
    showModal(
      'confirm',
      'Confirmar Inscripción',
      `¿Deseas inscribirte al examen "${window.exam.titulo}" programado para el ${new Date(window.fechaInicio).toLocaleString()}?`,
      async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/inscriptions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ examWindowId: window.id })
          });

          if (response.ok) {
            showModal('success', '¡Éxito!', 'Te has inscrito correctamente al examen');
            loadData(); // Recargar ambas listas
          } else {
            const errorData = await response.json();
            showModal('error', 'Error', errorData.error || 'Error al inscribirse');
          }
        } catch (error) {
          console.error('Error en inscripción:', error);
          showModal('error', 'Error', 'Error de conexión');
        }
        closeModal();
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
        }
        closeModal();
      },
      true
    );
  };

  const canTakeExam = (inscription) => {
    const window = inscription.examWindow;
    const now = new Date();
    const windowStart = new Date(window.fechaInicio);
    const windowEnd = new Date(windowStart.getTime() + (window.duracion * 60 * 1000));
    
    return now >= windowStart && now <= windowEnd && 
           window.estado === 'en_curso' && inscription.presente === true;
  };

  const getTimeStatus = (fechaInicio, duracion) => {
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

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Inscripciones a Exámenes</h1>
        <BackToMainButton />
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            Exámenes Disponibles ({availableWindows.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'myInscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('myInscriptions')}
          >
            Mis Inscripciones ({myInscriptions.length})
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === 'available' && (
        <div>
          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">Filtros de Búsqueda</h6>
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Materia</label>
                  <input 
                    type="text" 
                    className="form-control"
                    name="materia"
                    value={filters.materia}
                    onChange={handleFilterChange}
                    placeholder="Buscar por materia"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Profesor</label>
                  <input 
                    type="text" 
                    className="form-control"
                    name="profesor"
                    value={filters.profesor}
                    onChange={handleFilterChange}
                    placeholder="Buscar por profesor"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Fecha</label>
                  <input 
                    type="date" 
                    className="form-control"
                    name="fecha"
                    value={filters.fecha}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="col-md-3 d-flex align-items-end gap-2">
                  <button 
                    className="btn btn-primary"
                    onClick={applyFilters}
                  >
                    Filtrar
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de exámenes disponibles */}
          {availableWindows.length === 0 ? (
            <div className="alert alert-info">
              No hay exámenes disponibles para inscripción en este momento.
            </div>
          ) : (
            <div className="row">
              {availableWindows.map(window => {
                const timeStatus = getTimeStatus(window.fechaInicio, window.duracion);
                return (
                  <div key={window.id} className="col-md-6 col-lg-4 mb-3">
                    <div className="card h-100">
                      <div className="card-header">
                        <h6 className="mb-0">{window.exam.titulo}</h6>
                        <small className="text-muted">Prof. {window.exam.profesor.nombre}</small>
                      </div>
                      <div className="card-body">
                        <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                        <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                        <p><strong>Duración:</strong> {window.duracion} minutos</p>
                        <p><strong>Modalidad:</strong> {window.modalidad}</p>
                        <p><strong>Cupos:</strong> {window.cupoDisponible}/{window.cupoMaximo} disponibles</p>
                        <p className={timeStatus.class}><strong>{timeStatus.text}</strong></p>
                        {window.notas && (
                          <div className="alert alert-light">
                            <small><strong>Notas:</strong> {window.notas}</small>
                          </div>
                        )}
                      </div>
                      <div className="card-footer">
                        {window.yaInscrito ? (
                          <button className="btn btn-success" disabled>
                            Ya inscrito ✓
                          </button>
                        ) : window.cupoDisponible === 0 ? (
                          <button className="btn btn-secondary" disabled>
                            Sin cupo
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleInscription(window)}
                          >
                            Inscribirse
                          </button>
                        )}
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
          {myInscriptions.length === 0 ? (
            <div className="alert alert-info">
              No tienes inscripciones activas. Ve a la pestaña "Exámenes Disponibles" para inscribirte.
            </div>
          ) : (
            <div className="row">
              {myInscriptions.map(inscription => {
                const window = inscription.examWindow;
                const timeStatus = getTimeStatus(window.fechaInicio, window.duracion);
                const canTake = canTakeExam(inscription);
                
                return (
                  <div key={inscription.id} className="col-md-6 col-lg-4 mb-3">
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between">
                        <div>
                          <h6 className="mb-0">{window.exam.titulo}</h6>
                          <small className="text-muted">Prof. {window.exam.profesor.nombre}</small>
                        </div>
                        {inscription.presente === true && (
                          <span className="badge bg-success">Habilitado</span>
                        )}
                      </div>
                      <div className="card-body">
                        <p><strong>Fecha:</strong> {new Date(window.fechaInicio).toLocaleDateString()}</p>
                        <p><strong>Hora:</strong> {new Date(window.fechaInicio).toLocaleTimeString()}</p>
                        <p><strong>Duración:</strong> {window.duracion} minutos</p>
                        <p><strong>Modalidad:</strong> {window.modalidad}</p>
                        <p className={timeStatus.class}><strong>{timeStatus.text}</strong></p>
                        <p><strong>Inscrito:</strong> {new Date(inscription.inscribedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="card-footer d-flex gap-2">
                        {canTake ? (
                          <button 
                            className="btn btn-success flex-fill"
                            onClick={() => navigate(`/exam-attempt/${window.examId}?windowId=${window.id}`)}
                          >
                            Rendir Examen
                          </button>
                        ) : timeStatus.text === 'Finalizado' ? (
                          <button className="btn btn-secondary flex-fill" disabled>
                            Examen Finalizado
                          </button>
                        ) : (
                          <button 
                            className="btn btn-outline-danger flex-fill"
                            onClick={() => handleCancelInscription(inscription)}
                            disabled={new Date() >= new Date(window.fechaInicio)}
                          >
                            Cancelar Inscripción
                          </button>
                        )}
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
        confirmText={modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
        cancelText="Cancelar"
      />
    </div>
  );
}