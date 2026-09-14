import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getExamById, API_BASE_URL } from '../services/api';
import { useSEB } from '../hooks';
import Modal from '../components/Modal';

const ProgrammingExamView = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Usar hook de SEB
  const { isInSEB, closeSEB } = useSEB();
  
  // Estados para manejo de archivos
  const [files, setFiles] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('main.py');
  const [showFileManager, setShowFileManager] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileOperationLoading, setFileOperationLoading] = useState(false);
  
  // 💾 Caché en memoria para mantener cambios no guardados
  const [fileCache, setFileCache] = useState({});
  
  // 📝 Registro de archivos con cambios sin guardar
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  
  // 🔀 Estado para drag & drop de tabs
  const [draggedTab, setDraggedTab] = useState(null);
  
  // 👁️ Estado para archivos ocultos de la vista
  const [hiddenFiles, setHiddenFiles] = useState(new Set());
  
  // Estados para modales
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState('');
  
  // Estado para compilación
  const [isCompiling, setIsCompiling] = useState(false);
  const [isOnCompileCooldown, setIsOnCompileCooldown] = useState(false);
  const [isOnSaveCooldown, setIsOnSaveCooldown] = useState(false);
  const [compilationResult, setCompilationResult] = useState(null);
  const [userInput, setUserInput] = useState('');
  // Navegación lateral (Consigna | Programación)
  const [activeSection, setActiveSection] = useState('programacion'); // 'consigna' | 'programacion'
  
  // 📱 Estado para sidebar colapsado en móviles
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // 🔄 Estado para alternar entre vista de entrada/salida en móviles
  const [mobileTerminalView, setMobileTerminalView] = useState('output'); // 'input' | 'output'

  // Obtener windowId de la URL o del sessionStorage
  const searchParams = new URLSearchParams(location.search);
  const windowIdFromUrl = searchParams.get('windowId');
  const examKey = `exam_${examId}_windowId`;
  
  // Si hay windowId en la URL, guardarlo en sessionStorage
  if (windowIdFromUrl) {
    sessionStorage.setItem(examKey, windowIdFromUrl);
  }
  
  // Usar windowId de la URL o recuperarlo de sessionStorage
  const windowId = windowIdFromUrl || sessionStorage.getItem(examKey);

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

  // Configuración del editor Monaco optimizada para reducir ResizeObserver errors
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // 📱 Detectar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Auto-colapsar sidebar en móviles
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Ejecutar al montar
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

    // 🔒 Bloquear retroceso del navegador y advertir sobre salir del examen
  useEffect(() => {
    // Función para mostrar modal antes de ir atrás
    const handlePopState = (e) => {
      e.preventDefault();

      // Empujar la misma ruta para que no navegue
      window.history.pushState(null, '', window.location.pathname);
    };

    // Bloquear retroceso con pushState
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Bloquear cierre de pestaña
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '⚠️ Si sales ahora, perderás todo tu progreso en el examen.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: windowWidth > 768 }, // Deshabilitar minimap en móviles
    fontSize: windowWidth < 768 ? 12 : 14, // Fuente más pequeña en móviles
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      // Reducir la sensibilidad del scrollbar para evitar resize loops
      verticalScrollbarSize: windowWidth < 768 ? 8 : 12,
      horizontalScrollbarSize: windowWidth < 768 ? 8 : 12
    },
    // Optimizaciones para reducir redraws
    smoothScrolling: false,
    disableLayerHinting: true,
    // Reducir actualizaciones de DOM
    occurrencesHighlight: false,
    renderLineHighlight: 'none'
  };

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
      const checkResponse = await fetch(`${API_BASE_URL}/exam-attempts/check/${examId}?windowId=${windowId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const checkData = await checkResponse.json();
      
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
        const createResponse = await fetch(`${API_BASE_URL}/exam-attempts/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            examId: parseInt(examId),
            examWindowId: windowId ? parseInt(windowId) : null
          })
        });
        const createData = await createResponse.json();
        setAttempt(createData);
      }
    } catch (err) {
      console.error('Error with exam attempt:', err);
      setError(err.response?.data?.error || 'Error iniciando examen');
    }
  }, [examId, windowId, navigate]);

  // Funciones para manejo de archivos
  const fetchFiles = useCallback(async () => {
    if (!exam) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const filesData = await response.json();
        
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
            await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                filename: defaultFileName,
                content: defaultContent
              })
            });
            
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
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, [examId, exam]);

  // Función para guardar código automáticamente (no se usa actualmente pero se deja por si se necesita)
  // eslint-disable-next-line no-unused-vars
  const saveCode = useCallback(async (currentCode) => {
    if (!attempt || attempt.estado !== 'en_progreso') return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE_URL}/exam-attempts/${attempt.id}/save-code`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codigoProgramacion: currentCode
        })
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving code:', err);
    } finally {
      setSaving(false);
    }
  }, [attempt]);

  // Función para mostrar el modal de confirmación
  const handleFinishExamClick = () => {
    setShowFinishModal(true);
  };

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
    
    setShowFinishModal(false);
    
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
      
      const token = localStorage.getItem('token');
      
      // Guardar archivos como versión de envío (submission)
      await fetch(`${API_BASE_URL}/exam-files/${examId}/files/submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          files: submissionFiles
        })
      });
      
      // 🏁 PASO 2: Finalizar el examen con el archivo principal
      // Obtener el contenido del archivo principal
      const mainFileContent = fileCache[mainFileName] || 
                             files.find(f => f.filename === mainFileName)?.content || 
                             '';
      
      await fetch(`${API_BASE_URL}/exam-attempts/${attempt.id}/finish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codigoProgramacion: mainFileContent
        })
      });

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

  // Efecto para cargar archivos cuando el examen esté listo
  useEffect(() => {
    if (exam && attempt) {
      fetchFiles();
    }
  }, [exam, attempt, fetchFiles]);

  // Efecto para guardado automático cada 30 segundos
/*  useEffect(() => {
    if (!attempt || attempt.estado !== 'en_progreso') return;
    
    const interval = setInterval(() => {
      saveCode(code);
    }, 30000); // Guardar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [code, attempt, saveCode]);
*/

  // Manejar cambios en el editor con debounce para reducir actualizaciones
  const handleEditorChange = useCallback((value) => {
    const newValue = value || '';
    setCode(newValue);
    
    // 💾 Actualizar el caché en tiempo real
    if (currentFileName) {
      setFileCache(prev => ({
        ...prev,
        [currentFileName]: newValue
      }));
      
      // 📝 Marcar archivo como no guardado
      setUnsavedFiles(prev => new Set(prev).add(currentFileName));
    }
  }, [currentFileName]);

  // (Se mueve más abajo, después de saveCurrentFile)


  const saveCurrentFile = useCallback(async (filename = currentFileName, content = code) => {
    if (!filename || !attempt) return;
    
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: filename,
          content: content
        })
      });
      
      setLastSaved(new Date());
      
      // 💾 Actualizar el caché con el contenido guardado
      setFileCache(prev => ({
        ...prev,
        [filename]: content
      }));
      
      // 📂 Solo actualizar la lista de archivos sin cambiar el archivo actual
      // No llamamos a fetchFiles() para evitar que cambie al primer archivo
      const response = await fetch(`${API_BASE_URL}/exam-files/${examId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const filesData = await response.json();
        const sortedFiles = filesData.sort((a, b) => 
          a.filename.localeCompare(b.filename)
        );
        setFiles(sortedFiles);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setError('Error guardando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, code, attempt]);

  // Función para forzar guardado manual - guarda SOLO el archivo actual
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
    
    // � Cargar desde el caché (ya inicializado en fetchFiles)
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
      } else {
        // Si no hay archivos visibles, crear uno nuevo por defecto
        const defaultFileName = `main.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
        setCurrentFileName(defaultFileName);
        setCode('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFileName, files, exam?.lenguajeProgramacion]);

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
  }, [isMainFile]);

  const deleteFile = useCallback(async () => {
    if (!fileToDelete) return;
    
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      
      await fetch(`${API_BASE_URL}/exam-files/${examId}/files/${fileToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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
  }, [examId, currentFileName, files, exam?.lenguajeProgramacion, loadFile, fileToDelete]);

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

  // Función para compilar código
  const handleCompile = async () => {
    if (isCompiling || isOnCompileCooldown) return;
    
    try {
      setIsCompiling(true);
      setCompilationResult(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/code-execution/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: code,
          language: exam?.lenguajeProgramacion || 'python',
          examId: examId,
          input: userInput || '' // Enviar el input del usuario
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setCompilationResult({
          success: true,
          output: result.output,
          error: result.error,
          executionTime: result.executionTime
        });
      } else {
        console.error('Error en respuesta:', result);
        setCompilationResult({
          success: false,
          error: result.error || 'Error desconocido'
        });
      }
      
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

  // 🔀 Funciones para drag & drop de tabs
  const handleDragStart = (e, index) => {
    setDraggedTab(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTab(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedTab === null || draggedTab === dropIndex) return;
    
    const newFiles = [...files];
    const draggedFile = newFiles[draggedTab];
    
    // Remover el archivo de su posición original
    newFiles.splice(draggedTab, 1);
    // Insertar en la nueva posición
    newFiles.splice(dropIndex, 0, draggedFile);
    
    setFiles(newFiles);
  };

  // ⌨️ Atajo de teclado Ctrl+S para guardar
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+S o Cmd+S (para Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Prevenir el diálogo de guardar del navegador
        handleManualSave();
      }
    };

    // Agregar el listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: remover el listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleManualSave]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => {
              // Limpiar windowId del sessionStorage
              const examKey = `exam_${examId}_windowId`;
              sessionStorage.removeItem(examKey);
              navigate('/student-exam');
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !attempt) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          No se pudo cargar el examen o el intento.
        </div>
      </div>
    );
  }

  return (
    <div className="programming-exam-container">
      {/* Header personalizado para el examen */}
      <div className="programming-exam-header">
        <div className="container-fluid">
          <div className="row align-items-center py-2">
            <div className="col-auto d-none d-md-block">
              <div className="exam-logo">
                <i className="fas fa-laptop-code"></i>
              </div>
            </div>
            <div className="col">
              <h1 className="exam-title mb-0">{exam.titulo}</h1>
              <small className="exam-subtitle d-none d-sm-block">
                {exam.lenguajeProgramacion === 'python' ? '🐍 Python' : '⚡ JavaScript'} • 
                {exam.intellisenseHabilitado ? ' ✨ Intellisense activo' : ' 🔒 Intellisense desactivado'}
                {isInSEB && ' • 🔒 Modo Seguro (SEB)'}
              </small>
            </div>
            <div className="col-auto">
              <div className="exam-status">
                {saving ? (
                  <span className="status-saving">
                    <i className="fas fa-spinner fa-spin me-1"></i>
                    <span className="d-none d-sm-inline">Guardando...</span>
                  </span>
                ) : lastSaved ? (
                  <span className="status-saved">
                    <i className="fas fa-check me-1"></i>
                    <span className="d-none d-sm-inline">Guardado {lastSaved.toLocaleTimeString()}</span>
                  </span>
                ) : (
                  <span className="status-unsaved">
                    <i className="fas fa-clock me-1"></i>
                    <span className="d-none d-sm-inline">Sin guardar</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con sidebar */}
      <div className="programming-exam-content">
        <div className={`exam-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Overlay para cerrar el sidebar en móviles */}
          {!isSidebarCollapsed && windowWidth < 768 && (
            <div 
              className="sidebar-overlay"
              onClick={() => setIsSidebarCollapsed(true)}
            />
          )}
          
          {/* Botón toggle para móviles */}
          <button 
            className="sidebar-toggle d-md-none"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${isSidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
          </button>
          
          {/* Sidebar */}
          <aside className={`exam-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
              <div className="student-pill" title="Alumno">
                <i className="fas fa-user-graduate"></i>
              </div>
              <div className="sidebar-title">Examen</div>
            </div>
            <nav className="sidebar-nav">
              <button
                className={`sidebar-item ${activeSection === 'consigna' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection('consigna');
                  if (windowWidth < 768) setIsSidebarCollapsed(true);
                }}
              >
                <i className="fas fa-file-alt me-2"></i>
                <span className="sidebar-text">Consigna</span>
              </button>
              <button
                className={`sidebar-item ${activeSection === 'programacion' ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection('programacion');
                  if (windowWidth < 768) setIsSidebarCollapsed(true);
                }}
              >
                <i className="fas fa-code me-2"></i>
                <span className="sidebar-text">Programación</span>
              </button>
            </nav>
            
            {/* Aviso importante sobre la entrega */}
            <div style={{
              padding: '12px',
              margin: '12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderLeft: '4px solid #2196f3',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#1976d2', display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>
                    📝 Importante:
                  </strong>
                  <div style={{ color: '#0d47a1', lineHeight: '1.4' }}>
                    Entregar la versión final en el archivo main.py y guardar manualmente antes de finalizar.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sidebar-footer">
              <button
                className="btn-send-exam"
                onClick={handleFinishExamClick}
                disabled={loading || saving}
              >
                <i className="fas fa-paper-plane me-2"></i>
                <span className="sidebar-text">Finalizar examen</span>
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="exam-main">
            {activeSection === 'consigna' ? (
              <div className="consigna-panel">
                <h3 className="consigna-title">
                  <i className="fas fa-puzzle-piece me-2"></i>
                  Consigna
                </h3>
                <div className="problem-statement">
                  {exam.enunciadoProgramacion}
                </div>
              </div>
            ) : (
              <div className="programming-area">
                {/* Toolbar superior: tabs y acciones */}
                <div className="editor-header">
                  <div className="editor-navigation-section">
                    {files.length <= 6 ? (
                      <div className="editor-tabs">
                        {files.filter(file => !hiddenFiles.has(file.filename)).map((file, index) => (
                          <div
                            key={file.filename}
                            className={`editor-tab ${file.filename === currentFileName ? 'active' : ''} ${draggedTab === index ? 'dragging' : ''}`}
                            onClick={() => loadFile(file.filename)}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                          >
                            <i className="fas fa-grip-vertical me-2" style={{opacity: 0.5, cursor: 'grab'}}></i>
                            <i className="fas fa-file-code me-2"></i>
                            <span className="tab-filename">{file.filename}</span>
                            {unsavedFiles.has(file.filename) && (
                              <span className="unsaved-indicator" title="Cambios sin guardar">●</span>
                            )}
                            <button
                              className="file-close-btn ms-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                hideFile(file.filename);
                              }}
                              title="Ocultar pestaña (no elimina el archivo)"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          className="editor-tab new-file-tab"
                          onClick={() => setShowFileManager(true)}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Nuevo
                        </button>
                      </div>
                    ) : (
                      <div className="editor-navigation-compact">
                        <div className="editor-nav-controls">
                          <select
                            value={currentFileName}
                            onChange={(e) => loadFile(e.target.value)}
                            className="file-selector-dropdown"
                          >
                            {files.filter(file => !hiddenFiles.has(file.filename)).map((file, index) => (
                              <option key={file.filename} value={file.filename}>
                                {index + 1}. {file.filename}
                              </option>
                            ))}
                          </select>
                          <div className="nav-buttons">
                            <button
                              onClick={() => {
                                const visibleFiles = files.filter(f => !hiddenFiles.has(f.filename));
                                const currentIndex = visibleFiles.findIndex(f => f.filename === currentFileName);
                                const prevIndex = Math.max(0, currentIndex - 1);
                                if (prevIndex !== currentIndex) {
                                  loadFile(visibleFiles[prevIndex].filename);
                                }
                              }}
                              disabled={files.filter(f => !hiddenFiles.has(f.filename)).findIndex(f => f.filename === currentFileName) === 0}
                              className="nav-btn prev-btn"
                            >
                              <i className="fas fa-chevron-left"></i>
                            </button>
                            <button
                              onClick={() => {
                                const visibleFiles = files.filter(f => !hiddenFiles.has(f.filename));
                                const currentIndex = visibleFiles.findIndex(f => f.filename === currentFileName);
                                const nextIndex = Math.min(visibleFiles.length - 1, currentIndex + 1);
                                if (nextIndex !== currentIndex) {
                                  loadFile(visibleFiles[nextIndex].filename);
                                }
                              }}
                              disabled={files.filter(f => !hiddenFiles.has(f.filename)).findIndex(f => f.filename === currentFileName) === files.filter(f => !hiddenFiles.has(f.filename)).length - 1}
                              className="nav-btn next-btn"
                            >
                              <i className="fas fa-chevron-right"></i>
                            </button>
                            <button
                              className="nav-btn new-file-btn"
                              onClick={() => setShowFileManager(true)}
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                        </div>
                        <div className="editor-tabs-scroll">
                          <div className="editor-tabs-container">
                            {files.filter(file => !hiddenFiles.has(file.filename)).map((file, index) => (
                              <div
                                key={file.filename}
                                className={`editor-tab-compact ${file.filename === currentFileName ? 'active' : ''} ${draggedTab === index ? 'dragging' : ''}`}
                                onClick={() => loadFile(file.filename)}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                              >
                                <i className="fas fa-grip-vertical" style={{fontSize: '0.7rem', opacity: 0.5, cursor: 'grab', marginRight: '2px'}}></i>
                                <i className="fas fa-file-code"></i>
                                <span className="tab-filename-short">
                                  {file.filename.length > 10 ? file.filename.substring(0, 10) + '...' : file.filename}
                                </span>
                                {unsavedFiles.has(file.filename) && (
                                  <span className="unsaved-indicator" title="Cambios sin guardar">●</span>
                                )}
                                <button
                                  className="file-close-btn-compact"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    hideFile(file.filename);
                                  }}
                                  title="Ocultar pestaña (no elimina el archivo)"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="editor-divider"></div>
                  <div className="editor-controls">
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => setShowFileManager(true)}
                    >
                      <i className="fas fa-folder me-1"></i>
                      <span>Archivos</span>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={handleCompile}
                      disabled={isCompiling || isOnCompileCooldown}
                    >
                      {isCompiling ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-1"></i>
                          <span>Compilando...</span>
                        </>
                      ) : isOnCompileCooldown ? (
                        <>
                          <i className="fas fa-clock me-1"></i>
                          <span>Espera...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-play me-1"></i>
                          <span>Ejecutar</span>
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleManualSave}
                      disabled={saving || fileOperationLoading || isOnSaveCooldown}
                    >
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-1"></i>
                          <span>Guardando</span>
                        </>
                      ) : isOnSaveCooldown ? (
                        <>
                          <i className="fas fa-clock me-1"></i>
                          <span>Espera...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grilla principal: izquierda (editor+input) | derecha (output) */}
                <div className="programming-grid">
                  <div className="grid-left">
                    <div className="editor-content">
                      <Editor
                        height="100%"
                        language={exam.lenguajeProgramacion}
                        theme="vs-dark"
                        value={code}
                        onChange={handleEditorChange}
                        options={{
                          ...editorOptions,
                          readOnly: saving || fileOperationLoading,
                          quickSuggestions: exam.intellisenseHabilitado,
                          suggestOnTriggerCharacters: exam.intellisenseHabilitado,
                          acceptSuggestionOnEnter: exam.intellisenseHabilitado ? 'on' : 'off',
                          tabCompletion: exam.intellisenseHabilitado ? 'on' : 'off',
                          wordBasedSuggestions: exam.intellisenseHabilitado,
                          parameterHints: { enabled: exam.intellisenseHabilitado }
                        }}
                      />
                    </div>
                    <div className="input-section compact d-none d-md-block">
                      <label htmlFor="userInput" className="input-label">
                        <i className="fas fa-keyboard me-2"></i>
                        Entrada del programa (stdin)
                      </label>
                      <textarea
                        id="userInput"
                        className="input-field"
                        placeholder={`Ejemplo:\n2\n3`}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={saving || isCompiling}
                        rows="3"
                      />
                      <small className="input-hint">
                        Se envía como entrada al ejecutar
                      </small>
                    </div>
                  </div>
                  
                  <div className="grid-right">
                    {/* Vista desktop: solo panel de salida */}
                    <div className="output-panel d-none d-md-flex">
                      <div className="output-header">
                        <i className="fas fa-terminal me-2"></i> Salida
                        {compilationResult?.executionTime && (
                          <span className="execution-time ms-2">⏱️ {compilationResult.executionTime}ms</span>
                        )}
                      </div>
                      <div className="output-body">
                        {compilationResult ? (
                          <>
                            {compilationResult.output && (
                              <pre className="output-content console">{compilationResult.output}</pre>
                            )}
                            {compilationResult.error && (
                              <pre className="error-content console">{compilationResult.error}</pre>
                            )}
                            {!compilationResult.output && !compilationResult.error && compilationResult.success && (
                              <div className="no-output"><i className="fas fa-info-circle me-2"></i>(sin salida)</div>
                            )}
                          </>
                        ) : (
                          <div className="output-placeholder">
                            <i className="fas fa-play-circle me-2"></i>
                            Ejecuta tu programa para ver la salida aquí
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Vista móvil: panel intercambiable */}
                    <div className="terminal-mobile d-md-none">
                      {/* Pestañas para móvil */}
                      <div className="mobile-terminal-tabs">
                        <button
                          className={`mobile-terminal-tab ${mobileTerminalView === 'output' ? 'active' : ''}`}
                          onClick={() => setMobileTerminalView('output')}
                        >
                          <i className="fas fa-terminal"></i>
                          <span className="ms-2">Salida</span>
                          {compilationResult && (
                            <span className="terminal-badge ms-1">
                              {compilationResult.success ? '✓' : '✗'}
                            </span>
                          )}
                        </button>
                        <button
                          className={`mobile-terminal-tab ${mobileTerminalView === 'input' ? 'active' : ''}`}
                          onClick={() => setMobileTerminalView('input')}
                        >
                          <i className="fas fa-keyboard"></i>
                          <span className="ms-2">Entrada</span>
                          {userInput.trim() && (
                            <span className="terminal-badge ms-1">●</span>
                          )}
                        </button>
                      </div>
                      
                      {/* Contenido móvil */}
                      <div className="mobile-terminal-content">
                        {mobileTerminalView === 'output' ? (
                          <div className="mobile-output-panel">
                            <div className="mobile-output-body">
                              {compilationResult ? (
                                <>
                                  {compilationResult.output && (
                                    <pre className="output-content console">{compilationResult.output}</pre>
                                  )}
                                  {compilationResult.error && (
                                    <pre className="error-content console">{compilationResult.error}</pre>
                                  )}
                                  {!compilationResult.output && !compilationResult.error && compilationResult.success && (
                                    <div className="no-output"><i className="fas fa-info-circle me-2"></i>(sin salida)</div>
                                  )}
                                </>
                              ) : (
                                <div className="output-placeholder">
                                  <i className="fas fa-play-circle me-2"></i>
                                  Ejecuta tu programa para ver la salida
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mobile-input-panel">
                            <textarea
                              id="userInputMobile"
                              className="mobile-input-field"
                              placeholder={`Ingresa los datos aquí...\n\nEjemplo:\n2\n3`}
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              disabled={saving || isCompiling}
                            />
                            <div className="mobile-input-hint">
                              <i className="fas fa-info-circle me-1"></i>
                              Se enviará al programa al ejecutar
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        .programming-exam-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .programming-exam-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }

        .exam-logo {
          width: 48px;
          height: 48px;
          background: linear-gradient(45deg, #667eea, #764ba2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        }

        .exam-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }
        
        @media (max-width: 768px) {
          .exam-title {
            font-size: 1.2rem;
          }
        }
        
        @media (max-width: 480px) {
          .exam-title {
            font-size: 1rem;
          }
        }

        .exam-subtitle {
          color: #718096;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .exam-status {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .exam-status {
            padding: 6px 10px;
            font-size: 0.75rem;
          }
        }

        .status-saving {
          background: rgba(255, 193, 7, 0.1);
          color: #f59e0b;
        }

        .status-saved {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-unsaved {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }

        .programming-exam-content {
          flex: 1;
          overflow: hidden;
        }

        .programming-problem-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
        }

        .programming-editor-panel {
          background: #1e1e1e;
        }

        .problem-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 24px;
        }

        .problem-header h3 {
          color: #2d3748;
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .problem-content {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 24px;
        }

        .problem-statement {
          background: rgba(247, 250, 252, 0.8);
          border: 2px solid rgba(226, 232, 240, 0.5);
          border-radius: 12px;
          padding: 20px;
          white-space: pre-wrap;
          font-size: 1rem;
          line-height: 1.7;
          color: #374151;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .compilation-result {
          margin-top: 20px;
          border-radius: 12px;
          padding: 16px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .compilation-result.success {
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid rgba(16, 185, 129, 0.3);
        }

        .compilation-result.error {
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
        }

        .compilation-header {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
        }

        .compilation-result.success .compilation-header {
          color: #059669;
        }

        .compilation-result.error .compilation-header {
          color: #dc2626;
        }

        .execution-time {
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          background: rgba(255, 255, 255, 0.5);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .output-section, .error-section {
          margin-top: 12px;
        }

        .output-label, .error-label {
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .output-label {
          color: #059669;
        }

        .error-label {
          color: #dc2626;
        }

        .output-content, .error-content {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 12px;
          margin: 0;
          white-space: pre-wrap;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          max-height: 200px;
          overflow-y: auto;
        }

        .output-content {
          color: #1f2937;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .error-content {
          color: #991b1b;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .no-output {
          color: #6b7280;
          font-style: italic;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .input-section {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(243, 244, 246, 0.5);
          border: 2px solid rgba(209, 213, 219, 0.5);
          border-radius: 12px;
          animation: slideIn 0.3s ease;
        }

        .input-label {
          display: block;
          font-weight: 600;
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-field {
          width: 100%;
          padding: 12px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          background: white;
          color: #1f2937;
          resize: vertical;
          transition: all 0.2s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-field::placeholder {
          color: #9ca3af;
          font-style: italic;
        }

        .input-hint {
          display: block;
          margin-top: 6px;
          font-size: 0.8rem;
          color: #6b7280;
          font-style: italic;
        }

        .problem-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-action {
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-save {
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-finish {
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
        }

        .btn-finish:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .editor-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          contain: layout style; /* Optimización de rendering */
          will-change: auto; /* Evitar optimizaciones innecesarias */
        }

        .editor-header {
          background: #2d2d2d;
          border-bottom: 1px solid #3e3e3e;
          padding: 0;
          display: flex;
          align-items: stretch;
          height: 60px; /* Altura fija */
          position: relative;
          flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
          .editor-header {
            height: auto;
            min-height: 50px;
            align-items: center;
          }
        }

        /* Sección de navegación de archivos - izquierda */
        .editor-navigation-section {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 15px;
          overflow: hidden;
          min-width: 0;
        }
        
        @media (max-width: 768px) {
          .editor-navigation-section {
            padding: 0 8px;
            flex: 0 1 auto;
            order: 1;
            max-width: calc(100% - 200px);
          }
        }
        
        @media (max-width: 480px) {
          .editor-navigation-section {
            max-width: calc(100% - 160px);
          }
        }

        /* Línea divisoria vertical */
        .editor-divider {
          width: 1px;
          background: #3e3e3e;
          height: 100%;
          flex-shrink: 0;
        }
        
        @media (max-width: 768px) {
          .editor-divider {
            display: none;
          }
        }

        .editor-tabs {
          display: flex;
          overflow-x: auto;
          scrollbar-width: thin;
          height: 60px; /* Altura fija igual al header */
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .editor-tabs {
            height: 50px;
          }
        }

        .editor-tabs::-webkit-scrollbar {
          height: 3px;
        }

        .editor-tabs::-webkit-scrollbar-track {
          background: #2d2d2d;
        }

        .editor-tabs::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 3px;
        }

        .editor-tab {
          padding: 12px 16px;
          background: #1e1e1e;
          color: #cccccc;
          border-right: 1px solid #3e3e3e;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          min-width: 120px;
          max-width: 200px;
        }
        
        @media (max-width: 768px) {
          .editor-tab {
            padding: 8px 12px;
            font-size: 0.75rem;
            min-width: 100px;
            max-width: 150px;
          }
        }
        
        @media (max-width: 480px) {
          .editor-tab {
            padding: 6px 10px;
            font-size: 0.7rem;
            min-width: 80px;
            max-width: 120px;
          }
        }

        .editor-tab:hover:not(.active) {
          background: #2d2d2d;
        }

        .editor-tab.active {
          background: #007acc;
          color: white;
        }

        .tab-filename {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        /* Indicador de cambios sin guardar (círculo blanco como VS Code) */
        .unsaved-indicator {
          color: white;
          font-size: 16px;
          margin-left: 6px;
          margin-right: -2px;
          line-height: 1;
          opacity: 0.9;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.9;
          }
          50% {
            opacity: 0.5;
          }
        }

        .editor-tab.active .unsaved-indicator {
          color: white;
        }

        .editor-tab:not(.active) .unsaved-indicator {
          color: #cccccc;
        }

        /* Estilos para drag & drop de tabs */
        .editor-tab.dragging {
          opacity: 0.5;
        }

        .tab-grip {
          margin-right: 8px;
          color: #666;
          font-size: 12px;
          cursor: grab;
        }

        .editor-tab.dragging .tab-grip {
          cursor: grabbing;
        }

        .editor-tab:hover .tab-grip {
          color: #888;
        }

        /* Navegación compacta para muchos archivos */
        .editor-navigation-compact {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 60px; /* Altura fija igual al header */
          background: #2d2d2d;
        }
        
        @media (max-width: 768px) {
          .editor-navigation-compact {
            flex-direction: row;
            height: auto;
            align-items: center;
            gap: 8px;
          }
        }

        .editor-nav-controls {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          gap: 8px;
          background: #252526;
          border-bottom: 1px solid #3e3e3e;
          height: 30px; /* Altura fija para controles */
          flex-shrink: 0;
        }
        
        @media (max-width: 768px) {
          .editor-nav-controls {
            border-bottom: none;
            padding: 4px 6px;
            gap: 6px;
            height: auto;
            flex: 0 1 auto;
          }
        }

        .file-selector-dropdown {
          flex: 1;
          padding: 6px 8px;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #cccccc;
          font-size: 0.85rem;
          min-width: 200px;
        }
        
        @media (max-width: 768px) {
          .file-selector-dropdown {
            min-width: 120px;
            max-width: 150px;
            font-size: 0.75rem;
            padding: 4px 6px;
          }
        }
        
        @media (max-width: 480px) {
          .file-selector-dropdown {
            min-width: 100px;
            max-width: 120px;
            font-size: 0.7rem;
          }
        }

        .file-selector-dropdown:focus {
          outline: none;
          border-color: #007acc;
        }

        .nav-buttons {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .nav-btn {
          padding: 6px 8px;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #cccccc;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.8rem;
        }
        
        @media (max-width: 768px) {
          .nav-btn {
            padding: 4px 6px;
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .nav-btn {
            padding: 3px 5px;
            font-size: 0.7rem;
          }
        }

        .nav-btn:hover:not(:disabled) {
          background: #007acc;
          border-color: #007acc;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .new-file-btn {
          background: #0e639c !important;
          border-color: #0e639c !important;
        }

        .editor-tabs-scroll {
          flex: 1;
          overflow-x: auto;
          padding: 4px 0;
          scrollbar-width: thin;
          height: 30px; /* Altura fija para pestañas */
          display: flex;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .editor-tabs-scroll {
            display: none;
          }
        }

        .editor-tabs-scroll::-webkit-scrollbar {
          height: 3px;
        }

        .editor-tabs-scroll::-webkit-scrollbar-track {
          background: #2d2d2d;
        }

        .editor-tabs-scroll::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 3px;
        }

        .editor-tabs-container {
          display: flex;
          gap: 2px;
          padding: 0 8px;
          min-width: max-content;
        }

        .editor-tab-compact {
          padding: 6px 10px;
          background: #1e1e1e;
          color: #cccccc;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 80px;
          max-width: 120px;
        }

        .editor-tab-compact:hover:not(.active) {
          background: #2d2d2d;
        }

        .editor-tab-compact.active {
          background: #007acc;
          color: white;
        }

        .tab-filename-short {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .file-close-btn-compact {
          background: none;
          border: none;
          color: inherit;
          font-size: 12px;
          cursor: pointer;
          padding: 2px;
          margin-left: 4px;
          border-radius: 2px;
          transition: all 0.2s;
          opacity: 0.7;
        }

        .file-close-btn-compact:hover {
          background: rgba(255, 255, 255, 0.1);
          opacity: 1;
        }

        .editor-controls {
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0; /* No se comprime */
          min-width: fit-content; /* Mantiene su tamaño mínimo */
        }
        
        @media (max-width: 768px) {
          .editor-controls {
            padding: 0 8px;
            gap: 6px;
            flex: 0 1 auto;
            order: 2;
            justify-content: flex-end;
          }
          
          .editor-controls .btn {
            font-size: 0.75rem;
            padding: 6px 10px;
            white-space: nowrap;
          }
          
          .editor-controls .btn i {
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .editor-controls {
            gap: 4px;
            padding: 0 6px;
          }
          
          .editor-controls .btn {
            font-size: 0.7rem;
            padding: 5px 8px;
          }
          
          .editor-controls .btn span {
            display: none;
          }
          
          .editor-controls .btn i {
            margin: 0 !important;
          }
        }
        
        @media (max-width: 360px) {
          .editor-controls {
            gap: 3px;
            padding: 0 4px;
          }
          
          .editor-controls .btn {
            padding: 4px 6px;
          }
        }

        .editor-hint {
          color: #858585;
          font-size: 0.8rem;
        }

        .editor-content {
          flex: 1;
          min-height: 0; /* Importante para flex containers */
          contain: layout; /* Optimización de rendering */
        }

        @media (max-width: 991px) {
          .programming-problem-panel {
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .problem-container {
            padding: 16px;
          }
          
          .exam-title {
            font-size: 1.4rem;
          }
          
          .editor-nav-controls {
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .file-selector-dropdown {
            min-width: 150px;
          }
          
          .nav-buttons {
            flex-shrink: 0;
          }
        }

        @media (max-width: 768px) {
          .editor-navigation-compact {
            font-size: 0.8rem;
          }
          
          .editor-nav-controls {
            padding: 6px 8px;
          }
          
          .file-selector-dropdown {
            min-width: 120px;
            font-size: 0.8rem;
          }
          
          .nav-btn {
            padding: 5px 6px;
            font-size: 0.75rem;
          }
          
          .editor-tab {
            padding: 10px 12px;
            font-size: 0.8rem;
            min-width: 100px;
            max-width: 150px;
          }
          
          .editor-tab-compact {
            min-width: 70px;
            max-width: 100px;
            font-size: 0.7rem;
            padding: 4px 6px;
          }
        }
      `}</style>
      {/* Estilos del nuevo layout con sidebar */}
      <style>{`
        .exam-shell {
          display: grid;
          grid-template-columns: 260px 1fr;
          height: 100%;
          position: relative;
        }
        
        .exam-shell.sidebar-collapsed {
          grid-template-columns: 1fr;
        }
        
        /* Overlay para cerrar sidebar en móviles */
        .sidebar-overlay {
          display: none;
        }
        
        @media (max-width: 767px) {
          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            animation: fadeIn 0.3s ease;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* Botón toggle para móviles */
        .sidebar-toggle {
          position: fixed;
          top: 80px;
          left: 10px;
          z-index: 1001;
          background: #111827;
          border: 2px solid #374151;
          color: #e5e7eb;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }
        
        .sidebar-toggle:hover {
          background: #1f2937;
          transform: scale(1.05);
        }
        
        .sidebar-toggle:active {
          transform: scale(0.95);
        }
        
        @media (min-width: 768px) {
          .sidebar-toggle {
            display: none;
          }
        }
        
        .exam-sidebar {
          background: #111827;
          color: #d1d5db;
          border-right: 1px solid #1f2937;
          display: flex;
          flex-direction: column;
          padding: 14px 10px;
          gap: 10px;
          transition: transform 0.3s ease;
        }
        
        @media (max-width: 767px) {
          .exam-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 260px;
            z-index: 1000;
            transform: translateX(0);
            box-shadow: 2px 0 10px rgba(0,0,0,0.3);
          }
          
          .exam-sidebar.collapsed {
            transform: translateX(-100%);
          }
        }
        
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
        }
        
        .student-pill {
          width: 28px; 
          height: 28px;
          border-radius: 6px;
          background: #374151;
          display: flex; 
          align-items: center; 
          justify-content: center;
          flex-shrink: 0;
        }
        
        .sidebar-title { 
          font-weight: 700; 
          color: #e5e7eb; 
        }
        
        .sidebar-nav { 
          display: flex; 
          flex-direction: column; 
          gap: 6px; 
          margin-top: 6px; 
        }
        
        .sidebar-item {
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
          color: inherit;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background .15s, border .15s;
          display: flex;
          align-items: center;
        }
        
        .sidebar-item:hover { 
          background: #1f2937; 
        }
        
        .sidebar-item.active { 
          background: #2563eb; 
          color: #fff; 
          border-color: #2563eb; 
        }
        
        .sidebar-footer { 
          margin-top: auto; 
          padding-top: 8px; 
          border-top: 1px solid #1f2937; 
        }
        
        .btn-send-exam {
          width: 100%;
          background: linear-gradient(45deg, #10b981, #059669);
          border: none; 
          color: #fff; 
          font-weight: 700;
          padding: 10px 12px; 
          border-radius: 10px; 
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-send-exam:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .btn-send-exam:disabled { 
          opacity: .6; 
          cursor: not-allowed; 
        }

        .exam-main { 
          height: 100%; 
          overflow: hidden; 
          background: #0b0f17; 
        }
        
        .consigna-panel { 
          padding: 18px; 
          height: 100%; 
          overflow: auto; 
        }
        
        @media (max-width: 768px) {
          .consigna-panel {
            padding: 12px;
          }
        }
        
        .consigna-title { 
          color: #e5e7eb; 
          margin-bottom: 10px;
          font-size: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .consigna-title {
            font-size: 1.2rem;
          }
        }
        
        .programming-area { 
          height: 100%; 
          display: flex; 
          flex-direction: column;
          overflow: hidden;
        }
        
        .programming-grid {
          flex: 1; 
          min-height: 0; 
          display: grid;
          grid-template-columns: 2fr 1fr;
          grid-gap: 10px; 
          padding: 10px;
          overflow: hidden;
        }
        
        .grid-left { 
          display: grid; 
          grid-template-rows: 1fr auto; 
          min-height: 0;
          max-height: 100%;
          gap: 10px;
          overflow: hidden;
        }
        
        .editor-content {
          min-height: 0;
          max-height: 100%;
          overflow: hidden;
        }
        
        .grid-right { 
          min-height: 0;
          max-height: 100%;
          overflow: hidden;
        }
        
        .output-panel { 
          height: 100%; 
          background: #111827; 
          border: 1px solid #1f2937; 
          border-radius: 10px; 
          display: flex; 
          flex-direction: column; 
        }
        
        .output-header { 
          color: #e5e7eb; 
          padding: 10px 12px; 
          border-bottom: 1px solid #1f2937; 
          font-weight: 700;
          font-size: 0.9rem;
        }
        
        .output-body { 
          flex: 1; 
          min-height: 0; 
          overflow: auto; 
          padding: 10px; 
        }
        
        .console { 
          background: #0b0f17; 
          color: #d1d5db; 
          border: 1px solid #1f2937; 
          padding: 12px; 
          border-radius: 8px;
          font-size: 0.85rem;
          line-height: 1.6;
          max-height: none;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        
        @media (max-width: 768px) {
          .console {
            font-size: 0.8rem;
            padding: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .console {
            font-size: 0.75rem;
            padding: 12px;
          }
        }
        
        .output-placeholder { 
          color: #9ca3af; 
          font-style: italic; 
          padding: 30px 12px;
          font-size: 0.9rem;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .output-placeholder {
            padding: 40px 15px;
            font-size: 0.85rem;
          }
        }
        
        .no-output {
          color: #9ca3af;
          font-style: italic;
          padding: 30px 12px;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .no-output {
            padding: 40px 15px;
          }
        }
        
        .input-section.compact { 
          background: rgba(243, 244, 246, 0.08); 
          border-color: #374151; 
        }
        
        /* Estilos para móvil - Terminal intercambiable */
        .terminal-mobile {
          height: 100%;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .mobile-terminal-tabs {
          display: flex;
          background: #0b0f17;
          border-bottom: 1px solid #1f2937;
          flex-shrink: 0;
        }
        
        .mobile-terminal-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: #9ca3af;
          padding: 14px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 600;
          border-bottom: 3px solid transparent;
        }
        
        .mobile-terminal-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #d1d5db;
        }
        
        .mobile-terminal-tab.active {
          color: #3b82f6;
          background: #111827;
          border-bottom-color: #3b82f6;
        }
        
        .terminal-badge {
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 700;
        }
        
        .mobile-terminal-tab.active .terminal-badge {
          color: #3b82f6;
        }
        
        @media (max-width: 480px) {
          .mobile-terminal-tab {
            padding: 12px 8px;
            font-size: 0.85rem;
          }
          
          .mobile-terminal-tab span:not(.terminal-badge) {
            display: none;
          }
          
          .mobile-terminal-tab i {
            font-size: 1.3rem;
          }
        }
        
        .mobile-terminal-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .mobile-output-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .mobile-output-body {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 12px;
        }
        
        .mobile-input-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 12px;
          gap: 10px;
        }
        
        .mobile-input-field {
          flex: 1;
          min-height: 200px;
          width: 100%;
          background: #0b0f17;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 12px;
          color: #d1d5db;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: none;
        }
        
        .mobile-input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .mobile-input-field::placeholder {
          color: #6b7280;
          font-style: italic;
        }
        
        .mobile-input-hint {
          color: #9ca3af;
          font-size: 0.8rem;
          font-style: italic;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        
        @media (max-width: 480px) {
          .mobile-input-field {
            font-size: 0.85rem;
            min-height: 150px;
          }
          
          .mobile-input-hint {
            font-size: 0.75rem;
          }
        }
        
        .output-panel { 
          height: 100%; 
          background: #111827; 
          border: 1px solid #1f2937; 
          border-radius: 10px; 
          display: flex; 
          flex-direction: column; 
        }
        
        .output-header { 
          color: #e5e7eb; 
          padding: 10px 12px; 
          border-bottom: 1px solid #1f2937; 
          font-weight: 700;
          font-size: 0.9rem;
        }
        
        .output-body { 
          flex: 1; 
          min-height: 0; 
          overflow: auto; 
          padding: 10px; 
        }
        
        .console { 
          background: #0b0f17; 
          color: #d1d5db; 
          border: 1px solid #1f2937; 
          padding: 10px; 
          border-radius: 8px;
          font-size: 0.85rem;
        }
        
        @media (max-width: 768px) {
          .console {
            font-size: 0.75rem;
          }
        }
        
        .output-placeholder { 
          color: #9ca3af; 
          font-style: italic; 
          padding: 12px;
          font-size: 0.9rem;
        }
        
        .input-section.compact { 
          background: rgba(243, 244, 246, 0.08); 
          border-color: #374151; 
        }

        /* Media queries para tablets */
        @media (max-width: 992px) and (min-width: 768px) {
          .exam-shell { 
            grid-template-columns: 200px 1fr; 
          }
          
          .sidebar-item {
            padding: 8px 10px;
            font-size: 0.9rem;
          }
          
          .programming-grid {
            grid-template-columns: 1.5fr 1fr;
          }
        }
        
        /* Media queries para móviles */
        @media (max-width: 768px) {
          .programming-grid { 
            grid-template-columns: 1fr;
            grid-template-rows: minmax(300px, 50vh) minmax(350px, 45vh);
            padding: 8px;
            gap: 8px;
            height: 100%;
          }
          
          .grid-left { 
            grid-template-rows: 1fr;
            min-height: 300px;
            max-height: 50vh;
            overflow: hidden;
          }
          
          .editor-content {
            height: 100%;
            overflow: hidden;
          }
          
          .grid-right {
            min-height: 350px;
            max-height: 45vh;
            overflow: hidden;
          }
          
          .input-section.compact {
            display: none !important;
          }
          
          .terminal-mobile {
            height: 100%;
          }
          
          .mobile-terminal-content {
            height: calc(100% - 48px);
          }
        }
        
        /* Media queries para pantallas muy pequeñas */
        @media (max-width: 480px) {
          .programming-grid {
            padding: 6px;
            grid-template-rows: minmax(250px, 45vh) minmax(300px, 50vh);
          }
          
          .grid-left {
            min-height: 250px;
            max-height: 45vh;
          }
          
          .grid-right {
            min-height: 300px;
            max-height: 50vh;
          }
          
          .sidebar-text {
            font-size: 0.9rem;
          }
          
          .mobile-terminal-content {
            height: calc(100% - 44px);
          }
        }
        
        /* Ajustes específicos para landscape en móviles */
        @media (max-width: 768px) and (orientation: landscape) {
          .programming-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr;
            height: 100%;
          }
          
          .grid-left {
            max-height: 100%;
          }
          
          .grid-right {
            max-height: 100%;
          }
        }
      `}</style>

      {/* Modal del gestor de archivos */}
      {showFileManager && (
        <div className="modal-overlay" onClick={() => setShowFileManager(false)}>
          <div className="file-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                <i className="fas fa-folder-open me-2"></i>
                Gestor de Archivos
              </h4>
              <button 
                className="modal-close-btn"
                onClick={() => setShowFileManager(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Crear nuevo archivo */}
              <div className="new-file-section mb-4">
                <h5>Crear nuevo archivo</h5>
                <div className="input-group">
                  <input
                    type="text"
                    className={`form-control ${
                      newFileName.trim() && 
                      (/[<>:"/\\|?*]/.test(newFileName) || 
                       files.find(f => {
                         const extension = exam?.lenguajeProgramacion === 'python' ? '.py' : '.js';
                         const fileName = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;
                         return f.filename.toLowerCase() === fileName.toLowerCase();
                       })) 
                      ? 'is-invalid' : ''
                    }`}
                    placeholder={`nombre.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`}
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={createNewFile}
                    disabled={
                      !newFileName.trim() || 
                      /[<>:"/\\|?*]/.test(newFileName) ||
                      files.find(f => {
                        const extension = exam?.lenguajeProgramacion === 'python' ? '.py' : '.js';
                        const fileName = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;
                        return f.filename.toLowerCase() === fileName.toLowerCase();
                      })
                    }
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                {/* Mensaje de ayuda */}
                {newFileName.trim() && (
                  <div className="form-text mt-1">
                    {/[<>:"/\\|?*]/.test(newFileName) ? (
                      <span className="text-danger">
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        Caracteres no permitidos: {"< > : \" / \\ | ? *"}
                      </span>
                    ) : files.find(f => {
                      const extension = exam?.lenguajeProgramacion === 'python' ? '.py' : '.js';
                      const fileName = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;
                      return f.filename.toLowerCase() === fileName.toLowerCase();
                    }) ? (
                      <span className="text-danger">
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        Ya existe un archivo con este nombre
                      </span>
                    ) : (
                      <span className="text-success">
                        <i className="fas fa-check me-1"></i>
                        Nombre válido
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Lista de archivos */}
              <div className="files-list">
                <h5>Archivos guardados ({files.length})</h5>
                {files.length === 0 ? (
                  <div className="no-files">
                    <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                    <p>No hay archivos guardados</p>
                  </div>
                ) : (
                  <div className="files-grid">
                    {files.map((file) => {
                      const isHidden = hiddenFiles.has(file.filename);
                      const isProtected = isMainFile(file.filename);
                      return (
                        <div key={file.filename} className={`file-item ${isHidden ? 'file-hidden' : ''}`}>
                          <div className="file-info">
                            <div className="file-name">
                              <i className="fas fa-file-code me-2"></i>
                              {file.filename}
                              {isProtected && (
                                <span className="badge bg-primary ms-2" style={{fontSize: '0.7rem'}} title="Archivo principal - No se puede eliminar">
                                  <i className="fas fa-lock"></i> Principal
                                </span>
                              )}
                              {isHidden && (
                                <span className="badge bg-secondary ms-2" style={{fontSize: '0.7rem'}}>
                                  Oculto
                                </span>
                              )}
                              {unsavedFiles.has(file.filename) && (
                                <span className="text-warning ms-2" title="Cambios sin guardar">●</span>
                              )}
                            </div>
                            <div className="file-date">
                              {new Date(file.updatedAt || file.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="file-actions">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                showFile(file.filename);
                                setShowFileManager(false);
                              }}
                              title={isHidden ? "Mostrar y abrir archivo" : "Abrir archivo"}
                            >
                              <i className={`fas ${isHidden ? 'fa-eye' : 'fa-folder-open'}`}></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => requestDeleteFile(file.filename)}
                              disabled={isProtected}
                              title={isProtected ? "No puedes eliminar el archivo principal" : "Eliminar archivo permanentemente"}
                              style={isProtected ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 10px;
        }

        .file-manager-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 768px) {
          .file-manager-modal {
            width: 95%;
            max-height: 85vh;
            border-radius: 8px;
          }
        }
        
        @media (max-width: 480px) {
          .file-manager-modal {
            width: 100%;
            max-height: 90vh;
            border-radius: 0;
          }
        }

        .modal-header {
          background: #2d3748;
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .modal-header {
            padding: 15px;
          }
          
          .modal-header h4 {
            font-size: 1.1rem;
          }
        }
        
        @media (max-width: 480px) {
          .modal-header {
            padding: 12px;
          }
          
          .modal-header h4 {
            font-size: 1rem;
          }
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 24px;
          max-height: 60vh;
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .modal-body {
            padding: 16px;
            max-height: 65vh;
          }
        }
        
        @media (max-width: 480px) {
          .modal-body {
            padding: 12px;
            max-height: 70vh;
          }
        }

        .new-file-section {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }
        
        @media (max-width: 768px) {
          .new-file-section {
            padding-bottom: 15px;
          }
          
          .new-file-section h5 {
            font-size: 1rem;
          }
        }

        .files-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        @media (max-width: 768px) {
          .files-grid {
            gap: 8px;
          }
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        @media (max-width: 768px) {
          .file-item {
            padding: 10px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        .file-item:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .file-item.file-hidden {
          opacity: 0.6;
          background: #f9fafb;
        }

        .file-item.file-hidden:hover {
          opacity: 1;
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .file-name {
          font-weight: 600;
          color: #2d3748;
          display: flex;
          align-items: center;
          word-break: break-word;
        }
        
        @media (max-width: 768px) {
          .file-name {
            font-size: 0.9rem;
          }
        }

        .file-date {
          font-size: 0.8rem;
          color: #718096;
        }
        
        @media (max-width: 768px) {
          .file-date {
            font-size: 0.75rem;
          }
        }

        .file-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
          .file-actions {
            width: 100%;
            justify-content: flex-end;
            gap: 6px;
          }
          
          .file-actions .btn {
            font-size: 0.85rem;
            padding: 6px 10px;
          }
        }

        .no-files {
          text-align: center;
          padding: 40px 20px;
          color: #718096;
        }
        
        @media (max-width: 768px) {
          .no-files {
            padding: 30px 15px;
          }
          
          .no-files i {
            font-size: 2rem !important;
          }
          
          .no-files p {
            font-size: 0.9rem;
          }
        }

        .file-close-btn {
          background: none;
          border: none;
          color: #cccccc;
          font-size: 16px;
          cursor: pointer;
          padding: 0 4px;
          margin-left: 8px;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .file-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ff6b6b;
        }

        .new-file-tab {
          background: #4CAF50 !important;
          color: white !important;
          border: none !important;
        }

        .new-file-tab:hover {
          background: #45a049 !important;
        }

        /* Responsividad para el header fijo */
        @media (max-width: 768px) {
          .editor-header {
            height: 70px; /* Más altura en móviles */
          }

          .editor-navigation-section {
            padding: 0 10px;
          }

          .editor-controls {
            padding: 0 10px;
            flex-wrap: wrap;
          }

          .file-selector-dropdown {
            min-width: 150px;
            font-size: 0.8rem;
          }

          .nav-buttons {
            gap: 4px;
          }

          .nav-btn {
            min-width: 28px;
            height: 28px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .editor-header {
            height: 80px; /* Aún más altura en pantallas muy pequeñas */
          }

          .editor-navigation-compact {
            height: 80px;
          }
        }
      `}</style>

      {/* Modal de confirmación para finalizar examen */}
      <Modal
        show={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={finishExam}
        title="Finalizar Examen"
        message="¿Estás seguro de que quieres finalizar el examen?"
        type="confirm"
        confirmText="Finalizar"
        cancelText="Cancelar"
        showCancel={true}
      />

      {/* Modal de confirmación para eliminar archivo */}
      <Modal
        show={showDeleteModal}
        onClose={() => {
          if (!fileOperationLoading) {
            setShowDeleteModal(false);
            setFileToDelete('');
          }
        }}
        onConfirm={deleteFile}
        title="Eliminar Archivo"
        message={`¿Estás seguro de que quieres eliminar el archivo "${fileToDelete}"? Esta acción no se puede deshacer.`}
        type="confirm"
        confirmText="Eliminar"
        cancelText="Cancelar"
        showCancel={true}
        isProcessing={fileOperationLoading}
      />
    </div>
  );
};

export default ProgrammingExamView;
