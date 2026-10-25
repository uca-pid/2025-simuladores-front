import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AttemptsSidebar from '../components/AttemptsSidebar';
import ManualGradingModal from '../components/ManualGradingModal';
import BackToMainButton from '../components/BackToMainButton';
import Modal from '../components/Modal';
import MoodleIntegration from '../components/MoodleIntegration';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

// Página unificada de resultados/corrección de una ventana de examen: a la
// izquierda la lista de alumnos (AttemptsSidebar); a la derecha, según haya
// o no un attemptId en la URL, el detalle de corrección de ese alumno o el
// resumen de la ventana (info, publicar notas, sincronizar con Moodle).
export default function GradingPage() {
  const { windowId, attemptId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [examWindow, setExamWindow] = useState(null);
  const [loadingWindow, setLoadingWindow] = useState(true);

  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [showMoodleModal, setShowMoodleModal] = useState(false);
  const [modal, setModal] = useState({
    show: false, type: 'info', title: '', message: '', onConfirm: null, showCancel: false
  });

  const showModal = (type, title, message, onConfirm = null, showCancel = false) => {
    setModal({ show: true, type, title, message, onConfirm, showCancel });
  };
  const closeModal = () => setModal(prev => ({ ...prev, show: false }));

  // Info de la ventana (para el header y los botones de publicar/sincronizar)
  useEffect(() => {
    if (!user || user.rol !== 'professor') {
      navigate('/');
      return;
    }

    const loadWindowData = async () => {
      try {
        setLoadingWindow(true);
        const windowResponse = await fetch(`${API_BASE_URL}/exam-windows/profesor`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (windowResponse.ok) {
          const windows = await windowResponse.json();
          const foundWindow = windows.find(w => w.id === parseInt(windowId));
          if (foundWindow) {
            setExamWindow(foundWindow);
          } else {
            navigate('/exam-windows');
            return;
          }
        }
      } catch (error) {
        console.error('Error cargando datos de la ventana:', error);
      } finally {
        setLoadingWindow(false);
      }
    };

    loadWindowData();
  }, [user, navigate, windowId, token]);

  // Intentos de los alumnos (para la sidebar y el resumen)
  const loadAttempts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exam-attempts/window/${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAttempts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoadingAttempts(false);
    }
  }, [windowId, token]);

  useEffect(() => {
    if (!user || user.rol !== 'professor') return;
    loadAttempts();
  }, [user, loadAttempts]);

  const currentIndex = attempts.findIndex(a => String(a.id) === String(attemptId));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < attempts.length - 1;

  const goToAttempt = (id) => navigate(`/exam-windows/${windowId}/results/${id}`);
  const handleBack = () => navigate(`/exam-windows/${windowId}/results`);
  const handlePrev = () => hasPrev && goToAttempt(attempts[currentIndex - 1].id);
  const handleNext = () => hasNext && goToAttempt(attempts[currentIndex + 1].id);

  const confirmarPublicacion = async (publicar) => {
    const response = await fetch(`${API_BASE_URL}/exam-windows/${windowId}/publicar-notas`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notasPublicadas: publicar })
    });

    if (response.ok) {
      const data = await response.json();
      setExamWindow(prev => ({ ...prev, notasPublicadas: data.notasPublicadas }));
      showModal(
        'success',
        'Éxito',
        publicar ? 'Las notas han sido publicadas y son visibles para los estudiantes' : 'Las notas han sido ocultadas y no son visibles para los estudiantes'
      );
    } else {
      throw new Error('Error al actualizar publicación de notas');
    }
  };

  const handlePublicarNotas = async (publicar) => {
    if (isPublishing) return;
    try {
      setIsPublishing(true);
      await confirmarPublicacion(publicar);
    } catch (error) {
      console.error('Error:', error);
      showModal('error', 'Error', 'No se pudo actualizar la publicación de las notas');
    } finally {
      setIsPublishing(false);
    }
  };

  if (loadingWindow || loadingAttempts) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (!examWindow) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
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

  const intentosFinalizados = attempts.filter(a => a.estado === 'finalizado' || a.finishedAt);
  const sinCorregir = intentosFinalizados.filter(a => a.calificacionManual === null || a.calificacionManual === undefined);
  const tienePendientes = sinCorregir.length > 0;
  const noHayIntentos = intentosFinalizados.length === 0;
  const puedePublicar = examWindow?.notasPublicadas || (!tienePendientes && !noHayIntentos);
  const puedeSincronizar = !tienePendientes && !noHayIntentos;

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h1 className="page-title mb-1">
                <span className="title-text">Resultados - {examWindow.nombre}</span>
              </h1>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="modern-btn modern-btn-secondary modern-btn-sm"
                onClick={() => navigate(`/exam-windows?examId=${examWindow.examId}`)}
                title="Volver a Ventanas de Examen"
              >
                <i className="fas fa-arrow-left me-2"></i>
                <span className="btn-text">Ventanas de Examen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <AttemptsSidebar
          attempts={attempts}
          activeAttemptId={attemptId}
          onSelect={goToAttempt}
          notasPublicadas={examWindow?.notasPublicadas}
          puedePublicar={puedePublicar}
          puedeSincronizar={puedeSincronizar}
          tienePendientes={tienePendientes}
          sinCorregirCount={sinCorregir.length}
          isPublishing={isPublishing}
          onPublicarNotas={() => handlePublicarNotas(!examWindow?.notasPublicadas)}
          onSincronizarMoodle={() => setShowMoodleModal(true)}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {attemptId ? (
            <ManualGradingModal
              attemptId={attemptId}
              onBack={handleBack}
              onSave={loadAttempts}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          ) : (
            <div className="modern-card">
              <div className="modern-card-body">
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className={`fas ${attempts.length === 0 ? 'fa-clipboard-list' : 'fa-user-graduate'}`}></i>
                  </div>
                  <h4 className="empty-title">
                    {attempts.length === 0 ? 'Sin intentos finalizados' : 'Elegí un alumno para corregir'}
                  </h4>
                  <p className="empty-subtitle">
                    {attempts.length === 0
                      ? 'Aún no hay estudiantes que hayan completado este examen.'
                      : 'Seleccioná un alumno de la lista de la izquierda para ver o editar su corrección.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {showMoodleModal && (
        <>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', zIndex: 999, backdropFilter: 'blur(4px)'
          }} />
          <MoodleIntegration
            windowId={parseInt(windowId)}
            onClose={() => setShowMoodleModal(false)}
          />
        </>
      )}
    </div>
  );
}
