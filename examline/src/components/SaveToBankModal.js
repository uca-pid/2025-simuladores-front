import React, { useEffect, useState } from "react";
import TagInput from "./TagInput";
import { getQuestionBank, saveQuestionToBank } from "../services/api";
import { autoTitulo } from "../utils/questionTitle";

const SaveToBankModal = ({ question, onClose, onSaved }) => {
  const [tags, setTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getQuestionBank()
      .then((questions) => {
        const all = questions.flatMap((q) => (Array.isArray(q.tags) ? q.tags : []));
        setSuggestions([...new Set(all)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveQuestionToBank({
        tipo: question.tipo,
        dificultad: question.dificultad,
        texto: question.texto,
        opciones: question.opciones,
        correcta: question.correcta,
        correctas: question.correctas ?? null,
        imagenUrl: question.imagenUrl || null,
        imagenesOpciones: question.imagenesOpciones ?? null,
        titulo: autoTitulo(question.texto),
        tags,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "No se pudo guardar la pregunta en el banco");
      setSaving(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ border: "none", borderRadius: "12px", overflow: "hidden", backgroundColor: "transparent" }}>
          <div className="modern-card mb-0">
            <div className="modern-card-header">
              <h3 className="modern-card-title">
                <i className="fas fa-database me-2"></i>
                Guardar en el banco
              </h3>
            </div>
            <div className="modern-card-body">
              {error && (
                <div className="error-message mb-3">
                  <i className="fas fa-exclamation-triangle"></i>
                  {error}
                </div>
              )}
              <p className="text-muted small mb-3">{question.texto}</p>
              <div className="mb-4">
                <label className="form-label d-flex align-items-center gap-2">
                  <i className="fas fa-tags text-muted"></i>
                  Etiquetas
                </label>
                <TagInput tags={tags} onChange={setTags} suggestions={suggestions} />
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="modern-btn modern-btn-secondary" onClick={onClose} disabled={saving}>
                  <i className="fas fa-times me-2"></i>
                  <span className="button-text">Cancelar</span>
                </button>
                <button type="button" className="modern-btn modern-btn-primary" onClick={handleSave} disabled={saving}>
                  <i className="fas fa-save me-2"></i>
                  <span className="button-text">{saving ? "Guardando..." : "Guardar"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveToBankModal;
