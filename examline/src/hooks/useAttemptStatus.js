import { useState, useEffect, useRef } from 'react';
import { getAttemptStatus } from '../services/api';

/**
 * Consulta periódicamente el estado del intento en el servidor, para enterarse
 * sin recargar de que el profesor cerró el examen para todos.
 *
 * @param {number|null} attemptId - Id del intento (no consulta si es null)
 * @param {Object} options
 * @param {number} options.intervalMs - Cada cuánto consultar
 * @param {Function} options.onClosed - Se llama una vez cuando el intento queda
 *   finalizado sin que el alumno lo haya entregado (cierre del profesor)
 * @returns {Object|null} Último estado recibido
 */
export const useAttemptStatus = (attemptId, { intervalMs = 15000, onClosed } = {}) => {
  const [status, setStatus] = useState(null);
  const onClosedRef = useRef(onClosed);
  const closedNotified = useRef(false);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    if (!attemptId) return;

    let cancelled = false;

    const check = async () => {
      try {
        const data = await getAttemptStatus(attemptId);
        if (cancelled) return;
        setStatus(data);

        if ((data.estado === 'finalizado' || data.examenCerrado) && !closedNotified.current) {
          closedNotified.current = true;
          onClosedRef.current?.(data);
        }
      } catch (err) {
        // Un error de red puntual no debe sacar al alumno del examen
        console.error('Error consultando estado del intento:', err);
      }
    };

    check();
    const interval = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [attemptId, intervalMs]);

  return status;
};

export default useAttemptStatus;
