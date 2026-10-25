import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAttemptProfessorView,
  getReferenceFiles,
  executeCodeForGrading,
  saveManualGrade,
} from '../services/api';

/**
 * Hook personalizado para gestionar la corrección manual de un intento de examen:
 * carga de los datos del intento (vista de profesor), carga de archivos de
 * referencia, ejecución de código del alumno y guardado de la calificación manual.
 *
 * @param {string} attemptId - Id del intento de examen a corregir
 * @returns {Object} Estado y funciones relacionadas con la corrección manual
 */
export const useManualGrading = (attemptId) => {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [loadingReferenceFiles, setLoadingReferenceFiles] = useState(false);

  // La solución de referencia es del examen, no del intento: es la misma para
  // todos los alumnos. La cacheamos por examId para no volver a pedirla cada
  // vez que el profesor pasa de un alumno a otro del mismo examen.
  const referenceFilesCache = useRef(new Map());

  const loadAttemptDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAttemptProfessorView(attemptId);
      setAttempt(data);
      // No bloqueamos la pantalla esperando la solución de referencia: el
      // detalle del intento ya está listo para mostrarse.
      setLoading(false);

      if (data.exam.partes?.some(p => p.tipo === 'programming')) {
        const cached = referenceFilesCache.current.get(data.examId);
        if (cached) {
          setReferenceFiles(cached);
        } else {
          setReferenceFiles([]);
          setLoadingReferenceFiles(true);
          try {
            const refFiles = await getReferenceFiles(data.examId);
            referenceFilesCache.current.set(data.examId, refFiles || []);
            if (refFiles && refFiles.length > 0) {
              setReferenceFiles(refFiles);
            }
          } catch (error) {
            console.error('Error loading reference files:', error);
          } finally {
            setLoadingReferenceFiles(false);
          }
        }
      } else {
        setReferenceFiles([]);
      }

      return data;
    } catch (error) {
      console.error('Error loading attempt:', error);
      setLoading(false);
      return null;
    }
  }, [attemptId]);

  useEffect(() => {
    loadAttemptDetails();
  }, [loadAttemptDetails]);

  const executeCode = async ({ code, language, filename, useCustomInput, customInput, testCases }) => {
    try {
      setExecuting(true);
      setExecutionResult(null);

      const result = await executeCodeForGrading({
        code,
        language,
        filename,
        ...(useCustomInput && customInput && { customInput }),
        ...(!useCustomInput && testCases && { testCases }),
      });

      setExecutionResult(result);
    } catch (error) {
      console.error('Error executing code:', error);
      setExecutionResult({
        error: error.message || 'Error de conexión al ejecutar el código',
      });
    } finally {
      setExecuting(false);
    }
  };

  const saveGrade = async (calificacionManual) => {
    try {
      setSaving(true);
      await saveManualGrade(attemptId, calificacionManual);
      return true;
    } catch (error) {
      console.error('Error saving grade:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    attempt,
    executing,
    executionResult,
    setExecutionResult,
    saving,
    referenceFiles,
    loadingReferenceFiles,
    executeCode,
    saveGrade,
  };
};

export default useManualGrading;
