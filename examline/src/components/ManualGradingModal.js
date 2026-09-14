import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getReferenceFiles } from '../services/api';
import Editor from '@monaco-editor/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../modern-examline.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function ManualGradingModal({ attemptId, onClose, onSave }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [fileVersion, setFileVersion] = useState('submission');
  const [editedCode, setEditedCode] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [calificacionManual, setCalificacionManual] = useState('');
  const [saving, setSaving] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [currentReferenceFile, setCurrentReferenceFile] = useState('');
  const [loadingReferenceFiles, setLoadingReferenceFiles] = useState(false);

  useEffect(() => {
    loadAttemptDetails();
  }, [attemptId]);

  const loadAttemptDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/professor-view`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Datos del intento recibidos:', data);
        console.log('🔍 Solución de referencia:', data.exam?.solucionReferencia);
        setAttempt(data);
        
        // 🔒 IMPORTANTE: Cargar por defecto el archivo main en versión manual
        // Este es el archivo que se usó para la corrección automática
        const mainFileName = data.exam.lenguajeProgramacion === 'python' ? 'main.py' : 'main.js';
        
        // Intentar encontrar el archivo main en versión manual
        let targetVersion = 'manual';
        let targetIndex = data.manualFiles.findIndex(f => f.filename === mainFileName);
        
        // Si no existe en manual, buscar en submission
        if (targetIndex === -1 && data.submissionFiles.length > 0) {
          targetVersion = 'submission';
          targetIndex = data.submissionFiles.findIndex(f => f.filename === mainFileName);
        }
        
        // Si aún no se encuentra, usar el primer archivo disponible
        if (targetIndex === -1) {
          targetVersion = data.manualFiles.length > 0 ? 'manual' : 'submission';
          targetIndex = 0;
        }
        
        // Configurar el estado inicial
        setFileVersion(targetVersion);
        setSelectedFileIndex(targetIndex);
        
        const files = targetVersion === 'manual' ? data.manualFiles : data.submissionFiles;
        if (files && files.length > 0 && files[targetIndex]) {
          setEditedCode(files[targetIndex].content || '');
        }

        // Pre-llenar calificación manual si ya existe
        if (data.calificacionManual !== null) {
          setCalificacionManual(data.calificacionManual.toString());
        }

        // Cargar archivos de referencia si es examen de programación
        if (data.exam.tipo === 'programming') {
          try {
            setLoadingReferenceFiles(true);
            const refFiles = await getReferenceFiles(data.examId);
            if (refFiles && refFiles.length > 0) {
              setReferenceFiles(refFiles);
              setCurrentReferenceFile(refFiles[0].filename);
            }
          } catch (error) {
            console.error('Error loading reference files:', error);
          } finally {
            setLoadingReferenceFiles(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading attempt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAutomaticGrade = () => {
    if (attempt && attempt.puntaje !== null) {
      setCalificacionManual(attempt.puntaje.toFixed(1));
    }
  };

  const getCurrentFiles = () => {
    if (!attempt) return [];
    return fileVersion === 'submission' ? attempt.submissionFiles : attempt.manualFiles;
  };

  const handleFileChange = (index) => {
    setSelectedFileIndex(index);
    const files = getCurrentFiles();
    if (files[index]) {
      setEditedCode(files[index].content || '');
    }
    setExecutionResult(null);
  };

  const handleVersionChange = (newVersion) => {
    setFileVersion(newVersion);
    const newFiles = newVersion === 'submission' ? attempt.submissionFiles : attempt.manualFiles;
    
    // Intentar mantener el mismo archivo o seleccionar el primero
    const currentFileName = getCurrentFiles()[selectedFileIndex]?.filename;
    const sameFileIndex = newFiles.findIndex(f => f.filename === currentFileName);
    const newIndex = sameFileIndex !== -1 ? sameFileIndex : 0;
    
    setSelectedFileIndex(newIndex);
    if (newFiles[newIndex]) {
      setEditedCode(newFiles[newIndex].content || '');
    }
    setExecutionResult(null);
  };

  const handleExecute = async () => {
    if (!attempt || attempt.exam.tipo !== 'programming') return;

    try {
      setExecuting(true);
      setExecutionResult(null);

      const currentFiles = getCurrentFiles();
      const mainFile = currentFiles[selectedFileIndex];

      if (!mainFile) {
        setExecutionResult({
          error: 'No hay archivo seleccionado para ejecutar'
        });
        return;
      }

      // Preparar payload para ejecución
      const payload = {
        code: editedCode,
        language: attempt.exam.lenguajeProgramacion,
        filename: mainFile.filename,
        // Si usa input personalizado, enviarlo
        ...(useCustomInput && customInput && { 
          customInput: customInput 
        }),
        // Si no usa input personalizado y hay test cases, ejecutarlos
        ...(!useCustomInput && attempt.exam.testCases && {
          testCases: attempt.exam.testCases
        })
      };

      const response = await fetch(`${API_BASE_URL}/code-execution/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setExecutionResult(result);
      } else {
        const errorData = await response.json();
        setExecutionResult({
          error: errorData.error || 'Error al ejecutar el código'
        });
      }
    } catch (error) {
      console.error('Error executing code:', error);
      setExecutionResult({
        error: 'Error de conexión al ejecutar el código'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!calificacionManual || calificacionManual === '') {
      return;
    }

    const grade = parseFloat(calificacionManual);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/manual-grade`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calificacionManual: grade
        })
      });

      if (response.ok) {
        if (onSave) onSave();
        if (onClose) onClose();
      } else {
        const errorData = await response.json();
        console.error('Error al guardar:', errorData);
      }
    } catch (error) {
      console.error('Error saving grade:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div className="loading-container">
            <div className="modern-spinner"></div>
            <p>Cargando intento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div className="modern-card-body text-center">
            <h4>Error al cargar el intento</h4>
            <button className="modern-btn modern-btn-secondary mt-3" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentFiles = getCurrentFiles();
  const currentFile = currentFiles[selectedFileIndex];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modern-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="modern-card-title mb-0">
              <i className="fas fa-user-edit me-2"></i>
              Corrección Manual - {attempt.user.nombre}
            </h3>
            <button 
              className="btn-close" 
              onClick={onClose}
              aria-label="Cerrar"
            ></button>
          </div>
        </div>

        <div className="modern-card-body" style={{ maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
          {/* Información de calificaciones */}
          <div className="row mb-4">
            {attempt.puntaje !== null && (
              <div className="col-md-6 mb-3">
                <div className="modern-card" style={{ 
                  height: '100%',
                  border: '2px solid #0d6efd',
                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.05) 0%, rgba(13, 110, 253, 0.02) 100%)'
                }}>
                  <div className="modern-card-body text-center">
                    <div style={{ 
                      fontSize: '1.8rem', 
                      color: '#0d6efd',
                      marginBottom: '8px'
                    }}>
                      <i className="fas fa-robot"></i>
                    </div>
                    <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Puntaje Automático
                    </h6>
                    <h2 className="mb-2" style={{ 
                      color: '#0d6efd',
                      fontWeight: 'bold',
                      fontSize: '2.5rem'
                    }}>
                      {attempt.puntaje.toFixed(1)}%
                    </h2>
                    {attempt.exam.tipo === 'programming' && (
                      <div style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#e7f3ff',
                        border: '1px solid #0d6efd',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#084298',
                        textAlign: 'left'
                      }}>
                        <i className="fas fa-info-circle me-1"></i>
                        Calculado sobre <strong>{attempt.exam.lenguajeProgramacion === 'python' ? 'main.py' : 'main.js'}</strong> (versión manual guardada)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className={attempt.puntaje !== null ? "col-md-6 mb-3" : "col-12 mb-3"}>
              <div className="modern-card" style={{ 
                height: '100%',
                border: attempt.calificacionManual !== null ? '2px solid #198754' : '2px solid #ffc107',
                background: attempt.calificacionManual !== null 
                  ? 'linear-gradient(135deg, rgba(25, 135, 84, 0.05) 0%, rgba(25, 135, 84, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)'
              }}>
                <div className="modern-card-body text-center">
                  <div style={{ 
                    fontSize: '1.8rem', 
                    color: attempt.calificacionManual !== null ? '#198754' : '#ffc107',
                    marginBottom: '8px'
                  }}>
                    <i className={attempt.calificacionManual !== null ? "fas fa-check-circle" : "fas fa-exclamation-triangle"}></i>
                  </div>
                  <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Calificación Manual
                  </h6>
                  {attempt.calificacionManual !== null ? (
                    <h2 className="mb-0" style={{ 
                      color: '#198754',
                      fontWeight: 'bold',
                      fontSize: '2.5rem'
                    }}>
                      {attempt.calificacionManual}
                    </h2>
                  ) : (
                    <h4 className="mb-0" style={{ 
                      color: '#ffc107',
                      fontWeight: '600',
                      fontSize: '1.2rem'
                    }}>
                      Pendiente de corrección
                    </h4>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Para exámenes de programación */}
          {attempt.exam.tipo === 'programming' && (
            <>
              {/* Enunciado */}
              <div className="modern-card mb-3">
                <div className="modern-card-header">
                  <h5 className="modern-card-title mb-0">
                    <i className="fas fa-puzzle-piece me-2"></i>
                    Enunciado del Problema
                  </h5>
                </div>
                <div className="modern-card-body">
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    margin: 0,
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.5rem',
                    border: '1px solid #dee2e6'
                  }}>
                    {attempt.exam.enunciadoProgramacion || 'No hay enunciado definido'}
                  </pre>
                </div>
              </div>

              {/* Layout de dos columnas: Solución del Alumno vs Solución de Referencia */}
              <div className="row mb-3">
                {/* Columna izquierda: Solución del Alumno */}
                <div className={referenceFiles.length > 0 ? "col-lg-6 mb-3" : "col-12 mb-3"}>
                  <div className="modern-card h-100">
                    <div className="modern-card-header">
                      <h5 className="modern-card-title mb-0">
                        <i className="fas fa-user me-2"></i>
                        Código del Alumno
                      </h5>
                      <small className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>
                        <i className="fas fa-info-circle me-1"></i>
                        El código puede editarse temporalmente para pruebas sin modificar el archivo original
                      </small>
                    </div>
                    <div className="modern-card-body">
                      {/* Selector de versión de archivos */}
                      {(attempt.manualFiles.length > 0 || attempt.submissionFiles.length > 0) && (
                        <div className="mb-3">
                          <label className="form-label fw-bold">
                            <i className="fas fa-code-branch me-2"></i>
                            Versión:
                          </label>
                          <div className="btn-group w-100" role="group">
                            <button
                              type="button"
                              className={`btn btn-sm ${fileVersion === 'manual' ? 'btn-primary' : 'btn-outline-secondary'}`}
                              onClick={() => handleVersionChange('manual')}
                            >
                              <i className="fas fa-save me-2"></i>
                              Guardados
                              {attempt.manualFiles.length > 0 && (
                                <span className="badge bg-light text-dark ms-2">{attempt.manualFiles.length}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${fileVersion === 'submission' ? 'btn-primary' : 'btn-outline-secondary'}`}
                              onClick={() => handleVersionChange('submission')}
                            >
                              <i className="fas fa-paper-plane me-2"></i>
                              Entrega Final
                              {attempt.submissionFiles.length > 0 && (
                                <span className="badge bg-light text-dark ms-2">{attempt.submissionFiles.length}</span>
                              )}
                            </button>
                          </div>
                          <div className="form-text">
                            {fileVersion === 'submission' 
                              ? 'Archivos enviados al finalizar el examen'
                              : 'Archivos guardados durante el examen (Ctrl+S)'
                            }
                          </div>
                        </div>
                      )}

                      {/* Selector de archivos */}
                      {currentFiles.length > 0 && (
                        <div className="mb-3">
                          <label className="form-label fw-bold">
                            <i className="fas fa-file-code me-2"></i>
                            Archivo:
                          </label>
                          <select 
                            className="form-select"
                            value={selectedFileIndex}
                            onChange={(e) => handleFileChange(parseInt(e.target.value))}
                          >
                            {currentFiles.map((file, index) => (
                              <option key={index} value={index}>
                                {file.filename}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Editor de código */}
                      {currentFile && (
                        <div>
                          <div style={{ height: '500px', border: '1px solid #444', borderRadius: '0.375rem', overflow: 'hidden' }}>
                            <Editor
                              height="100%"
                              language={attempt.exam.lenguajeProgramacion}
                              theme="vs-dark"
                              value={editedCode}
                              onChange={(value) => setEditedCode(value || '')}
                              options={{
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
                                tabSize: attempt.exam.lenguajeProgramacion === 'python' ? 4 : 2
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna derecha: Solución de Referencia */}
                {referenceFiles.length > 0 && (
                  <div className="col-lg-6 mb-3">
                    {loadingReferenceFiles ? (
                      <div className="modern-card h-100">
                        <div className="modern-card-body text-center d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                          <div>
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Cargando solución de referencia...</span>
                            </div>
                            <p className="mt-2 mb-0 text-muted">Cargando solución de referencia...</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="modern-card h-100">
                        <div className="modern-card-header">
                          <h5 className="modern-card-title mb-0">
                            <i className="fas fa-check-double me-2"></i>
                            Solución de Referencia
                          </h5>
                          <small className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>
                            <i className="fas fa-info-circle me-1"></i>
                            Solución guardada al crear el examen
                          </small>
                        </div>
                        <div className="modern-card-body">
                          {/* Versión (solo para alinear visualmente) */}
                          <div className="mb-3">
                            <label className="form-label fw-bold">
                              <i className="fas fa-code-branch me-2"></i>
                              Versión:
                            </label>
                            <div className="btn-group w-100" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled
                              >
                                <i className="fas fa-check-circle me-2"></i>
                                Guardados
                              </button>
                            </div>
                            <div className="form-text">
                              Archivos de referencia del profesor
                            </div>
                          </div>

                          {/* Selector de archivos */}
                          <div className="mb-3">
                            <label className="form-label fw-bold">
                              <i className="fas fa-file-code me-2"></i>
                              Archivo:
                            </label>
                            <select 
                              className="form-select"
                              value={currentReferenceFile}
                              onChange={(e) => setCurrentReferenceFile(e.target.value)}
                            >
                              {referenceFiles.map((file) => (
                                <option key={file.filename} value={file.filename}>
                                  {file.filename}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Contenido del archivo actual */}
                          <div style={{ height: '500px', border: '1px solid #444', borderRadius: '0.375rem', overflow: 'hidden' }}>
                            <Editor
                              height="100%"
                              language={attempt.exam.lenguajeProgramacion}
                              theme="vs-dark"
                              value={referenceFiles.find(f => f.filename === currentReferenceFile)?.content || ''}
                              options={{
                                selectOnLineNumbers: true,
                                roundedSelection: false,
                                readOnly: true,
                                cursorStyle: 'line',
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                minimap: { enabled: true },
                                fontSize: 14,
                                lineNumbers: 'on',
                                wordWrap: 'on',
                                tabSize: attempt.exam.lenguajeProgramacion === 'python' ? 4 : 2
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Opciones de ejecución */}
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="useCustomInput"
                    checked={useCustomInput}
                    onChange={(e) => setUseCustomInput(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="useCustomInput">
                    Usar entrada personalizada (en lugar de test cases)
                  </label>
                </div>
                {useCustomInput && (
                  <div className="mt-2">
                    <label className="form-label">Input personalizado:</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Ingresa el input que recibirá el programa..."
                    />
                  </div>
                )}
              </div>

              {/* Botón de ejecución */}
              <div className="mb-3">
                <button
                  className="modern-btn modern-btn-primary w-100"
                  onClick={handleExecute}
                  disabled={executing || !currentFile}
                >
                  {executing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Ejecutando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play me-2"></i>
                      Ejecutar Código del Alumno
                    </>
                  )}
                </button>
              </div>

              {/* Resultado de ejecución */}
              {executionResult && (
                <div className="modern-card mb-3">
                  <div className="modern-card-header">
                    <h5 className="modern-card-title mb-0">
                      <i className="fas fa-terminal me-2"></i>
                      Resultado de Ejecución
                    </h5>
                  </div>
                  <div className="modern-card-body">
                    {executionResult.error ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        border: '2px solid #dc2626',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: 0
                      }}>
                        <div className="d-flex align-items-start">
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#dc2626',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            flexShrink: 0,
                            marginRight: '16px'
                          }}>
                            <i className="fas fa-exclamation-circle"></i>
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ color: '#991b1b', marginBottom: '8px', fontWeight: 'bold' }}>
                              Error de Ejecución
                            </h5>
                            <pre style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #fca5a5',
                              marginBottom: 0,
                              fontSize: '13px',
                              color: '#7f1d1d',
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word'
                            }}>
                              {executionResult.error}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {executionResult.score !== undefined && (
                          <div style={{
                            background: executionResult.score === 100 
                              ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                              : executionResult.score >= 50
                              ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                              : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                            border: `2px solid ${
                              executionResult.score === 100 ? '#10b981' 
                              : executionResult.score >= 50 ? '#f59e0b' 
                              : '#ef4444'
                            }`,
                            borderRadius: '10px',
                            padding: '16px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: executionResult.score === 100 ? '#10b981' 
                                : executionResult.score >= 50 ? '#f59e0b' 
                                : '#ef4444',
                              color: 'white',
                              fontSize: '1.5rem',
                              flexShrink: 0,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                              <i className={`fas ${
                                executionResult.score === 100 ? 'fa-check' 
                                : executionResult.score >= 50 ? 'fa-minus' 
                                : 'fa-times'
                              }`}></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                color: executionResult.score === 100 ? '#065f46' 
                                  : executionResult.score >= 50 ? '#92400e' 
                                  : '#991b1b',
                                fontSize: '1.8rem',
                                fontWeight: 'bold',
                                margin: 0,
                                marginBottom: '4px'
                              }}>
                                {executionResult.score.toFixed(1)}%
                              </h4>
                              <div style={{
                                fontSize: '0.9rem',
                                color: executionResult.score === 100 ? '#047857' 
                                  : executionResult.score >= 50 ? '#b45309' 
                                  : '#b91c1c',
                                fontWeight: '600'
                              }}>
                                {executionResult.passedTests} de {executionResult.totalTests} tests pasados
                              </div>
                            </div>
                          </div>
                        )}

                        {executionResult.testResults && executionResult.testResults.length > 0 && (
                          <div>
                            <h6 style={{ 
                              marginBottom: '16px', 
                              color: '#374151', 
                              fontWeight: '600',
                              fontSize: '1.1rem',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-list-check me-2" style={{ color: '#6366f1' }}></i>
                              Resultados por Test:
                            </h6>
                            <div style={{ display: 'grid', gap: '12px' }}>
                              {executionResult.testResults.map((test, idx) => (
                                <div key={idx} style={{
                                  background: test.passed 
                                    ? 'linear-gradient(to right, #f0fdf4 0%, #dcfce7 100%)'
                                    : 'linear-gradient(to right, #fef2f2 0%, #fee2e2 100%)',
                                  border: `2px solid ${test.passed ? '#22c55e' : '#ef4444'}`,
                                  borderRadius: '10px',
                                  padding: '16px',
                                  transition: 'transform 0.2s, box-shadow 0.2s'
                                }}>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center">
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: test.passed ? '#22c55e' : '#ef4444',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                      }}>
                                        {test.passed ? '✓' : '✗'}
                                      </div>
                                      <strong style={{ 
                                        fontSize: '1rem',
                                        color: test.passed ? '#166534' : '#991b1b'
                                      }}>
                                        Test {idx + 1}
                                        {test.description && `: ${test.description}`}
                                      </strong>
                                    </div>
                                    <span style={{
                                      padding: '4px 12px',
                                      borderRadius: '20px',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      background: test.passed ? '#22c55e' : '#ef4444',
                                      color: 'white'
                                    }}>
                                      {test.passed ? 'Pasado' : 'Fallido'}
                                    </span>
                                  </div>
                                  
                                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {test.input && (
                                      <div style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        flex: '1 1 calc(33.333% - 8px)',
                                        minWidth: '200px'
                                      }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          color: '#6b7280', 
                                          fontWeight: '600',
                                          marginBottom: '4px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>
                                          📥 Input
                                        </div>
                                        <pre style={{
                                          margin: 0,
                                          fontSize: '0.85rem',
                                          color: '#374151',
                                          whiteSpace: 'pre-wrap',
                                          wordWrap: 'break-word',
                                          fontFamily: 'Consolas, Monaco, monospace'
                                        }}>
                                          {test.input}
                                        </pre>
                                      </div>
                                    )}
                                    
                                    {test.expectedOutput && (
                                      <div style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        flex: '1 1 calc(33.333% - 8px)',
                                        minWidth: '200px'
                                      }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          color: '#22c55e', 
                                          fontWeight: '600',
                                          marginBottom: '4px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>
                                          ✓ Esperado
                                        </div>
                                        <pre style={{
                                          margin: 0,
                                          fontSize: '0.85rem',
                                          color: '#166534',
                                          whiteSpace: 'pre-wrap',
                                          wordWrap: 'break-word',
                                          fontFamily: 'Consolas, Monaco, monospace'
                                        }}>
                                          {test.expectedOutput}
                                        </pre>
                                      </div>
                                    )}
                                    
                                    {test.actualOutput && (
                                      <div style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: `1px solid ${test.passed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        flex: '1 1 calc(33.333% - 8px)',
                                        minWidth: '200px'
                                      }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          color: test.passed ? '#22c55e' : '#ef4444', 
                                          fontWeight: '600',
                                          marginBottom: '4px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>
                                          📤 Obtenido
                                        </div>
                                        <pre style={{
                                          margin: 0,
                                          fontSize: '0.85rem',
                                          color: test.passed ? '#166534' : '#991b1b',
                                          whiteSpace: 'pre-wrap',
                                          wordWrap: 'break-word',
                                          fontFamily: 'Consolas, Monaco, monospace'
                                        }}>
                                          {test.actualOutput}
                                        </pre>
                                      </div>
                                    )}
                                    
                                    {test.error && (
                                      <div style={{
                                        background: 'rgba(254, 226, 226, 0.8)',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #fca5a5',
                                        flex: '1 1 100%'
                                      }}>
                                        <div style={{ 
                                          fontSize: '0.75rem', 
                                          color: '#dc2626', 
                                          fontWeight: '600',
                                          marginBottom: '4px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>
                                          ⚠️ Error
                                        </div>
                                        <pre style={{
                                          margin: 0,
                                          fontSize: '0.85rem',
                                          color: '#991b1b',
                                          whiteSpace: 'pre-wrap',
                                          wordWrap: 'break-word',
                                          fontFamily: 'Consolas, Monaco, monospace'
                                        }}>
                                          {test.error}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {executionResult.output && !executionResult.testResults && (
                          <div>
                            <h6 style={{ 
                              marginBottom: '12px', 
                              color: '#374151', 
                              fontWeight: '600',
                              fontSize: '1.1rem',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <i className="fas fa-terminal me-2" style={{ color: '#6366f1' }}></i>
                              Salida del Programa:
                            </h6>
                            <div style={{
                              background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
                              padding: '16px',
                              borderRadius: '10px',
                              border: '2px solid #444',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                            }}>
                              <pre style={{
                                color: '#d4d4d4',
                                margin: 0,
                                fontSize: '0.9rem',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                lineHeight: '1.5'
                              }}>
                                {executionResult.output}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Para exámenes múltiple choice */}
          {attempt.exam.tipo === 'multiple_choice' && (
            <div className="modern-card mb-3">
              <div className="modern-card-header">
                <h5 className="modern-card-title mb-0">
                  <i className="fas fa-list-check me-2"></i>
                  Respuestas del Estudiante
                </h5>
              </div>
              <div className="modern-card-body">
                {attempt.exam.preguntas.map((pregunta, idx) => {
                  const respuestaEstudiante = attempt.respuestas[idx]; // ✅ usar índice
                  const esCorrecta = respuestaEstudiante === pregunta.correcta;

                  return (
                    <div key={pregunta.id} className="mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-1">Pregunta {idx + 1}</h6>
                        <span className={`badge ${esCorrecta ? 'bg-success' : 'bg-danger'}`}>
                          {esCorrecta ? '✓ Correcta' : '✗ Incorrecta'}
                        </span>
                      </div>
                      <p className="mb-2">{pregunta.texto}</p>
                      <div className="ms-3">
                        {pregunta.opciones.map((opcion, opIdx) => (
                          <div
                            key={opIdx}
                            className={`p-2 mb-1 rounded ${
                              opIdx === pregunta.correcta
                                ? 'bg-success bg-opacity-10 border border-success'
                                : opIdx === respuestaEstudiante
                                ? 'bg-danger bg-opacity-10 border border-danger'
                                : 'bg-light'
                            }`}
                          >
                            {opIdx === pregunta.correcta && <i className="fas fa-check-circle text-success me-2"></i>}
                            {opIdx === respuestaEstudiante && opIdx !== pregunta.correcta && <i className="fas fa-times-circle text-danger me-2"></i>}
                            {opcion}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Calificación Manual */}
          <div className="modern-card">
            <div className="modern-card-header">
              <h5 className="modern-card-title mb-0">
                <i className="fas fa-clipboard-check me-2"></i>
                Calificación Manual
              </h5>
            </div>
            <div className="modern-card-body">
              <div className="mb-3">
                <label className="form-label fw-bold">
                  Calificación:
                </label>
                <input
                  type="number"
                  className="form-control"
                  step="0.1"
                  value={calificacionManual}
                  onChange={(e) => setCalificacionManual(e.target.value)}
                  placeholder="Ingrese la calificación..."
                  disabled={saving}
                />
                {attempt && attempt.puntaje !== null && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleUseAutomaticGrade}
                      title="Usar la nota automática como calificación manual"
                    >
                      <i className="fas fa-robot me-2"></i>
                      Usar nota automática ({attempt.puntaje.toFixed(1)}%)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="modern-card-footer" style={{ 
          padding: '20px 24px',
          borderTop: '2px solid #e5e7eb'
        }}>
          <div className="d-flex justify-content-end gap-3">
            <button 
              className="modern-btn modern-btn-success modern-btn-lg"
              onClick={handleSaveGrade}
              disabled={saving || !calificacionManual}
              style={{ minWidth: '200px' }}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Guardar Calificación
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '1400px',
    maxHeight: '95vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden'
  }
};
