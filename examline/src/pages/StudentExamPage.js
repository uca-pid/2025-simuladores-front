import React, { useState, useEffect } from "react";
import ExamView from "./ExamView";
import UserHeader from "../components/UserHeader";

const StudentExamPage = () => {
  const [examId, setExamId] = useState("");
  const [submittedId, setSubmittedId] = useState(null);
  const [history, setHistory] = useState([]);

  const userId = localStorage.getItem("userId");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (examId.trim()) {
      setSubmittedId(examId.trim());
    }
  };

  // 🔹 Traer historial
  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:4000/exams/history/${userId}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("Error al cargar historial:", err);
      }
    };

    fetchHistory();
  }, [userId, submittedId]); // refresca después de abrir un examen

  return (
    <div className="container py-5">
      <UserHeader />

      {!submittedId && (
        <>
          <h2 className="mb-4 text-primary">Ingresar examen</h2>
          <form onSubmit={handleSubmit} className="d-flex gap-2 mb-4">
            <input
              type="text"
              className="form-control"
              placeholder="Ingrese el ID del examen"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            />
            <button type="submit" className="btn btn-success">
              Ver Examen
            </button>
          </form>

          <h3 className="text-secondary mb-3">Historial de exámenes vistos</h3>
          {history.length === 0 ? (
            <p>No has visto ningún examen aún.</p>
          ) : (
            <ul className="list-group">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSubmittedId(h.exam.id)} // 🔹 al click abrir el examen
                >
                  <span>{h.exam.titulo}</span>
                  <small className="text-muted">
                    {new Date(h.viewedAt).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {submittedId && (
        <ExamView examId={submittedId} onBack={() => setSubmittedId(null)} />
      )}
    </div>
  );
};

export default StudentExamPage;



