import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import UserHeader from "../components/UserHeader";
import { useAuth } from "../contexts/AuthContext";
import { getExams } from "../services/api";

const Principal = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getExams();
        setExams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching exams:", err);
        setError(err.message || "Error al cargar los exámenes");
        setExams([]); // Ensure it's always an array
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchExams();
    }
  }, [user]);

  const handleCrearExamen = () => navigate("/exam-creator");
  const handleVerExamen = (examId) => navigate(`/examen/${examId}`);

  return (
    <div className="container py-5">
      <UserHeader />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Panel de Profesor</h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-info" 
            onClick={() => navigate("/exam-windows")}
          >
            Ventanas de Examen
          </button>
          <button className="btn btn-success" onClick={handleCrearExamen}>
            Crear Examen
          </button>
        </div>
      </div>

      <h3 className="mb-3">Exámenes creados</h3>
      
      {loading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : exams.length === 0 ? (
        <p className="text-muted">No hay exámenes creados.</p>
      ) : (
        <div className="row g-3">
          {(Array.isArray(exams) ? exams : []).map(exam => (
            <div key={exam.id} className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{exam.titulo}</h5>
                  <p className="card-text mb-1"><strong>Código de examen:</strong> {exam.id}</p>
                  <p className="card-text">Preguntas: {exam.preguntas?.length || 0}</p>
                  <button
                    className="btn btn-primary mt-auto"
                    onClick={() => handleVerExamen(exam.id)}
                  >
                    Ver preguntas
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Principal;



