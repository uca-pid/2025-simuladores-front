import React, { useState, useEffect, useCallback } from "react";
import { getExamWindowTime, extendExamWindowTime } from "../services/api";

const formatHora = (fecha) =>
  new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Tiempo de una ventana con horario mientras se rinde: muestra a qué hora
 * termina, permite dar minutos extra a todos o a un alumno puntual, y lista el
 * historial de extensiones (quién dio cuánto y por qué).
 */
const TimeExtensionPanel = ({ windowId, onError }) => {
  const [tiempo, setTiempo] = useState(null);
  const [minutos, setMinutos] = useState(10);
  const [motivo, setMotivo] = useState('');
  const [destino, setDestino] = useState('todos'); // 'todos' | attemptId del alumno
  const [enviando, setEnviando] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setTiempo(await getExamWindowTime(windowId));
    } catch (err) {
      console.error('Error cargando el tiempo de la ventana:', err);
    }
  }, [windowId]);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 15000);
    return () => clearInterval(interval);
  }, [cargar]);

  // Si el alumno elegido ya entregó, volver a "todos"
  useEffect(() => {
    if (destino !== 'todos' && tiempo && !tiempo.alumnos.some(a => String(a.attemptId) === String(destino))) {
      setDestino('todos');
    }
  }, [tiempo, destino]);

  const extender = async () => {
    const cantidad = parseInt(minutos, 10);
    if (!cantidad || cantidad < 1) return;

    setEnviando(true);
    try {
      await extendExamWindowTime(windowId, {
        minutos: cantidad,
        motivo,
        attemptId: destino === 'todos' ? null : Number(destino)
      });
      setMotivo('');
      await cargar();
    } catch (err) {
      onError?.(err.message || 'No se pudo extender el tiempo');
    } finally {
      setEnviando(false);
    }
  };

  if (!tiempo) return null;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2" style={{ fontSize: '0.9rem' }}>
        <i className="fas fa-clock text-primary"></i>
        <span>
          Termina a las <strong>{formatHora(tiempo.finParaTodos)}</strong>
          {tiempo.minutosGlobales > 0 && (
            <span className="text-muted"> (originalmente {formatHora(tiempo.finOriginal)}, +{tiempo.minutosGlobales} min para todos)</span>
          )}
        </span>
      </div>

      {/* div y no form: el panel vive dentro del formulario de la ventana y los
          formularios anidados mandan también el de afuera */}
      <div
        className="d-flex align-items-center flex-wrap gap-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            extender();
          }
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dar</span>
        <input
          type="number"
          className="form-control form-control-sm"
          min={1}
          max={600}
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
          style={{ width: '80px' }}
          disabled={enviando}
        />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>min a</span>
        <select
          className="form-select form-select-sm"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          style={{ width: 'auto', maxWidth: '220px' }}
          disabled={enviando}
        >
          <option value="todos">todos los alumnos</option>
          {tiempo.alumnos.map(a => (
            <option key={a.attemptId} value={a.attemptId}>{a.alumno.nombre}</option>
          ))}
        </select>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={200}
          style={{ flex: '1 1 160px' }}
          disabled={enviando}
        />
        <button type="button" className="modern-btn modern-btn-primary modern-btn-sm" onClick={extender} disabled={enviando || !minutos}>
          <i className="fas fa-plus me-1"></i>
          {enviando ? 'Dando tiempo...' : 'Dar tiempo'}
        </button>
      </div>

      {tiempo.alumnos.some(a => a.minutosIndividuales > 0) && (
        <div className="mt-2" style={{ fontSize: '0.8rem' }}>
          <span className="text-muted">Con tiempo extra propio: </span>
          {tiempo.alumnos.filter(a => a.minutosIndividuales > 0).map(a => (
            <span key={a.attemptId} className="badge bg-light text-dark border me-1">
              {a.alumno.nombre}: hasta {formatHora(a.fin)} (+{a.minutosIndividuales} min)
            </span>
          ))}
        </div>
      )}

      {tiempo.historial.length > 0 && (
        <div className="mt-2">
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setVerHistorial(v => !v)}>
            <i className={`fas fa-chevron-${verHistorial ? 'up' : 'down'} me-1`}></i>
            Historial de extensiones ({tiempo.historial.length})
          </button>
          {verHistorial && (
            <ul className="list-unstyled mb-0 mt-1" style={{ fontSize: '0.8rem' }}>
              {tiempo.historial.map(h => (
                <li key={h.id} className="text-muted">
                  {formatHora(h.createdAt)} · +{h.minutos} min a {h.alumno || 'todos'}
                  {h.motivo ? ` · "${h.motivo}"` : ''} · por {h.otorgadoPor}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeExtensionPanel;
