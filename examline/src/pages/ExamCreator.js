// src/pages/ExamCreator.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamCreator.css";
import { useModal } from "../hooks";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import ExamPartBuilder, { PROG_TABS } from "../components/ExamPartBuilder";
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
  puntajePersonalizado: false,
  // programming
  lenguajeProgramacion: "python",
  intellisenseHabilitado: false,
  enunciadoTipo: "texto", // "texto" | "archivo"
  enunciadoProgramacion: "",
  enunciadoUrl: "",
  enunciadoArchivoNombre: "",
  datasetFiles: [],
  codigoInicial: "",
  testCasesPuntajePersonalizado: false,
  testCases: [],
  // local-only testing/reference-solution UI state (not sent verbatim, see proceedWithPublishing)
  referenceFiles: [{ filename: 'main.py', content: '' }],
  currentReferenceFile: 'main.py',
  saveReferenceSolution: false,
  testResults: null,
  showTestPanel: false,
});

const TIPO_LABEL = { multiple_choice: "Preguntas", programming: "Programación" };
const LENGUAJE_LABEL = { python: "Python", javascript: "JavaScript", c: "C" };

// Convierte una parte tal como la devuelve la API (GET /exams/:id) al shape
// interno del wizard, sintetizando los campos de UI local-only que la API no
// devuelve (referenceFiles/currentReferenceFile/saveReferenceSolution/etc.).
const mapApiPartToInternal = (parte) => {
  if (parte.tipo === 'multiple_choice') {
    return {
      ...makeDefaultPart('multiple_choice'),
      preguntas: parte.preguntas || [],
      puntajePersonalizado: (parte.preguntas || []).some(p => (p.puntos ?? 1) !== 1),
      cantidadFaciles: parte.cantidadFaciles ?? null,
      cantidadMedias: parte.cantidadMedias ?? null,
      cantidadDificiles: parte.cantidadDificiles ?? null,
      cantidadPreguntas: parte.cantidadPreguntas ?? null,
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
    testCasesPuntajePersonalizado: (parte.testCases || []).some(tc => (tc.puntos ?? 1) !== 1),
    testCases: parte.testCases || [],
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
  const [partes, setPartes] = useState(draft?.partes || []);
  const [selectedPartId, setSelectedPartId] = useState(partes[0]?.localId || null);
  // Pestaña activa dentro de una parte de programación. Vive acá (no en
  // ExamPartBuilder) para que la navegación inferior pueda avanzar/retroceder
  // across partes + pestañas + pasos del wizard como una sola secuencia.
  const [activeProgTab, setActiveProgTab] = useState(PROG_TABS[0].key);

  const [isPublishing, setIsPublishing] = useState(false);
  const [showCreateWindowPrompt, setShowCreateWindowPrompt] = useState(false);
  const [publishedExamId, setPublishedExamId] = useState(null);
  const [hasDraft, setHasDraft] = useState(!!draft);
  const [showAddPartMenu, setShowAddPartMenu] = useState(false);
  const [addPartMenuPos, setAddPartMenuPos] = useState(null);
  const addPartButtonRef = useRef(null);
  const [draggedPartId, setDraggedPartId] = useState(null);
  const [isLoadingExam, setIsLoadingExam] = useState(isEditMode);
  const [loadExamError, setLoadExamError] = useState("");

  // Wizard: los profesores pueden moverse libremente entre los 3 pasos
  const [currentStep, setCurrentStepRaw] = useState(1);
  const STEPS = [
    { id: 1, label: "Datos generales" },
    { id: 2, label: "Partes del examen" },
    { id: 3, label: "Revisar y publicar" },
  ];

  // Cada vez que cambiamos de paso/parte/pestaña, volvemos el scroll arriba
  // del todo para que el profesor no quede viendo el contenido a mitad de
  // scroll de la sección anterior.
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const setCurrentStep = (step) => {
    scrollToTop();
    setCurrentStepRaw(step);
  };

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
          : [];
        setPartes(mappedPartes);
        setSelectedPartId(mappedPartes[0]?.localId || null);
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
        setPartes([]);
        setSelectedPartId(null);
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

  const handleAddPart = (tipo) => {
    const part = makeDefaultPart(tipo);
    setPartes(prev => [...prev, part]);
    setSelectedPartId(part.localId);
    setActiveProgTab(PROG_TABS[0].key);
    setShowAddPartMenu(false);
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

  // Reordenar partes arrastrando sus pestañas (las flechas siguen andando
  // como alternativa accesible para quien no pueda/quiera arrastrar).
  // El id de la parte arrastrada viaja en dataTransfer, no en un estado de
  // React: dragstart/drop pueden dispararse antes de que un setState llegue
  // a confirmarse, y una closure stale haría que el drop no encuentre nada
  // que mover.
  const handlePartDragStart = (localId) => (e) => {
    setDraggedPartId(localId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(localId));
  };
  const handlePartDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handlePartDrop = (targetLocalId) => (e) => {
    e.preventDefault();
    const sourceLocalId = e.dataTransfer.getData('text/plain');
    if (!sourceLocalId || sourceLocalId === String(targetLocalId)) return;
    setPartes(prev => {
      const fromIndex = prev.findIndex(p => String(p.localId) === sourceLocalId);
      const toIndex = prev.findIndex(p => p.localId === targetLocalId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setDraggedPartId(null);
  };

  const requestDeletePart = (localId) => {
    setPartToDelete(localId);
    setShowDeletePartModal(true);
  };

  const confirmDeletePart = () => {
    setPartes(prev => {
      const updated = prev.filter(p => p.localId !== partToDelete);
      if (selectedPartId === partToDelete) {
        setSelectedPartId(updated[0]?.localId || null);
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
        titulo: titulo.trim(),
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
              cantidadPreguntas: p.cantidadPreguntas,
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

      const createdExam = await createExam(examData);

      localStorage.removeItem(DRAFT_KEY);
      setPublishedExamId(createdExam.id);
      setShowCreateWindowPrompt(true);
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

    if (!titulo.trim()) {
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

        const poolDefinido = [p.cantidadFaciles, p.cantidadMedias, p.cantidadDificiles].some(c => c !== undefined && c !== null);
        if (p.cantidadPreguntas != null) {
          if (p.cantidadPreguntas < 1 || p.cantidadPreguntas > p.preguntas.length) {
            showModal('warning', 'No se puede publicar el examen', `La parte ${partNum} debe tener una cantidad aleatoria entre 1 y ${p.preguntas.length}.`, null, false);
            return;
          }
        } else if (poolDefinido) {
          const counts = { facil: 0, media: 0, dificil: 0 };
          p.preguntas.forEach(pregunta => { counts[pregunta.dificultad || 'media']++; });
          const pedidos = [
            ['facil', p.cantidadFaciles], ['media', p.cantidadMedias], ['dificil', p.cantidadDificiles]
          ];
          for (const [nivel, cantidad] of pedidos) {
            const n = cantidad ?? 0;
            if (n > counts[nivel]) {
              showModal(
                'warning',
                'No se puede publicar el examen',
                `La parte ${partNum} (preguntas) tiene el pool aleatorio balanceado pidiendo ${n} pregunta(s) de dificultad '${nivel}', pero solo hay ${counts[nivel]} disponibles. Ajustá la cantidad o agregá más preguntas de ese nivel.`,
                null,
                false
              );
              return;
            }
          }
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
        const tieneTestCaseValido = p.testCases.some(tc => tc.expectedOutput && tc.expectedOutput.trim());
        if (!tieneTestCaseValido) {
          showModal(
            'warning',
            'No se puede publicar el examen',
            `La parte ${partNum} (programación) no tiene ningún caso de prueba con el output esperado completo. Sin esto, el examen no se puede corregir automáticamente. Completá al menos un caso de prueba en la pestaña "Casos de Prueba" antes de continuar.`,
            null,
            false
          );
          return;
        }
      }
    }

    // Limitación conocida: el backend solo guarda los archivos auxiliares de
    // "solución de referencia" (multi-archivo) de la PRIMERA parte de
    // programación del examen (ver proceedWithPublishing). El archivo principal
    // usado para auto-corregir (solucionReferencia) sí se guarda bien para cada
    // parte; lo que se pierde son los archivos adicionales (ej. utils.py) de
    // las demás partes de programación. Avisamos antes de publicar en vez de
    // perderlo en silencio.
    const firstProgrammingPartId = partes.find(p => p.tipo === 'programming')?.localId;
    const partesConArchivosAuxiliaresEnRiesgo = partes.filter(p =>
      p.tipo === 'programming' &&
      p.localId !== firstProgrammingPartId &&
      p.saveReferenceSolution &&
      p.referenceFiles.length > 1
    );
    if (partesConArchivosAuxiliaresEnRiesgo.length > 0) {
      const numeros = partesConArchivosAuxiliaresEnRiesgo.map(p => partes.findIndex(x => x.localId === p.localId) + 1).join(', ');
      showModal(
        'warning',
        'Archivos auxiliares de referencia no se guardarán',
        `Las partes ${numeros} tienen una solución de referencia con varios archivos, pero solo la primera parte de programación del examen puede guardar archivos auxiliares. El archivo principal (el que se usa para corregir) sí se va a guardar bien en todas las partes — solo se perderán los archivos adicionales de apoyo de las partes ${numeros}. ¿Querés publicar igual?`,
        () => {
          closeModal();
          proceedWithPublishing();
        },
        true,
        'Publicar igual'
      );
      return;
    }

    proceedWithPublishing();
  };

  const selectedPart = partes.find(p => p.localId === selectedPartId) || partes[0];

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
      <div className="exam-creator-layout">
      <aside className="exam-creator-sidebar">
      {/* Stepper del wizard: navegación libre entre pasos. La "2" muestra, anidada
          debajo suyo, la lista de partes cuando es el paso activo. */}
      <div className="modern-card mb-3" style={{ overflow: 'visible' }}>
        <div className="modern-card-body p-0">
          <div className="exam-wizard-steps exam-wizard-steps--vertical">
            {STEPS.slice(0, 2).map((step) => (
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

      {currentStep === 2 && (
        <div className="exam-wizard-nested-parts">
          <div style={{ position: 'relative' }}>
            <div className="exam-parts-list-vertical">
              {partes.map((p, idx) => {
                const isSelected = selectedPartId === p.localId;
                return (
                  <div key={p.localId} className={`exam-parts-list-group ${isSelected ? 'active' : ''}`}>
                    <div
                      className="exam-parts-list-item"
                      draggable={!isPublishing}
                      onDragStart={handlePartDragStart(p.localId)}
                      onDragOver={handlePartDragOver}
                      onDrop={handlePartDrop(p.localId)}
                      onDragEnd={() => setDraggedPartId(null)}
                      title="Arrastrá para reordenar"
                      style={{ opacity: draggedPartId === p.localId ? 0.4 : 1 }}
                    >
                      <span style={{ fontWeight: isSelected ? 'bold' : 'normal', flexShrink: 0 }}>{String.fromCharCode(97 + idx)})</span>

                      {isSelected ? (
                        <select
                          className="form-select form-select-sm"
                          value={p.tipo}
                          disabled={isPublishing}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => requestChangePartType(p.localId, e.target.value)}
                          title="Cambiar el tipo de esta parte"
                          style={{ fontSize: '0.8rem', flex: 1, minWidth: 0, padding: '0.2rem 1.4rem 0.2rem 0.4rem' }}
                        >
                          <option value="multiple_choice">Preguntas</option>
                          <option value="programming">Programación</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => { setSelectedPartId(p.localId); setActiveProgTab(PROG_TABS[0].key); }}
                          style={{ cursor: 'pointer', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {TIPO_LABEL[p.tipo]}
                        </span>
                      )}

                      {isSelected && (
                        <>
                          <button
                            type="button"
                            className="exam-parts-list-icon-btn"
                            disabled={idx === 0 || isPublishing}
                            onClick={() => handleMovePart(p.localId, -1)}
                            title="Mover arriba"
                          >
                            <i className="fas fa-arrow-up"></i>
                          </button>
                          <button
                            type="button"
                            className="exam-parts-list-icon-btn"
                            disabled={idx === partes.length - 1 || isPublishing}
                            onClick={() => handleMovePart(p.localId, 1)}
                            title="Mover abajo"
                          >
                            <i className="fas fa-arrow-down"></i>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="exam-parts-list-icon-btn text-danger"
                        disabled={isPublishing}
                        onClick={() => requestDeletePart(p.localId)}
                        title="Eliminar parte"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {partes.length > 0 && (
            <div className="mt-2">
              <button
                ref={addPartButtonRef}
                type="button"
                className="exam-parts-add-button"
                onClick={() => {
                  if (!showAddPartMenu && addPartButtonRef.current) {
                    const rect = addPartButtonRef.current.getBoundingClientRect();
                    setAddPartMenuPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                  }
                  setShowAddPartMenu(prev => !prev);
                }}
                disabled={isPublishing}
                title="Agregar parte"
              >
                <i className="fas fa-plus me-2"></i>
                Agregar Parte
              </button>
              {showAddPartMenu && addPartMenuPos && createPortal(
                <>
                  <div
                    onClick={() => setShowAddPartMenu(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1049 }}
                  />
                  <div
                    className="modern-card"
                    style={{
                      position: 'fixed',
                      top: addPartMenuPos.top,
                      left: addPartMenuPos.left,
                      width: addPartMenuPos.width,
                      zIndex: 1050,
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      transition: 'none',
                      transform: 'none',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-sm text-start"
                      onClick={() => { handleAddPart('multiple_choice'); setShowAddPartMenu(false); }}
                    >
                      <i className="fas fa-question-circle me-2"></i>
                      Preguntas
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm text-start"
                      onClick={() => { handleAddPart('programming'); setShowAddPartMenu(false); }}
                    >
                      <i className="fas fa-code me-2"></i>
                      Programación
                    </button>
                  </div>
                </>,
                document.body
              )}
            </div>
            )}
          </div>
        </div>
      )}

          <div className="exam-wizard-steps exam-wizard-steps--vertical">
            {STEPS.slice(2).map((step) => (
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
      </aside>

      <div className="exam-creator-main">
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
          {!selectedPart && (
            <div className="modern-card">
              <div className="modern-card-body text-center py-5">
                <i className="fas fa-layer-group text-muted mb-3" style={{ fontSize: '2.5rem' }}></i>
                <h4 className="mb-2">Todavía no agregaste ninguna parte</h4>
                <p className="text-muted mb-4">
                  Un examen necesita al menos una parte de "Preguntas" o "Programación" para poder publicarse.
                </p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="modern-btn modern-btn-primary"
                    onClick={() => handleAddPart('multiple_choice')}
                    disabled={isPublishing}
                  >
                    <i className="fas fa-question-circle me-2"></i>
                    Agregar parte de Preguntas
                  </button>
                  <button
                    type="button"
                    className="modern-btn modern-btn-secondary"
                    onClick={() => handleAddPart('programming')}
                    disabled={isPublishing}
                  >
                    <i className="fas fa-code me-2"></i>
                    Agregar parte de Programación
                  </button>
                </div>
              </div>
            </div>
          )}

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
              activeProgTab={activeProgTab}
              onActiveProgTabChange={setActiveProgTab}
            />
          )}

          {(() => {
            // Navegación inferior unificada: recorre, en una sola secuencia,
            // las pestañas de cada parte de programación y las partes de
            // preguntas (un solo paso cada una), para luego entrar/salir de
            // este paso del wizard en los extremos.
            const secuencia = partes.flatMap((p, partIdx) =>
              p.tipo === 'programming'
                ? PROG_TABS.map(tab => ({ partIdx, tabKey: tab.key }))
                : [{ partIdx, tabKey: null }]
            );
            const idxActual = secuencia.findIndex(s =>
              s.partIdx === partes.findIndex(p => p.localId === selectedPartId) &&
              s.tabKey === (selectedPart?.tipo === 'programming' ? activeProgTab : null)
            );

            const irA = (nuevoIdx) => {
              scrollToTop();
              if (nuevoIdx < 0) {
                setCurrentStepRaw(1);
                return;
              }
              if (nuevoIdx >= secuencia.length) {
                setCurrentStepRaw(3);
                return;
              }
              const destino = secuencia[nuevoIdx];
              setSelectedPartId(partes[destino.partIdx].localId);
              if (destino.tabKey) setActiveProgTab(destino.tabKey);
            };

            const labelPara = (paso) => {
              if (!paso) return null;
              const parte = partes[paso.partIdx];
              const numero = `Parte ${paso.partIdx + 1}`;
              if (!paso.tabKey) return numero;
              const tab = PROG_TABS.find(t => t.key === paso.tabKey);
              return `${numero}: ${tab.label}`;
            };

            const anterior = idxActual > 0 ? secuencia[idxActual - 1] : null;
            const siguiente = idxActual < secuencia.length - 1 ? secuencia[idxActual + 1] : null;

            return (
              <div className="modern-card mt-4">
                <div className="modern-card-body d-flex flex-column flex-md-row justify-content-between gap-2">
                  <button
                    type="button"
                    className="modern-btn modern-btn-secondary"
                    onClick={() => irA(idxActual - 1)}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Atrás: {anterior ? labelPara(anterior) : 'Datos generales'}
                  </button>
                  <button
                    type="button"
                    className="modern-btn modern-btn-primary"
                    onClick={() => irA(idxActual + 1)}
                  >
                    Siguiente: {siguiente ? labelPara(siguiente) : 'Revisar y publicar'}
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            );
          })()}
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
              <div className="mb-0">
                <strong>Orden de presentación:</strong> {ordenAleatorio ? 'Aleatorio para cada alumno' : 'Orden definido por el profesor'}
              </div>
            </div>
          </div>

                {partes.map((p, idx) => {
                  const modoSeleccionParte = p.cantidadPreguntas != null
                    ? 'aleatorio'
                    : (p.cantidadFaciles != null || p.cantidadMedias != null || p.cantidadDificiles != null)
                      ? 'dificultad'
                      : 'todas';
                  return (
                  <div key={p.localId} className="modern-card mb-4">
                    <div className="modern-card-header">
                    <h5 className="mb-0">
                      <i className={`fas ${p.tipo === 'multiple_choice' ? 'fa-question-circle' : 'fa-code'} me-2`}></i>
                      Parte {idx + 1}: {TIPO_LABEL[p.tipo]}
                    </h5>
                    </div>
                    <div className="modern-card-body">

                    {p.tipo === 'multiple_choice' ? (
                      p.preguntas.length === 0 ? (
                        <p className="text-muted fst-italic">Esta parte todavía no tiene preguntas.</p>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {p.preguntas.map((pregunta, qIdx) => (
                            <div key={qIdx} className="p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <p className="mb-2 d-flex align-items-center flex-wrap gap-2">
                                <span>{qIdx + 1}. {pregunta.texto}</span>
                                <span
                                  className="badge"
                                  style={{ backgroundColor: getTipoBadge(pregunta.tipo).color, color: 'white' }}
                                >
                                  <i className={`fas ${getTipoBadge(pregunta.tipo).icon} me-1`}></i>
                                  {getTipoBadge(pregunta.tipo).label}
                                </span>
                                {modoSeleccionParte === 'dificultad' && (
                                  <span
                                    className="badge"
                                    style={{ backgroundColor: getDificultadBadge(pregunta.dificultad).color, color: 'white' }}
                                  >
                                    {getDificultadBadge(pregunta.dificultad).label}
                                  </span>
                                )}
                              </p>
                              {pregunta.imagenUrl && (
                                <img src={pregunta.imagenUrl} alt="" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} className="mb-2" />
                              )}
                              {pregunta.tipo === 'matching' ? (
                                <div className="d-flex flex-column gap-2">
                                  {pregunta.opciones.slice(0, pregunta.correcta).map((concepto, i) => {
                                    const respuesta = pregunta.opciones[pregunta.correcta + i];
                                    return (
                                      <div key={i} className="d-flex align-items-center gap-2">
                                        <span className="badge bg-primary" style={{ fontSize: '0.7rem', minWidth: '25px' }}>{i + 1}</span>
                                        <span style={{ fontSize: '0.9rem' }}>{concepto}</span>
                                        <i className="fas fa-arrow-right text-primary" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="badge bg-success" style={{ fontSize: '0.7rem', minWidth: '25px' }}>{String.fromCharCode(65 + i)}</span>
                                        <span style={{ fontSize: '0.9rem' }}>{respuesta}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : pregunta.tipo === 'fill_in_blank' ? (
                                <div className="exam-info">
                                  {pregunta.opciones.slice(0, pregunta.correcta).map((o, i) => (
                                    <div key={i} className="exam-info-item">
                                      <i className="fas fa-check-circle text-success"></i>
                                      <span className="fw-bold text-success">{o}</span>
                                    </div>
                                  ))}
                                  {pregunta.opciones.slice(pregunta.correcta).map((o, i) => (
                                    <div key={i} className="exam-info-item">
                                      <i className="fas fa-circle text-muted"></i>
                                      <span>{o}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : pregunta.tipo === 'numeric' ? (
                                <div className="exam-info-item">
                                  <i className="fas fa-check-circle text-success"></i>
                                  <span className="fw-bold text-success">
                                    Respuesta correcta: {pregunta.opciones[0]} (tolerancia ±{pregunta.opciones[1] ?? 0})
                                  </span>
                                </div>
                              ) : pregunta.tipo === 'short_answer' ? (
                                <div className="exam-info">
                                  {pregunta.opciones.map((o, i) => (
                                    <div key={i} className="exam-info-item">
                                      <i className="fas fa-check-circle text-success"></i>
                                      <span className="fw-bold text-success">{o}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="exam-info">
                                  {(pregunta.opciones || []).map((op, opIdx) => {
                                    const esCorrecta = pregunta.tipo === 'multiple_response'
                                      ? (pregunta.correctas || []).includes(opIdx)
                                      : opIdx === pregunta.correcta;
                                    return (
                                      <div key={opIdx} className="exam-info-item">
                                        <i className={esCorrecta ? "fas fa-check-circle text-success" : "fas fa-circle text-muted"}></i>
                                        <span className={esCorrecta ? "fw-bold text-success" : ""}>{op}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <p className="mb-2">
                          <strong>Lenguaje:</strong> {LENGUAJE_LABEL[p.lenguajeProgramacion] || p.lenguajeProgramacion}
                        </p>
                        <p className="mb-2">
                          <strong>Intellisense:</strong> {p.intellisenseHabilitado ? 'Habilitado' : 'Deshabilitado'}
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
                          <div className="mb-2">
                            <strong>Código inicial:</strong>
                            <pre className="mb-0 p-2 mt-1" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
                              {p.codigoInicial}
                            </pre>
                          </div>
                        )}

                        <div className="mb-2">
                          <strong>Casos de Prueba ({p.testCases.length}):</strong>
                          {p.testCases.length === 0 ? (
                            <p className="text-muted fst-italic mb-0">No hay casos de prueba configurados.</p>
                          ) : (
                            <div className="d-flex flex-column gap-2 mt-1">
                              {p.testCases.map((tc, tcIdx) => (
                                <div key={tcIdx} className="p-2" style={{ border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                  <div className="d-flex align-items-center gap-2 mb-1">
                                    <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>Caso {tcIdx + 1}</span>
                                    {tc.description && <small className="text-muted">{tc.description}</small>}
                                    {!tc.expectedOutput?.trim() && (
                                      <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>Sin output esperado</span>
                                    )}
                                  </div>
                                  <div className="row g-2">
                                    <div className="col-md-6">
                                      <small className="text-muted d-block">Input:</small>
                                      <pre className="mb-0 p-1" style={{ backgroundColor: 'var(--light-color)', borderRadius: '4px', fontSize: '0.8rem' }}>{tc.input || '(vacío)'}</pre>
                                    </div>
                                    <div className="col-md-6">
                                      <small className="text-muted d-block">Output esperado:</small>
                                      <pre className="mb-0 p-1" style={{ backgroundColor: 'var(--light-color)', borderRadius: '4px', fontSize: '0.8rem' }}>{tc.expectedOutput || '(vacío)'}</pre>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mb-0">
                          <strong>Solución de Referencia:</strong>{' '}
                          {p.saveReferenceSolution ? (
                            <span className="text-success"><i className="fas fa-check-circle me-1"></i>Se guardará como referencia</span>
                          ) : (
                            <span className="text-muted fst-italic">No se va a guardar (solo se probó el código)</span>
                          )}
                          {p.saveReferenceSolution && (
                            <pre className="mb-0 p-2 mt-1" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto', maxHeight: '300px' }}>
                              {p.referenceFiles.find(f => f.filename === p.currentReferenceFile)?.content || p.referenceFiles[0]?.content || '(vacío)'}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  );
                })}

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
      </div>
      </div>
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

      {/* Modal: ¿crear una ventana de examen ahora que se publicó? */}
      <Modal
        show={showCreateWindowPrompt}
        onClose={() => navigate("/mis-examenes")}
        onConfirm={() => navigate(`/exam-windows?examId=${publishedExamId}&openCreate=1`)}
        title="Examen publicado"
        message="¿Querés crear ahora una ventana de examen para que los alumnos puedan inscribirse y rendirlo?"
        type="confirm"
        showCancel={true}
        confirmText="Sí, crear ventana"
        cancelText="Ahora no"
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
