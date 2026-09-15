import { useState, useEffect, useCallback } from 'react';
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

  const loadAttemptDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAttemptProfessorView(attemptId);

      console.log('🔍 Datos del intento recibidos:', data);
      console.log('🔍 Solución de referencia:', data.exam?.solucionReferencia);
      setAttempt(data);

      // Cargar archivos de referencia si es examen de programación
      if (data.exam.tipo === 'programming') {
        try {
          setLoadingReferenceFiles(true);
          const refFiles = await getReferenceFiles(data.examId);
          if (refFiles && refFiles.length > 0) {
            setReferenceFiles(refFiles);
          }
        } catch (error) {
          console.error('Error loading reference files:', error);
        } finally {
          setLoadingReferenceFiles(false);
        }
      }

      return data;
    } catch (error) {
      console.error('Error loading attempt:', error);
      return null;
    } finally {
      setLoading(false);
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
