import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSEBPreviewExam } from "../services/api";
import OptionImage from "../components/OptionImage";

const TIPOS_CON_OPCIONES = ['multiple_choice', 'multiple_response', 'true_false', 'fill_in_blank', 'matching'];

const RESPUESTA_LIBRE = {
  short_answer: 'El alumno escribe una respuesta corta.',
  numeric: 'El alumno ingresa un valor numérico.',
  essay: 'El alumno desarrolla su respuesta en un texto.',
  file_upload: 'El alumno adjunta un archivo.',
};

const LENGUAJES = { python: 'Python', javascript: 'JavaScript', c: 'C' };

/**
 * Vista previa del examen dentro de Safe Exam Browser, para que el profesor
 * pruebe la configuración de una ventana antes del examen. Se abre desde el
 * .seb de prueba con un token corto en el fragmento de la URL; no usa la
 * sesión del profesor ni guarda respuestas.
 */
const ExamPreview = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState(null);

  const fragmento = new URLSearchParams(window.location.hash.slice(1));
  const previewToken = fragmento.get('previewToken');
  const quitUrl = fragmento.get('quitUrl');

  useEffect(() => {
    if (!previewToken) {
      setError('Esta vista previa se abre desde el archivo de prueba de SEB que se genera en la ventana del examen.');
      return;
    }
    getSEBPreviewExam(examId, previewToken)
      .then(setExam)
      .catch(err => setError(err.message || 'No se pudo cargar la vista previa'));
  }, [examId, previewToken]);

  const salirDeSEB = () => {
    if (window.SafeExamBrowser?.security?.closeApplication) {
      window.SafeExamBrowser.security.closeApplication();
    } else if (quitUrl) {
      window.location.href = quitUrl;
    }
  };

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">{error}</div>
        {quitUrl && (
          <button type="button" className="modern-btn modern-btn-secondary" onClick={salirDeSEB}>
            <i className="fas fa-sign-out-alt me-2"></i>Salir de SEB
          </button>
        )}
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container py-5">
        <div className="loading-container">
          <div className="modern-spinner"></div>
          <p>Cargando vista previa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="modern-card mb-4">
        <div className="modern-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h1 className="page-title mb-1" style={{ fontSize: '1.5rem' }}>
              <i className="fas fa-eye me-2"></i>{exam.titulo}
            </h1>
            <span className="badge bg-warning text-dark">VISTA PREVIA EN SEB · no se guardan respuestas</span>
          </div>
          <button type="button" className="modern-btn modern-btn-secondary" onClick={salirDeSEB}>
            <i className="fas fa-sign-out-alt me-2"></i>Salir de SEB
          </button>
        </div>
        <div className="modern-card-body">
          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
            Así ven los alumnos el examen dentro de Safe Exam Browser con la configuración que elegiste.
            Probá las teclas, el clic derecho y copiar/pegar en este campo:
          </p>
          <textarea className="form-control" rows={2} placeholder="Escribí, copiá y pegá acá para probar el portapapeles" />
        </div>
      </div>

      {exam.partes.map((parte, i) => (
        <div key={parte.id} className="modern-card mb-4">
          <div className="modern-card-header">
            <h5 className="mb-0">
              Parte {i + 1} de {exam.partes.length} · {parte.tipo === 'programming'
                ? `Programación (${LENGUAJES[parte.lenguajeProgramacion] || parte.lenguajeProgramacion})`
                : 'Preguntas'}
            </h5>
          </div>
          <div className="modern-card-body">
            {parte.tipo === 'programming' ? (
              <>
                {parte.enunciadoTipo === 'archivo' ? (
                  <p>
                    <i className="fas fa-file-alt me-2"></i>
                    Consigna en archivo: <strong>{parte.enunciadoArchivoNombre || 'consigna'}</strong>
                  </p>
                ) : (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{parte.enunciadoProgramacion}</p>
                )}
                {parte.codigoInicial && (
                  <pre className="p-2 rounded" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>{parte.codigoInicial}</pre>
                )}
                {parte.testCases?.length > 0 && (
                  <small className="text-muted">
                    Se corrige con {parte.testCases.length} caso(s) de prueba.
                  </small>
                )}
              </>
            ) : (
              parte.preguntas.map((pregunta, j) => (
                <div key={pregunta.id} className="mb-4">
                  <p className="mb-2"><strong>{j + 1}.</strong> {pregunta.texto}</p>
                  {pregunta.imagenUrl && (
                    <img src={pregunta.imagenUrl} alt="" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px' }} className="mb-2" />
                  )}
                  {TIPOS_CON_OPCIONES.includes(pregunta.tipo) && Array.isArray(pregunta.opciones) ? (
                    <ul className="list-unstyled ms-3 mb-0">
                      {pregunta.opciones.map((opcion, k) => (
                        <li key={k} className="mb-2">
                          <i className={`far ${pregunta.tipo === 'multiple_response' ? 'fa-square' : 'fa-circle'} me-2 text-muted`}></i>
                          {opcion}
                          <OptionImage url={pregunta.imagenesOpciones?.[k]} maxHeight={140} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small className="text-muted ms-3">{RESPUESTA_LIBRE[pregunta.tipo]}</small>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamPreview;
