import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import BackToMainButton from "../components/BackToMainButton";

const ExamView = ({ examId: propExamId, onBack }) => {
  const { examId: routeExamId } = useParams();
  const examId = propExamId || routeExamId;
  const userId = localStorage.getItem("userId"); // alumno logueado

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        setLoading(true);
        const url = userId
          ? `http://localhost:4000/exams/${examId}?userId=${userId}`
          : `http://localhost:4000/exams/${examId}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Examen no encontrado");
        }
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
  }, [examId, userId]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">Cargando examen...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="container py-5 text-center">
        <p className="text-danger">{error || "Examen no encontrado."}</p>
        {propExamId && (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            Volver
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">{exam.titulo || "Sin título"}</h1>
        {propExamId ? (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            Volver
          </button>
        ) : (
          <BackToMainButton />
        )}
      </div>

      {!exam.preguntas || exam.preguntas.length === 0 ? (
        <p className="text-muted">Este examen no tiene preguntas aún.</p>
      ) : (
        <div className="row g-3">
          {exam.preguntas.map((p, i) => (
            <div key={i} className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    {i + 1}. {p.texto || "Sin texto"}
                  </h5>
                  <ul className="list-group list-group-flush mt-3">
                    {p.opciones?.map((o, j) => (
                      <li
                        key={j}
                        className={`list-group-item ${
                          j === p.correcta ? "list-group-item-success" : ""
                        }`}
                      >
                        {o || "Opción vacía"}{" "}
                        {j === p.correcta && (
                          <span className="badge bg-success ms-2">Correcta</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamView;





