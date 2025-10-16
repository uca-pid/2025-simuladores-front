import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

export default function SEBExamLauncher() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [examLaunched, setExamLaunched] = useState(false);
  
  const examId = searchParams.get('examId');
  const windowId = searchParams.get('windowId');
  const examType = searchParams.get('examType');

  useEffect(() => {
    // Lanzar SEB automáticamente al cargar la página
    const launchSEB = async () => {
      try {
        // Generar el .seb en el backend
        const res = await fetch(
          `${API_BASE_URL}/exam-start/download/${examId}/${windowId}/${token}`
        );
        const data = await res.json();

        if (!data.sebUrl) {
          console.error("No se pudo generar el .seb");
          return;
        }

        // Crear un <a> invisible con seb:// y hacer click
        const link = document.createElement("a");
        link.href = data.sebUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setExamLaunched(true);
      } catch (error) {
        console.error("Error generando o abriendo el .seb:", error);
      }
    };

    if (examId && windowId && token) {
      launchSEB();
    }
  }, [examId, windowId, token]);

  const handleReturnToInscriptions = () => {
    // Limpiar la bandera de SEB abierto
    sessionStorage.removeItem('openedSEB');
    // Volver a mis inscripciones
    navigate('/student-exam');
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           padding: '2rem'
         }}>
      <div className="modern-card" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="modern-card-body text-center p-5">
          {/* Ícono principal */}
          <div className="mb-4">
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '3rem', color: 'white' }}></i>
            </div>
          </div>

          {/* Título */}
          <h2 className="mb-3" style={{ 
            color: 'var(--text-color-2)', 
            fontWeight: 'bold',
            fontSize: '1.8rem'
          }}>
            Examen en Safe Exam Browser
          </h2>

          {/* Estado de lanzamiento */}
          {!examLaunched ? (
            <>
              <div className="mb-4">
                <div className="modern-spinner mb-3"></div>
                <p className="text-muted mb-0">
                  Abriendo Safe Exam Browser...
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Mensaje principal */}
              <div className="alert alert-info d-flex align-items-start mb-4" style={{
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <i className="fas fa-info-circle text-primary me-3" style={{ fontSize: '1.5rem', marginTop: '0.2rem' }}></i>
                <div className="text-start">
                  <h5 className="mb-2" style={{ color: '#1565c0', fontWeight: '600' }}>
                    Safe Exam Browser se está abriendo
                  </h5>
                  <p className="mb-0" style={{ color: '#1976d2', fontSize: '0.95rem' }}>
                    Tu examen se abrirá automáticamente en Safe Exam Browser. 
                    Si no se abre automáticamente, verifica que tengas SEB instalado correctamente.
                  </p>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="mb-4">
                <h5 className="mb-3" style={{ color: 'var(--text-color-2)', fontWeight: '600' }}>
                  📋 Instrucciones Importantes
                </h5>
                <div className="text-start">
                  <div className="mb-3 p-3" style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div className="d-flex align-items-start mb-2">
                      <i className="fas fa-check-circle text-success me-2" style={{ marginTop: '0.2rem' }}></i>
                      <p className="mb-0">
                        <strong>Durante el examen:</strong> Permanece en Safe Exam Browser hasta finalizar
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 p-3" style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div className="d-flex align-items-start mb-2">
                      <i className="fas fa-exclamation-triangle text-warning me-2" style={{ marginTop: '0.2rem' }}></i>
                      <p className="mb-0">
                        <strong>Al terminar:</strong> Cierra Safe Exam Browser según las instrucciones del profesor
                      </p>
                    </div>
                  </div>
                  <div className="p-3" style={{
                    backgroundColor: '#fff3cd',
                    borderRadius: '8px',
                    border: '1px solid #ffc107'
                  }}>
                    <div className="d-flex align-items-start">
                      <i className="fas fa-undo text-warning me-2" style={{ marginTop: '0.2rem' }}></i>
                      <p className="mb-0">
                        <strong>Después del examen:</strong> Vuelve aquí y presiona el botón de abajo para regresar a tus inscripciones
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón para volver */}
              <div className="mt-4">
                <button 
                  className="modern-btn modern-btn-primary modern-btn-lg"
                  onClick={handleReturnToInscriptions}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Volver a Mis Inscripciones
                </button>
              </div>

              {/* Nota adicional */}
              <div className="mt-4">
                <small className="text-muted">
                  <i className="fas fa-lightbulb me-1"></i>
                  Presiona este botón solo después de completar tu examen en SEB
                </small>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
