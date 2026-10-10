// src/components/ExamPartBuilder.jsx
import React, { useState, useRef, useEffect, memo } from "react";
import Editor from '@monaco-editor/react';
import QuestionCreator from "./QuestionCreator";
import QuestionBankSelector from "./QuestionBankSelector";
import { testSolutionPreview, uploadEnunciado, uploadDataset } from "../services/api";
import { TIPO_BADGE, DIFICULTAD_BADGE } from "../utils/questionBadges";
import Modal from "./Modal";

const LANGUAGE_EXTENSIONS = { python: '.py', javascript: '.js', c: '.c' };
const getExtensionForLanguage = (lenguaje) => LANGUAGE_EXTENSIONS[lenguaje] || '.js';

// `part` / `onChange` lift this part's whole local state up into ExamCreator's
// `partes` array, so every setter below reads `part.<field>` and calls
// `onChange({ ...part, <field>: value })` instead of owning local state.
const ExamPartBuilderComponent = ({ part, onChange, isPublishing, showModal, partLabel, ordenAleatorio, onOrdenAleatorioChange }) => {
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [showNewReferenceFileModal, setShowNewReferenceFileModal] = useState(false);
  const [newReferenceFileName, setNewReferenceFileName] = useState('');
  const [referenceFileToDelete, setReferenceFileToDelete] = useState('');
  const [showDeleteReferenceFileModal, setShowDeleteReferenceFileModal] = useState(false);
  const [isUploadingEnunciado, setIsUploadingEnunciado] = useState(false);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeProgTab, setActiveProgTab] = useState('config');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  // Bloquea el scroll de la página de fondo mientras cualquiera de los
  // modales de esta parte está abierto, para que la rueda del mouse solo
  // scrollee el contenido del modal.
  const anyModalOpen = showBankSelector || showNewReferenceFileModal || showDeleteReferenceFileModal || showQuestionModal;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [anyModalOpen]);

  const update = (patch) => onChange({ ...part, ...patch });

  // ---- Multiple choice ----
  const handleOpenNewQuestion = () => {
    setEditingQuestionIndex(null);
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (index) => {
    setEditingQuestionIndex(index);
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setEditingQuestionIndex(null);
  };

  const handleSaveQuestion = (preguntaData) => {
    if (editingQuestionIndex != null) {
      update({ preguntas: part.preguntas.map((p, i) => i === editingQuestionIndex ? preguntaData : p) });
    } else {
      update({ preguntas: [...part.preguntas, preguntaData] });
    }
    handleCloseQuestionModal();
  };

  const handleAddQuestionsFromBank = (selectedQuestions) => {
    update({ preguntas: [...part.preguntas, ...selectedQuestions] });
  };

  const handleRemoveQuestion = (index) => {
    update({ preguntas: part.preguntas.filter((_, i) => i !== index) });
  };

  const handleMoveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= part.preguntas.length) return;
    const nuevasPreguntas = [...part.preguntas];
    [nuevasPreguntas[index], nuevasPreguntas[newIndex]] = [nuevasPreguntas[newIndex], nuevasPreguntas[index]];
    update({ preguntas: nuevasPreguntas });
  };

  const handleChangeQuestionPoints = (index, valorStr) => {
    const valor = valorStr === '' ? '' : Math.max(0, parseFloat(valorStr) || 0);
    update({ preguntas: part.preguntas.map((p, i) => i === index ? { ...p, puntos: valor } : p) });
  };

  const handleChangeQuestionDificultad = (index, dificultad) => {
    update({ preguntas: part.preguntas.map((p, i) => i === index ? { ...p, dificultad } : p) });
  };

  const handleTogglePuntajePersonalizado = (activo) => {
    update({
      puntajePersonalizado: activo,
      preguntas: activo ? part.preguntas : part.preguntas.map(p => ({ ...p, puntos: 1 })),
    });
  };

  // ---- Programming: enunciado / dataset ----
  const handleDatasetArchivoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingDataset(true);
    try {
      let acc = part.datasetFiles;
      for (const file of files) {
        const { url, nombre } = await uploadDataset(file);
        acc = [...acc, { url, nombre }];
        update({ datasetFiles: acc });
      }
    } catch (err) {
      console.error(err);
      showModal('error', 'Error al subir el archivo', err.message || 'No se pudo subir el archivo', null, false);
    } finally {
      setIsUploadingDataset(false);
      e.target.value = '';
    }
  };

  const handleRemoveDatasetFile = (nombre) => {
    update({ datasetFiles: part.datasetFiles.filter(f => f.nombre !== nombre) });
  };

  const handleEnunciadoArchivoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEnunciado(true);
    try {
      const { url, nombre } = await uploadEnunciado(file);
      update({ enunciadoUrl: url, enunciadoArchivoNombre: nombre });
    } catch (err) {
      console.error(err);
      showModal('error', 'Error al subir el archivo', err.message || 'No se pudo subir el archivo de consigna', null, false);
    } finally {
      setIsUploadingEnunciado(false);
      e.target.value = '';
    }
  };

  // ---- Reference files (multi-file) ----
  const handleAddReferenceFile = () => {
    if (!newReferenceFileName.trim()) {
      showModal('error', 'Error', 'Por favor ingresa un nombre de archivo', null, false);
      return;
    }

    const extension = getExtensionForLanguage(part.lenguajeProgramacion);
    let filename = newReferenceFileName.trim();

    if (!filename.endsWith(extension)) {
      filename += extension;
    }

    if (part.referenceFiles.some(f => f.filename === filename)) {
      showModal('error', 'Error', 'Ya existe un archivo con ese nombre', null, false);
      return;
    }

    update({
      referenceFiles: [...part.referenceFiles, { filename, content: '' }],
      currentReferenceFile: filename
    });
    setNewReferenceFileName('');
    setShowNewReferenceFileModal(false);
  };

  const handleDeleteReferenceFile = () => {
    if (part.referenceFiles.length === 1) {
      showModal('error', 'Error', 'Debe haber al menos un archivo', null, false);
      return;
    }

    const updatedFiles = part.referenceFiles.filter(f => f.filename !== referenceFileToDelete);
    const patch = { referenceFiles: updatedFiles };
    if (part.currentReferenceFile === referenceFileToDelete) {
      patch.currentReferenceFile = updatedFiles[0].filename;
    }
    update(patch);

    setShowDeleteReferenceFileModal(false);
    setReferenceFileToDelete('');
  };

  const handleReferenceFileContentChange = (filename, content) => {
    update({
      referenceFiles: part.referenceFiles.map(f =>
        f.filename === filename ? { ...f, content } : f
      )
    });
  };

  // ---- Código inicial: marcar selección como solo lectura ----
  const codigoInicialEditorRef = useRef(null);
  const [hasCodigoSelection, setHasCodigoSelection] = useState(false);
  const handleCodigoInicialMount = (editor) => {
    codigoInicialEditorRef.current = editor;
    editor.onDidChangeCursorSelection((e) => {
      setHasCodigoSelection(!e.selection.isEmpty());
    });
  };
  const handleMarkReadOnly = () => {
    const editor = codigoInicialEditorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return;

    const selected = editor.getModel().getValueInRange(selection);
    const commentChar = part.lenguajeProgramacion === 'python' ? '#' : '//';
    const wrapped = `${commentChar} SOLO LECTURA\n${selected}\n${commentChar} FIN SOLO LECTURA`;

    editor.executeEdits('mark-readonly', [{ range: selection, text: wrapped }]);
    editor.focus();
    setHasCodigoSelection(false);
  };

  // ---- Test cases ----
  const handleAddTestCase = () => {
    update({ testCases: [...part.testCases, { description: "", input: "", expectedOutput: "" }] });
  };

  const handleRemoveTestCase = (index) => {
    if (part.testCases.length > 1) {
      update({ testCases: part.testCases.filter((_, i) => i !== index) });
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...part.testCases];
    updatedTestCases[index][field] = value;
    update({ testCases: updatedTestCases });
  };

  // ---- Ejecutar tests contra la solución de referencia ----
  const handleRunTestsReference = async () => {
    const currentFile = part.referenceFiles.find(f => f.filename === part.currentReferenceFile);
    if (!currentFile || !currentFile.content.trim()) {
      showModal('error', 'Error', 'Debes ingresar código en el archivo actual para probar', null, false);
      return;
    }

    if (part.testCases.length === 0) {
      showModal('error', 'Error', 'No hay test cases configurados', null, false);
      return;
    }

    const invalidTests = part.testCases.filter(tc => !tc.expectedOutput || !tc.expectedOutput.trim());
    if (invalidTests.length > 0) {
      showModal(
        'error',
        'Error de Validación',
        `Hay ${invalidTests.length} test case(s) sin output esperado. Por favor completa todos los test cases antes de ejecutar.`,
        null,
        false
      );
      return;
    }

    setIsRunningTests(true);

    try {
      const validTestCases = part.testCases.filter(tc => tc.expectedOutput && tc.expectedOutput.trim());
      const mainFile = part.referenceFiles.find(f => f.filename === part.currentReferenceFile) || part.referenceFiles[0];
      const results = await testSolutionPreview(mainFile.content, part.lenguajeProgramacion, validTestCases);
      update({ testResults: results, showTestPanel: true });
    } catch (err) {
      console.error("Error ejecutando tests:", err);
      showModal('error', 'Error', err.message || "Error al ejecutar tests", null, false);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (part.tipo === "multiple_choice") {
    const conteoPorDificultad = { facil: 0, media: 0, dificil: 0 };
    part.preguntas.forEach(p => { conteoPorDificultad[p.dificultad || 'media']++; });
    const modoSeleccion = part.cantidadPreguntas != null
      ? 'aleatorio'
      : (part.cantidadFaciles != null || part.cantidadMedias != null || part.cantidadDificiles != null)
        ? 'dificultad'
        : 'todas';

    const setCantidad = (nivel, valorStr) => {
      const valor = valorStr === '' ? 0 : Math.max(0, parseInt(valorStr, 10) || 0);
      update({ [nivel]: valor });
    };

    const totalPuntosPool = part.preguntas.reduce((acc, p) => acc + (p.puntos ?? 1), 0);

    // Rango de puntos que puede recibir un alumno al elegir `cantidad` preguntas
    // al azar de una lista: el mínimo toma las de menor puntaje, el máximo las de mayor.
    const rangoPuntosAlAzar = (preguntas, cantidad) => {
      const puntos = preguntas.map(p => p.puntos ?? 1).sort((a, b) => a - b);
      const n = Math.min(cantidad, puntos.length);
      const min = puntos.slice(0, n).reduce((acc, p) => acc + p, 0);
      const max = puntos.slice(puntos.length - n).reduce((acc, p) => acc + p, 0);
      return { min, max };
    };

    const preguntasPorDificultad = { facil: [], media: [], dificil: [] };
    part.preguntas.forEach(p => { preguntasPorDificultad[p.dificultad || 'media'].push(p); });

    const configuracionPreguntasCard =
        part.preguntas.length > 0 && (
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-sliders-h me-2"></i>
                Configuración de preguntas
              </h3>
              <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                Definí qué preguntas recibe cada alumno y en qué orden las verá.
              </p>
            </div>
            <div className="modern-card-body">
              <h5 className="mb-3">Preguntas que recibirá cada alumno</h5>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`questionSelection-${part.localId}`}
                  id={`allQuestions-${part.localId}`}
                  checked={modoSeleccion === 'todas'}
                  onChange={() => update({ cantidadPreguntas: null, cantidadFaciles: null, cantidadMedias: null, cantidadDificiles: null })}
                />
                <label className="form-check-label" htmlFor={`allQuestions-${part.localId}`}>
                  <strong>Usar todas las preguntas agregadas</strong>
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`questionSelection-${part.localId}`}
                  id={`randomQuestions-${part.localId}`}
                  checked={modoSeleccion === 'aleatorio'}
                  onChange={() => update({ cantidadPreguntas: Math.min(1, part.preguntas.length), cantidadFaciles: null, cantidadMedias: null, cantidadDificiles: null })}
                />
                <label className="form-check-label" htmlFor={`randomQuestions-${part.localId}`}>
                  <strong>Usar una cantidad de preguntas al azar</strong>
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`questionSelection-${part.localId}`}
                  id={`distributedQuestions-${part.localId}`}
                  checked={modoSeleccion === 'dificultad'}
                  onChange={() => update({ cantidadPreguntas: null, cantidadFaciles: 0, cantidadMedias: 0, cantidadDificiles: 0 })}
                />
                <label className="form-check-label" htmlFor={`distributedQuestions-${part.localId}`}>
                  <strong>Usar una cantidad de preguntas distribuida por dificultad</strong>
                </label>
              </div>

              {modoSeleccion === 'todas' ? (
                <div className="alert alert-light border mb-4">
                  <i className="fas fa-info-circle me-2"></i>
                  Hay <strong>{part.preguntas.length}</strong> preguntas disponibles y cada alumno recibirá todas
                  {part.puntajePersonalizado && (
                    <>{' '}(<strong>{totalPuntosPool} pt{totalPuntosPool !== 1 ? 's' : ''}</strong>{' '}en total)</>
                  )}.
                </div>
              ) : modoSeleccion === 'aleatorio' ? (
                <div className="mb-4">
                  <label className="form-label" htmlFor={`randomQuestionCount-${part.localId}`}>
                    <strong>Cantidad por alumno</strong>
                  </label>
                  <input
                    id={`randomQuestionCount-${part.localId}`}
                    type="number"
                    min="1"
                    max={part.preguntas.length}
                    className="form-control"
                    value={part.cantidadPreguntas ?? 1}
                    onChange={(e) => update({ cantidadPreguntas: Math.max(1, Math.min(part.preguntas.length, parseInt(e.target.value, 10) || 1)) })}
                  />
                  <small className="form-text text-muted">Disponibles: {part.preguntas.length}. Todos recibirán la misma cantidad, con preguntas elegidas al azar.</small>
                  {part.puntajePersonalizado && (() => {
                    const { min, max } = rangoPuntosAlAzar(part.preguntas, part.cantidadPreguntas ?? 1);
                    return (
                      <small className="form-text text-muted d-block">
                        Puntaje por alumno: {min === max ? <strong>{min} pts</strong> : <><strong>{min}</strong> a <strong>{max} pts</strong></>} (según qué preguntas le toquen).
                      </small>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <div className="alert alert-info mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    Todos los alumnos recibirán la misma cantidad por dificultad, pero las preguntas concretas pueden ser diferentes.
                  </div>
                  <div className="row g-3 mb-4">
                    {[
                      { key: 'cantidadFaciles', nivel: 'facil', label: 'Fáciles' },
                      { key: 'cantidadMedias', nivel: 'media', label: 'Medias' },
                      { key: 'cantidadDificiles', nivel: 'dificil', label: 'Difíciles' },
                    ].map(({ key, nivel, label }) => (
                      <div className="col-md-4" key={key}>
                        <label className="form-label d-flex align-items-center gap-2" htmlFor={`${key}-${part.localId}`}>
                          <span className="badge" style={{ backgroundColor: DIFICULTAD_BADGE[nivel].color, color: 'white' }}>
                            {label}
                          </span>
                          <span>por alumno</span>
                        </label>
                        <input
                          id={`${key}-${part.localId}`}
                          type="number"
                          min="0"
                          max={conteoPorDificultad[nivel]}
                          className={`form-control ${(part[key] || 0) > conteoPorDificultad[nivel] ? 'is-invalid' : ''}`}
                          value={part[key] ?? 0}
                          onChange={(e) => setCantidad(key, e.target.value)}
                        />
                        <small className="form-text text-muted">Disponibles: {conteoPorDificultad[nivel]}</small>
                        {(part[key] || 0) > conteoPorDificultad[nivel] && (
                          <div className="invalid-feedback d-block">No puede superar las disponibles.</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const rangoFaciles = rangoPuntosAlAzar(preguntasPorDificultad.facil, part.cantidadFaciles || 0);
                    const rangoMedias = rangoPuntosAlAzar(preguntasPorDificultad.media, part.cantidadMedias || 0);
                    const rangoDificiles = rangoPuntosAlAzar(preguntasPorDificultad.dificil, part.cantidadDificiles || 0);
                    const min = rangoFaciles.min + rangoMedias.min + rangoDificiles.min;
                    const max = rangoFaciles.max + rangoMedias.max + rangoDificiles.max;
                    return (
                      <div className="alert alert-light border mb-4">
                        <strong>Total por alumno:</strong>{' '}
                        {(part.cantidadFaciles || 0) + (part.cantidadMedias || 0) + (part.cantidadDificiles || 0)} preguntas
                        {part.puntajePersonalizado && (
                          <>{' '}— {min === max ? <strong>{min} pts</strong> : <><strong>{min}</strong> a <strong>{max} pts</strong></>}</>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

            </div>
          </div>
        );

    return (
      <>
            <div className="modern-card mb-4">
              <div className="modern-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h3 className="modern-card-title mb-0">
                  <i className="fas fa-clipboard-list me-2"></i>
                  Preguntas Agregadas ({part.preguntas.length})
                  {part.preguntas.length > 0 && part.puntajePersonalizado && (
                    <span className="badge bg-secondary ms-2" style={{ fontWeight: 'normal' }}>
                      {totalPuntosPool} puntos totales
                    </span>
                  )}
                </h3>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="modern-btn modern-btn-secondary modern-btn-sm"
                    onClick={() => setShowBankSelector(true)}
                  >
                    <i className="fas fa-database me-2"></i>
                    <span className="button-text">Agregar Pregunta del Banco</span>
                  </button>
                  <button
                    type="button"
                    className="modern-btn modern-btn-primary modern-btn-sm"
                    onClick={handleOpenNewQuestion}
                  >
                    <i className="fas fa-plus me-2"></i>
                    <span className="button-text">Agregar Pregunta</span>
                  </button>
                </div>
              </div>
              <div className="modern-card-body">
                {part.preguntas.length > 0 && (
                  <div className="d-flex flex-wrap gap-4 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id={`puntajePersonalizado-${part.localId}`}
                        checked={!!part.puntajePersonalizado}
                        onChange={(e) => handleTogglePuntajePersonalizado(e.target.checked)}
                        style={{
                          width: '2.5rem',
                          height: '1.2rem',
                          backgroundColor: part.puntajePersonalizado ? 'var(--primary-color)' : '#fff',
                          borderColor: part.puntajePersonalizado ? 'var(--primary-color)' : '#6c757d'
                        }}
                      />
                      <label className="form-check-label ms-2" htmlFor={`puntajePersonalizado-${part.localId}`}>
                        <strong>Puntaje personalizado</strong>
                      </label>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id={`randomOrder-${part.localId}`}
                        checked={ordenAleatorio}
                        onChange={(e) => onOrdenAleatorioChange?.(e.target.checked)}
                        style={{
                          width: '2.5rem',
                          height: '1.2rem',
                          backgroundColor: ordenAleatorio ? 'var(--primary-color)' : '#fff',
                          borderColor: ordenAleatorio ? 'var(--primary-color)' : '#6c757d'
                        }}
                      />
                      <label className="form-check-label ms-2" htmlFor={`randomOrder-${part.localId}`}>
                        <strong>Orden aleatorio para cada alumno</strong>
                      </label>
                    </div>
                  </div>
                )}
                {part.preguntas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <i className="fas fa-question-circle"></i>
                    </div>
                    <h4 className="empty-title">No hay preguntas aún</h4>
                  </div>
            ) : (
              <div className="exam-creator-questions-grid">
                {part.preguntas.map((p, idx) => (
                  <div key={idx} className="exam-creator-question-card">
                    <div className="exam-card">
                      <div className="exam-card-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <h5 className="exam-title mb-0">
                            <span className="question-number">Pregunta {idx + 1}</span>
                          </h5>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: (TIPO_BADGE[p.tipo] || TIPO_BADGE.multiple_choice).color,
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.7rem',
                              borderRadius: '4px'
                            }}
                          >
                            <i className={`fas ${(TIPO_BADGE[p.tipo] || TIPO_BADGE.multiple_choice).icon} me-1`}></i>
                            {(TIPO_BADGE[p.tipo] || TIPO_BADGE.multiple_choice).label}
                          </span>
                          {modoSeleccion === 'dificultad' && (
                            <select
                              className="form-select form-select-sm"
                              style={{
                                width: 'auto',
                                padding: '0.15rem 1.75rem 0.15rem 0.5rem',
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                backgroundColor: (DIFICULTAD_BADGE[p.dificultad] || DIFICULTAD_BADGE.media).color,
                                color: 'white',
                              }}
                              value={p.dificultad || 'media'}
                              disabled={isPublishing}
                              onChange={(e) => handleChangeQuestionDificultad(idx, e.target.value)}
                              title="Dificultad de esta pregunta"
                            >
                              <option value="facil">Fácil</option>
                              <option value="media">Media</option>
                              <option value="dificil">Difícil</option>
                            </select>
                          )}
                          {part.puntajePersonalizado && (
                            <span className="d-flex align-items-center flex-wrap gap-1" title="Puntaje de esta pregunta">
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Vale</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                className="form-control form-control-sm"
                                style={{ width: '52px', padding: '0.15rem 0.3rem', fontSize: '0.8rem' }}
                                value={p.puntos ?? 1}
                                disabled={isPublishing}
                                onChange={(e) => handleChangeQuestionPoints(idx, e.target.value)}
                              />
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                puntos ({totalPuntosPool > 0 ? (((p.puntos ?? 1) / totalPuntosPool) * 100).toFixed(1) : '0.0'}%)
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center flex-wrap gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleMoveQuestion(idx, -1)}
                            disabled={isPublishing || idx === 0}
                            title="Mover arriba"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <i className="fas fa-arrow-up"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleMoveQuestion(idx, 1)}
                            disabled={isPublishing || idx === part.preguntas.length - 1}
                            title="Mover abajo"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <i className="fas fa-arrow-down"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleOpenEditQuestion(idx)}
                            disabled={isPublishing}
                            title="Editar pregunta"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <i className="fas fa-pen"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveQuestion(idx)}
                            disabled={isPublishing}
                            title="Eliminar pregunta"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <div className="exam-card-body">
                        <div className="question-text mb-3">
                          <strong>{p.texto}</strong>
                        </div>
                        {p.imagenUrl && (
                          <div className="mb-3">
                            <img src={p.imagenUrl} alt="" style={{ maxHeight: '150px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                          </div>
                        )}
                        <div className="exam-info">
                          {p.tipo === 'matching' ? (
                            p.opciones.slice(0, p.correcta).map((concepto, i) => {
                              const respuesta = p.opciones[p.correcta + i];
                              return (
                                <div key={i} className="exam-info-item d-flex align-items-center gap-2 mb-2">
                                  <span className="badge bg-primary" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                    {i + 1}
                                  </span>
                                  <span style={{ fontSize: '0.85rem' }}>{concepto}</span>
                                  <i className="fas fa-arrow-right text-primary" style={{ fontSize: '0.7rem' }}></i>
                                  <span className="badge bg-success" style={{ fontSize: '0.7rem', minWidth: '25px' }}>
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  <span style={{ fontSize: '0.85rem' }}>{respuesta}</span>
                                </div>
                              );
                            })
                          ) : p.tipo === 'fill_in_blank' ? (
                            <>
                              <div className="mb-2">
                                <small className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i>Respuestas correctas (en orden):</small>
                              </div>
                              {p.opciones.slice(0, p.correcta).map((o, i) => (
                                <div key={i} className="exam-info-item">
                                  <span className="badge bg-success me-2" style={{ fontSize: '0.7rem' }}>{i + 1}</span>
                                  <span className="fw-bold text-success">{o}</span>
                                </div>
                              ))}
                              {p.opciones.length > p.correcta && (
                                <>
                                  <div className="mt-2 mb-2">
                                    <small className="text-danger fw-bold"><i className="fas fa-times-circle me-1"></i>Distractores:</small>
                                  </div>
                                  {p.opciones.slice(p.correcta).map((o, i) => (
                                    <div key={i} className="exam-info-item">
                                      <i className="fas fa-times text-danger"></i>
                                      <span>{o}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </>
                          ) : (
                            p.opciones.map((o, i) => (
                              <div key={i} className="exam-info-item">
                                <i className={i === p.correcta ? "fas fa-check-circle text-success" : "fas fa-circle text-muted"}></i>
                                <span className={i === p.correcta ? "fw-bold text-success" : ""}>{o}</span>
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

        {configuracionPreguntasCard}

        <QuestionBankSelector
          show={showBankSelector}
          onClose={() => setShowBankSelector(false)}
          onSelectQuestions={handleAddQuestionsFromBank}
        />

        {showQuestionModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseQuestionModal}>
            <div
              className="modal-dialog modal-lg modal-dialog-scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'transparent' }}>
                <div className="modal-body p-0">
                  <QuestionCreator
                    editingQuestion={editingQuestionIndex != null ? part.preguntas[editingQuestionIndex] : null}
                    onSave={handleSaveQuestion}
                    onCancel={handleCloseQuestionModal}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---- Programming part ----
  const progTabs = [
    { key: 'config', label: 'Configuración', icon: 'fa-code' },
    { key: 'tests', label: 'Casos de Prueba', icon: 'fa-vial' },
    { key: 'solucion', label: 'Solución de Referencia', icon: 'fa-check-double' },
  ];

  return (
    <>
      <ul className="nav nav-tabs mb-4">
        {progTabs.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button
              type="button"
              className={`nav-link ${activeProgTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveProgTab(tab.key)}
            >
              <i className={`fas ${tab.icon} me-2`}></i>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {activeProgTab === 'config' && (
      <>
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-code me-2"></i>
            Configuración de Programación — {partLabel}
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-terminal text-muted"></i>
                Lenguaje de Programación
              </label>
              <select
                className="form-select"
                value={part.lenguajeProgramacion}
                onChange={(e) => update({ lenguajeProgramacion: e.target.value })}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-lightbulb text-muted"></i>
                Intellisense y Autocompletado
              </label>
              <div className="form-check form-switch mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`intellisenseSwitch-${part.localId}`}
                  checked={part.intellisenseHabilitado}
                  onChange={(e) => update({ intellisenseHabilitado: e.target.checked })}
                  disabled={isPublishing}
                />
                <label className="form-check-label" htmlFor={`intellisenseSwitch-${part.localId}`}>
                  {part.intellisenseHabilitado ? "Habilitado" : "Deshabilitado"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-file-alt me-2"></i>
            Consigna y Recursos — {partLabel}
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2 mb-0">
              <i className="fas fa-file-alt text-muted"></i>
              Consigna del Problema
            </label>
            <small className="text-muted d-block mb-2">Lo que el alumno lee al empezar este ejercicio.</small>
            <div className="d-flex gap-3 mb-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`enunciadoTipo-${part.localId}`}
                  id={`enunciadoTipoTexto-${part.localId}`}
                  checked={part.enunciadoTipo === "texto"}
                  onChange={() => update({ enunciadoTipo: "texto" })}
                  disabled={isPublishing}
                />
                <label className="form-check-label" htmlFor={`enunciadoTipoTexto-${part.localId}`}>
                  Escribir texto
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`enunciadoTipo-${part.localId}`}
                  id={`enunciadoTipoArchivo-${part.localId}`}
                  checked={part.enunciadoTipo === "archivo"}
                  onChange={() => update({ enunciadoTipo: "archivo" })}
                  disabled={isPublishing}
                />
                <label className="form-check-label" htmlFor={`enunciadoTipoArchivo-${part.localId}`}>
                  Adjuntar archivo (PDF/DOCX)
                </label>
              </div>
            </div>

            {part.enunciadoTipo === "texto" ? (
              <textarea
                className="form-control"
                rows="6"
                placeholder="Describe detalladamente el problema que deben resolver los estudiantes..."
                value={part.enunciadoProgramacion}
                onChange={(e) => update({ enunciadoProgramacion: e.target.value })}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'monospace'
                }}
              />
            ) : (
              <div>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.docx"
                  onChange={handleEnunciadoArchivoChange}
                  disabled={isPublishing || isUploadingEnunciado}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                {isUploadingEnunciado && (
                  <small className="text-muted d-block mt-2">
                    <i className="fas fa-spinner fa-spin me-1"></i>
                    Subiendo archivo...
                  </small>
                )}
                {!isUploadingEnunciado && part.enunciadoArchivoNombre && (
                  <small className="text-success d-block mt-2">
                    <i className="fas fa-check-circle me-1"></i>
                    Archivo cargado: {part.enunciadoArchivoNombre}
                  </small>
                )}
                <small className="text-muted d-block mt-1">
                  Se mostrará embebido en la consigna del alumno. Tamaño máximo: 10MB.
                </small>
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2 mb-0">
              <i className="fas fa-table text-muted"></i>
              Datasets CSV/TXT (Opcional)
            </label>
            <small className="text-muted d-block mb-2">Archivos que el código del alumno puede abrir por nombre (no son la consigna).</small>
            <input
              type="file"
              className="form-control"
              accept=".csv,.txt"
              multiple
              onChange={handleDatasetArchivoChange}
              disabled={isPublishing || isUploadingDataset}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            {isUploadingDataset && (
              <small className="text-muted d-block mt-2">
                <i className="fas fa-spinner fa-spin me-1"></i>
                Subiendo archivo...
              </small>
            )}
            {part.datasetFiles.length > 0 && (
              <ul className="list-unstyled mt-2 mb-0">
                {part.datasetFiles.map(f => (
                  <li key={f.nombre} className="d-flex align-items-center gap-2 text-success mb-1">
                    <i className="fas fa-check-circle"></i>
                    <span>{f.nombre}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => handleRemoveDatasetFile(f.nombre)}
                      disabled={isPublishing}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <small className="text-muted d-block mt-1">
              Podés subir varios archivos. El alumno podrá abrirlos desde su código con <code>open("nombre_exacto.csv")</code> (Python)
              o el método equivalente en JavaScript, usando el mismo nombre con el que se subieron. También se muestran como tabla en la consigna. Tamaño máximo: 5MB por archivo.
            </small>
          </div>

          <div className="mb-0">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label d-flex align-items-center gap-2 mb-0">
                <i className="fas fa-code text-muted"></i>
                Código Inicial (Opcional)
              </label>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleMarkReadOnly}
                disabled={isPublishing || !hasCodigoSelection}
                title={hasCodigoSelection ? undefined : "Seleccioná primero el código que querés bloquear"}
              >
                <i className="fas fa-lock me-1"></i>
                Marcar como solo lectura
              </button>
            </div>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <Editor
                height="220px"
                language={part.lenguajeProgramacion}
                value={part.codigoInicial}
                onChange={(value) => update({ codigoInicial: value || '' })}
                onMount={handleCodigoInicialMount}
                theme="vs-dark"
                options={{
                  readOnly: isPublishing,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                }}
              />
            </div>
            <small className="form-text text-muted">
              Código que aparecerá precargado en el editor del estudiante.
              Para bloquear una parte y que el alumno no pueda modificarla ni borrarla,
              seleccionala y apretá "Marcar como solo lectura". También podés escribir el marcador
              a mano, encerrando el bloque entre{' '}
              <code>{part.lenguajeProgramacion === 'python' ? '# SOLO LECTURA' : '// SOLO LECTURA'}</code> y{' '}
              <code>{part.lenguajeProgramacion === 'python' ? '# FIN SOLO LECTURA' : '// FIN SOLO LECTURA'}</code>.
            </small>
          </div>
        </div>
      </div>
      </>
      )}

      {activeProgTab === 'tests' && (
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-vial me-2"></i>
            Casos de Prueba (Evaluación Automática)
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="alert alert-info mb-3">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Define los casos de prueba que se ejecutarán automáticamente.</strong>
            <ul className="mb-0 mt-2">
              <li>Los test cases NO son visibles para los estudiantes</li>
              <li>El puntaje se calcula como: <strong>(tests pasados / total tests) × 100</strong></li>
              <li>Ejemplo: 3 de 4 tests correctos = 75%</li>
            </ul>
          </div>

          {part.testCases.map((testCase, index) => (
            <div key={index} className="card mb-3" style={{ border: '1px solid var(--border-color)' }}>
              <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                <strong>
                  <i className="fas fa-flask me-2"></i>
                  Caso de Prueba {index + 1}
                </strong>
                {part.testCases.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleRemoveTestCase(index)}
                    disabled={isPublishing}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Descripción del Test</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Suma de números positivos"
                    value={testCase.description}
                    onChange={(e) => handleTestCaseChange(index, 'description', e.target.value)}
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Input (una línea por entrada)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="2&#10;3"
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                      disabled={isPublishing}
                      style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                    <small className="form-text text-muted">
                      Deja vacío si el código no requiere input. Cada línea será una entrada separada.
                    </small>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Output Esperado</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="5"
                      value={testCase.expectedOutput}
                      onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                      disabled={isPublishing}
                      style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                    <small className="form-text text-muted">
                      Resultado exacto que debe producir el código
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="modern-btn modern-btn-secondary"
            onClick={handleAddTestCase}
            disabled={isPublishing}
          >
            <i className="fas fa-plus me-2"></i>
            Agregar Caso de Prueba
          </button>

          <div className="alert alert-success mt-3 mb-0">
            <i className="fas fa-calculator me-2"></i>
            <strong>Total: {part.testCases.length} caso{part.testCases.length !== 1 ? 's' : ''} de prueba</strong>
            <br/>
            <small>
              Cada test vale <strong>{part.testCases.length > 0 ? (100 / part.testCases.length).toFixed(1) : 0}%</strong> del puntaje final.
              El puntaje se calcula automáticamente.
            </small>
          </div>
        </div>
      </div>
      )}

      {activeProgTab === 'solucion' && (
        part.testCases.length === 0 ? (
          <div className="modern-card mb-4">
            <div className="modern-card-body text-center py-5 text-muted">
              <i className="fas fa-vial-circle-xmark mb-3" style={{ fontSize: '2rem' }}></i>
              <p className="mb-0">Agregá al menos un caso de prueba en la pestaña "Casos de Prueba" para poder probar tu solución acá.</p>
            </div>
          </div>
        ) : (
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-check-double me-2"></i>
              Validación de Casos de Prueba y Solución de Referencia
            </h3>
            <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
              Espacio privado para vos: el alumno nunca ve este código ni estos archivos.
            </p>
          </div>
          <div className="modern-card-body">
            <div className="alert alert-info mb-3">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Prueba tu solución antes de publicar</strong>
              <ul className="mb-0 mt-2">
                <li><strong>Ejecuta tests</strong> para verificar que funcionan correctamente</li>
                <li><strong>Guarda tu solución</strong> como referencia o prueba sin guardar</li>
                <li><strong>Múltiples archivos:</strong> Organiza tu código en varios archivos si lo necesitas</li>
              </ul>
            </div>

            <div className="tab-pane-custom fade show active">
              <div style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#1e1e1e'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 16px',
                      backgroundColor: '#2d2d30',
                      borderBottom: '1px solid #3e3e42',
                      color: '#cccccc',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {part.referenceFiles.map((file) => (
                          <div
                            key={file.filename}
                            onClick={() => !isPublishing && update({ currentReferenceFile: file.filename })}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              backgroundColor: part.currentReferenceFile === file.filename ? '#1e1e1e' : 'transparent',
                              borderRadius: '4px',
                              cursor: isPublishing ? 'not-allowed' : 'pointer',
                              opacity: isPublishing ? 0.6 : 1,
                              fontSize: '13px',
                              border: part.currentReferenceFile === file.filename ? '1px solid #3e3e42' : '1px solid transparent',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isPublishing && part.currentReferenceFile !== file.filename) {
                                e.currentTarget.style.backgroundColor = '#3e3e42';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isPublishing && part.currentReferenceFile !== file.filename) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <i className="fas fa-file-code" style={{
                              color: part.currentReferenceFile === file.filename ? '#4ec9b0' : '#858585'
                            }}></i>
                            <span>{file.filename}</span>
                            {part.referenceFiles.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReferenceFileToDelete(file.filename);
                                  setShowDeleteReferenceFileModal(true);
                                }}
                                disabled={isPublishing}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#858585',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  fontSize: '12px'
                                }}
                                title="Eliminar archivo"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setShowNewReferenceFileModal(true)}
                          disabled={isPublishing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid #3e3e42',
                            borderRadius: '4px',
                            color: '#cccccc',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3e3e42'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Nuevo archivo"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRunTestsReference();
                        }}
                        disabled={isRunningTests || isPublishing}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px'
                        }}
                      >
                        {isRunningTests ? (
                          <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            Ejecutando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-play"></i>
                            Ejecutar Tests
                          </>
                        )}
                      </button>
                    </div>

                    <Editor
                      height="500px"
                      language={part.lenguajeProgramacion}
                      value={part.referenceFiles.find(f => f.filename === part.currentReferenceFile)?.content || ''}
                      onChange={(value) => handleReferenceFileContentChange(part.currentReferenceFile, value || '')}
                      theme="vs-dark"
                      options={{
                        selectOnLineNumbers: true,
                        roundedSelection: false,
                        readOnly: isPublishing,
                        cursorStyle: 'line',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        tabSize: part.lenguajeProgramacion === 'python' ? 4 : 2,
                        quickSuggestions: part.intellisenseHabilitado,
                        suggestOnTriggerCharacters: part.intellisenseHabilitado,
                        parameterHints: { enabled: part.intellisenseHabilitado },
                        suggest: {
                          showMethods: part.intellisenseHabilitado,
                          showFunctions: part.intellisenseHabilitado,
                          showConstructors: part.intellisenseHabilitado,
                          showFields: part.intellisenseHabilitado,
                          showVariables: part.intellisenseHabilitado,
                          showClasses: part.intellisenseHabilitado,
                          showKeywords: part.intellisenseHabilitado
                        }
                      }}
                    />
                  </div>

                  <div className="mt-3 p-3" style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px solid #dee2e6'
                  }}>
                    <div className="mb-2">
                      <strong style={{ fontSize: '0.95rem', color: '#495057' }}>
                        <i className="fas fa-save me-2"></i>
                        Solución de Referencia
                      </strong>
                    </div>

                    <div
                      className="form-check p-3 mb-2"
                      style={{
                        backgroundColor: part.saveReferenceSolution ? 'rgba(40, 167, 69, 0.1)' : 'white',
                        borderRadius: '6px',
                        border: `2px solid ${part.saveReferenceSolution ? '#28a745' : '#dee2e6'}`,
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        opacity: isPublishing ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => !isPublishing && update({ saveReferenceSolution: true })}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name={`saveReferenceSolution-${part.localId}`}
                        id={`saveReferenceYes-${part.localId}`}
                        checked={part.saveReferenceSolution}
                        onChange={() => update({ saveReferenceSolution: true })}
                        disabled={isPublishing}
                        style={{ cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                      />
                      <label
                        className="form-check-label ms-2"
                        htmlFor={`saveReferenceYes-${part.localId}`}
                        style={{ cursor: 'pointer', width: '100%' }}
                      >
                        <div className="d-flex align-items-start">
                          <div>
                            <strong style={{
                              color: part.saveReferenceSolution ? '#28a745' : '#495057'
                            }}>
                              <i className="fas fa-check-circle me-2"></i>
                              Guardar esta solución
                            </strong>
                            <div style={{
                              fontSize: '0.875rem',
                              color: part.saveReferenceSolution ? '#28a745' : '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              Se guardará como solución de referencia
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div
                      className="form-check p-3"
                      style={{
                        backgroundColor: !part.saveReferenceSolution ? 'rgba(220, 53, 69, 0.08)' : 'white',
                        borderRadius: '6px',
                        border: `2px solid ${!part.saveReferenceSolution ? '#dc3545' : '#dee2e6'}`,
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        opacity: isPublishing ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => !isPublishing && update({ saveReferenceSolution: false })}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name={`saveReferenceSolution-${part.localId}`}
                        id={`saveReferenceNo-${part.localId}`}
                        checked={!part.saveReferenceSolution}
                        onChange={() => update({ saveReferenceSolution: false })}
                        disabled={isPublishing}
                        style={{ cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                      />
                      <label
                        className="form-check-label ms-2"
                        htmlFor={`saveReferenceNo-${part.localId}`}
                        style={{ cursor: 'pointer', width: '100%' }}
                      >
                        <div className="d-flex align-items-start">
                          <div>
                            <strong style={{
                              color: !part.saveReferenceSolution ? '#dc3545' : '#495057'
                            }}>
                              <i className="fas fa-times-circle me-2"></i>
                              No guardar esta solución
                            </strong>
                            <div style={{
                              fontSize: '0.875rem',
                              color: !part.saveReferenceSolution ? '#dc3545' : '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              Solo para probar el código sin guardarlo como referencia
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

            {part.showTestPanel && part.testResults && (
              <div className="mt-4">
                <h5 className="mb-3">
                  <i className="fas fa-chart-bar me-2"></i>
                  Resultados de la Ejecución
                </h5>

                <div className={`alert ${part.testResults.score === 100 ? 'alert-success' : part.testResults.score >= 50 ? 'alert-warning' : 'alert-danger'}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Puntaje: {part.testResults.score.toFixed(1)}%</strong>
                      <br />
                      <small>
                        {part.testResults.passedTests} de {part.testResults.totalTests} tests pasados
                      </small>
                    </div>
                    <div>
                      {part.testResults.score === 100 ? (
                        <i className="fas fa-check-circle fa-2x text-success"></i>
                      ) : (
                        <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
                      )}
                    </div>
                  </div>
                </div>

                {part.testResults.testResults.map((result, index) => (
                  <div key={index} className="card mb-2" style={{ border: `2px solid ${result.passed ? '#28a745' : '#dc3545'}` }}>
                    <div className="card-header d-flex justify-content-between align-items-center"
                         style={{ backgroundColor: result.passed ? '#d4edda' : '#f8d7da' }}>
                      <strong>
                        {result.passed ? (
                          <i className="fas fa-check-circle text-success me-2"></i>
                        ) : (
                          <i className="fas fa-times-circle text-danger me-2"></i>
                        )}
                        Test {index + 1}: {result.description || `Caso de Prueba ${index + 1}`}
                      </strong>
                      <span className="badge" style={{
                        backgroundColor: result.passed ? '#28a745' : '#dc3545',
                        color: 'white'
                      }}>
                        {result.passed ? 'PASÓ' : 'FALLÓ'}
                      </span>
                    </div>
                    <div className="card-body">
                      {result.input && (
                        <div className="mb-2">
                          <strong>Input:</strong>
                          <pre className="mb-0 p-2" style={{
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>{result.input}</pre>
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <strong>Output Esperado:</strong>
                          <pre className="mb-0 p-2" style={{
                            backgroundColor: '#e7f5e7',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            border: '1px solid #c3e6c3'
                          }}>{result.expectedOutput}</pre>
                        </div>
                        <div className="col-md-6 mb-2">
                          <strong>Output Obtenido:</strong>
                          <pre className="mb-0 p-2" style={{
                            backgroundColor: result.passed ? '#e7f5e7' : '#f8d7da',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            border: `1px solid ${result.passed ? '#c3e6c3' : '#f5c6cb'}`
                          }}>{result.actualOutput || '(sin output)'}</pre>
                        </div>
                      </div>
                      {result.error && (
                        <div className="mt-2">
                          <strong className="text-danger">Error:</strong>
                          <pre className="mb-0 p-2 text-danger" style={{
                            backgroundColor: '#fff3cd',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>{result.error}</pre>
                        </div>
                      )}
                      <small className="text-muted d-block mt-2">
                        Tiempo de ejecución: {result.executionTime}ms
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      )}

      <Modal
        show={showNewReferenceFileModal}
        onClose={() => {
          setShowNewReferenceFileModal(false);
          setNewReferenceFileName('');
        }}
        onConfirm={handleAddReferenceFile}
        title="Nuevo Archivo de Referencia"
        message="Nombre del archivo:"
        type="confirm"
        showCancel={true}
        confirmText="Crear Archivo"
        cancelText="Cancelar"
      >
        <input
          type="text"
          className="form-control"
          placeholder={`Ej: utils${getExtensionForLanguage(part.lenguajeProgramacion)}`}
          value={newReferenceFileName}
          onChange={(e) => setNewReferenceFileName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddReferenceFile();
            }
          }}
          autoFocus
        />
        <small className="text-muted mt-2 d-block">
          Se agregará automáticamente la extensión {getExtensionForLanguage(part.lenguajeProgramacion)} si no la incluyes
        </small>
      </Modal>

      <Modal
        show={showDeleteReferenceFileModal}
        onClose={() => {
          setShowDeleteReferenceFileModal(false);
          setReferenceFileToDelete('');
        }}
        onConfirm={handleDeleteReferenceFile}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que deseas eliminar el archivo "${referenceFileToDelete}"? Esta acción no se puede deshacer.`}
        type="error"
        showCancel={true}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </>
  );
};

// Memoized so a sibling modal's state (e.g. ExamCreator's delete-part confirm)
// doesn't force this component (with its heavy Monaco editors) to re-render,
// which is what made the confirm modal feel slow to appear.
const ExamPartBuilder = memo(ExamPartBuilderComponent);

export default ExamPartBuilder;
