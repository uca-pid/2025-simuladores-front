import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getExamById } from '../services/api';

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

  // Obtener windowId de la URL
  const searchParams = new URLSearchParams(location.search);
  const windowId = searchParams.get('windowId');

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

  // Función para finalizar examen
  const finishExam = async () => {
    if (!attempt) return;
    
    const confirmFinish = window.confirm(
      '¿Estás seguro de que quieres finalizar el examen? No podrás hacer más cambios después.'
    );
    
    if (!confirmFinish) return;
    
    try {
      setLoading(true);
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
      navigate('/student-exam');
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
    saveCode(code);
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
                    onClick={finishExam}
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
                    <div className="editor-tab active">
                      <i className="fas fa-file-code me-2"></i>
                      main.{exam.lenguajeProgramacion === 'python' ? 'py' : 'js'}
                    </div>
                  </div>
                  <div className="editor-controls">
                    <span className="editor-hint">
                      <i className="fas fa-keyboard me-1"></i>
                      Ctrl+S para guardar
                    </span>
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
    </div>
  );
};

export default ProgrammingExamView;