import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamView.css";
import Editor from '@monaco-editor/react';
import BackToMainButton from "../components/BackToMainButton";
import { useAuth } from "../contexts/AuthContext";
import { getExamById, getReferenceFiles } from "../services/api";

const ExamView = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const examId = propExamId || routeExamId;
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [currentReferenceFile, setCurrentReferenceFile] = useState(null);
  const [loadingReferenceFiles, setLoadingReferenceFiles] = useState(false);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await getExamById(examId);
        setExam(data);
        setError(null);
        
        // Si el usuario es el profesor del examen y es de programación, cargar archivos de referencia
        if (data && data.tipo === 'programming' && user && data.profesorId === user.userId) {
          try {
            setLoadingReferenceFiles(true);
            const files = await getReferenceFiles(examId);
            if (files && files.length > 0) {
              setReferenceFiles(files);
              setCurrentReferenceFile(files[0].filename);
            }
          } catch (refError) {
            console.error('Error cargando archivos de referencia:', refError);
          } finally {
            setLoadingReferenceFiles(false);
          }
        }
      } catch (err) {
        console.error(err);
        setExam(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, user?.userId]);

  if (loading) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="container-fluid container-lg py-5 px-3 px-md-4">
        <div className="modern-card">
          <div className="modern-card-body text-center">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error || "Examen no encontrado."}
            </div>
            {propExamId && (
              <button className="modern-btn modern-btn-secondary mt-3" onClick={onBack}>
                <i className="fas fa-arrow-left me-2"></i>
                Volver
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid container-lg py-5 px-3 px-md-4">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-view-header">
            <div className="header-content-section">
              <h1 className="page-title mb-1">
                <i className="fas fa-file-alt me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">{exam.titulo || "Sin título"}</span>
              </h1>
              <p className="page-subtitle mb-0">Visualización detallada del examen</p>
            </div>
            <div className="header-button-section">
              {propExamId ? (
                <button className="modern-btn modern-btn-secondary modern-btn-sm" onClick={onBack}>
                  <i className="fas fa-arrow-left me-2"></i>
                  <span className="btn-text">Volver</span>
                </button>
              ) : (
               <BackToMainButton 
                customPath="/mis-examenes"
                customLabel={<><i className="fas fa-arrow-left me-2"></i>Volver a Mis Exámenes</>}
              />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información del tipo de examen */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-info-circle me-2"></i>
            Información del Examen
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="exam-info-item">
                <i className="fas fa-tag text-primary me-2"></i>
                <strong>Tipo:</strong> 
                <span className={`ms-2 badge ${exam.tipo === 'programming' ? 'bg-primary' : 'bg-secondary'}`}>
                  {exam.tipo === 'programming' ? 'Programación' : 'Múltiple Choice'}
                </span>
              </div>
            </div>
            {exam.tipo !== 'programming' && (
              <div className="col-md-6 mb-3">
                <div className="exam-info-item">
                  <i className="fas fa-random text-info me-2"></i>
                  <strong>Orden de preguntas:</strong> 
                  <span className={`ms-2 badge ${exam.ordenAleatorio ? 'bg-info' : 'bg-secondary'}`}>
                    {exam.ordenAleatorio ? 'Aleatorio' : 'Fijo'}
                  </span>
                </div>
              </div>
            )}
            {exam.tipo === 'programming' && (
              <>
                <div className="col-md-6 mb-3">
                  <div className="exam-info-item">
                    <i className="fas fa-code text-success me-2"></i>
                    <strong>Lenguaje:</strong> 
                    <span className="ms-2 badge bg-success">
                      {exam.lenguajeProgramacion === 'python' ? 'Python' : 'JavaScript'}
                    </span>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="exam-info-item">
                    <i className="fas fa-lightbulb text-warning me-2"></i>
                    <strong>Intellisense:</strong> 
                    <span className={`ms-2 badge ${exam.intellisenseHabilitado ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {exam.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenido del examen según el tipo */}
      {exam.tipo === 'programming' ? (
        /* Vista para exámenes de programación */
        <div>
          {/* Enunciado del problema */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-file-alt me-2"></i>
                Enunciado del Problema
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="programming-statement">
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '0.5rem',
                  border: '1px solid #dee2e6'
                }}>
                  {exam.enunciadoProgramacion || 'No hay enunciado definido'}
                </pre>
              </div>
            </div>
          </div>

          {/* Código inicial */}
          {exam.codigoInicial && (
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-code me-2"></i>
                  Código Inicial
                </h3>
              </div>
              <div className="modern-card-body">
                <div className="code-preview">
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    margin: 0,
                    padding: '1rem',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    borderRadius: '0.5rem',
                    border: '1px solid #333',
                    overflow: 'auto'
                  }}>
                    {exam.codigoInicial}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Test Cases estilo ExamResults (sin distinción público/privado) */}
          {exam.testCases && exam.testCases.length > 0 && (
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-vial me-2"></i>
                  Test Cases
                </h3>
              </div>
              <div className="modern-card-body">
                {exam.testCases.map((test, index) => (
                  <div
                    key={index}
                    className="card mb-3"
                    style={{
                      border: '1px solid #6366f1',
                      borderLeft: '4px solid #6366f1'
                    }}
                  >
                    <div
                      className="card-header d-flex justify-content-between align-items-center"
                      style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.08)'
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '1.5rem', color: '#6366f1' }}>
                          🧪
                        </span>
                        <strong>{test.description || `Test Case ${index + 1}`}</strong>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="fas fa-arrow-right me-1"></i>
                            <strong>Input:</strong>
                          </small>
                          <pre style={{
                            margin: 0,
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '0.375rem',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            border: '1px solid #dee2e6',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}>
                            {test.input || '(vacío)'}
                          </pre>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="fas fa-check-circle me-1"></i>
                            <strong>Output Esperado:</strong>
                          </small>
                          <pre style={{
                            margin: 0,
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '0.375rem',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            border: '1px solid #dee2e6',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}>
                            {test.expectedOutput || '(vacío)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Vista para exámenes de múltiple choice */
        <div className="modern-card">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-question-circle me-2"></i>
              Preguntas del Examen ({exam.preguntas?.length || 0})
            </h3>
          </div>
          <div className="modern-card-body">
            {!exam.preguntas || exam.preguntas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
                <h4 className="empty-title">No hay preguntas</h4>
                <p className="empty-subtitle">
                  Este examen no tiene preguntas agregadas aún
                </p>
              </div>
            ) : (
              <div className="exam-questions-grid">
                {exam.preguntas.map((p, i) => (
                  <div key={i} className="exam-question-card-wrapper">
                    <div className="exam-card fade-in-up" style={{animationDelay: `${i * 0.1}s`}}>
                      <div className="exam-card-header">
                        <div className="d-flex align-items-center gap-2">
                          <h5 className="exam-title mb-0">
                            Pregunta {i + 1}
                          </h5>
                          <span 
                            className="badge"
                            style={{
                              backgroundColor: p.tipo === 'true_false' ? '#28a745' : p.tipo === 'fill_in_blank' ? '#ffc107' : p.tipo === 'matching' ? '#9c27b0' : '#007bff',
                              color: 'white',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px'
                            }}
                          >
                            <i className={`fas ${p.tipo === 'true_false' ? 'fa-check-double' : p.tipo === 'fill_in_blank' ? 'fa-fill-drip' : p.tipo === 'matching' ? 'fa-arrows-alt-h' : 'fa-list-ul'} me-1`}></i>
                            {p.tipo === 'true_false' ? 'V/F' : p.tipo === 'fill_in_blank' ? 'Completar' : p.tipo === 'matching' ? 'Unir con Flechas' : 'Múltiple'}
                          </span>
                        </div>
                        <span className="exam-badge">
                          <i className="fas fa-check-circle"></i>
                          <span className="badge-text">{p.opciones?.length || 0} opciones</span>
                        </span>
                      </div>
                      <div className="exam-card-body">
                        <div className="question-text">
                          <strong>{p.texto || "Sin texto"}</strong>
                        </div>
                        <div className="exam-info">
                          {p.tipo === 'matching' ? (
                            p.opciones?.slice(0, p.correcta).map((concepto, j) => {
                              const respuesta = p.opciones[p.correcta + j];
                              return (
                                <div key={j} className="exam-info-item option-item d-flex align-items-center gap-2 mb-2">
                                  <span className="badge bg-primary" style={{ fontSize: '0.75rem', minWidth: '30px' }}>
                                    {j + 1}
                                  </span>
                                  <span style={{ fontSize: '0.9rem' }}>{concepto || "Concepto vacío"}</span>
                                  <i className="fas fa-arrow-right text-primary"></i>
                                  <span className="badge bg-success" style={{ fontSize: '0.75rem', minWidth: '30px' }}>
                                    {String.fromCharCode(65 + j)}
                                  </span>
                                  <span style={{ fontSize: '0.9rem' }}>{respuesta || "Respuesta vacía"}</span>
                                </div>
                              );
                            })
                          ) : p.tipo === 'fill_in_blank' ? (
                            <>
                              <div className="mb-2">
                                <small className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i>Respuestas correctas (en orden):</small>
                              </div>
                              {p.opciones?.slice(0, p.correcta).map((o, j) => (
                                <div key={j} className="exam-info-item option-item">
                                  <span className="badge bg-success me-2" style={{ fontSize: '0.7rem' }}>{j + 1}</span>
                                  <span className="option-text fw-bold text-success">
                                    {o || "Respuesta vacía"}
                                  </span>
                                </div>
                              ))}
                              {p.opciones?.length > p.correcta && (
                                <>
                                  <div className="mt-3 mb-2">
                                    <small className="text-danger fw-bold"><i className="fas fa-times-circle me-1"></i>Distractores:</small>
                                  </div>
                                  {p.opciones.slice(p.correcta).map((o, j) => (
                                    <div key={j} className="exam-info-item option-item">
                                      <i className="fas fa-times text-danger"></i>
                                      <span className="option-text">
                                        {o || "Opción vacía"}
                                      </span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </>
                          ) : (
                            p.opciones?.map((o, j) => (
                              <div key={j} className="exam-info-item option-item">
                                <i className={
                                  j === p.correcta 
                                    ? "fas fa-check-circle text-success" 
                                    : "fas fa-circle text-muted"
                                }></i>
                                <span className={`option-text ${j === p.correcta ? "fw-bold text-success" : ""}`}>
                                  {o || "Opción vacía"}
                                  {j === p.correcta && (
                                    <span className="correct-badge">
                                      Correcta
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solución de Referencia - Solo visible para el profesor */}
      {exam.tipo === 'programming' && user && exam.profesorId === user.userId && (
        <div className="modern-card mt-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-star me-2" style={{ color: '#ffd700' }}></i>
              Solución de Referencia
            </h3>
          </div>
          <div className="modern-card-body">
            {loadingReferenceFiles ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2 text-muted">Cargando archivos de referencia...</p>
              </div>
            ) : referenceFiles.length === 0 ? (
              <div className="alert alert-info mb-0">
                <i className="fas fa-info-circle me-2"></i>
                No hay archivos de solución de referencia guardados para este examen.
                Puedes agregarlos editando el examen.
              </div>
            ) : (
              <div>
                <div className="alert alert-success mb-3">
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>{referenceFiles.length} archivo(s) de referencia</strong>
                  <br />
                  <small>Esta solución es solo visible para ti y te permite validar tus test cases.</small>
                </div>
                
                <div style={{ 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: '#1e1e1e'
                }}>
                  {/* Tabs de archivos */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '8px 16px',
                    backgroundColor: '#2d2d30',
                    borderBottom: '1px solid #3e3e42',
                    color: '#cccccc',
                    flexWrap: 'wrap'
                  }}>
                    {referenceFiles.map((file) => (
                      <div
                        key={file.filename}
                        onClick={() => setCurrentReferenceFile(file.filename)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: currentReferenceFile === file.filename ? '#1e1e1e' : 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          border: currentReferenceFile === file.filename ? '1px solid #3e3e42' : '1px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (currentReferenceFile !== file.filename) {
                            e.currentTarget.style.backgroundColor = '#3e3e42';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentReferenceFile !== file.filename) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <i className="fas fa-file-code" style={{ 
                          color: currentReferenceFile === file.filename ? '#4ec9b0' : '#858585' 
                        }}></i>
                        <span>{file.filename}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Editor Monaco (read-only) */}
                  <Editor
                    height="400px"
                    language={exam.lenguajeProgramacion}
                    value={referenceFiles.find(f => f.filename === currentReferenceFile)?.content || ''}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      selectOnLineNumbers: true,
                      roundedSelection: false,
                      cursorStyle: 'line',
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      minimap: { enabled: true },
                      fontSize: 14,
                      lineNumbers: 'on',
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamView;





