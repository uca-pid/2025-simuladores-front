import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "../components/UserHeader";
import StudentInscriptionsPage from "./StudentInscriptions";

const StudentExamPage = () => {
  const navigate = useNavigate();
  const [showInstructivo, setShowInstructivo] = useState(false);

  return (
    <div className="container py-5">
      {/* Header con información del usuario */}
      <UserHeader />

      {/* Banner de Progreso */}
      <div className="modern-card mb-4" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none'
      }}>
        <div className="modern-card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h3 className="mb-2" style={{ color: 'white', fontWeight: '600' }}>
                <i className="fas fa-trophy me-2"></i>
                ¿Quieres ver tu progreso?
              </h3>
              <p className="mb-0" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Revisa tu nivel, logros y estadísticas de rendimiento
              </p>
            </div>
            <button
              className="modern-btn modern-btn-lg"
              style={{ 
                background: 'white',
                color: '#667eea',
                fontWeight: '600'
              }}
              onClick={() => navigate('/student-progress')}
            >
              <i className="fas fa-chart-line me-2"></i>
              Ver mi progreso
            </button>
          </div>
        </div>
      </div>

      {/* Instructivo colapsable */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="modern-card-title mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Instructivo de Uso
            </h3>
            <button
              className="modern-btn modern-btn-secondary"
              onClick={() => setShowInstructivo(!showInstructivo)}
            >
              <i className={`fas fa-chevron-${showInstructivo ? 'up' : 'down'}`}></i>
              {showInstructivo ? 'Ocultar' : 'Ver instructivo'}
            </button>
          </div>
        </div>
        {showInstructivo && (
          <div className="modern-card-body">
            <div className="system-explanation">
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-search text-primary"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">1. Explorar Exámenes</h5>
                      <p className="step-description">
                        Busca exámenes disponibles usando filtros por materia, profesor o fecha en la pestaña "Exámenes Disponibles".
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-user-plus text-success"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">2. Inscribirse</h5>
                      <p className="step-description">
                        Regístrate en las ventanas de examen disponibles. Es posible que el exámen sea en modo seguro, lo que significa que tendrás que tener instalado SEB al momento de rendir.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-play text-warning"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">3. Rendir Examen</h5>
                      <p className="step-description">
                        Una vez habilitado y en el horario correcto, podrás acceder al examen desde "Mis Inscripciones". Ten en cuenta que tener instalado SEB es obligatorio en caso de que el exámen sea en modo seguro.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Componente de inscripciones anidado */}
      <StudentInscriptionsPage embedded={true} showHeader={false} />
    </div>
  );
};

export default StudentExamPage;




