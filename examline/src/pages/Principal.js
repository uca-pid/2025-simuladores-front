import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../components/action-cards.css";
import UserHeader from "../components/UserHeader";

const Principal = () => {
  const [showInstructivo, setShowInstructivo] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      <UserHeader />

      {/* Instructivo colapsable */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="instructivo-header">
            <h3 className="modern-card-title mb-0">
              <i className="fas fa-info-circle me-2"></i>
              <span className="title-text">Instructivo de Uso</span>
            </h3>
            <button
              className="modern-btn modern-btn-secondary modern-btn-sm"
              onClick={() => setShowInstructivo(!showInstructivo)}
            >
              <i className={`fas fa-chevron-${showInstructivo ? 'up' : 'down'}`}></i>
              <span className="btn-text">{showInstructivo ? 'Ocultar' : 'Ver instructivo'}</span>
            </button>
          </div>
        </div>
        {showInstructivo && (
          <div className="modern-card-body">
            <div className="system-explanation">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-plus-circle text-primary"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">1. Crear Exámenes</h5>
                      <p className="step-description">
                        Hacé clic en <strong>"Ir a Mis Exámenes"</strong> para ver todos tus exámenes o crear uno nuevo. Puedes crear dos tipos de examenes: 
                        <strong> Múltiple Choice</strong> o <strong> Programación</strong>.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="explanation-step">
                    <div className="step-icon">
                      <i className="fas fa-tasks text-success"></i>
                    </div>
                    <div className="step-content">
                      <h5 className="step-title">2. Gestionar Ventanas y Corregir</h5>
                      <p className="step-description mb-2">
                        Hacé clic en <strong>"Gestionar Ventanas"</strong> para:
                      </p>
                      <ul className="step-list">
                        <li><strong>Crear ventanas:</strong> Seleccioná un examen, definí fecha/hora (o sin límites), cupo máximo y si requiere Safe Exam Browser para mayor seguridad.</li>
                        <li><strong>Corregir:</strong> Una vez rendidos, los múltiple choice se corrigen automáticamente. Los de programación podés corregirlos con test cases automáticos o manualmente agregando calificación</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h2 className="page-title mb-0">
            <i className="fas fa-rocket me-2"></i>
            <span className="title-text">Acciones Rápidas</span>
          </h2>
        </div>
        <div className="modern-card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="action-card">
                <div className="action-step-badge">
                  <span className="step-number">1</span>
                </div>
                <div className="action-content">
                  <h5 className="action-title">
                    <i className="fas fa-folder-open text-primary me-2"></i>
                    Crear Exámenes
                  </h5>
                  <p className="action-description text-muted mb-3">
                    Mirá todos tus exámenes o creá nuevos
                  </p>
                  <button 
                    className="modern-btn modern-btn-primary w-100" 
                    onClick={() => navigate("/mis-examenes")}
                  >
                    <i className="fas fa-folder-open me-2"></i>
                    <span className="btn-text">Ir a Mis Exámenes</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="action-card">
                <div className="action-step-badge secondary">
                  <span className="step-number">2</span>
                </div>
                <div className="action-content">
                  <h5 className="action-title">
                    <i className="fas fa-tasks text-success me-2"></i>
                    Gestionar y Corregir Ventanas de Exámenes
                  </h5>
                  <p className="action-description text-muted mb-3">
                    Creá ventanas de examen para inscribirse y corregí los exámenes
                  </p>
                  <button 
                    className="modern-btn modern-btn-secondary w-100" 
                    onClick={() => navigate("/exam-windows")}
                  >
                    <i className="fas fa-calendar-check me-2"></i>
                    <span className="btn-text">Gestionar Ventanas</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Principal;



