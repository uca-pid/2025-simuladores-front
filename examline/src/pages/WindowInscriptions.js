import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function WindowInscriptionsPage() {
  const { windowId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [examWindow, setExamWindow] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
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
    console.log('WindowInscriptions - useEffect ejecutado');
    console.log('windowId:', windowId);
    console.log('user:', user);
    console.log('token:', token ? 'exists' : 'missing');
    
    if (!user || user.rol !== 'professor') {
      console.log('Usuario no es profesor, redirigiendo a /');
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

      // Cargar inscripciones
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        console.error('No token available in loadData');
        navigate('/login');
        return;
      }
      
      // Cargar información de la ventana
      const windowResponse = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (windowResponse.status === 401) {
        console.error('Token expirado en loadData');
        navigate('/login');
        return;
      }
      
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

      // Cargar inscripciones
      const inscriptionsResponse = await fetch(`${API_BASE_URL}/inscriptions/ventana/${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (inscriptionsResponse.status === 401) {
        console.error('Token expirado al cargar inscripciones');
        navigate('/login');
        return;
      }
      
      if (inscriptionsResponse.ok) {
        const inscriptionsData = await inscriptionsResponse.json();
        setInscriptions(inscriptionsData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
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

  const handleAttendanceToggle = async (inscriptionId, currentPresente) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inscriptions/${inscriptionId}/asistencia`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ presente: !currentPresente })
      });

      if (response.ok) {
        loadData(); // Recargar datos
      } else {
        showModal('error', 'Error', 'Error al cambiar asistencia');
      }
    } catch (error) {
      console.error('Error cambiando asistencia:', error);
      showModal('error', 'Error', 'Error de conexión');
    }
  };

  const markAllPresent = () => {
    showModal(
      'confirm',
      'Marcar todos como presentes',
      '¿Deseas marcar a todos los estudiantes inscriptos como presentes? Esto los habilitará para rendir el examen.',
      async () => {
        try {
          const updates = inscriptions
            .filter(inscription => inscription.presente !== true)
            .map(inscription => 
              fetch(`${API_BASE_URL}/inscriptions/${inscription.id}/asistencia`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ presente: true })
              })
            );

          await Promise.all(updates);
          showModal('success', '¡Éxito!', 'Todos los estudiantes han sido marcados como presentes');
          loadData();
        } catch (error) {
          console.error('Error marcando asistencias:', error);
          showModal('error', 'Error', 'Error al marcar asistencias');
        }
        closeModal();
      },
      true
    );
  };

  const canManageAttendance = () => {
    if (!examWindow) return false;
    
    const now = new Date();
    const start = new Date(examWindow.fechaInicio);
    const end = new Date(start.getTime() + (examWindow.duracion * 60 * 1000));
    
    // Permitir gestionar asistencia desde 30 minutos antes hasta el final
    const canManageFrom = new Date(start.getTime() - (30 * 60 * 1000));
    
    return now >= canManageFrom && now <= end;
  };

  const isExamFinished = () => {
    if (!examWindow) return false;
    
    const now = new Date();
    const start = new Date(examWindow.fechaInicio);
    const end = new Date(start.getTime() + (examWindow.duracion * 60 * 1000));
    
    return now > end;
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

  const canManage = canManageAttendance();
  const isFinished = isExamFinished();

  return (
    <div className="container py-5">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
            <div className="header-title-section">
              <h1 className="page-title mb-0 d-flex align-items-center flex-wrap">
                <i className="fas fa-users me-2 me-lg-3"></i>
                <span className="d-none d-sm-inline">Inscripciones - </span>
                <span className="text-truncate">{examWindow.exam.titulo}</span>
              </h1>
            </div>
            <div className="header-actions-section">
              <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-sm-auto">
                <button 
                  className="modern-btn modern-btn-secondary d-flex align-items-center justify-content-center" 
                  onClick={() => navigate('/exam-windows')}
                  title="Volver a Ventanas de Examen"
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  <span className="d-none d-sm-inline">Ventanas de Examen</span>
                  <span className="d-inline d-sm-none">Ventanas</span>
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
          <div className="row g-4">
            <div className="col-md-6">
              <div className="exam-info">
                <div className="exam-info-item">
                  <i className="fas fa-calendar"></i>
                  <span><strong>Fecha:</strong> {new Date(examWindow.fechaInicio).toLocaleDateString()}</span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-clock"></i>
                  <span><strong>Hora de inicio:</strong> {new Date(examWindow.fechaInicio).toLocaleTimeString()}</span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-hourglass-half"></i>
                  <span><strong>Duración:</strong> {examWindow.duracion} minutos</span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="exam-info">
                <div className="exam-info-item">
                  <i className="fas fa-laptop"></i>
                  <span><strong>Modalidad:</strong> {examWindow.modalidad?.charAt(0).toUpperCase() + examWindow.modalidad?.slice(1).toLowerCase()}</span>
                </div>
                <div className="exam-info-item">
                  <i className="fas fa-users"></i>
                  <span><strong>Inscritos:</strong> {inscriptions.length}/{examWindow.cupoMaximo}</span>
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

      {/* Controles de gestión */}
      {canManage && inscriptions.length > 0 && (
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-user-check me-2"></i>
              Gestión de Asistencia
            </h3>
          </div>
          <div className="modern-card-body">
            <p className="text-muted mb-3">
              <i className="fas fa-info-circle me-2"></i>
              Marca a los estudiantes como presentes para habilitarlos a rendir el examen.
            </p>
            <button 
              className="modern-btn modern-btn-primary"
              onClick={markAllPresent}
              disabled={inscriptions.every(i => i.presente === true)}
            >
              <i className="fas fa-user-check me-2"></i>
              Marcar Todos como Presentes
            </button>
          </div>
        </div>
      )}

      {/* Lista de inscripciones */}
      <div className="modern-card">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-user-graduate me-2"></i>
            Estudiantes Inscriptos ({inscriptions.length})
          </h3>
        </div>
        <div className="modern-card-body">
          {inscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-user-slash"></i>
              </div>
              <h4 className="empty-title">Sin inscripciones</h4>
              <p className="empty-subtitle">
                No hay estudiantes inscriptos en esta ventana de examen.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th scope="col">
                      <i className="fas fa-user me-2"></i>
                      Estudiante
                    </th>
                    <th scope="col">
                      <i className="fas fa-envelope me-2"></i>
                      Email
                    </th>
                    <th scope="col">
                      <i className="fas fa-calendar-plus me-2"></i>
                      Fecha Inscripción
                    </th>
                    {canManage && (
                      <th scope="col" className="text-center">
                        <i className="fas fa-tasks me-2"></i>
                        Acciones
                      </th>
                    )}
                    {isFinished && (
                      <th scope="col" className="text-center">
                        <i className="fas fa-user-check me-2"></i>
                        Asistencia
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((inscription, index) => (
                    <tr key={inscription.id} className={`fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                      <td className="fw-semibold">{inscription.user.nombre}</td>
                      <td className="text-muted">{inscription.user.email}</td>
                      <td>{new Date(inscription.inscribedAt).toLocaleDateString()}</td>
                      {canManage && (
                        <td className="text-center">
                          <div className="btn-group" role="group">
                            <button 
                              className={`modern-btn modern-btn-sm ${
                                inscription.presente === true ? 'modern-btn-primary' : 'modern-btn-secondary'
                              }`}
                              onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                              disabled={inscription.presente === true}
                            >
                              <i className="fas fa-check me-1"></i>
                              Presente
                            </button>
                            <button 
                              className={`modern-btn modern-btn-sm ${
                                inscription.presente === false ? 'modern-btn-danger' : 'modern-btn-secondary'
                              }`}
                              onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                              disabled={inscription.presente === false}
                            >
                              <i className="fas fa-times me-1"></i>
                              Ausente
                            </button>
                          </div>
                        </td>
                      )}
                      {isFinished && (
                        <td className="text-center">
                          <span className={`badge ${
                            inscription.presente === true ? 'badge-success' : 
                            inscription.presente === false ? 'badge-danger' : 
                            'badge-secondary'
                          }`}>
                            <i className={`fas me-1 ${
                              inscription.presente === true ? 'fa-check' : 
                              inscription.presente === false ? 'fa-times' : 
                              'fa-question'
                            }`}></i>
                            {inscription.presente === true ? 'Presente' : 
                             inscription.presente === false ? 'Ausente' : 
                             'Sin registrar'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  );
}