import React from "react";
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import StudentInscriptionsPage from "./StudentInscriptions";

const StudentExamPage = () => {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      {/* Header con información del usuario */}
      <UserHeader />

      {/* Header explicativo del sistema */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div>
            <h1 className="page-title mb-2">
              <i className="fas fa-graduation-cap me-2" style={{ color: 'var(--primary-color)' }}></i>
              Sistema de Inscripciones y Exámenes
            </h1>
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
                        Regístrate en las ventanas de examen disponibles. El profesor debe habilitarte antes del examen.
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
                        Una vez habilitado y en el horario correcto, podrás acceder al examen desde "Mis Inscripciones".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Componente de inscripciones anidado */}
      <StudentInscriptionsPage embedded={true} showHeader={false} />
    </div>
  );
};

export default StudentExamPage;




