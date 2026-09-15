import { useState, useCallback, useEffect } from 'react';
import { getExamById, checkExamAttempt, startExamAttempt } from '../services/api';

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

  // Función para obtener el examen
  const fetchExam = useCallback(async () => {
    try {
      const examData = await getExamById(examId, windowId);
      if (examData.tipo !== 'programming') {
        setError('Este no es un examen de programación');
        return;
      }
      setExam(examData);
      setCode(examData.codigoInicial || '');
    } catch (err) {
      console.error('Error fetching exam:', err);
      setError(err.message || 'Error cargando examen');
    }
  }, [examId, windowId]);

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
  }, [fetchExam, fetchOrCreateAttempt, windowId]);

  return {
    exam,
    attempt,
    setAttempt,
    code,
    setCode,
    loading,
    setLoading,
    error,
    setError
  };
};

export default useExamAttempt;
