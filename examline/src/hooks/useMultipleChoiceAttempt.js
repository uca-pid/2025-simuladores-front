import { useState, useEffect, useCallback } from 'react';
import { getExamById, checkExamAttempt, startExamAttempt, finishExamAttempt } from '../services/api';

/**
 * Hook personalizado para gestionar la toma de un examen NO de programación
 * (multiple_choice / otros tipos de pregunta: true_false, fill_in_blank, matching).
 *
 * Centraliza: validación de acceso (rol/windowId), carga del examen y del intento,
 * estado de respuestas del estudiante (persistido en sessionStorage) y el envío
 * de finalización del intento.
 *
 * NOTA sobre randomización: antes este hook randomizaba el orden de las opciones
 * del lado del cliente (Math.random(), después de recibir el examen). Eso NO
 * protegía nada: para 'fill_in_blank'/'matching' el orden original que llegaba
 * del backend YA era la respuesta correcta (ver exam.service.ts), así que
 * inspeccionando la respuesta de la red se podía ver la respuesta sin siquiera
 * mirar el shuffle del cliente. Ahora el backend manda las opciones de cada
 * pregunta ya mezcladas, con una seed determinística por estudiante+examen+
 * pregunta (ver src/utils/seededShuffle.ts del lado del back). Este hook ya no
 * mezcla nada: lo que llega es lo que se muestra, y lo que el estudiante elige
 * (posición dentro de ese array ya mezclado) es lo que se manda tal cual al
 * finalizar - el backend se encarga de traducirlo de vuelta al corregir.
 *
 * @param {string} examId - Id del examen
 * @param {string|null} windowId - Id de la ventana de examen (si aplica)
 * @param {Function} navigate - Función de navegación de react-router
 * @param {Object} options
 * @param {boolean} options.propExamId - Si viene de vista previa (no requiere windowId)
 * @returns {Object} Estado y funciones relacionadas con el examen/intento
 */
export const useMultipleChoiceAttempt = (examId, windowId, navigate, { propExamId } = {}) => {
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [respuestas, setRespuestas] = useState({}); // { preguntaId: posicionMostrada | posicionMostrada[] }
  const [selectedMatchingConcepts, setSelectedMatchingConcepts] = useState({}); // { preguntaId: conceptoIndex | null }

  // 🔹 Cargar respuestas guardadas al montar el componente
  useEffect(() => {
    const saved = sessionStorage.getItem(`exam_${examId}_respuestas`);
    if (saved) {
      setRespuestas(JSON.parse(saved));
    }
  }, [examId]);

  // Guardar una respuesta y persistirla en sessionStorage
  const updateRespuesta = useCallback((preguntaId, updater) => {
    setRespuestas(prev => {
      const nextValue = typeof updater === 'function' ? updater(prev[preguntaId]) : updater;
      const updated = { ...prev, [preguntaId]: nextValue };
      sessionStorage.setItem(`exam_${examId}_respuestas`, JSON.stringify(updated));
      return updated;
    });
  }, [examId]);

  // Carga del examen + intento
  useEffect(() => {
    if (!examId) return;

    const loadExamAndAttempt = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // 🔒 Validación de seguridad - SIEMPRE bloquear profesores
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            if (payload.rol === 'professor' || payload.rol === 'system') {
              setError('Acceso no autorizado: Los profesores no pueden tomar exámenes');
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error validando token:', err);
          }
        }

        // Primero verificar si ya existe un intento
        try {
          const checkData = await checkExamAttempt(examId, windowId || '');

          if (checkData.hasAttempt && checkData.attempt.estado === 'finalizado') {
            setError('Ya has completado este examen');
            setLoading(false);
            return;
          }
        } catch (checkErr) {
          // Igual que el fetch original: si check falla, seguimos intentando crear/obtener el intento
          console.error('Error verificando intento existente:', checkErr);
        }

        // PRIMERO: Crear o obtener intento existente (para tener el orden randomizado)
        let attemptData;
        try {
          attemptData = await startExamAttempt({
            examId: parseInt(examId),
            examWindowId: windowId ? parseInt(windowId) : null
          });
        } catch (startErr) {
          setError(startErr.message || 'Error creando intento de examen');
          setLoading(false);
          return;
        }

        if (attemptData.estado === 'finalizado') {
          setError('Ya has completado este examen');
          setLoading(false);
          return;
        }

        // SEGUNDO: Cargar examen con las preguntas (las opciones ya vienen mezcladas
        // por el backend, de forma determinística y estable - no hay nada que
        // randomizar acá)
        const examData = await getExamById(examId, windowId);

        // TERCERO: Aplicar orden de preguntas ANTES de setear el estado (evita flash)
        let preguntasAMostrar = examData.preguntas;

        if (attemptData.ordenPreguntas && Array.isArray(attemptData.ordenPreguntas)) {
          const ordenMap = new Map(examData.preguntas.map(p => [p.id, p]));
          preguntasAMostrar = attemptData.ordenPreguntas
            .map(id => ordenMap.get(id))
            .filter(p => p !== undefined);
        }

        examData.preguntas = preguntasAMostrar;

        // CUARTO: Setear estados (ya con el orden correcto)
        setAttempt(attemptData);
        setExam(examData);

        // Redireccionar si es un examen de programación
        if (examData.tipo === 'programming') {
          const params = new URLSearchParams();
          if (windowId) params.append('windowId', windowId);
          navigate(`/programming-exam/${examId}?${params.toString()}`);
          return;
        }
      } catch (err) {
        console.error('Error cargando examen:', err);
        setExam(null);

        if (err.code === 'WINDOW_ID_REQUIRED') {
          setError('Acceso no autorizado: Se requiere inscripción válida');
        } else if (err.code === 'NOT_ENROLLED') {
          setError('No estás inscrito en esta ventana de examen');
        } else if (err.code === 'NOT_ENABLED') {
          setError('No estás habilitado para rendir este examen');
        } else if (err.code === 'EXAM_NOT_AVAILABLE') {
          setError('El examen no está disponible en este momento');
        } else if (err.code === 'EXAM_MISMATCH') {
          setError('La ventana no corresponde a este examen');
        } else {
          setError(err.message || 'Error de acceso al examen');
        }
      } finally {
        setLoading(false);
      }
    };

    loadExamAndAttempt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, windowId]);

  // Construye el body de finalización a partir de las respuestas actuales.
  // Ya no hace falta traducir nada acá: 'respuestas' está en términos de la
  // posición mostrada (la misma que vio el estudiante), y es el backend el
  // que la traduce al índice real con la misma seed determinística que usó
  // para mezclar las opciones.
  const buildFinishBody = useCallback(() => {
    if (!exam || exam.tipo !== 'multiple_choice') {
      return {};
    }

    return { respuestas };
  }, [exam, respuestas]);

  // Finaliza el intento en el backend. Lanza el error para que el componente lo maneje (modal).
  const finishAttempt = useCallback(async () => {
    const body = buildFinishBody();
    const response = await finishExamAttempt(attempt.id, body);

    // Limpiar sessionStorage al completar el examen
    const examKey = `exam_${examId}_windowId`;
    sessionStorage.removeItem(examKey);
    sessionStorage.removeItem(`exam_${examId}_respuestas`);

    return response;
  }, [attempt, buildFinishBody, examId]);

  return {
    exam,
    attempt,
    loading,
    setLoading,
    error,
    setError,
    submitting,
    setSubmitting,
    respuestas,
    setRespuestas,
    updateRespuesta,
    selectedMatchingConcepts,
    setSelectedMatchingConcepts,
    finishAttempt
  };
};

export default useMultipleChoiceAttempt;
