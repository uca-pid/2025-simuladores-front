import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getExamById, getSEBPreviewExam } from '../services/api';
import './ExamPreview.css';

const shuffle = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export default function ExamPreview() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const previewToken = new URLSearchParams(window.location.hash.slice(1)).get('previewToken');
    const examRequest = previewToken
      ? getSEBPreviewExam(examId, previewToken)
      : getExamById(examId);

    examRequest
      .then((data) => {
        if (!isMounted) return;
        const previewExam = { ...data };
        if (Array.isArray(previewExam.preguntas)) {
          const questions = previewExam.ordenAleatorio
            ? shuffle(previewExam.preguntas)
            : previewExam.preguntas;
          previewExam.preguntas = questions.map((question) => {
            if (!Array.isArray(question.opciones)) return question;
            if (question.tipo === 'matching') {
              const conceptCount = question.correcta || 0;
              return {
                ...question,
                opciones: [
                  ...question.opciones.slice(0, conceptCount),
                  ...shuffle(question.opciones.slice(conceptCount))
                ]
              };
            }
            return { ...question, opciones: shuffle(question.opciones) };
          });
        }
        setExam(previewExam);
        setCode(previewExam.codigoInicial || '');
        if (previewToken) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || 'No se pudo cargar el examen.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [examId]);

  const closePreview = () => {
    window.close();
    navigate('/exam-windows');
  };

  if (loading) {
    return <main className="exam-preview-page"><p className="text-center py-5">Cargando vista previa...</p></main>;
  }

  if (error || !exam) {
    return (
      <main className="exam-preview-page">
        <div className="alert alert-danger" role="alert">{error || 'Examen no encontrado.'}</div>
        <button className="btn btn-secondary" onClick={closePreview}>Cerrar vista previa</button>
      </main>
    );
  }

  return (
    <main className="exam-preview-page">
      <div className="exam-preview-notice">
        <span><i className="fas fa-eye me-2"></i>Vista previa del estudiante</span>
        <span>Las respuestas y el código no se guardan.</span>
      </div>

      <header className="exam-preview-header">
        <div>
          <h1>{exam.titulo || 'Examen sin título'}</h1>
          <p>{exam.tipo === 'programming' ? 'Examen de programación' : `${exam.preguntas?.length || 0} preguntas`}</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={closePreview}>
          <i className="fas fa-times me-2"></i>Cerrar
        </button>
      </header>

      {exam.tipo === 'programming' ? (
        <section className="exam-preview-programming">
          <div className="preview-panel">
            <h2>Consigna</h2>
            <p className="preview-statement">{exam.enunciadoProgramacion || 'No hay consigna definida.'}</p>
          </div>
          <div className="preview-panel">
            <h2>Tu solución</h2>
            <Editor
              height="420px"
              language={exam.lenguajeProgramacion || 'javascript'}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
            />
          </div>
        </section>
      ) : exam.preguntas?.length ? (
        <section className="exam-preview-questions">
          {exam.preguntas.map((question, questionIndex) => {
            const options = question.opciones || [];
            const isMatching = question.tipo === 'matching';
            const conceptCount = isMatching ? (question.correcta || 0) : 0;
            const answerOptions = isMatching ? options.slice(conceptCount) : options;
            const isMultiSelect = question.tipo === 'fill_in_blank';
            const selected = answers[question.id];

            return (
              <article className="preview-question" key={question.id || questionIndex}>
                <div className="preview-question-heading">
                  <span>Pregunta {questionIndex + 1}</span>
                  <span>{question.tipo === 'true_false' ? 'Verdadero o falso' : isMatching ? 'Unir' : isMultiSelect ? 'Completar' : 'Opción múltiple'}</span>
                </div>
                <h2>{question.texto || 'Pregunta sin texto'}</h2>

                {isMatching ? (
                  <div className="preview-matching-list">
                    {options.slice(0, conceptCount).map((concept, conceptIndex) => (
                      <label key={`${question.id}-concept-${conceptIndex}`}>
                        <span>{concept}</span>
                        <select
                          className="form-select"
                          value={selected?.[conceptIndex] ?? ''}
                          onChange={(event) => {
                            const next = [...(selected || [])];
                            next[conceptIndex] = event.target.value;
                            setAnswers((current) => ({ ...current, [question.id]: next }));
                          }}
                        >
                          <option value="">Seleccionar respuesta</option>
                          {answerOptions.map((answer, answerIndex) => (
                            <option key={`${question.id}-answer-${answerIndex}`} value={answerIndex}>{answer}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="preview-answer-list">
                    {options.map((option, optionIndex) => {
                      const checked = isMultiSelect
                        ? Array.isArray(selected) && selected.includes(optionIndex)
                        : selected === optionIndex;
                      return (
                        <label className={`preview-answer${checked ? ' selected' : ''}`} key={`${question.id}-option-${optionIndex}`}>
                          <input
                            type={isMultiSelect ? 'checkbox' : 'radio'}
                            name={`question-${question.id}`}
                            checked={checked}
                            onChange={() => setAnswers((current) => ({
                              ...current,
                              [question.id]: isMultiSelect
                                ? checked
                                  ? current[question.id].filter((item) => item !== optionIndex)
                                  : [...(current[question.id] || []), optionIndex]
                                : optionIndex
                            }))}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="alert alert-info">Este examen todavía no tiene preguntas.</div>
      )}
    </main>
  );
}