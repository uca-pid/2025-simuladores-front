import React, { useState } from "react";
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import StudentInscriptionsPage from "./StudentInscriptions";

const StudentExamPage = () => {
  const { user } = useAuth();
  const [showInstructivo, setShowInstructivo] = useState(false);

  return (
    <div className="container py-5">
      <div className="student-exam-page-wrapper">
        {/* Header con información del usuario */}
        <UserHeader />

        {/* Instructivo colapsable */}
        <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="student-exam-instructivo-header">
            <div className="instructivo-title-section">
              <h3 className="modern-card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <span className="title-text">Instructivo de Uso</span>
              </h3>
            </div>
            <div className="instructivo-toggle-section">
              <button
                className="modern-btn modern-btn-secondary instructivo-toggle-btn"
                onClick={() => setShowInstructivo(!showInstructivo)}
              >
                <i className={`fas fa-chevron-${showInstructivo ? 'up' : 'down'} me-2`}></i>
                <span className="btn-text">
                  {showInstructivo ? 'Ocultar' : 'Ver instructivo'}
                </span>
              </button>
            </div>
          </div>
        </div>
        {showInstructivo && (
          <div className="modern-card-body">
            <div className="system-explanation">
              <div className="student-exam-steps-grid">
                <div className="explanation-step-card">
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
                <div className="explanation-step-card">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-user-plus text-success"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">2. Inscribirse</h5>
                      <p className="step-description">
                        Regístrate en las ventanas de examen disponibles. El profesor debe habilitarte antes del examen.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="explanation-step-card">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-play text-warning"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">3. Rendir Examen</h5>
                      <p className="step-description">
                        Una vez habilitado y en el horario correcto, podrás acceder al examen desde "Mis Inscripciones".
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
    </div>
  );
};

export default StudentExamPage;




