import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getExamAttemptFiles,
  saveExamAttemptFile,
  deleteExamAttemptFile
} from '../services/api';

/**
 * Extrae los bloques "protegidos" (no editables) de un texto, delimitados por
 * comentarios marcadores `==RO==` / `==/RO==` (en Python `#`, en JS `//`).
 * El profesor marca así, en el código inicial, las partes que el alumno no
 * debe modificar (ej. funciones auxiliares provistas). Devuelve el texto
 * exacto de cada bloque (incluyendo los marcadores) para poder verificar
 * luego que sigue presente sin cambios en el código del alumno.
 */
const LOCK_START = /^\s*(#|\/\/)\s*==RO==\s*$/;
const LOCK_END = /^\s*(#|\/\/)\s*==\/RO==\s*$/;

export const extractLockedBlocks = (text) => {
  const lines = (text || '').split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (current === null && LOCK_START.test(line)) {
      current = [line];
    } else if (current !== null) {
      current.push(line);
      if (LOCK_END.test(line)) {
        blocks.push(current.join('\n'));
        current = null;
      }
    }
  }

  return blocks;
};

/**
 * Hook personalizado para gestionar los archivos de un intento de examen de programación.
 * Centraliza: carga de archivos, caché en memoria, tabs (mostrar/ocultar/reordenar),
 * guardado manual, creación y eliminación de archivos.
 *
 * @param {string} examId - Id del examen
 * @param {Object|null} exam - Examen ya cargado (para conocer el lenguaje de programación)
 * @param {Object|null} attempt - Intento de examen actual
 * @param {Function} setError - Setter de error compartido con la página
 * @returns {Object} Estado y funciones relacionadas con el manejo de archivos
 */
export const useExamFiles = (examId, exam, attempt, setError) => {
  const [code, setCode] = useState('');
  const [files, setFiles] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('main.py');
  const [showFileManager, setShowFileManager] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileOperationLoading, setFileOperationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // 💾 Caché en memoria para mantener cambios no guardados
  const [fileCache, setFileCache] = useState({});

  // 📝 Registro de archivos con cambios sin guardar
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());

  // 🔀 Estado para drag & drop de tabs
  const [draggedTab, setDraggedTab] = useState(null);

  // 👁️ Estado para archivos ocultos de la vista
  const [hiddenFiles, setHiddenFiles] = useState(new Set());

  // 🔒 Bloques de código protegidos (no editables) definidos en el código inicial del examen
  const lockedBlocksRef = useRef([]);
  useEffect(() => {
    lockedBlocksRef.current = extractLockedBlocks(exam?.codigoInicial);
  }, [exam]);

  // Referencia a la instancia de Monaco para poder deshacer ediciones inválidas
  const editorRef = useRef(null);
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Estados para modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState('');

  // 🔒 Función para obtener el nombre del archivo principal según el lenguaje
  const getMainFileName = useCallback(() => {
    if (!exam) return null;
    return exam.lenguajeProgramacion === 'python' ? 'main.py' : 'main.js';
  }, [exam]);

  // 🔒 Verificar si un archivo es el archivo principal
  const isMainFile = useCallback((filename) => {
    const mainFileName = getMainFileName();
    return mainFileName && filename === mainFileName;
  }, [getMainFileName]);

  // Funciones para manejo de archivos
  const fetchFiles = useCallback(async () => {
    if (!exam) return;

    try {
      const filesData = await getExamAttemptFiles(examId);

      // ✅ Ordenar archivos alfabéticamente para mantener orden consistente
      const sortedFiles = filesData.sort((a, b) =>
        a.filename.localeCompare(b.filename)
      );

      setFiles(sortedFiles);

      // 💾 Inicializar el caché con todos los archivos del servidor
      const initialCache = {};
      sortedFiles.forEach(file => {
        initialCache[file.filename] = file.content || '';
      });
      setFileCache(initialCache);

      // Si no hay archivos, crear uno por defecto con el código inicial del examen
      if (sortedFiles.length === 0) {
        // 🔒 IMPORTANTE: El archivo principal siempre es main.py (Python) o main.js (JavaScript)
        // Este archivo no se puede eliminar y es el que se evalúa con los test cases
        const defaultFileName = `main.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
        const defaultContent = exam?.codigoInicial || '';

        setCurrentFileName(defaultFileName);
        setCode(defaultContent);

        // 💾 Crear el archivo por defecto en el servidor
        try {
          await saveExamAttemptFile(examId, defaultFileName, defaultContent);

          // ✅ Actualizar la lista de archivos y caché inmediatamente
          setFiles([{
            filename: defaultFileName,
            content: defaultContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]);

          setFileCache({ [defaultFileName]: defaultContent });
        } catch (error) {
          console.error('Error creando archivo por defecto:', error);
        }
      } else {
        // Cargar el primer archivo
        const firstFile = sortedFiles[0];
        setCurrentFileName(firstFile.filename);
        setCode(firstFile.content || '');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, [examId, exam]);

  // Efecto para cargar archivos cuando el examen esté listo
  useEffect(() => {
    if (exam && attempt) {
      fetchFiles();
    }
  }, [exam, attempt, fetchFiles]);

  // Manejar cambios en el editor con debounce para reducir actualizaciones
  const handleEditorChange = useCallback((value) => {
    const newValue = value || '';

    // 🔒 Si el archivo actual es el principal y tiene bloques protegidos,
    // no permitir ediciones que los alteren o eliminen: se deshace el cambio.
    if (isMainFile(currentFileName) && lockedBlocksRef.current.length > 0) {
      const intacto = lockedBlocksRef.current.every(block => newValue.includes(block));
      if (!intacto) {
        editorRef.current?.trigger('keyboard', 'undo', null);
        return;
      }
    }

    setCode(newValue);

    // 💾 Actualizar el caché en tiempo real
    if (currentFileName) {
      setFileCache(prev => {
        // 📝 Solo marcar como no guardado si el contenido realmente cambió
        // respecto al último valor cacheado. Esto evita que un intento de
        // edición dentro de un bloque protegido (deshecho vía undo, que
        // dispara un segundo onChange con el valor ya revertido) marque el
        // archivo como "sin guardar" sin haber cambiado nada en los hechos.
        if (prev[currentFileName] !== newValue) {
          setUnsavedFiles(prevUnsaved => new Set(prevUnsaved).add(currentFileName));
        }
        return { ...prev, [currentFileName]: newValue };
      });
    }
  }, [currentFileName, isMainFile]);

  const saveCurrentFile = useCallback(async (filename = currentFileName, content = code) => {
    if (!filename || !attempt) return;

    try {
      setFileOperationLoading(true);

      await saveExamAttemptFile(examId, filename, content);

      setLastSaved(new Date());

      // 💾 Actualizar el caché con el contenido guardado
      setFileCache(prev => ({
        ...prev,
        [filename]: content
      }));

      // 📂 Solo actualizar la lista de archivos sin cambiar el archivo actual
      // No llamamos a fetchFiles() para evitar que cambie al primer archivo
      const filesData = await getExamAttemptFiles(examId);
      const sortedFiles = filesData.sort((a, b) =>
        a.filename.localeCompare(b.filename)
      );
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error saving file:', error);
      setError('Error guardando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, code, attempt, setError]);

  // Función para forzar guardado manual - guarda SOLO el archivo actual
  const [isOnSaveCooldown, setIsOnSaveCooldown] = useState(false);
  const handleManualSave = useCallback(async () => {
    if (!currentFileName) return;
    if (saving || isOnSaveCooldown) return;

    try {
      setSaving(true);

      // 💾 Guardar SOLO el archivo actual
      const content = fileCache[currentFileName] || code;
      await saveCurrentFile(currentFileName, content);

      // ✅ Limpiar marca de archivo sin guardar (solo el actual)
      setUnsavedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentFileName);
        return newSet;
      });
    } catch (error) {
      console.error('Error guardando archivo:', error);
    } finally {
      setSaving(false);
      setIsOnSaveCooldown(true);
      setTimeout(() => setIsOnSaveCooldown(false), 800);
    }
  }, [currentFileName, fileCache, code, saveCurrentFile, saving, isOnSaveCooldown]);

  const loadFile = useCallback((filename) => {
    // 💾 Guardar el contenido actual en el caché ANTES de cambiar
    if (currentFileName && code !== undefined) {
      setFileCache(prev => ({
        ...prev,
        [currentFileName]: code
      }));
    }

    // 📂 Cargar desde el caché (ya inicializado en fetchFiles)
    setFileCache(prev => {
      const content = prev[filename] || '';
      setCode(content);
      setCurrentFileName(filename);
      return prev;
    });
  }, [currentFileName, code]);

  // Función para ocultar archivo de la vista (no lo elimina)
  const hideFile = useCallback((filename) => {
    setHiddenFiles(prev => new Set(prev).add(filename));

    // Si el archivo oculto es el actual, cambiar a otro visible
    if (filename === currentFileName) {
      const visibleFiles = files.filter(f =>
        f.filename !== filename && !hiddenFiles.has(f.filename)
      );

      if (visibleFiles.length > 0) {
        loadFile(visibleFiles[0].filename);
      }
      // Si no queda ningún archivo visible al cual cambiar, dejamos
      // `currentFileName`/`code` (y por lo tanto `fileCache`) sin tocar.
      // Vaciar `code` acá corrompía el caché: al reabrir el archivo,
      // `loadFile` vuelca el `code` (ya vacío) sobre `fileCache[filename]`
      // antes de leerlo, perdiendo el contenido (ej. el código inicial).
    }
  }, [currentFileName, files, hiddenFiles, loadFile]);

  // Función para mostrar archivo en la vista
  const showFile = useCallback((filename) => {
    setHiddenFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(filename);
      return newSet;
    });
    loadFile(filename);
  }, [loadFile]);

  const requestDeleteFile = useCallback((filename) => {
    // 🔒 Proteger el archivo principal
    if (isMainFile(filename)) {
      setError('No puedes eliminar el archivo principal del examen');
      return;
    }

    setFileToDelete(filename);
    setShowDeleteModal(true);
  }, [isMainFile, setError]);

  const deleteFile = useCallback(async () => {
    if (!fileToDelete) return;

    try {
      setFileOperationLoading(true);

      await deleteExamAttemptFile(examId, fileToDelete);

      // Eliminar del cache
      setFileCache(prevCache => {
        const newCache = { ...prevCache };
        delete newCache[fileToDelete];
        return newCache;
      });

      // Eliminar de unsavedFiles
      setUnsavedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileToDelete);
        return newSet;
      });

      // Actualizar lista de archivos sin llamar a fetchFiles() para no perder cambios
      const remainingFiles = files.filter(f => f.filename !== fileToDelete);
      setFiles(remainingFiles);

      // Si eliminamos el archivo actual, cambiar a otro
      if (fileToDelete === currentFileName) {
        if (remainingFiles.length > 0) {
          await loadFile(remainingFiles[0].filename);
        } else {
          const defaultFileName = `main.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
          setCurrentFileName(defaultFileName);
          setCode('');
        }
      }

      // Limpiar estado del modal
      setShowDeleteModal(false);
      setFileToDelete('');
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error eliminando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, files, exam?.lenguajeProgramacion, loadFile, fileToDelete, setError]);

  const createNewFile = useCallback(async () => {
    // La validación visual ya previene estos casos, pero por seguridad mantenemos las validaciones
    if (!newFileName.trim()) return;

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newFileName)) return;

    const extension = exam?.lenguajeProgramacion === 'python' ? '.py' : '.js';
    const fileName = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;

    if (files.find(f => f.filename.toLowerCase() === fileName.toLowerCase())) return;

    // Si llegamos aquí, el archivo es válido para crear
    try {
      await saveCurrentFile(fileName, '# Nuevo archivo\n');
      setCurrentFileName(fileName);
      setCode('# Nuevo archivo\n');
      setNewFileName('');
      setShowFileManager(false);
    } catch (error) {
      console.error('Error al crear archivo:', error);
      // El error será manejado por la UI visual, no necesitamos modal
    }
  }, [newFileName, exam?.lenguajeProgramacion, files, saveCurrentFile, setCode, setCurrentFileName]);

  // 🔀 Funciones para drag & drop de tabs
  const handleDragStart = useCallback((e, index) => {
    setDraggedTab(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTab(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();

    if (draggedTab === null || draggedTab === dropIndex) return;

    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const draggedFile = newFiles[draggedTab];

      // Remover el archivo de su posición original
      newFiles.splice(draggedTab, 1);
      // Insertar en la nueva posición
      newFiles.splice(dropIndex, 0, draggedFile);

      return newFiles;
    });
  }, [draggedTab]);

  return {
    code,
    setCode,
    files,
    setFiles,
    currentFileName,
    setCurrentFileName,
    showFileManager,
    setShowFileManager,
    newFileName,
    setNewFileName,
    fileOperationLoading,
    saving,
    lastSaved,
    fileCache,
    unsavedFiles,
    draggedTab,
    hiddenFiles,
    showDeleteModal,
    setShowDeleteModal,
    fileToDelete,
    setFileToDelete,
    isOnSaveCooldown,
    getMainFileName,
    isMainFile,
    fetchFiles,
    handleEditorChange,
    handleEditorMount,
    saveCurrentFile,
    handleManualSave,
    loadFile,
    hideFile,
    showFile,
    requestDeleteFile,
    deleteFile,
    createNewFile,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
};

export default useExamFiles;
