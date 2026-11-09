import React, { useState, useEffect, useCallback } from "react";
import { getStudentsWaitingNextPart, enableNextPartForStudents } from "../services/api";

/**
 * Lista de alumnos que terminaron una parte y esperan la siguiente, con la
 * nota de la parte que cerraron. El profesor tilda a los que pasan y los
 * habilita juntos, así todos arrancan la siguiente parte al mismo tiempo.
 */
const WaitingStudentsPanel = ({ windowId, onError }) => {
  const [alumnos, setAlumnos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [habilitando, setHabilitando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await getStudentsWaitingNextPart(windowId);
      setAlumnos(data);
      // Quitar de la selección a quienes ya no están esperando
      setSeleccionados(prev => prev.filter(id => data.some(a => a.attemptId === id && !a.habilitado)));
    } catch (err) {
      console.error('Error cargando alumnos en espera:', err);
    }
  }, [windowId]);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 8000);
    return () => clearInterval(interval);
  }, [cargar]);

  const pendientes = alumnos.filter(a => !a.habilitado);
  const todosSeleccionados = pendientes.length > 0 && seleccionados.length === pendientes.length;

  const toggle = (attemptId) => {
    setSeleccionados(prev => (prev.includes(attemptId) ? prev.filter(id => id !== attemptId) : [...prev, attemptId]));
  };

  const toggleTodos = () => {
    setSeleccionados(todosSeleccionados ? [] : pendientes.map(a => a.attemptId));
  };

  const habilitar = async () => {
    if (seleccionados.length === 0) return;
    setHabilitando(true);
    try {
      await enableNextPartForStudents(windowId, seleccionados);
      setSeleccionados([]);
      await cargar();
    } catch (err) {
      onError?.(err.message || 'No se pudo habilitar a los alumnos');
    } finally {
      setHabilitando(false);
    }
  };

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Esperando la siguiente parte ({alumnos.length})
        </div>
        <button
          type="button"
          className="modern-btn modern-btn-primary modern-btn-sm"
          onClick={habilitar}
          disabled={habilitando || seleccionados.length === 0}
        >
          <i className="fas fa-user-check me-1"></i>
          {habilitando ? 'Habilitando...' : `Habilitar seleccionados (${seleccionados.length})`}
        </button>
      </div>

      {alumnos.length === 0 ? (
        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
          Todavía ningún alumno terminó la parte.
        </div>
      ) : (
        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
          <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '2rem' }}>
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleTodos}
                    disabled={pendientes.length === 0}
                    title="Seleccionar todos"
                  />
                </th>
                <th>Alumno</th>
                <th>Parte terminada</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map(a => (
                <tr key={a.attemptId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(a.attemptId)}
                      onChange={() => toggle(a.attemptId)}
                      disabled={a.habilitado}
                    />
                  </td>
                  <td>
                    {a.alumno.nombre}
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{a.alumno.email}</div>
                  </td>
                  <td>Parte {a.parteTerminada}</td>
                  <td>{typeof a.puntajeParte === 'number' ? `${Math.round(a.puntajeParte)}%` : 'Sin nota'}</td>
                  <td>
                    {a.habilitado && <span className="badge bg-success">Habilitado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WaitingStudentsPanel;
