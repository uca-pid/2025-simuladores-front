// src/pages/ExamCreator.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamCreator.css";
import { useModal } from "../hooks";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import ExamPartBuilder from "../components/ExamPartBuilder";
import { createExam, updateExam, getExamById } from "../services/api";
import { getTipoBadge, getDificultadBadge } from "../utils/questionBadges";

const DRAFT_KEY = 'examCreatorDraft';

const MAIN_FILE_NAMES = { python: 'main.py', javascript: 'main.js', c: 'main.c' };
const mainFileNameForLanguage = (lenguaje) => MAIN_FILE_NAMES[lenguaje] || 'main.js';

let localIdCounter = 0;
const nextLocalId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  localIdCounter += 1;
  return `part-${Date.now()}-${localIdCounter}`;
};

const makeDefaultPart = (tipo = "multiple_choice") => ({
  localId: nextLocalId(),
  tipo, // "multiple_choice" | "programming"
  // multiple_choice
  preguntas: [],
  // programming
  lenguajeProgramacion: "python",
  intellisenseHabilitado: false,
  enunciadoTipo: "texto", // "texto" | "archivo"
  enunciadoProgramacion: "",
  enunciadoUrl: "",
  enunciadoArchivoNombre: "",
  datasetFiles: [],
  codigoInicial: "",
  testCases: [{ description: "", input: "", expectedOutput: "" }],
  // local-only testing/reference-solution UI state (not sent verbatim, see proceedWithPublishing)
  referenceFiles: [{ filename: 'main.py', content: '' }],
  currentReferenceFile: 'main.py',
  saveReferenceSolution: false,
  testResults: null,
  showTestPanel: false,
});

const TIPO_LABEL = { multiple_choice: "Preguntas", programming: "Programación" };

// Convierte una parte tal como la devuelve la API (GET /exams/:id) al shape
// interno del wizard, sintetizando los campos de UI local-only que la API no
// devuelve (referenceFiles/currentReferenceFile/saveReferenceSolution/etc.).
const mapApiPartToInternal = (parte) => {
  if (parte.tipo === 'multiple_choice') {
    return {
      ...makeDefaultPart('multiple_choice'),
      preguntas: parte.preguntas || [],
      cantidadFaciles: parte.cantidadFaciles ?? null,
      cantidadMedias: parte.cantidadMedias ?? null,
      cantidadDificiles: parte.cantidadDificiles ?? null,
    };
  }

  const filename = mainFileNameForLanguage(parte.lenguajeProgramacion);
  return {
    ...makeDefaultPart('programming'),
    lenguajeProgramacion: parte.lenguajeProgramacion || 'python',
    intellisenseHabilitado: !!parte.intellisenseHabilitado,
    enunciadoTipo: parte.enunciadoTipo || 'texto',
    enunciadoProgramacion: parte.enunciadoProgramacion || '',
    enunciadoUrl: parte.enunciadoUrl || '',
    enunciadoArchivoNombre: parte.enunciadoArchivoNombre || '',
    datasetFiles: parte.datasetFiles || [],
    codigoInicial: parte.codigoInicial || '',
    testCases: parte.testCases && parte.testCases.length > 0
      ? parte.testCases
      : [{ description: "", input: "", expectedOutput: "" }],
    referenceFiles: [{ filename, content: parte.solucionReferencia || '' }],
    currentReferenceFile: filename,
    saveReferenceSolution: !!parte.solucionReferencia,
  };
};

