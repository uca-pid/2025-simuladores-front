import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const ExamView = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`http://localhost:4000/exams/${examId}`);
        const data = await res.json();
        setExam(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExam();
  }, [examId]);

  if (!exam)
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">Cargando examen...</p>
      </div>
    );

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">{exam.titulo}</h1>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/principal")}
        >
          Volver a Principal
        </button>
      </div>

      {exam.preguntas.length === 0 ? (
        <p className="text-muted">Este examen no tiene preguntas aún.</p>
      ) : (
        <div className="row g-3">
          {exam.preguntas.map((p, i) => (
            <div key={i} className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    {i + 1}. {p.texto}
                  </h5>
                  <ul className="list-group list-group-flush mt-3">
                    {p.opciones.map((o, j) => (
                      <li
                        key={j}
                        className={`list-group-item ${
                          j === p.correcta ? "list-group-item-success" : ""
                        }`}
                      >
                        {o} {j === p.correcta && <span className="badge bg-success ms-2">Correcta</span>}
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


