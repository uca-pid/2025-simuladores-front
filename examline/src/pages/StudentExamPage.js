import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ExamView from "./ExamView"; // muestra respuestas correctas
import ExamViewStudent from "./ExamAttempt"; // muestra sin respuestas
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import { getExamHistory } from "../services/api";

const StudentExamPage = () => {
  const [examId, setExamId] = useState("");
  const [submittedId, setSubmittedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [fromHistory, setFromHistory] = useState(false); // saber si viene de historial
  const { user, isLoading } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (examId.trim()) {
      setSubmittedId(examId.trim());
      setFromHistory(false); // ID ingresado directamente
    }
  };

  // 🔹 Traer historial
  useEffect(() => {
    if (!user?.userId) return; // Make sure user and userId exist

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const data = await getExamHistory(user.userId);
        setHistory(Array.isArray(data) ? data : []); // Ensure it's always an array
      } catch (err) {
        console.error("Error al cargar historial:", err);
        setHistoryError(err.message || "Error al cargar el historial");
        setHistory([]); // Set empty array on error
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [user, submittedId]); // refresca después de abrir un examen

  return (
    <div className="container py-5">
      {!submittedId && <UserHeader />}

      {!submittedId && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary mb-0">Panel de Estudiante</h2>
            <button 
              className="btn btn-info"
              onClick={() => window.location.href = '/student-inscriptions'}
            >
              Mis Inscripciones
            </button>
          </div>

          <h3 className="mb-3">Ingresar examen por código</h3>
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
          
          {isLoading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando usuario...</span>
              </div>
            </div>
          ) : historyLoading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando historial...</span>
              </div>
            </div>
          ) : historyError ? (
            <div className="alert alert-danger" role="alert">
              {historyError}
            </div>
          ) : history.length === 0 ? (
            <p>No has visto ningún examen aún.</p>
          ) : (
            <ul className="list-group">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSubmittedId(h.exam.id);
                    setFromHistory(true); // viene del historial
                  }}
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
        <>
          {fromHistory ? (
            <ExamView examId={submittedId} onBack={() => setSubmittedId(null)} />
          ) : (
            <ExamViewStudent examId={submittedId} onBack={() => setSubmittedId(null)} />
          )}
        </>
      )}
    </div>
  );
};

export default StudentExamPage;




