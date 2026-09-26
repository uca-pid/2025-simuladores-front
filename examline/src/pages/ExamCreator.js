// src/pages/ExamCreator.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ExamCreator.css";
import { useModal } from "../hooks";
import BackToMainButton from "../components/BackToMainButton";
import Modal from "../components/Modal";
import ExamPartBuilder from "../components/ExamPartBuilder";
import { createExam } from "../services/api";

const DRAFT_KEY = 'examCreatorDraft';

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

const ExamCreator = () => {
  const navigate = useNavigate();
  const { modal, showModal, closeModal } = useModal();

  const loadDraft = () => {
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

  // Modales de confirmación de borrado de parte
  const [partToDelete, setPartToDelete] = useState(null);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);

  useEffect(() => {
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
  }, [titulo, ordenAleatorio, partes]);

  const handleDiscardDraft = () => {
    showModal(
      'confirm',
      '🗑️ Descartar Borrador',
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

  const handlePartChange = (updatedPart) => {
    setPartes(prev => prev.map(p => p.localId === updatedPart.localId ? updatedPart : p));
  };

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

  const proceedWithPublishing = async () => {
    setIsPublishing(true);
    try {
      const examData = {
        titulo,
        ordenAleatorio,
        partes: partes.map((p, idx) => {
          if (p.tipo === 'multiple_choice') {
            return { orden: idx + 1, tipo: 'multiple_choice', preguntas: p.preguntas };
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

      await createExam(examData);

      localStorage.removeItem(DRAFT_KEY);
      navigate("/mis-examenes");
    } catch (err) {
      console.error(err);
      showModal(
        'error',
        '❌ Error al Publicar',
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
                <i className="fas fa-plus-circle me-2" style={{ color: 'var(--primary-color)' }}></i>
                <span className="title-text">Crear Examen</span>
                {hasDraft && (
                  <span className="badge bg-info ms-2" style={{ fontSize: '0.6em', verticalAlign: 'middle' }}>
                    <i className="fas fa-save me-1"></i>
                    Borrador guardado
                  </span>
                )}
              </h1>
              <p className="page-subtitle mb-0">Diseña un nuevo examen con preguntas personalizadas</p>
            </div>
            <div className="exam-creator-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              {hasDraft && (
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

      {/* Información del examen */}
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

          {hasMultipleChoicePart && (
            <div className="mb-0">
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
                  ? "✓ Cada estudiante verá las preguntas en un orden diferente"
                  : "Las preguntas siempre aparecerán en el mismo orden"}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Partes del examen */}
      <div className="modern-card mb-4">
        <div className="modern-card-header">
          <h3 className="modern-card-title">
            <i className="fas fa-layer-group me-2"></i>
            Partes del Examen
          </h3>
        </div>
        <div className="modern-card-body">
          <div className="d-flex flex-wrap gap-2 mb-3">
            {partes.map((p, idx) => (
              <div
                key={p.localId}
                className="d-flex align-items-center gap-1"
                style={{
                  border: `2px solid ${selectedPartId === p.localId ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: selectedPartId === p.localId ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <span onClick={() => setSelectedPartId(p.localId)} style={{ fontWeight: selectedPartId === p.localId ? 'bold' : 'normal' }}>
                  <i className={`fas ${p.tipo === 'multiple_choice' ? 'fa-question-circle' : 'fa-code'} me-2`}></i>
                  Parte {idx + 1}: {TIPO_LABEL[p.tipo]}
                </span>
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

          <div className="d-flex gap-2 align-items-center">
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
        />
      )}

      {/* Botón de publicar examen - al final */}
      <div className="modern-card mt-5">
        <div className="modern-card-body">
          <div className="text-center">
            <button
              className="modern-btn modern-btn-primary"
              onClick={handlePublicarExamen}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span className="button-text">Publicando...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  <span className="button-text">Publicar Examen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <Modal
        show={modal.show}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        showCancel={modal.showCancel}
        confirmText={(modal.type === 'warning') ? 'Confirmar' : 'Entendido'}
        cancelText="Cancelar"
      />

      {/* Modal para eliminar una parte */}
      {showDeletePartModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                  Confirmar Eliminación
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeletePartModal(false);
                    setPartToDelete(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar esta parte del examen?</p>
                <p className="text-muted mb-0">Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeletePartModal(false);
                    setPartToDelete(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeletePart}
                >
                  <i className="fas fa-trash me-2"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCreator;
