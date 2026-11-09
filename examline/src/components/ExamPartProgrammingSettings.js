// src/components/ExamPartProgrammingSettings.jsx
import React from "react";

// Configuración de una parte "programming": puntaje personalizado de los casos
// de prueba. Vive en el sidebar (igual que ExamPartQuestionSettings) para que
// quede visible sin importar la pestaña de la parte ni cuánto se scrolleó.
const ExamPartProgrammingSettings = ({ part, onChange }) => {
  const update = (patch) => onChange({ ...part, ...patch });

  if (!part.testCases || part.testCases.length === 0) return null;

  return (
    <div className="modern-card mb-3">
      <div className="modern-card-header">
        <h3 className="modern-card-title mb-0" style={{ fontSize: '1rem' }}>
          <i className="fas fa-sliders-h me-2"></i>
          Configuración de Casos de Prueba
        </h3>
      </div>
      <div className="modern-card-body" style={{ fontSize: '0.9rem' }}>
        <div className="d-flex align-items-center gap-2">
          <strong>Puntaje personalizado</strong>
          <div className="form-check form-switch mb-0 ms-auto">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id={`testCasesPuntajePersonalizado-${part.localId}`}
              checked={!!part.testCasesPuntajePersonalizado}
              onChange={(e) => update({
                testCasesPuntajePersonalizado: e.target.checked,
                testCases: e.target.checked ? part.testCases : part.testCases.map(tc => ({ ...tc, puntos: 1 })),
              })}
              style={{
                backgroundColor: part.testCasesPuntajePersonalizado ? 'var(--primary-color)' : '#fff',
                borderColor: part.testCasesPuntajePersonalizado ? 'var(--primary-color)' : '#6c757d'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPartProgrammingSettings;
