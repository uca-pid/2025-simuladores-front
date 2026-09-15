import { saveSubmissionFiles, finishExamAttempt } from '../services/api';

/**
 * Hook personalizado para gestionar la finalización de un examen de programación.
 * Crea el snapshot de "submission" con todos los archivos y marca el intento como finalizado.
 *
 * @param {Object} params
 * @param {string} params.examId - Id del examen
 * @param {Object|null} params.attempt - Intento actual
 * @param {Array} params.files - Lista de archivos conocidos por el servidor
 * @param {Object} params.fileCache - Caché en memoria de contenido de archivos
 * @param {string} params.code - Código del archivo actualmente abierto
 * @param {string} params.currentFileName - Nombre del archivo actualmente abierto
 * @param {Function} params.getMainFileName - Devuelve el nombre del archivo principal
 * @param {boolean} params.isInSEB - Si se está ejecutando dentro de Safe Exam Browser
 * @param {Function} params.closeSEB - Cierra SEB al finalizar
 * @param {Function} params.navigate - Navegación de react-router
 * @param {Function} params.setError - Setter de error compartido
 * @param {Function} params.setLoading - Setter de loading compartido
 * @returns {Object} Función `finishExam` para finalizar el examen
 */
export const useExamFinish = ({
  examId,
  attempt,
  files,
  fileCache,
  code,
  currentFileName,
  getMainFileName,
  isInSEB,
  closeSEB,
  navigate,
  setError,
  setLoading
}) => {
  // Función para finalizar examen
  const finishExam = async () => {
    if (!attempt) return;

    // 🔒 Validación: Verificar que existe el archivo principal
    const mainFileName = getMainFileName();
    const mainFileExists = files.some(f => f.filename === mainFileName) || fileCache[mainFileName];

    if (!mainFileExists) {
      setError(`Debes crear el archivo principal "${mainFileName}" antes de finalizar el examen`);
      return;
    }

    try {
      setLoading(true);

      // 📁 PASO 1: Crear versión de "submission" (snapshot del envío)
      // Recolectar todos los archivos con su contenido actual
      const submissionFiles = [];

      // Agregar archivos del caché (archivos con cambios no guardados)
      for (const filename of Object.keys(fileCache)) {
        submissionFiles.push({
          filename: filename,
          content: fileCache[filename]
        });
      }

      // Agregar el archivo actual si no está en el caché
      if (code && currentFileName && fileCache[currentFileName] === undefined) {
        submissionFiles.push({
          filename: currentFileName,
          content: code
        });
      }

      // Agregar archivos que no están en el caché pero existen en la lista
      for (const file of files) {
        const isInCache = submissionFiles.some(f => f.filename === file.filename);
        if (!isInCache) {
          submissionFiles.push({
            filename: file.filename,
            content: file.content
          });
        }
      }

      // Guardar archivos como versión de envío (submission)
      await saveSubmissionFiles(examId, submissionFiles);

      // 🏁 PASO 2: Finalizar el examen con el archivo principal
      // Obtener el contenido del archivo principal
      const mainFileContent = fileCache[mainFileName] ||
                             files.find(f => f.filename === mainFileName)?.content ||
                             '';

      await finishExamAttempt(attempt.id, mainFileContent);

      // Limpiar windowId del sessionStorage al completar el examen
      const examKey = `exam_${examId}_windowId`;
      sessionStorage.removeItem(examKey);

      // Manejar cierre según si está en SEB o no
      if (isInSEB) {
        closeSEB();
      } else {
        navigate('/student-exam');
      }
    } catch (err) {
      console.error('Error finishing exam:', err);
      setError(err.message || 'Error finalizando examen');
      setLoading(false);
    }
  };

  return { finishExam };
};

export default useExamFinish;
