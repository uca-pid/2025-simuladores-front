import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const ExamAttempt = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const examId = propExamId || routeExamId;

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem("userId");
        const url = `http://localhost:4000/exams/${examId}?userId=${userId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Examen no encontrado");
        const data = await res.json();
        setExam(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setExam(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  if (loading) return <p className="text-muted text-center py-5">Cargando examen...</p>;
  if (error || !exam)
    return (
      <div className="text-center py-5">
        <p className="text-danger">{error || "Examen no encontrado."}</p>
        {propExamId && <button className="btn btn-outline-secondary" onClick={onBack}>Volver</button>}
      </div>
    );

  return (
    <div className="container py-5">
      <div className="mb-4">
        <h1 className="text-primary">{exam.titulo || "Sin título"}</h1>
      </div>

      {!exam.preguntas || exam.preguntas.length === 0 ? (
        <p className="text-muted">Este examen no tiene preguntas aún.</p>
      ) : (
        <>
          <div className="row g-3">
            {exam.preguntas.map((p, i) => (
              <div key={i} className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title">{i + 1}. {p.texto || "Sin texto"}</h5>
                    <ul className="list-group list-group-flush mt-3">
                      {p.opciones?.map((o, j) => (
                        <li key={j} className="list-group-item">{o || "Opción vacía"}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Terminar intento */}
          <div className="d-grid mt-4">
            <button className="btn btn-success btn-lg" onClick={onBack}>
              Terminar intento
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamAttempt;
