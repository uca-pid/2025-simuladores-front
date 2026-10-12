import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamView.css";
import Editor from '@monaco-editor/react';
import BackToMainButton from "../components/BackToMainButton";
import EnunciadoArchivoViewer from "../components/EnunciadoArchivoViewer";
import CsvDatasetViewer from "../components/CsvDatasetViewer";
import { useAuth } from "../contexts/AuthContext";
import { getExamById, getReferenceFiles } from "../services/api";
import { getTipoBadge } from "../utils/questionBadges";

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
  const [selectedPartIdx, setSelectedPartIdx] = useState(0);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await getExamById(examId);
        setExam(data);
        setError(null);

        // Si el usuario es el profesor del examen y tiene alguna parte de programación, cargar archivos de referencia
        const tieneParteProgramacion = data?.partes?.some(p => p.tipo === 'programming');
        if (data && tieneParteProgramacion && user && data.profesorId === user.userId) {
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

      {/* Selector de partes (si hay más de una) */}
      {(exam.partes || []).length > 1 && (
        <div className="d-flex align-items-center gap-2 flex-wrap mb-4">
          {exam.partes.map((parte, idx) => {
            const isSelected = selectedPartIdx === idx;
            return (
              <button
                key={parte.id || idx}
                type="button"
                onClick={() => setSelectedPartIdx(idx)}
                style={{
                  border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: isSelected ? 'rgba(30, 41, 85, 0.08)' : 'transparent',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  color: 'inherit',
                }}
              >
                <i className={`fas ${parte.tipo === 'programming' ? 'fa-code' : 'fa-question-circle'} me-2`}></i>
                Parte {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido del examen: solo la parte seleccionada */}
      {(exam.partes || []).filter((_, idx) => idx === selectedPartIdx).map((parte, _, arr) => {
        const parteIndex = selectedPartIdx;
        return (
      <div key={parte.id || parteIndex} className="mb-4">
        {parte.tipo === 'programming' ? (
        /* Vista para partes de programación */
        <div>
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-sliders-h me-2"></i>
                Configuración
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="row">
                <div className="col-md-6 mb-3 mb-md-0">
                  <div className="exam-info-item">
                    <i className="fas fa-code text-success me-2"></i>
                    <strong>Lenguaje:</strong>
                    <span className="ms-2 badge bg-success">
                      {parte.lenguajeProgramacion === 'python' ? 'Python' : parte.lenguajeProgramacion === 'c' ? 'C' : 'JavaScript'}
                    </span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="exam-info-item">
                    <i className="fas fa-lightbulb text-warning me-2"></i>
                    <strong>Intellisense:</strong>
                    <span className={`ms-2 badge ${parte.intellisenseHabilitado ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {parte.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Enunciado del problema */}
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-file-alt me-2"></i>
                Enunciado del Problema
              </h3>
            </div>
            <div className="modern-card-body">
              {parte.enunciadoTipo === 'archivo' && parte.enunciadoUrl ? (
                <EnunciadoArchivoViewer url={parte.enunciadoUrl} nombre={parte.enunciadoArchivoNombre} />
              ) : (
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
                    {parte.enunciadoProgramacion || 'No hay enunciado definido'}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Datasets CSV/TXT */}
          {Array.isArray(parte.datasetFiles) && parte.datasetFiles.length > 0 && (
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-table me-2"></i>
                  Datasets ({parte.datasetFiles.length})
                </h3>
              </div>
              <div className="modern-card-body">
                {parte.datasetFiles.map((f) => (
                  <div key={f.nombre} className="mb-3">
                    <CsvDatasetViewer url={f.url} nombre={f.nombre} standalone />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Código inicial */}
          {parte.codigoInicial && (
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
                    {parte.codigoInicial}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Test Cases estilo ExamResults (sin distinción público/privado) */}
          {parte.testCases && parte.testCases.length > 0 && (
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-vial me-2"></i>
                  Test Cases
                </h3>
              </div>
              <div className="modern-card-body">
                {parte.testCases.map((test, index) => (
                  <div
                    key={index}
                    className="card mb-3"
                    style={{
                      border: '1px solid #1E2955',
                      borderLeft: '4px solid #1E2955'
                    }}
                  >
                    <div
                      className="card-header d-flex justify-content-between align-items-center"
                      style={{
                        backgroundColor: 'rgba(30, 41, 85, 0.08)'
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '1.5rem', color: '#1E2955' }}>
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
        /* Vista para partes de múltiple choice */
        <div className="modern-card">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-question-circle me-2"></i>
              Preguntas de la Parte ({parte.preguntas?.length || 0})
            </h3>
          </div>
          <div className="modern-card-body">
            {!parte.preguntas || parte.preguntas.length === 0 ? (
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
                {parte.preguntas.map((p, i) => (
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
                              backgroundColor: getTipoBadge(p.tipo).color,
                              color: 'white',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px'
                            }}
                          >
                            <i className={`fas ${getTipoBadge(p.tipo).icon} me-1`}></i>
                            {getTipoBadge(p.tipo).label}
                          </span>
                        </div>
                      </div>
                      <div className="exam-card-body">
                        <div className="question-text">
                          <strong>{p.texto || "Sin texto"}</strong>
                        </div>
                        {p.imagenUrl && (
                          <div className="mb-3">
                            <img
                              src={p.imagenUrl}
                              alt={`Imagen de la pregunta ${i + 1}`}
                              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', border: '1px solid #dee2e6' }}
                            />
                          </div>
                        )}
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
                          ) : p.tipo === 'numeric' ? (
                            <div className="exam-info-item option-item">
                              <i className="fas fa-check-circle text-success"></i>
                              <span className="option-text fw-bold text-success">
                                Respuesta correcta: {p.opciones?.[0]} (tolerancia ±{p.opciones?.[1] ?? 0})
                              </span>
                            </div>
                          ) : p.tipo === 'short_answer' ? (
                            p.opciones?.map((o, j) => (
                              <div key={j} className="exam-info-item option-item">
                                <i className="fas fa-check-circle text-success"></i>
                                <span className="option-text fw-bold text-success">{o || "Respuesta vacía"}</span>
                              </div>
                            ))
                          ) : (
                            p.opciones?.map((o, j) => {
                              const esCorrecta = p.tipo === 'multiple_response'
                                ? (p.correctas || []).includes(j)
                                : j === p.correcta;
                              return (
                                <div key={j} className="exam-info-item option-item">
                                  <i className={esCorrecta ? "fas fa-check-circle text-success" : "fas fa-circle text-muted"}></i>
                                  <span className={`option-text ${esCorrecta ? "fw-bold text-success" : ""}`}>
                                    {o || "Opción vacía"}
                                    {esCorrecta && (
                                      <span className="correct-badge">
                                        Correcta
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })
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
      </div>
        );
      })}

      {/* Solución de Referencia - Solo visible para el profesor, y solo si la parte seleccionada es de programación */}
      {exam.partes?.[selectedPartIdx]?.tipo === 'programming' && user && exam.profesorId === user.userId && (
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
                    language={exam.partes?.find(p => p.tipo === 'programming')?.lenguajeProgramacion}
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





