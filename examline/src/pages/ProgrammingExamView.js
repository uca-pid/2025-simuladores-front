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
  
  // Estado para el modal de confirmación
  const [showFinishModal, setShowFinishModal] = useState(false);

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
        setFiles(filesData);
        
        // Si no hay archivos, crear uno por defecto
        if (filesData.length === 0) {
          const defaultFileName = `main.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
          setCurrentFileName(defaultFileName);
        } else {
          // Cargar el primer archivo si no hay uno seleccionado
          if (!currentFileName || !filesData.find(f => f.filename === currentFileName)) {
            const firstFile = filesData[0];
            setCurrentFileName(firstFile.filename);
            setCode(firstFile.content || '');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, [examId, exam, currentFileName]);

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
      
      // Primero guardar el código actual con un nombre por defecto
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFileName = `FINAL_SUBMISSION_${timestamp}.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
      
      // Guardar archivo final
      await saveCurrentFile(defaultFileName, code);
      
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
    setCode(value || '');
  }, []);

  // Función para forzar guardado manual
  const handleManualSave = () => {
    saveCurrentFile();
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
      await fetchFiles(); // Actualizar lista de archivos
    } catch (error) {
      console.error('Error saving file:', error);
      setError('Error guardando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, code, attempt, fetchFiles]);

  const loadFile = useCallback(async (filename) => {
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/exam-files/${examId}/files/${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const fileData = await response.json();
        setCode(fileData.content || '');
        setCurrentFileName(filename);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      setError('Error cargando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId]);

  const deleteFile = useCallback(async (filename) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${filename}"?`)) return;
    
    try {
      setFileOperationLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      
      await fetch(`${API_BASE_URL}/exam-files/${examId}/files/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Si eliminamos el archivo actual, cambiar a otro
      if (filename === currentFileName) {
        const remainingFiles = files.filter(f => f.filename !== filename);
        if (remainingFiles.length > 0) {
          await loadFile(remainingFiles[0].filename);
        } else {
          const defaultFileName = `main.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`;
          setCurrentFileName(defaultFileName);
          setCode('');
        }
      }
      
      await fetchFiles(); // Actualizar lista
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error eliminando archivo');
    } finally {
      setFileOperationLoading(false);
    }
  }, [examId, currentFileName, files, exam?.lenguajeProgramacion, fetchFiles, loadFile]);

  const createNewFile = useCallback(async () => {
    if (!newFileName.trim()) {
      setError('Ingresa un nombre para el archivo');
      return;
    }
    
    // Validar extensión según el lenguaje
    const extension = exam?.lenguajeProgramacion === 'python' ? '.py' : '.js';
    const fileName = newFileName.endsWith(extension) ? newFileName : `${newFileName}${extension}`;
    
    // Verificar que no existe
    if (files.find(f => f.filename === fileName)) {
      setError('Ya existe un archivo con ese nombre');
      return;
    }
    
    await saveCurrentFile(fileName, '// Nuevo archivo\n');
    setCurrentFileName(fileName);
    setCode('// Nuevo archivo\n');
    setNewFileName('');
    setShowFileManager(false);
  }, [newFileName, exam?.lenguajeProgramacion, files, saveCurrentFile]);

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
                    disabled={saving}
                  >
                    <i className="fas fa-save me-2"></i>
                    Guardar código
                  </button>
                  
                  <button 
                    className="btn-action btn-finish" 
                    onClick={handleFinishExamClick}
                    disabled={loading}
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
                  <div className="editor-tabs">
                    {files.map((file, index) => (
                      <div 
                        key={file.filename}
                        className={`editor-tab ${file.filename === currentFileName ? 'active' : ''}`}
                        onClick={() => loadFile(file.filename)}
                      >
                        <i className="fas fa-file-code me-2"></i>
                        {file.filename}
                        <button
                          className="file-close-btn ms-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.filename);
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
                  <div className="editor-controls">
                    <button 
                      className="btn btn-sm btn-outline-light me-2"
                      onClick={() => saveCurrentFile()}
                      disabled={fileOperationLoading}
                    >
                      <i className="fas fa-save me-1"></i>
                      Guardar
                    </button>
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
                    onMount={(editor, monaco) => {
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        handleManualSave();
                      });
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
          justify-content: space-between;
          align-items: center;
        }

        .editor-tabs {
          display: flex;
        }

        .editor-tab {
          padding: 12px 20px;
          background: #1e1e1e;
          color: #cccccc;
          border-right: 1px solid #3e3e3e;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .editor-tab.active {
          background: #007acc;
          color: white;
        }

        .editor-controls {
          padding: 0 20px;
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
                    className="form-control"
                    placeholder={`nombre.${exam?.lenguajeProgramacion === 'python' ? 'py' : 'js'}`}
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={createNewFile}
                    disabled={!newFileName.trim()}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
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
                            onClick={() => deleteFile(file.filename)}
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
    </div>
  );
};

export default ProgrammingExamView;