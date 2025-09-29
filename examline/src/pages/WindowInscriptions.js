import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
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

  const getWindowStatus = () => {
    if (!examWindow) return null;
    
    const now = new Date();
    const start = new Date(examWindow.fechaInicio);
    const end = new Date(start.getTime() + (examWindow.duracion * 60 * 1000));
    
    if (now < start) {
      return { text: 'Programada', class: 'bg-primary' };
    } else if (now >= start && now <= end) {
      return { text: 'En Curso', class: 'bg-success' };
    } else {
      return { text: 'Finalizada', class: 'bg-secondary' };
    }
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

  if (loading) return <div className="text-center mt-5">Cargando...</div>;

  if (!examWindow) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Ventana de examen no encontrada.
        </div>
        <BackToMainButton />
      </div>
    );
  }

  const status = getWindowStatus();
  const canManage = canManageAttendance();

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Inscripciones - {examWindow.exam.titulo}</h1>
        <BackToMainButton />
      </div>

      {/* Información de la ventana */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Información de la Ventana</h5>
          <span className={`badge ${status.class}`}>{status.text}</span>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Fecha:</strong> {new Date(examWindow.fechaInicio).toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {new Date(examWindow.fechaInicio).toLocaleTimeString()}</p>
              <p><strong>Duración:</strong> {examWindow.duracion} minutos</p>
            </div>
            <div className="col-md-6">
              <p><strong>Modalidad:</strong> {examWindow.modalidad}</p>
              <p><strong>Cupo:</strong> {inscriptions.length}/{examWindow.cupoMaximo}</p>
              <p><strong>Activa:</strong> {examWindow.activa ? 'Sí' : 'No'}</p>
            </div>
          </div>
          {examWindow.notas && (
            <div className="alert alert-info mt-2">
              <strong>Notas:</strong> {examWindow.notas}
            </div>
          )}
        </div>
      </div>

      {/* Controles de gestión */}
      {canManage && inscriptions.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h6>Gestión de Asistencia</h6>
            <p className="text-muted small">
              Marca a los estudiantes como presentes para habilitarlos a rendir el examen.
            </p>
            <button 
              className="btn btn-success"
              onClick={markAllPresent}
              disabled={inscriptions.every(i => i.presente === true)}
            >
              Marcar Todos como Presentes
            </button>
          </div>
        </div>
      )}

      {/* Lista de inscripciones */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Estudiantes Inscriptos ({inscriptions.length})
          </h5>
        </div>
        <div className="card-body">
          {inscriptions.length === 0 ? (
            <div className="alert alert-info">
              No hay estudiantes inscriptos en esta ventana.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Email</th>
                    <th>Fecha Inscripción</th>
                    {canManage && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map(inscription => (
                    <tr key={inscription.id}>
                      <td>{inscription.user.nombre}</td>
                      <td>{inscription.user.email}</td>
                      <td>{new Date(inscription.inscribedAt).toLocaleDateString()}</td>
                      {canManage && (
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className={`btn btn-sm ${inscription.presente === true ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                              disabled={inscription.presente === true}
                            >
                              Presente
                            </button>
                            <button 
                              className={`btn btn-sm ${inscription.presente === false ? 'btn-danger' : 'btn-outline-danger'}`}
                              onClick={() => handleAttendanceToggle(inscription.id, inscription.presente)}
                              disabled={inscription.presente === false}
                            >
                              Ausente
                            </button>
                          </div>
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