const ExamCreator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const isEditMode = !!editId;
  const { modal, showModal, closeModal } = useModal();

  const loadDraft = () => {
    if (isEditMode) return null;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error('Error cargando borrador:', err);
      return null;
    }
  };

  const draft = loadDraft();

  const [titulo, setTitulo] = useState(draft?.titulo || "");
  const [ordenAleatorio, setOrdenAleatorio] = useState(draft?.ordenAleatorio || false);
  const [partes, setPartes] = useState(
    draft?.partes && draft.partes.length > 0 ? draft.partes : [makeDefaultPart()]
  );
  const [selectedPartId, setSelectedPartId] = useState(partes[0].localId);

  const [isPublishing, setIsPublishing] = useState(false);
  const [hasDraft, setHasDraft] = useState(!!draft);
  const [newPartTipo, setNewPartTipo] = useState("multiple_choice");
  const [isLoadingExam, setIsLoadingExam] = useState(isEditMode);
  const [loadExamError, setLoadExamError] = useState("");
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // Wizard: los profesores pueden moverse libremente entre los 3 pasos
  const [currentStep, setCurrentStep] = useState(1);
  const STEPS = [
    { id: 1, label: "Datos generales" },
    { id: 2, label: "Partes del examen" },
    { id: 3, label: "Revisar y publicar" },
  ];

  // Modales de confirmación de borrado de parte
  const [partToDelete, setPartToDelete] = useState(null);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);

  useEffect(() => {
    if (isEditMode) return; // no autoguardar borrador mientras se edita un examen existente

    const draftData = {
      titulo,
      ordenAleatorio,
      partes,
      savedAt: new Date().toISOString()
    };

    const hasContent = titulo || partes.some(p =>
      p.preguntas.length > 0 || p.enunciadoProgramacion || p.enunciadoUrl ||
      p.testCases.some(tc => tc.description || tc.input || tc.expectedOutput) ||
      p.referenceFiles.some(f => f.content)
    );

    if (hasContent) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasDraft(true);
    }
  }, [titulo, ordenAleatorio, partes, isEditMode]);

  useEffect(() => {
    if (!editId) return;

    let cancelled = false;
    const loadExam = async () => {
      try {
        setIsLoadingExam(true);
        setLoadExamError("");
        const exam = await getExamById(editId);
        if (cancelled) return;

        setTitulo(exam.titulo || "");
        setOrdenAleatorio(!!exam.ordenAleatorio);
        const mappedPartes = (exam.partes && exam.partes.length > 0)
          ? exam.partes
              .slice()
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map(mapApiPartToInternal)
          : [makeDefaultPart()];
        setPartes(mappedPartes);
        setSelectedPartId(mappedPartes[0].localId);
      } catch (err) {
        console.error('Error cargando examen para editar:', err);
        if (!cancelled) setLoadExamError(err.message || 'Error al cargar el examen');
      } finally {
        if (!cancelled) setIsLoadingExam(false);
      }
    };

    loadExam();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const handleDiscardDraft = () => {
    showModal(
      'confirm',
      'Descartar Borrador',
      '¿Estás seguro de que deseas descartar el borrador actual? Esta acción no se puede deshacer.',
      () => {
        localStorage.removeItem(DRAFT_KEY);
        setTitulo("");
        setOrdenAleatorio(false);
        const fresh = makeDefaultPart();
        setPartes([fresh]);
        setSelectedPartId(fresh.localId);
        setHasDraft(false);
        closeModal();
      },
      true
    );
  };

  // useCallback keeps a stable reference so it doesn't defeat ExamPartBuilder's
  // memoization (see ExamPartBuilder.js) on unrelated re-renders of this page.
  const handlePartChange = useCallback((updatedPart) => {
    setPartes(prev => prev.map(p => p.localId === updatedPart.localId ? updatedPart : p));
  }, []);

  const handleAddPart = () => {
    const part = makeDefaultPart(newPartTipo);
    setPartes(prev => [...prev, part]);
    setSelectedPartId(part.localId);
  };

  const handleMovePart = (localId, direction) => {
    setPartes(prev => {
      const index = prev.findIndex(p => p.localId === localId);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
  };

  const requestDeletePart = (localId) => {
    if (partes.length === 1) {
      showModal('error', 'Error', 'El examen debe tener al menos una parte', null, false);
      return;
    }
    setPartToDelete(localId);
    setShowDeletePartModal(true);
  };

  const confirmDeletePart = () => {
    setPartes(prev => {
      const updated = prev.filter(p => p.localId !== partToDelete);
      if (selectedPartId === partToDelete && updated.length > 0) {
        setSelectedPartId(updated[0].localId);
      }
      return updated;
    });
    setShowDeletePartModal(false);
    setPartToDelete(null);
  };

  // Cambiar el tipo de una parte ya existente. Preguntas y configuración de
  // programación no comparten campos, así que el cambio descarta el contenido
  // actual de la parte; por eso se confirma antes de aplicarlo.
  const requestChangePartType = (localId, newTipo) => {
    const part = partes.find(p => p.localId === localId);
    if (!part || part.tipo === newTipo) return;

    showModal(
      'warning',
      'Cambiar tipo de parte',
      `¿Seguro que deseas cambiar esta parte a "${TIPO_LABEL[newTipo]}"? Se perderá todo el contenido actual de la parte (preguntas o configuración de programación), ya que ambos tipos no comparten los mismos campos.`,
      () => {
        setPartes(prev => prev.map(p =>
          p.localId === localId ? { ...makeDefaultPart(newTipo), localId } : p
        ));
        closeModal();
      },
      true,
      'Cambiar tipo'
    );
  };

  const proceedWithPublishing = async () => {
    setIsPublishing(true);
    try {
      const examData = {
        titulo,
        ordenAleatorio,
        partes: partes.map((p, idx) => {
          if (p.tipo === 'multiple_choice') {
            return {
              orden: idx + 1,
              tipo: 'multiple_choice',
              preguntas: p.preguntas,
              cantidadFaciles: p.cantidadFaciles,
              cantidadMedias: p.cantidadMedias,
              cantidadDificiles: p.cantidadDificiles,
            };
          }
          return {
            orden: idx + 1,
            tipo: 'programming',
            lenguajeProgramacion: p.lenguajeProgramacion,
            intellisenseHabilitado: p.intellisenseHabilitado,
            enunciadoTipo: p.enunciadoTipo,
            enunciadoProgramacion: p.enunciadoTipo === "texto" ? p.enunciadoProgramacion : "",
            enunciadoUrl: p.enunciadoTipo === "archivo" ? p.enunciadoUrl : "",
            enunciadoArchivoNombre: p.enunciadoTipo === "archivo" ? p.enunciadoArchivoNombre : "",
            datasetFiles: p.datasetFiles,
            codigoInicial: p.codigoInicial,
            testCases: p.testCases,
            solucionReferencia: p.saveReferenceSolution
              ? (p.referenceFiles.find(f => f.filename === p.currentReferenceFile)?.content || p.referenceFiles[0]?.content || '')
              : undefined,
          };
        }),
      };

      // Legacy top-level referenceFiles (multi-file) is applied by the backend
      // "to the whole exam", so only the first programming part's files can be
      // forwarded here; solucionReferencia above already carries each part's
      // own single-string reference solution.
      const firstProgrammingPart = partes.find(p => p.tipo === 'programming');
      if (firstProgrammingPart?.saveReferenceSolution) {
        examData.referenceFiles = firstProgrammingPart.referenceFiles;
      }

      if (isEditMode) {
        const updated = await updateExam(editId, examData);
        if (updated?.error) {
          setIsPublishing(false);
          showModal(
            'warning',
            'Contenido no modificado',
            `${updated.error} El título y el orden aleatorio sí se guardaron correctamente.`,
            () => {
              closeModal();
              navigate("/mis-examenes");
            },
            false,
            'Entendido'
          );
          return;
        }
        navigate("/mis-examenes");
        return;
      }

      await createExam(examData);

      localStorage.removeItem(DRAFT_KEY);
      navigate("/mis-examenes");
    } catch (err) {
      console.error(err);
      showModal(
        'error',
        'Error al Publicar',
        err.message || 'Ocurrió un error al publicar el examen',
        null,
        false
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublicarExamen = async () => {
    if (isPublishing) return;

    if (!titulo) {
      showModal('error', 'Error', 'Ingrese un título para el examen', null, false);
      return;
    }

    if (partes.length === 0) {
      showModal('warning', 'No se puede publicar el examen', 'El examen debe tener al menos una parte.', null, false);
      return;
    }

    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      const partNum = i + 1;
      if (p.tipo === "multiple_choice") {
        if (p.preguntas.length === 0) {
          showModal(
            'warning',
            'No se puede publicar el examen',
            `La parte ${partNum} (preguntas) no tiene preguntas. Por favor, agrega al menos una pregunta antes de continuar.`,
            null,
            false
          );
          return;
        }
      } else if (p.tipo === "programming") {
        if (p.enunciadoTipo === "texto" && !p.enunciadoProgramacion.trim()) {
          showModal(
            'warning',
            'No se puede publicar el examen',
            `La parte ${partNum} (programación) no tiene consigna. Por favor, ingresa el enunciado del problema antes de continuar.`,
            null,
            false
          );
          return;
        }
        if (p.enunciadoTipo === "archivo" && !p.enunciadoUrl) {
          showModal(
            'warning',
            'No se puede publicar el examen',
            `La parte ${partNum} (programación) no tiene consigna. Por favor, subí el archivo PDF/DOCX con el enunciado antes de continuar.`,
            null,
            false
          );
          return;
        }
      }
    }

    proceedWithPublishing();
  };

  const selectedPart = partes.find(p => p.localId === selectedPartId) || partes[0];
  const hasMultipleChoicePart = partes.some(p => p.tipo === "multiple_choice");

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <div className="exam-creator-header">
            <div className="exam-creator-title-section">
              <h1 className="page-title mb-1">
                <i className={`fas ${isEditMode ? 'fa-edit' : 'fa-plus-circle'} me-2`} style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">{isEditMode ? 'Editar Examen' : 'Crear Examen'}</span>
                {hasDraft && !isEditMode && (
                  <span className="badge bg-info ms-2" style={{ fontSize: '0.6em', verticalAlign: 'middle' }}>
                    <i className="fas fa-save me-1"></i>
                    Borrador guardado
                  </span>
                )}
              </h1>
              <p className="page-subtitle mb-0">
                {isEditMode ? 'Modifica los datos de este examen' : 'Diseña un nuevo examen con preguntas personalizadas'}
              </p>
            </div>
            <div className="exam-creator-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              {hasDraft && !isEditMode && (
                <button
                  className="modern-btn modern-btn-danger compact-btn"
                  onClick={handleDiscardDraft}
                  disabled={isPublishing}
                  title="Descartar borrador"
                >
                  <i className="fas fa-trash me-2"></i>
                  <span className="btn-text">Descartar</span>
                </button>
              )}
              <BackToMainButton
                customPath="/mis-examenes"
                customLabel={<><i className="fas fa-arrow-left me-2"></i>Volver a Mis Exámenes</>}
              />
            </div>
          </div>
        </div>
      </div>

      {isLoadingExam && (
        <div className="modern-card mb-4">
          <div className="modern-card-body">
            <div className="loading-container">
              <div className="modern-spinner"></div>
              <p className="mb-0">Cargando examen...</p>
            </div>
          </div>
        </div>
      )}

      {!isLoadingExam && loadExamError && (
        <div className="modern-card mb-4">
          <div className="modern-card-body text-center py-5">
            <i className="fas fa-exclamation-triangle text-danger mb-3" style={{ fontSize: '2rem' }}></i>
            <p className="mb-0">{loadExamError}</p>
          </div>
        </div>
      )}

      {!isLoadingExam && !loadExamError && (
      <>
      {/* Stepper del wizard: navegación libre entre pasos */}
      <div className="modern-card mb-4">
        <div className="modern-card-body p-0">
          <div className="exam-wizard-steps">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`exam-wizard-step-button ${currentStep === step.id ? 'active' : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className="exam-wizard-step-number">{step.id}</span>
                <span className="exam-wizard-step-label">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paso 1: Datos generales */}
      {currentStep === 1 && (
        <div className="modern-card mb-4">
          <div className="modern-card-header">
            <h3 className="modern-card-title">
              <i className="fas fa-edit me-2"></i>
              Información del Examen
            </h3>
          </div>
          <div className="modern-card-body">
            <div className="mb-3">
              <label className="form-label d-flex align-items-center gap-2">
                <i className="fas fa-heading text-muted"></i>
                Título del Examen
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ingresa el título del examen"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>
          <div className="modern-card-body pt-0 d-flex justify-content-end">
            <button
              type="button"
              className="modern-btn modern-btn-primary"
              onClick={() => setCurrentStep(2)}
            >
              Siguiente: Partes del examen
              <i className="fas fa-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Partes del examen */}
      {currentStep === 2 && (
        <>
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-layer-group me-2"></i>
                Partes del Examen
              </h3>
            </div>
            <div className="modern-card-body">
              <label className="form-label d-flex align-items-center gap-2 mb-1">
                <i className="fas fa-plus-circle text-muted"></i>
                Tipo de la nueva parte a agregar:
              </label>
              <div className="d-flex gap-2 align-items-center mb-3">
                <select
                  className="form-select"
                  value={newPartTipo}
                  onChange={(e) => setNewPartTipo(e.target.value)}
                  disabled={isPublishing}
                  style={{ maxWidth: '250px' }}
                >
                  <option value="multiple_choice">Preguntas</option>
                  <option value="programming">Programación</option>
                </select>
                <button
                  type="button"
                  className="modern-btn modern-btn-secondary"
                  onClick={handleAddPart}
                  disabled={isPublishing}
                >
                  <i className="fas fa-plus me-2"></i>
                  Agregar Parte
                </button>
              </div>

              <div className="d-flex flex-column gap-2 mb-3">
                {partes.map((p, idx) => (
                  <div
                    key={p.localId}
                    className="d-flex align-items-center gap-1"
                    style={{
                      border: `2px solid ${selectedPartId === p.localId ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      padding: '0.4rem 0.6rem',
                      backgroundColor: selectedPartId === p.localId ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                    }}
                  >
                    <span
                      onClick={() => setSelectedPartId(p.localId)}
                      style={{ fontWeight: selectedPartId === p.localId ? 'bold' : 'normal', cursor: 'pointer', flex: 1 }}
                    >
                      <i className={`fas ${p.tipo === 'multiple_choice' ? 'fa-question-circle' : 'fa-code'} me-2`}></i>
                      Parte {idx + 1}
                    </span>
                    <select
                      className="form-select form-select-sm"
                      value={p.tipo}
                      disabled={isPublishing}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => requestChangePartType(p.localId, e.target.value)}
                      title="Cambiar el tipo de esta parte"
                      style={{ width: 'auto', padding: '0.15rem 1.5rem 0.15rem 0.4rem', fontSize: '0.85rem' }}
                    >
                      <option value="multiple_choice">Preguntas</option>
                      <option value="programming">Programación</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1"
                      disabled={idx === 0 || isPublishing}
                      onClick={() => handleMovePart(p.localId, -1)}
                      title="Mover arriba"
                    >
                      <i className="fas fa-arrow-up"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1"
                      disabled={idx === partes.length - 1 || isPublishing}
                      onClick={() => handleMovePart(p.localId, 1)}
                      title="Mover abajo"
                    >
                      <i className="fas fa-arrow-down"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-1"
                      disabled={isPublishing}
                      onClick={() => requestDeletePart(p.localId)}
                      title="Eliminar parte"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>

              {hasMultipleChoicePart && (
                <div className="mb-0 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <label className="form-label d-flex align-items-center gap-2">
                    <i className="fas fa-random text-muted"></i>
                    Orden Aleatorio de Preguntas
                  </label>
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="ordenAleatorioSwitch"
                      checked={ordenAleatorio}
                      onChange={(e) => setOrdenAleatorio(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="ordenAleatorioSwitch">
                      {ordenAleatorio ? "Las preguntas aparecerán en orden aleatorio para cada estudiante" : "Las preguntas aparecerán en el orden definido"}
                    </label>
                  </div>
                  <small className="form-text text-muted">
                    {ordenAleatorio
                      ? "✓ Cada estudiante ve las mismas preguntas, pero mezcladas en un orden distinto (aplica a todas las partes de opción múltiple)."
                      : "Las preguntas siempre aparecerán en el mismo orden para todos los estudiantes."}
                    {" "}Esto no cambia qué preguntas le tocan a cada alumno — para que cada alumno reciba un subconjunto distinto de preguntas, usá el "Pool aleatorio balanceado" dentro de cada parte, más abajo.
                  </small>
                </div>
              )}
            </div>
          </div>

          {selectedPart && (
            <ExamPartBuilder
              key={selectedPart.localId}
              part={selectedPart}
              onChange={handlePartChange}
              isPublishing={isPublishing}
              showModal={showModal}
              partLabel={`Parte ${partes.findIndex(p => p.localId === selectedPart.localId) + 1}`}
              ordenAleatorio={ordenAleatorio}
              onOrdenAleatorioChange={setOrdenAleatorio}
            />
          )}

          <div className="modern-card mt-4">
            <div className="modern-card-body d-flex justify-content-between">
              <button
                type="button"
                className="modern-btn modern-btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Atrás: Datos generales
              </button>
              <button
                type="button"
                className="modern-btn modern-btn-primary"
                onClick={() => setCurrentStep(3)}
              >
                Siguiente: Revisar y publicar
                <i className="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Paso 3: Revisar y publicar */}
      {currentStep === 3 && (
        <>
          <div className="modern-card mb-4">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-clipboard-check me-2"></i>
                Resumen del Examen
              </h3>
            </div>
            <div className="modern-card-body">
              <div className="mb-3">
                <strong>Título:</strong> {titulo || <span className="text-muted fst-italic">Sin título</span>}
              </div>
              <div className="mb-3">
                <strong>Orden aleatorio de preguntas:</strong> {ordenAleatorio ? 'Sí' : 'No'}
              </div>
              <div className="mb-2">
                <strong>Partes ({partes.length}):</strong>
              </div>
              <ul className="list-unstyled mb-0">
                {partes.map((p, idx) => (
                  <li key={p.localId} className="exam-summary-part-item">
                    <i className={`fas ${p.tipo === 'multiple_choice' ? 'fa-question-circle' : 'fa-code'} me-2`}></i>
                    <strong>Parte {idx + 1}:</strong> {TIPO_LABEL[p.tipo]}
                    {p.tipo === 'multiple_choice' ? (
                      <span className="ms-2 text-muted">— {p.preguntas.length} pregunta{p.preguntas.length !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="ms-2 text-muted">— {p.testCases.length} test case{p.testCases.length !== 1 ? 's' : ''} ({p.lenguajeProgramacion})</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="modern-btn modern-btn-secondary mt-3"
                onClick={() => setShowStudentPreview(prev => !prev)}
              >
                <i className={`fas ${showStudentPreview ? 'fa-eye-slash' : 'fa-eye'} me-2`}></i>
                {showStudentPreview ? 'Ocultar vista previa' : 'Ver como lo verá el alumno'}
              </button>
            </div>
          </div>

          {showStudentPreview && (
            <div className="modern-card mb-4">
              <div className="modern-card-header">
                <h3 className="modern-card-title">
                  <i className="fas fa-eye me-2"></i>
                  Vista previa — lo que el alumno va a ver
                </h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  No muestra cuál opción es correcta, ni los test cases (eso el alumno tampoco lo ve).
                </p>
              </div>
              <div className="modern-card-body">
                {partes.map((p, idx) => (
                  <div key={p.localId} className="mb-4 pb-4" style={{ borderBottom: idx < partes.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <h5 className="mb-3">
                      <i className={`fas ${p.tipo === 'multiple_choice' ? 'fa-question-circle' : 'fa-code'} me-2`}></i>
                      Parte {idx + 1}: {TIPO_LABEL[p.tipo]}
                    </h5>

                    {p.tipo === 'multiple_choice' ? (
                      p.preguntas.length === 0 ? (
                        <p className="text-muted fst-italic">Esta parte todavía no tiene preguntas.</p>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {p.preguntas.map((pregunta, qIdx) => (
                            <div key={qIdx} className="p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span
                                  className="badge"
                                  style={{ backgroundColor: getTipoBadge(pregunta.tipo).color, color: 'white' }}
                                >
                                  <i className={`fas ${getTipoBadge(pregunta.tipo).icon} me-1`}></i>
                                  {getTipoBadge(pregunta.tipo).label}
                                </span>
                                <span
                                  className="badge"
                                  style={{ backgroundColor: getDificultadBadge(pregunta.dificultad).color, color: 'white' }}
                                >
                                  {getDificultadBadge(pregunta.dificultad).label}
                                </span>
                              </div>
                              <p className="mb-2">{qIdx + 1}. {pregunta.texto}</p>
                              {pregunta.imagenUrl && (
                                <img src={pregunta.imagenUrl} alt="" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} className="mb-2" />
                              )}
                              {Array.isArray(pregunta.opciones) && pregunta.opciones.length > 0 && (
                                <ul className="mb-0">
                                  {pregunta.opciones.map((op, opIdx) => (
                                    <li key={opIdx} className="text-muted">{op}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <p className="mb-2">
                          <strong>Lenguaje:</strong> {p.lenguajeProgramacion}
                        </p>
                        <div className="mb-2">
                          <strong>Consigna:</strong>
                          {p.enunciadoTipo === 'archivo' ? (
                            p.enunciadoArchivoNombre ? (
                              <p className="text-muted mb-0"><i className="fas fa-file-pdf me-1"></i>Archivo adjunto: {p.enunciadoArchivoNombre}</p>
                            ) : (
                              <p className="text-muted fst-italic mb-0">Todavía no se subió el archivo de consigna.</p>
                            )
                          ) : p.enunciadoProgramacion.trim() ? (
                            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{p.enunciadoProgramacion}</p>
                          ) : (
                            <p className="text-muted fst-italic mb-0">Todavía no se escribió la consigna.</p>
                          )}
                        </div>
                        {p.datasetFiles.length > 0 && (
                          <div className="mb-2">
                            <strong>Datasets disponibles:</strong>
                            <ul className="mb-0">
                              {p.datasetFiles.map(f => <li key={f.nombre} className="text-muted">{f.nombre}</li>)}
                            </ul>
                          </div>
                        )}
                        {p.codigoInicial.trim() && (
                          <div>
                            <strong>Código inicial:</strong>
                            <pre className="mb-0 p-2 mt-1" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
                              {p.codigoInicial}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modern-card mb-4">
            <div className="modern-card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
              <button
                type="button"
                className="modern-btn modern-btn-secondary"
                onClick={() => setCurrentStep(2)}
                disabled={isPublishing}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Atrás: Partes del examen
              </button>
              <button
                className="modern-btn modern-btn-primary"
                onClick={handlePublicarExamen}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span className="button-text">{isEditMode ? 'Guardando...' : 'Publicando...'}</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    <span className="button-text">{isEditMode ? 'Guardar Cambios' : 'Publicar Examen'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
      </>
      )}

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={modal.confirmText || ((modal.type === 'warning') ? 'Confirmar' : 'Entendido')}
        cancelText="Cancelar"
      />

      {/* Modal para eliminar una parte */}
      <Modal
        show={showDeletePartModal}
        onClose={() => {
          setShowDeletePartModal(false);
          setPartToDelete(null);
        }}
        onConfirm={confirmDeletePart}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que deseas eliminar esta parte del examen? Esta acción no se puede deshacer."
        type="error"
        showCancel={true}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ExamCreator;
