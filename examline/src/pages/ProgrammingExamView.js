import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getExamById } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserHeader from '../components/UserHeader';

const ProgrammingExamView = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
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

  // Configuración del editor Monaco
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
      horizontal: 'visible'
    }
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
      navigate(`/exam-attempts/${attempt.id}/results`);
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

  // Manejar cambios en el editor
  const handleEditorChange = (value) => {
    setCode(value || '');
  };

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
            onClick={() => navigate('/student')}
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
    <div className="min-vh-100 bg-light">
      <UserHeader />
      
      <div className="container-fluid py-4">
        <div className="row">
          {/* Columna del enunciado */}
          <div className="col-lg-4 col-md-12 mb-4">
            <div className="card h-100 shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-code me-2"></i>
                  {exam.titulo}
                </h5>
                <small>
                  Examen de {exam.lenguajeProgramacion} • 
                  {exam.intellisenseHabilitado ? ' Intellisense activo' : ' Intellisense desactivado'}
                </small>
              </div>
              <div className="card-body">
                <h6>Enunciado:</h6>
                <div 
                  className="exam-statement"
                  style={{ 
                    whiteSpace: 'pre-wrap',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}
                >
                  {exam.enunciadoProgramacion}
                </div>
                
                <hr />
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small">
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-1"></i>
                        Guardando...
                      </>
                    ) : lastSaved ? (
                      <>
                        <i className="fas fa-check text-success me-1"></i>
                        Guardado {lastSaved.toLocaleTimeString()}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-clock me-1"></i>
                        No guardado
                      </>
                    )}
                  </span>
                </div>
                
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={handleManualSave}
                    disabled={saving}
                  >
                    <i className="fas fa-save me-2"></i>
                    Guardar código
                  </button>
                  
                  <button 
                    className="btn btn-success" 
                    onClick={finishExam}
                    disabled={loading}
                  >
                    <i className="fas fa-check-circle me-2"></i>
                    Finalizar examen
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Columna del editor */}
          <div className="col-lg-8 col-md-12">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                <span>
                  <i className="fas fa-edit me-2"></i>
                  Editor de código ({exam.lenguajeProgramacion})
                </span>
                <small className="text-muted">
                  Ctrl+S para guardar
                </small>
              </div>
              <div className="card-body p-0" style={{ height: '70vh' }}>
                <Editor
                  height="100%"
                  language={exam.lenguajeProgramacion}
                  theme="vs-dark"
                  value={code}
                  onChange={handleEditorChange}
                  options={{
                    ...editorOptions,
                    // Configurar intellisense según la configuración del examen
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
                    // Atajo de teclado para guardar
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
  );
};

export default ProgrammingExamView;