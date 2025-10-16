import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getExamById } from '../services/api';
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
  const [isInSEB, setIsInSEB] = useState(false);
  
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
  
  // Estados para modales
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState('');

  // Obtener windowId de la URL
  const searchParams = new URLSearchParams(location.search);
  const windowId = searchParams.get('windowId');

  // Detectar si estamos en SEB y función de cierre
  useEffect(() => {
    const checkSEB = () => {
      const userAgent = navigator.userAgent || '';
      return userAgent.includes('SEB') || 
             userAgent.includes('SafeExamBrowser') || 
             window.SafeExamBrowser !== undefined;
    };
    
    const inSEB = checkSEB();
    setIsInSEB(inSEB);
    console.log('Ejecutando en SEB:', inSEB);
  }, []);

  // 🚪 Función para redireccionar al terminar examen
  const closeSEB = () => {
    try {
      console.log('Redirigiendo desde examen de programación');
      window.location.href = 'https://ferrocarriloeste.com.ar/';
    } catch (error) {
      console.log('Error al redireccionar:', error);
    }
  };

  // Configuración del editor Monaco optimizada para reducir ResizeObserver errors
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      // Reducir la sensibilidad del scrollbar para evitar resize loops
      verticalScrollbarSize: 12,
      horizontalScrollbarSize: 12
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
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';
      
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
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
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
            
            console.log(`Archivo por defecto creado: ${defaultFileName}`);
          } catch (error) {
            console.error('Error creando archivo por defecto:', error);
          }
        } else {
          // Cargar el primer archivo
          const firstFile = sortedFiles[0];
          setCurrentFileName(firstFile.filename);
          setCode(firstFile.content || '');
          
          console.log(`Archivos cargados del servidor:`, sortedFiles.map(f => f.filename));
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, [examId, exam]);

  // Función para guardar código automáticamente
  const saveCode = useCallback(async (currentCode) => {
    if (!attempt || attempt.estado !== 'en_progreso') return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';
      
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
    
    setShowFinishModal(false);
    
    try {
      setLoading(true);
      
      // 💾 Guardar TODOS los archivos con cambios en el caché
      console.log('Guardando todos los archivos antes de finalizar...');
      const filesToSave = Object.keys(fileCache);
      
      for (const filename of filesToSave) {
        const content = fileCache[filename];
        console.log(`Guardando archivo: ${filename}`);
        await saveCurrentFile(filename, content);
      }
      
      // También guardar el archivo actual si no está en el caché
      if (code && currentFileName && fileCache[currentFileName] === undefined) {
        console.log(`Guardando archivo actual: ${currentFileName}`);
        await saveCurrentFile(currentFileName, code);
      }
      
      console.log('Todos los archivos guardados. Finalizando examen...');
      
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';
      
      await fetch(`${API_BASE_URL}/exam-attempts/${attempt.id}/finish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codigoProgramacion: code
        })
      });

      // Manejar cierre según si está en SEB o no
      if (isInSEB) {
        console.log('Examen de programación finalizado en SEB - cerrando...');
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
    const loadData = async () => {
      setLoading(true);
      await fetchExam();
      await fetchOrCreateAttempt();
      setLoading(false);
    };
    
    loadData();
  }, [fetchExam, fetchOrCreateAttempt]);

  // Efecto para cargar archivos cuando el examen esté listo
  useEffect(() => {
    if (exam && attempt) {
      fetchFiles();
    }
  }, [exam, attempt, fetchFiles]);

  // Efecto para guardado automático cada 30 segundos
  useEffect(() => {
    if (!attempt || attempt.estado !== 'en_progreso') return;
    
    const interval = setInterval(() => {
      saveCode(code);
    }, 30000); // Guardar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [code, attempt, saveCode]);

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

  // Función para forzar guardado manual - guarda TODOS los archivos
  const handleManualSave = async () => {
    try {
      setSaving(true);
      
      // 💾 Guardar TODOS los archivos del caché
      console.log('Guardando todos los archivos...');
      const filesToSave = Object.keys(fileCache);
      
      for (const filename of filesToSave) {
        const content = fileCache[filename];
        console.log(`Guardando archivo: ${filename}`);
        await saveCurrentFile(filename, content);
      }
      
      // ✅ Limpiar marca de archivos sin guardar
      setUnsavedFiles(new Set());
      
      console.log('Todos los archivos guardados correctamente');
    } catch (error) {
      console.error('Error guardando archivos:', error);
    } finally {
      setSaving(false);
    }
  };


  const saveCurrentFile = useCallback(async (filename = currentFileName, content = code) => {
    if (!filename || !attempt) return;
    
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
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
        console.log('Lista de archivos actualizada sin cambiar archivo actual');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setError('Error guardando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, code, attempt]);

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
      console.log(`Cargando ${filename} desde caché`);
      return prev;
    });
  }, [currentFileName, code]);

  const requestDeleteFile = useCallback((filename) => {
    setFileToDelete(filename);
    setShowDeleteModal(true);
  }, []);

  const deleteFile = useCallback(async () => {
    if (!fileToDelete) return;
    
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
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
      await saveCurrentFile(fileName, '// Nuevo archivo\n');
      setCurrentFileName(fileName);
      setCode('// Nuevo archivo\n');
      setNewFileName('');
      setShowFileManager(false);
    } catch (error) {
      console.error('Error al crear archivo:', error);
      // El error será manejado por la UI visual, no necesitamos modal
    }
  }, [newFileName, exam?.lenguajeProgramacion, files, saveCurrentFile, setCode, setCurrentFileName]);

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
    console.log(`Movido ${draggedFile.filename} de posición ${draggedTab} a ${dropIndex}`);
  };

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
            onClick={() => navigate('/student-exam')}
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
            <div className="col-auto">
              <div className="exam-logo">
                <i className="fas fa-laptop-code"></i>
              </div>
            </div>
            <div className="col">
              <h1 className="exam-title mb-0">{exam.titulo}</h1>
              <small className="exam-subtitle">
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
                    Guardando...
                  </span>
                ) : lastSaved ? (
                  <span className="status-saved">
                    <i className="fas fa-check me-1"></i>
                    Guardado {lastSaved.toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="status-unsaved">
                    <i className="fas fa-clock me-1"></i>
                    Sin guardar
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="programming-exam-content">
        <div className="container-fluid h-100">
          <div className="row h-100">
            {/* Panel del enunciado */}
            <div className="col-lg-4 col-md-12 programming-problem-panel">
              <div className="problem-container">
                <div className="problem-header">
                  <h3>
                    <i className="fas fa-puzzle-piece me-2"></i>
                    Problema
                  </h3>
                </div>
                
                <div className="problem-content">
                  <div className="problem-statement">
                    {exam.enunciadoProgramacion}
                  </div>
                </div>
                
                <div className="problem-actions">
                  <button 
                    className="btn-action btn-save" 
                    onClick={handleManualSave}
                    disabled={saving || fileOperationLoading}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Guardar código
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="btn-action btn-finish" 
                    onClick={handleFinishExamClick}
                    disabled={loading || saving}
                  >
                    <i className="fas fa-check-circle me-2"></i>
                    Finalizar examen
                  </button>
                </div>
              </div>
            </div>
            
            {/* Panel del editor */}
            <div className="col-lg-8 col-md-12 programming-editor-panel">
              <div className="editor-container">
                <div className="editor-header">
                  {/* Sección de navegación de archivos - izquierda */}
                  <div className="editor-navigation-section">
                    {files.length <= 6 ? (
                      /* Pestañas normales para pocos archivos */
                      <div className="editor-tabs">
                        {files.map((file, index) => (
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
                                requestDeleteFile(file.filename);
                              }}
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
                      /* Navegación compacta para muchos archivos */
                      <div className="editor-navigation-compact">
                        <div className="editor-nav-controls">
                          <select
                            value={currentFileName}
                            onChange={(e) => loadFile(e.target.value)}
                            className="file-selector-dropdown"
                          >
                            {files.map((file, index) => (
                              <option key={file.filename} value={file.filename}>
                                {index + 1}. {file.filename}
                              </option>
                            ))}
                          </select>
                          
                          <div className="nav-buttons">
                            <button
                              onClick={() => {
                                const currentIndex = files.findIndex(f => f.filename === currentFileName);
                                const prevIndex = Math.max(0, currentIndex - 1);
                                if (prevIndex !== currentIndex) {
                                  loadFile(files[prevIndex].filename);
                                }
                              }}
                              disabled={files.findIndex(f => f.filename === currentFileName) === 0}
                              className="nav-btn prev-btn"
                            >
                              <i className="fas fa-chevron-left"></i>
                            </button>
                            
                            <button
                              onClick={() => {
                                const currentIndex = files.findIndex(f => f.filename === currentFileName);
                                const nextIndex = Math.min(files.length - 1, currentIndex + 1);
                                if (nextIndex !== currentIndex) {
                                  loadFile(files[nextIndex].filename);
                                }
                              }}
                              disabled={files.findIndex(f => f.filename === currentFileName) === files.length - 1}
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
                        
                        {/* Pestañas con scroll para visualización */}
                        <div className="editor-tabs-scroll">
                          <div className="editor-tabs-container">
                            {files.map((file, index) => (
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
                                    requestDeleteFile(file.filename);
                                  }}
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

                  {/* Línea divisoria vertical */}
                  <div className="editor-divider"></div>

                  {/* Sección de controles - derecha */}
                  <div className="editor-controls">
                    <button 
                      className="btn btn-sm btn-outline-info"
                      onClick={() => setShowFileManager(true)}
                    >
                      <i className="fas fa-folder me-1"></i>
                      Archivos
                    </button>
                  </div>
                </div>
                
                <div className="editor-content">
                  <Editor
                    height="100%"
                    language={exam.lenguajeProgramacion}
                    theme="vs-dark"
                    value={code}
                    onChange={handleEditorChange}
                    options={{
                      ...editorOptions,
                      quickSuggestions: exam.intellisenseHabilitado,
                      suggestOnTriggerCharacters: exam.intellisenseHabilitado,
                      acceptSuggestionOnEnter: exam.intellisenseHabilitado ? 'on' : 'off',
                      tabCompletion: exam.intellisenseHabilitado ? 'on' : 'off',
                      wordBasedSuggestions: exam.intellisenseHabilitado,
                      parameterHints: {
                        enabled: exam.intellisenseHabilitado
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
        }

        /* Sección de navegación de archivos - izquierda */
        .editor-navigation-section {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 15px;
          overflow: hidden;
        }

        /* Línea divisoria vertical */
        .editor-divider {
          width: 1px;
          background: #3e3e3e;
          height: 100%;
          flex-shrink: 0;
        }

        .editor-tabs {
          display: flex;
          overflow-x: auto;
          scrollbar-width: thin;
          height: 60px; /* Altura fija igual al header */
          align-items: center;
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

        .file-selector-dropdown:focus {
          outline: none;
          border-color: #007acc;
        }

        .nav-buttons {
          display: flex;
          gap: 4px;
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
                    {files.map((file) => (
                      <div key={file.filename} className="file-item">
                        <div className="file-info">
                          <div className="file-name">
                            <i className="fas fa-file-code me-2"></i>
                            {file.filename}
                          </div>
                          <div className="file-date">
                            {new Date(file.updatedAt || file.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="file-actions">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              loadFile(file.filename);
                              setShowFileManager(false);
                            }}
                          >
                            <i className="fas fa-folder-open"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => requestDeleteFile(file.filename)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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

        .modal-header {
          background: #2d3748;
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 24px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .new-file-section {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }

        .files-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
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

        .file-item:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }

        .file-name {
          font-weight: 600;
          color: #2d3748;
        }

        .file-date {
          font-size: 0.8rem;
          color: #718096;
        }

        .file-actions {
          display: flex;
          gap: 8px;
        }

        .no-files {
          text-align: center;
          padding: 40px 20px;
          color: #718096;
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
        message="¿Estás seguro de que quieres finalizar el examen? Se guardará automáticamente el código actual. No podrás hacer más cambios después."
        type="confirm"
        confirmText="Finalizar"
        cancelText="Cancelar"
        showCancel={true}
      />

      {/* Modal de confirmación para eliminar archivo */}
      <Modal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setFileToDelete('');
        }}
        onConfirm={deleteFile}
        title="Eliminar Archivo"
        message={`¿Estás seguro de que quieres eliminar el archivo "${fileToDelete}"? Esta acción no se puede deshacer.`}
        type="confirm"
        confirmText="Eliminar"
        cancelText="Cancelar"
        showCancel={true}
      />
    </div>
  );
};

export default ProgrammingExamView;