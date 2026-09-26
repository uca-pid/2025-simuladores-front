import { useState, useCallback, useEffect } from 'react';
import { getExamById, checkExamAttempt, startExamAttempt, continuePart } from '../services/api';

/**
 * Hook personalizado para gestionar la carga del examen y el intento de programación
 * Centraliza la lógica de: validación de acceso (rol/windowId), obtención del examen,
 * obtención o creación del intento y el código inicial asociado.
 *
 * @param {string} examId - Id del examen
 * @param {string|null} windowId - Id de la ventana de examen (si aplica)
 * @param {Function} navigate - Función de navegación de react-router
 * @returns {Object} Estado y setters relacionados con el examen/intento
 */
export const useExamAttempt = (examId, windowId, navigate) => {
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  // Función para obtener el examen
  const fetchExam = useCallback(async () => {
    try {
      const examData = await getExamById(examId, windowId);
      const currentPart = examData.partes?.[examData.currentPartIndex];

      if (currentPart && currentPart.tipo !== 'programming') {
        // La parte actual no es de programación: redirigir a la vista correcta
        const params = new URLSearchParams();
        if (windowId) params.append('windowId', windowId);
        navigate(`/exam-attempt/${examId}?${params.toString()}`);
        return;
      }

      // Aplanar los campos de la parte actual sobre el examen para no romper
      // el resto del componente, que sigue leyendo exam.enunciadoProgramacion,
      // exam.lenguajeProgramacion, etc. directamente.
      const merged = currentPart ? { ...examData, ...currentPart } : examData;
      setExam(merged);
      setCode(merged.codigoInicial || '');
    } catch (err) {
      console.error('Error fetching exam:', err);
      setError(err.message || 'Error cargando examen');
    }
  }, [examId, windowId, navigate]);

  // Función para obtener o crear intento
  const fetchOrCreateAttempt = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      // 🔒 Validación de seguridad - SIEMPRE bloquear profesores
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));

          // SIEMPRE bloquear a profesores - no pueden tomar exámenes
          if (payload.rol === 'professor' || payload.rol === 'system') {
            setError('Acceso no autorizado: Los profesores no pueden tomar exámenes');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error validando token:', err);
        }
      }

      // Verificar si ya existe un intento
      const checkData = await checkExamAttempt(examId, windowId);

      if (checkData.hasAttempt) {
        const existingAttempt = checkData.attempt;
        setAttempt(existingAttempt);

        // Si ya hay código guardado, cargarlo
        if (existingAttempt.codigoProgramacion) {
          setCode(existingAttempt.codigoProgramacion);
        }

        // Si el intento ya está finalizado, redirigir a resultados
        if (existingAttempt.estado === 'finalizado') {
          // Limpiar windowId del sessionStorage
          const examKey = `exam_${examId}_windowId`;
          sessionStorage.removeItem(examKey);

          navigate(`/exam-attempts/${existingAttempt.id}/results`);
          return;
        }
      } else {
        // Crear nuevo intento
        const createData = await startExamAttempt({
          examId: parseInt(examId),
          examWindowId: windowId ? parseInt(windowId) : null
        });
        setAttempt(createData);
      }
    } catch (err) {
      console.error('Error with exam attempt:', err);
      setError(err.response?.data?.error || 'Error iniciando examen');
    }
  }, [examId, windowId, navigate]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    // 🔒 Validación de seguridad - SIEMPRE bloquear profesores
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // SIEMPRE bloquear a profesores y system - no pueden tomar exámenes
        if (payload.rol === 'professor' || payload.rol === 'system') {
          setError('Acceso no autorizado: Los profesores no pueden tomar exámenes');
          setLoading(false);
          return;
        }

        // Bloquear a estudiantes sin windowId válido
        if (payload.rol === 'student' && !windowId) {
          setError('Acceso no autorizado: Debes acceder desde tus inscripciones');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error validando token:', err);
        setError('Token inválido');
        setLoading(false);
        return;
      }
    }

    const loadData = async () => {
      setLoading(true);
      await fetchExam();
      await fetchOrCreateAttempt();
      setLoading(false);
    };

    loadData();
  }, [fetchExam, fetchOrCreateAttempt, windowId, reloadIndex]);

  // Confirma el paso a la siguiente parte tras "esperando_continuar" y
  // fuerza un refetch (que puede redirigir si la nueva parte no es de programación).
  const continueToNextPart = useCallback(async () => {
    if (!attempt) return;
    const response = await continuePart(attempt.id);
    setReloadIndex(prev => prev + 1);
    return response;
  }, [attempt]);

  return {
    exam,
    attempt,
    setAttempt,
    code,
    setCode,
    loading,
    setLoading,
    error,
    setError,
    continueToNextPart
  };
};

export default useExamAttempt;
