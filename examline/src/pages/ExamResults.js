import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import '../modern-examline.css';
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://two025-simuladores-back-1.onrender.com';

const ExamResults = ({ attemptId: propAttemptId, onBack }) => {
  const { attemptId: routeAttemptId } = useParams();
  const navigate = useNavigate();
  const attemptId = propAttemptId || routeAttemptId;
  const { user, token } = useAuth();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [fileVersion, setFileVersion] = useState('manual'); // 'manual' | 'submission' - Por defecto muestra guardados manuales
  const [manualFiles, setManualFiles] = useState([]);
  const [submissionFiles, setSubmissionFiles] = useState([]);

  useEffect(() => {
    if (!attemptId || !token) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/exam-attempts/${attemptId}/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🎯 ExamResults - Datos recibidos:', data);
          console.log('💯 ExamResults - Puntaje:', data.puntaje);
          console.log('📝 ExamResults - Respuestas:', data.respuestas);
          console.log('📋 ExamResults - Tipo examen:', data.exam?.tipo);
          setAttempt(data);
          
          // Si es un examen de programación, cargar ambas versiones de archivos
          if (data.exam.tipo === 'programming') {
            await fetchFileVersions(data.exam.id);
          }
          
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error cargando resultados');
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, token]);

  // Función para cargar ambas versiones de archivos
  const fetchFileVersions = async (examId) => {
    try {
      const [manualResponse, submissionResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/exam-files/${examId}/files?version=manual`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/exam-files/${examId}/files?version=submission`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (manualResponse.ok) {
        const manualData = await manualResponse.json();
        setManualFiles(manualData);
      }

      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json();
        setSubmissionFiles(submissionData);
      }
    } catch (err) {
      console.error('Error fetching file versions:', err);
    }
  };

  // Función para detectar si realmente hay diferencias entre versiones
  const hasRealDifferences = () => {
    if (manualFiles.length === 0 || submissionFiles.length === 0) {
      return false;
    }

    // Verificar si tienen la misma cantidad de archivos
    if (manualFiles.length !== submissionFiles.length) {
      return true;
    }

    // Crear mapas de archivos por nombre
    const manualMap = new Map(manualFiles.map(f => [f.filename, f.content]));
    const submissionMap = new Map(submissionFiles.map(f => [f.filename, f.content]));

    // Verificar si todos los archivos existen en ambas versiones
    for (const filename of manualMap.keys()) {
      if (!submissionMap.has(filename)) {
        return true;
      }
    }

    // Comparar contenido de archivos con el mismo nombre
    for (const [filename, manualContent] of manualMap.entries()) {
      const submissionContent = submissionMap.get(filename);
      if (manualContent !== submissionContent) {
        return true;
      }
    }

    return false;
  };

  // Función para cambiar de versión manteniendo el archivo actual si existe
  const handleVersionChange = (newVersion) => {
    const currentFiles = fileVersion === 'manual' ? manualFiles : submissionFiles;
    const newFiles = newVersion === 'manual' ? manualFiles : submissionFiles;
    
    // Obtener el nombre del archivo actualmente seleccionado
    const currentFileName = currentFiles[selectedFileIndex]?.filename;
    
    if (currentFileName) {
      // Buscar el mismo archivo en la nueva versión
      const sameFileIndex = newFiles.findIndex(f => f.filename === currentFileName);
      
      if (sameFileIndex !== -1) {
        // Si existe el mismo archivo, mantener la selección
        setSelectedFileIndex(sameFileIndex);
      } else {
        // Si no existe, seleccionar el primer archivo
        setSelectedFileIndex(0);
      }
    } else {
      setSelectedFileIndex(0);
    }
    
    setFileVersion(newVersion);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/student-exam');
    }
  };



  if (loading) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="container py-5">
        <div className="modern-card">
          <div className="modern-card-body text-center">
            <div className="exam-results-error-state">
              <div className="empty-icon text-danger mb-3">
                <i className="fas fa-exclamation-triangle fa-3x"></i>
              </div>
              <h4 className="empty-title">{error || 'Resultados no disponibles'}</h4>
              <p className="empty-subtitle mb-4">
                No se pudieron cargar los resultados del examen.
              </p>
              <button className="modern-btn modern-btn-primary" onClick={handleBack}>
                <i className="fas fa-arrow-left me-2"></i>
                <span className="btn-text">Volver al inicio</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-results-header">
            <div className="header-content-section">
              <h1 className="page-title mb-0">
                <i className="fas fa-chart-bar me-3"></i>
                <span className="title-text">Resultados del Examen</span>
              </h1>
            </div>
            <div className="header-actions-section">
              {!propAttemptId && <BackToMainButton />}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Info */}
      <div className="modern-card mb-4">
        <div className="modern-card-body">
          <div className="exam-results-info">
            <h2 className="exam-results-title mb-2">{attempt.exam.titulo}</h2>
            <div className="d-flex align-items-center gap-3 mb-2">
              <span className={`badge ${attempt.exam.tipo === 'programming' ? 'bg-primary' : 'bg-secondary'}`}>
                {attempt.exam.tipo === 'programming' ? 'Examen de Programación' : 'Examen Múltiple Choice'}
              </span>
              {attempt.exam.tipo === 'programming' && (
                <span className="badge bg-info">
                  {attempt.exam.lenguajeProgramacion === 'python' ? '🐍 Python' : '⚡ JavaScript'}
                </span>
              )}
            </div>
            <p className="exam-results-description text-muted mb-0">
              <i className="fas fa-info-circle me-2"></i>
              <span className="description-text">
                {attempt.exam.tipo === 'programming' 
                  ? 'Tu solución al problema de programación'
                  : 'Respuestas correctas del examen'
                }
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Contenido según el tipo de examen */}
      {attempt.exam.tipo === 'programming' ? (
        /* Vista para exámenes de programación */
        <div>
          {/* Enunciado del problema */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-puzzle-piece me-2"></i>
                Enunciado del Problema
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="problem-statement">
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  margin: 0,
                  padding: '1.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.5rem',
                  border: '1px solid #dee2e6'
                }}>
                  {attempt.exam.enunciadoProgramacion || 'No hay enunciado definido'}
                </pre>
              </div>
            </div>
          </div>

          {/* Archivos guardados del estudiante */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <h3 className="modern-card-title mb-0">
                  <i className="fas fa-folder-open me-2"></i>
                  Archivos de tu Solución
                </h3>
                
                {/* Selector de versión de archivos */}
                {(manualFiles.length > 0 || submissionFiles.length > 0) && (
                  <div className="version-selector">
                    <div className="btn-group" role="group" aria-label="Versión de archivos">
                      <button
                        type="button"
                        className={`modern-btn ${fileVersion === 'manual' ? 'modern-btn-primary' : 'modern-btn-outline'}`}
                        onClick={() => handleVersionChange('manual')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s ease',
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          ...(fileVersion !== 'manual' && {
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            background: 'white'
                          })
                        }}
                      >
                        <i className="fas fa-save"></i>
                        <span>Guardado Manual</span>
                        {manualFiles.length > 0 && (
                          <span className="badge bg-light text-dark ms-1" style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '0.25rem'
                          }}>
                            {manualFiles.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`modern-btn ${fileVersion === 'submission' ? 'modern-btn-success' : 'modern-btn-outline'}`}
                        onClick={() => handleVersionChange('submission')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s ease',
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          borderLeft: 'none',
                          ...(fileVersion !== 'submission' && {
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            background: 'white'
                          })
                        }}
                      >
                        <i className="fas fa-paper-plane"></i>
                        <span>Al Enviar Examen</span>
                        {submissionFiles.length > 0 && (
                          <span className="badge bg-light text-dark ms-1" style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '0.25rem'
                          }}>
                            {submissionFiles.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modern-card-body">
              {(() => {
                const currentFiles = fileVersion === 'manual' ? manualFiles : submissionFiles;
                const hasFiles = currentFiles && currentFiles.length > 0;
                
                return hasFiles ? (
                <div>
                  {/* Información de archivos */}
                  <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{
                    padding: '0.75rem 1rem',
                    background: fileVersion === 'manual' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${fileVersion === 'manual' ? '#6366f1' : '#10b981'}`,
                    borderRadius: '0.5rem',
                    borderLeft: `4px solid ${fileVersion === 'manual' ? '#6366f1' : '#10b981'}`
                  }}>
                    <small style={{ color: '#64748b', fontWeight: '500' }}>
                      <i className={`fas ${fileVersion === 'manual' ? 'fa-save' : 'fa-paper-plane'} me-2`} 
                         style={{ color: fileVersion === 'manual' ? '#6366f1' : '#10b981' }}></i>
                      {fileVersion === 'manual' 
                        ? `${currentFiles.length} archivo${currentFiles.length !== 1 ? 's' : ''} guardado${currentFiles.length !== 1 ? 's' : ''} manualmente (Ctrl+S)`
                        : `${currentFiles.length} archivo${currentFiles.length !== 1 ? 's' : ''} al enviar el examen`
                      }
                    </small>
                    {currentFiles.length > 6 && (
                      <span className="badge" style={{
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        color: 'white',
                        borderRadius: '1rem',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                      }}>
                        <i className="fas fa-layer-group me-1"></i>
                        Muchos archivos
                      </span>
                    )}
                  </div>

                  {/* Comparación de versiones */}
                  {hasRealDifferences() && (
                    <div className="mb-3 p-3" style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid #f59e0b',
                      borderRadius: '0.5rem',
                      borderLeft: '4px solid #f59e0b'
                    }}>
                      <div className="d-flex align-items-start gap-3">
                        <i className="fas fa-exclamation-triangle mt-1" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                        <div>
                          <strong style={{ color: '#334155', fontSize: '0.9rem' }}>
                            Diferencias detectadas
                          </strong>
                          <p className="mb-0" style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            Hay diferencias entre los archivos guardados manualmente (Ctrl+S) y los archivos al momento de enviar el examen. Usa el selector arriba para comparar ambas versiones.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selector de pestañas */}
                  <div style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {/* Navegación de archivos */}
                    <div style={{
                      background: '#f8f9fa',
                      borderBottom: '1px solid #dee2e6',
                      padding: '0.5rem'
                    }}>
                      {currentFiles.length <= 6 ? (
                        /* Pestañas normales para pocos archivos */
                        <div style={{
                          display: 'flex',
                          gap: '2px'
                        }}>
                          {currentFiles.map((file, index) => (
                            <button
                              key={file.id}
                              onClick={() => setSelectedFileIndex(index)}
                              style={{
                                padding: '0.75rem 1rem',
                                border: selectedFileIndex === index ? 'none' : '1px solid #e2e8f0',
                                background: selectedFileIndex === index 
                                  ? (fileVersion === 'manual' 
                                      ? 'var(--primary-color, #6366f1)' 
                                      : 'linear-gradient(135deg, var(--success-color, #10b981), #059669)')
                                  : 'white',
                                color: selectedFileIndex === index ? 'white' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: selectedFileIndex === index ? '600' : '500',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '0.375rem',
                                boxShadow: selectedFileIndex === index ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                flex: '1',
                                minWidth: '0',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedFileIndex !== index) {
                                  e.target.style.background = '#f8fafc';
                                  e.target.style.borderColor = fileVersion === 'manual' ? 'var(--primary-color, #6366f1)' : 'var(--success-color, #10b981)';
                                  e.target.style.color = fileVersion === 'manual' ? 'var(--primary-color, #6366f1)' : 'var(--success-color, #10b981)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedFileIndex !== index) {
                                  e.target.style.background = 'white';
                                  e.target.style.borderColor = '#e2e8f0';
                                  e.target.style.color = '#64748b';
                                }
                              }}
                            >
                              <i className="fas fa-file-code"></i>
                              <span style={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {file.filename}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Navegación compacta para muchos archivos */
                        <div className="row align-items-center">
                          <div className="col-md-6">
                            {/* Selector desplegable */}
                            <select
                              value={selectedFileIndex}
                              onChange={(e) => setSelectedFileIndex(parseInt(e.target.value))}
                              className="form-select form-select-sm"
                              style={{
                                fontSize: '0.9rem',
                                borderRadius: '0.375rem'
                              }}
                            >
                              {currentFiles.map((file, index) => (
                                <option key={file.id} value={index}>
                                  {index + 1}. {file.filename}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            {/* Navegación con botones */}
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                onClick={() => setSelectedFileIndex(Math.max(0, selectedFileIndex - 1))}
                                disabled={selectedFileIndex === 0}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  border: selectedFileIndex === 0 ? '1px solid #e2e8f0' : '1px solid #6366f1',
                                  background: selectedFileIndex === 0 ? '#f8fafc' : 'white',
                                  color: selectedFileIndex === 0 ? '#94a3b8' : '#6366f1',
                                  borderRadius: '0.375rem',
                                  cursor: selectedFileIndex === 0 ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s ease',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                              >
                                <i className="fas fa-chevron-left me-1"></i>
                                Anterior
                              </button>
                              <button
                                onClick={() => setSelectedFileIndex(Math.min(currentFiles.length - 1, selectedFileIndex + 1))}
                                disabled={selectedFileIndex === currentFiles.length - 1}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  border: selectedFileIndex === currentFiles.length - 1 ? '1px solid #e2e8f0' : '1px solid #6366f1',
                                  background: selectedFileIndex === currentFiles.length - 1 ? '#f8fafc' : 'white',
                                  color: selectedFileIndex === currentFiles.length - 1 ? '#94a3b8' : '#6366f1',
                                  borderRadius: '0.375rem',
                                  cursor: selectedFileIndex === currentFiles.length - 1 ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s ease',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                              >
                                Siguiente
                                <i className="fas fa-chevron-right ms-1"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Vista de pestañas con scroll para caso intermedio */}
                      {currentFiles.length > 6 && currentFiles.length <= 12 && (
                        <div style={{
                          marginTop: '0.5rem',
                          overflowX: 'auto',
                          paddingBottom: '0.25rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '2px',
                            minWidth: 'max-content'
                          }}>
                            {currentFiles.map((file, index) => (
                              <button
                                key={file.id}
                                onClick={() => setSelectedFileIndex(index)}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  border: selectedFileIndex === index ? 'none' : '1px solid #e2e8f0',
                                  background: selectedFileIndex === index 
                                    ? (fileVersion === 'manual' 
                                        ? 'var(--primary-color, #6366f1)' 
                                        : 'linear-gradient(135deg, var(--success-color, #10b981), #059669)')
                                    : 'white',
                                  color: selectedFileIndex === index ? 'white' : '#64748b',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: selectedFileIndex === index ? '600' : '500',
                                  borderRadius: '0.375rem',
                                  whiteSpace: 'nowrap',
                                  minWidth: '100px',
                                  transition: 'all 0.2s ease',
                                  boxShadow: selectedFileIndex === index ? '0 2px 8px rgba(99, 102, 241, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)'
                                }}
                              >
                                <i className="fas fa-file-code me-1"></i>
                                {file.filename.length > 12 ? file.filename.substring(0, 12) + '...' : file.filename}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contenido del archivo seleccionado */}
                    {currentFiles[selectedFileIndex] && (
                      <div>
                        {/* Header del archivo */}
                        <div style={{
                          padding: '1rem 1.25rem',
                          background: '#ffffff',
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h5 style={{
                                margin: '0 0 0.25rem 0',
                                color: '#2d3748',
                                fontWeight: '600',
                                fontSize: '1.1rem'
                              }}>
                                <i className={`fas ${fileVersion === 'manual' ? 'fa-save' : 'fa-paper-plane'} me-2`}
                                   style={{ color: fileVersion === 'manual' ? 'var(--primary-color, #6366f1)' : 'var(--success-color, #10b981)' }}></i>
                                {currentFiles[selectedFileIndex].filename}
                              </h5>
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                Última modificación: {new Date(currentFiles[selectedFileIndex].updatedAt).toLocaleString()}
                                <span className={`ms-3 badge ${fileVersion === 'manual' ? 'bg-primary' : 'bg-success'}`}
                                      style={{
                                        background: fileVersion === 'manual' ? 'var(--primary-color, #6366f1)' : 'var(--success-color, #10b981)',
                                        color: 'white'
                                      }}>
                                  {fileVersion === 'manual' ? 'Guardado Manual' : 'Al Enviar'}
                                </span>
                              </small>
                            </div>
                            <span style={{
                              background: fileVersion === 'manual' 
                                ? 'var(--primary-color, #6366f1)' 
                                : 'linear-gradient(135deg, var(--success-color, #10b981), #059669)',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '1rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              Archivo {selectedFileIndex + 1} de {currentFiles.length}
                            </span>
                          </div>
                        </div>

                        {/* Contenido del código */}
                        <div>
                          {currentFiles[selectedFileIndex].content ? (
                            <pre style={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                              fontSize: '0.9rem',
                              lineHeight: '1.5',
                              margin: 0,
                              padding: '1.5rem',
                              backgroundColor: '#1e1e1e',
                              color: '#d4d4d4',
                              border: 'none',
                              overflow: 'auto',
                              maxHeight: '600px',
                              minHeight: '300px'
                            }}>
                              {currentFiles[selectedFileIndex].content}
                            </pre>
                          ) : (
                            <div style={{
                              padding: '3rem',
                              textAlign: 'center',
                              background: '#f8f9fa',
                              minHeight: '300px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6c757d'
                            }}>
                              <i className="fas fa-file-alt" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                              <h6>Archivo vacío</h6>
                              <p className="mb-0">Este archivo no tiene contenido</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                ) : (
                  /* Sin archivos en la versión seleccionada */
                  <div className="empty-state">
                    <div className="empty-icon">
                      <i className={`fas ${fileVersion === 'manual' ? 'fa-save' : 'fa-paper-plane'}`}></i>
                    </div>
                    <h4 className="empty-title">
                      {fileVersion === 'manual' ? 'Sin archivos guardados manualmente' : 'Sin archivos de envío'}
                    </h4>
                    <p className="empty-subtitle">
                      {fileVersion === 'manual' 
                        ? 'No hay archivos guardados con Ctrl+S durante el examen'
                        : 'No hay archivos guardados al momento de enviar el examen'
                      }
                    </p>
                    {fileVersion === 'manual' && submissionFiles.length > 0 && (
                      <button 
                        className="modern-btn modern-btn-success mt-3"
                        onClick={() => handleVersionChange('submission')}
                      >
                        <i className="fas fa-paper-plane me-2"></i>
                        <span className="btn-text">Ver archivos al enviar examen</span>
                      </button>
                    )}
                    {fileVersion === 'submission' && manualFiles.length > 0 && (
                      <button 
                        className="modern-btn modern-btn-primary mt-3"
                        onClick={() => handleVersionChange('manual')}
                      >
                        <i className="fas fa-save me-2"></i>
                        <span className="btn-text">Ver archivos guardados manualmente</span>
                      </button>
                    )}
                  </div>
                );
              })()}
              
              {/* Fallback al código antiguo si no hay archivos en ninguna versión */}
              {manualFiles.length === 0 && submissionFiles.length === 0 && attempt.codigoProgramacion && (
                <div className="code-solution mt-3">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Este examen se realizó con el sistema anterior. Solo se muestra el código final.
                  </div>
                  <div className="code-header mb-2">
                    <small className="text-muted">
                      <i className="fas fa-file-code me-1"></i>
                      Código Final (método anterior)
                    </small>
                  </div>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    margin: 0,
                    padding: '1.5rem',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    borderRadius: '0.5rem',
                    border: '1px solid #333',
                    overflow: 'auto',
                    maxHeight: '500px'
                  }}>
                    {attempt.codigoProgramacion}
                  </pre>
                </div>
              )}
              
              {manualFiles.length === 0 && submissionFiles.length === 0 && !attempt.codigoProgramacion && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-code"></i>
                  </div>
                  <h4 className="empty-title">Sin archivos</h4>
                  <p className="empty-subtitle">
                    No se encontraron archivos guardados para este intento
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="modern-card">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-info-circle me-2"></i>
                Información del Intento
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-calendar me-2 text-primary"></i>
                    <strong>Iniciado:</strong> {new Date(attempt.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-flag-checkered me-2 text-success"></i>
                    <strong>Finalizado:</strong> {attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleString() : 'En progreso'}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-lightbulb me-2 text-warning"></i>
                    <strong>Intellisense:</strong> {attempt.exam.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="info-item">
                    <i className="fas fa-check-circle me-2 text-info"></i>
                    <strong>Estado:</strong> 
                    <span className={`ms-2 badge ${attempt.estado === 'finalizado' ? 'bg-success' : 'bg-warning'}`}>
                      {attempt.estado === 'finalizado' ? 'Completado' : 'En progreso'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista para exámenes de múltiple choice */
        <>
          {/* Puntaje del examen */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-chart-bar me-2"></i>
                Tu Puntaje
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="text-center py-4">
                <div className="display-4 fw-bold mb-3" style={{
                  color: attempt.puntaje >= 70 ? '#198754' : attempt.puntaje >= 40 ? '#ffc107' : '#dc3545'
                }}>
                  {attempt.puntaje !== null && attempt.puntaje !== undefined 
                    ? `${attempt.puntaje.toFixed(1)}%` 
                    : 'Sin calificar'}
                </div>
                {attempt.puntaje !== null && attempt.puntaje !== undefined && (
                  <>
                    <div className="mb-3">
                      <span className={`badge ${
                        attempt.puntaje >= 70 ? 'bg-success' : 
                        attempt.puntaje >= 40 ? 'bg-warning text-dark' : 
                        'bg-danger'
                      } fs-6 px-4 py-2`}>
                        {attempt.puntaje >= 70 ? '✅ Aprobado' : 
                         attempt.puntaje >= 40 ? '⚠️ Regular' : 
                         '❌ Desaprobado'}
                      </span>
                    </div>
                    <p className="text-muted">
                      {(() => {
                        const totalPreguntas = attempt.exam.preguntas?.length || 0;
                        const correctas = Math.round((attempt.puntaje / 100) * totalPreguntas);
                        return `${correctas} de ${totalPreguntas} preguntas correctas`;
                      })()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Preguntas y respuestas */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-clipboard-list me-2"></i>
                Revisión de Respuestas
              </h3>
            </div>
            <div className="modern-card-body">
              {!attempt.exam.preguntas || attempt.exam.preguntas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
                <h4 className="empty-title">No hay preguntas</h4>
                <p className="empty-subtitle">
                  Este examen no tiene preguntas
                </p>
              </div>
            ) : (
              <div className="exam-results-questions-grid">
                {attempt.exam.preguntas.map((question, index) => (
                  <div key={index} className="exam-results-question-card">
                    <div className="exam-card fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                      <div className="exam-card-header">
                        <h5 className="exam-title">
                          <span className="badge badge-primary me-3">{index + 1}</span>
                          <span className="question-text">{question.texto || "Sin texto"}</span>
                        </h5>
                      </div>
                      <div className="exam-card-body">
                        <div className="exam-info">
                          <h6 className="mb-3">
                            <i className="fas fa-list-ul me-2"></i>
                            <span className="options-label">Opciones de respuesta:</span>
                          </h6>
                          <div className="exam-results-options-list">
                            {(() => {
                              const studentAnswer = attempt.respuestas?.[index];
                              
                              return question.opciones?.map((option, optionIndex) => {
                                const isCorrect = optionIndex === question.correcta;
                                const isStudentAnswer = studentAnswer === optionIndex;
                                const isWrongAnswer = isStudentAnswer && !isCorrect;
                              
                              return (
                                <div 
                                  key={optionIndex} 
                                  className={`exam-info-item ${
                                    isCorrect ? 'bg-success bg-opacity-10 border-success' : 
                                    isWrongAnswer ? 'bg-danger bg-opacity-10 border-danger' : 
                                    ''
                                  } rounded p-2 mb-2`}
                                  style={{
                                    border: isCorrect || isWrongAnswer ? '2px solid' : '1px solid #dee2e6'
                                  }}
                                >
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                      <i className={
                                        isCorrect ? "fas fa-check-circle me-2 text-success" : 
                                        isWrongAnswer ? "fas fa-times-circle me-2 text-danger" :
                                        "fas fa-circle me-2 text-muted"
                                      } 
                                         style={{fontSize: (isCorrect || isWrongAnswer) ? '14px' : '8px'}}></i>
                                      <span className={
                                        isCorrect ? "fw-bold text-success" : 
                                        isWrongAnswer ? "fw-bold text-danger" : ""
                                      }>
                                        {option || "Opción vacía"}
                                      </span>
                                    </div>
                                    <div>
                                      {isCorrect && (
                                        <span className="badge bg-success text-white ms-2">
                                          <i className="fas fa-check me-1"></i>
                                          Correcta
                                        </span>
                                      )}
                                      {isStudentAnswer && !isCorrect && (
                                        <span className="badge bg-danger text-white ms-2">
                                          <i className="fas fa-user me-1"></i>
                                          Tu respuesta
                                        </span>
                                      )}
                                      {isStudentAnswer && isCorrect && (
                                        <span className="badge bg-primary text-white ms-2">
                                          <i className="fas fa-user-check me-1"></i>
                                          Tu respuesta
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                              });
                            })()}
                            {(() => {
                              const studentAnswer = attempt.respuestas?.[index];
                              return studentAnswer === undefined && (
                                <div className="alert alert-warning mt-3 mb-0" role="alert">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  No respondiste esta pregunta
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Estilos adicionales para mejorar la experiencia */}
      <style>{`
        /* Scroll horizontal para pestañas */
        .file-tabs-scroll::-webkit-scrollbar {
          height: 4px;
        }
        
        .file-tabs-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .file-tabs-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        .file-tabs-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .file-navigation-row {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          
          .file-navigation-row .col-md-6 {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .file-content-pre {
            font-size: 0.8rem !important;
            padding: 1rem !important;
          }
          
          .file-selector-dropdown {
            width: 100% !important;
          }
          
          .version-selector .btn-group {
            width: 100%;
          }
          
          .version-selector .modern-btn {
            flex: 1;
            justify-content: center;
          }
        }
        
        @media (max-width: 576px) {
          .file-content-pre {
            font-size: 0.75rem !important;
            padding: 0.75rem !important;
          }
          
          .file-navigation-buttons {
            justify-content: center !important;
          }
          
          .file-navigation-buttons button {
            font-size: 0.75rem !important;
            padding: 0.4rem 0.6rem !important;
          }
          
          .file-tab-compact {
            min-width: 80px !important;
            font-size: 0.7rem !important;
            padding: 0.4rem 0.6rem !important;
          }
          
          .version-selector .modern-btn span:not(.badge) {
            display: none;
          }
          
          .version-selector .modern-btn i {
            margin: 0 !important;
          }
        }
        
        /* Estados de focus y hover mejorados */
        button:focus {
          outline: 2px solid var(--primary-color, #6366f1);
          outline-offset: -2px;
        }
        
        .file-tab-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(99, 102, 241, 0.15) !important;
        }
        
        .file-tab-button.active {
          transform: translateY(-1px);
        }
        
        /* Animaciones suaves */
        .file-navigation-container * {
          transition: all 0.2s ease;
        }
      `}</style>

    </div>
  );
};

export default ExamResults;