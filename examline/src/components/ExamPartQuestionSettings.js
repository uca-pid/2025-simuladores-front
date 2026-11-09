// src/components/ExamPartQuestionSettings.jsx
import React from "react";
import { DIFICULTAD_BADGE } from "../utils/questionBadges";

// Configuración de una parte "multiple_choice": puntaje personalizado, orden
// aleatorio y cuántas preguntas recibe cada alumno. Vive en el sidebar (no
// en la tarjeta de preguntas) para que quede visible sin importar cuánto
// scrolleó el profesor la lista de preguntas.
const ExamPartQuestionSettings = ({ part, onChange, ordenAleatorio, onOrdenAleatorioChange }) => {
  const update = (patch) => onChange({ ...part, ...patch });

  const conteoPorDificultad = { facil: 0, media: 0, dificil: 0 };
  part.preguntas.forEach(p => { conteoPorDificultad[p.dificultad || 'media']++; });

  const modoSeleccion = part.cantidadPreguntas != null
    ? 'aleatorio'
    : (part.cantidadFaciles != null || part.cantidadMedias != null || part.cantidadDificiles != null)
      ? 'dificultad'
      : 'todas';

  const setCantidad = (nivel, valorStr) => {
    const valor = valorStr === '' ? 0 : Math.max(0, parseInt(valorStr, 10) || 0);
    update({ [nivel]: valor });
  };

  if (part.preguntas.length === 0) return null;

  return (
    <div className="modern-card mb-3">
      <div className="modern-card-header">
        <h3 className="modern-card-title mb-0" style={{ fontSize: '1rem' }}>
          <i className="fas fa-sliders-h me-2"></i>
          Configuración de Preguntas
        </h3>
      </div>
      <div className="modern-card-body" style={{ fontSize: '0.9rem' }}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <strong>Puntaje personalizado</strong>
          <div className="form-check form-switch mb-0 ms-auto">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id={`puntajePersonalizado-${part.localId}`}
              checked={!!part.puntajePersonalizado}
              onChange={(e) => update({
                puntajePersonalizado: e.target.checked,
                preguntas: e.target.checked ? part.preguntas : part.preguntas.map(p => ({ ...p, puntos: 1 })),
              })}
              style={{
                backgroundColor: part.puntajePersonalizado ? 'var(--primary-color)' : '#fff',
                borderColor: part.puntajePersonalizado ? 'var(--primary-color)' : '#6c757d'
              }}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 mb-3">
          <strong>Orden aleatorio</strong>
          <div className="form-check form-switch mb-0 ms-auto">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id={`randomOrder-${part.localId}`}
              checked={ordenAleatorio}
              onChange={(e) => onOrdenAleatorioChange?.(e.target.checked)}
              style={{
                backgroundColor: ordenAleatorio ? 'var(--primary-color)' : '#fff',
                borderColor: ordenAleatorio ? 'var(--primary-color)' : '#6c757d'
              }}
            />
          </div>
        </div>

        <strong className="d-block mb-2">Cuántas preguntas recibirá el alumno</strong>
        <select
          className="form-select form-select-sm mb-2"
          value={modoSeleccion}
          onChange={(e) => {
            const nuevoModo = e.target.value;
            if (nuevoModo === 'todas') {
              update({ cantidadPreguntas: null, cantidadFaciles: null, cantidadMedias: null, cantidadDificiles: null });
            } else if (nuevoModo === 'aleatorio') {
              update({ cantidadPreguntas: Math.min(1, part.preguntas.length), cantidadFaciles: null, cantidadMedias: null, cantidadDificiles: null });
            } else {
              update({ cantidadPreguntas: null, cantidadFaciles: 0, cantidadMedias: 0, cantidadDificiles: 0 });
            }
          }}
        >
          <option value="todas">Todas</option>
          <option value="aleatorio">Cantidad fija</option>
          <option value="dificultad">Distribuidas por dificultad</option>
        </select>

        {modoSeleccion === 'aleatorio' && (
          <div>
            <input
              type="number"
              min="1"
              max={part.preguntas.length}
              className="form-control form-control-sm mb-1"
              value={part.cantidadPreguntas ?? 1}
              onChange={(e) => update({ cantidadPreguntas: Math.max(1, Math.min(part.preguntas.length, parseInt(e.target.value, 10) || 1)) })}
            />
            <small className="text-muted">de {part.preguntas.length} disponibles, al azar por alumno.</small>
          </div>
        )}

        {modoSeleccion === 'dificultad' && (
          <>
            <div className="d-flex flex-column gap-2">
              {[
                { key: 'cantidadFaciles', nivel: 'facil', label: 'Fáciles' },
                { key: 'cantidadMedias', nivel: 'media', label: 'Medias' },
                { key: 'cantidadDificiles', nivel: 'dificil', label: 'Difíciles' },
              ].map(({ key, nivel, label }) => (
                <div key={key} className="d-flex align-items-center gap-2">
                  <span className="badge" style={{ backgroundColor: DIFICULTAD_BADGE[nivel].color, color: 'white', minWidth: '70px' }}>
                    {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={conteoPorDificultad[nivel]}
                    className={`form-control form-control-sm ${(part[key] || 0) > conteoPorDificultad[nivel] ? 'is-invalid' : ''}`}
                    style={{ width: '70px' }}
                    value={part[key] ?? 0}
                    onChange={(e) => setCantidad(key, e.target.value)}
                  />
                  <small className="text-muted">/{conteoPorDificultad[nivel]}</small>
                </div>
              ))}
            </div>
            <small className="form-text text-muted d-block mt-2">
              Marcá la dificultad de cada pregunta y elegí cuántas de cada nivel recibe el alumno.
            </small>
          </>
        )}
      </div>
    </div>
  );
};

export default ExamPartQuestionSettings;
