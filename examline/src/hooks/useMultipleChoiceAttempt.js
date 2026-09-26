import { useState, useEffect, useCallback } from 'react';
import { getExamById, checkExamAttempt, startExamAttempt, advancePart, continuePart } from '../services/api';

/**
 * Hook personalizado para gestionar la toma de un examen NO de programación
 * (multiple_choice / otros tipos de pregunta: true_false, fill_in_blank, matching).
 *
 * Centraliza: validación de acceso (rol/windowId), carga del examen y del intento,
 * randomización de opciones/respuestas por pregunta, estado de respuestas del
 * estudiante (persistido en sessionStorage) y el envío de finalización del intento.
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
  const [respuestas, setRespuestas] = useState({}); // { preguntaId: opcionIndex | opcionIndex[] }
  const [randomizedOptions, setRandomizedOptions] = useState({}); // { preguntaIndex: [{ texto, originalIndex }] }
  const [randomizedMatchingAnswers, setRandomizedMatchingAnswers] = useState({}); // { preguntaIndex: [{ texto, originalIndex }] }
  const [selectedMatchingConcepts, setSelectedMatchingConcepts] = useState({}); // { preguntaId: conceptoIndex | null }
  const [reloadIndex, setReloadIndex] = useState(0); // se incrementa para forzar un refetch (p.ej. tras continuar de parte)

  // Parte actual del examen (el backend nunca expone preguntas de partes que no sean la actual)
  const part = exam?.partes?.[exam.currentPartIndex] || null;

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

  // Carga del examen + intento + randomización
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

        // SEGUNDO: Cargar examen con las preguntas
        const examData = await getExamById(examId, windowId);

        const currentPart = examData.partes?.[examData.currentPartIndex];

        // Si la parte actual no es de múltiple choice, esta página no debe
        // renderizar nada: redirigir al lugar correcto según su tipo.
        if (currentPart && currentPart.tipo === 'programming') {
          const params = new URLSearchParams();
          if (windowId) params.append('windowId', windowId);
          navigate(`/programming-exam/${examId}?${params.toString()}`);
          return;
        }

        // TERCERO: Aplicar orden de preguntas ANTES de setear el estado (evita flash)
        let preguntasAMostrar = currentPart?.preguntas || [];

        if (attemptData.ordenPreguntas && Array.isArray(attemptData.ordenPreguntas)) {
          const ordenMap = new Map(preguntasAMostrar.map(p => [p.id, p]));
          preguntasAMostrar = attemptData.ordenPreguntas
            .map(id => ordenMap.get(id))
            .filter(p => p !== undefined);
        }

        if (currentPart) {
          currentPart.preguntas = preguntasAMostrar;
        }

        // CUARTO: Setear estados (ya con el orden correcto)
        setAttempt(attemptData);
        setExam(examData);

        // Randomizar opciones para cada pregunta
        if (preguntasAMostrar) {
          const randomized = {};
          const randomizedMatching = {};
          preguntasAMostrar.forEach((pregunta, index) => {
            if (pregunta.tipo === 'matching' && pregunta.opciones && Array.isArray(pregunta.opciones)) {
              const numConceptos = pregunta.correcta || 0;
              const respuestasOpciones = pregunta.opciones.slice(numConceptos);
              const respuestasConIndice = respuestasOpciones.map((texto, i) => ({
                texto,
                originalIndex: numConceptos + i
              }));
              for (let i = respuestasConIndice.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [respuestasConIndice[i], respuestasConIndice[j]] = [respuestasConIndice[j], respuestasConIndice[i]];
              }
              randomizedMatching[index] = respuestasConIndice;
            } else if (pregunta.tipo === 'fill_in_blank' && pregunta.opciones && Array.isArray(pregunta.opciones)) {
              const opcionesConIndice = pregunta.opciones.map((texto, i) => ({
                texto,
                originalIndex: i
              }));
              for (let i = opcionesConIndice.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opcionesConIndice[i], opcionesConIndice[j]] = [opcionesConIndice[j], opcionesConIndice[i]];
              }
              randomized[index] = opcionesConIndice;
            } else if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
              const opcionesConIndice = pregunta.opciones.map((texto, i) => ({
                texto,
                originalIndex: i
              }));
              for (let i = opcionesConIndice.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opcionesConIndice[i], opcionesConIndice[j]] = [opcionesConIndice[j], opcionesConIndice[i]];
              }
              randomized[index] = opcionesConIndice;
            }
          });
          setRandomizedOptions(randomized);
          setRandomizedMatchingAnswers(randomizedMatching);
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
  }, [examId, windowId, reloadIndex]);

  // Construye el body de finalización a partir de las respuestas actuales
  const buildFinishBody = useCallback(() => {
    if (!part || part.tipo !== 'multiple_choice') {
      return {};
    }

    const respuestasFinales = {};
    Object.keys(respuestas).forEach(preguntaId => {
      const preguntaIndex = part.preguntas.findIndex(p => p.id === parseInt(preguntaId));
      if (preguntaIndex === -1) return;

      const pregunta = part.preguntas[preguntaIndex];
      const respuesta = respuestas[preguntaId];

      if (pregunta.tipo === 'fill_in_blank' && Array.isArray(respuesta)) {
        respuestasFinales[preguntaId] = respuesta.map(randomIndex =>
          randomizedOptions[preguntaIndex][randomIndex].originalIndex
        );
      } else if (pregunta.tipo === 'matching' && Array.isArray(respuesta)) {
        respuestasFinales[preguntaId] = respuesta.map(randomizedAnswerIndex =>
          randomizedMatchingAnswers[preguntaIndex][randomizedAnswerIndex].originalIndex
        );
      } else {
        if (randomizedOptions[preguntaIndex]) {
          respuestasFinales[preguntaId] = randomizedOptions[preguntaIndex][respuesta].originalIndex;
        } else {
          respuestasFinales[preguntaId] = respuesta;
        }
      }
    });

    return respuestasFinales;
  }, [part, respuestas, randomizedOptions, randomizedMatchingAnswers]);

  // Cierra la parte actual (avanza a la siguiente, o finaliza el intento si era
  // la última). La respuesta indica si hay que esperar a "continuar" o si el
  // intento completo ya quedó finalizado.
  const finishAttempt = useCallback(async () => {
    const respuestasFinales = buildFinishBody();
    const response = await advancePart(attempt.id, respuestasFinales);

    if (response.estado === 'finalizado') {
      // Limpiar sessionStorage al completar el examen
      const examKey = `exam_${examId}_windowId`;
      sessionStorage.removeItem(examKey);
      sessionStorage.removeItem(`exam_${examId}_respuestas`);
    }

    return response;
  }, [attempt, buildFinishBody, examId]);

  // Confirma el paso a la siguiente parte tras el estado "esperando_continuar"
  // y fuerza un refetch del examen (que puede redirigir a la vista correcta
  // según el tipo de la nueva parte actual).
  const continueToNextPart = useCallback(async () => {
    const response = await continuePart(attempt.id);
    sessionStorage.removeItem(`exam_${examId}_respuestas`);
    setRespuestas({});
    setReloadIndex(prev => prev + 1);
    return response;
  }, [attempt, examId]);

  return {
    exam,
    part,
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
    randomizedOptions,
    randomizedMatchingAnswers,
    selectedMatchingConcepts,
    setSelectedMatchingConcepts,
    finishAttempt,
    continueToNextPart
  };
};

export default useMultipleChoiceAttempt;
