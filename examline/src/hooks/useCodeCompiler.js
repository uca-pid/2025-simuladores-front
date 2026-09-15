import { useState } from 'react';
import { runCode } from '../services/api';

/**
 * Hook personalizado para gestionar la ejecución/compilación de código
 * durante un examen de programación.
 *
 * @param {string} examId - Id del examen
 * @param {Object|null} exam - Examen actual (para conocer el lenguaje)
 * @param {string} code - Código actual del archivo activo
 * @returns {Object} Estado y funciones relacionadas con la compilación
 */
export const useCodeCompiler = (examId, exam, code) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [isOnCompileCooldown, setIsOnCompileCooldown] = useState(false);
  const [compilationResult, setCompilationResult] = useState(null);
  const [userInput, setUserInput] = useState('');

  // Función para compilar código
  const handleCompile = async () => {
    if (isCompiling || isOnCompileCooldown) return;

    try {
      setIsCompiling(true);
      setCompilationResult(null);

      const result = await runCode({
        code: code,
        language: exam?.lenguajeProgramacion || 'python',
        examId: examId,
        input: userInput || '' // Enviar el input del usuario
      });

      setCompilationResult({
        success: true,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime
      });
    } catch (error) {
      console.error('Error compilando:', error);
      setCompilationResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsCompiling(false);
      setIsOnCompileCooldown(true);
      setTimeout(() => setIsOnCompileCooldown(false), 1000);
    }
  };

  return {
    isCompiling,
    isOnCompileCooldown,
    compilationResult,
    userInput,
    setUserInput,
    handleCompile
  };
};

export default useCodeCompiler;
